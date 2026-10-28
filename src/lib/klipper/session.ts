import { unzlibSync } from "fflate";
import {
  MessageParser,
  encodeBlock,
  extractFrames,
  frameSequence,
  configCrc,
  type ParsedMessage,
  type ParamValue,
} from "./codec";
import { adsImage, adsInputByMux, decodeSamples, pulseTicks, restTicks } from "../ads1220";
import { adsHeaderCheck, frontById, type FrontEnd } from "../frontends";
import { hx717ConfigLines, hx717GainChannel, hx717RestTicks, isHxErrorSample } from "../hx717";
import type { Sample, StreamOptions } from "../analyze";

type Listener = (batch: Sample[]) => void;

type Waiter = {
  seq: bigint;
  name: string | null;
  resolve: (value: ParsedMessage | null | "timeout") => void;
  timer: ReturnType<typeof setTimeout>;
};

const SPI_HZ = 256000;

/**
 * Talks to a Klipper USB MCU (H36 Combo, H36 Combo V2, or a Plimsoll alpha board) and
 * pulls bulk samples the same way klippy does. The browser owns the port.
 */
export class H36Session {
  readonly kind = "mcu" as const;
  private parser = new MessageParser();
  private port: SerialPort | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private sendSeq = 1n;
  private receiveSeq = 1n;
  private inbox: ParsedMessage[] = [];
  private waiters: Waiter[] = [];
  private chain: Promise<void> = Promise.resolve();
  private listeners = new Set<Listener>();
  private streaming = false;
  private sampleIndex = 0;
  private lastBulkSeq: number | null = null;
  private lastOverflow: number | null = null;
  private statusTimer: ReturnType<typeof setTimeout> | null = null;
  private statusGen = 0;
  private currentSps = 330;
  private closed = false;
  private front: FrontEnd = frontById("h36-ads1220");
  /** HX717 gain requested at connect, 64 or 128. */
  private hxGain = 128;
  /** HX717 gain_channel actually sent in config_hx71x. */
  private configuredGain = 1;
  overflows = 0;
  gaps = 0;
  errors = 0;
  onLog: ((line: string) => void) | null = null;
  version = "";
  mcu = "";
  clockHz = 0;
  pinsOk = false;

  subscribe(cb: Listener): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  async connect(port: SerialPort, front: FrontEnd, gain: number): Promise<void> {
    this.front = front;
    this.hxGain = gain;
    this.port = port;
    this.closed = false;
    this.sendSeq = 1n;
    this.receiveSeq = 1n;
    await port.open({ baudRate: 250000 });
    if (!port.writable || !port.readable) throw new Error("The serial port has no data channel");
    this.writer = port.writable.getWriter();
    this.reader = port.readable.getReader();
    void this.readLoop();
    this.log("Reading the Klipper data dictionary…");
    await this.identify();
    this.version = this.parser.version;
    this.mcu = this.parser.config.MCU ?? "";
    this.clockHz = Number(this.parser.config.CLOCK_FREQ ?? "0");
    if (!this.clockHz) throw new Error("The firmware did not report CLOCK_FREQ");
    this.requireSensor();
    this.log(`${this.mcu || "MCU"} ${this.version || ""} at ${(this.clockHz / 1e6).toFixed(2)} MHz`.trim());
    await this.configure();
  }

  async close(): Promise<void> {
    this.closed = true;
    this.streaming = false;
    if (this.statusTimer) clearTimeout(this.statusTimer);
    try {
      await this.reader?.cancel();
    } catch {
      /* already closed */
    }
    try {
      this.writer?.releaseLock();
    } catch {
      /* already released */
    }
    try {
      await this.port?.close();
    } catch {
      /* port already gone */
    }
    this.port = null;
    this.writer = null;
    this.reader = null;
  }

  async start(opts: StreamOptions): Promise<void> {
    if (!this.clockHz) throw new Error(`Connect the ${this.front.board} before starting the stream`);
    this.currentSps = opts.sampleRate;
    this.sampleIndex = 0;
    this.lastBulkSeq = null;
    this.lastOverflow = null;
    this.overflows = 0;
    this.gaps = 0;
    this.errors = 0;
    this.statusGen++;
    if (this.statusTimer) clearTimeout(this.statusTimer);
    if (this.front.sensor === "hx717") {
      await this.startHx(opts);
      return;
    }
    const image = adsImage({
      gain: opts.gain,
      sampleRate: opts.sampleRate,
      vref: opts.vref,
      mux: opts.mux,
    });
    const mux = opts.mux ?? 0b0111;
    const input = adsInputByMux(mux);
    const writtenGain = mux >= 0b1000 ? 1 : opts.gain;
    this.log(
      `Resetting the ADS1220, ${input.label}, gain ${writtenGain}, ${opts.sampleRate} Hz, ${opts.vref} reference`,
    );
    await this.spiSend(image.reset);
    await delay(8);
    const booted = await this.spiRead(image.read);
    if (!bytesEqual(booted.subarray(0, 4), [0, 0, 0, 0])) {
      throw new Error(
        `ADS1220 did not reset (registers ${hex(booted)}). Check ${adsHeaderCheck(this.front)}.`,
      );
    }
    await this.spiSend(image.write);
    const stored = await this.spiRead(image.read);
    if (!bytesEqual(stored.subarray(0, 4), image.regs)) {
      throw new Error(
        `ADS1220 rejected the register write (wanted ${hex(image.regs)}, got ${hex(stored)}). Check ${adsHeaderCheck(this.front)}.`,
      );
    }
    await this.spiSend(image.start);
    const ticks = restTicks(this.clockHz, opts.sampleRate);
    this.streaming = true;
    await this.transact(this.queryCommand(), { oid: this.sensorOid(), rest_ticks: ticks }, null, 1200);
    this.log("Streaming");
    this.scheduleStatus();
  }

  async stop(): Promise<void> {
    this.streaming = false;
    this.statusGen++;
    if (this.statusTimer) clearTimeout(this.statusTimer);
    this.statusTimer = null;
    if (!this.port || this.closed) return;
    try {
      await this.transact(this.queryCommand(), { oid: this.sensorOid(), rest_ticks: 0 }, null, 800);
    } catch {
      /* the link may already be down */
    }
  }

  private flashHint(extras: boolean): string {
    if (this.front.chip === "STM32F072") {
      return extras
        ? "Flash Klipper for the STM32F072: internal clock, USB on PA11/PA12, no bootloader. HX717 support is on unless the build turned it off to save space."
        : "Flash the alpha board: STM32F072, internal clock, USB on PA11/PA12, no bootloader.";
    }
    if (this.front.chip === "STM32G0B1") {
      return extras
        ? "Flash Klipper for the STM32G0B1: USB on PA11/PA12, no bootloader, PA2 set at startup. The sensor extras are included unless they were turned off."
        : "Flash Klipper for the STM32G0B1: USB on PA11/PA12, no bootloader, PA2 set at startup.";
    }
    return extras
      ? "Flash current Klipper for the STM32G431 with USB on PA11/PA12. The sensor extras are included unless they were turned off."
      : "Flash Klipper for the STM32G431: USB on PA11/PA12, 12 MHz crystal, no bootloader, PA2 set at startup.";
  }

  private requireSensor() {
    const names =
      this.front.sensor === "hx717"
        ? ["config_hx71x", "query_hx71x", "query_hx71x_status"]
        : ["config_ads1220", "query_ads1220", "spi_transfer", "spi_send"];
    for (const name of names) {
      if (!this.parser.hasCommand(name)) {
        const flash = this.flashHint(true);
        throw new Error(`This firmware has no ${name}. ${flash}`);
      }
    }
  }

  private queryCommand() {
    return this.front.sensor === "hx717" ? "query_hx71x" : "query_ads1220";
  }

  private statusCommand() {
    return this.front.sensor === "hx717" ? "query_hx71x_status" : "query_ads1220_status";
  }

  private sensorOid() {
    return this.front.sensor === "hx717" ? 0 : 1;
  }

  private async startHx(opts: StreamOptions) {
    const channel = hx717GainChannel(opts.gain);
    if (channel !== this.configuredGain) {
      const wanted = opts.gain;
      throw new Error(
        `This link was configured for the other HX717 gain. Disconnect, leave the gain at ${wanted}, and connect again. Gain is part of the Klipper config, not a register.`,
      );
    }
    const ticks = hx717RestTicks(this.clockHz, opts.sampleRate);
    this.streaming = true;
    this.log(`Watching the HX717 at ${opts.sampleRate} Hz. The chip rate is the solder jumper.`);
    await this.transact(this.queryCommand(), { oid: 0, rest_ticks: ticks }, null, 1200);
    this.log("Streaming");
    this.scheduleStatus();
  }

  private async configure() {
    if (this.front.sensor === "hx717") {
      await this.configureHx();
      return;
    }
    const front = this.front;
    const { cs, drdy, sclk, mosi, miso } = front;
    if (!cs || !drdy || !sclk || !mosi || !miso) {
      throw new Error("The ADS1220 front end is missing its SPI pins.");
    }
    const known = this.parser.enumerations.pin ?? {};
    for (const pin of [cs, drdy, sclk, mosi, miso]) {
      if (!known[pin]) {
        throw new Error(
          `Pin ${pin} is not available on this firmware. ${front.label} on the 2×6 header needs ${adsHeaderCheck(front)}.`,
        );
      }
    }
    if (front.spiBus && (this.parser.enumerations.spi_bus ?? {})[front.spiBus] === undefined) {
      throw new Error(
        `This firmware has no SPI bus ${front.spiBus}. ${front.label} on the 2×6 header needs ${adsHeaderCheck(front)}.`,
      );
    }
    this.pinsOk = true;
    const ticks = pulseTicks(this.clockHz, SPI_HZ);
    const spi = front.spiBus
      ? {
          name: "spi_set_bus",
          line: `spi_set_bus oid=0 spi_bus=${front.spiBus} mode=1 rate=${SPI_HZ}`,
          params: {
            oid: 0,
            spi_bus: front.spiBus,
            mode: 1,
            rate: SPI_HZ,
          } as Record<string, ParamValue>,
        }
      : this.parser.hasCommand("spi_set_sw_bus")
        ? {
            name: "spi_set_sw_bus",
            line: `spi_set_sw_bus oid=0 miso_pin=${miso} mosi_pin=${mosi} sclk_pin=${sclk} mode=1 pulse_ticks=${ticks}`,
            params: {
              oid: 0,
              miso_pin: miso,
              mosi_pin: mosi,
              sclk_pin: sclk,
              mode: 1,
              pulse_ticks: ticks,
            } as Record<string, ParamValue>,
          }
        : {
            name: "spi_set_software_bus",
            line: `spi_set_software_bus oid=0 miso_pin=${miso} mosi_pin=${mosi} sclk_pin=${sclk} mode=1 rate=${SPI_HZ}`,
            params: {
              oid: 0,
              miso_pin: miso,
              mosi_pin: mosi,
              sclk_pin: sclk,
              mode: 1,
              rate: SPI_HZ,
            } as Record<string, ParamValue>,
          };
    if (!this.parser.hasCommand(spi.name)) {
      throw new Error(
        front.spiBus
          ? `This firmware cannot drive hardware SPI. ${front.label} on the 2×6 header needs ${adsHeaderCheck(front)}.`
          : `This firmware cannot bit-bang SPI. ${front.label} on the 2×6 header needs ${adsHeaderCheck(front)}.`,
      );
    }
    const lines = [
      "allocate_oids count=2",
      `config_spi oid=0 pin=${cs} cs_active_high=0`,
      spi.line,
      `config_ads1220 oid=1 spi_oid=0 data_ready_pin=${drdy}`,
    ];
    const crc = configCrc(lines);
    const current = await this.transact("get_config", {}, "config", 1200);
    if (!current) throw new Error("The board did not answer get_config");
    if (current.params.is_shutdown) {
      await this.reboot();
      throw new Error(`The ${this.front.board} was in shutdown and has been reset. Connect it again.`);
    }
    if (current.params.is_config && current.params.crc !== crc) {
      this.log("Config CRC differs from a previous host. Resetting the MCU.");
      await this.reboot();
      throw new Error(`The ${this.front.board} was configured by another host. It has been reset. Connect it again.`);
    }
    if (!current.params.is_config) {
      this.log(
        front.spiBus
          ? `Sending a bench config: ${front.spiBus} plus one ADS1220 (${adsHeaderCheck(front)}).`
          : `Sending a bench config: software SPI plus one ADS1220 (${adsHeaderCheck(front)}).`,
      );
      await this.transact("allocate_oids", { count: 2 }, null, 1200);
      await this.transact(
        "config_spi",
        { oid: 0, pin: cs, cs_active_high: 0 },
        null,
        1200,
      );
      await this.transact(spi.name, spi.params, null, 1200);
      await this.transact(
        "config_ads1220",
        { oid: 1, spi_oid: 0, data_ready_pin: drdy },
        null,
        1200,
      );
      await this.transact("finalize_config", { crc }, null, 1200);
    } else {
      this.log("MCU config matches this bench. Leaving it in place.");
    }
  }

  private async configureHx() {
    const front = this.front;
    const known = this.parser.enumerations.pin ?? {};
    for (const pin of [front.dout, front.sclk]) {
      if (!known[pin]) {
        throw new Error(
          `Pin ${pin} is not available on this firmware. ${front.label} uses SCLK ${front.sclk} and DOUT ${front.dout}.`,
        );
      }
    }
    this.pinsOk = true;
    const channel = hx717GainChannel(this.hxGain);
    this.configuredGain = channel;
    const lines = hx717ConfigLines({ dout: front.dout, sclk: front.sclk }, this.hxGain);
    const crc = configCrc(lines);
    const current = await this.transact("get_config", {}, "config", 1200);
    if (!current) throw new Error("The board did not answer get_config");
    if (current.params.is_shutdown) {
      await this.reboot();
      throw new Error(`The ${front.board} was in shutdown and has been reset. Connect it again.`);
    }
    if (current.params.is_config && current.params.crc !== crc) {
      this.log("Config CRC differs from a previous host. Resetting the MCU.");
      await this.reboot();
      throw new Error(`The ${front.board} was configured by another host. It has been reset. Connect it again.`);
    }
    if (!current.params.is_config) {
      this.log(`Sending a bench config: HX717 on SCLK ${front.sclk}, DOUT ${front.dout}, gain channel ${channel}.`);
      await this.transact("allocate_oids", { count: 1 }, null, 1200);
      await this.transact(
        "config_hx71x",
        { oid: 0, gain_channel: channel, dout_pin: front.dout, sclk_pin: front.sclk },
        null,
        1200,
      );
      await this.transact("finalize_config", { crc }, null, 1200);
    } else {
      this.log("MCU config matches this bench. Leaving it in place.");
    }
  }

  private async reboot() {
    try {
      await this.transact("reset", {}, null, 400);
    } catch {
      /* USB drops as the chip resets */
    }
  }

  private async identify() {
    const chunks: Uint8Array[] = [];
    let offset = 0;
    for (let n = 0; n < 400; n++) {
      const msg = await this.transact("identify", { offset, count: 40 }, "identify_response", 1500);
      if (!msg) throw new Error("Identify returned nothing");
      const data = msg.params.data;
      if (!(data instanceof Uint8Array) || data.length === 0) break;
      chunks.push(data);
      offset += data.length;
    }
    if (!offset) {
      throw new Error(
        `The board did not send a Klipper dictionary. ${this.flashHint(false)}`,
      );
    }
    const packed = new Uint8Array(offset);
    let at = 0;
    for (const chunk of chunks) {
      packed.set(chunk, at);
      at += chunk.length;
    }
    let text = "";
    try {
      text = new TextDecoder().decode(unzlibSync(packed));
    } catch {
      throw new Error(`The identify data was not a Klipper dictionary. This port may not be the ${this.front.board}.`);
    }
    this.parser.loadDictionary(text);
  }

  private async spiSend(bytes: number[]) {
    await this.transact("spi_send", { oid: 0, data: Uint8Array.from(bytes) }, null, 1200);
  }

  private async spiRead(bytes: number[]): Promise<Uint8Array> {
    const msg = await this.transact(
      "spi_transfer",
      { oid: 0, data: Uint8Array.from(bytes) },
      "spi_transfer_response",
      1200,
    );
    const raw = msg?.params.response;
    if (!(raw instanceof Uint8Array) || raw.length < 2) {
      throw new Error("SPI transfer returned no bytes");
    }
    return raw.subarray(1);
  }

  private scheduleStatus() {
    if (this.statusTimer) clearTimeout(this.statusTimer);
    const gen = ++this.statusGen;
    const run = async () => {
      if (gen !== this.statusGen || !this.streaming || this.closed) return;
      try {
        const msg = await this.transact(this.statusCommand(), { oid: this.sensorOid() }, "sensor_bulk_status", 800);
        const ov = msg?.params.possible_overflows;
        if (typeof ov === "number") {
          if (this.lastOverflow !== null) {
            const d = (ov - this.lastOverflow) & 0xffff;
            if (d > 0 && d < 0x8000) this.overflows += d;
          }
          this.lastOverflow = ov;
        }
      } catch {
        /* the next poll will try again */
      }
      if (gen === this.statusGen && this.streaming) this.statusTimer = setTimeout(run, 250);
    };
    this.statusTimer = setTimeout(run, 250);
  }

  private transact(
    name: string,
    params: Record<string, ParamValue>,
    response: string | null,
    timeoutMs: number,
  ): Promise<ParsedMessage | null> {
    const job = this.chain.then(() => this.once(name, params, response, timeoutMs));
    this.chain = job.then(
      () => undefined,
      () => undefined,
    );
    return job;
  }

  private async once(
    name: string,
    params: Record<string, ParamValue>,
    response: string | null,
    timeoutMs: number,
  ): Promise<ParsedMessage | null> {
    const payload = this.parser.encodeCommand(name, params);
    const deadline = Date.now() + timeoutMs;
    let pause = 50;
    let attempt = 0;
    while (!this.closed) {
      if (this.receiveSeq > this.sendSeq) this.sendSeq = this.receiveSeq;
      const seq = this.sendSeq;
      this.sendSeq = seq + 1n;
      const frame = encodeBlock(Number(seq & 15n), payload);
      const wire = attempt === 0 ? frame : concat(new Uint8Array([0x7e]), frame);
      await this.write(wire);
      const slice = Math.max(20, Math.min(pause, deadline - Date.now()));
      const result = await this.wait(seq, response, slice);
      if (result !== "timeout") return result;
      if (Date.now() >= deadline) {
        throw new Error(`No response to ${name}. The USB link to the ${this.front.board} stalled.`);
      }
      attempt++;
      pause = Math.min(pause * 2, 400);
    }
    throw new Error("Disconnected");
  }

  private wait(seq: bigint, name: string | null, ms: number): Promise<ParsedMessage | null | "timeout"> {
    return new Promise((resolve) => {
      const waiter: Waiter = {
        seq,
        name,
        resolve,
        timer: setTimeout(() => {
          this.waiters = this.waiters.filter((w) => w !== waiter);
          resolve("timeout");
        }, ms),
      };
      this.waiters.push(waiter);
      this.kick();
    });
  }

  private kick() {
    for (const waiter of [...this.waiters]) {
      if (this.receiveSeq <= waiter.seq) continue;
      if (waiter.name) {
        const idx = this.inbox.findIndex((m) => m.name === waiter.name);
        if (idx < 0) continue;
        const [msg] = this.inbox.splice(idx, 1);
        this.finish(waiter, msg);
      } else {
        this.finish(waiter, null);
      }
    }
  }

  private finish(waiter: Waiter, value: ParsedMessage | null) {
    clearTimeout(waiter.timer);
    this.waiters = this.waiters.filter((w) => w !== waiter);
    waiter.resolve(value);
  }

  private async write(bytes: Uint8Array) {
    if (!this.writer) throw new Error("Serial port is not open");
    await this.writer.write(bytes);
  }

  private async readLoop() {
    const reader = this.reader;
    if (!reader) return;
    let pending = new Uint8Array(0);
    try {
      while (!this.closed) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value?.length) continue;
        const merged = concat(pending, value);
        const { frames, rest } = extractFrames(merged);
        pending = new Uint8Array(rest);
        for (const frame of frames) this.onFrame(frame);
      }
    } catch (err) {
      if (!this.closed) this.log(`Serial read ended: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private onFrame(frame: Uint8Array) {
    const wire = frameSequence(frame);
    const low = Number(this.receiveSeq & 15n);
    const delta = (wire - low) & 0xf;
    const rseq = this.receiveSeq + BigInt(delta);
    if (rseq !== this.receiveSeq) {
      if (rseq > this.sendSeq && this.receiveSeq !== 1n) return;
      this.receiveSeq = rseq;
    }
    const content = frame.subarray(2, frame.length - 3);
    if (!content.length) {
      this.kick();
      return;
    }
    let messages: ParsedMessage[] = [];
    try {
      messages = this.parser.parseContent(content);
    } catch (err) {
      this.log(`Could not parse an MCU message: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }
    for (const msg of messages) {
      if (msg.name === "sensor_bulk_data") this.onBulk(msg);
      else this.inbox.push(msg);
      if (msg.name === "shutdown") this.log("The MCU reported a shutdown.");
    }
    if (this.inbox.length > 40) this.inbox.splice(0, this.inbox.length - 40);
    this.kick();
  }

  private onBulk(msg: ParsedMessage) {
    const data = msg.params.data;
    const seq = msg.params.sequence;
    if (!(data instanceof Uint8Array) || typeof seq !== "number") return;
    if (this.lastBulkSeq !== null) {
      const diff = (seq - this.lastBulkSeq) & 0xffff;
      if (diff !== 1 && diff < 0x8000) this.gaps += diff - 1;
    }
    this.lastBulkSeq = seq;
    let counts = decodeSamples(data);
    if (this.front.sensor === "hx717") {
      const clean: number[] = [];
      for (const sample of counts) {
        if (isHxErrorSample(sample)) this.errors++;
        else clean.push(sample);
      }
      counts = clean;
    }
    if (!counts.length) return;
    const hostT = now();
    const batch: Sample[] = [];
    for (let i = 0; i < counts.length; i++) {
      batch.push({
        hostT,
        t: hostT - (counts.length - 1 - i) / this.currentSps,
        index: this.sampleIndex++,
        counts: counts[i],
      });
    }
    for (const cb of this.listeners) cb(batch);
  }

  private log(line: string) {
    this.onLog?.(line);
  }
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
}

function bytesEqual(got: ArrayLike<number>, expect: ArrayLike<number>): boolean {
  if (got.length < expect.length) return false;
  for (let i = 0; i < expect.length; i++) if (got[i] !== expect[i]) return false;
  return true;
}

function hex(bytes: ArrayLike<number>): string {
  return Array.from(bytes)
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(" ");
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function now() {
  return performance.now() / 1000;
}

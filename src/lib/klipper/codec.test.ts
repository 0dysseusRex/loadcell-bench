import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import {
  crc16Ccitt,
  crc32,
  encodeVarint,
  parseVarint,
  encodeBlock,
  extractFrames,
  MessageParser,
  configCrc,
  expandEnums,
} from "./codec.ts";

function py(code: string): string {
  const result = spawnSync("python3", ["-c", code], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

const PY_CODEC = `
def crc16_ccitt(buf):
    crc = 0xffff
    for data in buf:
        data ^= crc & 0xff
        data ^= (data & 0x0f) << 4
        crc = ((data << 8) | (crc >> 8)) ^ (data >> 4) ^ (data << 3)
        crc &= 0xffff
    return (crc >> 8, crc & 0xff)

def enc(v):
    out=[]
    if v >= 0xc000000 or v < -0x4000000: out.append((v>>28) & 0x7f | 0x80)
    if v >= 0x180000 or v < -0x80000: out.append((v>>21) & 0x7f | 0x80)
    if v >= 0x3000 or v < -0x1000: out.append((v>>14) & 0x7f | 0x80)
    if v >= 0x60 or v < -0x20: out.append((v>>7) & 0x7f | 0x80)
    out.append(v & 0x7f)
    return out
`;

test("crc16 matches Klipper", () => {
  assert.deepEqual(crc16Ccitt([97, 98, 99]), [97, 218]);
  const oracle = py(`${PY_CODEC}\nprint(list(crc16_ccitt(bytes([8, 0x11, 1, 0, 40]))))`);
  assert.deepEqual(crc16Ccitt([8, 0x11, 1, 0, 40]), JSON.parse(oracle));
});

test("varints round-trip and match Klipper", () => {
  const values = [0, 1, 40, 127, 128, 255, 1000, -1, -32, -33, 8388607, 3081487381];
  for (const value of values) {
    const encoded = encodeVarint(value);
    const oracle = py(`${PY_CODEC}\nprint(enc(${value}))`);
    assert.deepEqual(encoded, JSON.parse(oracle), `encode ${value}`);
    const [decoded] = parseVarint(encoded, 0, value < 0);
    if (value < 0) assert.equal(decoded, value);
    else assert.equal(decoded, value >>> 0);
  }
});

test("identify block matches a Klipper frame", () => {
  const parser = new MessageParser();
  const payload = parser.encodeCommand("identify", { offset: 0, count: 40 });
  const frame = encodeBlock(1, payload);
  assert.equal(frame[0], frame.length);
  assert.equal(frame[1], 0x11);
  assert.equal(frame[frame.length - 1], 0x7e);
  const oracle = py(`
${PY_CODEC}
payload = bytes([1, 0, 40])
msglen = 5 + len(payload)
buf = bytes([msglen, 0x10 | 1]) + payload
crc = crc16_ccitt(buf)
frame = buf + bytes([crc[0], crc[1], 0x7e])
print(frame.hex())
`);
  assert.equal(Buffer.from(frame).toString("hex"), oracle);
  const prefix = new Uint8Array([0x7e, 0x00, 0xff]);
  const tail = new Uint8Array([8, 0x11]);
  const blob = new Uint8Array(prefix.length + frame.length + tail.length);
  blob.set(prefix, 0);
  blob.set(frame, prefix.length);
  blob.set(tail, prefix.length + frame.length);
  const { frames, rest } = extractFrames(blob);
  assert.equal(frames.length, 1);
  assert.equal(Buffer.from(frames[0]).toString("hex"), oracle);
  assert.deepEqual(Array.from(rest), [8, 0x11]);
  const parsed = parser.parseContent(frames[0].subarray(2, frames[0].length - 3));
  assert.equal(parsed[0].name, "identify");
  assert.equal(parsed[0].params.offset, 0);
  assert.equal(parsed[0].params.count, 40);
});

test("config crc matches zlib", () => {
  const lines = [
    "allocate_oids count=2",
    "config_spi oid=0 pin=PA14 cs_active_high=0",
    "spi_set_sw_bus oid=0 miso_pin=PA15 mosi_pin=PB13 sclk_pin=PB7 mode=1 pulse_ticks=664",
    "config_ads1220 oid=1 spi_oid=0 data_ready_pin=PA1",
  ];
  assert.equal(configCrc(lines), 3081487381);
  assert.equal(crc32(new TextEncoder().encode("abc")), 891568578);
});

test("enumeration ranges and pin encoding", () => {
  const pins = expandEnums({ PA0: [0, 16], PB0: [16, 16] });
  assert.equal(pins.PA14, 14);
  assert.equal(pins.PB13, 29);
  const parser = new MessageParser();
  parser.loadDictionary(
    JSON.stringify({
      commands: {
        "config_spi oid=%c pin=%u cs_active_high=%c": 10,
      },
      responses: {
        "config is_config=%c crc=%u is_shutdown=%c move_count=%hu": 11,
      },
      enumerations: { pin: { PA0: [0, 16] } },
      config: { CLOCK_FREQ: "170000000" },
      version: "v0.12.0",
    }),
  );
  const payload = parser.encodeCommand("config_spi", { oid: 0, pin: "PA14", cs_active_high: 0 });
  const parsed = parser.parseContent(payload);
  assert.equal(parsed[0].params.pin, "PA14");
  assert.equal(parsed[0].params.oid, 0);
  assert.throws(() => parser.encodeCommand("config_spi", { oid: 0, pin: "PZ9", cs_active_high: 0 }));
});

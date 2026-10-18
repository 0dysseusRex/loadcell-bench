// Klipper MCU message codec. Matches klippy/msgproto.py byte for byte:
// CRC-16, signed VLQ integers, and the 5-byte framed message block.

export const MESSAGE_MIN = 5;
export const MESSAGE_MAX = 64;
export const MESSAGE_SYNC = 0x7e;
export const MESSAGE_DEST = 0x10;

export function crc16Ccitt(buf: ArrayLike<number>): [number, number] {
  let crc = 0xffff;
  for (let i = 0; i < buf.length; i++) {
    let data = (buf[i] ^ (crc & 0xff)) & 0xff;
    data ^= (data & 0x0f) << 4;
    crc = (((data << 8) | (crc >> 8)) ^ (data >> 4) ^ (data << 3)) & 0xffff;
  }
  return [crc >> 8, crc & 0xff];
}

/** zlib.crc32, returned as an unsigned 32-bit number. */
export function crc32(buf: ArrayLike<number>): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

export function encodeVarint(v: number): number[] {
  const x = BigInt(Math.trunc(v));
  const out: number[] = [];
  const push = (shift: number) => {
    out.push(Number((x >> BigInt(shift)) & 0x7fn) | 0x80);
  };
  if (v >= 0xc000000 || v < -0x4000000) push(28);
  if (v >= 0x180000 || v < -0x80000) push(21);
  if (v >= 0x3000 || v < -0x1000) push(14);
  if (v >= 0x60 || v < -0x20) push(7);
  out.push(Number(x & 0x7fn));
  return out;
}

export function parseVarint(
  s: ArrayLike<number>,
  pos: number,
  signed: boolean,
): [number, number] {
  let c = s[pos];
  pos += 1;
  let v = BigInt(c & 0x7f);
  if ((c & 0x60) === 0x60) v = BigInt.asIntN(64, v | BigInt(-0x20));
  while (c & 0x80) {
    c = s[pos];
    pos += 1;
    v = BigInt.asIntN(64, (v << 7n) | BigInt(c & 0x7f));
  }
  if (!signed) v = v & 0xffffffffn;
  return [Number(v), pos];
}

export type ParamValue = number | string | Uint8Array;

type ParamKind =
  | { kind: "int"; signed: boolean }
  | { kind: "bytes" }
  | { kind: "enum"; signed: boolean; values: Record<string, number>; reverse: Map<number, string> };

export type ParsedMessage = {
  name: string;
  params: Record<string, ParamValue>;
};

type Field = { name: string; type: ParamKind };

class CommandFormat {
  readonly name: string;
  readonly fields: Field[];
  readonly msgidBytes: number[];
  readonly output: boolean;

  constructor(
    msgid: number,
    format: string,
    enums: Record<string, Record<string, number>>,
    output: boolean,
  ) {
    this.name = format.split(" ")[0];
    this.output = output;
    this.msgidBytes = encodeVarint(msgid);
    this.fields = output ? [] : fieldsFromFormat(format, enums);
  }

  encode(params: Record<string, ParamValue>): number[] {
    const out = [...this.msgidBytes];
    for (const field of this.fields) {
      const value = params[field.name];
      if (value === undefined) {
        throw new Error(`Missing parameter ${field.name} for ${this.name}`);
      }
      encodeField(out, field.type, value);
    }
    return out;
  }

  parse(s: ArrayLike<number>, pos: number): [ParsedMessage, number] {
    pos += this.msgidBytes.length;
    if (this.output) {
      return [{ name: this.name, params: { "#msg": new TextDecoder().decode(Uint8Array.from(Array.prototype.slice.call(s, pos))) } }, s.length];
    }
    const params: Record<string, ParamValue> = {};
    for (const field of this.fields) {
      const [value, next] = decodeField(s, pos, field.type);
      params[field.name] = value;
      pos = next;
    }
    return [{ name: this.name, params }, pos];
  }
}

function fieldsFromFormat(
  format: string,
  enums: Record<string, Record<string, number>>,
): Field[] {
  const parts = format.split(" ").slice(1);
  return parts.map((part) => {
    const eq = part.indexOf("=");
    const name = part.slice(0, eq);
    const fmt = part.slice(eq + 1);
    let type: ParamKind;
    if (fmt === "%s" || fmt === "%.*s" || fmt === "%*s") type = { kind: "bytes" };
    else if (fmt === "%i" || fmt === "%hi") type = { kind: "int", signed: true };
    else type = { kind: "int", signed: false };
    for (const [enumName, values] of Object.entries(enums)) {
      if (name === enumName || name.endsWith("_" + enumName)) {
        const reverse = new Map<number, string>();
        for (const [label, id] of Object.entries(values)) reverse.set(id, label);
        type = { kind: "enum", signed: type.kind === "int" ? type.signed : false, values, reverse };
        break;
      }
    }
    return { name, type };
  });
}

function encodeField(out: number[], type: ParamKind, value: ParamValue) {
  if (type.kind === "bytes") {
    const bytes = value instanceof Uint8Array ? value : new TextEncoder().encode(String(value));
    if (bytes.length > 255) throw new Error("Klipper string parameter is longer than 255 bytes");
    out.push(bytes.length);
    for (const b of bytes) out.push(b);
    return;
  }
  let numeric: number;
  if (type.kind === "enum") {
    if (typeof value !== "string") throw new Error("Enumeration parameter expected a name");
    const id = type.values[value];
    if (id === undefined) throw new Error(`Unknown ${value}`);
    numeric = id;
    encodeVarintInto(out, numeric);
    return;
  }
  if (typeof value !== "number") throw new Error("Integer parameter expected a number");
  encodeVarintInto(out, value);
}

function encodeVarintInto(out: number[], v: number) {
  for (const b of encodeVarint(v)) out.push(b);
}

function decodeField(s: ArrayLike<number>, pos: number, type: ParamKind): [ParamValue, number] {
  if (type.kind === "bytes") {
    const len = s[pos];
    const start = pos + 1;
    const bytes = Uint8Array.from(Array.prototype.slice.call(s, start, start + len));
    return [bytes, start + len];
  }
  const signed = type.kind === "int" ? type.signed : type.signed;
  const [numeric, next] = parseVarint(s, pos, signed);
  if (type.kind === "enum") {
    return [type.reverse.get(numeric) ?? `?${numeric}`, next];
  }
  return [numeric, next];
}

export class MessageParser {
  private byId = new Map<number, CommandFormat>();
  private byName = new Map<string, CommandFormat>();
  enumerations: Record<string, Record<string, number>> = {};
  config: Record<string, string> = {};
  version = "";
  buildVersions = "";

  constructor() {
    this.addFormat("identify_response offset=%u data=%.*s", 0, false);
    this.addFormat("identify offset=%u count=%c", 1, false);
  }

  private addFormat(format: string, id: number, output: boolean) {
    const cmd = new CommandFormat(id, format, this.enumerations, output);
    this.byId.set(id, cmd);
    if (!output) this.byName.set(cmd.name, cmd);
  }

  loadDictionary(jsonText: string) {
    const data = JSON.parse(jsonText) as {
      commands?: Record<string, number>;
      responses?: Record<string, number>;
      output?: Record<string, number>;
      enumerations?: Record<string, Record<string, number | [number, number]>>;
      config?: Record<string, string | number>;
      version?: string;
      build_versions?: string;
    };
    this.enumerations = {};
    for (const [group, entries] of Object.entries(data.enumerations ?? {})) {
      this.enumerations[group] = expandEnums(entries);
    }
    this.byId.clear();
    this.byName.clear();
    this.addFormat("identify_response offset=%u data=%.*s", 0, false);
    this.addFormat("identify offset=%u count=%c", 1, false);
    const outputIds = new Set(Object.values(data.output ?? {}));
    const all: Record<string, number> = {
      ...(data.commands ?? {}),
      ...(data.responses ?? {}),
      ...(data.output ?? {}),
    };
    for (const [format, id] of Object.entries(all)) {
      this.addFormat(format, id, outputIds.has(id));
    }
    this.config = {};
    for (const [key, value] of Object.entries(data.config ?? {})) {
      this.config[key] = String(value);
    }
    this.version = data.version ?? "";
    this.buildVersions = data.build_versions ?? "";
  }

  hasCommand(name: string): boolean {
    return this.byName.has(name);
  }

  commandFormat(name: string): string | null {
    const cmd = this.byName.get(name);
    return cmd ? cmd.name : null;
  }

  encodeCommand(name: string, params: Record<string, ParamValue> = {}): number[] {
    const cmd = this.byName.get(name);
    if (!cmd) throw new Error(`Firmware does not implement ${name}`);
    try {
      return cmd.encode(params);
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("Unknown ")) {
        throw new Error(`Pin or value ${err.message.slice(8)} is not valid for ${name} on this board`);
      }
      throw err;
    }
  }

  parseContent(content: ArrayLike<number>): ParsedMessage[] {
    const out: ParsedMessage[] = [];
    let pos = 0;
    while (pos < content.length) {
      const [msgid, next] = parseVarint(content, pos, true);
      const cmd = this.byId.get(msgid);
      if (!cmd) {
        out.push({ name: "#unknown", params: { msgid } });
        break;
      }
      // parse() re-reads the msgid, so hand it the original position.
      if (next - pos !== cmd.msgidBytes.length && !cmd.output) {
        // fall through; parse consumes msgid itself
      }
      const [msg, end] = cmd.parse(content, pos);
      out.push(msg);
      if (end <= pos) break;
      pos = end;
    }
    return out;
  }
}

export function expandEnums(
  entries: Record<string, number | [number, number]>,
): Record<string, number> {
  const enums: Record<string, number> = {};
  for (const [name, value] of Object.entries(entries)) {
    if (typeof value === "number") {
      enums[name] = value;
      continue;
    }
    let root = name;
    while (root && root[root.length - 1] >= "0" && root[root.length - 1] <= "9") {
      root = root.slice(0, -1);
    }
    const startEnum = root.length === name.length ? 0 : Number(name.slice(root.length));
    const [startValue, count] = value;
    for (let i = 0; i < count; i++) enums[root + String(startEnum + i)] = startValue + i;
  }
  return enums;
}

export function encodeBlock(seq: number, payload: ArrayLike<number>): Uint8Array {
  const msglen = MESSAGE_MIN + payload.length;
  if (msglen > MESSAGE_MAX) throw new Error("Klipper message exceeds 64 bytes");
  const out = new Uint8Array(msglen);
  out[0] = msglen;
  out[1] = MESSAGE_DEST | (seq & 0x0f);
  for (let i = 0; i < payload.length; i++) out[2 + i] = payload[i];
  const [hi, lo] = crc16Ccitt(out.subarray(0, msglen - 3));
  out[msglen - 3] = hi;
  out[msglen - 2] = lo;
  out[msglen - 1] = MESSAGE_SYNC;
  return out;
}

export function frameSequence(frame: Uint8Array): number {
  return frame[1] & 0x0f;
}

/** Pull every valid message block out of a byte stream. Leading 0x7e bytes are ignored. */
export function extractFrames(buffer: Uint8Array): { frames: Uint8Array[]; rest: Uint8Array } {
  const frames: Uint8Array[] = [];
  let i = 0;
  while (i < buffer.length) {
    if (buffer[i] === MESSAGE_SYNC) {
      i++;
      continue;
    }
    if (buffer.length - i < MESSAGE_MIN) break;
    const len = buffer[i];
    if (len < MESSAGE_MIN || len > MESSAGE_MAX) {
      i++;
      continue;
    }
    if (buffer.length - i < len) break;
    const seq = buffer[i + 1];
    const syncOk = buffer[i + len - 1] === MESSAGE_SYNC;
    const destOk = (seq & 0xf0) === MESSAGE_DEST;
    if (!syncOk || !destOk) {
      i++;
      continue;
    }
    const [hi, lo] = crc16Ccitt(buffer.subarray(i, i + len - 3));
    if (buffer[i + len - 3] !== hi || buffer[i + len - 2] !== lo) {
      i++;
      continue;
    }
    frames.push(buffer.slice(i, i + len));
    i += len;
  }
  return { frames, rest: buffer.slice(i) };
}

export function configCrc(lines: string[]): number {
  const text = lines.join("\n");
  return crc32(new TextEncoder().encode(text));
}

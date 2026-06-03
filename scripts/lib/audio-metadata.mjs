import fs from "node:fs";

const MPEG_BITRATES = {
  V1: {
    L1: [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
    L2: [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
    L3: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]
  },
  V2: {
    L1: [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256],
    L2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
    L3: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160]
  }
};

const MPEG_SAMPLE_RATES = {
  V1: [44100, 48000, 32000],
  V2: [22050, 24000, 16000],
  V25: [11025, 12000, 8000]
};

const statCache = new Map();
const durationCache = new Map();

function skipId3v2Tag(buffer) {
  if (buffer.length < 10) return 0;
  if (buffer.toString("ascii", 0, 3) !== "ID3") return 0;
  const size = ((buffer[6] & 0x7f) << 21)
    | ((buffer[7] & 0x7f) << 14)
    | ((buffer[8] & 0x7f) << 7)
    | (buffer[9] & 0x7f);
  return 10 + size;
}

function parseMpegHeader(buffer, offset) {
  if (offset + 4 > buffer.length) return null;
  if (buffer[offset] !== 0xff || (buffer[offset + 1] & 0xe0) !== 0xe0) return null;

  const value = buffer.readUInt32BE(offset);
  const versionBits = (value >> 19) & 0b11;
  const layerBits = (value >> 17) & 0b11;
  const bitrateIndex = (value >> 12) & 0b1111;
  const sampleRateIndex = (value >> 10) & 0b11;
  const paddingBit = (value >> 9) & 0b1;

  if (versionBits === 0b01 || layerBits === 0b00 || bitrateIndex === 0 || bitrateIndex === 0b1111 || sampleRateIndex === 0b11) {
    return null;
  }

  const version = versionBits === 0b11 ? "V1" : versionBits === 0b10 ? "V2" : "V25";
  const layer = layerBits === 0b11 ? "L1" : layerBits === 0b10 ? "L2" : "L3";
  const bitrateFamily = version === "V1" ? "V1" : "V2";
  const bitrate = MPEG_BITRATES[bitrateFamily][layer][bitrateIndex];
  const sampleRate = MPEG_SAMPLE_RATES[version][sampleRateIndex];
  if (!bitrate || !sampleRate) return null;

  const samplesPerFrame = layer === "L1" ? 384 : layer === "L2" ? 1152 : version === "V1" ? 1152 : 576;
  const coefficient = layer === "L1" ? 12 : (layer === "L3" && version !== "V1") ? 72 : 144;
  const frameLength = layer === "L1"
    ? Math.floor(((coefficient * bitrate * 1000) / sampleRate) + paddingBit) * 4
    : Math.floor(((coefficient * bitrate * 1000) / sampleRate) + paddingBit);

  if (!Number.isFinite(frameLength) || frameLength <= 0) return null;

  return {
    frameLength,
    samplesPerFrame,
    sampleRate
  };
}

export function formatAudioDuration(totalSeconds) {
  const rounded = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const seconds = rounded % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function readAudioFileSize(filePath) {
  let stat = statCache.get(filePath);
  if (!stat) {
    stat = fs.statSync(filePath);
    statCache.set(filePath, stat);
  }
  return stat.size;
}

export function readMp3Duration(filePath) {
  const cached = durationCache.get(filePath);
  if (cached !== undefined) return cached;

  const buffer = fs.readFileSync(filePath);
  let offset = skipId3v2Tag(buffer);
  let durationSeconds = 0;
  let frameCount = 0;

  while (offset + 4 <= buffer.length) {
    const header = parseMpegHeader(buffer, offset);
    if (!header) {
      offset += frameCount === 0 ? 1 : 1;
      continue;
    }

    if (offset + header.frameLength > buffer.length) break;

    durationSeconds += header.samplesPerFrame / header.sampleRate;
    frameCount += 1;
    offset += header.frameLength;
  }

  const duration = frameCount > 0 ? formatAudioDuration(durationSeconds) : null;
  durationCache.set(filePath, duration);
  return duration;
}

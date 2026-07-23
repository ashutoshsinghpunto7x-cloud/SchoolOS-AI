// One-off generator for the default notification sound asset.
// Produces a short (~300ms), subtle two-tone chime as 16-bit PCM WAV.
// Not part of the build — run manually if the asset ever needs regenerating.
const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;
const notes = [
  { freq: 1046.5, start: 0, duration: 0.11 }, // C6
  { freq: 1567.98, start: 0.09, duration: 0.16 }, // G6
];
const totalDuration = 0.3;
const totalSamples = Math.floor(SAMPLE_RATE * totalDuration);
const samples = new Float32Array(totalSamples);

function envelope(tNorm) {
  // Quick attack, smooth exponential-ish decay — avoids clicks, stays soft.
  const attack = 0.08;
  if (tNorm < attack) return tNorm / attack;
  return Math.pow(1 - (tNorm - attack) / (1 - attack), 1.6);
}

for (const note of notes) {
  const startSample = Math.floor(note.start * SAMPLE_RATE);
  const noteSamples = Math.floor(note.duration * SAMPLE_RATE);
  for (let i = 0; i < noteSamples; i++) {
    const idx = startSample + i;
    if (idx >= totalSamples) break;
    const tNorm = i / noteSamples;
    const t = i / SAMPLE_RATE;
    const value = Math.sin(2 * Math.PI * note.freq * t) * envelope(tNorm) * 0.22;
    samples[idx] += value;
  }
}

// Clamp to avoid overlap clipping
for (let i = 0; i < totalSamples; i++) {
  samples[i] = Math.max(-1, Math.min(1, samples[i]));
}

const bytesPerSample = 2;
const blockAlign = bytesPerSample * 1; // mono
const dataSize = totalSamples * bytesPerSample;
const buffer = Buffer.alloc(44 + dataSize);

buffer.write('RIFF', 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write('WAVE', 8);
buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16); // fmt chunk size
buffer.writeUInt16LE(1, 20); // PCM
buffer.writeUInt16LE(1, 22); // mono
buffer.writeUInt32LE(SAMPLE_RATE, 24);
buffer.writeUInt32LE(SAMPLE_RATE * blockAlign, 28);
buffer.writeUInt16LE(blockAlign, 32);
buffer.writeUInt16LE(16, 34);
buffer.write('data', 36);
buffer.writeUInt32LE(dataSize, 40);

for (let i = 0; i < totalSamples; i++) {
  const s = Math.round(samples[i] * 32767);
  buffer.writeInt16LE(s, 44 + i * 2);
}

const outDir = path.resolve(__dirname, '../public/sounds');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'notification-default.wav');
fs.writeFileSync(outPath, buffer);
console.log('Wrote', outPath, `(${dataSize} bytes audio data)`);

/**
 * Script para gerar o som provisório de alerta crítico para a Fatia 8A do PoolSafe.
 * 
 * Gera um arquivo WAV original, curto e limpo (áudio senoidal bitonal de ~0.8s),
 * 100% sintetizado em código, livre de direitos autorais ou dependências externas.
 */
const fs = require('fs');
const path = require('path');

const sampleRate = 44100;
const numChannels = 1;
const bitsPerSample = 16;

function generateAlertAudio() {
  const durationSeconds = 0.8;
  const totalSamples = Math.floor(sampleRate * durationSeconds);
  const buffer = Buffer.alloc(totalSamples * 2);

  // Tom 1: 880 Hz (A5) por 0.25s
  // Intervalo de silêncio: 0.05s
  // Tom 2: 1320 Hz (E6) por 0.45s com decaimento exponencial
  const tone1End = Math.floor(0.25 * sampleRate);
  const pauseEnd = Math.floor(0.30 * sampleRate);
  const freq1 = 880;
  const freq2 = 1320;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    if (i < tone1End) {
      // Envelope de ataque rápido e sustentação
      const env = Math.min(1, i / (0.01 * sampleRate)) * (1 - (i / tone1End) * 0.2);
      sample = 0.65 * Math.sin(2 * Math.PI * freq1 * t) * env;
    } else if (i >= pauseEnd) {
      // Segundo tom com decaimento suave
      const tTone2 = (i - pauseEnd) / sampleRate;
      const tone2TotalTime = (totalSamples - pauseEnd) / sampleRate;
      const decay = Math.exp(-3.5 * (tTone2 / tone2TotalTime));
      const attack = Math.min(1, (i - pauseEnd) / (0.01 * sampleRate));
      sample = 0.75 * Math.sin(2 * Math.PI * freq2 * t) * attack * decay;
    }

    const int16Sample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    buffer.writeInt16LE(int16Sample, i * 2);
  }

  return buffer;
}

function createWavHeader(dataLength) {
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);

  // RIFF Chunk Descriptor
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write('WAVE', 8);

  // fmt sub-chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size
  header.writeUInt16LE(1, 20);  // AudioFormat (1 = PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);

  // data sub-chunk
  header.write('data', 36);
  header.writeUInt32LE(dataLength, 40);

  return header;
}

const soundsDir = path.resolve(__dirname, '../assets/sounds');
if (!fs.existsSync(soundsDir)) {
  fs.mkdirSync(soundsDir, { recursive: true });
}

const pcmData = generateAlertAudio();
const header = createWavHeader(pcmData.length);
const wavFile = Buffer.concat([header, pcmData]);

const targetPath = path.resolve(soundsDir, 'poolsafe_alert_provisional.wav');
fs.writeFileSync(targetPath, wavFile);

console.log(`✅ Som provisório gerado em: ${targetPath} (${wavFile.length} bytes)`);

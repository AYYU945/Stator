/**
 * Generates real, deterministic in-memory media Files when a visitor clicks
 * "Load sample files" from an empty queue — zero pre-populated fake records.
 */

function renderSamplePngFile(
  filename: string,
  width: number,
  height: number,
  variant: 'card' | 'badge'
): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas 2D context unavailable'));
      return;
    }

    const grad = ctx.createLinearGradient(0, 0, width, height);
    if (variant === 'card') {
      grad.addColorStop(0, '#09090b');
      grad.addColorStop(0.55, '#18181b');
      grad.addColorStop(1, '#27272a');
    } else {
      grad.addColorStop(0, '#18181b');
      grad.addColorStop(1, '#09090b');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    const step = 48;
    for (let x = 0; x < width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const cx = width / 2;
    const cy = height / 2 - (variant === 'card' ? 24 : 0);
    const radius = Math.min(width, height) * 0.22;

    ctx.strokeStyle = '#f4f4f5';
    ctx.lineWidth = Math.max(4, radius * 0.14);
    ctx.setLineDash([radius * 0.35, radius * 0.2]);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#f4f4f5';
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.34, 0, Math.PI * 2);
    ctx.fill();

    if (variant === 'card') {
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 28px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Stator Sample Master (960 × 540)', cx, cy + radius + 58);

      ctx.fillStyle = '#a1a1aa';
      ctx.font = '500 16px ui-monospace, monospace';
      ctx.fillText('In-memory synthesized PNG • 100% client-side', cx, cy + radius + 88);
    }

    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to generate sample PNG blob'));
        return;
      }
      resolve(new File([blob], filename, { type: 'image/png', lastModified: Date.now() }));
    }, 'image/png');
  });
}

function generateSampleWavFile(filename: string, durationSeconds = 2): File {
  const sampleRate = 44100;
  const numChannels = 2;
  const bitsPerSample = 16;
  const numSamples = sampleRate * durationSeconds;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeAscii = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeAscii(36, 'data');
  view.setUint32(40, dataSize, true);

  const freqs = [220, 277.18, 329.63, 440];
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.min(1, t / 0.08) * Math.min(1, (durationSeconds - t) / 0.25);
    let sample = 0;
    for (const f of freqs) {
      sample += Math.sin(2 * Math.PI * f * t);
    }
    const clamped = Math.max(-1, Math.min(1, (sample / freqs.length) * 0.45 * envelope));
    const int16 = Math.round(clamped * 32767);
    view.setInt16(offset, int16, true);
    view.setInt16(offset + 2, int16, true);
    offset += 4;
  }

  return new File([buffer], filename, { type: 'audio/wav', lastModified: Date.now() });
}

export async function generateSampleMediaFiles(): Promise<File[]> {
  const [cardPng, altPng] = await Promise.all([
    renderSamplePngFile('stator-sample-card.png', 960, 540, 'card'),
    renderSamplePngFile('stator-sample-alt.png', 640, 640, 'badge'),
  ]);
  const chordWav = generateSampleWavFile('stator-sample-chord.wav', 2);
  return [cardPng, chordWav, altPng];
}

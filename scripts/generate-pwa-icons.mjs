import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '..', 'public');

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0; // filter None
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const compressed = zlib.deflateSync(raw, { level: 6 });
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

function renderStatorIcon(size, maskable = false) {
  const rgba = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const radiusScale = maskable ? 0.34 : 0.42;
  const ringR = size * radiusScale;
  const ringThick = Math.max(2, size * (maskable ? 0.065 : 0.08));
  const coreR = size * (maskable ? 0.11 : 0.13);
  const cornerR = maskable ? 0 : size * 0.18;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Rounded rect background mask
      let alphaBg = 255;
      if (cornerR > 0) {
        const dx = Math.max(cornerR - x, x - (size - 1 - cornerR), 0);
        const dy = Math.max(cornerR - y, y - (size - 1 - cornerR), 0);
        const distCorner = Math.hypot(dx, dy);
        if (distCorner > cornerR + 0.5) {
          alphaBg = 0;
        } else if (distCorner > cornerR - 0.5) {
          alphaBg = Math.round(255 * Math.max(0, cornerR + 0.5 - distCorner));
        }
      }

      if (alphaBg === 0) {
        rgba[idx] = 0;
        rgba[idx + 1] = 0;
        rgba[idx + 2] = 0;
        rgba[idx + 3] = 0;
        continue;
      }

      // Base background #121214 (18, 18, 20)
      let r = 18;
      let g = 18;
      let b = 20;

      // Subtle inner border
      const distEdge = Math.min(x, y, size - 1 - x, size - 1 - y);
      if (!maskable && distEdge >= 1 && distEdge <= Math.max(1.5, size * 0.01)) {
        r = 39;
        g = 39;
        b = 42;
      }

      // Dashed stator ring + rotor dot in #F4F4F5 (244, 244, 245)
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const dist = Math.hypot(dx, dy);
      const angle = (Math.atan2(dy, dx) + Math.PI * 2) % (Math.PI * 2);

      // 8 clean stator segments
      const seg = (angle / (Math.PI * 2)) * 8;
      const segFrac = seg - Math.floor(seg);
      const inDash = segFrac < 0.68;

      let fg = 0;
      if (dist <= coreR + 0.8) {
        fg = Math.max(fg, Math.min(1, coreR + 0.8 - dist));
      }
      if (inDash) {
        const ringDist = Math.abs(dist - ringR);
        const halfT = ringThick / 2;
        if (ringDist <= halfT + 0.8) {
          fg = Math.max(fg, Math.min(1, halfT + 0.8 - ringDist));
        }
      }

      if (fg > 0) {
        r = Math.round(r + (244 - r) * fg);
        g = Math.round(g + (244 - g) * fg);
        b = Math.round(b + (245 - b) * fg);
      }

      rgba[idx] = r;
      rgba[idx + 1] = g;
      rgba[idx + 2] = b;
      rgba[idx + 3] = alphaBg;
    }
  }

  return encodePng(size, size, rgba);
}

fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), renderStatorIcon(192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), renderStatorIcon(512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), renderStatorIcon(512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), renderStatorIcon(180, false));
console.log('[generate-pwa-icons] Generated PNG icons in public/');

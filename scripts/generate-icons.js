import fs from 'fs';
import zlib from 'zlib';

function createPng(width, height, r = 6, g = 95, b = 70) {
  // Create raw uncompressed RGBA pixel buffer
  const rowBytes = width * 4 + 1; // +1 for filter type 0 (None)
  const buffer = Buffer.alloc(rowBytes * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    buffer[rowOffset] = 0; // Filter type None
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      // create slight gradient / border
      const isBorder = x < 4 || x > width - 5 || y < 4 || y > height - 5;
      buffer[pixelOffset] = isBorder ? 16 : r;     // R
      buffer[pixelOffset + 1] = isBorder ? 185 : g; // G
      buffer[pixelOffset + 2] = isBorder ? 129 : b; // B
      buffer[pixelOffset + 3] = 255;                // A
    }
  }

  const deflated = zlib.deflateSync(buffer);

  // PNG Signature
  const pngSig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // Bit depth
  ihdr.writeUInt8(6, 9); // ColorType RGBA
  ihdr.writeUInt8(0, 10); // Compression
  ihdr.writeUInt8(0, 11); // Filter
  ihdr.writeUInt8(0, 12); // Interlace

  const makeChunk = (type, data) => {
    const len = data.length;
    const buf = Buffer.alloc(len + 12);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4);
    data.copy(buf, 8);
    // Simple CRC-32 calculation
    const crc = crc32(Buffer.concat([Buffer.from(type), data]));
    buf.writeInt32BE(crc, len + 8);
    return buf;
  };

  // CRC-32
  function crc32(buf) {
    let c = -1;
    for (let i = 0; i < buf.length; i++) {
      let b = buf[i];
      for (let j = 0; j < 8; j++) {
        if ((c ^ b) & 1) {
          c = (c >>> 1) ^ 0xedb88320;
        } else {
          c = c >>> 1;
        }
        b = b >>> 1;
      }
    }
    return (c ^ -1) | 0;
  }

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([pngSig, ihdrChunk, idatChunk, iendChunk]);
}

if (!fs.existsSync('./public')) {
  fs.mkdirSync('./public', { recursive: true });
}

fs.writeFileSync('./public/pwa-192x192.png', createPng(192, 192));
fs.writeFileSync('./public/pwa-512x512.png', createPng(512, 512));
fs.writeFileSync('./public/pwa-maskable-512x512.png', createPng(512, 512, 4, 120, 87));
fs.writeFileSync('./public/apple-touch-icon.png', createPng(180, 180));
console.log('Successfully generated PWA compliant icons in /public.');

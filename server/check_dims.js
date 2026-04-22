import fs from 'fs';

function getJpegDimensions(filepath) {
  const buf = fs.readFileSync(filepath);
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xFF) break;
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
      const height = buf.readUInt16BE(i + 5);
      const width = buf.readUInt16BE(i + 7);
      return { width, height };
    }
    i += 2 + len;
  }
  return null;
}

const cert = getJpegDimensions('assets/images/FWT iZON Certificate_page-0001.jpg');
console.log('Certificate:', cert);
const rcpt = getJpegDimensions('assets/images/FWT iZON Receipt_page-0001.jpg');
console.log('Receipt:', rcpt);

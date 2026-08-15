(() => {
  'use strict';

  // Small dependency-free QR encoder for the short student-email payload used by
  // Campus Buddy. Version 3-L (29x29, 55 data codewords, 15 ECC codewords).
  const VERSION = 3;
  const SIZE = 17 + VERSION * 4;
  const DATA_CODEWORDS = 55;
  const ECC_CODEWORDS = 15;
  const MASK = 0;

  const esc = value => String(value).replace(/[&<>"']/g, char => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[char]);

  function gfMultiply(x, y) {
    let z = 0;
    for (let i = 7; i >= 0; i -= 1) {
      z = (z << 1) ^ ((z >>> 7) * 0x11D);
      z ^= ((y >>> i) & 1) * x;
    }
    return z;
  }

  function reedSolomonDivisor(degree) {
    const result = Array(degree).fill(0);
    result[degree - 1] = 1;
    let root = 1;
    for (let i = 0; i < degree; i += 1) {
      for (let j = 0; j < result.length; j += 1) {
        result[j] = gfMultiply(result[j], root);
        if (j + 1 < result.length) result[j] ^= result[j + 1];
      }
      root = gfMultiply(root, 2);
    }
    return result;
  }

  function reedSolomonRemainder(data, divisor) {
    const result = Array(divisor.length).fill(0);
    for (const byte of data) {
      const factor = byte ^ result.shift();
      result.push(0);
      for (let i = 0; i < result.length; i += 1) result[i] ^= gfMultiply(divisor[i], factor);
    }
    return result;
  }

  function dataCodewords(text) {
    const bytes = [...new TextEncoder().encode(String(text))];
    if (bytes.length > 53) throw new Error('Student email is too long for the demo QR code.');
    const bits = [];
    const append = (value, count) => {
      for (let i = count - 1; i >= 0; i -= 1) bits.push((value >>> i) & 1);
    };

    append(0b0100, 4); // Byte mode.
    append(bytes.length, 8);
    bytes.forEach(byte => append(byte, 8));

    const capacity = DATA_CODEWORDS * 8;
    for (let i = 0; i < Math.min(4, capacity - bits.length); i += 1) bits.push(0);
    while (bits.length % 8) bits.push(0);

    const output = [];
    for (let offset = 0; offset < bits.length; offset += 8) {
      let value = 0;
      for (let bit = 0; bit < 8; bit += 1) value = (value << 1) | bits[offset + bit];
      output.push(value);
    }
    for (let pad = 0; output.length < DATA_CODEWORDS; pad += 1) output.push(pad % 2 ? 0x11 : 0xEC);
    return output;
  }

  function formatBits(mask) {
    // Error-correction level L has format bits 01.
    const data = (1 << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i += 1) rem = (rem << 1) ^ (((rem >>> 9) & 1) * 0x537);
    return ((data << 10) | rem) ^ 0x5412;
  }

  function matrix(text) {
    const modules = Array.from({ length:SIZE }, () => Array(SIZE).fill(false));
    const isFunction = Array.from({ length:SIZE }, () => Array(SIZE).fill(false));
    const setFunction = (x, y, dark) => {
      if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
      modules[y][x] = Boolean(dark);
      isFunction[y][x] = true;
    };

    const finder = (cx, cy) => {
      for (let dy = -4; dy <= 4; dy += 1) {
        for (let dx = -4; dx <= 4; dx += 1) {
          const distance = Math.max(Math.abs(dx), Math.abs(dy));
          setFunction(cx + dx, cy + dy, distance !== 2 && distance !== 4);
        }
      }
    };

    const alignment = (cx, cy) => {
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          setFunction(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    };

    // Timing patterns are function modules even underneath finder separators.
    for (let i = 0; i < SIZE; i += 1) {
      setFunction(6, i, i % 2 === 0);
      setFunction(i, 6, i % 2 === 0);
    }
    finder(3, 3);
    finder(SIZE - 4, 3);
    finder(3, SIZE - 4);
    alignment(22, 22);

    const format = formatBits(MASK);
    const bit = index => ((format >>> index) & 1) !== 0;
    for (let i = 0; i <= 5; i += 1) setFunction(8, i, bit(i));
    setFunction(8, 7, bit(6));
    setFunction(8, 8, bit(7));
    setFunction(7, 8, bit(8));
    for (let i = 9; i < 15; i += 1) setFunction(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i += 1) setFunction(SIZE - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i += 1) setFunction(8, SIZE - 15 + i, bit(i));
    setFunction(8, SIZE - 8, true); // Fixed dark module.

    const data = dataCodewords(text);
    const allCodewords = data.concat(reedSolomonRemainder(data, reedSolomonDivisor(ECC_CODEWORDS)));
    let bitIndex = 0;

    for (let right = SIZE - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < SIZE; vert += 1) {
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? SIZE - 1 - vert : vert;
        for (let j = 0; j < 2; j += 1) {
          const x = right - j;
          if (isFunction[y][x]) continue;
          if (bitIndex < allCodewords.length * 8) {
            modules[y][x] = ((allCodewords[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1) !== 0;
            bitIndex += 1;
          }
        }
      }
    }

    // Apply mask 0 to every data/remainder module, not only populated codeword bits.
    for (let y = 0; y < SIZE; y += 1) {
      for (let x = 0; x < SIZE; x += 1) {
        if (!isFunction[y][x] && (x + y) % 2 === 0) modules[y][x] = !modules[y][x];
      }
    }
    return modules;
  }

  function svg(text) {
    const modules = matrix(text);
    const quiet = 4;
    const size = modules.length + quiet * 2;
    let path = '';
    modules.forEach((row, y) => row.forEach((dark, x) => {
      if (dark) path += `M${x + quiet},${y + quiet}h1v1h-1z`;
    }));
    return `<svg class="cw-email-qr" viewBox="0 0 ${size} ${size}" role="img" aria-label="QR code for ${esc(text)}"><rect width="${size}" height="${size}" fill="#fff"/><path d="${path}" fill="#18202c"/></svg>`;
  }

  window.CampusEmailQr = Object.freeze({ matrix, svg });
})();

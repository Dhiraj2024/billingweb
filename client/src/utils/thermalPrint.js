// thermalPrint.js
// Handles Web Serial API ESC/POS direct thermal printing + 32-column .txt generation

const LINE_WIDTH = 32;

const ESC = 0x1b;
const GS = 0x1d;

const encoder = new TextEncoder();

// --- Helpers for formatted 32-column text building ---
export const center = (text, width = LINE_WIDTH) => {
  text = String(text);
  if (text.length >= width) return text.slice(0, width);
  const pad = Math.floor((width - text.length) / 2);
  return ' '.repeat(pad) + text;
};

export const twoCol = (left, right, width = LINE_WIDTH) => {
  left = String(left);
  right = String(right);
  const space = width - left.length - right.length;
  if (space < 1) {
    const trimmedLeft = left.slice(0, Math.max(0, width - right.length - 1));
    return trimmedLeft + ' '.repeat(width - trimmedLeft.length - right.length) + right;
  }
  return left + ' '.repeat(space) + right;
};

export const line = (char = '-', width = LINE_WIDTH) => char.repeat(width);

// Build the 32-column receipt text content shared by .txt download, print window & ESC/POS
export const buildReceiptText = (shop, cart, billNo, createdAt = new Date()) => {
  const now = new Date(createdAt);
  const dateStr = now.toLocaleDateString('en-IN');
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const rows = [];

  rows.push(center(shop?.shopName || 'My Shop'));
  if (shop?.address) rows.push(center(shop.address));
  if (shop?.mobNo) rows.push(center(`Mob: ${shop.mobNo}`));
  rows.push(line('='));
  rows.push(twoCol(`Bill No: ${billNo || '-'}`, ''));
  rows.push(twoCol(`Date: ${dateStr}`, `Time: ${timeStr}`));
  rows.push(line('-'));
  rows.push(twoCol('Item', 'Amt'));
  rows.push(line('-'));

  let total = 0;
  cart.forEach((c) => {
    const amount = Math.round(c.price * c.qty * 100) / 100;
    total += amount;
    rows.push(c.name.slice(0, LINE_WIDTH));
    rows.push(twoCol(`${c.qty} ${c.unit} x ${c.price}`, `Rs.${amount.toFixed(2)}`));
  });

  rows.push(line('='));
  rows.push(twoCol('TOTAL', `Rs.${total.toFixed(2)}`));
  rows.push(line('='));
  if (shop?.endMsg) {
    rows.push(center(shop.endMsg));
  }
  rows.push('');
  rows.push('');

  return { text: rows.join('\n'), total };
};

// --- ESC/POS raw byte command builder ---
const buildEscPosBytes = (shop, cart, billNo, createdAt) => {
  const commands = [];
  const push = (arr) => commands.push(...arr);

  push([ESC, 0x40]); // Initialize printer
  push([ESC, 0x61, 0x01]); // Center align

  push([ESC, 0x45, 0x01]); // Bold ON
  push(...encoder.encode((shop?.shopName || 'My Shop') + '\n'));
  push([ESC, 0x45, 0x00]); // Bold OFF

  if (shop?.address) push(...encoder.encode(shop.address + '\n'));
  if (shop?.mobNo) push(...encoder.encode(`Mob: ${shop.mobNo}` + '\n'));

  push([ESC, 0x61, 0x00]); // Left align
  push(...encoder.encode(line('=') + '\n'));
  push(...encoder.encode(twoCol(`Bill No: ${billNo || '-'}`, '') + '\n'));

  const now = new Date(createdAt);
  push(
    ...encoder.encode(
      twoCol(
        `Date: ${now.toLocaleDateString('en-IN')}`,
        `Time: ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
      ) + '\n'
    )
  );
  push(...encoder.encode(line('-') + '\n'));
  push(...encoder.encode(twoCol('Item', 'Amt') + '\n'));
  push(...encoder.encode(line('-') + '\n'));

  let total = 0;
  cart.forEach((c) => {
    const amount = Math.round(c.price * c.qty * 100) / 100;
    total += amount;
    push(...encoder.encode(c.name.slice(0, LINE_WIDTH) + '\n'));
    push(...encoder.encode(twoCol(`${c.qty} ${c.unit} x ${c.price}`, `Rs.${amount.toFixed(2)}`) + '\n'));
  });

  push(...encoder.encode(line('=') + '\n'));
  push([ESC, 0x45, 0x01]); // Bold ON
  push(...encoder.encode(twoCol('TOTAL', `Rs.${total.toFixed(2)}`) + '\n'));
  push([ESC, 0x45, 0x00]); // Bold OFF
  push(...encoder.encode(line('=') + '\n'));

  if (shop?.endMsg) {
    push([ESC, 0x61, 0x01]); // Center
    push(...encoder.encode(shop.endMsg + '\n'));
    push([ESC, 0x61, 0x00]);
  }

  push(...encoder.encode('\n\n\n'));
  push([GS, 0x56, 0x42, 0x00]); // Full cut

  return new Uint8Array(commands);
};

// Connect to USB/Bluetooth Serial thermal printer once (Web Serial API)
export const connectThermalPrinter = async () => {
  if (!globalThis.isSecureContext) {
    throw new Error('Web Serial requires HTTPS or localhost.');
  }
  if (!('serial' in navigator)) {
    throw new Error('Web Serial API not supported in this browser. Use Chrome/Edge on desktop.');
  }
  const port = await navigator.serial.requestPort();
  await port.open({ baudRate: 9600 });
  return port;
};

// Print directly via Web Serial connected printer port
export const printThermalDirect = async (port, shop, cart, billNo, createdAt = new Date()) => {
  if (!port) throw new Error('Printer not connected');
  const bytes = buildEscPosBytes(shop, cart, billNo, createdAt);
  if (!port.writable) throw new Error('The connected printer is not ready to receive data.');
  const writer = port.writable.getWriter();
  try {
    await writer.write(bytes);
  } finally {
    writer.releaseLock();
  }
};

// Fallback: download formatted 32-column .txt receipt file
export const downloadReceiptTxt = (shop, cart, billNo, createdAt = new Date()) => {
  const { text } = buildReceiptText(shop, cart, billNo, createdAt);
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Bill_${billNo}_${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// Main entry: Save & Print for Thermal (.txt)
// Tries direct Web Serial ESC/POS print if a printer is connected, else falls back to .txt download
export const saveAndPrintThermal = async (port, shop, cart, billNo, createdAt = new Date()) => {
  if (port) {
    try {
      await printThermalDirect(port, shop, cart, billNo, createdAt);
      return { method: 'direct' };
    } catch (err) {
      downloadReceiptTxt(shop, cart, billNo, createdAt);
      return { method: 'txt-download', printError: err.message || 'Direct printing failed' };
    }
  }
  downloadReceiptTxt(shop, cart, billNo, createdAt);
  return { method: 'txt-download' };
};

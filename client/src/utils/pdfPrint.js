// pdfPrint.js
// Instant 58mm/80mm & A4 PDF receipt generator + print trigger using jsPDF

import { jsPDF } from 'jspdf';

// width in mm: 58mm thermal roll, 80mm thermal roll, or A4
export const generateReceiptPdf = (shop, cart, billNo, paperWidth = 58, createdAt = new Date()) => {
  const total = cart.reduce((sum, c) => sum + Math.round(c.price * c.qty * 100) / 100, 0);
  const now = new Date(createdAt);

  const isA4 = paperWidth === 'A4';
  const widthMm = isA4 ? 210 : paperWidth;
  const estimatedHeight = isA4 ? 297 : 80 + cart.length * 8;

  const doc = new jsPDF({
    unit: 'mm',
    format: isA4 ? 'a4' : [widthMm, estimatedHeight],
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 8;
  const marginX = isA4 ? 15 : 3;

  const fontSize = isA4 ? 11 : 8;
  doc.setFontSize(fontSize + 3);
  doc.setFont('courier', 'bold');
  doc.text(shop?.shopName || 'My Shop', pageWidth / 2, y, { align: 'center' });
  y += isA4 ? 8 : 5;

  doc.setFont('courier', 'normal');
  doc.setFontSize(fontSize);
  if (shop?.address) {
    doc.text(shop.address, pageWidth / 2, y, { align: 'center' });
    y += isA4 ? 6 : 4;
  }
  if (shop?.mobNo) {
    doc.text(`Mob: ${shop.mobNo}`, pageWidth / 2, y, { align: 'center' });
    y += isA4 ? 6 : 4;
  }

  doc.setLineWidth(0.2);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += isA4 ? 6 : 4;

  doc.text(`Bill No: ${billNo || '-'}`, marginX, y);
  y += isA4 ? 6 : 4;
  doc.text(
    `Date: ${now.toLocaleDateString('en-IN')}  Time: ${now.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    })}`,
    marginX,
    y
  );
  y += isA4 ? 8 : 5;

  doc.line(marginX, y, pageWidth - marginX, y);
  y += isA4 ? 6 : 4;

  doc.setFont('courier', 'bold');
  doc.text('Item', marginX, y);
  doc.text('Amount', pageWidth - marginX, y, { align: 'right' });
  doc.setFont('courier', 'normal');
  y += isA4 ? 6 : 4;
  doc.line(marginX, y, pageWidth - marginX, y);
  y += isA4 ? 6 : 4;

  cart.forEach((c) => {
    const amount = Math.round(c.price * c.qty * 100) / 100;
    doc.text(c.name, marginX, y);
    y += isA4 ? 5 : 3.5;
    doc.text(`${c.qty} ${c.unit} x ${c.price}`, marginX, y);
    doc.text(`Rs.${amount.toFixed(2)}`, pageWidth - marginX, y, { align: 'right' });
    y += isA4 ? 6 : 4;
  });

  doc.line(marginX, y, pageWidth - marginX, y);
  y += isA4 ? 7 : 5;

  doc.setFont('courier', 'bold');
  doc.setFontSize(fontSize + 2);
  doc.text('TOTAL', marginX, y);
  doc.text(`Rs.${total.toFixed(2)}`, pageWidth - marginX, y, { align: 'right' });
  y += isA4 ? 8 : 6;

  doc.setFont('courier', 'normal');
  doc.setFontSize(fontSize);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += isA4 ? 8 : 5;

  if (shop?.endMsg) {
    doc.text(shop.endMsg, pageWidth / 2, y, { align: 'center' });
  }

  return doc;
};

export const downloadReceiptPdf = (shop, cart, billNo, paperWidth = 58, createdAt = new Date()) => {
  const doc = generateReceiptPdf(shop, cart, billNo, paperWidth, createdAt);
  doc.save(`Bill_${billNo}_${new Date().toISOString().slice(0, 10)}.pdf`);
};

// Instant print trigger - opens browser print dialog with the PDF
export const printReceiptPdf = (shop, cart, billNo, paperWidth = 58, createdAt = new Date()) => {
  const doc = generateReceiptPdf(shop, cart, billNo, paperWidth, createdAt);
  const blobUrl = doc.output('bloburl');
  const printWindow = window.open(blobUrl);
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  }
};

// Main entry: Save & Print PDF Printer (.pdf)
export const saveAndPrintPdf = (shop, cart, billNo, paperWidth = 58, createdAt = new Date()) => {
  const doc = generateReceiptPdf(shop, cart, billNo, paperWidth, createdAt);
  const url = URL.createObjectURL(doc.output('blob'));
  const printWindow = window.open(url, '_blank');
  if (printWindow) printWindow.opener = null;
  doc.save(`Bill_${billNo}_${new Date().toISOString().slice(0, 10)}.pdf`);
  if (printWindow) {
    printWindow.addEventListener('load', () => {
      printWindow.focus();
      printWindow.print();
    }, { once: true });
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
};

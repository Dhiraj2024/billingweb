import React, { useEffect, useState } from 'react';
import { CalendarDays, Download, Eye, FileText, Printer, Search } from 'lucide-react';
import { useBilling } from '../context/BillingContext';
import { buildReceiptText, downloadReceiptTxt, saveAndPrintThermal } from '../utils/thermalPrint';

const shopFromUser = (user) => ({
  shopName: user?.shopName || user?.ownerName || 'My Shop',
  address: user?.address || '',
  mobNo: user?.mobNo || '',
  endMsg: user?.endMsg || 'Thank You! Visit Again',
});

export default function HistoryPdf() {
  const { bills, fetchBills, user, printerPort } = useBilling();
  const [date, setDate] = useState('');
  const [active, setActive] = useState('today');
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const shop = shopFromUser(user);

  useEffect(() => {
    setError('');
    fetchBills({ today: true }).catch((err) => setError(err.response?.data?.message || 'Could not load bill history'));
  }, [fetchBills]);

  const filterToday = async () => {
    setActive('today');
    setDate('');
    try { await fetchBills({ today: true }); } catch (err) { setError(err.response?.data?.message || 'Could not load bills'); }
  };
  const filterDate = async (value) => {
    setDate(value);
    if (!value) return;
    setActive('date');
    try { await fetchBills({ date: value }); } catch (err) { setError(err.response?.data?.message || 'Could not load bills'); }
  };

  const runAction = async (bill, action) => {
    setBusyId(`${bill._id}-${action}`);
    setError('');
    const receiptShop = shopFromUser(user);
    try {
      if (action === 'txt') downloadReceiptTxt(receiptShop, bill.items, bill.billNo, bill.createdAt);
      if (action === 'pdf') {
        const { downloadReceiptPdf } = await import('../utils/pdfPrint');
        downloadReceiptPdf(receiptShop, bill.items, bill.billNo, 58, bill.createdAt);
      }
      if (action === 'print') {
        if (bill.format === 'PDF') {
          const { saveAndPrintPdf } = await import('../utils/pdfPrint');
          saveAndPrintPdf(receiptShop, bill.items, bill.billNo, 58, bill.createdAt);
        } else {
          await saveAndPrintThermal(printerPort, receiptShop, bill.items, bill.billNo, bill.createdAt);
        }
      }
      if (action === 'open') setSelected(bill);
    } catch (err) {
      setError(err.message || 'Unable to prepare this bill');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-semibold text-emerald-700">Your records</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Bill history</h1>
        <p className="mt-1 text-sm text-slate-500">Find, download, and reprint a saved bill.</p>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3">
        <button onClick={filterToday} className={`rounded-lg px-4 py-2 text-sm font-semibold ${active === 'today' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}><CalendarDays size={16} className="mr-1.5 inline" />Today</button>
        <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600">
          <Search size={16} /><span>Select date</span>
          <input type="date" value={date} onChange={(event) => filterDate(event.target.value)} className="bg-transparent text-slate-900 outline-none" />
        </label>
      </div>
      {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="hidden grid-cols-[1.4fr_1fr_1fr_auto] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:grid">
          <span>Bill</span><span>Date & time</span><span>Total</span><span>Actions</span>
        </div>
        {bills.map((bill) => (
          <article key={bill._id} className="grid gap-3 border-b border-slate-100 px-4 py-4 last:border-0 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-center sm:gap-4 sm:px-5">
            <div className="flex items-center gap-3">
              <span className={`grid h-10 w-10 place-items-center rounded-xl ${bill.format === 'PDF' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}><FileText size={19} /></span>
              <div><p className="font-semibold text-slate-900">Bill #{bill.billNo}</p><p className="text-xs text-slate-500">{bill.items.length} items · {bill.format}</p></div>
            </div>
            <p className="text-sm text-slate-600">{new Date(bill.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
            <p className="font-bold text-slate-900">₹{Number(bill.totalAmount).toFixed(2)}</p>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => runAction(bill, 'open')} title="Open bill" className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"><Eye size={16} /></button>
              <button onClick={() => runAction(bill, 'txt')} disabled={Boolean(busyId)} title="Download .txt" className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"><Download size={14} className="inline" /> TXT</button>
              <button onClick={() => runAction(bill, 'pdf')} disabled={Boolean(busyId)} title="Download .pdf" className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"><Download size={14} className="inline" /> PDF</button>
              <button onClick={() => runAction(bill, 'print')} disabled={Boolean(busyId)} title="Print bill" className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"><Printer size={16} /></button>
            </div>
          </article>
        ))}
        {!bills.length && <div className="p-12 text-center"><FileText className="mx-auto text-slate-300" size={32} /><h2 className="mt-3 font-semibold text-slate-800">No bills for this date</h2><p className="mt-1 text-sm text-slate-500">Saved bills will show here.</p></div>}
      </div>
      {selected && <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/40 p-4" onClick={() => setSelected(null)}>
        <section className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
          <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">Bill #{selected.billNo}</h2><button onClick={() => setSelected(null)} className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100">Close</button></div>
          <pre className="whitespace-pre-wrap rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 font-mono text-xs leading-5">{buildReceiptText(shop, selected.items, selected.billNo, selected.createdAt).text}</pre>
          <p className="mt-3 text-right font-bold text-slate-900">Total: ₹{Number(selected.totalAmount).toFixed(2)}</p>
        </section>
      </div>}
    </div>
  );
}

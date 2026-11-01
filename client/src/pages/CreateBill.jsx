import React, { useMemo, useState } from 'react';
import { Check, CircleHelp, Printer, Search, ShoppingBasket, X } from 'lucide-react';
import { useBilling } from '../context/BillingContext';
import LiveReceipt from '../components/LiveReceipt';
import { connectThermalPrinter, saveAndPrintThermal } from '../utils/thermalPrint';

const OPEN_QTYS = [{ label: '½', value: 0.5 }, { label: '1', value: 1 }, { label: '2', value: 2 }, { label: '3', value: 3 }, { label: '4', value: 4 }];
const PACK_QTYS = [1, 2, 3, 4].map((value) => ({ label: String(value), value }));

function ItemCard({ item, theme }) {
  const { cart, setItemQty } = useBilling();
  const quantities = item.visibleIn === 'OPEN' ? OPEN_QTYS : PACK_QTYS;
  const activeQty = cart.find((entry) => entry.itemId === item._id)?.qty;
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-slate-900">{item.name}</h3>
          <p className="mt-0.5 text-xs text-slate-500">₹{Number(item.price).toFixed(2)} / {item.unit}</p>
        </div>
        {activeQty ? <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${theme.badge}`}>{activeQty} in bill</span> : null}
      </div>
      <div className="mt-3 flex gap-1.5">
        {quantities.map(({ label, value }) => (
          <button
            key={label}
            onClick={() => setItemQty(item, value)}
            aria-pressed={activeQty === value}
            className={`min-w-0 flex-1 rounded-lg border py-1.5 text-sm font-semibold transition ${activeQty === value ? theme.active : theme.idle}`}
          >
            {label}
          </button>
        ))}
      </div>
    </article>
  );
}

function ProductColumn({ type, items, search, categorySearch }) {
  const isOpen = type === 'OPEN';
  const theme = isOpen
    ? { head: 'border-emerald-200 bg-emerald-100 text-emerald-900', active: 'border-emerald-600 bg-emerald-600 text-white', idle: 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100', badge: 'bg-emerald-100 text-emerald-800' }
    : { head: 'border-orange-200 bg-orange-100 text-orange-900', active: 'border-orange-500 bg-orange-500 text-white', idle: 'border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100', badge: 'bg-orange-100 text-orange-800' };
  const grouped = useMemo(() => {
    const visibleItems = items.filter((item) => item.visibleIn === type &&
      item.name.toLowerCase().includes(search.toLowerCase()) &&
      item.category.toLowerCase().includes(categorySearch.toLowerCase()));
    return visibleItems.reduce((groups, item) => {
      (groups[item.category] ||= []).push(item);
      return groups;
    }, {});
  }, [items, type, search, categorySearch]);

  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4">
      <header className={`mb-4 flex items-center justify-between rounded-xl border px-4 py-3 ${theme.head}`}>
        <div>
          <h2 className="font-bold">{isOpen ? 'OPEN · Khula Saaman' : 'PACK · Packet Saaman'}</h2>
          <p className="mt-0.5 text-xs opacity-80">{isOpen ? 'Loose goods by weight or volume' : 'Packaged goods by piece'}</p>
        </div>
        <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-bold">{Object.values(grouped).flat().length}</span>
      </header>
      <div className="space-y-5">
        {Object.entries(grouped).map(([category, categoryItems]) => (
          <div key={category}>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">{category}</h3>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              {categoryItems.map((item) => <ItemCard key={item._id} item={item} theme={theme} />)}
            </div>
          </div>
        ))}
        {!Object.keys(grouped).length && (
          <p className="rounded-lg border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
            No {isOpen ? 'open' : 'pack'} items match your search. Add items from Admin.
          </p>
        )}
      </div>
    </section>
  );
}

export default function CreateBill() {
  const { items, cart, cartTotal, clearCart, user, printerPort, setPrinterPort, saveBill } = useBilling();
  const [search, setSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [printing, setPrinting] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [paperWidth, setPaperWidth] = useState('58');
  const shop = {
    shopName: user?.shopName,
    address: user?.address,
    mobNo: user?.mobNo,
    endMsg: user?.endMsg,
  };

  const handleConnect = async () => {
    setError('');
    try {
      const port = await connectThermalPrinter();
      setPrinterPort(port);
      setMessage('Thermal printer connected.');
    } catch (err) {
      setError(err.message || 'Could not connect to the thermal printer.');
    }
  };

  const handlePrint = async (format) => {
    setPrinting(format);
    setError('');
    setMessage('');
    try {
      const bill = await saveBill(format);
      if (format === 'TXT') {
        const result = await saveAndPrintThermal(printerPort, shop, cart, bill.billNo, bill.createdAt);
        setMessage(result.method === 'direct'
          ? `Bill #${bill.billNo} printed.`
          : `Bill #${bill.billNo} saved. Receipt text downloaded.${result.printError ? ` Printer unavailable: ${result.printError}` : ''}`);
      } else {
        const { saveAndPrintPdf } = await import('../utils/pdfPrint');
          saveAndPrintPdf(shop, cart, bill.billNo, paperWidth === 'A4' ? 'A4' : Number(paperWidth), bill.createdAt);
        setMessage(`Bill #${bill.billNo} saved. PDF ready to print.`);
      }
      clearCart();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to save or print bill.');
    } finally {
      setPrinting('');
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-emerald-700">Good day, {user?.ownerName || 'Shopkeeper'}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Create a bill</h1>
          <p className="mt-1 text-sm text-slate-500">Tap a quantity to add an item. Tap it again to remove it.</p>
        </div>
        <button onClick={handleConnect} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
          <Printer size={17} /> {printerPort ? 'Thermal printer connected' : 'Connect printer'}
        </button>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
          <Search size={18} className="shrink-0 text-slate-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Item search..." className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          {search && <button onClick={() => setSearch('')} aria-label="Clear item search"><X size={16} /></button>}
        </label>
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
          <ShoppingBasket size={18} className="shrink-0 text-slate-400" />
          <input value={categorySearch} onChange={(event) => setCategorySearch(event.target.value)} placeholder="Category search..." className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          {categorySearch && <button onClick={() => setCategorySearch('')} aria-label="Clear category search"><X size={16} /></button>}
        </label>
      </div>

      {message && <p role="status" className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>}
      {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          <ProductColumn type="OPEN" items={items} search={search} categorySearch={categorySearch} />
          <ProductColumn type="PACK" items={items} search={search} categorySearch={categorySearch} />
        </div>
        <aside className="space-y-3 xl:sticky xl:top-5">
          <LiveReceipt />
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-slate-500">{cart.length} item{cart.length === 1 ? '' : 's'} selected</span>
              <button onClick={clearCart} disabled={!cart.length || Boolean(printing)} className="text-xs font-semibold text-red-600 disabled:text-slate-300">Clear bill</button>
            </div>
            <button onClick={() => handlePrint('TXT')} disabled={!cart.length || Boolean(printing)} className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
              <Printer size={17} /> {printing === 'TXT' ? 'Saving...' : 'Save & Print for Thermal (.txt)'}
            </button>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label htmlFor="pdf-width" className="text-xs font-semibold text-slate-600">PDF paper</label>
              <select id="pdf-width" value={paperWidth} onChange={(event) => setPaperWidth(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-700">
                <option value="58">58 mm</option><option value="80">80 mm</option><option value="A4">A4</option>
              </select>
            </div>
            <button onClick={() => handlePrint('PDF')} disabled={!cart.length || Boolean(printing)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-3 py-3 text-sm font-bold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50">
              <Check size={17} /> {printing === 'PDF' ? 'Saving...' : 'Save & Print PDF (.pdf)'}
            </button>
          </div>
          <p className="flex gap-2 px-1 text-xs leading-5 text-slate-500"><CircleHelp size={15} className="mt-0.5 shrink-0" />Direct USB printing requires Chrome or Edge on a secure connection. Otherwise a .txt receipt is downloaded.</p>
        </aside>
      </div>
    </div>
  );
}

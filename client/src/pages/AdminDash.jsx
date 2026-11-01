import React, { useMemo, useRef, useState } from 'react';
import { FileUp, FolderPlus, Package, Pencil, Plus, Scale, Trash2 } from 'lucide-react';
import { useBilling } from '../context/BillingContext';
import AddItemModal from '../components/AddItemModal';

function ItemColumn({ visibleIn, categories, items, onAddItem, onAddCategory, onEdit, onDelete, onDeleteCategory }) {
  const isOpen = visibleIn === 'OPEN';
  const theme = isOpen
    ? { panel: 'border-emerald-200', header: 'bg-emerald-100 text-emerald-900', button: 'text-emerald-700 hover:bg-emerald-50', accent: 'text-emerald-700' }
    : { panel: 'border-orange-200', header: 'bg-orange-100 text-orange-900', button: 'text-orange-700 hover:bg-orange-50', accent: 'text-orange-700' };
  return (
    <section className={`rounded-2xl border bg-white p-4 ${theme.panel}`}>
      <header className={`mb-4 flex items-center gap-3 rounded-xl px-4 py-3 ${theme.header}`}>
        {isOpen ? <Scale size={20} /> : <Package size={20} />}
        <div><h2 className="font-bold">{isOpen ? 'Open · Kg / Liter' : 'Pack · Piece'}</h2><p className="text-xs opacity-75">{categories.length} categories</p></div>
      </header>
      <div className="space-y-3">
        {categories.map((category) => {
          const categoryItems = items.filter((item) => item.visibleIn === visibleIn && item.category === category.name);
          return (
            <article key={category._id} className="rounded-xl border border-slate-200 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="font-semibold text-slate-900">{category.name}</h3>
                <button onClick={() => onDeleteCategory(category)} title={`Delete ${category.name} category`} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button>
              </div>
              <div className="divide-y divide-slate-100">
                {categoryItems.map((item) => (
                  <div key={item._id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{item.name}</p>
                      <p className="text-xs text-slate-500">₹{Number(item.price).toFixed(2)} / {item.unit}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button onClick={() => onEdit(item)} aria-label={`Edit ${item.name}`} className={`rounded-lg p-2 ${theme.button}`}><Pencil size={15} /></button>
                      <button onClick={() => onDelete(item)} aria-label={`Delete ${item.name}`} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
                    </div>
                  </div>
                ))}
                {!categoryItems.length && <p className="py-2 text-xs text-slate-400">No items in this category yet.</p>}
              </div>
              <button onClick={() => onAddItem(visibleIn, category.name)} className={`mt-2 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold ${theme.button}`}><Plus size={14} /> Add item</button>
            </article>
          );
        })}
        {!categories.length && <p className="rounded-lg border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">No categories created yet.</p>}
      </div>
      <button onClick={() => onAddCategory(visibleIn)} className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-2.5 text-sm font-semibold ${theme.accent} hover:bg-slate-50`}><FolderPlus size={17} /> Add category</button>
    </section>
  );
}

export default function AdminDash() {
  const { categories, items, addCategory, deleteCategory, deleteItem, bulkUpload } = useBilling();
  const [modal, setModal] = useState({ open: false, visibleIn: 'OPEN', category: '', item: null });
  const [categoryForm, setCategoryForm] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const fileInput = useRef(null);
  const groupedCategories = useMemo(() => ({
    OPEN: categories.filter((category) => category.visibleIn === 'OPEN'),
    PACK: categories.filter((category) => category.visibleIn === 'PACK'),
  }), [categories]);

  const openAdd = (visibleIn, category) => {
    setModal({ open: true, visibleIn, category, item: null });
    setError('');
  };
  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Delete ${item.name}?`)) return;
    try { await deleteItem(item._id); } catch (err) { setError(err.response?.data?.message || 'Could not delete item'); }
  };
  const handleDeleteCategory = async (category) => {
    if (!window.confirm(`Delete ${category.name} and all its items?`)) return;
    try { await deleteCategory(category._id); } catch (err) { setError(err.response?.data?.message || 'Could not delete category'); }
  };
  const saveCategory = async (event) => {
    event.preventDefault();
    try {
      await addCategory({ visibleIn: categoryForm, name: categoryName.trim() });
      setCategoryForm(null);
      setCategoryName('');
      setNotice('Category added.');
    } catch (err) { setError(err.response?.data?.message || 'Could not add category'); }
  };
  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await bulkUpload(file);
      setNotice(`${result.insertedCount} items added.${result.errors.length ? ` ${result.errors.join(' ')}` : ''}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to upload this file');
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  };

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-semibold text-emerald-700">Inventory</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Admin dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Organize products by loose goods and packaged items.</p>
      </div>
      {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}
      <div className="grid gap-5 xl:grid-cols-2">
        <ItemColumn visibleIn="OPEN" categories={groupedCategories.OPEN} items={items} onAddItem={openAdd} onAddCategory={setCategoryForm} onEdit={(item) => setModal({ open: true, visibleIn: item.visibleIn, category: item.category, item })} onDelete={handleDeleteItem} onDeleteCategory={handleDeleteCategory} />
        <ItemColumn visibleIn="PACK" categories={groupedCategories.PACK} items={items} onAddItem={openAdd} onAddCategory={setCategoryForm} onEdit={(item) => setModal({ open: true, visibleIn: item.visibleIn, category: item.category, item })} onDelete={handleDeleteItem} onDeleteCategory={handleDeleteCategory} />
      </div>
      <section className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div><h2 className="font-semibold text-slate-900">Bulk item upload</h2><p className="mt-1 text-xs text-slate-500">One row per item: VISIBLE_TYPE, CATEGORY, ITEM_NAME, PRICE, UNIT</p></div>
        <input ref={fileInput} type="file" accept=".txt,text/plain" onChange={handleUpload} className="hidden" />
        <button onClick={() => fileInput.current?.click()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"><FileUp size={17} />{busy ? 'Uploading...' : 'Insert data .txt'}</button>
      </section>
      {categoryForm && <div className="fixed inset-0 z-40 grid place-items-center bg-slate-900/40 p-4">
        <form onSubmit={saveCategory} className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
          <h2 className="mb-3 text-lg font-bold">New {categoryForm === 'OPEN' ? 'open' : 'pack'} category</h2>
          <input autoFocus value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Category name" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-emerald-500" required maxLength={80} />
          <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setCategoryForm(null)} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">Cancel</button><button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Add category</button></div>
        </form>
      </div>}
      <AddItemModal open={modal.open} onClose={() => setModal((value) => ({ ...value, open: false }))} editingItem={modal.item} defaultVisibleIn={modal.visibleIn} defaultCategory={modal.category} />
    </div>
  );
}

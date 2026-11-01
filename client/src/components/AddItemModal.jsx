import React, { useState, useEffect } from 'react';
import { X, Scale, Package } from 'lucide-react';
import { useBilling } from '../context/BillingContext';

const UNITS = ['Kg', 'Piece', 'Liter'];

const AddItemModal = ({ open, onClose, editingItem = null, defaultVisibleIn = 'OPEN', defaultCategory = '' }) => {
  const { addItem, editItem } = useBilling();
  const [visibleIn, setVisibleIn] = useState(defaultVisibleIn);
  const [category, setCategory] = useState(defaultCategory);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('Kg');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (editingItem) {
        setVisibleIn(editingItem.visibleIn);
        setCategory(editingItem.category);
        setName(editingItem.name);
        setPrice(String(editingItem.price));
        setUnit(editingItem.unit);
      } else {
        setVisibleIn(defaultVisibleIn);
        setCategory(defaultCategory);
        setName('');
        setPrice('');
        setUnit(defaultVisibleIn === 'PACK' ? 'Piece' : 'Kg');
      }
      setError('');
    }
  }, [open, editingItem, defaultVisibleIn, defaultCategory]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const numericPrice = Number(price);
    if (!category.trim() || !name.trim() || price === '' || !Number.isFinite(numericPrice) || numericPrice < 0 || !unit) {
      setError('Enter a category, item name, valid price, and unit');
      return;
    }
    const payload = {
      visibleIn,
      category: category.trim(),
      name: name.trim(),
      price: numericPrice,
      unit,
    };

    try {
      setSaving(true);
      if (editingItem) {
        await editItem(editingItem._id, payload);
      } else {
        await addItem(payload);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
          <X size={22} />
        </button>
        <h2 className="text-lg font-bold text-slate-900 mb-4">
          {editingItem ? 'Edit Item' : 'Add Category / Item'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Visible In</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setVisibleIn('OPEN');
                  setUnit('Kg');
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border font-medium ${
                  visibleIn === 'OPEN'
                    ? 'bg-emerald-100 border-emerald-400 text-emerald-800'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                <Scale size={18} /> OPEN (Khula)
              </button>
              <button
                type="button"
                onClick={() => {
                  setVisibleIn('PACK');
                  setUnit('Piece');
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border font-medium ${
                  visibleIn === 'PACK'
                    ? 'bg-orange-100 border-orange-400 text-orange-800'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                <Package size={18} /> PACK (Packet)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category Name</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Masala, Soaps"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Item Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Haldi, Dettol"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Price (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl disabled:opacity-60"
          >
            {saving ? 'Saving...' : editingItem ? 'Update' : 'Insert'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddItemModal;

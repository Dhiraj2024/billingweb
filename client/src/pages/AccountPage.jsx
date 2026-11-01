import React, { useEffect, useState } from 'react';
import { Check, Pencil, Store, UserRound } from 'lucide-react';
import { useBilling } from '../context/BillingContext';

const FIELDS = [
  { key: 'ownerName', label: 'Owner name', placeholder: 'Your name' },
  { key: 'shopName', label: 'Shop name', placeholder: 'Your shop name' },
  { key: 'mobNo', label: 'Mobile number', placeholder: 'Phone number' },
  { key: 'email', label: 'Email', placeholder: 'name@example.com', type: 'email' },
  { key: 'address', label: 'Address', placeholder: 'Shop address', multiline: true },
  { key: 'endMsg', label: 'End message', placeholder: 'Thank you! Visit again' },
];

export default function AccountPage() {
  const { user, updateProfile } = useBilling();
  const [form, setForm] = useState({});
  const [editing, setEditing] = useState({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) setForm(Object.fromEntries(FIELDS.map(({ key }) => [key, user[key] || ''])));
  }, [user]);

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    setError('');
    try {
      await updateProfile(form);
      setEditing({});
      setNotice('Shop details updated. Your receipt preview will use these details.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update shop details');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <p className="text-sm font-semibold text-emerald-700">Shop setup</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Account & bill details</h1>
        <p className="mt-1 text-sm text-slate-500">These details appear in your printed receipt.</p>
      </div>
      <div className="mb-5 flex items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-white text-emerald-700"><Store size={22} /></span>
        <div><p className="text-sm text-emerald-800">Welcome back,</p><h2 className="text-lg font-bold text-emerald-950">{user?.ownerName || 'Shop owner'}</h2></div>
        <UserRound className="ml-auto text-emerald-700" size={24} />
      </div>
      <form onSubmit={handleSave} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <div className="space-y-5">
          {FIELDS.map(({ key, label, placeholder, type = 'text', multiline }) => (
            <div key={key}>
              <label htmlFor={key} className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</label>
              <div className="flex items-start gap-2">
                {multiline
                  ? <textarea id={key} rows={2} value={form[key] || ''} placeholder={placeholder} onChange={(event) => setForm({ ...form, [key]: event.target.value })} readOnly={!editing[key]} className="min-h-16 flex-1 resize-y rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-emerald-500 read-only:bg-slate-50" />
                  : <input id={key} type={type} value={form[key] || ''} placeholder={placeholder} onChange={(event) => setForm({ ...form, [key]: event.target.value })} readOnly={!editing[key]} className="h-11 flex-1 rounded-xl border border-slate-300 px-3 outline-none focus:border-emerald-500 read-only:bg-slate-50" />}
                <button type="button" aria-label={`Edit ${label}`} onClick={() => setEditing((value) => ({ ...value, [key]: !value[key] }))} className={`rounded-xl border p-3 ${editing[key] ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                  {editing[key] ? <Check size={17} /> : <Pencil size={17} />}
                </button>
              </div>
            </div>
          ))}
        </div>
        {notice && <p role="status" className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button disabled={saving} className="mt-6 w-full rounded-xl bg-emerald-600 py-3 font-bold text-white hover:bg-emerald-700 disabled:opacity-50">{saving ? 'Saving details...' : 'Bill Details Save'}</button>
      </form>
    </div>
  );
}

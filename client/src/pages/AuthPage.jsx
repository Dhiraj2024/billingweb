import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Receipt, ShieldCheck } from 'lucide-react';
import { useBilling } from '../context/BillingContext';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function AuthPage() {
  const { signIn } = useBilling();
  const navigate = useNavigate();
  const [mode, setMode] = useState('signup');
  const [form, setForm] = useState({ ownerName: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return undefined;
    const existing = document.querySelector('script[data-google-identity]');
    if (existing) {
      if (window.google?.accounts?.id) setGoogleReady(true);
      return undefined;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = 'true';
    script.onload = () => setGoogleReady(true);
    script.onerror = () => setError('Google sign-in could not be loaded.');
    document.head.appendChild(script);
    return () => script.remove();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (mode === 'signup' && form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const payload = mode === 'signup'
        ? { ownerName: form.ownerName, email: form.email, password: form.password, confirmPassword: form.confirmPassword }
        : { email: form.email, password: form.password };
      await signIn(payload, mode);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = () => {
    if (!googleReady || !window.google?.accounts?.id) {
      setError(GOOGLE_CLIENT_ID ? 'Google sign-in is still loading.' : 'Google sign-in is not configured for this deployment.');
      return;
    }
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async ({ credential }) => {
        setBusy(true);
        setError('');
        try {
          await signIn({ idToken: credential }, 'google');
          navigate('/', { replace: true });
        } catch (err) {
          setError(err.response?.data?.message || 'Google authentication failed.');
        } finally {
          setBusy(false);
        }
      },
    });
    window.google.accounts.id.prompt();
  };

  return (
    <div className="grid min-h-screen bg-slate-50 lg:grid-cols-[1fr_1fr]">
      <section className="hidden flex-col justify-between bg-emerald-700 p-12 text-white lg:flex">
        <Link to="/" className="flex items-center gap-3 text-xl font-bold"><Receipt size={28} /> Billin.go</Link>
        <div className="max-w-lg">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-emerald-200">Made for local shops</p>
          <h1 className="text-5xl font-bold leading-tight">Simple billing.<br />Happier customers.</h1>
          <p className="mt-5 max-w-md leading-7 text-emerald-100">Keep your inventory organized, prepare bills in seconds, and print directly from your shop.</p>
        </div>
        <p className="flex items-center gap-2 text-sm text-emerald-100"><ShieldCheck size={17} /> Your shop data is private to your account.</p>
      </section>
      <main className="grid place-items-center p-5 sm:p-10">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-7 flex items-center gap-2 font-bold text-slate-900 lg:hidden"><Receipt className="text-emerald-600" /> Billin.go</Link>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6"><p className="text-sm font-semibold text-emerald-700">{mode === 'signup' ? 'Start your shop account' : 'Welcome back'}</p><h2 className="mt-1 text-2xl font-bold text-slate-900">{mode === 'signup' ? 'Create your account' : 'Sign in to Billin.go'}</h2><p className="mt-2 text-sm text-slate-500">Use your account to manage products and bills securely.</p></div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && <label className="block text-sm font-medium text-slate-700">Name<input required value={form.ownerName} onChange={(event) => setForm({ ...form, ownerName: event.target.value })} autoComplete="name" className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-emerald-500" placeholder="Your name" /></label>}
              <label className="block text-sm font-medium text-slate-700">Email<input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} autoComplete="email" className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-emerald-500" placeholder="you@example.com" /></label>
              <label className="block text-sm font-medium text-slate-700">Password<input type="password" required minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-emerald-500" placeholder="At least 8 characters" /></label>
              {mode === 'signup' && <label className="block text-sm font-medium text-slate-700">Re-enter password<input type="password" required value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} autoComplete="new-password" className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-emerald-500" placeholder="Confirm password" /></label>}
              {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
              <button disabled={busy} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700 disabled:opacity-50">{busy ? 'Please wait...' : mode === 'signup' ? 'Sign up' : 'Login'} <ArrowRight size={17} /></button>
            </form>
            <div className="my-5 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />OR<span className="h-px flex-1 bg-slate-200" /></div>
            <button onClick={handleGoogle} disabled={busy} className="h-11 w-full rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Continue with Google</button>
            <p className="mt-5 text-center text-sm text-slate-600">{mode === 'signup' ? 'Already have an account?' : 'New to Billin.go?'} <button onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(''); }} className="font-bold text-emerald-700 hover:underline">{mode === 'signup' ? 'Login' : 'Create account'}</button></p>
            <p className="mt-5 text-center text-xs leading-5 text-slate-400">By continuing, you agree to use Billin.go responsibly and keep your account credentials secure.</p>
          </div>
        </div>
      </main>
    </div>
  );
}

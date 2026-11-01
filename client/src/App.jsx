import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useBilling } from './context/BillingContext';
import Sidebar from './components/Sidebar';
import CreateBill from './pages/CreateBill';
import AdminDash from './pages/AdminDash';
import HistoryPdf from './pages/HistoryPdf';
import AccountPage from './pages/AccountPage';
import AuthPage from './pages/AuthPage';

function ProtectedLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <main className="min-h-screen pl-20 md:pl-56">
        <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<CreateBill />} />
            <Route path="/admin" element={<AdminDash />} />
            <Route path="/history" element={<HistoryPdf />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const { isAuthed, loading } = useBilling();
  if (loading && isAuthed) {
    return <div className="grid min-h-screen place-items-center text-slate-600">Loading your shop...</div>;
  }
  return (
    <Routes>
      <Route path="/auth" element={isAuthed ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/*" element={isAuthed ? <ProtectedLayout /> : <Navigate to="/auth" replace />} />
    </Routes>
  );
}

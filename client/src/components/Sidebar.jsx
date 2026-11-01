import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Settings, History, User, LogIn, LogOut, Receipt } from 'lucide-react';
import { useBilling } from '../context/BillingContext';

const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/admin', label: 'Admin', icon: Settings },
  { to: '/history', label: 'History', icon: History },
  { to: '/account', label: 'Account', icon: User },
];

const Sidebar = () => {
  const { isAuthed, logout, user } = useBilling();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <aside className="w-20 md:w-56 h-screen bg-white border-r border-slate-200 flex flex-col fixed left-0 top-0 z-20">
      <div className="flex items-center gap-2 px-4 py-5 border-b border-slate-200">
        <Receipt className="text-emerald-600" size={28} />
        <span className="hidden md:block font-bold text-lg text-slate-900">Billin.go</span>
      </div>

      <nav className="flex-1 flex flex-col gap-1 p-2 mt-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-3 rounded-xl font-medium transition-colors ${
                isActive
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                  : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            <Icon size={20} />
            <span className="hidden md:block">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-2 border-t border-slate-200">
        {isAuthed ? (
          <>
            <div className="hidden md:block px-3 py-2 text-xs text-slate-500 truncate">
              {user?.shopName || user?.ownerName || 'Shop Owner'}
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl font-medium text-red-600 hover:bg-red-50"
            >
              <LogOut size={20} />
              <span className="hidden md:block">Logout</span>
            </button>
          </>
        ) : (
          <NavLink
            to="/auth"
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl font-medium text-emerald-700 hover:bg-emerald-50"
          >
            <LogIn size={20} />
            <span className="hidden md:block">Login</span>
          </NavLink>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;

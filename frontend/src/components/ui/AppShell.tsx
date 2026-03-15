import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, ArrowLeftRight, PiggyBank, TrendingUp,
  Target, Upload, Settings, Menu, X
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { to: '/budgets', icon: PiggyBank, label: 'Budgets' },
  { to: '/investments', icon: TrendingUp, label: 'Investments' },
  { to: '/savings-goals', icon: Target, label: 'Savings Goals' },
  { to: '/import', icon: Upload, label: 'Import' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 z-30 flex items-center gap-3 bg-gray-900 border-b border-gray-800 px-4 py-3 md:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
        <h1 className="text-lg font-bold text-blue-400">Finance Buddy</h1>
      </div>

      {/* Backdrop overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 bg-gray-900 border-r border-gray-800 flex flex-col transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 border-b border-gray-800 flex items-center justify-between">
          <h1 className="text-xl font-bold text-blue-400">Finance Buddy</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 text-gray-400 hover:text-gray-200 transition-colors md:hidden"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-500/10 text-blue-400 font-medium'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
}

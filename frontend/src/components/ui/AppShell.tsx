import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, ArrowLeftRight, PiggyBank, TrendingUp,
  Target, CreditCard, Upload, Settings, Menu, X
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { to: '/budgets', icon: PiggyBank, label: 'Budgets' },
  { to: '/investments', icon: TrendingUp, label: 'Investments' },
  { to: '/savings-goals', icon: Target, label: 'Savings Goals' },
  { to: '/debts', icon: CreditCard, label: 'Debts' },
  { to: '/import', icon: Upload, label: 'Import' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-void text-gray-100">
      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 z-30 flex items-center gap-3 bg-[#111118]/80 backdrop-blur-xl border-b border-white/5 px-4 py-3 md:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
        <img src="/assets/logo.png" alt="Finance Buddy" className="h-7 w-auto rounded" />
      </div>

      {/* Backdrop overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[15.5rem] bg-[#111118] border-r border-white/[0.06] flex flex-col transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
          <img src="/assets/logo.png" alt="Finance Buddy" className="h-12 w-auto rounded-md" />
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 text-gray-500 hover:text-gray-200 transition-colors md:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-500/10 text-blue-400 font-semibold shadow-sm shadow-blue-500/5'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'
                }`
              }
            >
              <Icon size={17} className="transition-transform duration-150 group-hover:scale-105" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-gray-500 font-mono tracking-wider uppercase">System Operational</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto pt-14 md:pt-0 bg-void">
        <Outlet />
      </main>
    </div>
  );
}

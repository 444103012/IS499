

import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const SIDEBAR_BG_GRADIENT = 'linear-gradient(180deg, #061f2e 0%, #0A3C5A 22%, #0d4a6e 45%, #093652 68%, #071f2d 100%)';
const SIDEBAR_BORDER = 'rgba(10, 60, 90, 0.6)';

const menuItems = [
  { to: '/dashboard', key: 'dashboard', end: true, icon: 'LayoutDashboard' },
  { to: '/dashboard/products', key: 'products', end: false, icon: 'Package' },
  { to: '/dashboard/orders', key: 'orders', end: false, icon: 'ShoppingCart' },
  { to: '/dashboard/reports', key: 'reports', end: false, icon: 'ChartBar' },
  { to: '/dashboard/store', key: 'store', end: false, icon: 'Store' },
  { to: '/dashboard/subscription', key: 'subscription', end: false, icon: 'CreditCard' },
  { to: '/dashboard/settings', key: 'settings', end: false, icon: 'Cog' },
];

const icons = {
  LayoutDashboard: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  Package: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  ShoppingCart: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  ChartBar: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  Store: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  CreditCard: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  Cog: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

const MenuIcon = () => (
  <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

export default function DashboardSidebar({ collapsed, onToggle, isRTL }) {
  const { t, i18n } = useTranslation();
  const rtl = isRTL ?? i18n.language === 'ar';

  return (
    <aside
      style={{
        background: SIDEBAR_BG_GRADIENT,
        borderColor: SIDEBAR_BORDER,
      }}
      className={`min-h-screen flex flex-col shrink-0 transition-all duration-300 ease-in-out ${
        collapsed ? (rtl ? 'w-[72px] border-l' : 'w-[72px] border-r') : (rtl ? 'w-64 border-l' : 'w-64 border-r')
      } shadow-xl ${rtl ? 'rounded-l-2xl' : 'rounded-r-2xl'}`}
      dir={rtl ? 'rtl' : 'ltr'}
    >
      <div className="shrink-0 p-2 border-b" style={{ borderColor: SIDEBAR_BORDER }}>
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? t('dashboard.menu.menuExpand') : t('dashboard.menu.menuCollapse')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/90 hover:text-white transition-colors duration-200 hover:bg-white/10"
        >
          <MenuIcon />
          {!collapsed && <span className="text-sm font-medium">{t('dashboard.menu.menu')}</span>}
        </button>
      </div>
      <nav className="p-2 flex-1 overflow-auto">
        <div className="space-y-0.5">
          {menuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={collapsed ? t(`dashboard.menu.${item.key}`) : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative ${
                  isActive
                    ? 'bg-white/15 text-white font-semibold'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                } ${collapsed ? 'justify-center' : ''}`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span
                      className={`absolute top-2 bottom-2 w-0.5 bg-white/70 rounded-full ${rtl ? 'right-0' : 'left-0'}`}
                      aria-hidden
                    />
                  )}
                  <span className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0 relative z-10 bg-white/10 text-white">
                    {icons[item.icon]}
                  </span>
                  {!collapsed && <span className="flex-1 relative z-10">{t(`dashboard.menu.${item.key}`)}</span>}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </aside>
  );
}

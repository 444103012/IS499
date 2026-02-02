import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShoppingBag, Menu, Globe, User, LogOut, Store, LayoutDashboard, Shield } from 'lucide-react';

export default function Layout() {
  const { t, i18n } = useTranslation();
  const { user, logout, isAuthenticated } = useAuth();

  const toggleLang = () => {
    const next = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(next);
    localStorage.setItem('lang', next);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-slate-900 text-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <ShoppingBag className="w-6 h-6 text-sky-400" />
            <span>{t('appName')}</span>
          </Link>
          <nav className="hidden md:flex items-center gap-4">
            <Link to="/" className="hover:text-sky-300">{t('home')}</Link>
            {isAuthenticated && user?.role === 'store_owner' && (
              <Link to="/dashboard" className="flex items-center gap-1 hover:text-sky-300">
                <LayoutDashboard className="w-4 h-4" /> {t('dashboard')}
              </Link>
            )}
            {isAuthenticated && user?.role === 'admin' && (
              <Link to="/admin" className="flex items-center gap-1 hover:text-sky-300">
                <Shield className="w-4 h-4" /> {t('admin')}
              </Link>
            )}
            {isAuthenticated && (
              <>
                <Link to="/orders" className="hover:text-sky-300">{t('orderHistory')}</Link>
                <Link to="/profile" className="flex items-center gap-1 hover:text-sky-300">
                  <User className="w-4 h-4" /> {t('profile')}
                </Link>
              </>
            )}
            <button
              type="button"
              onClick={toggleLang}
              className="flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-700"
              title={t('language')}
            >
              <Globe className="w-4 h-4" />
              <span className="text-sm">{i18n.language === 'en' ? 'عربي' : 'EN'}</span>
            </button>
            {isAuthenticated ? (
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-1 px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600"
              >
                <LogOut className="w-4 h-4" /> {t('logout')}
              </button>
            ) : (
              <>
                <Link to="/login" className="px-3 py-1.5 rounded hover:bg-slate-700">{t('login')}</Link>
                <Link to="/register" className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500">{t('register')}</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="bg-slate-800 text-slate-300 py-6 mt-auto">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm">
          StoreLaunch – IS498 Graduation Project. King Saud University.
        </div>
      </footer>
    </div>
  );
}


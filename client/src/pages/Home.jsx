import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Store, ShoppingBag, User, ArrowRight } from 'lucide-react';

export default function Home() {
  const { t } = useTranslation();
  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <h1 className="text-4xl font-bold text-slate-900 mb-4">{t('appName')}</h1>
      <p className="text-lg text-slate-600 mb-12 max-w-2xl mx-auto">
        E-commerce platform for Saudi SMBs. Create your store, sell online, accept payments in SAR.
      </p>
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <Link
          to="/register"
          className="block p-6 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-sky-200 transition"
        >
          <Store className="w-12 h-12 text-sky-600 mx-auto mb-3" />
          <h2 className="font-semibold text-slate-900 mb-1">{t('storeOwner')}</h2>
          <p className="text-sm text-slate-600 mb-3">Create your online store in minutes</p>
          <span className="text-sky-600 text-sm font-medium flex items-center justify-center gap-1">
            {t('register')} <ArrowRight className="w-4 h-4" />
          </span>
        </Link>
        <Link
          to="/login"
          className="block p-6 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-sky-200 transition"
        >
          <ShoppingBag className="w-12 h-12 text-sky-600 mx-auto mb-3" />
          <h2 className="font-semibold text-slate-900 mb-1">{t('customer')}</h2>
          <p className="text-sm text-slate-600 mb-3">Browse stores and shop online</p>
          <span className="text-sky-600 text-sm font-medium flex items-center justify-center gap-1">
            {t('login')} <ArrowRight className="w-4 h-4" />
          </span>
        </Link>
        <div className="block p-6 rounded-xl bg-slate-100 border border-slate-200">
          <User className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h2 className="font-semibold text-slate-700 mb-1">{t('browseStore')}</h2>
          <p className="text-sm text-slate-600 mb-3">Enter a store link to browse (e.g. /store/demo-store)</p>
          <span className="text-slate-500 text-sm">No account needed to browse</span>
        </div>
      </div>
      <p className="text-slate-500 text-sm">
        IS498 Graduation Project · King Saud University · Dr. Abdulrahman Alothaim
      </p>
    </div>
  );
}

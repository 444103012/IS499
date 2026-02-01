import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';

export default function StoreSubscription() {
  const { t } = useTranslation();
  const { storeId } = useParams();
  const [data, setData] = useState({ current: null, plans: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api(`/subscriptions/store/${storeId}`)
      .then(setData)
      .catch(() => setData({ current: null, plans: [] }))
      .finally(() => setLoading(false));
  }, [storeId]);

  const changePlan = (planId) => {
    api(`/subscriptions/store/${storeId}`, {
      method: 'POST',
      body: JSON.stringify({ planId }),
    })
      .then(() => api(`/subscriptions/store/${storeId}`))
      .then(setData)
      .catch(alert);
  };

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-8">Loading...</div>;

  const current = data.current || { plan_id: 'basic', name: 'Basic', price_monthly: 0 };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">{t('subscription')}</h1>
      <p className="text-slate-600 mb-6">Current plan: <strong>{current.name}</strong> — {current.price_monthly} {t('sar')}/mo</p>
      <div className="grid md:grid-cols-3 gap-4">
        {data.plans.map((plan) => (
          <div
            key={plan.id}
            className={`p-6 rounded-xl border-2 ${current.plan_id === plan.id ? 'border-sky-500 bg-sky-50' : 'border-slate-200 bg-white'}`}
          >
            <h3 className="font-bold text-slate-900">{plan.name}</h3>
            <p className="text-2xl font-bold text-sky-600 mt-2">{plan.price_monthly} {t('sar')}/mo</p>
            <p className="text-sm text-slate-600 mt-1">Max products: {plan.max_products === -1 ? 'Unlimited' : plan.max_products}</p>
            {current.plan_id !== plan.id && (
              <button
                type="button"
                onClick={() => changePlan(plan.id)}
                className="mt-4 w-full py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-500"
              >
                Select
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

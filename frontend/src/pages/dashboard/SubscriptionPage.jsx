




import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../api/axios';
import CurrencyAmount from '../../components/common/CurrencyAmount';

export default function SubscriptionPage() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [actionLoading, setActionLoading] = useState(false);

  const [confirmModal, setConfirmModal] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ last4: '', expiryMonth: '', expiryYear: '', cardholderName: '', cardType: 'Visa' });

  const FEATURE_TRANSLATIONS_AR = {
    'Bank Transfer only': 'التحويل البنكي فقط',
    'Manual Shipping': 'شحن يدوي',
    'Default Theme Only': 'قالب افتراضي فقط',
    'Arabic & English Support': 'دعم العربية والإنجليزية',
    'All Basic Features': 'جميع مميزات الأساسي',
    'Expanded Payment Options': 'خيارات دفع متعددة',
    'More Shipping Providers': 'مزودو شحن أكثر',
    'Standard Themes': 'قوالب قياسية',
    'Standard Reports & Analytics': 'تقارير وتحليلات قياسية',
    'All Pro Features': 'جميع مميزات المحترف',
    'Advanced Reports & Analytics (Export)': 'تقارير وتحليلات متقدمة (تصدير)',
    'Custom Domain': 'نطاق مخصص',
    'Advanced Themes': 'قوالب متقدمة',
    'Marketing & Conversion Tools': 'أدوات التسويق والتحويل',
    'POS Integration': 'تكامل نقاط البيع (POS)',
  };

  const translateFeature = (text) => (isRTL ? FEATURE_TRANSLATIONS_AR[text] || text : text);

  const getFeaturesLostForDowngrade = (fromPlanId, toPlanId) => {
    const fromPlan = plans.find((p) => p.planId === fromPlanId);
    const toPlan = plans.find((p) => p.planId === toPlanId);
    if (!fromPlan?.features || !toPlan?.features) return [];
    const toSet = new Set(toPlan.features);
    return fromPlan.features.filter((f) => !toSet.has(f));
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 4000);
  };

  const fetchAll = useCallback(async () => {
    setLoadError('');
    try {
      const [subRes, plansRes, pmRes] = await Promise.all([
        axiosInstance.get('/api/subscription'),
        axiosInstance.get('/api/subscription/plans'),
        axiosInstance.get('/api/subscription/payment-method').catch(() => ({ data: { paymentMethod: null } })),
      ]);
      setSubscription(subRes.data);
      setPlans(plansRes.data.plans || []);
      setPaymentMethod(pmRes.data.paymentMethod || null);
    } catch (err) {
      setLoadError(err.response?.data?.error || t('dashboard.subscriptionPage.loadError'));
      setSubscription(null);
      setPlans([]);
      setPaymentMethod(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleUpgrade = async (planId) => {
    setConfirmModal(null);
    setActionLoading(true);
    try {
      await axiosInstance.post('/api/subscription/upgrade', { planId });
      showToast(t('dashboard.subscriptionPage.upgradeSuccess'));
      await fetchAll();
    } catch (err) {
      showToast(err.response?.data?.error || t('dashboard.subscriptionPage.error'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDowngrade = async (planId) => {
    setConfirmModal(null);
    setActionLoading(true);
    try {
      await axiosInstance.post('/api/subscription/downgrade', { planId });
      showToast(t('dashboard.subscriptionPage.downgradeSuccess'));
      await fetchAll();
    } catch (err) {
      showToast(err.response?.data?.error || t('dashboard.subscriptionPage.error'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSavePaymentMethod = async (e) => {
    e.preventDefault();
    const { last4, expiryMonth, expiryYear } = paymentForm;
    if (!last4 || last4.replace(/\D/g, '').length !== 4) return;
    const month = parseInt(expiryMonth, 10);
    const year = parseInt(expiryYear, 10);
    if (isNaN(month) || month < 1 || month > 12 || isNaN(year) || year < 2000) return;
    setActionLoading(true);
    try {
      await axiosInstance.post('/api/subscription/payment-method', {
        last4: last4.replace(/\D/g, '').slice(-4),
        expiryMonth: month,
        expiryYear: year,
        cardholderName: paymentForm.cardholderName,
        cardType: paymentForm.cardType,
      });
      showToast(t('dashboard.subscriptionPage.paymentMethodSaved'));
      setPaymentModalOpen(false);
      setPaymentForm({ last4: '', expiryMonth: '', expiryYear: '', cardholderName: '', cardType: 'Visa' });
      const pmRes = await axiosInstance.get('/api/subscription/payment-method');
      setPaymentMethod(pmRes.data.paymentMethod || null);
    } catch (err) {
      showToast(err.response?.data?.error || t('dashboard.subscriptionPage.error'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemovePaymentMethod = async () => {
    setActionLoading(true);
    try {
      await axiosInstance.delete('/api/subscription/payment-method');
      showToast(t('dashboard.subscriptionPage.paymentMethodRemoved'));
      setPaymentMethod(null);
      await fetchAll();
    } catch (err) {
      showToast(err.response?.data?.error || t('dashboard.subscriptionPage.error'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const currentPlan = subscription?.plan || 'basic';
  const normalizedPlans = [...plans].sort((a, b) => Number(a.rank || 0) - Number(b.rank || 0));
  const currentPlanMeta = normalizedPlans.find((p) => p.planId === currentPlan);
  const currentRank = currentPlanMeta ? Number(currentPlanMeta.rank || 0) : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-storelaunch-dark font-bold text-2xl">{t('dashboard.subscriptionPage.title')}</h2>
        <p className="text-gray-500">{t('dashboard.subscriptionPage.subtitle')}</p>
        <div className="bg-white rounded-xl shadow-md p-8 text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <h2 className="text-storelaunch-dark font-bold text-2xl">{t('dashboard.subscriptionPage.title')}</h2>
        <div className="bg-white rounded-xl shadow-md p-6 border border-red-100">
          <p className="text-red-600">{loadError}</p>
          <button type="button" onClick={fetchAll} className="mt-3 px-4 py-2 bg-storelaunch-green text-white rounded-lg text-sm font-medium">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div>
        <h2 className="text-storelaunch-dark font-bold text-2xl mb-1">{t('dashboard.subscriptionPage.title')}</h2>
        <p className="text-gray-600 text-sm">{t('dashboard.subscriptionPage.subtitle')}</p>
      </div>

      {}
      {toast.show && (
        <div
          className={`fixed top-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white ${
            toast.type === 'error' ? 'bg-red-500' : 'bg-storelaunch-green'
          } ${isRTL ? 'left-4' : 'right-4'}`}
          role="alert"
        >
          {toast.message}
        </div>
      )}

      {}
      <div className="bg-white border border-gray-200 rounded-xl shadow-md p-6">
        <h3 className="text-storelaunch-dark font-semibold text-lg mb-4">{t('dashboard.subscriptionPage.currentPlan')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <p className="text-gray-500 text-sm">{t('dashboard.subscriptionPage.currentPlan')}</p>
            <p className="font-semibold text-gray-900 capitalize">{subscription?.planName || 'Basic'}</p>
          </div>
          <div>
            <p className="text-gray-500 text-sm">{t('dashboard.subscriptionPage.planStatus')}</p>
            <span
              className={`inline-block px-2 py-0.5 rounded-full text-sm font-medium ${
                subscription?.status === 'Active'
                  ? 'bg-green-100 text-green-800'
                  : subscription?.status === 'Trial'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {subscription?.status === 'Active'
                ? t('dashboard.subscriptionPage.statusActive')
                : subscription?.status === 'Trial'
                ? t('dashboard.subscriptionPage.statusTrial')
                : t('dashboard.subscriptionPage.statusExpired')}
            </span>
          </div>
          <div>
            <p className="text-gray-500 text-sm">{t('dashboard.subscriptionPage.renewalDate')}</p>
            <p className="font-medium text-gray-900">{subscription?.renewalDate || '—'}</p>
          </div>
          <div>
            <p className="text-gray-500 text-sm">{t('dashboard.subscriptionPage.nextBillingAmount')}</p>
            <p className="font-medium text-gray-900">
              {subscription?.nextBillingAmount != null && subscription.nextBillingAmount > 0
                ? <CurrencyAmount value={subscription.nextBillingAmount} isRTL={isRTL} />
                : t('dashboard.subscriptionPage.free')}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-sm">{t('dashboard.subscriptionPage.startDate')}</p>
            <p className="font-medium text-gray-900">{subscription?.startDate || '—'}</p>
          </div>
          <div>
            <p className="text-gray-500 text-sm">{t('dashboard.subscriptionPage.remainingDays')}</p>
            <p className="font-medium text-gray-900">{subscription?.remainingDaysInCycle ?? '—'}</p>
          </div>
        </div>
      </div>

      {}
      <div>
        <h3 className="text-storelaunch-dark font-semibold text-lg mb-4">{t('dashboard.subscriptionPage.comparePlans')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {normalizedPlans.map((plan) => {
            const isCurrent = currentPlan === plan.planId;
            const planRank = Number(plan.rank || 0);
            const canUpgrade = planRank > currentRank;
            const canDowngrade = planRank < currentRank;
            return (
              <div
                key={plan.planId}
                className={`bg-white rounded-xl border-2 shadow-md p-6 flex flex-col ${
                  isCurrent ? 'border-storelaunch-green ring-2 ring-storelaunch-green/20' : 'border-gray-200'
                }`}
              >
                {isCurrent && (
                  <span className="inline-block w-fit mb-2 px-2 py-0.5 rounded-full text-xs font-medium bg-storelaunch-green text-white">
                    {t('dashboard.subscriptionPage.currentPlanBadge')}
                  </span>
                )}
                <h4 className="text-xl font-bold text-storelaunch-dark capitalize">{plan.name}</h4>
                <div className="mt-2 mb-4">
                  {plan.price === 0 ? (
                    <span className="text-2xl font-bold text-gray-900">{t('dashboard.subscriptionPage.free')}</span>
                  ) : (
                    <>
                      <span className="text-2xl font-bold text-gray-900">
                        <CurrencyAmount value={plan.price} isRTL={isRTL} size="xl" />
                      </span>
                      <span className="text-gray-600 ml-1">{t('dashboard.subscriptionPage.perMonth')}</span>
                    </>
                  )}
                </div>
                <ul className="space-y-2 flex-1 mb-4">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <svg className="w-4 h-4 text-storelaunch-green flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {translateFeature(f)}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-4">
                  {canUpgrade && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => setConfirmModal({ action: 'upgrade', planId: plan.planId, planName: plan.name })}
                      className="w-full py-2.5 rounded-lg font-medium bg-storelaunch-green text-white hover:bg-storelaunch-deep-green disabled:opacity-50 transition-colors"
                    >
                      {t('dashboard.subscriptionPage.upgrade')}
                    </button>
                  )}
                  {canDowngrade && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => setConfirmModal({
                        action: 'downgrade',
                        planId: plan.planId,
                        planName: plan.name,
                        featuresLost: getFeaturesLostForDowngrade(currentPlan, plan.planId),
                      })}
                      className="w-full py-2.5 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                      {t('dashboard.subscriptionPage.downgrade')}
                    </button>
                  )}
                  {isCurrent && (
                    <p className="text-center text-sm text-gray-500 py-2">{t('dashboard.subscriptionPage.currentPlanBadge')}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {}
      <div className="bg-white border border-gray-200 rounded-xl shadow-md p-6">
        <h3 className="text-storelaunch-dark font-semibold text-lg mb-1">{t('dashboard.subscriptionPage.paymentMethod')}</h3>
        <p className="text-gray-500 text-sm mb-4">{t('dashboard.subscriptionPage.paymentMethodSub')}</p>
        {paymentMethod ? (
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-center w-10 h-7 bg-white border border-gray-300 rounded text-xs font-bold text-gray-700">
                {paymentMethod.cardType === 'Visa' ? 'VISA' :
                 paymentMethod.cardType === 'Mastercard' ? 'MC' :
                 paymentMethod.cardType === 'Mada' ? 'mada' :
                 paymentMethod.cardType === 'Amex' ? 'AMEX' :
                 (paymentMethod.cardType || 'Card').slice(0,4)}
              </div>
              <div>
                {paymentMethod.cardholderName && (
                  <p className="text-xs text-gray-500">{paymentMethod.cardholderName}</p>
                )}
                <span className="font-mono text-sm">{paymentMethod.masked}</span>
                <span className="text-gray-500 text-xs ml-2">({t('dashboard.subscriptionPage.expires')} {paymentMethod.expiry})</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setPaymentForm({ last4: paymentMethod.last4, expiryMonth: String(paymentMethod.expiryMonth), expiryYear: String(paymentMethod.expiryYear), cardholderName: paymentMethod.cardholderName || '', cardType: paymentMethod.cardType || 'Visa' });
                setPaymentModalOpen(true);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {t('dashboard.subscriptionPage.updateCard')}
            </button>
            <button type="button" onClick={handleRemovePaymentMethod} disabled={actionLoading} className="px-4 py-2 border border-red-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
              {t('dashboard.subscriptionPage.removeCard')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setPaymentModalOpen(true)}
            className="px-4 py-2 bg-storelaunch-green text-white rounded-lg font-medium hover:bg-storelaunch-deep-green"
          >
            {t('dashboard.subscriptionPage.addPaymentMethod')}
          </button>
        )}
      </div>

      {}
      {confirmModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" onClick={() => !actionLoading && setConfirmModal(null)}>
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()} dir={isRTL ? 'rtl' : 'ltr'}>
            <h4 className="text-lg font-semibold text-storelaunch-dark mb-2">
              {confirmModal.action === 'upgrade'
                ? t('dashboard.subscriptionPage.confirmUpgrade', { plan: confirmModal.planName })
                : t('dashboard.subscriptionPage.confirmDowngrade', { plan: confirmModal.planName })}
            </h4>
            <p className="text-gray-600 text-sm mb-4">
              {confirmModal.action === 'upgrade' ? t('dashboard.subscriptionPage.confirmUpgradeDesc') : t('dashboard.subscriptionPage.confirmDowngradeDesc')}
            </p>
            {confirmModal.action === 'downgrade' && confirmModal.featuresLost && confirmModal.featuresLost.length > 0 && (
              <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-sm font-medium text-amber-800 mb-2">{t('dashboard.subscriptionPage.featuresYouWillLose')}</p>
                <ul className="text-sm text-amber-800 space-y-1">
                  {confirmModal.featuresLost.map((f, i) => (
                    <li key={i}>• {translateFeature(f)}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                type="button"
                onClick={() => confirmModal.action === 'upgrade' ? handleUpgrade(confirmModal.planId) : handleDowngrade(confirmModal.planId)}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-lg font-medium bg-storelaunch-green text-white hover:bg-storelaunch-deep-green disabled:opacity-50"
              >
                {t('dashboard.subscriptionPage.confirm')}
              </button>
              <button type="button" onClick={() => setConfirmModal(null)} disabled={actionLoading} className="flex-1 py-2.5 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50">
                {t('dashboard.subscriptionPage.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" onClick={() => !actionLoading && setPaymentModalOpen(false)}>
          <form className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full" onSubmit={handleSavePaymentMethod} onClick={(e) => e.stopPropagation()} dir={isRTL ? 'rtl' : 'ltr'}>
            <h4 className="text-lg font-semibold text-storelaunch-dark mb-4">
              {paymentMethod ? t('dashboard.subscriptionPage.updateCard') : t('dashboard.subscriptionPage.addPaymentMethod')}
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isRTL ? 'اسم حامل البطاقة' : 'Cardholder Name'}
                </label>
                <input
                  type="text"
                  placeholder={isRTL ? 'الاسم كما هو على البطاقة' : 'Name on card'}
                  value={paymentForm.cardholderName}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, cardholderName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isRTL ? 'نوع البطاقة' : 'Card Type'}
                </label>
                <select
                  value={paymentForm.cardType}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, cardType: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="Visa">Visa</option>
                  <option value="Mastercard">Mastercard</option>
                  <option value="Mada">Mada</option>
                  <option value="Amex">American Express</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('dashboard.subscriptionPage.cardLast4')}</label>
                <input
                  type="text"
                  maxLength={4}
                  placeholder="1234"
                  value={paymentForm.last4}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, last4: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono tracking-widest"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('dashboard.subscriptionPage.expiryMonth')}</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    placeholder="MM"
                    value={paymentForm.expiryMonth}
                    onChange={(e) => setPaymentForm((f) => ({ ...f, expiryMonth: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('dashboard.subscriptionPage.expiryYear')}</label>
                  <input
                    type="number"
                    min={2024}
                    max={2040}
                    placeholder="YYYY"
                    value={paymentForm.expiryYear}
                    onChange={(e) => setPaymentForm((f) => ({ ...f, expiryYear: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>
            </div>
            <div className={`flex gap-3 mt-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button type="submit" disabled={actionLoading || paymentForm.last4.length !== 4} className="flex-1 py-2.5 rounded-lg font-medium bg-storelaunch-green text-white hover:bg-storelaunch-deep-green disabled:opacity-50">
                {t('dashboard.subscriptionPage.saveCard')}
              </button>
              <button type="button" onClick={() => setPaymentModalOpen(false)} disabled={actionLoading} className="flex-1 py-2.5 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50">
                {t('dashboard.subscriptionPage.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

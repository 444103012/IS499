import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../api/axios';
import CurrencyAmount from '../../components/common/CurrencyAmount';

const GoLivePage = () => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    cardholderName: '',
    cardNumber: '',
    expiry: '',
    cvv: '',
    payment_method: 'creditcard',
  });
  const [touched, setTouched] = useState({
    cardholderName: false,
    cardNumber: false,
    expiry: false,
    cvv: false,
  });

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get('/api/store/go-live-status');
      setStatus(data);
      setError('');
    } catch (err) {
      try {
        const fallback = await axiosInstance.get('/api/store-setup/status');
        setStatus((prev) => ({
          storeId: fallback.data?.store_id || prev?.storeId || null,
          storeStatus: prev?.storeStatus || 'Pending',
          paymentStatus: prev?.paymentStatus || 'unpaid',
          planType: prev?.planType || 'basic',
          planPrice: prev?.planPrice ?? 0,
          currency: prev?.currency || 'SAR',
          canActivate: true,
          reason: null,
          lastAttempt: prev?.lastAttempt || null,
        }));
      } catch {
        setStatus((prev) => prev || {
          storeId: null,
          storeStatus: 'Pending',
          paymentStatus: 'unpaid',
          planType: 'basic',
          planPrice: 0,
          currency: 'SAR',
          canActivate: false,
          reason: null,
          lastAttempt: null,
        });
      }
      setError(err.response?.data?.error || 'Failed to fetch go-live status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    if (!success) return undefined;
    const timer = setTimeout(() => navigate('/dashboard', { replace: true }), 2500);
    return () => clearTimeout(timer);
  }, [success, navigate]);

  const planFeatures = useMemo(() => {
    const p = String(status?.planType || 'basic').toLowerCase();
    if (p === 'advanced') return ['All Pro features', 'Custom domain', 'Advanced reports', 'POS integration'];
    if (p === 'pro') return ['All Basic features', 'Expanded payment options', 'More shipping providers'];
    return ['Bank transfer support', 'Manual shipping', 'Arabic and English support'];
  }, [status?.planType]);

  const formatCardNumber = (value) => {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  };

  const formatExpiry = (value) => {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  };

  const updateField = (field, value) => {
    if (field === 'cardholderName') {
      const clean = String(value || '').replace(/[^a-zA-Z\s]/g, '').slice(0, 50);
      setForm((p) => ({ ...p, cardholderName: clean }));
      return;
    }
    if (field === 'cardNumber') {
      setForm((p) => ({ ...p, cardNumber: formatCardNumber(value) }));
      return;
    }
    if (field === 'expiry') {
      setForm((p) => ({ ...p, expiry: formatExpiry(value) }));
      return;
    }
    if (field === 'cvv') {
      const clean = String(value || '').replace(/\D/g, '').slice(0, 3);
      setForm((p) => ({ ...p, cvv: clean }));
      return;
    }
    setForm((p) => ({ ...p, [field]: value }));
  };

  const fieldErrors = useMemo(() => {
    const errors = {};

    if (!form.cardholderName || form.cardholderName.trim().length < 2) {
      errors.cardholderName = 'Cardholder name must be at least 2 letters.';
    }

    const cardDigits = form.cardNumber.replace(/\s+/g, '');
    if (!/^\d{16}$/.test(cardDigits)) {
      errors.cardNumber = 'Card number must be exactly 16 digits.';
    }

    if (!/^\d{2}\/\d{2}$/.test(form.expiry)) {
      errors.expiry = 'Expiry must be in MM/YY format.';
    } else {
      const [mm, yy] = form.expiry.split('/');
      const month = Number(mm);
      if (Number.isNaN(month) || month < 1 || month > 12) {
        errors.expiry = 'Expiry month must be between 01 and 12.';
      } else {
        const now = new Date();
        const year = 2000 + Number(yy);
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        if (year < currentYear || (year === currentYear && month < currentMonth)) {
          errors.expiry = 'Card expiry date cannot be in the past.';
        }
      }
    }

    if (!/^\d{3}$/.test(form.cvv)) {
      errors.cvv = 'CVV must be exactly 3 digits.';
    }

    return errors;
  }, [form]);

  const canSubmit = !!status?.canActivate && Object.keys(fieldErrors).length === 0 && !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!status?.storeId) return;

    setTouched({
      cardholderName: true,
      cardNumber: true,
      expiry: true,
      cvv: true,
    });
    if (Object.keys(fieldErrors).length > 0) return;

    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const token = `${String(form.cardNumber).replace(/\s+/g, '')}|${form.expiry}|${form.cvv}|${form.cardholderName || 'cardholder'}`;

      const { data } = await axiosInstance.post('/api/store/go-live', {
        store_id: status.storeId,
        payment_method: form.payment_method,
        paymentToken: token,
      });
      if (data?.success) {
        setSuccess('Your store is now live!');
        await fetchStatus();
      } else {
        setError('Activation failed. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Go-live failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-gray-600">Loading go-live status...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-storelaunch-dark">Go Live</h2>
        <p className="text-sm text-gray-600 mt-1">Publish your store and start selling.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <h3 className="text-lg font-semibold text-storelaunch-dark mb-2">Plan Summary</h3>
        <p className="text-gray-700">
          <span className="font-medium">Plan:</span> {status?.planType || 'basic'}
        </p>
        <p className="text-gray-700 flex flex-wrap items-baseline gap-1">
          <span className="font-medium">Price:</span>
          <CurrencyAmount value={status?.planPrice || 0} isRTL={isRTL} />
          <span>/ month</span>
        </p>
        <ul className="mt-3 space-y-1 text-sm text-gray-600">
          {planFeatures.map((f) => <li key={f}>- {f}</li>)}
        </ul>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <h3 className="text-lg font-semibold text-storelaunch-dark mb-2">Current Status</h3>
        <p className="text-gray-700">
          <span className="font-medium">Store status:</span> {status?.storeStatus || 'Unknown'}
        </p>
        <p className="text-gray-700">
          <span className="font-medium">Payment status:</span> {status?.paymentStatus === 'payment_failed' ? 'unpaid' : (status?.paymentStatus || 'unpaid')}
        </p>
      </div>

      {!!success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-800">
          <p className="font-semibold">{success}</p>
          <p className="text-sm">Redirecting to dashboard...</p>
        </div>
      )}
      {!!error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
      )}

      {status?.storeStatus !== 'Active' && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 space-y-4">
          <h3 className="text-lg font-semibold text-storelaunch-dark">Card Info </h3>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Cardholder name</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={form.cardholderName}
              maxLength={50}
              placeholder="John Doe"
              onBlur={() => setTouched((p) => ({ ...p, cardholderName: true }))}
              onChange={(e) => updateField('cardholderName', e.target.value)}
            />
            {touched.cardholderName && fieldErrors.cardholderName ? (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.cardholderName}</p>
            ) : null}
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Card number</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={form.cardNumber}
              inputMode="numeric"
              placeholder="1234 5678 9012 3456"
              onBlur={() => setTouched((p) => ({ ...p, cardNumber: true }))}
              onChange={(e) => updateField('cardNumber', e.target.value)}
            />
            {touched.cardNumber && fieldErrors.cardNumber ? (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.cardNumber}</p>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Expiry</label>
              <input
                placeholder="MM/YY"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={form.expiry}
                inputMode="numeric"
                onBlur={() => setTouched((p) => ({ ...p, expiry: true }))}
                onChange={(e) => updateField('expiry', e.target.value)}
              />
              {touched.expiry && fieldErrors.expiry ? (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.expiry}</p>
              ) : null}
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">CVV</label>
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={form.cvv}
                inputMode="numeric"
                maxLength={3}
                placeholder="123"
                onBlur={() => setTouched((p) => ({ ...p, cvv: true }))}
                onChange={(e) => updateField('cvv', e.target.value)}
              />
              {touched.cvv && fieldErrors.cvv ? (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.cvv}</p>
              ) : null}
            </div>
          </div>

          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="px-5 py-2.5 rounded-lg bg-storelaunch-green text-white font-medium hover:bg-storelaunch-deep-green disabled:opacity-50"
          >
            {submitting ? 'Processing...' : 'Go Live Now'}
          </button>
        </form>
      )}
    </div>
  );
};

export default GoLivePage;

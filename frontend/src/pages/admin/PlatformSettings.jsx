

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CurrencyAmount from '../../components/common/CurrencyAmount';
import {
  getPolicies,
  updatePolicies,
  getPlans,
  updatePlan,
  updatePlanStatus,
  getPlatformConfig,
  updatePlatformConfig,
} from '../../services/adminPlatformApi';

const TABS = [
  { id: 'policies', label: 'Policies' },
  { id: 'plans', label: 'Subscription Plans' },
  { id: 'config', label: 'Platform Config' },
];

function TabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
        active
          ? 'bg-storelaunch-green text-white border-storelaunch-green'
          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  );
}

function Toggle({ enabled, onChange, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? 'bg-storelaunch-green' : 'bg-gray-300'
      } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      aria-pressed={enabled}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function Modal({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-xl border border-gray-200 shadow-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            ✕
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const s = status || 'Enabled';
  const cls =
    s === 'Enabled'
      ? 'bg-green-100 text-green-800'
      : 'bg-gray-100 text-gray-800';
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{s}</span>;
}

function safeFeaturesToText(features) {
  if (Array.isArray(features)) return features.map((f) => String(f)).join('\n');
  return '';
}

function parseFeaturesText(text) {
  return (text || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function PlatformSettings() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [activeTab, setActiveTab] = useState('policies');

  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  
  const [termsText, setTermsText] = useState('');
  const [privacyText, setPrivacyText] = useState('');
  const [policiesUpdatedAt, setPoliciesUpdatedAt] = useState(null);

  
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planSlug, setPlanSlug] = useState('');
  const [planRank, setPlanRank] = useState(0);
  const [planName, setPlanName] = useState('');
  const [planPrice, setPlanPrice] = useState('0');
  const [planFeaturesText, setPlanFeaturesText] = useState('');

  
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maxStoresPerOwner, setMaxStoresPerOwner] = useState(1);
  const [defaultTheme, setDefaultTheme] = useState('Default');
  const [configUpdatedAt, setConfigUpdatedAt] = useState(null);

  const themeOptions = useMemo(() => ['Default', 'Modern', 'Minimal', 'Classic'], []);

  
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    Promise.all([getPolicies(), getPlatformConfig()])
      .then(([pol, cfg]) => {
        if (!alive) return;
        setTermsText(pol.terms_text || '');
        setPrivacyText(pol.privacy_text || '');
        setPoliciesUpdatedAt(pol.updated_at || null);

        setMaintenanceMode(!!cfg.maintenance_mode);
        setMaxStoresPerOwner(Number(cfg.max_stores_per_owner || 1));
        setDefaultTheme(cfg.default_theme || 'Default');
        setConfigUpdatedAt(cfg.updated_at || null);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err.response?.data?.error || err.message || 'Failed to load platform settings');
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (activeTab !== 'plans') return;
    setPlansLoading(true);
    setError('');
    getPlans()
      .then(setPlans)
      .catch((err) => setError(err.response?.data?.error || err.message || 'Failed to load plans'))
      .finally(() => setPlansLoading(false));
  }, [activeTab]);

  const openEditPlan = (p) => {
    setEditingPlan(p);
    setPlanSlug(p.slug || '');
    setPlanRank(Number(p.rank || 0));
    setPlanName(p.name || '');
    setPlanPrice(String(p.price ?? '0'));
    setPlanFeaturesText(safeFeaturesToText(p.features));
    setPlanModalOpen(true);
  };

  const closePlanModal = () => {
    setPlanModalOpen(false);
    setEditingPlan(null);
  };

  const handleSavePolicies = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const res = await updatePolicies({ terms_text: termsText, privacy_text: privacyText });
      setPoliciesUpdatedAt(res.updated_at || null);
      setNotice('Policies saved.');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save policies');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const res = await updatePlatformConfig({
        maintenance_mode: !!maintenanceMode,
        max_stores_per_owner: Number(maxStoresPerOwner),
        default_theme: defaultTheme,
      });
      setConfigUpdatedAt(res.config?.updated_at || null);
      setNotice('Platform config saved.');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save config');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitPlan = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = {
        name: planName,
        rank: Number(planRank),
        price: Number(planPrice),
        features: parseFeaturesText(planFeaturesText),
      };
      const res = await updatePlan(editingPlan.plan_id, payload);
      const updated = res.plan;
      setPlans((prev) => prev.map((p) => (p.plan_id === updated.plan_id ? updated : p)));
      setNotice('Plan updated.');
      closePlanModal();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePlanStatus = async (p) => {
    const next = p.status === 'Enabled' ? 'Disabled' : 'Enabled';
    setError('');
    setNotice('');
    try {
      const res = await updatePlanStatus(p.plan_id, next);
      const updated = res.plan;
      setPlans((prev) => prev.map((x) => (x.plan_id === updated.plan_id ? updated : x)));
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to update plan status');
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <p className="text-gray-500">Loading platform settings...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-storelaunch-dark">Platform Settings</h1>
          <p className="text-sm text-gray-500">Manage global policies, plans, and configuration.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <TabButton key={t.id} active={activeTab === t.id} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </TabButton>
        ))}
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {notice && <p className="text-emerald-700 text-sm">{notice}</p>}

      {activeTab === 'policies' && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Terms &amp; Privacy</h2>
            <span className="text-xs text-gray-500">
              {policiesUpdatedAt ? `Updated: ${new Date(policiesUpdatedAt).toLocaleString()}` : ''}
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">Terms &amp; Conditions</label>
              <textarea
                rows={12}
                value={termsText}
                onChange={(e) => setTermsText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y"
                placeholder="Enter Terms & Conditions..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">Privacy Policy</label>
              <textarea
                rows={12}
                value={privacyText}
                onChange={(e) => setPrivacyText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y"
                placeholder="Enter Privacy Policy..."
              />
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={handleSavePolicies}
              disabled={saving}
              className={`px-4 py-2 rounded-lg text-sm font-semibold text-white bg-storelaunch-green hover:bg-emerald-600 ${
                saving ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              {saving ? 'Saving...' : 'Save Policies'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'plans' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">Global Subscription Plans</h2>
            <p className="text-xs text-gray-500">Core plans are centrally managed (Basic, Pro, Advanced).</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[680px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-700">Name</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Price</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Features</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Status</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {plansLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      Loading plans...
                    </td>
                  </tr>
                ) : plans.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No plans available.
                    </td>
                  </tr>
                ) : (
                  [...plans].sort((a, b) => Number(a.rank || 0) - Number(b.rank || 0)).map((p) => (
                    <tr key={p.plan_id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">
                        <div>{p.name}</div>
                        <div className="text-xs text-gray-500">{p.slug}</div>
                      </td>
                      <td className="px-4 py-3">
                        <CurrencyAmount value={p.price ?? 0} isRTL={isRTL} size="sm" />
                      </td>
                      <td className="px-4 py-3">
                        {Array.isArray(p.features) ? `${p.features.length} items` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditPlan(p)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTogglePlanStatus(p)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                              p.status === 'Enabled'
                                ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                : 'border-storelaunch-green text-storelaunch-green hover:bg-storelaunch-green/10'
                            }`}
                          >
                            {p.status === 'Enabled' ? 'Disable' : 'Enable'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Modal
            open={planModalOpen}
            title="Edit Plan"
            onClose={closePlanModal}
          >
            <form onSubmit={handleSubmitPlan} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Slug (fixed identity)</label>
                <input
                  value={planSlug}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-600"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Rank (order)</label>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={planRank}
                  onChange={(e) => setPlanRank(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Plan Name</label>
                <input
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="e.g. Basic"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Price</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={planPrice}
                  onChange={(e) => setPlanPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">Features (one per line)</label>
                <textarea
                  rows={6}
                  value={planFeaturesText}
                  onChange={(e) => setPlanFeaturesText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y"
                  placeholder="Unlimited products&#10;Custom domain&#10;Priority support"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closePlanModal}
                  className="px-3 py-2 rounded-lg text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !editingPlan}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold text-white bg-storelaunch-green hover:bg-emerald-600 ${
                    saving ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                >
                  {saving ? 'Saving...' : 'Save Plan'}
                </button>
              </div>
            </form>
          </Modal>
        </div>
      )}

      {activeTab === 'config' && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Platform Configuration</h2>
            <span className="text-xs text-gray-500">
              {configUpdatedAt ? `Updated: ${new Date(configUpdatedAt).toLocaleString()}` : ''}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between border border-gray-200 rounded-lg p-3">
              <div>
                <p className="text-sm font-medium text-gray-800">Maintenance Mode</p>
                <p className="text-xs text-gray-500">Temporarily disable platform operations.</p>
              </div>
              <Toggle enabled={maintenanceMode} onChange={setMaintenanceMode} disabled={saving} />
            </div>

            <div className="border border-gray-200 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium text-gray-800">Max Stores Per Owner</p>
              <input
                type="number"
                min="1"
                max="100"
                value={maxStoresPerOwner}
                onChange={(e) => setMaxStoresPerOwner(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <div className="border border-gray-200 rounded-lg p-3 space-y-2 md:col-span-2">
              <p className="text-sm font-medium text-gray-800">Default Theme</p>
              <select
                value={defaultTheme}
                onChange={(e) => setDefaultTheme(e.target.value)}
                className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {themeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500">
                This is used as the initial theme for newly created stores.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={handleSaveConfig}
              disabled={saving}
              className={`px-4 py-2 rounded-lg text-sm font-semibold text-white bg-storelaunch-green hover:bg-emerald-600 ${
                saving ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              {saving ? 'Saving...' : 'Save Config'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}






import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../api/axios';
import CurrencyAmount from '../../components/common/CurrencyAmount';

const API_BASE = process.env.REACT_APP_API_URL || process.env.REACT_APP_BASE_URL || '';

const FULFILLMENT_OPTIONS = ['Processing', 'Packed', 'Shipped', 'Delivered', 'Cancelled'];

const badgePayment = (v) => {
  const s = (v || '').toLowerCase();
  if (s === 'paid') return 'bg-green-100 text-green-800';
  if (s === 'pending') return 'bg-yellow-100 text-yellow-800';
  if (s === 'failed') return 'bg-red-100 text-red-800';
  return 'bg-gray-100 text-gray-800';
};
const badgeFulfillment = (v) => {
  const s = (v || '').toLowerCase();
  if (s === 'processing' || s === 'pending') return 'bg-blue-100 text-blue-800';
  if (s === 'packed') return 'bg-slate-100 text-slate-800';
  if (s === 'shipped') return 'bg-indigo-100 text-indigo-800';
  if (s === 'delivered') return 'bg-green-100 text-green-800';
  if (s === 'cancelled') return 'bg-red-100 text-red-800';
  return 'bg-gray-100 text-gray-800';
};

const parseShippingAddress = (rawAddress) => {
  if (rawAddress == null) return null;
  const value = typeof rawAddress === 'string' ? rawAddress.trim() : rawAddress;
  if (!value) return null;

  let parsed = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      parsed = value;
    }
  }

  if (typeof parsed === 'string') {
    return { lines: [parsed], cityRegionPostal: null, country: null };
  }
  if (!parsed || typeof parsed !== 'object') return null;

  const line1 = parsed.address1 || parsed.address_line1 || parsed.line1 || parsed.street || parsed.address || null;
  const line2 = parsed.address2 || parsed.address_line2 || parsed.line2 || parsed.district || null;
  const city = parsed.city || null;
  const region = parsed.region || parsed.state || parsed.province || null;
  const postalCode = parsed.postal_code || parsed.postalCode || parsed.zip || null;
  const country = parsed.country || null;

  return {
    lines: [line1, line2].filter(Boolean),
    cityRegionPostal: [city, region, postalCode].filter(Boolean).join(', ') || null,
    country: country || null,
  };
};

const OrderDetailPage = () => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const { id } = useParams();
  const orderId = parseInt(id, 10);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [returnRequests, setReturnRequests] = useState([]);
  const [decisionLoadingId, setDecisionLoadingId] = useState(null);

  const loadOrder = async () => {
    if (Number.isNaN(orderId)) {
      setError('Invalid order id');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await axiosInstance.get(`/api/orders/${orderId}`);
      setOrder(data.order);
      setSelectedStatus(data.order.fulfillment_status || 'Processing');
    } catch (err) {
      setError(err.response?.data?.error || 'Order not found');
    } finally {
      setLoading(false);
    }
  };

  const loadReturnRequests = async () => {
    if (Number.isNaN(orderId)) return;
    try {
      const { data } = await axiosInstance.get(`/api/orders/${orderId}/return-requests`);
      setReturnRequests(Array.isArray(data?.requests) ? data.requests : []);
    } catch (_) {
      setReturnRequests([]);
    }
  };

  useEffect(() => {
    loadOrder();
    loadReturnRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when route orderId changes
  }, [orderId]);

  const handleStatusChange = async () => {
    if (!order || selectedStatus === (order.fulfillment_status || 'Processing')) return;
    setUpdating(true);
    setError(null);
    try {
      await axiosInstance.put(`/api/orders/${orderId}/status`, { fulfillment_status: selectedStatus });
      await loadOrder();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = async () => {
    if (!order || order.fulfillment_status === 'Cancelled') return;
    setUpdating(true);
    setError(null);
    try {
      await axiosInstance.put(`/api/orders/${orderId}/cancel`);
      await loadOrder();
      setCancelConfirmOpen(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel order');
    } finally {
      setUpdating(false);
    }
  };

  const handleReturnDecision = async (requestId, decision) => {
    setDecisionLoadingId(requestId);
    setError(null);
    try {
      await axiosInstance.put(`/api/orders/return-requests/${requestId}`, { decision });
      await Promise.all([loadOrder(), loadReturnRequests()]);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update return request');
    } finally {
      setDecisionLoadingId(null);
    }
  };

  const formatDate = (d) => (d ? new Date(d).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—');
  const imageUrl = (path) => (path && !path.startsWith('http') ? `${API_BASE.replace(/\/$/, '')}/${path.replace(/^\//, '')}` : path);

  if (loading && !order) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Loading order...</p>
      </div>
    );
  }
  if (error && !order) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error}</p>
        <button type="button" onClick={() => navigate('/dashboard/orders')} className="mt-2 text-[#0E8F96] hover:underline">
          ← Back to Orders
        </button>
      </div>
    );
  }
  if (!order) return null;

  const isCancelled = (order.fulfillment_status || '').toLowerCase() === 'cancelled';
  const displayOrderNumber = order.store_order_seq || order.order_id;
  const formattedShippingAddress = parseShippingAddress(order.shipping_address);

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard/orders')}
            className="text-[#0A3C5A] hover:underline text-sm font-medium"
          >
            ← Orders
          </button>
          <h2 className="text-storelaunch-dark font-bold text-xl">Order #{displayOrderNumber}</h2>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {}
        <div className="lg:col-span-2 space-y-6">
          {}
          <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Order summary</h3>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <dt className="text-gray-500">Order ID</dt>
              <dd className="font-medium">#{displayOrderNumber}</dd>
              <dt className="text-gray-500">Order date</dt>
              <dd>{formatDate(order.order_date)}</dd>
              <dt className="text-gray-500">Payment status</dt>
              <dd>
                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${badgePayment(order.payment_status)}`}>
                  {order.payment_status || 'Pending'}
                </span>
              </dd>
              <dt className="text-gray-500">Fulfillment status</dt>
              <dd>
                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${badgeFulfillment(order.fulfillment_status)}`}>
                  {order.fulfillment_status === 'Pending' ? 'Processing' : (order.fulfillment_status || 'Processing')}
                </span>
              </dd>
              <dt className="text-gray-500">Total amount</dt>
              <dd className="font-semibold">
                {order.total_amount != null ? (
                  <CurrencyAmount value={order.total_amount} isRTL={isRTL} />
                ) : (
                  '—'
                )}
              </dd>
              <dt className="text-gray-500">Payment method</dt>
              <dd>{order.payment_method || '—'}</dd>
            </dl>
          </div>

          {}
          <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Customer information</h3>
            {order.customer ? (
              <dl className="space-y-2 text-sm">
                <dt className="text-gray-500">Name</dt>
                <dd className="font-medium">{order.customer.name}</dd>
                <dt className="text-gray-500">Email</dt>
                <dd>{order.customer.email}</dd>
                <dt className="text-gray-500">Phone</dt>
                <dd>{order.customer.phone}</dd>
                <dt className="text-gray-500">Shipping address</dt>
                <dd>
                  {formattedShippingAddress ? (
                    <div className="space-y-0.5 text-gray-700">
                      {formattedShippingAddress.lines.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                      {formattedShippingAddress.cityRegionPostal ? (
                        <p>{formattedShippingAddress.cityRegionPostal}</p>
                      ) : null}
                      {formattedShippingAddress.country ? <p>{formattedShippingAddress.country}</p> : null}
                    </div>
                  ) : (order.shipping_name || '—')}
                </dd>
                {order.shipping_phone && (
                  <>
                    <dt className="text-gray-500">Shipping phone</dt>
                    <dd>{order.shipping_phone}</dd>
                  </>
                )}
              </dl>
            ) : (
              <p className="text-gray-500 text-sm">No customer data.</p>
            )}
          </div>

          {}
          <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Ordered items</h3>
            {order.items && order.items.length > 0 ? (
              <ul className="space-y-4">
                {order.items.map((item) => (
                  <li key={item.order_item_id} className="flex gap-4 p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                    <div className="shrink-0">
                      {item.product_image ? (
                        <img
                          src={imageUrl(item.product_image)}
                          alt=""
                          className="h-16 w-16 rounded-lg object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-lg bg-gray-200 flex items-center justify-center text-gray-400 text-xs">No image</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{item.product_name}</p>
                      {item.variant && <p className="text-sm text-gray-500">{item.variant}</p>}
                      <p className="text-sm text-gray-600 mt-1 flex flex-wrap items-baseline gap-1">
                        <span>Qty: {item.quantity} ×</span>
                        {item.price != null ? <CurrencyAmount value={item.price} isRTL={isRTL} size="sm" /> : '—'}
                        <span>=</span>
                        {item.subtotal != null ? <CurrencyAmount value={item.subtotal} isRTL={isRTL} size="sm" /> : '—'}
                      </p>
                    </div>
                    <div className={`font-medium text-gray-900 ${isRTL ? 'text-left' : 'text-right'}`}>
                      {item.subtotal != null ? <CurrencyAmount value={item.subtotal} isRTL={isRTL} size="sm" /> : '—'}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm">No items.</p>
            )}
          </div>
        </div>

        {}
        <div className="space-y-6">
          {}
          <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Update status</h3>
            {!isCancelled ? (
              <>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fulfillment status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3"
                >
                  {FULFILLMENT_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleStatusChange}
                  disabled={updating || selectedStatus === (order.fulfillment_status || 'Processing')}
                  className="w-full py-2 px-4 bg-[#1FAE77] text-white rounded-lg text-sm font-medium hover:bg-[#0C7A5C] disabled:opacity-50"
                >
                  {updating ? 'Saving…' : 'Save status'}
                </button>
                {cancelConfirmOpen ? (
                  <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="text-sm text-red-700 mb-2">
                      Are you sure you want to cancel this order?
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="h-9 px-3 rounded-lg bg-red-600 text-white text-sm font-medium"
                        onClick={handleCancel}
                        disabled={updating}
                      >
                        Yes, Cancel Order
                      </button>
                      <button
                        type="button"
                        className="h-9 px-3 rounded-lg border border-gray-300 text-sm font-medium"
                        onClick={() => setCancelConfirmOpen(false)}
                      >
                        Keep Order
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCancelConfirmOpen(true)}
                    disabled={updating}
                    className="w-full mt-2 py-2 px-4 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50"
                  >
                    Cancel order
                  </button>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500">This order is cancelled. Status cannot be changed.</p>
            )}
          </div>

          {returnRequests.length > 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Return Requests</h3>
              <div className="space-y-3">
                {returnRequests.map((request) => {
                  const reason = request?.payload?.reason || '—';
                  const status = String(request.status || 'pending').toLowerCase();
                  const badgeClass = status === 'approved'
                    ? 'bg-emerald-100 text-emerald-800'
                    : status === 'rejected'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-800';
                  return (
                    <div key={request.id} className="rounded-lg border border-gray-200 p-3">
                      <p className="text-sm text-gray-700 mb-2">{reason}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>
                          {status}
                        </span>
                        {status === 'pending' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleReturnDecision(request.id, 'approved')}
                              disabled={decisionLoadingId === request.id}
                              className="h-8 px-3 rounded-md bg-emerald-600 text-white text-xs font-medium disabled:opacity-60"
                            >
                              Approve Return
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReturnDecision(request.id, 'rejected')}
                              disabled={decisionLoadingId === request.id}
                              className="h-8 px-3 rounded-md border border-red-300 text-red-700 text-xs font-medium disabled:opacity-60"
                            >
                              Reject Return
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {}
          <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Status history</h3>
            {order.status_history && order.status_history.length > 0 ? (
              <ul className="space-y-3">
                {order.status_history.map((h, i) => (
                  <li key={h.id || i} className="flex items-start gap-3">
                    <span className={`shrink-0 inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${badgeFulfillment(h.status)}`}>
                      {h.status}
                    </span>
                    <span className="text-sm text-gray-500">{formatDate(h.created_at)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No history yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;

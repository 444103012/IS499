

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../../api/axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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

const OrderDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const orderId = parseInt(id, 10);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');

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

  useEffect(() => {
    loadOrder();
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
    if (!window.confirm('Cancel this order? This will set the fulfillment status to Cancelled.')) return;
    setUpdating(true);
    setError(null);
    try {
      await axiosInstance.put(`/api/orders/${orderId}/cancel`);
      await loadOrder();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel order');
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (d) => (d ? new Date(d).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—');
  const formatAmount = (n) => (n != null ? Number(n).toFixed(2) : '—');
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

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard/orders')}
            className="text-[#0A3C5A] hover:underline text-sm font-medium"
          >
            ← Orders
          </button>
          <h2 className="text-storelaunch-dark font-bold text-xl">Order #{order.order_id}</h2>
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
              <dd className="font-medium">{order.order_id}</dd>
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
              <dd className="font-semibold">{formatAmount(order.total_amount)}</dd>
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
                <dd>{order.shipping_address || order.shipping_name || '—'}</dd>
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
                      <p className="text-sm text-gray-600 mt-1">
                        Qty: {item.quantity} × {formatAmount(item.price)} = {formatAmount(item.subtotal)}
                      </p>
                    </div>
                    <div className="text-right font-medium text-gray-900">{formatAmount(item.subtotal)}</div>
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
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={updating}
                  className="w-full mt-2 py-2 px-4 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50"
                >
                  Cancel order
                </button>
              </>
            ) : (
              <p className="text-sm text-gray-500">This order is cancelled. Status cannot be changed.</p>
            )}
          </div>

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

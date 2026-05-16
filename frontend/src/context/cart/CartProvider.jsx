






import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../api/axios';
import CartContext from './CartContext';

const CART_STORAGE_KEY = 'storelaunch_guest_cart';

const defaultTotals = { items: 0, grand: 0 };
const computeTotals = (cartItems = []) => cartItems.reduce(
  (acc, it) => {
    acc.items += it.quantity || 0;
    acc.grand += (it.subtotal ?? (it.unitPrice || 0) * (it.quantity || 0));
    return acc;
  },
  { items: 0, grand: 0 }
);

function loadGuestCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return { items: [], totals: defaultTotals };
    const data = JSON.parse(raw);
    const items = Array.isArray(data?.items) ? data.items : [];
    const totals = data?.totals && typeof data.totals === 'object'
      ? { items: Number(data.totals.items) || 0, grand: Number(data.totals.grand) || 0 }
      : items.reduce((acc, it) => {
          acc.items += it.quantity || 0;
          acc.grand += (it.subtotal ?? (it.unitPrice || 0) * (it.quantity || 0));
          return acc;
        }, { items: 0, grand: 0 });
    return { items, totals };
  } catch (_) {
    return { items: [], totals: defaultTotals };
  }
}

function saveGuestCart(items, totals) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ items: items || [], totals: totals || defaultTotals }));
  } catch (_) {}
}

async function fetchAvailableStockForItem({ productId, variantId }) {
  const pid = Number(productId);
  if (!Number.isFinite(pid) || pid <= 0) return 0;
  try {
    const { data } = await api.get(`/api/products/${pid}`);
    const product = data?.product;
    if (!product) return 0;
    const options = Array.isArray(product.options) ? product.options : [];
    if (variantId != null) {
      const vid = Number(variantId);
      const variant = options.find((opt) => Number(opt.option_id) === vid);
      return Math.max(0, Number(variant?.stock_qty || 0));
    }
    if (options.length > 0) {
      return options.reduce((sum, opt) => sum + Math.max(0, Number(opt.stock_qty || 0)), 0);
    }
    if (product.total_stock != null) return Math.max(0, Number(product.total_stock));
    return 999999;
  } catch (_) {
    return null;
  }
}

export default function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [totals, setTotals] = useState(defaultTotals);
  const [warnings, setWarnings] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const updateDebounceRefs = useRef({});

  const isLoggedIn = typeof localStorage !== 'undefined' && !!localStorage.getItem('customer_token');

  const fetchCart = useCallback(async () => {
    if (!isLoggedIn) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/api/cart/revalidate');
      setItems(data.items || []);
      setTotals(data.totals || defaultTotals);
      setWarnings(Array.isArray(data.warnings) ? data.warnings : []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load cart');
      setItems([]);
      setTotals(defaultTotals);
      setWarnings([]);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) {
      const guest = loadGuestCart();
      if (guest.items.length > 0) {
        api.post('/api/cart/merge', { items: guest.items })
          .then(({ data }) => {
            setItems(data.items || []);
            setTotals(data.totals || defaultTotals);
            setWarnings(Array.isArray(data.warnings) ? data.warnings : []);
            localStorage.removeItem(CART_STORAGE_KEY);
          })
          .catch(() => fetchCart());
      } else {
        fetchCart();
      }
    } else {
      const { items: gi, totals: gt } = loadGuestCart();
      setItems(gi);
      setTotals(gt);
      setWarnings([]);
    }
  }, [isLoggedIn, fetchCart]);

  const addItem = useCallback(async (payload) => {
    const { productId, variantId, quantity = 1, title, image, options, unitPrice } = payload;
    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    const key = variantId ? `${productId}_${variantId}` : String(productId);
    const subtotal = (unitPrice ?? 0) * qty;
    const newItem = {
      key,
      productId: parseInt(productId, 10),
      title: title || '',
      image: image || null,
      variantId: variantId ? parseInt(variantId, 10) : null,
      options: options || null,
      unitPrice: unitPrice ?? 0,
      quantity: qty,
      subtotal,
    };

    if (isLoggedIn) {
      setLoading(true);
      setError(null);
      console.groupCollapsed && console.groupCollapsed('ADD_TO_CART');
      try {
        const payloadBody = {
          productId: Number(productId),
          variantId: variantId != null ? Number(variantId) : undefined,
          quantity: qty,
          title: newItem.title,
          image: newItem.image,
          options: newItem.options,
          unitPrice: newItem.unitPrice,
        };
        console.log && console.log('Request', {
          method: 'POST',
          url: '/api/cart/add',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('customer_token') || ''}`,
            'Content-Type': 'application/json',
          },
          payload: {
            productId: payloadBody.productId,
            variantId: payloadBody.variantId,
            quantity: payloadBody.quantity,
          },
        });
        const response = await api.post('/api/cart/add', payloadBody);
        console.log && console.log('Response', { status: 200, data: response.data });
        const { data } = response;
        setItems(data.items || []);
        setTotals(data.totals || defaultTotals);
        setWarnings(Array.isArray(data.warnings) ? data.warnings : []);
        setDrawerOpen(true);
      } catch (err) {
        if (console.log) {
          console.log('Error status', err.response?.status);
          console.log('Error data', err.response?.data);
        }
        if (err.response?.status === 409 && err.response?.data?.error === 'OUT_OF_STOCK') {
          throw err;
        }
        const status = err.response?.status;
        const code = err.response?.data?.error;
        let userMsg;
        if (!err.response) {
          userMsg = 'تعذر الاتصال بالخادم. حاول مرة أخرى.';
        } else if (status === 409 && code === 'OUT_OF_STOCK') {
          const available = err.response.data.available;
          userMsg = `الكمية غير متوفرة. المتاح الآن: ${available}`;
        } else if (status === 400 && code === 'INVALID_VARIANT') {
          userMsg = 'خيار المنتج غير صالح. يرجى اختيار صنف صحيح.';
        } else if (status === 400 && code === 'INVALID_PRODUCT') {
          userMsg = 'هذا المنتج لم يعد متاحاً.';
        } else if (status === 400 && code === 'INVALID_PAYLOAD') {
          userMsg = 'طلب غير صالح. يرجى تحديث الصفحة والمحاولة مرة أخرى.';
        } else if (status === 401 || status === 403) {
          userMsg = 'الرجاء تسجيل الدخول لإضافة المنتجات إلى السلة.';
        } else {
          userMsg = code || `HTTP ${status}`;
        }
        setError(userMsg);
        throw err;
      } finally {
        console.groupEnd && console.groupEnd();
        setLoading(false);
      }
    } else {
      const available = await fetchAvailableStockForItem({ productId, variantId: variantId ?? null });
      setItems((prevItems) => {
        const next = [...prevItems];
        const idx = next.findIndex((i) => i.key === key);
        if (idx >= 0) {
          const requestedQty = (next[idx].quantity || 0) + qty;
          next[idx].quantity = available == null ? requestedQty : Math.min(requestedQty, available);
          next[idx].subtotal = (next[idx].unitPrice || 0) * next[idx].quantity;
        } else {
          const initialQty = available == null ? qty : Math.min(qty, available);
          if (initialQty <= 0) return prevItems;
          next.push({ ...newItem, quantity: initialQty, subtotal: (newItem.unitPrice || 0) * initialQty });
        }
        const newTotals = computeTotals(next);
        setTotals(newTotals);
        saveGuestCart(next, newTotals);
        return next;
      });
      setDrawerOpen(true);
    }
  }, [isLoggedIn]);

  const applyOptimisticUpdate = useCallback((key, qty) => {
    setItems((prevItems) => {
      let next;
      if (qty === 0) {
        next = prevItems.filter((i) => i.key !== key);
      } else {
        const idx = prevItems.findIndex((i) => i.key === key);
        if (idx < 0) return prevItems;
        next = [...prevItems];
        next[idx] = { ...next[idx], quantity: qty, subtotal: (next[idx].unitPrice || 0) * qty };
      }
      const newTotals = computeTotals(next);
      setTotals(newTotals);
      if (!isLoggedIn) saveGuestCart(next, newTotals);
      return next;
    });
  }, [isLoggedIn]);

  const updateItem = useCallback((key, quantity) => {
    const qty = Math.max(0, parseInt(quantity, 10) || 0);

    // Apply change to UI immediately
    applyOptimisticUpdate(key, qty);

    if (!isLoggedIn) {
      return (async () => {
        const current = items.find((i) => i.key === key);
        if (!current || qty === 0) return;
        const available = await fetchAvailableStockForItem({
          productId: current.productId,
          variantId: current.variantId ?? null,
        });
        if (available == null) return;
        if (qty > available) {
          applyOptimisticUpdate(key, available);
          setError(`الكمية غير متوفرة. المتاح الآن: ${available}`);
        }
      })();
    }

    // Debounce the server call — cancel any in-flight timer for this key
    if (updateDebounceRefs.current[key]) {
      clearTimeout(updateDebounceRefs.current[key]);
    }
    updateDebounceRefs.current[key] = setTimeout(async () => {
      delete updateDebounceRefs.current[key];
      setError(null);
      try {
        const { data } = await api.put('/api/cart/update', { key, quantity: qty });
        setItems(data.items || []);
        setTotals(data.totals || defaultTotals);
        setWarnings(Array.isArray(data.warnings) ? data.warnings : []);
      } catch (err) {
        if (err.response?.status === 409 && typeof err.response?.data?.available === 'number') {
          const available = err.response.data.available;
          applyOptimisticUpdate(key, available);
          try {
            const { data } = await api.put('/api/cart/update', { key, quantity: available });
            setItems(data.items || []);
            setTotals(data.totals || defaultTotals);
            setWarnings(Array.isArray(data.warnings) ? data.warnings : []);
          } catch (_) {}
          setError(`الكمية غير متوفرة. المتاح الآن: ${available}`);
          return;
        }
        const status = err.response?.status;
        const code = err.response?.data?.error;
        let userMsg;
        if (!err.response) {
          userMsg = 'تعذر الاتصال بالخادم. حاول مرة أخرى.';
        } else if (status === 401 || status === 403) {
          userMsg = 'الرجاء تسجيل الدخول لإدارة السلة.';
        } else if (status === 404 && code === 'ITEM_NOT_FOUND') {
          userMsg = 'عنصر السلة غير موجود.';
        } else if (status === 400 && code === 'INVALID_PAYLOAD') {
          userMsg = 'طلب غير صالح. يرجى تحديث الصفحة.';
        } else {
          userMsg = code || `HTTP ${status}`;
        }
        setError(userMsg);
      }
    }, 400);
    return Promise.resolve();
  }, [isLoggedIn, applyOptimisticUpdate, items]);

  const removeItem = useCallback(async (key) => {
    if (isLoggedIn) {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.delete(`/api/cart/remove/${encodeURIComponent(key)}`);
        setItems(data.items || []);
        setTotals(data.totals || defaultTotals);
        setWarnings(Array.isArray(data.warnings) ? data.warnings : []);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to remove');
      } finally {
        setLoading(false);
      }
    } else {
      setItems((prevItems) => {
        const next = prevItems.filter((i) => i.key !== key);
        const newTotals = computeTotals(next);
        setTotals(newTotals);
        saveGuestCart(next, newTotals);
        return next;
      });
    }
  }, [isLoggedIn]);

  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
    if (isLoggedIn) fetchCart();
  }, [fetchCart, isLoggedIn]);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const revalidateCart = useCallback(async () => {
    await fetchCart();
  }, [fetchCart]);
  const clearCartError = useCallback(() => setError(null), []);
  const clearCart = useCallback(async () => {
    if (isLoggedIn) {
      setLoading(true);
      setError(null);
      try {
        await api.post('/api/cart/clear');
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to clear cart');
        throw err;
      } finally {
        setItems([]);
        setTotals(defaultTotals);
        setWarnings([]);
        setLoading(false);
      }
      return;
    }

    setItems([]);
    setTotals(defaultTotals);
    setWarnings([]);
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
    } catch (_) {}
  }, [isLoggedIn]);

  const value = {
    items,
    totals,
    drawerOpen,
    openDrawer,
    closeDrawer,
    revalidateCart,
    addItem,
    updateItem,
    removeItem,
    loading,
    error,
    clearCartError,
    clearCart,
    warnings,
    isLoggedIn,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

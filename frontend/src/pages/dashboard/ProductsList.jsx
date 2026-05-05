





import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../api/axios';
import CurrencyAmount from '../../components/common/CurrencyAmount';

const colWidths = {
  productName: 'min-w-[140px] w-[22%]',
  title: 'min-w-[120px] w-[18%]',
  price: 'min-w-[80px] w-[12%]',
  stock: 'min-w-[70px] w-[10%]',
  status: 'min-w-[80px] w-[12%]',
  actions: 'min-w-[120px] w-[26%]',
};

const theadThClass = 'px-4 py-3 text-xs font-medium text-white uppercase tracking-wider';
const tdClass = 'px-4 py-3 text-sm text-gray-900';

const ProductsList = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadProducts = async () => {
    try {
      setError(null);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterStatus) params.set('status', filterStatus);
      if (stockStatus) params.set('stock_status', stockStatus);
      if (minPrice !== '') params.set('min_price', minPrice);
      if (maxPrice !== '') params.set('max_price', maxPrice);
      if (createdFrom) params.set('created_from', createdFrom);
      if (createdTo) params.set('created_to', createdTo);
      if (sortBy) params.set('sort', sortBy);
      const { data } = await axiosInstance.get(`/api/store/products?${params.toString()}`);
      setProducts(data.products || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || t('dashboard.productsPage.loadError'));
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [filterStatus, stockStatus, sortBy, minPrice, maxPrice, createdFrom, createdTo]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadProducts();
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(t('dashboard.productsPage.deleteConfirm', { name }))) return;
    setDeletingId(id);
    try {
      await axiosInstance.delete(`/api/store/products/${id}`);
      setProducts((prev) => prev.filter((p) => p.product_id !== id));
    } catch (err) {
      setError(err.response?.data?.error || t('dashboard.productsPage.deleteError'));
    } finally {
      setDeletingId(null);
    }
  };

  const textStart = isRTL ? 'text-right' : 'text-left';
  const textEnd = isRTL ? 'text-left' : 'text-right';
  const activeFilterCount = [
    filterStatus,
    stockStatus,
    sortBy,
    minPrice,
    maxPrice,
    createdFrom,
    createdTo,
  ].filter(Boolean).length;
  const clearFilters = () => {
    setFilterStatus('');
    setStockStatus('');
    setSortBy('');
    setMinPrice('');
    setMaxPrice('');
    setCreatedFrom('');
    setCreatedTo('');
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="max-w-full overflow-x-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h2 className="text-storelaunch-dark font-bold text-lg sm:text-xl">{t('dashboard.productsPage.title')}</h2>
        <button
          type="button"
          onClick={() => navigate('/dashboard/products/new')}
          className="w-full sm:w-auto min-h-11 px-4 py-2.5 bg-storelaunch-green text-white rounded-md text-sm font-medium hover:bg-storelaunch-deep-green"
        >
          {t('dashboard.productsPage.addProduct')}
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 mb-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
          <div className="w-full sm:flex-1 sm:min-w-[200px]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('dashboard.productsPage.searchPlaceholder')}
              className="w-full min-h-11 border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className={`min-h-11 px-4 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                filtersOpen || activeFilterCount > 0
                  ? 'border border-storelaunch-green bg-storelaunch-green/10 text-storelaunch-dark'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t('dashboard.productsPage.filters')}
              {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="min-h-11 border border-gray-300 rounded-lg px-3 py-2.5 text-sm min-w-[120px]"
            >
              <option value="">{t('dashboard.productsPage.sortDefault')}</option>
              <option value="name_asc">{t('dashboard.productsPage.sortNameAsc')}</option>
              <option value="name_desc">{t('dashboard.productsPage.sortNameDesc')}</option>
              <option value="price_asc">{t('dashboard.productsPage.sortPriceLow')}</option>
              <option value="price_desc">{t('dashboard.productsPage.sortPriceHigh')}</option>
            </select>
            <button type="submit" className="min-h-11 px-4 py-2.5 bg-storelaunch-dark text-white rounded-lg text-sm font-medium hover:bg-storelaunch-teal">
              {t('dashboard.productsPage.searchButton')}
            </button>
          </div>
        </form>
        {filtersOpen && (
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setFilterStatus('')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border ${filterStatus === '' ? 'bg-storelaunch-dark text-white border-storelaunch-dark' : 'bg-white text-gray-700 border-gray-300'}`}
              >
                {t('dashboard.productsPage.all')}
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('Active')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border ${filterStatus === 'Active' ? 'bg-storelaunch-green text-white border-storelaunch-green' : 'bg-white text-gray-700 border-gray-300'}`}
              >
                {t('dashboard.productsPage.active')}
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('Inactive')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border ${filterStatus === 'Inactive' ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-700 border-gray-300'}`}
              >
                {t('dashboard.productsPage.inactive')}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('dashboard.productsPage.stockStatus')}</label>
                <select
                  value={stockStatus}
                  onChange={(e) => setStockStatus(e.target.value)}
                  className="w-full min-h-11 border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                >
                  <option value="">{t('dashboard.productsPage.all')}</option>
                  <option value="in_stock">{t('dashboard.productsPage.inStock')}</option>
                  <option value="low_stock">{t('dashboard.productsPage.lowStock')}</option>
                  <option value="out_of_stock">{t('dashboard.productsPage.outOfStock')}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('dashboard.productsPage.minPrice')}</label>
                <input type="number" min="0" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="w-full min-h-11 border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('dashboard.productsPage.maxPrice')}</label>
                <input type="number" min="0" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="w-full min-h-11 border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
              </div>
              <div className="flex items-end">
                <button type="button" onClick={clearFilters} className="w-full min-h-11 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                  {t('dashboard.productsPage.clearFilters')}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('dashboard.productsPage.createdFrom')}</label>
                <input type="date" value={createdFrom} onChange={(e) => setCreatedFrom(e.target.value)} className="w-full min-h-11 border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('dashboard.productsPage.createdTo')}</label>
                <input type="date" value={createdTo} onChange={(e) => setCreatedTo(e.target.value)} className="w-full min-h-11 border border-gray-300 rounded-lg px-3 py-2.5 text-sm" />
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">{t('dashboard.productsPage.loading')}</div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-gray-500">{t('dashboard.productsPage.noProducts')}</div>
        ) : (
          <>
            <div className="lg:hidden divide-y divide-gray-100">
              {products.map((p) => (
                <div key={p.product_id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{p.product_name}</p>
                      <p className="text-sm text-gray-600 truncate">{p.title || '—'}</p>
                    </div>
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full shrink-0 ${
                        p.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {p.status === 'Active' ? t('dashboard.productsPage.active') : t('dashboard.productsPage.inactive')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <p className="text-xs text-gray-500">{t('dashboard.productsPage.colPrice')}</p>
                      <p className="font-medium text-gray-900">
                        {p.price != null ? <CurrencyAmount value={p.price} isRTL={isRTL} size="sm" /> : '—'}
                      </p>
                    </div>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <p className="text-xs text-gray-500">{t('dashboard.productsPage.colStock')}</p>
                      <p className="font-medium text-gray-900">{p.total_stock != null ? p.total_stock : '—'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/dashboard/products/${p.product_id}/edit`)}
                      className="w-full min-h-11 px-3 py-2.5 text-sm font-medium text-storelaunch-teal border border-storelaunch-teal/40 rounded-lg"
                    >
                      {t('dashboard.productsPage.edit')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.product_id, p.product_name)}
                      disabled={deletingId === p.product_id}
                      className="w-full min-h-11 px-3 py-2.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg disabled:opacity-50"
                    >
                      {deletingId === p.product_id ? t('dashboard.productsPage.deleting') : t('dashboard.productsPage.delete')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 table-fixed">
              <thead className="bg-[#0A3C5A]">
                <tr>
                  <th className={`${theadThClass} ${colWidths.productName} ${textStart}`}>{t('dashboard.productsPage.colProductName')}</th>
                  <th className={`${theadThClass} ${colWidths.title} ${textStart}`}>{t('dashboard.productsPage.colTitle')}</th>
                  <th className={`${theadThClass} ${colWidths.price} ${textEnd}`}>{t('dashboard.productsPage.colPrice')}</th>
                  <th className={`${theadThClass} ${colWidths.stock} ${textEnd}`}>{t('dashboard.productsPage.colStock')}</th>
                  <th className={`${theadThClass} ${colWidths.status} ${textStart}`}>{t('dashboard.productsPage.colStatus')}</th>
                  <th className={`${theadThClass} ${colWidths.actions} ${textEnd}`}>{t('dashboard.productsPage.colActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {products.map((p) => (
                  <tr key={p.product_id} className="hover:bg-gray-50">
                    <td className={`${tdClass} ${colWidths.productName} ${textStart}`}>{p.product_name}</td>
                    <td className={`${tdClass} ${colWidths.title} ${textStart} text-gray-600`}>{p.title || '—'}</td>
                    <td className={`${tdClass} ${colWidths.price} ${textEnd}`}>
                      {p.price != null ? <CurrencyAmount value={p.price} isRTL={isRTL} size="sm" /> : '—'}
                    </td>
                    <td className={`${tdClass} ${colWidths.stock} ${textEnd}`}>{p.total_stock != null ? p.total_stock : '—'}</td>
                    <td className={`px-4 py-3 ${colWidths.status} ${textStart}`}>
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                          p.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {p.status === 'Active' ? t('dashboard.productsPage.active') : t('dashboard.productsPage.inactive')}
                      </span>
                    </td>
                    <td className={`px-4 py-3 ${colWidths.actions} ${textEnd}`}>
                      <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse justify-end' : 'justify-end'}`}>
                        <button
                          type="button"
                          onClick={() => navigate(`/dashboard/products/${p.product_id}/edit`)}
                          className="text-storelaunch-teal hover:underline text-sm"
                        >
                          {t('dashboard.productsPage.edit')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.product_id, p.product_name)}
                          disabled={deletingId === p.product_id}
                          className="text-red-600 hover:underline text-sm disabled:opacity-50"
                        >
                          {deletingId === p.product_id ? t('dashboard.productsPage.deleting') : t('dashboard.productsPage.delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProductsList;

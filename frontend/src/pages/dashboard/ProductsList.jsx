

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axiosInstance from '../../api/axios';

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
  const [sortBy, setSortBy] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadProducts = async () => {
    try {
      setError(null);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterStatus) params.set('status', filterStatus);
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
  }, [filterStatus, sortBy]);

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

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h2 className="text-storelaunch-dark font-bold text-xl">{t('dashboard.productsPage.title')}</h2>
        <button
          type="button"
          onClick={() => navigate('/dashboard/products/new')}
          className="px-4 py-2 bg-storelaunch-green text-white rounded-md text-sm font-medium hover:bg-storelaunch-deep-green"
        >
          {t('dashboard.productsPage.addProduct')}
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('dashboard.productsPage.searchPlaceholder')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              {t('dashboard.productsPage.filters')}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[120px]"
            >
              <option value="">{t('dashboard.productsPage.sortDefault')}</option>
              <option value="name_asc">{t('dashboard.productsPage.sortNameAsc')}</option>
              <option value="name_desc">{t('dashboard.productsPage.sortNameDesc')}</option>
              <option value="price_asc">{t('dashboard.productsPage.sortPriceLow')}</option>
              <option value="price_desc">{t('dashboard.productsPage.sortPriceHigh')}</option>
            </select>
            <button type="submit" className="px-4 py-2 bg-storelaunch-dark text-white rounded-lg text-sm font-medium hover:bg-storelaunch-teal">
              {t('dashboard.productsPage.searchButton')}
            </button>
          </div>
        </form>
        {filtersOpen && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('dashboard.productsPage.status')}</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[120px]"
            >
              <option value="">{t('dashboard.productsPage.all')}</option>
              <option value="Active">{t('dashboard.productsPage.active')}</option>
              <option value="Inactive">{t('dashboard.productsPage.inactive')}</option>
            </select>
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
          <div className="overflow-x-auto">
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
                    <td className={`${tdClass} ${colWidths.price} ${textEnd}`}>{p.price != null ? Number(p.price).toFixed(2) : '—'}</td>
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
        )}
      </div>
    </div>
  );
};

export default ProductsList;

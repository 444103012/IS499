import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import './StoreView.css';

function StoreView() {
  const { storeSlug } = useParams();
  const { t } = useLanguage();
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if this is a known route that shouldn't be treated as a store
    const knownRoutes = ['register', 'login', 'welcome'];
    if (knownRoutes.includes(storeSlug)) {
      setError('Invalid store');
      setLoading(false);
      return;
    }
    
    // TODO: Replace with actual API call
    // For now, using mock data
    fetchStoreData();
  }, [storeSlug]);

  const fetchStoreData = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API endpoint
      // const response = await fetch(`/api/stores/public/${storeSlug}`);
      // const data = await response.json();
      
      // Mock data for now
      setTimeout(() => {
        setStore({
          name: storeSlug,
          domain_name: storeSlug,
          status: 'Active'
        });
        setProducts([
          { product_id: 1, product_name: 'Sample Product 1', title: 'Product Title 1', price: 99.99 },
          { product_id: 2, product_name: 'Sample Product 2', title: 'Product Title 2', price: 149.99 },
        ]);
        setLoading(false);
      }, 500);
    } catch (err) {
      setError('Store not found');
      setLoading(false);
    }
  };

  const handleAddToCart = (product) => {
    // TODO: Implement add to cart logic
    // This should check if user is logged in, if not, redirect to login
    // For now, just show an alert
    alert(t('storeView.loginRequired'));
  };

  if (loading) {
    return (
      <div className="store-view">
        <div className="store-loading">
          <div className="loading-spinner"></div>
          <p>{t('storeView.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="store-view">
        <div className="store-error">
          <h2>{t('storeView.notFound')}</h2>
          <p>{t('storeView.notFoundDesc')}</p>
          <Link to="/" className="back-home-btn">{t('storeView.backHome')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="store-view">
      <header className="store-header">
        <div className="store-header-inner">
          <h1 className="store-name">{store.name}</h1>
          <div className="store-header-actions">
            <Link to="/login" className="store-login-btn">
              {t('storeView.login')}
            </Link>
          </div>
        </div>
      </header>

      <main className="store-main">
        <div className="store-content">
          <div className="products-section">
            <h2 className="products-title">{t('storeView.products')}</h2>
            <div className="products-grid">
              {products.length === 0 ? (
                <p className="no-products">{t('storeView.noProducts')}</p>
              ) : (
                products.map((product) => (
                  <div key={product.product_id} className="product-card">
                    <div className="product-info">
                      <h3 className="product-name">{product.product_name}</h3>
                      <p className="product-title">{product.title}</p>
                      <p className="product-price">{product.price} {t('storeView.currency')}</p>
                    </div>
                    <button className="add-to-cart-btn" onClick={() => handleAddToCart(product)}>
                      {t('storeView.addToCart')}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default StoreView;

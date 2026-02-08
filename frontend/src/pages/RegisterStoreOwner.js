import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import './RegisterStoreOwner.css';

const API_BASE = '';

function RegisterStoreOwner() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    storeName: '',
    phone: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/register/store-owner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      
      let data;
      try {
        data = await res.json();
      } catch (parseErr) {
        setError(`Server error (${res.status}). Make sure backend is running on port 5000.`);
        setSubmitting(false);
        return;
      }
      
      if (!res.ok) {
        setError(data.error || `Registration failed (${res.status})`);
        setSubmitting(false);
        return;
      }
      navigate('/welcome');
    } catch (err) {
      console.error('Registration error:', err);
      setError(`Network error: ${err.message}. Make sure backend is running on http://localhost:5000`);
      setSubmitting(false);
    }
  };

  return (
    <main className="register-page" role="main">
      <div className="register-inner">
        <Link to="/" className="register-back">
          <BackIcon /> {t('common.back')}
        </Link>

        <header className="register-header">
          <h1 className="register-title">{t('registerOwner.title')}</h1>
          <p className="register-subtitle">{t('registerOwner.subtitle')}</p>
        </header>

        {error && <p className="register-error" role="alert">{error}</p>}
        <form className="register-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">{t('registerOwner.firstName')}</label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                placeholder={t('registerOwner.firstNamePlaceholder')}
                value={form.firstName}
                onChange={handleChange}
                required
                autoComplete="given-name"
              />
            </div>
            <div className="form-group">
              <label htmlFor="lastName">{t('registerOwner.lastName')}</label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                placeholder={t('registerOwner.lastNamePlaceholder')}
                value={form.lastName}
                onChange={handleChange}
                required
                autoComplete="family-name"
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="email">{t('registerOwner.email')}</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder={t('registerOwner.emailPlaceholder')}
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">{t('registerOwner.password')}</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder={t('registerOwner.passwordPlaceholder')}
              value={form.password}
              onChange={handleChange}
              required
              autoComplete="new-password"
            />
          </div>
          <div className="form-group">
            <label htmlFor="storeName">{t('registerOwner.storeName')}</label>
            <input
              id="storeName"
              name="storeName"
              type="text"
              placeholder={t('registerOwner.storeNamePlaceholder')}
              value={form.storeName}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="phone">{t('registerOwner.phone')}</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              placeholder={t('registerOwner.phonePlaceholder')}
              value={form.phone}
              onChange={handleChange}
              autoComplete="tel"
            />
          </div>
          <button type="submit" className="register-submit" disabled={submitting}>
            {submitting ? '...' : t('registerOwner.submit')}
          </button>

          <p className="register-login-prompt">
            {t('common.loginPrompt')} <Link to="/login">{t('common.logIn')}</Link>
          </p>
        </form>
      </div>
    </main>
  );
}

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

export default RegisterStoreOwner;

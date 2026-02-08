import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import './RegisterCustomer.css';
import './Login.css';

function Login() {
  const { t } = useLanguage();
  const [form, setForm] = useState({ email: '', password: '' });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: connect to backend login API
    console.log('Login', form);
  };

  return (
    <main className="register-page login-page" role="main">
      <div className="register-inner">
        <Link to="/" className="register-back">
          <BackIcon /> {t('common.back')}
        </Link>

        <header className="register-header">
          <h1 className="register-title">{t('login.title')}</h1>
          <p className="register-subtitle">{t('login.subtitle')}</p>
        </header>

        <form className="register-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">{t('login.email')}</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder={t('login.emailPlaceholder')}
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">{t('login.password')}</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder={t('login.passwordPlaceholder')}
              value={form.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="register-submit">
            {t('login.submit')}
          </button>
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

export default Login;

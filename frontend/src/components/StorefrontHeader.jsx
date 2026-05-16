







import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useLocation } from '../router';
import { useTranslation } from 'react-i18next';
import useDocumentLanguage, { normalizeLanguage } from '../hooks/useDocumentLanguage';
import { useCart } from '../context/cart/CartContext';
import { buildStorefrontPath } from '../utils/storefrontRoutes';
import axiosInstance from '../api/axios';
import useMediaQuery from '../hooks/useMediaQuery';
import StorefrontSearchBar from './storefront/StorefrontSearchBar';
import StorefrontFilters from './storefront/StorefrontFilters';
import { darkenHex } from '../hooks/useStoreBranding';

const MobileHeaderActions = ({
  cartCount,
  onCartClick,
  onMenuToggle,
  showCart = true,
  iconColor = '#111827',
  iconHoverBg = 'rgba(0,0,0,0.06)',
  focusRingColor = '#1FAE77',
  topBarColor = '#FFFFFF',
  badgeColor = '#1FAE77',
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = normalizeLanguage(i18n.language) === 'ar';

  return (
  <div className={`lg:hidden flex items-center gap-0.5 shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
    {showCart ? (
      <button
        type="button"
        onClick={onCartClick}
        className="storefront-mobile-icon-btn relative h-11 w-11 inline-flex items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        style={{ color: iconColor }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = iconHoverBg; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        onFocus={(e) => { e.currentTarget.style.boxShadow = `0 0 0 2px ${topBarColor}, 0 0 0 4px ${focusRingColor}`; }}
        onBlur={(e) => { e.currentTarget.style.boxShadow = ''; }}
        aria-label={t('storefront.header.cart')}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        {cartCount > 0 && (
          <span
            className="cart-badge"
            style={{ border: `2px solid ${topBarColor}`, backgroundColor: badgeColor }}
          >
            {cartCount > 99 ? '99+' : cartCount}
          </span>
        )}
      </button>
    ) : null}
    <button
      type="button"
      onClick={onMenuToggle}
      className="storefront-mobile-icon-btn h-11 w-11 inline-flex items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      style={{ color: iconColor }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = iconHoverBg; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
      onFocus={(e) => { e.currentTarget.style.boxShadow = `0 0 0 2px ${topBarColor}, 0 0 0 4px ${focusRingColor}`; }}
      onBlur={(e) => { e.currentTarget.style.boxShadow = ''; }}
      aria-label={t('storefront.header.openMenu')}
      aria-expanded="false"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  </div>
  );
};

const LanguageToggleButton = ({
  onToggleLanguage,
  className = '',
  buttonColor = '#1FAE77',
  buttonTextColor = '#FFFFFF',
}) => {
  const { t, i18n } = useTranslation();
  const isArabic = normalizeLanguage(i18n.language) === 'ar';
  const hoverColor = darkenHex(buttonColor);
  return (
    <button
      type="button"
      onClick={onToggleLanguage}
      aria-label={isArabic ? t('storefront.header.switchToEnglishAria') : t('storefront.header.switchToArabicAria')}
      className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${className}`}
      style={{
        backgroundColor: buttonColor,
        color: buttonTextColor,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = hoverColor;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = buttonColor;
      }}
      onFocus={(e) => {
        e.currentTarget.style.boxShadow = `0 0 0 2px #fff, 0 0 0 4px ${buttonColor}`;
      }}
      onBlur={(e) => {
        e.currentTarget.style.boxShadow = '';
      }}
    >
      {isArabic ? t('nav.english') : t('nav.arabic')}
    </button>
  );
};

const MobileDrawerContent = ({
  isCustomerLoggedIn,
  onOpenSearch,
  onOpenFilters,
  onToggleLanguage,
  settingsHref,
  ordersHref,
  loginHref,
  registerHref,
  onLogout,
  onClose,
  showCatalogControls = true,
  hideAccount = false,
  buttonColor = '#1FAE77',
  buttonTextColor = '#FFFFFF',
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = normalizeLanguage(i18n.language) === 'ar';

  return (
  <div className={`h-full flex flex-col ${isRTL ? 'text-right' : 'text-left'}`}>
    <div className={`flex items-center justify-between px-4 py-3 border-b border-gray-100 gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
      <h2 className="text-base font-semibold text-gray-900">{t('storefront.header.menu')}</h2>
      <button
        type="button"
        onClick={onClose}
        className="h-10 w-10 inline-flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-storelaunch-green"
        aria-label={t('storefront.header.closeMenu')}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <div className="px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-6 overflow-y-auto">
      {showCatalogControls ? (
        <section>
          <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">{t('storefront.header.quickActions')}</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onOpenSearch}
              className="min-h-11 px-3 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 inline-flex items-center justify-center gap-2 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-storelaunch-green"
              aria-label={t('storefront.header.openSearch')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {t('storefront.header.search')}
            </button>
            <button
              type="button"
              onClick={onOpenFilters}
              className="min-h-11 px-3 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 inline-flex items-center justify-center gap-2 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-storelaunch-green"
              aria-label={t('storefront.header.openFilters')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 01.8 1.6L14 13.5V19a1 1 0 01-1.447.894l-2-1A1 1 0 0110 18v-4.5L3.2 4.6A1 1 0 013 4z" />
              </svg>
              {t('storefront.filters')}
            </button>
          </div>
        </section>
      ) : null}

      <section>
        <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">{t('storefront.header.language')}</p>
        <LanguageToggleButton
          onToggleLanguage={onToggleLanguage}
          className="min-h-11 w-full"
          buttonColor={buttonColor}
          buttonTextColor={buttonTextColor}
        />
      </section>

      {!hideAccount ? (
        <section>
          <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">{t('storefront.header.account')}</p>
          <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
            {isCustomerLoggedIn ? (
              <>
                <Link
                  to={settingsHref}
                  onClick={onClose}
                  className={`min-h-12 px-4 py-3 text-sm text-gray-700 inline-flex items-center gap-2 hover:bg-gray-50 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}
                >
                  {t('storefront.header.settings')}
                </Link>
                <Link
                  to={ordersHref}
                  onClick={onClose}
                  className={`min-h-12 px-4 py-3 text-sm text-gray-700 inline-flex items-center gap-2 hover:bg-gray-50 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}
                >
                  {t('storefront.header.orderHistory')}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onLogout();
                  }}
                  className={`w-full min-h-12 px-4 py-3 text-sm text-red-600 inline-flex items-center gap-2 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}
                >
                  {t('storefront.header.logout')}
                </button>
              </>
            ) : (
              <>
                <Link
                  to={loginHref}
                  onClick={onClose}
                  className={`min-h-12 px-4 py-3 text-sm text-gray-700 inline-flex items-center gap-2 hover:bg-gray-50 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}
                >
                  {t('nav.login')}
                </Link>
                <Link
                  to={registerHref}
                  onClick={onClose}
                  className={`min-h-12 px-4 py-3 text-sm text-gray-700 inline-flex items-center gap-2 hover:bg-gray-50 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}
                >
                  {t('nav.getStarted')}
                </Link>
              </>
            )}
          </div>
        </section>
      ) : null}
    </div>
  </div>
  );
};

const StorefrontHeader = ({
  storeSlug,
  storeInfo,
  branding,
  searchValue,
  onSearchChange,
  onSearchClear,
  categories,
  draftFilters,
  onDraftFilterChange,
  onApplyFilters,
  onResetFilters,
  hasActiveFilters,
  previewMode = false,
}) => {
  const { t } = useTranslation();
  const { isRTL, toggleLanguage } = useDocumentLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [headerStore, setHeaderStore] = useState(storeInfo || null);
  const userMenuRef = useRef(null);
  const filterMenuRef = useRef(null);
  const isRTL = i18n.language === 'ar';
  const { totals } = useCart();
  const cartCount = totals?.items ?? 0;
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const safeBranding = branding && typeof branding === 'object' ? branding : {};
  const topBarColor = safeBranding.topBar || '#FFFFFF';
  const topBarTextColor = safeBranding.isDarkTopBar ? '#FFFFFF' : '#111827';
  const buttonColor = safeBranding.buttons || '#1FAE77';
  const buttonTextColor = safeBranding.buttonText || '#FFFFFF';
  const iconHoverBg = safeBranding.isDarkTopBar ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)';
  const filterHoverColor = darkenHex(buttonColor);
  const supportsCatalogControls = Boolean(
    typeof onSearchChange === 'function' &&
    typeof onSearchClear === 'function' &&
    typeof onDraftFilterChange === 'function' &&
    typeof onApplyFilters === 'function' &&
    typeof onResetFilters === 'function'
  );
  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeDraftFilters = draftFilters && typeof draftFilters === 'object'
    ? draftFilters
    : {
        search: '',
        category: '',
        minPrice: '',
        maxPrice: '',
        sort: 'newest',
        availability: '',
        pricePreset: '',
      };

  // Prefer the explicit storeSlug prop; fall back to domain_name carried in storeInfo
  // so that pages which resolve the slug async (e.g. PaymentResultPage) still render
  // a correct home link while the prop catches up.
  const effectiveSlugForHome = storeSlug || headerStore?.domain_name || '';
  const storefrontHome = effectiveSlugForHome ? buildStorefrontPath(effectiveSlugForHome) : '/';

  
  const currentPath = location.pathname + location.search;
  const loginHref = storeSlug
    ? `${buildStorefrontPath(storeSlug, 'login')}?redirectTo=${encodeURIComponent(currentPath)}`
    : `/customer/login?redirectTo=${encodeURIComponent(currentPath)}`;
  const registerHref = storeSlug
    ? `${buildStorefrontPath(storeSlug, 'register')}?redirectTo=${encodeURIComponent(currentPath)}`
    : `/customer/register?redirectTo=${encodeURIComponent(currentPath)}`;
  const settingsHref = storeSlug ? buildStorefrontPath(storeSlug, 'settings') : '/customer/settings';
  const ordersHref = storeSlug ? buildStorefrontPath(storeSlug, 'orders') : '/customer/orders';
  const cartHref = storeSlug ? buildStorefrontPath(storeSlug, 'cart') : '/';
  const storeName = headerStore?.name || storeSlug || headerStore?.domain_name || t('storefront.header.defaultStoreName');
  const logoInitials = String(storeName || 'S')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'S';

  useEffect(() => {
    if (!storeInfo && storeSlug) {
      let mounted = true;
      Promise.resolve(axiosInstance.get(`/api/stores/${encodeURIComponent(storeSlug)}`))
        .then(({ data }) => {
          if (mounted && data?.store) setHeaderStore(data.store);
        })
        .catch(() => {
          if (mounted) setHeaderStore(null);
        });
      return () => {
        mounted = false;
      };
    }
    if (storeInfo) setHeaderStore(storeInfo);
  }, [storeSlug, storeInfo]);

  const isCustomerLoggedIn = () => !!localStorage.getItem('customer_token');
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  useEffect(() => {
    if (!isMobileMenuOpen && !isFilterMenuOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen, isFilterMenuOpen]);

  const handleLogout = () => {
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_id');
    localStorage.removeItem('user_type');
    navigate(storefrontHome);
    setIsMobileMenuOpen(false);
    setUserMenuOpen(false);
  };

  
  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (isDesktop) {
      setIsMobileSearchOpen(false);
    } else {
      setIsFilterMenuOpen(false);
    }
  }, [isDesktop]);

  useEffect(() => {
    const closeOnOutside = (event) => {
      if (!isFilterMenuOpen || !isDesktop) return;
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
        setIsFilterMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', closeOnOutside);
    return () => document.removeEventListener('mousedown', closeOnOutside);
  }, [isFilterMenuOpen, isDesktop]);

  useEffect(() => {
    const onEsc = (event) => {
      if (event.key !== 'Escape') return;
      setIsMobileMenuOpen(false);
      setIsFilterMenuOpen(false);
      setIsMobileSearchOpen(false);
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, []);

  const mobileMenuPortal = isMobileMenuOpen && typeof document !== 'undefined'
    ? createPortal(
      <div className="fixed inset-0 z-[80] lg:hidden">
        <button
          type="button"
          className="storefront-drawer-backdrop absolute inset-0"
          aria-label={t('storefront.header.closeMenu')}
          onClick={closeMobileMenu}
        />
        <aside
          ref={mobileDrawerRef}
          role="dialog"
          aria-modal="true"
          aria-label={t('storefront.header.menu')}
          className={`fixed inset-y-0 z-[81] flex w-[min(100%,20rem)] max-w-[88vw] flex-col bg-white shadow-2xl ${
            isRTL ? 'left-0 landing-drawer-in-start' : 'right-0 landing-drawer-in-end'
          }`}
          style={{
            paddingTop: 'max(0px, env(safe-area-inset-top))',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          <MobileDrawerContent
            isCustomerLoggedIn={isCustomerLoggedIn()}
            onOpenSearch={() => {
              if (!supportsCatalogControls) return;
              setIsMobileSearchOpen(true);
              closeMobileMenu();
            }}
            onOpenFilters={() => {
              if (!supportsCatalogControls) return;
              closeMobileMenu();
              requestAnimationFrame(() => setIsFilterMenuOpen(true));
            }}
            onToggleLanguage={toggleLanguage}
            settingsHref={settingsHref}
            ordersHref={ordersHref}
            loginHref={loginHref}
            registerHref={registerHref}
            onLogout={handleLogout}
            onClose={closeMobileMenu}
            showCatalogControls={supportsCatalogControls}
            hideAccount={previewMode}
            buttonColor={buttonColor}
            buttonTextColor={buttonTextColor}
          />
        </aside>
      </div>,
      document.body,
    )
    : null;

  const mobileFiltersPortal = !isDesktop && supportsCatalogControls && isFilterMenuOpen && typeof document !== 'undefined'
    ? createPortal(
      <div className="fixed inset-0 z-[70] lg:hidden">
        <button
          type="button"
          aria-label={t('storefront.header.closeFilters')}
          className="storefront-drawer-backdrop absolute inset-0"
          onClick={() => setIsFilterMenuOpen(false)}
        />
        <div
          className={`absolute bottom-0 left-0 right-0 max-h-[min(88dvh,920px)] overflow-y-auto overscroll-y-contain rounded-t-2xl border-t border-gray-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_32px_rgba(0,0,0,0.12)] ${isRTL ? 'text-right' : 'text-left'}`}
        >
          <div className="mx-auto mb-3 h-1.5 w-10 shrink-0 rounded-full bg-gray-200" aria-hidden="true" />
          <div className={`flex items-center justify-between mb-4 gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <h3 className="text-base font-semibold text-gray-900">{t('storefront.filters')}</h3>
            <button
              type="button"
              onClick={() => setIsFilterMenuOpen(false)}
              className="inline-flex h-11 min-w-[44px] items-center justify-center rounded-lg px-3 text-sm font-medium text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-storelaunch-green"
            >
              {t('storefront.header.closeFilters')}
            </button>
          </div>
          <StorefrontFilters
            categories={safeCategories}
            draftFilters={safeDraftFilters}
            onDraftChange={onDraftFilterChange}
            onApply={() => {
              onApplyFilters();
              setIsFilterMenuOpen(false);
            }}
            onReset={onResetFilters}
            hasActiveFilters={hasActiveFilters}
            isRTL={isRTL}
            t={t}
            accentColor={buttonColor}
            compact
          />
        </div>
      </div>,
      document.body,
    )
    : null;

  return (
    <>
    <nav
      dir={isRTL ? 'rtl' : 'ltr'}
      className="sticky top-0 z-50 border-b border-gray-100 shadow-sm pt-[env(safe-area-inset-top,0px)]"
      style={{ backgroundColor: topBarColor, color: topBarTextColor }}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center min-h-[3.5rem] md:min-h-[4rem] gap-2">
          {!isDesktop && isMobileSearchOpen && supportsCatalogControls ? (
            <>
              <div className="flex-1">
                <StorefrontSearchBar
                  value={searchValue || ''}
                  onChange={onSearchChange}
                  onClear={onSearchClear}
                  placeholder={t('storefront.searchPlaceholder')}
                  isRTL={isRTL}
                  autoFocus
                  compact
                />
              </div>
              <button
                type="button"
                onClick={() => setIsMobileSearchOpen(false)}
                aria-label={t('storefront.header.closeSearch')}
                className="h-11 w-11 shrink-0 inline-flex items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                style={{ color: topBarTextColor }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = iconHoverBg; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </>
          ) : (
            <>
          {}
          <Link
            to={storefrontHome}
            className={`flex items-center gap-2 min-w-0 max-w-[min(56vw,16rem)] sm:max-w-none ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            {headerStore?.logo ? (
              <img
                src={headerStore.logo}
                alt={storeName}
                className="h-9 w-9 shrink-0 rounded-full border border-gray-200 object-cover bg-gray-100"
              />
            ) : (
              <div className="h-9 w-9 shrink-0 rounded-full border border-gray-200 bg-gray-100 text-gray-600 text-xs font-semibold flex items-center justify-center">
                {logoInitials}
              </div>
            )}
            <div className={`min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
              <p className="text-sm font-semibold leading-tight truncate" style={{ color: topBarTextColor }}>{storeName}</p>
            </div>
          </Link>
          {isDesktop && supportsCatalogControls && (
            <div className="flex-1 max-w-md">
              <StorefrontSearchBar
                value={searchValue || ''}
                onChange={onSearchChange}
                onClear={onSearchClear}
                placeholder={t('storefront.searchPlaceholder')}
                isRTL={isRTL}
                compact
              />
            </div>
          )}

          {}
          <div className={`hidden lg:flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {supportsCatalogControls ? (
            <div className="relative" ref={filterMenuRef}>
              <button
                type="button"
                onClick={() => setIsFilterMenuOpen((v) => !v)}
                aria-label={t('storefront.header.openFilters')}
                className="h-9 px-3 rounded-md text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                style={{
                  backgroundColor: buttonColor,
                  color: buttonTextColor,
                  border: `1px solid ${filterHoverColor}`,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = filterHoverColor; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = buttonColor; }}
                onFocus={(e) => { e.currentTarget.style.boxShadow = `0 0 0 2px #fff, 0 0 0 4px ${buttonColor}`; }}
                onBlur={(e) => { e.currentTarget.style.boxShadow = ''; }}
              >
                {t('storefront.filters')}
              </button>
              {isDesktop && isFilterMenuOpen && (
                <div className={`absolute z-50 mt-2 w-[560px] ${isRTL ? 'left-0' : 'right-0'} rounded-xl border border-gray-200 bg-white p-3 shadow-xl`}>
                  <StorefrontFilters
                    categories={safeCategories}
                    draftFilters={safeDraftFilters}
                    onDraftChange={onDraftFilterChange}
                    onApply={() => {
                      onApplyFilters();
                      setIsFilterMenuOpen(false);
                    }}
                    onReset={onResetFilters}
                    hasActiveFilters={hasActiveFilters}
                    isRTL={isRTL}
                    t={t}
                    accentColor={buttonColor}
                    compact
                  />
                </div>
              )}
            </div>
            ) : null}
            {}
            {!previewMode ? (
              <button
                type="button"
                onClick={() => navigate(cartHref)}
                className="relative p-2 transition-colors"
                style={{ color: topBarTextColor }}
                aria-label={t('storefront.header.cart')}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {cartCount > 0 && (
                  <span className="cart-badge" style={{ border: `2px solid ${topBarColor}`, backgroundColor: buttonColor }}>
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </button>
            ) : null}

            {}
            <LanguageToggleButton
              onToggleLanguage={toggleLanguage}
              buttonColor={buttonColor}
              buttonTextColor={buttonTextColor}
            />

            {}
            {!previewMode && isCustomerLoggedIn() ? (
              
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-1.5 p-2 rounded-lg transition-colors"
                  style={{
                    color: topBarTextColor,
                    backgroundColor: userMenuOpen ? iconHoverBg : 'transparent',
                  }}
                  aria-label={t('storefront.header.userMenu')}
                >
                  {}
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <svg
                    className={`w-3.5 h-3.5 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {}
                {userMenuOpen && (
                  <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} mt-1.5 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden`}>
                    <Link
                      to={settingsHref}
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {t('storefront.header.settings')}
                    </Link>
                    <Link
                      to={ordersHref}
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                      {t('storefront.header.orderHistory')}
                    </Link>
                    <div className="border-t border-gray-100" />
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      {t('storefront.header.logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : !previewMode ? (
              <>
                <Link
                  to={loginHref}
                  className="text-sm font-medium transition-colors"
                  style={{ color: topBarTextColor }}
                >
                  {t('nav.login')}
                </Link>
                <Link
                  to={registerHref}
                  className="px-4 py-2 text-sm rounded-lg font-medium transition-colors"
                  style={{ backgroundColor: buttonColor, color: buttonTextColor }}
                >
                  {t('nav.getStarted')}
                </Link>
              </>
            ) : null}
          </div>

          <MobileHeaderActions
            cartCount={cartCount}
            showCart={!previewMode}
            onCartClick={() => navigate(cartHref)}
            onMenuToggle={() => setIsMobileMenuOpen(true)}
            iconColor={topBarTextColor}
            iconHoverBg={iconHoverBg}
            focusRingColor={buttonColor}
            topBarColor={topBarColor}
            badgeColor={buttonColor}
          />
          </>
          )}
        </div>

      </div>
    </nav>
    {mobileMenuPortal}
    {mobileFiltersPortal}
    </>
  );
};

export default StorefrontHeader;

import React from 'react';
import { useTranslation } from 'react-i18next';

const SOCIAL_KEYS = ['instagram', 'tiktok', 'snapchat', 'twitter', 'whatsapp', 'facebook'];

function toDisplayString(v) {
  if (v == null) return '';
  if (typeof v === 'object') return '';
  return String(v).trim();
}

function asUrl(href) {
  const s = toDisplayString(href);
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('//')) return `https:${s}`;
  if (s.includes('.') && !s.includes(' ')) return `https://${s.replace(/^\/+/, '')}`;
  return null;
}

const StorefrontFooter = ({ storeInfo, branding, isRTL }) => {
  const { t } = useTranslation();
  const rawFooter = storeInfo?.footer;
  const footer = rawFooter && typeof rawFooter === 'object' ? rawFooter : {};
  const rawInfo = storeInfo?.info;
  const info = rawInfo && typeof rawInfo === 'object' ? rawInfo : {};

  const about = toDisplayString(footer.about);
  const email = toDisplayString(footer.contactEmail || info.contactEmail || info.contact_email);
  const phone = toDisplayString(footer.contactPhone || info.contactPhone || info.contact_phone);
  const address = toDisplayString(footer.address || info.address);

  const topBar = branding?.topBar || '#0A3C5A';
  const textOnDark = '#f9fafb';

  const socialEntries = SOCIAL_KEYS.map((key) => {
    const label = key.charAt(0).toUpperCase() + key.slice(1);
    const url = asUrl(footer[key]);
    if (!url) return null;
    return (
      <a
        key={key}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-medium underline-offset-2 hover:underline opacity-90 hover:opacity-100"
        style={{ color: textOnDark }}
      >
        {label}
      </a>
    );
  }).filter(Boolean);

  const hasContact = Boolean(email || phone || address);
  const hasAbout = Boolean(about);
  const hasSocial = socialEntries.length > 0;
  const hasMainBlocks = hasAbout || hasContact || hasSocial;

  return (
    <footer
      className="mt-auto border-t border-white/10"
      style={{ backgroundColor: topBar, color: textOnDark }}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div
        className={`max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-[max(0.5rem,env(safe-area-inset-bottom))] ${hasMainBlocks ? 'py-8 sm:py-10' : 'py-5 sm:py-6'}`}
      >
        {hasMainBlocks ? (
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 ${isRTL ? 'text-right' : 'text-left'}`}>
            {hasAbout && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide opacity-90">
                  {t('storefront.footer.about')}
                </h3>
                <p className="text-sm leading-relaxed opacity-90 whitespace-pre-wrap">{about}</p>
              </div>
            )}
            {hasContact && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide opacity-90">
                  {t('storefront.footer.contact')}
                </h3>
                <ul className="text-sm space-y-1.5 opacity-90">
                  {email ? (
                    <li>
                      <span className="opacity-75">{t('storefront.footer.email')}: </span>
                      <a href={`mailto:${email}`} className="underline underline-offset-2">
                        {email}
                      </a>
                    </li>
                  ) : null}
                  {phone ? (
                    <li>
                      <span className="opacity-75">{t('storefront.footer.phone')}: </span>
                      <a href={`tel:${phone.replace(/\s/g, '')}`} className="underline underline-offset-2">
                        {phone}
                      </a>
                    </li>
                  ) : null}
                  {address ? (
                    <li className="whitespace-pre-wrap">
                      <span className="opacity-75">{t('storefront.footer.address')}: </span>
                      {address}
                    </li>
                  ) : null}
                </ul>
              </div>
            )}
            {hasSocial && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide opacity-90">
                  {t('storefront.footer.follow')}
                </h3>
                <div className={`flex flex-wrap gap-3 ${isRTL ? 'justify-end' : 'justify-start'}`}>
                  {socialEntries}
                </div>
              </div>
            )}
          </div>
        ) : null}
        <p
          className={`text-xs opacity-70 text-center ${hasMainBlocks ? 'mt-8 pt-6 border-t border-white/10' : ''}`}
        >
          © {new Date().getFullYear()} {toDisplayString(storeInfo?.name) || t('storefront.footer.store')}
        </p>
      </div>
    </footer>
  );
};

export default StorefrontFooter;

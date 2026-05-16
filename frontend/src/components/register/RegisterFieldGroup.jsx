import React from 'react';
import { useTranslation } from 'react-i18next';

/** Shared inline hint icon for register field / password messages */
export function FieldHintIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * Non-password register fields: calmer validation styling (amber / tint) vs alarm red.
 */
export default function RegisterFieldGroup({
  fieldId,
  name,
  value,
  onChange,
  labelKey,
  placeholderKey,
  errorKey,
  type = 'text',
  inputMode,
  autoComplete,
  alignClass,
}) {
  const { t } = useTranslation();
  const hasError = Boolean(errorKey);
  const placeholder = placeholderKey ? t(placeholderKey) : t(labelKey);

  const labelEl = (
    <label htmlFor={fieldId} className="block text-storelaunch-dark text-sm font-medium mb-1">
      {t(labelKey)}
    </label>
  );

  const inputEl = (
    <input
      id={fieldId}
      name={name}
      type={type}
      inputMode={inputMode}
      autoComplete={autoComplete}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      aria-invalid={hasError}
      aria-describedby={hasError ? `${fieldId}-error` : undefined}
      className={`w-full p-2 border rounded-md focus:ring-2 focus:border-transparent ${alignClass} ${
        hasError
          ? 'border-amber-400/90 bg-white/80 focus:ring-amber-200 focus:ring-offset-0'
          : 'border-gray-300 focus:ring-storelaunch-green'
      }`}
    />
  );

  const errorEl = hasError && (
    <div id={`${fieldId}-error`} className={`mt-2 flex gap-2 items-start text-amber-950 ${alignClass}`} role="alert">
      <FieldHintIcon className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
      <p className="text-sm leading-snug">{t(errorKey)}</p>
    </div>
  );

  return (
    <div className={alignClass}>
      {hasError ? (
        <div className="rounded-md border border-amber-100/90 border-s-4 border-s-amber-500 bg-amber-50/50 ps-3 py-2 pe-2 shadow-sm">
          {labelEl}
          {inputEl}
          {errorEl}
        </div>
      ) : (
        <>
          {labelEl}
          {inputEl}
        </>
      )}
    </div>
  );
}

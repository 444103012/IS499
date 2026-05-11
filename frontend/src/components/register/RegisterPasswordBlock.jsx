import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getPasswordStrengthState } from '../../validation/register';
import { FieldHintIcon } from './RegisterFieldGroup';

function EyeIcon({ open }) {
  if (open) {
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

/**
 * Password + confirm with visibility toggles, cumulative 3-segment meter + checklist.
 * Checklist shows *which* rules pass; the bar shows *how many* (0–3) pass, filled contiguously from the start.
 * Expects parent `onFieldChange` compatible with React input (e.target.name / value).
 */
export default function RegisterPasswordBlock({
  ns,
  password,
  confirmPassword,
  onFieldChange,
  fieldErrors,
  submitAttempted,
  isRTL,
}) {
  const { t } = useTranslation();
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwFocused, setPwFocused] = useState(false);
  const [pwDirty, setPwDirty] = useState(false);

  const pwErr = fieldErrors.password;
  const confirmErr = fieldErrors.confirmPassword;
  const showChecklist = pwFocused || pwDirty || (submitAttempted && Boolean(pwErr));
  const st = getPasswordStrengthState(password);
  const alignClass = isRTL ? 'text-right' : 'text-left';

  const checklistItem = (met, labelKey) => (
    <li className={`flex items-start gap-2 text-sm ${met ? 'text-storelaunch-green' : 'text-gray-600'}`}>
      <span className="mt-0.5 shrink-0 w-4 text-center font-medium" aria-hidden>
        {met ? '✓' : '○'}
      </span>
      <span>{t(labelKey)}</span>
    </li>
  );

  const onPasswordChange = (e) => {
    if (!pwDirty && e.target.value !== '') setPwDirty(true);
    onFieldChange(e);
  };

  const showPasswordIncompleteLine = pwErr && pwErr.includes('passwordIncomplete') && !showChecklist;

  const passwordDescribedBy = [
    'password-strength',
    showChecklist ? 'password-checklist' : null,
    password.length > 0 ? 'password-requirements-count' : null,
    pwErr && (pwErr.includes('passwordRequired') || showPasswordIncompleteLine) ? 'password-error' : null,
  ]
    .filter(Boolean)
    .join(' ');

  const inputErrorRing = (hasErr) =>
    hasErr
      ? 'border-amber-400/90 bg-white/80 focus:ring-amber-200 focus:ring-offset-0'
      : 'border-gray-300 focus:ring-storelaunch-green';

  return (
    <>
      <div className={alignClass}>
        <label htmlFor="password" className="block text-storelaunch-dark text-sm font-medium mb-1">
          {t(`${ns}.password`)}
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPw ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={onPasswordChange}
            onFocus={() => setPwFocused(true)}
            onBlur={() => setPwFocused(false)}
            placeholder={t(`${ns}.password`)}
            aria-invalid={Boolean(pwErr)}
            aria-describedby={passwordDescribedBy || undefined}
            className={`w-full p-2 pe-11 border rounded-md focus:ring-2 focus:border-transparent ${alignClass} ${inputErrorRing(Boolean(pwErr))}`}
          />
          <button
            type="button"
            className={`absolute top-1/2 -translate-y-1/2 text-gray-500 hover:text-storelaunch-dark p-1 rounded ${isRTL ? 'left-2' : 'right-2'}`}
            onClick={() => setShowPw((s) => !s)}
            aria-label={showPw ? t(`${ns}.validation.hidePassword`) : t(`${ns}.validation.showPassword`)}
          >
            <EyeIcon open={showPw} />
          </button>
        </div>

        <div id="password-strength" className="mt-2 space-y-1.5" aria-live="polite">
          {/*
            Cumulative meter: segment i is green iff i < criteriaCount (no holes). Matches “X of Y requirements met”.
            RTL: we use dir="ltr" on this row only so fill is always left→right; the rest of the form follows page dir.
            (Mirroring the bar for Arabic reading-start was error-prone with per-index mapping.)
          */}
          <div dir="ltr" className="flex flex-row gap-1" role="presentation">
            {Array.from({ length: st.requirementsTotal }, (_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i < st.criteriaCount ? 'bg-storelaunch-green' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          {password.length > 0 && (
            <p id="password-requirements-count" className={`text-xs text-gray-600 ${alignClass}`}>
              {t(`${ns}.validation.passwordRequirementsProgress`, {
                met: st.criteriaCount,
                total: st.requirementsTotal,
              })}
            </p>
          )}
          <p className={`text-xs text-gray-600 ${alignClass}`}>
            {t(
              `${ns}.validation.${
                st.label === 'empty'
                  ? 'passwordStrengthEmpty'
                  : st.label === 'weak'
                    ? 'passwordStrengthWeak'
                    : st.label === 'medium'
                      ? 'passwordStrengthMedium'
                      : st.label === 'almost'
                        ? 'passwordStrengthAlmost'
                        : 'passwordStrengthStrong'
              }`
            )}
          </p>
        </div>

        {showChecklist && (
          <ul
            id="password-checklist"
            className={`mt-2 space-y-1 rounded-md border border-gray-100 bg-gray-50/80 px-3 py-2 ${alignClass}`}
          >
            {checklistItem(st.len8, `${ns}.validation.pwCheckLen`)}
            {checklistItem(st.letter, `${ns}.validation.pwCheckLetter`)}
            {checklistItem(st.number, `${ns}.validation.pwCheckNumber`)}
          </ul>
        )}

        {pwErr && (pwErr.includes('passwordRequired') || showPasswordIncompleteLine) && (
          <p id="password-error" className="text-sm text-amber-950 mt-2 flex items-start gap-2" role="alert">
            <FieldHintIcon className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <span>{t(pwErr)}</span>
          </p>
        )}
      </div>

      <div className={alignClass}>
        <label htmlFor="confirmPassword" className="block text-storelaunch-dark text-sm font-medium mb-1">
          {t(`${ns}.confirmPassword`)}
        </label>
        <div className="relative">
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirm ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={onFieldChange}
            placeholder={t(`${ns}.confirmPassword`)}
            aria-invalid={Boolean(confirmErr)}
            aria-describedby={confirmErr ? 'confirmPassword-error' : undefined}
            className={`w-full p-2 pe-11 border rounded-md focus:ring-2 focus:border-transparent ${alignClass} ${inputErrorRing(Boolean(confirmErr))}`}
          />
          <button
            type="button"
            className={`absolute top-1/2 -translate-y-1/2 text-gray-500 hover:text-storelaunch-dark p-1 rounded ${isRTL ? 'left-2' : 'right-2'}`}
            onClick={() => setShowConfirm((s) => !s)}
            aria-label={showConfirm ? t(`${ns}.validation.hidePassword`) : t(`${ns}.validation.showPassword`)}
          >
            <EyeIcon open={showConfirm} />
          </button>
        </div>
        {confirmErr && (
          <p id="confirmPassword-error" className="text-sm text-amber-950 mt-2 flex items-start gap-2" role="alert">
            <FieldHintIcon className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <span>{t(confirmErr)}</span>
          </p>
        )}
      </div>
    </>
  );
}

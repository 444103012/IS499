/**
 * Client-side registration rules (mirror backend/utils/registerValidation.js).
 * Names: reject digits in trimmed value; require at least one letter; max length.
 */
export const MAX_NAME_LENGTH = 100;

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
export const PHONE_REGEX = /^05\d{8}$/;

/** DOM field order for focus + scroll on failed submit */
export const REGISTER_FIELD_ORDER = [
  'first_name',
  'last_name',
  'email',
  'phone',
  'password',
  'confirmPassword',
];

/** Total checklist / meter slots (length, letter, digit) — matches PASSWORD_REGEX building blocks only. */
export const PASSWORD_REQUIREMENTS_TOTAL = 3;

/**
 * Password progress for UI meter + checklist (aligned with PASSWORD_REGEX only: length, Latin letter, digit).
 * Meter uses exactly three segments in this order; no separate 4th “meets all” segment.
 */
export function getPasswordStrengthState(password) {
  const p = String(password ?? '');
  const len8 = p.length >= 8;
  const letter = /[A-Za-z]/.test(p);
  const number = /\d/.test(p);
  const meetsPolicy = PASSWORD_REGEX.test(p);
  const criteriaCount = [len8, letter, number].filter(Boolean).length;
  const label = meetsPolicy
    ? 'strong'
    : p.length === 0
      ? 'empty'
      : criteriaCount <= 1
        ? 'weak'
        : criteriaCount === 2
          ? 'medium'
          : 'almost';
  return {
    len8,
    letter,
    number,
    meetsPolicy,
    criteriaCount,
    label,
    requirementsTotal: PASSWORD_REQUIREMENTS_TOTAL,
  };
}

export function hasDigit(str) {
  return /\d/.test(String(str));
}

export function hasLetter(str) {
  return /\p{L}/u.test(String(str));
}

/** Valid human name for this product: non-empty trim, no digits, includes a letter, bounded length. */
export function isValidPersonName(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return false;
  if (trimmed.length > MAX_NAME_LENGTH) return false;
  if (hasDigit(trimmed)) return false;
  if (!hasLetter(trimmed)) return false;
  return true;
}

/**
 * @param {object} form — { first_name, last_name, email, phone, password, confirmPassword }
 * @param {string} ns — i18n namespace prefix without dot, e.g. 'auth' or 'customerAuth'
 * @returns {{ fieldErrors: Record<string, string>, firstInvalidField: string | null }}
 * Values are full i18n keys like `auth.validation.invalidEmail` for use with t().
 */
export function validateRegisterForm(form, ns) {
  const fieldErrors = {};
  const key = (suffix) => `${ns}.validation.${suffix}`;

  const first = String(form.first_name ?? '').trim();
  const last = String(form.last_name ?? '').trim();
  const email = String(form.email ?? '').trim();
  const phone = String(form.phone ?? '').trim();
  const password = String(form.password ?? '');
  const confirmPassword = String(form.confirmPassword ?? '');

  if (!first) fieldErrors.first_name = key('firstNameRequired');
  else if (!isValidPersonName(first)) fieldErrors.first_name = key('invalidFirstName');

  if (!last) fieldErrors.last_name = key('lastNameRequired');
  else if (!isValidPersonName(last)) fieldErrors.last_name = key('invalidLastName');

  if (!email) fieldErrors.email = key('emailRequired');
  else if (!EMAIL_REGEX.test(email)) fieldErrors.email = key('invalidEmail');

  if (!phone) fieldErrors.phone = key('phoneRequired');
  else if (!PHONE_REGEX.test(phone)) fieldErrors.phone = key('invalidPhone');

  if (!password) fieldErrors.password = key('passwordRequired');
  else if (!PASSWORD_REGEX.test(password)) fieldErrors.password = key('passwordIncomplete');

  if (!confirmPassword) fieldErrors.confirmPassword = key('confirmPasswordRequired');
  else if (password !== confirmPassword) fieldErrors.confirmPassword = key('passwordMismatch');

  const firstInvalidField = REGISTER_FIELD_ORDER.find((f) => fieldErrors[f]) ?? null;

  return { fieldErrors, firstInvalidField };
}

/** Map backend register `error` code (or legacy English string) to i18n key under namespace. */
export function mapRegisterApiError(errorMsg, ns) {
  if (!errorMsg) return `${ns}.registerApi.generic`;
  const legacy = {
    'Missing required fields': `${ns}.registerApi.MISSING_REQUIRED_FIELDS`,
    'Email already registered': `${ns}.registerApi.EMAIL_ALREADY_REGISTERED`,
    'Phone already registered': `${ns}.registerApi.PHONE_ALREADY_REGISTERED`,
    'Invalid phone format': `${ns}.registerApi.INVALID_PHONE`,
    'Weak password': `${ns}.registerApi.WEAK_PASSWORD`,
    'Invalid email': `${ns}.registerApi.INVALID_EMAIL`,
    'Invalid first name': `${ns}.registerApi.INVALID_FIRST_NAME`,
    'Invalid last name': `${ns}.registerApi.INVALID_LAST_NAME`,
    'Registration failed': `${ns}.registerApi.REGISTRATION_FAILED`,
    'Database not configured': `${ns}.registerApi.DATABASE_NOT_CONFIGURED`,
  };
  const codeMap = {
    MISSING_REQUIRED_FIELDS: `${ns}.registerApi.MISSING_REQUIRED_FIELDS`,
    EMAIL_ALREADY_REGISTERED: `${ns}.registerApi.EMAIL_ALREADY_REGISTERED`,
    PHONE_ALREADY_REGISTERED: `${ns}.registerApi.PHONE_ALREADY_REGISTERED`,
    INVALID_PHONE: `${ns}.registerApi.INVALID_PHONE`,
    WEAK_PASSWORD: `${ns}.registerApi.WEAK_PASSWORD`,
    INVALID_EMAIL: `${ns}.registerApi.INVALID_EMAIL`,
    INVALID_FIRST_NAME: `${ns}.registerApi.INVALID_FIRST_NAME`,
    INVALID_LAST_NAME: `${ns}.registerApi.INVALID_LAST_NAME`,
    REGISTRATION_FAILED: `${ns}.registerApi.REGISTRATION_FAILED`,
    DATABASE_NOT_CONFIGURED: `${ns}.registerApi.DATABASE_NOT_CONFIGURED`,
  };
  if (codeMap[errorMsg]) return codeMap[errorMsg];
  if (legacy[errorMsg]) return legacy[errorMsg];
  return `${ns}.registerApi.generic`;
}

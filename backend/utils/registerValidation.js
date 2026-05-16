/**
 * Shared registration validation (customers & store owners).
 * Names: trimmed non-empty, no ASCII digits, max length, at least one Unicode letter (allows Arabic/Latin names).
 */
const MAX_NAME_LENGTH = 100;
const SA_MOBILE = /^05\d{8}$/;
const PASSWORD_STRENGTH = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function hasDigit(str) {
  return /\d/.test(String(str));
}

function hasLetter(str) {
  return /\p{L}/u.test(String(str));
}

function isValidPersonName(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return false;
  if (trimmed.length > MAX_NAME_LENGTH) return false;
  if (hasDigit(trimmed)) return false;
  if (!hasLetter(trimmed)) return false;
  return true;
}

function isValidEmail(value) {
  return EMAIL.test(String(value ?? '').trim());
}

function isValidSaPhone(value) {
  return SA_MOBILE.test(String(value ?? '').trim());
}

function isValidPassword(value) {
  return PASSWORD_STRENGTH.test(String(value ?? ''));
}

module.exports = {
  MAX_NAME_LENGTH,
  SA_MOBILE,
  PASSWORD_STRENGTH,
  EMAIL,
  isValidPersonName,
  isValidEmail,
  isValidSaPhone,
  isValidPassword,
  hasDigit,
};

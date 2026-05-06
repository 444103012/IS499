function validatePasswordChangeInput(currentPassword, newPassword) {
  if (!newPassword || newPassword.length < 8) return 'PasswordTooShort';
  if (!currentPassword) return 'CurrentPasswordRequired';
  return null;
}

module.exports = { validatePasswordChangeInput };
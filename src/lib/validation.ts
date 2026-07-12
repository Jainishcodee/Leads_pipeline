/**
 * Shared validation helpers for email and password fields.
 *
 * Use these everywhere an email or password is entered so the rules stay
 * consistent across the app (auth screens, invites, lead contacts, etc.).
 */

// Pragmatic email shape: local@domain.tld with no whitespace.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Minimum characters required for a password (matches Firebase Auth). */
export const MIN_PASSWORD_LENGTH = 6;

/** Returns true when the value is a well-formed email address. */
export const isValidEmail = (email: string): boolean =>
  EMAIL_REGEX.test(email.trim());

/**
 * Validates an email address.
 * @returns an error message, or `null` when the email is valid.
 */
export const getEmailError = (email: string): string | null => {
  const trimmed = email.trim();
  if (!trimmed) return 'Email is required';
  if (!EMAIL_REGEX.test(trimmed)) return 'Please enter a valid email address';
  return null;
};

/** Returns true when the password meets the minimum length requirement. */
export const isValidPassword = (password: string): boolean =>
  password.length >= MIN_PASSWORD_LENGTH;

/**
 * Validates a password.
 * @returns an error message, or `null` when the password is valid.
 */
export const getPasswordError = (password: string): string | null => {
  if (!password) return 'Password is required';
  if (password.length < MIN_PASSWORD_LENGTH)
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  return null;
};

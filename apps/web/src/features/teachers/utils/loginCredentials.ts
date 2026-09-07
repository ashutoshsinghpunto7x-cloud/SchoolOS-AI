/** Default domain for admin-generated school login addresses — edit per school. */
export const LOGIN_EMAIL_DOMAIN = 'fnic.com';

const USERNAME_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';
const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

function randomFrom(chars: string, length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function generatePassword(): string {
  return randomFrom(PASSWORD_CHARS, 10);
}

/** firstname + last-initial base, falling back to a random string. */
function slugFromName(fullName: string): string {
  const parts = fullName.toLowerCase().replace(/[^a-z\s]/g, '').trim().split(/\s+/).filter(Boolean);
  return parts.length > 0
    ? (parts[0] + (parts[1]?.[0] ?? '')).slice(0, 14)
    : `teacher${randomFrom(USERNAME_CHARS, 4)}`;
}

/** Generates a school login email like jsmith@fnic.com, appending a numeric
 *  suffix until it doesn't collide with any login email already taken
 *  (existing logins) or generated earlier in this batch. */
export function generateLoginEmail(fullName: string, taken: Set<string>, domain = LOGIN_EMAIL_DOMAIN): string {
  const base = slugFromName(fullName);
  let local = base.length >= 3 ? base : `${base}${randomFrom(USERNAME_CHARS, 3 - base.length)}`;
  let candidate = `${local}@${domain}`;
  while (taken.has(candidate)) {
    local = `${base}${randomFrom('0123456789', 3)}`;
    candidate = `${local}@${domain}`;
  }
  taken.add(candidate);
  return candidate;
}

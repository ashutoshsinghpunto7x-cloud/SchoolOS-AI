// Client-side JWT decoding for assertions/logging only — this never verifies
// the signature (k6 has no crypto-secret access, nor should it). Use it to
// sanity-check that a login response's token actually carries the role/school
// the scenario expects, not to make trust decisions.
import encoding from 'k6/encoding';

export function decodeJwtPayload(token) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
  const decoded = encoding.b64decode(padded, 'std', 's');
  try {
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

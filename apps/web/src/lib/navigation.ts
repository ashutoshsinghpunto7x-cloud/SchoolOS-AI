import type { NavigateFunction } from 'react-router-dom';

/**
 * Navigates back to the genuine previous screen in React Router's history stack
 * when an in-app history entry exists; falls back to `fallbackPath` on direct
 * page loads / new tabs so the user never gets stranded or bounced out of the app.
 */
export function goBackOrFallback(navigate: NavigateFunction, fallbackPath: string): void {
  if (
    typeof window !== 'undefined' &&
    window.history.state &&
    typeof (window.history.state as { idx?: unknown }).idx === 'number' &&
    (window.history.state as { idx: number }).idx > 0
  ) {
    navigate(-1);
    return;
  }
  navigate(fallbackPath);
}

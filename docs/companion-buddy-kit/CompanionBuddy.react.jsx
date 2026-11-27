// Optional React wrapper around companion-buddy.js.
//
//   <CompanionBuddy
//     pathname={location.pathname}      // from your router — triggers the "here's X" flight
//     routes={[{ path: '/billing', label: 'Billing', hint: 'Invoices and plans.' }]}
//     homePath="/"
//     open={chatOpen} thinking={isLoading}
//     onClick={() => setChatOpen((v) => !v)}
//   />
import { useEffect, useRef } from 'react';
import { createCompanionBuddy } from './companion-buddy.js';
import './companion-buddy.css';

export function CompanionBuddy({ pathname, open = false, thinking = false, onClick, ...options }) {
  const buddyRef = useRef(null);
  const onClickRef = useRef(onClick);
  const optionsRef = useRef(options);
  const lastPath = useRef(pathname);

  useEffect(() => {
    onClickRef.current = onClick;
    optionsRef.current = options;
  });

  useEffect(() => {
    const buddy = createCompanionBuddy({
      ...optionsRef.current,
      getPath: () => lastPath.current ?? window.location.pathname,
      // Always calls the latest onClick prop, so it can close over fresh state.
      onClick: onClickRef.current ? (e) => onClickRef.current?.(e) : undefined,
    });
    buddyRef.current = buddy;
    return () => buddy.destroy();
    // Created once; options are read at creation time (remount with a `key` to change them).
  }, []);

  useEffect(() => buddyRef.current?.setOpen(open), [open]);
  useEffect(() => buddyRef.current?.setThinking(thinking), [thinking]);
  useEffect(() => {
    if (pathname === undefined || pathname === lastPath.current) return;
    lastPath.current = pathname;
    buddyRef.current?.arrived(pathname);
  }, [pathname]);

  return null;
}

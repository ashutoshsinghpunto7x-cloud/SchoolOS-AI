// Background push handler — runs even when the tab/browser is closed. This
// is a raw static file (not bundled by Vite), so it can't read
// import.meta.env; the values below are safe to hardcode — they're public
// client identifiers, not secrets — and are kept in sync with
// apps/web/.env.local's VITE_FIREBASE_* by hand, since this file can't read env vars.
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyA2XBwzOway8HayatZxNF5EeJ3wKggfxds',
  authDomain: 'schoolos-acc42.firebaseapp.com',
  projectId: 'schoolos-acc42',
  storageBucket: 'schoolos-acc42.firebasestorage.app',
  messagingSenderId: '481729478829',
  appId: '1:481729478829:web:1c4bac439c34185a3dc624',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification ?? {};
  self.registration.showNotification(title ?? 'SchoolOS AI', {
    body,
    icon: '/favicon.ico',
    data: payload.data,
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const path = event.notification.data?.path ?? '/';
  event.waitUntil(self.clients.openWindow(path));
});

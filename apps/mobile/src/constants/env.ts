// Expo only inlines env vars prefixed EXPO_PUBLIC_ into the client bundle.
// Falls back to the local dev server so `expo start` works out of the box.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:5000/api/v1';
export const APP_ENV = process.env.EXPO_PUBLIC_APP_ENV ?? 'development';

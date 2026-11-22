import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation } from 'react-native-webview';

// Production web app. Override per build with EXPO_PUBLIC_WEB_APP_URL.
// Because the app renders the live web app, every web deploy shows up in the
// APK immediately — no APK rebuild or OTA push needed for web changes.
const WEB_APP_URL = process.env.EXPO_PUBLIC_WEB_APP_URL ?? 'https://fnicschool.com';
const WEB_HOST = new URL(WEB_APP_URL).hostname.replace(/^www\./, '');

// Hosts that should stay inside the app (the web app itself + its backend +
// Google sign-in / Firebase helpers it may redirect through).
const IN_APP_HOSTS = [
  WEB_HOST,
  'onrender.com',
  'vercel.app',
  'firebaseapp.com',
  'googleapis.com',
  'accounts.google.com',
];

function stayInApp(url: string): boolean {
  if (url === 'about:blank') return true;
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol !== 'https:' && protocol !== 'http:') return false;
    const host = hostname.replace(/^www\./, '');
    return IN_APP_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

// The web app keeps its session in sessionStorage (tab-scoped by design), which
// a WebView drops whenever the app process is killed — that would sign users
// out every time they swipe the app away. Mirror the two session keys into
// localStorage (persisted on disk) and restore them before the page boots.
const SESSION_PERSIST_JS = `
(function () {
  try {
    var KEYS = ['accessToken', 'sessionId'];
    var PFX = '__app_';
    KEYS.forEach(function (k) {
      if (!sessionStorage.getItem(k) && localStorage.getItem(PFX + k)) {
        sessionStorage.setItem(k, localStorage.getItem(PFX + k));
      }
    });
    var set = Storage.prototype.setItem;
    var remove = Storage.prototype.removeItem;
    Storage.prototype.setItem = function (k, v) {
      if (this === window.sessionStorage && KEYS.indexOf(k) !== -1) {
        try { localStorage.setItem(PFX + k, v); } catch (e) {}
      }
      return set.apply(this, arguments);
    };
    Storage.prototype.removeItem = function (k) {
      if (this === window.sessionStorage && KEYS.indexOf(k) !== -1) {
        try { localStorage.removeItem(PFX + k); } catch (e) {}
      }
      return remove.apply(this, arguments);
    };
  } catch (e) {}
  true;
})();
`;

export default function WebShell() {
  const webRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  // Android hardware back: navigate the web app's history, exit at the root.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack && webRef.current) {
        webRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [canGoBack]);

  const onNavChange = useCallback((nav: WebViewNavigation) => {
    setCanGoBack(nav.canGoBack);
  }, []);

  const reload = useCallback(() => {
    setFailed(false);
    setLoading(true);
    setTimeout(() => setLoading(false), 8000);
    webRef.current?.reload();
  }, []);

  const onShouldStart = useCallback((req: { url: string }) => {
    if (stayInApp(req.url)) return true;
    // tel:, mailto:, wa.me, maps, external sites → hand off to the OS.
    Linking.openURL(req.url).catch(() => undefined);
    return false;
  }, []);

  if (failed) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.title}>Can’t reach SchoolOS</Text>
        <Text style={styles.body}>Check your internet connection and try again.</Text>
        <Pressable style={styles.button} onPress={reload}>
          <Text style={styles.buttonText}>Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
      <WebView
        ref={webRef}
        source={{ uri: WEB_APP_URL }}
        style={styles.fill}
        applicationNameForUserAgent="SchoolOSApp/1.0"
        injectedJavaScriptBeforeContentLoaded={SESSION_PERSIST_JS}
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled
        sharedCookiesEnabled
        cacheEnabled
        setSupportMultipleWindows={false}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        mediaCapturePermissionGrantType="grant"
        geolocationEnabled
        allowFileAccess={false}
        allowsBackForwardNavigationGestures
        overScrollMode="never"
        onNavigationStateChange={onNavChange}
        onShouldStartLoadWithRequest={onShouldStart}
        // Spinner only covers the very first paint. The web app is a SPA that keeps
        // loading/polling in the background, so tying it to every load event
        // left it spinning forever over a fully rendered page.
        onLoadProgress={(e) => {
          if (e.nativeEvent.progress >= 0.7) setLoading(false);
        }}
        onLoad={() => setLoading(false)}
        onLoadEnd={() => setLoading(false)}
        onError={() => setFailed(true)}
        onHttpError={(e) => {
          if (e.nativeEvent.statusCode >= 500) setFailed(true);
        }}
      />
      {loading && (
        <View style={styles.loader} pointerEvents="none">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#ffffff' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#ffffff',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  body: { fontSize: 16, color: '#475569', textAlign: 'center', marginBottom: 24 },
  button: { backgroundColor: '#2563eb', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
});

import { useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { router } from '@/routes';
import { SplashScreen } from '@/components/splash/SplashScreen';

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      {showSplash ? (
        <SplashScreen onFinish={() => setShowSplash(false)} />
      ) : (
        <RouterProvider router={router} />
      )}
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: { fontFamily: 'inherit' },
          duration: 4000,
        }}
      />
    </>
  );
};

export default App;

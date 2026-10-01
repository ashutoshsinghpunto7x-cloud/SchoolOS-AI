import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { router } from '@/routes';
import { BackgroundJobsTray } from '@/components/BackgroundJobsTray';
import { TermMarksJobHost } from '@/features/marks/components/TermMarksJobHost';

const App = () => {
  return (
    <>
      <RouterProvider router={router} />
      <BackgroundJobsTray />
      <TermMarksJobHost />
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

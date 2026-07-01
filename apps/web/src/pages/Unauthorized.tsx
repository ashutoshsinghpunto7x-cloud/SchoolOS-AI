import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

export const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-5">
          <ShieldAlert className="w-8 h-8 text-amber-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Session Expired</h1>
        <p className="text-base text-gray-500 mb-6">
          Your session has expired or you are not logged in. Please sign in to continue.
        </p>
        <button
          onClick={() => navigate('/login', { replace: true })}
          className="h-12 px-6 rounded-xl bg-blue-600 hover:bg-blue-700
                     text-base font-bold text-white transition-colors duration-150"
          type="button"
        >
          Go to Login
        </button>
      </div>
    </div>
  );
};

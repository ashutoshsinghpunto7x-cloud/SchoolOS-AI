import { useNavigate } from 'react-router-dom';
import { ShieldX } from 'lucide-react';

export const Forbidden = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
          <ShieldX className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-base text-gray-500 mb-6">
          You do not have permission to view this page. Contact your administrator if you believe this is an error.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="h-12 px-6 rounded-xl bg-gray-100 hover:bg-gray-200
                     text-base font-bold text-gray-700 border border-gray-200 transition-colors duration-150"
          type="button"
        >
          Go Back
        </button>
      </div>
    </div>
  );
};

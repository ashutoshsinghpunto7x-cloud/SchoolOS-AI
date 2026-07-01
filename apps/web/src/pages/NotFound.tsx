import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F5F7] px-6">
      <div className="flex flex-col items-center text-center max-w-sm">
        <div className="w-20 h-20 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center mb-6">
          <Compass className="w-10 h-10 text-gray-300" strokeWidth={1.5} />
        </div>

        <h1 className="text-5xl font-bold text-gray-900 mb-2">404</h1>
        <h2 className="text-lg font-semibold text-gray-700 mb-1">Page not found</h2>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
          The page you are looking for does not exist or has been moved.
        </p>

        <Link
          to="/reception"
          className="px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
        >
          Go to Reception
        </Link>
      </div>
    </div>
  );
};

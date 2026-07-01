import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { EnquiryForm } from '../components/EnquiryForm';
import { useCreateEnquiry } from '../hooks/useEnquiries';
import type { CreateEnquiryPayload } from '@schoolos/types';

export const NewEnquiryPage = () => {
  const navigate = useNavigate();
  const { mutate: create, isPending } = useCreateEnquiry();

  function handleSubmit(payload: CreateEnquiryPayload) {
    create(payload, {
      onSuccess: (enquiry) => navigate(`/enquiries/${enquiry._id}`),
    });
  }

  return (
    <div className="px-6 py-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate('/enquiries')}
          className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Enquiry</h1>
          <p className="text-sm text-gray-500 mt-0.5">Record a new admission enquiry</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <EnquiryForm
          onSubmit={handleSubmit}
          isPending={isPending}
          submitLabel="Create Enquiry"
        />
      </div>
    </div>
  );
};

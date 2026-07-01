import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { EnquiryForm } from '../components/EnquiryForm';
import { useEnquiry, useUpdateEnquiry } from '../hooks/useEnquiries';
import type { CreateEnquiryPayload } from '@schoolos/types';

export const EditEnquiryPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: enquiry, isLoading } = useEnquiry(id!);
  const { mutate: update, isPending } = useUpdateEnquiry(id!);

  function handleSubmit(payload: CreateEnquiryPayload) {
    update(payload, {
      onSuccess: () => navigate(`/enquiries/${id}`),
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!enquiry) {
    return (
      <div className="flex items-center justify-center py-32">
        <p className="text-gray-500">Enquiry not found.</p>
      </div>
    );
  }

  return (
    <div className="px-6 py-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate(`/enquiries/${id}`)}
          className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Enquiry</h1>
          <p className="text-sm text-gray-500 mt-0.5">{enquiry.studentName}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <EnquiryForm
          defaultValues={enquiry}
          onSubmit={handleSubmit}
          isPending={isPending}
          submitLabel="Save Changes"
        />
      </div>
    </div>
  );
};

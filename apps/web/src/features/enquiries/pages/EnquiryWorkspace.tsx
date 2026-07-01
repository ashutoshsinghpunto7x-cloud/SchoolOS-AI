import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2, ClipboardList } from 'lucide-react';
import { useEnquiries, useEnquiryStageCounts } from '../hooks/useEnquiries';
import { PipelineOverview } from '../components/PipelineOverview';
import { EnquiryFilters } from '../components/EnquiryFilters';
import { EnquiryCard } from '../components/EnquiryCard';
import type { EnquiryStage } from '@schoolos/types';
import type { EnquiryFiltersState } from '../components/EnquiryFilters';

const EMPTY_FILTERS: EnquiryFiltersState = {
  search: '',
  stage: '',
  source: '',
  interestedClass: '',
};

export const EnquiryWorkspace = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<EnquiryFiltersState>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const { data: stageCounts = [], isLoading: stageLoading } = useEnquiryStageCounts();
  const { data, isLoading, isFetching } = useEnquiries({
    page,
    limit: 18,
    search:          filters.search   || undefined,
    stage:           filters.stage    || undefined,
    source:          filters.source   || undefined,
    interestedClass: filters.interestedClass || undefined,
  });

  const enquiries = data?.data ?? [];
  const total     = data?.meta?.total ?? 0;
  const totalPages = Math.ceil(total / 18) || 1;

  function handleStageSelect(stage: EnquiryStage | '') {
    setFilters((f) => ({ ...f, stage }));
    setPage(1);
  }

  function handleFilterChange(next: EnquiryFiltersState) {
    setFilters(next);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admissions CRM</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track and manage all admission enquiries</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/enquiries/new')}
          className="flex items-center gap-2 h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-700
                     text-sm font-bold text-white transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Enquiry
        </button>
      </div>

      {/* Pipeline overview */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <PipelineOverview
          counts={stageCounts}
          isLoading={stageLoading}
          selectedStage={filters.stage}
          onStageSelect={handleStageSelect}
        />
      </div>

      {/* Filters */}
      <EnquiryFilters filters={filters} onChange={handleFilterChange} />

      {/* Results info */}
      <div className="flex items-center justify-between -mb-2">
        <p className="text-sm text-gray-500">
          {isLoading ? 'Loading…' : `${total} enquir${total === 1 ? 'y' : 'ies'} found`}
          {isFetching && !isLoading && (
            <Loader2 className="inline-block ml-2 w-3.5 h-3.5 animate-spin text-blue-500" />
          )}
        </p>
        {totalPages > 1 && (
          <p className="text-sm text-gray-400">Page {page} of {totalPages}</p>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
        </div>
      ) : enquiries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <ClipboardList className="w-12 h-12 text-gray-300" />
          <p className="text-base font-semibold text-gray-400">No enquiries found</p>
          <p className="text-sm text-gray-400">
            {filters.search || filters.stage || filters.source || filters.interestedClass
              ? 'Try adjusting the filters above.'
              : 'Click "New Enquiry" to add the first one.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {enquiries.map((enquiry) => (
            <EnquiryCard key={enquiry._id} enquiry={enquiry} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="h-9 px-4 rounded-xl border border-gray-200 text-sm font-semibold
                       text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            Previous
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={`h-9 w-9 rounded-xl text-sm font-bold transition-colors ${
                  p === page
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {p}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="h-9 px-4 rounded-xl border border-gray-200 text-sm font-semibold
                       text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

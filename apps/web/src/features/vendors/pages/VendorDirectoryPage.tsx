import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Search, Download, Loader2, Store } from 'lucide-react';
import { useVendorList } from '../hooks/useVendors';
import { VendorFormModal } from '../components/VendorFormModal';
import type { VendorCategory, VendorStatus } from '@schoolos/types';
import { cn } from '@/lib/utils';

const CATEGORIES: { value: 'all' | VendorCategory; label: string }[] = [
  { value: 'all',         label: 'All' },
  { value: 'supplies',    label: 'Supplies' },
  { value: 'services',    label: 'Services' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'utilities',   label: 'Utilities' },
  { value: 'other',       label: 'Other' },
];

export function VendorDirectoryPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | VendorCategory>('all');
  const [status, setStatus] = useState<'all' | VendorStatus>('active');
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useVendorList({
    search: search.trim() || undefined,
    category: category === 'all' ? undefined : category,
    status: status === 'all' ? undefined : status,
    limit: 100,
  });

  function exportToCsv() {
    const vendors = data?.data ?? [];
    const header = ['Name', 'Category', 'Status', 'Contact Person', 'Phone', 'Email', 'GST Number'];
    const rows = vendors.map((v) => [v.name, v.category, v.status, v.contactPerson ?? '', v.phone ?? '', v.email ?? '', v.gstNumber ?? '']);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendors-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const vendors = data?.data ?? [];

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/accountant')} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors lg:hidden">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-gray-900">Vendors</h1>
          <p className="text-xs text-gray-500">Suppliers and service providers the school buys from</p>
        </div>
        <button
          onClick={exportToCsv}
          disabled={!vendors.length}
          className="h-9 px-3 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" /> Export
        </button>
        <button
          onClick={() => setShowForm(true)}
          className="h-9 px-3 bg-[#5B21B6] hover:bg-[#4C1D95] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> Add Vendor
        </button>
      </div>

      <div className="px-4 py-4 max-w-5xl mx-auto space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vendors…"
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 focus:border-[#5B21B6]"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'all' | VendorStatus)}
            className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All statuses</option>
          </select>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setCategory(value)}
              className={cn('px-3.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors', category === value ? 'bg-[#5B21B6] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50')}
            >
              {label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="h-64 bg-white rounded-2xl border border-gray-200 animate-pulse flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : !vendors.length ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
            <Store className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700">No vendors found</p>
            <button onClick={() => setShowForm(true)} className="mt-3 h-9 px-4 bg-[#5B21B6] hover:bg-[#4C1D95] text-white rounded-xl text-xs font-semibold">
              Add your first vendor
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-[10px] text-gray-400 uppercase tracking-wide">
                  <th className="text-left font-semibold px-3 py-2.5">Vendor</th>
                  <th className="text-left font-semibold px-3 py-2.5">Category</th>
                  <th className="text-left font-semibold px-3 py-2.5">Contact</th>
                  <th className="text-left font-semibold px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {vendors.map((v) => (
                  <tr
                    key={v._id}
                    onClick={() => navigate(`/accountant/vendors/${v._id}`)}
                    className="hover:bg-gray-50/60 cursor-pointer"
                  >
                    <td className="px-3 py-3 font-semibold text-gray-900">{v.name}</td>
                    <td className="px-3 py-3 text-gray-600 capitalize">{v.category}</td>
                    <td className="px-3 py-3 text-gray-500">{v.contactPerson || v.phone || v.email || '—'}</td>
                    <td className="px-3 py-3">
                      <span className={cn('inline-flex items-center rounded-full font-medium text-xs px-2.5 py-1', v.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600')}>
                        {v.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-gray-400">{vendors.length} vendor{vendors.length !== 1 ? 's' : ''}</p>
      </div>

      {showForm && <VendorFormModal onClose={() => setShowForm(false)} onSuccess={(v) => navigate(`/accountant/vendors/${v._id}`)} />}
    </div>
  );
}

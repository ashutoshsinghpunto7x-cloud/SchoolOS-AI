import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Phone, Mail, MapPin, Receipt, IndianRupee, Plus, Edit3 } from 'lucide-react';
import { useVendorProfile, useVendorLedger, useVendorBills } from '../hooks/useVendors';
import { VendorBillModal } from '../components/VendorBillModal';
import { VendorPaymentModal } from '../components/VendorPaymentModal';
import { VendorFormModal } from '../components/VendorFormModal';
import type { VendorLedgerEntry } from '@schoolos/types';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function LedgerRow({ entry }: { entry: VendorLedgerEntry }) {
  return (
    <tr className="hover:bg-gray-50/60">
      <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{fmtDate(entry.date)}</td>
      <td className="px-3 py-2.5 text-sm text-gray-800">
        {entry.description}
        {entry.reference && <span className="text-xs text-gray-400 ml-1.5">({entry.reference})</span>}
      </td>
      <td className="px-3 py-2.5 text-sm text-right text-red-600 font-medium">{entry.debit > 0 ? fmt(entry.debit) : '—'}</td>
      <td className="px-3 py-2.5 text-sm text-right text-green-600 font-medium">{entry.credit > 0 ? fmt(entry.credit) : '—'}</td>
      <td className="px-3 py-2.5 text-sm text-right font-bold text-gray-900">{fmt(entry.runningBalance)}</td>
    </tr>
  );
}

export function VendorProfilePage() {
  const { vendorId } = useParams<{ vendorId: string }>();
  const navigate = useNavigate();
  const [showBillModal, setShowBillModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const { data: profile, isLoading: profileLoading } = useVendorProfile(vendorId ?? '');
  const { data: ledger, isLoading: ledgerLoading } = useVendorLedger(vendorId ?? '');
  const { data: billsPage } = useVendorBills(vendorId ?? '');
  const openBills = (billsPage?.data ?? []).filter((b) => b.status !== 'paid');

  if (profileLoading || !profile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const { vendor, summary } = profile;

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/accountant/vendors')} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-gray-900 truncate">{vendor.name}</h1>
          <p className="text-xs text-gray-500 capitalize">{vendor.category} · {vendor.status}</p>
        </div>
        <button
          onClick={() => setShowEditModal(true)}
          className="h-9 px-3 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 flex items-center gap-1.5"
        >
          <Edit3 className="w-3.5 h-3.5" /> Edit
        </button>
      </div>

      <div className="px-4 py-4 max-w-5xl mx-auto space-y-4">
        {(vendor.contactPerson || vendor.phone || vendor.email || vendor.address) && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
            {vendor.contactPerson && <span className="font-medium text-gray-800">{vendor.contactPerson}</span>}
            {vendor.phone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-gray-400" /> {vendor.phone}</span>}
            {vendor.email && <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-gray-400" /> {vendor.email}</span>}
            {vendor.address && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gray-400" /> {vendor.address}</span>}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
            <p className="text-lg font-bold text-gray-900">{fmt(summary.totalBilled)}</p>
            <p className="text-xs text-gray-500 font-medium">Total Purchases</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
            <p className="text-lg font-bold text-green-600">{fmt(summary.totalPaid)}</p>
            <p className="text-xs text-gray-500 font-medium">Paid</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
            <p className="text-lg font-bold text-red-600">{fmt(summary.outstandingBalance)}</p>
            <p className="text-xs text-gray-500 font-medium">Outstanding</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowBillModal(true)}
            className="flex-1 h-10 bg-[#5B21B6] hover:bg-[#4C1D95] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Record Purchase / Bill
          </button>
          <button
            onClick={() => setShowPaymentModal(true)}
            className="flex-1 h-10 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1.5"
          >
            <IndianRupee className="w-3.5 h-3.5" /> Record Payment
          </button>
        </div>

        <div>
          <h2 className="text-sm font-bold text-gray-900 mb-2">Ledger</h2>
          {ledgerLoading ? (
            <div className="h-40 bg-white rounded-2xl border border-gray-200 animate-pulse flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : !ledger?.entries.length ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
              <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-700">No bills or payments recorded yet</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="bg-gray-50 text-[10px] text-gray-400 uppercase tracking-wide">
                    <th className="text-left font-semibold px-3 py-2.5">Date</th>
                    <th className="text-left font-semibold px-3 py-2.5">Description</th>
                    <th className="text-right font-semibold px-3 py-2.5">Debit</th>
                    <th className="text-right font-semibold px-3 py-2.5">Credit</th>
                    <th className="text-right font-semibold px-3 py-2.5">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {ledger.entries.map((entry) => <LedgerRow key={entry._id} entry={entry} />)}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showBillModal && <VendorBillModal vendor={vendor} onClose={() => setShowBillModal(false)} />}
      {showPaymentModal && <VendorPaymentModal vendor={vendor} openBills={openBills} onClose={() => setShowPaymentModal(false)} />}
      {showEditModal && <VendorFormModal existing={vendor} onClose={() => setShowEditModal(false)} />}
    </div>
  );
}

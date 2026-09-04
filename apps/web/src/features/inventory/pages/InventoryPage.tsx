import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Plus, Search, Boxes, PackagePlus } from 'lucide-react';
import { useInventoryItems } from '../hooks/useInventory';
import { AddInventoryItemModal } from '../components/AddInventoryItemModal';
import { StockMovementModal } from '../components/StockMovementModal';
import type { InventoryItem } from '@schoolos/types';
import { cn } from '@/lib/utils';

export function InventoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [showForm, setShowForm] = useState(searchParams.get('new') === '1');
  const [movementItem, setMovementItem] = useState<InventoryItem | null>(null);

  const { data, isLoading } = useInventoryItems({
    search: search.trim() || undefined,
    lowStock: lowStockOnly || undefined,
    limit: 100,
  });

  const items = data?.data ?? [];

  function closeForm() {
    setShowForm(false);
    if (searchParams.get('new')) setSearchParams({}, { replace: true });
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] p-3 sm:p-6">
      <div className="w-full max-w-[1600px] mx-auto space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Inventory</h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1">Stock on hand across all categories</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="h-12 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by item name or SKU…"
              className="w-full h-11 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => setLowStockOnly((v) => !v)}
            className={cn(
              'h-11 px-4 rounded-xl text-sm font-semibold border transition-colors shrink-0',
              lowStockOnly ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50',
            )}
          >
            Low stock only
          </button>
        </div>

        {isLoading ? (
          <div className="h-64 bg-white rounded-2xl border border-gray-100 animate-pulse flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : !items.length ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
            <Boxes className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-base font-semibold text-gray-700">No items found</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-[10px] text-gray-400 uppercase tracking-wide">
                  <th className="text-left font-semibold px-3 py-2.5">Item</th>
                  <th className="text-left font-semibold px-3 py-2.5">Category</th>
                  <th className="text-left font-semibold px-3 py-2.5">Location</th>
                  <th className="text-right font-semibold px-3 py-2.5">Qty / Min</th>
                  <th className="text-right font-semibold px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item) => {
                  const low = item.qtyAvailable <= item.minStockLevel;
                  return (
                    <tr key={item._id} className="hover:bg-gray-50/60">
                      <td className="px-3 py-3">
                        <div className="font-semibold text-gray-900">{item.itemName}</div>
                        <div className="font-mono text-xs text-gray-400">{item.sku}</div>
                      </td>
                      <td className="px-3 py-3 text-gray-600 capitalize">{item.category.replace(/_/g, ' ')}</td>
                      <td className="px-3 py-3 text-gray-500">{item.storageLocation || '—'}</td>
                      <td className="px-3 py-3 text-right">
                        <span className={cn('inline-flex items-center rounded-full font-mono font-medium text-xs px-2.5 py-1', low ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800')}>
                          {item.qtyAvailable} / {item.minStockLevel}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          onClick={() => setMovementItem(item)}
                          className="h-8 px-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-semibold inline-flex items-center gap-1.5"
                        >
                          <PackagePlus className="w-3.5 h-3.5" /> Adjust
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-gray-400">{items.length} item{items.length !== 1 ? 's' : ''}</p>
      </div>

      {showForm && <AddInventoryItemModal onClose={closeForm} />}
      {movementItem && <StockMovementModal item={movementItem} onClose={() => setMovementItem(null)} />}
    </div>
  );
}

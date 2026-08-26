import { useState } from 'react';
import { toast } from 'sonner';
import { Bus, Plus, Loader2, X, MapPin, Users as UsersIcon } from 'lucide-react';
import {
  useVehicles, useCreateVehicle, useAssignDriver, useAllLiveVehicles, useDrivers,
} from '../hooks/useTransport';
import { AssignStudentsModal } from '../components/AssignStudentsModal';
import { LiveFleetMap } from '../components/LiveMap';
import type { VehicleView } from '../types';

function CreateVehicleModal({ onClose }: { onClose: () => void }) {
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [routeName, setRouteName] = useState('');
  const { mutateAsync: createVehicle, isPending } = useCreateVehicle();

  const submit = async () => {
    if (!vehicleNumber.trim() || !routeName.trim()) {
      toast.error('Vehicle number and route name are required');
      return;
    }
    try {
      await createVehicle({ vehicleNumber: vehicleNumber.trim(), routeName: routeName.trim() });
      toast.success('Vehicle created');
      onClose();
    } catch (err) {
      toast.error('Failed to create vehicle', { description: err instanceof Error ? err.message : undefined });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Add Vehicle</h2>
          <button onClick={onClose} type="button" className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>
        <label className="block text-sm font-bold text-gray-700 mb-1.5">Vehicle Number</label>
        <input
          value={vehicleNumber}
          onChange={(e) => setVehicleNumber(e.target.value)}
          placeholder="e.g. UP32 AB 1234"
          className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-[#5B21B6] focus:border-transparent"
        />
        <label className="block text-sm font-bold text-gray-700 mb-1.5">Route Name</label>
        <input
          value={routeName}
          onChange={(e) => setRouteName(e.target.value)}
          placeholder="e.g. Route 4 — Civil Lines"
          className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm mb-6 focus:outline-none focus:ring-2 focus:ring-[#5B21B6] focus:border-transparent"
        />
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-bold text-gray-700">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={isPending}
            className="flex-1 h-12 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

function VehicleCard({
  vehicle, onAssignStudents,
}: {
  vehicle: VehicleView;
  onAssignStudents: (v: VehicleView) => void;
}) {
  const { data: drivers, isLoading: driversLoading } = useDrivers();
  const { mutateAsync: assignDriver, isPending } = useAssignDriver();
  const { data: live } = useAllLiveVehicles();
  const liveEntry = live?.find((v) => v._id === vehicle._id);

  const handleAssignDriver = async (driverUserId: string) => {
    if (!driverUserId) return;
    try {
      await assignDriver({ vehicleId: vehicle._id, driverUserId });
      toast.success('Driver assigned');
    } catch (err) {
      toast.error('Failed to assign driver', { description: err instanceof Error ? err.message : undefined });
    }
  };

  const routeStatus = liveEntry?.routeStatus;

  return (
    <div className="rounded-2xl border border-gray-100 shadow-sm bg-white p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
            <Bus className="w-5 h-5 text-purple-700" />
          </div>
          <div>
            <p className="text-base font-bold text-gray-900">{vehicle.vehicleNumber}</p>
            <p className="text-sm text-gray-500">{vehicle.routeName}</p>
          </div>
        </div>
        {routeStatus && (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${
            routeStatus === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${routeStatus === 'active' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            {routeStatus === 'active' ? 'Route Active' : 'Route Completed'}
          </span>
        )}
      </div>

      {liveEntry?.updatedAt && (
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
          <MapPin className="w-3.5 h-3.5" />
          Last seen {new Date(liveEntry.updatedAt).toLocaleTimeString()}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <select
          defaultValue={vehicle.driverUserId ?? ''}
          onChange={(e) => void handleAssignDriver(e.target.value)}
          disabled={driversLoading || isPending}
          className="flex-1 h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B21B6] focus:border-transparent"
        >
          <option value="" disabled>{vehicle.driverName ? vehicle.driverName : 'Assign a driver…'}</option>
          {drivers?.map((d) => (
            <option key={d._id} value={d._id}>{d.firstName} {d.lastName}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onAssignStudents(vehicle)}
          className="h-10 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-bold text-gray-700 flex items-center justify-center gap-2 shrink-0"
        >
          <UsersIcon className="w-4 h-4" /> Assign Students
        </button>
      </div>
    </div>
  );
}

export function TransportManagementPage() {
  const { data: vehicles, isLoading } = useVehicles();
  const { data: live } = useAllLiveVehicles();
  const [showCreate, setShowCreate] = useState(false);
  const [assignStudentsFor, setAssignStudentsFor] = useState<VehicleView | null>(null);

  const activeFleet = (live ?? [])
    .filter((v) => v.routeStatus === 'active' && v.latitude != null && v.longitude != null)
    .map((v) => ({ _id: v._id, latitude: v.latitude!, longitude: v.longitude!, label: `${v.vehicleNumber} · ${v.routeName}` }));

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Transport Management</h1>
            <p className="text-sm text-gray-500 mt-1">Vehicles, drivers, student assignments, and live status.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="h-11 px-4 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] text-sm font-bold text-white flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Vehicle
          </button>
        </div>

        {activeFleet.length > 0 && (
          <section className="rounded-2xl border border-gray-100 shadow-sm bg-white p-2">
            <LiveFleetMap vehicles={activeFleet} />
          </section>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : !vehicles || vehicles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
            <Bus className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No vehicles yet. Add one to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vehicles.map((v) => (
              <VehicleCard key={v._id} vehicle={v} onAssignStudents={setAssignStudentsFor} />
            ))}
          </div>
        )}
      </div>

      {showCreate && <CreateVehicleModal onClose={() => setShowCreate(false)} />}
      {assignStudentsFor && (
        <AssignStudentsModal vehicle={assignStudentsFor} onClose={() => setAssignStudentsFor(null)} />
      )}
    </div>
  );
}

export default TransportManagementPage;

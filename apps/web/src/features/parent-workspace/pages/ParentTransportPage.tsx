import { motion } from 'framer-motion';
import { Bus, Clock, MapPinOff } from 'lucide-react';
import { useParentWorkspace } from '../hooks/useParentWorkspace';
import { ParentScreenHeader } from '../components/ParentScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { useParentLiveLocation } from '@/features/transport/hooks/useTransport';
import { LiveMap } from '@/features/transport/components/LiveMap';

const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

export function ParentTransportPage() {
  const { data: workspace, activeChild, isLoading: workspaceLoading, setActiveChildId } = useParentWorkspace();
  const { data: live, isLoading: liveLoading } = useParentLiveLocation(activeChild?._id);

  if (workspaceLoading || (liveLoading && !live)) {
    return (
      <div className="min-h-screen bg-[#F5F5F7]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5" aria-busy="true">
          <div className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          <div className="h-80 bg-gray-100 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!activeChild) {
    return (
      <div className="min-h-screen bg-[#F5F5F7]">
        <EmptyState
          icon={Bus}
          title="No children linked yet"
          description="Ask the school office to link your child's profile to this account."
        />
      </div>
    );
  }

  const isActive = live?.available && live.routeStatus === 'active';

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <ParentScreenHeader
        title="Live Bus Tracking"
        subtitle={`${activeChild.name}'s van`}
        children={workspace?.children}
        activeChild={activeChild}
        onSelectChild={setActiveChildId}
      />

      <motion.main
        initial="hidden"
        animate="show"
        transition={{ staggerChildren: 0.05 }}
        className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5"
      >
        {!live?.available ? (
          <motion.div variants={fadeUp} transition={{ duration: 0.25 }}>
            <EmptyState
              icon={MapPinOff}
              title="Vehicle tracking is currently unavailable."
              description="Your child isn't assigned to a vehicle yet, or the driver hasn't started today's route."
            />
          </motion.div>
        ) : (
          <>
            <motion.section
              variants={fadeUp}
              transition={{ duration: 0.25 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5 sm:px-6 sm:py-6"
            >
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                    <Bus className="w-5 h-5 text-purple-700" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">{live.vehicleNumber}</p>
                    <p className="text-sm text-gray-500">{live.routeName} · Driver {live.driverName ?? '—'}</p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold shrink-0 ${
                    isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                  {isActive ? 'Route Active' : 'Route Completed'}
                </span>
              </div>

              {live.updatedAt && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3.5 h-3.5" />
                  Last updated {new Date(live.updatedAt).toLocaleTimeString()}
                </div>
              )}
            </motion.section>

            {live.latitude != null && live.longitude != null && (
              <motion.section variants={fadeUp} transition={{ duration: 0.25 }}>
                <LiveMap latitude={live.latitude} longitude={live.longitude} popupLabel={live.vehicleNumber} height={360} />
              </motion.section>
            )}
          </>
        )}
      </motion.main>
    </div>
  );
}

export default ParentTransportPage;

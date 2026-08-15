import { motion } from 'framer-motion';
import {
  Users,
  Headphones,
  MessageCircle,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useParentWorkspace } from '../hooks/useParentWorkspace';
import { ParentScreenHeader } from '../components/ParentScreenHeader';

const SUPPORT_PHONE = '9936860026';

const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

function MenuRow({
  icon: Icon,
  label,
  sub,
  onClick,
  danger,
}: {
  icon: React.ElementType;
  label: string;
  sub?: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl bg-white border border-gray-100 shadow-sm transition-colors ${
        danger ? 'hover:bg-red-50' : 'hover:bg-gray-50'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${danger ? 'bg-red-50' : 'bg-purple-50'}`}>
        <Icon className={`w-5 h-5 ${danger ? 'text-red-600' : 'text-purple-700'}`} strokeWidth={1.75} />
      </div>
      <span className="flex-1 min-w-0 text-left">
        <span className={`block text-base font-semibold ${danger ? 'text-red-600' : 'text-gray-900'}`}>{label}</span>
        {sub && <span className="block text-sm text-gray-500 mt-0.5">{sub}</span>}
      </span>
      {!danger && <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" strokeWidth={2} />}
    </button>
  );
}

export function MorePage() {
  const { user, logout } = useAuth();
  const { data: workspace } = useParentWorkspace();

  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : workspace?.parent.name ?? 'Parent';
  const initials = fullName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <ParentScreenHeader title="More" subtitle="Account, children and support" />

      <motion.main
        initial="hidden"
        animate="show"
        transition={{ staggerChildren: 0.05 }}
        className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5"
      >
        <motion.div
          variants={fadeUp}
          transition={{ duration: 0.25 }}
          className="rounded-2xl p-6 text-center text-white"
          style={{ background: 'linear-gradient(160deg, #4C1D95 0%, #7C3AED 45%, #A855F7 100%)' }}
        >
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
            <span className="text-xl font-bold">{initials}</span>
          </div>
          <h2 className="text-xl font-bold">{fullName}</h2>
          {user?.email && <p className="text-white/70 text-sm mt-1">{user.email}</p>}
        </motion.div>

        {workspace && workspace.children.length > 0 && (
          <motion.section variants={fadeUp} transition={{ duration: 0.25 }} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5 sm:px-6 sm:py-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-purple-700" strokeWidth={1.75} />
              <p className="text-lg font-bold text-gray-900">Linked children</p>
            </div>
            <div className="space-y-3">
              {workspace.children.map((c) => (
                <div key={c._id} className="flex items-center justify-between gap-3 py-2">
                  <div>
                    <p className="text-base text-gray-900">{c.name}</p>
                    <p className="text-sm text-gray-500 mt-0.5">Grade {c.grade} · Section {c.section}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        <motion.div variants={fadeUp} transition={{ duration: 0.25 }} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => { window.location.href = `tel:${SUPPORT_PHONE}`; }}
            className="flex-1 min-w-0 flex items-center gap-3 text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
              <Headphones className="w-5 h-5 text-purple-700" strokeWidth={1.75} />
            </div>
            <span className="flex-1 min-w-0">
              <span className="block text-base font-semibold text-gray-900">Contact Support</span>
              <span className="block text-sm text-gray-500 mt-0.5">{SUPPORT_PHONE}</span>
            </span>
          </button>
          <a
            href={`https://wa.me/91${SUPPORT_PHONE}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat on WhatsApp"
            className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 hover:bg-emerald-100 transition-colors"
          >
            <MessageCircle className="w-5 h-5 text-emerald-600" strokeWidth={1.75} />
          </a>
        </motion.div>

        <motion.div variants={fadeUp} transition={{ duration: 0.25 }}>
          <MenuRow icon={LogOut} label="Log Out" onClick={() => void logout()} danger />
        </motion.div>
      </motion.main>
    </div>
  );
}

export default MorePage;

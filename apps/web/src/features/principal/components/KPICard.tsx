import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  onClick?: () => void;
  delay?: number;
}

export const KPICard = ({ title, value, subtitle, onClick, delay = 0 }: KPICardProps) => {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={cn(
        'bg-white rounded-[18px] border border-[#E8E8E8] shadow-[0_4px_24px_rgba(0,0,0,0.015)] p-6 text-left',
        'hover:border-[#10B981]/25 hover:shadow-[0_8px_30px_rgba(16,185,129,0.03)] transition-all duration-300',
        'flex flex-col justify-between h-[180px] w-full',
      )}
    >
      <div className="space-y-4">
        <p className="text-[12px] font-semibold text-gray-400 tracking-wide uppercase">{title}</p>
        <p
          title={String(value)}
          className="text-[34px] font-semibold text-gray-900 tracking-tight leading-none truncate"
        >
          {value}
        </p>
      </div>
      <p className="text-[12px] font-semibold text-gray-400">{subtitle}</p>
    </motion.button>
  );
};

export const KPICardSkeleton = () => (
  <div className="bg-white rounded-[18px] border border-[#E8E8E8] shadow-[0_4px_24px_rgba(0,0,0,0.015)] p-6 h-[180px] flex flex-col justify-between animate-pulse">
    <div className="space-y-4">
      <div className="h-3 w-24 bg-gray-100 rounded" />
      <div className="h-10 w-32 bg-gray-100 rounded-md" />
    </div>
    <div className="h-3 w-20 bg-gray-100 rounded" />
  </div>
);

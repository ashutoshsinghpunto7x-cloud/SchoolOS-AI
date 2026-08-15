import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChildSummary } from '../types';

interface ChildSwitcherProps {
  children: ChildSummary[];
  activeChild: ChildSummary;
  onSelect: (id: string) => void;
}

export function ChildSwitcher({ children, activeChild, onSelect }: ChildSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (children.length <= 1) {
    return (
      <div>
        <p className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">{activeChild.name}</p>
        <p className="text-sm text-gray-500 mt-0.5">
          Grade {activeChild.grade} · Section {activeChild.section}
        </p>
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 group text-left rounded-lg -m-1 p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40"
      >
        <div>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight group-hover:opacity-70 transition-opacity">
            {activeChild.name}
          </p>
          <p className="text-sm text-gray-500 mt-0.5">
            Grade {activeChild.grade} · Section {activeChild.section}
          </p>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 mt-1 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          strokeWidth={2}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            role="listbox"
            className="absolute left-0 top-full mt-2 w-72 max-w-[85vw] bg-white rounded-xl border border-gray-100 shadow-lg py-1.5 z-30"
          >
            {children.map((child) => {
              const isActive = child._id === activeChild._id;
              return (
                <button
                  key={child._id}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => {
                    onSelect(child._id);
                    setOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 text-left hover:bg-gray-50 transition-colors"
                >
                  <span>
                    <span className="block text-base text-gray-900">{child.name}</span>
                    <span className="block text-sm text-gray-500">
                      Grade {child.grade} · Section {child.section}
                    </span>
                  </span>
                  {isActive && <Check className="w-4 h-4 text-purple-600 shrink-0 ml-2" strokeWidth={2.5} />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

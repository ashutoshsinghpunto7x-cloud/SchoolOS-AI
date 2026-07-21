import { Outlet, NavLink } from 'react-router-dom';
import homeIcon from '@/assets/illustrations/teacher/Home-icon.png';
import classesIcon from '@/assets/illustrations/teacher/Classes-icon.png';
import historyIcon from '@/assets/illustrations/teacher/History-icon.png';
import timetableIcon from '@/assets/illustrations/teacher/Timetable-icon.png';
import messagesIcon from '@/assets/illustrations/teacher/Message Logo.png';

// Each of these source PNGs is a transparent square canvas where the actual
// glyph only fills a small, off-center fraction of it (huge invisible
// padding around it) — so a plain resize renders tiny no matter what display
// size is set. `crop` is the oversized, absolutely-positioned <img> box (in
// px, relative to a `w-[26px] h-[26px] overflow-hidden` wrapper) needed to
// zoom into just the glyph's real bounding box, measured pixel-for-pixel
// from each source file via a canvas alpha scan. Recompute these (same
// method) if any of these source images are ever replaced. Timetable-icon.png
// is a processed version of the original Timetable.png — that source baked
// in an opaque dark-purple background instead of real alpha, so the pixels
// were re-exported with alpha derived from luminance (bright glyph → opaque,
// dark background glow → transparent) before this same crop trick applies.
interface CropBox { w: number; h: number; left: number; top: number }

interface NavEntry {
  to: string;
  image: string;
  /** Crop box for a transparent icon with padding (see CropBox above). */
  crop?: CropBox;
  label: string;
  end: boolean;
}

const NAV: NavEntry[] = [
  { to: '/teacher',           image: homeIcon,      crop: { w: 57, h: 85, left: -16, top: -29 }, label: 'Home',      end: true  },
  { to: '/teacher/classes',   image: classesIcon,   crop: { w: 43, h: 65, left: -10, top: -17 }, label: 'Classes',   end: false },
  { to: '/teacher/history',   image: historyIcon,   crop: { w: 51, h: 76, left: -13, top: -24 }, label: 'History',   end: false },
  { to: '/teacher/timetable', image: timetableIcon, crop: { w: 36, h: 36, left: -5, top: -4 },    label: 'Timetable', end: false },
  { to: '/teacher/messages',  image: messagesIcon,  crop: { w: 48, h: 48, left: -12, top: -10 }, label: 'Messages',  end: false },
];

export function TeacherLayout() {
  return (
    <>
      {/* On phones the teacher portal fills the viewport edge-to-edge; from
          tablet width up it's centered in a phone-width column instead of
          stretching hero cards and the pill nav across a tablet/desktop/
          monitor screen. */}
      <div className="pb-24 sm:mx-auto sm:max-w-md sm:min-h-screen sm:border-x sm:border-gray-100 sm:shadow-[0_0_60px_rgba(0,0,0,0.04)] dark:sm:border-white/5">
        <Outlet />
      </div>

      {/* Floating pill nav — the teacher portal has no sidebar, so this is
          the only nav and stays visible on every breakpoint. */}
      <nav
        aria-label="Teacher navigation"
        className="fixed bottom-0 inset-x-0 z-40 sm:mx-auto sm:max-w-md"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center h-16 px-2 rounded-full bg-white/90 dark:bg-[#0F0821]/90 backdrop-blur-xl border border-gray-100 dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
          {NAV.map(({ to, image, crop, label, end }) => (
            <NavLink key={to} to={to} end={end} className="flex-1">
              {({ isActive }) => (
                <div className="flex flex-col items-center gap-0.5 py-1.5">
                  <div
                    className={`w-12 h-8 rounded-full flex items-center justify-center transition-transform duration-300 ease-out ${
                      isActive ? 'scale-125 -translate-y-1' : 'scale-100'
                    }`}
                  >
                    {/* No background pill behind the icon on the active tab —
                        it covered up the icon's own colors/artwork. Scaling
                        the icon itself up (plus the label turning purple/bold
                        below) is the active indicator instead. */}
                    <div className="relative w-[26px] h-[26px] overflow-hidden shrink-0">
                      <img
                        src={image}
                        alt=""
                        className="absolute max-w-none"
                        style={crop && {
                          width: `${crop.w}px`, height: `${crop.h}px`,
                          left: `${crop.left}px`, top: `${crop.top}px`,
                        }}
                      />
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-semibold tracking-wide transition-colors duration-200 ${
                      isActive ? 'text-[#5B21B6] dark:text-violet-300' : 'text-gray-400 dark:text-white/40'
                    }`}
                  >
                    {label}
                  </span>
                </div>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}

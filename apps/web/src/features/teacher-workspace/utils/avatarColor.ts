// A rotating palette of tints so a class roster reads as a lively group of
// individuals rather than a wall of identical circles — colors are picked
// deterministically from a stable key (student id) so each student keeps
// the same color across renders/sessions.
const AVATAR_PALETTE = [
  { bg: 'bg-blue-100',   text: 'text-blue-600'   },
  { bg: 'bg-orange-100', text: 'text-orange-600' },
  { bg: 'bg-pink-100',   text: 'text-pink-600'   },
  { bg: 'bg-violet-100', text: 'text-violet-600' },
  { bg: 'bg-teal-100',   text: 'text-teal-600'   },
  { bg: 'bg-amber-100',  text: 'text-amber-600'  },
  { bg: 'bg-rose-100',   text: 'text-rose-600'   },
  { bg: 'bg-indigo-100', text: 'text-indigo-600' },
];

export function avatarColorFor(key: string) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

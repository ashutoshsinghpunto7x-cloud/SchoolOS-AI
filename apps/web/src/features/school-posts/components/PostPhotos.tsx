import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ImageOff, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { schoolPostsApi } from '../api/school-posts.api';

function Photo({ postId, photoId, alt, onOpen, className }: {
  postId: string;
  photoId: string;
  alt: string;
  onOpen: (url: string) => void;
  className?: string;
}) {
  const { data: blob, isError } = useQuery({
    queryKey: ['school-post-photo', postId, photoId],
    queryFn: () => schoolPostsApi.getPhoto(postId, photoId),
    staleTime: Infinity,
  });
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    if (!blob) return;
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);

  if (!url) {
    return (
      <div className={cn('bg-[#F1ECE2] rounded-xl flex items-center justify-center', !isError && 'animate-pulse', className)}>
        {isError && <ImageOff className="w-5 h-5 text-[#8A93A8]" aria-label="Photo could not be loaded" />}
      </div>
    );
  }

  return (
    <button type="button" onClick={() => onOpen(url)} className={cn('rounded-xl overflow-hidden cursor-pointer', className)}>
      <img src={url} alt={alt} className="w-full h-full object-cover" />
    </button>
  );
}

export function PostPhotos({ postId, photoIds, title }: { postId: string; photoIds: string[]; title: string }) {
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (photoIds.length === 0) return null;

  return (
    <>
      <div className={cn('grid gap-2 mt-3', photoIds.length === 1 ? 'grid-cols-1 sm:max-w-md' : 'grid-cols-2 sm:grid-cols-4')}>
        {photoIds.map((photoId, i) => (
          <Photo
            key={photoId}
            postId={postId}
            photoId={photoId}
            alt={`${title} — photo ${i + 1}`}
            onOpen={setOpen}
            className={photoIds.length === 1 ? 'aspect-[16/10]' : 'aspect-square'}
          />
        ))}
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="fixed inset-0 z-[70] bg-black/85 flex items-center justify-center p-4"
          onClick={() => setOpen(null)}
        >
          <img src={open} alt={title} className="max-w-full max-h-full rounded-lg" />
          <button
            type="button"
            onClick={() => setOpen(null)}
            aria-label="Close photo"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </>
  );
}

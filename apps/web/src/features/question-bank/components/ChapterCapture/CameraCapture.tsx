import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, X, RotateCcw, Check } from 'lucide-react';
import { toast } from 'sonner';

interface CameraCaptureProps {
  /** Called once per "Use Photo" tap — the caller decides whether to keep capturing or close. */
  onCapture: (file: File) => void;
  onClose: () => void;
}

/**
 * getUserMedia + canvas snapshot — no native <input capture> reliance, so the
 * teacher can review each shot before it's added and keep capturing
 * page-after-page without the camera app closing between shots (deliverable
 * "Continue capturing" / "Capture another page").
 */
export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pagesThisSession, setPagesThisSession] = useState(0);

  const startStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setError(null);
    } catch (err) {
      setError('Could not access the camera — check permissions, or use "Choose from gallery" instead.');
    }
  }, []);

  useEffect(() => {
    startStream();
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, [startStream]);

  function handleShutter() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setPreviewDataUrl(canvas.toDataURL('image/jpeg', 0.92));
  }

  function handleRetake() {
    setPreviewDataUrl(null);
  }

  async function handleUsePhoto() {
    if (!previewDataUrl) return;
    const res = await fetch(previewDataUrl);
    const blob = await res.blob();
    const file = new File([blob], `page-${Date.now()}.jpg`, { type: 'image/jpeg' });
    onCapture(file);
    setPagesThisSession((n) => n + 1);
    setPreviewDataUrl(null);
    toast.success(`Page ${pagesThisSession + 1} captured — capture another or tap Done`);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm font-medium">{pagesThisSession} page{pagesThisSession === 1 ? '' : 's'} captured</span>
        <button type="button" onClick={onClose} className="p-2 -mr-2" aria-label="Close camera">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {error ? (
          <p className="text-white/70 text-sm text-center px-8">{error}</p>
        ) : previewDataUrl ? (
          <img src={previewDataUrl} alt="Captured page preview" className="max-h-full max-w-full object-contain" />
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className="max-h-full max-w-full object-contain" />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="px-6 py-6 flex items-center justify-center gap-6">
        {previewDataUrl ? (
          <>
            <button
              type="button" onClick={handleRetake}
              className="flex flex-col items-center gap-1.5 text-white/80"
            >
              <span className="w-14 h-14 rounded-full border-2 border-white/40 flex items-center justify-center"><RotateCcw className="w-5 h-5" /></span>
              <span className="text-xs">Retake</span>
            </button>
            <button
              type="button" onClick={handleUsePhoto}
              className="flex flex-col items-center gap-1.5 text-white"
            >
              <span className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center"><Check className="w-7 h-7" /></span>
              <span className="text-xs font-semibold">Use Photo</span>
            </button>
          </>
        ) : (
          <button
            type="button" onClick={handleShutter} disabled={!!error}
            className="w-16 h-16 rounded-full bg-white flex items-center justify-center disabled:opacity-40"
            aria-label="Capture page"
          >
            <Camera className="w-6 h-6 text-black" />
          </button>
        )}
      </div>

      {pagesThisSession > 0 && !previewDataUrl && (
        <div className="px-6 pb-6 -mt-2 flex justify-center">
          <button type="button" onClick={onClose} className="text-white/70 text-sm font-medium underline">
            Done capturing — review {pagesThisSession} page{pagesThisSession === 1 ? '' : 's'}
          </button>
        </div>
      )}
    </div>
  );
}

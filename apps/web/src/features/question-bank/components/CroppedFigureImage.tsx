import { useState } from 'react';
import type { BoundingBox } from '@schoolos/types';

/**
 * Renders a fractional crop (see BoundingBox) of a full page image without any server-side image
 * processing — the server hands over the whole page as a data URI (see
 * image-resolution.ts/ResolvedQuestionImage) and this crops it purely with CSS, the same "no
 * image-processing library involved" approach GeneratedPaper.resolvedImages' doc comment
 * describes.
 *
 * The crop math (see the width/left/top percentages below) resolves to the exact right numbers
 * regardless of the image's real pixel dimensions — only the *container's* aspect ratio (so the
 * crop doesn't leave blank space above/below it) needs the image's actual natural width/height,
 * which isn't known until the image has loaded. `naturalSize` corrects that ratio once `onLoad`
 * fires; before that, the fallback ratio (the bounding box's own fraction) is usually close enough
 * that teachers won't notice the brief adjustment.
 */
export function CroppedFigureImage({
  dataUri, boundingBox, blackAndWhite, className, style,
}: {
  dataUri: string;
  boundingBox: BoundingBox;
  blackAndWhite?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);

  const aspectRatio = naturalSize
    ? (naturalSize.w * boundingBox.width) / (naturalSize.h * boundingBox.height)
    : boundingBox.width / boundingBox.height;

  return (
    <div
      className={className}
      style={{ position: 'relative', overflow: 'hidden', width: '100%', aspectRatio: String(aspectRatio || 1), background: '#F3F4F6', ...style }}
    >
      <img
        src={dataUri}
        alt=""
        onLoad={(e) => setNaturalSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
        style={{
          position: 'absolute',
          width: `${100 / boundingBox.width}%`,
          maxWidth: 'none',
          left: `${-(boundingBox.x / boundingBox.width) * 100}%`,
          top: `${-(boundingBox.y / boundingBox.height) * 100}%`,
          filter: blackAndWhite ? 'grayscale(1)' : undefined,
        }}
      />
    </div>
  );
}

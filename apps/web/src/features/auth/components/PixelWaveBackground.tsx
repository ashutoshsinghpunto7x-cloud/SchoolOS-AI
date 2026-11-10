import { useEffect, useRef } from 'react';

export interface PixelWaveBackgroundProps {
  className?: string;
  variant?: 'dark' | 'light' | 'blended';
  direction?: 'forward' | 'reverse';
}

export function PixelWaveBackground({
  className = '',
  variant = 'dark',
  direction = 'forward',
}: PixelWaveBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let time = 0;

    // Drifting lift-off spark particles
    const sparks: Array<{
      x: number;
      y: number;
      size: number;
      vx: number;
      vy: number;
      alpha: number;
      maxLife: number;
      life: number;
      color: string;
    }> = [];

    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx?.scale(dpr, dpr);
    }

    resize();
    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas);

    // Grid spacing for pixels
    const SPACING = 24;

    function render() {
      if (!ctx || width === 0 || height === 0) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      time += 0.022;

      ctx.clearRect(0, 0, width, height);

      const cols = Math.ceil(width / SPACING) + 2;
      const rows = Math.ceil(height / SPACING) + 2;

      const isReverse = direction === 'reverse';
      const isBlended = variant === 'blended';
      const isLight = variant === 'light';

      // Draw the wave grid of pixels
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const baseX = c * SPACING;
          const baseY = r * SPACING;

          // Diagonal traveling wave equation
          // forward: bottom-left to top-right
          // reverse: top-right to bottom-left (mirrored opposite wave)
          const diag = isReverse
            ? (-baseX * 0.0045 + baseY * 0.0055) + time
            : (baseX * 0.0045 - baseY * 0.0055) + time;

          const secondary = isReverse
            ? Math.cos(-baseX * 0.003 - baseY * 0.004 - time * 0.6)
            : Math.cos(baseX * 0.003 + baseY * 0.004 - time * 0.6);

          // Combined wave height [-1, 1]
          const wave = Math.sin(diag) * 0.7 + secondary * 0.3;
          const intensity = Math.max(0, (wave + 0.9) / 1.9);
          const crest = Math.pow(Math.max(0, wave), 2.2);

          // Determine light/dark blend ratio at this X coordinate [0 = 100% dark, 1 = 100% light]
          const lightRatio = isBlended
            ? Math.min(Math.max((baseX / width - 0.32) / 0.36, 0), 1)
            : isLight
            ? 1
            : 0;

          // Pixels "lift" upward vertically when the wave crest hits
          const liftMax = 26 - lightRatio * 6;
          const liftY = -crest * liftMax;
          const driftX = (isReverse ? -1 : 1) * crest * 8;

          const drawX = baseX + driftX;
          const drawY = baseY + liftY;

          // Size expands when lifted
          const pixelSize = (2.2 - lightRatio * 0.2) + crest * (3.8 - lightRatio * 0.6);

          // Color calculation
          if (lightRatio > 0.8) {
            // Light paper canvas palette (Navy, Slate & Saffron)
            if (crest > 0.45) {
              const alpha = 0.25 + crest * 0.45;
              ctx.fillStyle = `rgba(217, 130, 43, ${alpha.toFixed(3)})`;
              ctx.shadowColor = 'rgba(217, 130, 43, 0.4)';
              ctx.shadowBlur = 5 * crest;
            } else if (crest > 0.15) {
              const alpha = 0.12 + crest * 0.25;
              ctx.fillStyle = `rgba(37, 74, 154, ${alpha.toFixed(3)})`;
              ctx.shadowColor = 'rgba(37, 74, 154, 0.2)';
              ctx.shadowBlur = 3 * crest;
            } else {
              const alpha = 0.04 + intensity * 0.07;
              ctx.fillStyle = `rgba(27, 42, 78, ${alpha.toFixed(3)})`;
              ctx.shadowBlur = 0;
            }
          } else if (lightRatio < 0.2) {
            // Dark navy palette (Amber, Cyan & Indigo)
            if (crest > 0.45) {
              const alpha = 0.35 + crest * 0.55;
              ctx.fillStyle = `rgba(245, 179, 50, ${alpha.toFixed(3)})`;
              ctx.shadowColor = 'rgba(245, 179, 50, 0.6)';
              ctx.shadowBlur = 6 * crest;
            } else if (crest > 0.15) {
              const alpha = 0.2 + crest * 0.4;
              ctx.fillStyle = `rgba(96, 165, 250, ${alpha.toFixed(3)})`;
              ctx.shadowColor = 'rgba(96, 165, 250, 0.4)';
              ctx.shadowBlur = 4 * crest;
            } else {
              const alpha = 0.07 + intensity * 0.12;
              ctx.fillStyle = `rgba(148, 163, 184, ${alpha.toFixed(3)})`;
              ctx.shadowBlur = 0;
            }
          } else {
            // Smooth transitional blend in the middle zone
            const t = (lightRatio - 0.2) / 0.6; // 0 to 1
            if (crest > 0.45) {
              // Blend from amber (245, 179, 50) to saffron (217, 130, 43)
              const rCol = Math.round(245 - t * 28);
              const gCol = Math.round(179 - t * 49);
              const bCol = Math.round(50 - t * 7);
              const alpha = (0.35 - t * 0.1) + crest * 0.5;
              ctx.fillStyle = `rgba(${rCol}, ${gCol}, ${bCol}, ${alpha.toFixed(3)})`;
              ctx.shadowColor = `rgba(${rCol}, ${gCol}, ${bCol}, 0.5)`;
              ctx.shadowBlur = 5 * crest;
            } else if (crest > 0.15) {
              // Blend from cyan/blue (96, 165, 250) to navy (37, 74, 154)
              const rCol = Math.round(96 - t * 59);
              const gCol = Math.round(165 - t * 91);
              const bCol = Math.round(250 - t * 96);
              const alpha = (0.2 - t * 0.08) + crest * 0.3;
              ctx.fillStyle = `rgba(${rCol}, ${gCol}, ${bCol}, ${alpha.toFixed(3)})`;
              ctx.shadowColor = `rgba(${rCol}, ${gCol}, ${bCol}, 0.3)`;
              ctx.shadowBlur = 3 * crest;
            } else {
              // Blend from slate (148, 163, 184) to dark slate (27, 42, 78)
              const rCol = Math.round(148 - t * 121);
              const gCol = Math.round(163 - t * 121);
              const bCol = Math.round(184 - t * 106);
              const alpha = (0.07 - t * 0.03) + intensity * 0.09;
              ctx.fillStyle = `rgba(${rCol}, ${gCol}, ${bCol}, ${alpha.toFixed(3)})`;
              ctx.shadowBlur = 0;
            }
          }

          ctx.fillRect(
            drawX - pixelSize / 2,
            drawY - pixelSize / 2,
            pixelSize,
            pixelSize
          );

          // Occasionally spawn a floating lifting particle spark from wave crests
          if (crest > 0.82 && Math.random() < 0.0035 && sparks.length < 35) {
            sparks.push({
              x: drawX,
              y: drawY,
              size: 1.8 + Math.random() * 2.2,
              vx: (isReverse ? -1 : 1) * (0.3 + Math.random() * 0.7),
              vy: -1.0 - Math.random() * 1.3,
              alpha: isLight ? 0.75 : 0.9,
              maxLife: 45 + Math.random() * 25,
              life: 0,
              color: isLight
                ? Math.random() > 0.4 ? '217, 130, 43' : '37, 74, 154'
                : Math.random() > 0.4 ? '245, 179, 50' : '96, 165, 250',
            });
          }
        }
      }

      // Reset shadow for sparks
      ctx.shadowBlur = 0;

      // Update and draw floating lifting sparks
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life++;
        s.x += s.vx;
        s.y += s.vy;
        s.vy *= 0.98;
        const progress = s.life / s.maxLife;
        const currentAlpha = (1 - progress) * s.alpha;

        if (progress >= 1 || s.y < -10) {
          sparks.splice(i, 1);
          continue;
        }

        ctx.fillStyle = `rgba(${s.color}, ${currentAlpha.toFixed(3)})`;
        ctx.fillRect(s.x, s.y, s.size, s.size);
      }

      animationFrameId = requestAnimationFrame(render);
    }

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      ro.disconnect();
    };
  }, [variant, direction]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      aria-hidden="true"
    />
  );
}

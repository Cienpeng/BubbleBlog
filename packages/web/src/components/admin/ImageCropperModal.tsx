import { useState, useEffect, useRef } from 'react';

interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string;
  cropType: 'circle' | 'rect';
  aspectRatio: number; // Crop box width/height ratio
  onCrop: (croppedBlob: Blob) => void;
  onClose: () => void;
}

export default function ImageCropperModal({
  isOpen,
  imageSrc,
  cropType,
  aspectRatio,
  onCrop,
  onClose,
}: ImageCropperModalProps) {
  const [scale, setScale] = useState(1);
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const viewContainerRef = useRef<HTMLDivElement | null>(null);

  // Position offset of the image center relative to the crop box center
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const startOffset = useRef({ x: 0, y: 0 });
  const startTouchDistance = useRef(0);
  const startScale = useRef(1);

  // Viewport display container dimensions
  const viewWidth = 340;
  const viewHeight = 340;

  // Crop box dimensions (fixed in the center of the viewport)
  const [cropBoxDim, setCropBoxDim] = useState({ width: 0, height: 0 });
  // Base dimensions of the image (scale = 1) fitted to cover the crop box
  const [baseDim, setBaseDim] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setOffset({ x: 0, y: 0 });
      setImgLoaded(false);
      startTouchDistance.current = 0;
      startScale.current = 1;

      const img = new Image();
      img.onload = () => {
        // 1. Calculate the crop box size to fit within the viewport
        let cbWidth = viewWidth * 0.85;
        let cbHeight = cbWidth / aspectRatio;

        if (cbHeight > viewHeight * 0.85) {
          cbHeight = viewHeight * 0.85;
          cbWidth = cbHeight * aspectRatio;
        }

        setCropBoxDim({ width: cbWidth, height: cbHeight });

        // 2. Calculate the base image size (scale = 1) to cover the crop box (cover strategy)
        const imgRatio = img.width / img.height;
        const cropRatio = cbWidth / cbHeight;

        let bWidth = cbWidth;
        let bHeight = cbHeight;

        if (imgRatio > cropRatio) {
          // Image is wider than crop box: match height, scale width
          bHeight = cbHeight;
          bWidth = cbHeight * imgRatio;
        } else {
          // Image is taller than crop box: match width, scale height
          bWidth = cbWidth;
          bHeight = cbWidth / imgRatio;
        }

        setBaseDim({ width: bWidth, height: bHeight });
        setImgLoaded(true);
      };
      img.src = imageSrc;
    }
  }, [isOpen, imageSrc, aspectRatio]);

  // Constrain offset so the image always covers the crop box
  const getConstrainedOffset = (x: number, y: number, currentW: number, currentH: number) => {
    const maxOffsetX = Math.max(0, (currentW - cropBoxDim.width) / 2);
    const maxOffsetY = Math.max(0, (currentH - cropBoxDim.height) / 2);

    return {
      x: Math.max(-maxOffsetX, Math.min(maxOffsetX, x)),
      y: Math.max(-maxOffsetY, Math.min(maxOffsetY, y)),
    };
  };

  // Enable mouse wheel zoom
  useEffect(() => {
    const container = viewContainerRef.current;
    if (!container || !imgLoaded) return;

    const handleWheelEvent = (e: WheelEvent) => {
      e.preventDefault();
      const zoomSpeed = 0.08;
      const direction = e.deltaY < 0 ? 1 : -1;
      
      setScale((prevScale) => {
        const nextScale = Math.max(1, Math.min(4, prevScale + direction * zoomSpeed));
        
        // Recalculate and constrain offset with new scale
        const nextW = baseDim.width * nextScale;
        const nextH = baseDim.height * nextScale;
        setOffset((prevOffset) => getConstrainedOffset(prevOffset.x, prevOffset.y, nextW, nextH));
        
        return nextScale;
      });
    };

    container.addEventListener('wheel', handleWheelEvent, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheelEvent);
    };
  }, [imgLoaded, baseDim, cropBoxDim]);

  if (!isOpen) return null;

  // Zoomed image dimensions
  const imgWidth = baseDim.width * scale;
  const imgHeight = baseDim.height * scale;

  // Drag handlers (dragging pans the image underneath the crop box)
  const handleStartDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e && e.touches.length === 2) {
      e.preventDefault();
      // Pinch zoom start
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      startTouchDistance.current = dist;
      startScale.current = scale;
      setIsDragging(false);
      return;
    }

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setIsDragging(true);
    dragStart.current = { x: clientX, y: clientY };
    startOffset.current = { ...offset };
  };

  const handleMoveDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e && e.touches.length === 2) {
      e.preventDefault();
      // Pinch zoom move
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      if (startTouchDistance.current > 0) {
        const ratio = dist / startTouchDistance.current;
        const nextScale = Math.max(1, Math.min(4, startScale.current * ratio));
        setScale(nextScale);

        const nextW = baseDim.width * nextScale;
        const nextH = baseDim.height * nextScale;
        setOffset(getConstrainedOffset(offset.x, offset.y, nextW, nextH));
      }
      return;
    }

    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const dx = clientX - dragStart.current.x;
    const dy = clientY - dragStart.current.y;

    const newOffset = getConstrainedOffset(
      startOffset.current.x + dx,
      startOffset.current.y + dy,
      imgWidth,
      imgHeight
    );

    setOffset(newOffset);
  };

  const handleEndDrag = () => {
    setIsDragging(false);
    startTouchDistance.current = 0;
  };

  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img) return;

    // Define output canvas resolution based on aspect ratio
    let canvasWidth = 400;
    let canvasHeight = 400;
    if (cropType === 'rect') {
      if (aspectRatio > 2.2) {
        canvasWidth = 1200;
        canvasHeight = Math.round(1200 / aspectRatio);
      } else {
        canvasWidth = 1280;
        canvasHeight = Math.round(1280 / aspectRatio);
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Map screen crop coordinates back to natural image scale
    const scaleFactor = img.naturalWidth / imgWidth;

    // Top-left corner of the crop box relative to the image
    const cropX_view = (imgWidth - cropBoxDim.width) / 2 - offset.x;
    const cropY_view = (imgHeight - cropBoxDim.height) / 2 - offset.y;

    const srcX = cropX_view * scaleFactor;
    const srcY = cropY_view * scaleFactor;
    const srcW = cropBoxDim.width * scaleFactor;
    const srcH = cropBoxDim.height * scaleFactor;

    ctx.drawImage(
      img,
      srcX,
      srcY,
      srcW,
      srcH,
      0,
      0,
      canvasWidth,
      canvasHeight
    );

    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCrop(blob);
        }
      },
      'image/jpeg',
      0.9
    );
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-[6px] z-50 flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/[0.08] rounded-3xl w-full max-w-md p-6 flex flex-col items-center gap-5 shadow-2xl">
        <div className="w-full text-center">
          <h3 className="text-lg font-bold text-text-primary dark:text-white">
            {cropType === 'circle' ? '裁剪头像' : '裁剪图片'}
          </h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            拖动图片调整位置，使用鼠标滚轮/双指/滑块缩放
          </p>
        </div>

        {/* Viewport container */}
        <div
          ref={viewContainerRef}
          className="relative bg-zinc-900 border border-black/10 dark:border-white/10 overflow-hidden flex items-center justify-center rounded-2xl cursor-grab active:cursor-grabbing select-none"
          style={{
            width: `${viewWidth}px`,
            height: `${viewHeight}px`,
          }}
          onMouseDown={handleStartDrag}
          onTouchStart={handleStartDrag}
          onMouseMove={handleMoveDrag}
          onTouchMove={handleMoveDrag}
          onMouseUp={handleEndDrag}
          onMouseLeave={handleEndDrag}
          onTouchEnd={handleEndDrag}
        >
          {imgLoaded && (
            <>
              {/* Image layer positioned behind the mask */}
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Source"
                className="absolute pointer-events-none origin-center max-w-none max-h-none"
                style={{
                  width: `${baseDim.width}px`,
                  height: `${baseDim.height}px`,
                  maxWidth: 'none',
                  maxHeight: 'none',
                  left: `${(viewWidth - baseDim.width) / 2}px`,
                  top: `${(viewHeight - baseDim.height) / 2}px`,
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                }}
              />

              {/* Crop Mask Overlay (covers everything outside the crop box) */}
              <div
                className="absolute pointer-events-none border border-white/30"
                style={{
                  width: `${cropBoxDim.width}px`,
                  height: `${cropBoxDim.height}px`,
                  borderRadius: cropType === 'circle' ? '9999px' : '0px',
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65)',
                }}
              >
                {/* Thin inner border indicator */}
                <div
                  className="absolute inset-0 border border-white/20 pointer-events-none"
                  style={{ borderRadius: cropType === 'circle' ? '9999px' : '0px' }}
                />
              </div>
            </>
          )}
        </div>

        {/* Zoom Slider */}
        <div className="w-full flex items-center gap-3 px-2">
          <span className="text-xs text-gray-400 dark:text-gray-600">小</span>
          <input
            type="range"
            min="1"
            max="4"
            step="0.02"
            value={scale}
            onChange={(e) => {
              const nextScale = parseFloat(e.target.value);
              setScale(nextScale);
              // Recalculate and constrain offset with new scale
              const nextW = baseDim.width * nextScale;
              const nextH = baseDim.height * nextScale;
              setOffset(getConstrainedOffset(offset.x, offset.y, nextW, nextH));
            }}
            className="flex-1 h-1 bg-black/10 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand"
          />
          <span className="text-xs text-gray-400 dark:text-gray-600">大</span>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex gap-3 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] text-sm font-semibold text-gray-500 dark:text-gray-400 hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-2.5 rounded-2xl bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors shadow-md shadow-brand/25"
          >
            确认裁剪
          </button>
        </div>
      </div>
    </div>
  );
}

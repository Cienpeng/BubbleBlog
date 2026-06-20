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

  // Position of the crop box relative to the image element
  const [boxPos, setBoxPos] = useState({ x: 0, y: 0 });
  const [isDraggingBox, setIsDraggingBox] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const startBoxPos = useRef({ x: 0, y: 0 });

  // Dimensions of the display area (max boundaries of viewport container)
  const maxDisplayWidth = 340;
  const maxDisplayHeight = 340;

  // Base dimensions of the image when fit into the viewport (scale = 1)
  const [baseDim, setBaseDim] = useState({ width: 0, height: 0 });
  // Size of the crop box (always fixed size during zoom)
  const [boxDim, setBoxDim] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setImgLoaded(false);
      const img = new Image();
      img.onload = () => {
        const imageRatio = img.width / img.height;
        let dWidth = maxDisplayWidth;
        let dHeight = maxDisplayWidth / imageRatio;

        if (dHeight > maxDisplayHeight) {
          dHeight = maxDisplayHeight;
          dWidth = maxDisplayHeight * imageRatio;
        }

        setBaseDim({ width: dWidth, height: dHeight });

        // Calculate size of the crop box to fit within the base image dimensions
        let bWidth = dWidth;
        let bHeight = dWidth / aspectRatio;

        if (bHeight > dHeight) {
          bHeight = dHeight;
          bWidth = dHeight * aspectRatio;
        }

        // Apply a safe scale factor (e.g. 0.8) to leave margins
        bWidth *= 0.8;
        bHeight *= 0.8;

        setBoxDim({ width: bWidth, height: bHeight });

        // Center the crop box initially
        setBoxPos({
          x: (dWidth - bWidth) / 2,
          y: (dHeight - bHeight) / 2,
        });

        setImgLoaded(true);
      };
      img.src = imageSrc;
    }
  }, [isOpen, imageSrc, aspectRatio]);

  if (!isOpen) return null;

  // Current zoomed image dimensions
  const imgWidth = baseDim.width * scale;
  const imgHeight = baseDim.height * scale;

  // Constrain position helper
  const getConstrainedPos = (x: number, y: number, currentImgW: number, currentImgH: number) => {
    const maxX = Math.max(0, currentImgW - boxDim.width);
    const maxY = Math.max(0, currentImgH - boxDim.height);
    return {
      x: Math.max(0, Math.min(maxX, x)),
      y: Math.max(0, Math.min(maxY, y)),
    };
  };

  // Handle dragging the crop box
  const handleStartDrag = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setIsDraggingBox(true);
    dragStart.current = { x: clientX, y: clientY };
    startBoxPos.current = { ...boxPos };
  };

  const handleMoveDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDraggingBox) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const dx = clientX - dragStart.current.x;
    const dy = clientY - dragStart.current.y;

    const newPos = getConstrainedPos(
      startBoxPos.current.x + dx,
      startBoxPos.current.y + dy,
      imgWidth,
      imgHeight
    );

    setBoxPos(newPos);
  };

  const handleEndDrag = () => {
    setIsDraggingBox(false);
  };

  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img) return;

    // Define output canvas resolution
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

    const srcX = boxPos.x * scaleFactor;
    const srcY = boxPos.y * scaleFactor;
    const srcW = boxDim.width * scaleFactor;
    const srcH = boxDim.height * scaleFactor;

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
            拖动虚线框调整裁剪范围，使用滑块缩放图像
          </p>
        </div>

        {/* Outer cropper viewport container */}
        <div
          className="relative bg-zinc-900 border border-black/10 dark:border-white/10 overflow-hidden flex items-center justify-center rounded-2xl"
          style={{
            width: `${maxDisplayWidth}px`,
            height: `${maxDisplayHeight}px`,
          }}
          onMouseMove={handleMoveDrag}
          onTouchMove={handleMoveDrag}
          onMouseUp={handleEndDrag}
          onMouseLeave={handleEndDrag}
          onTouchEnd={handleEndDrag}
        >
          {imgLoaded && (
            /* Scalable Image Container */
            <div
              className="relative overflow-auto flex items-center justify-center bg-black/20"
              style={{
                width: '100%',
                height: '100%',
              }}
            >
              {/* Box positioned over the image layer */}
              <div
                className="relative"
                style={{
                  width: `${imgWidth}px`,
                  height: `${imgHeight}px`,
                }}
              >
                {/* Main Image - scaled directly via css width/height */}
                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt="Source"
                  className="w-full h-full object-fill pointer-events-none select-none"
                  style={{
                    width: `${imgWidth}px`,
                    height: `${imgHeight}px`,
                  }}
                />

                {/* Semi-transparent mask overlay */}
                <div className="absolute inset-0 bg-black/50 pointer-events-none" />

                {/* Draggable Crop Frame Box (stays fixed size) */}
                <div
                  onMouseDown={handleStartDrag}
                  onTouchStart={handleStartDrag}
                  className="absolute border-2 border-dashed border-brand cursor-move bg-transparent"
                  style={{
                    width: `${boxDim.width}px`,
                    height: `${boxDim.height}px`,
                    left: `${boxPos.x}px`,
                    top: `${boxPos.y}px`,
                    borderRadius: cropType === 'circle' ? '9999px' : '0px',
                    boxShadow: '0 0 0 2000px rgba(0, 0, 0, 0.25)', // Makes the cropping region clear
                  }}
                >
                  <div className="absolute inset-0 border border-white/40 pointer-events-none" style={{ borderRadius: cropType === 'circle' ? '9999px' : '0' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Zoom Slider */}
        <div className="w-full flex items-center gap-3 px-2">
          <span className="text-xs text-gray-400 dark:text-gray-600">小</span>
          <input
            type="range"
            min="1"
            max="3"
            step="0.05"
            value={scale}
            onChange={(e) => {
              const nextScale = parseFloat(e.target.value);
              setScale(nextScale);
              // Constrain the crop box position inside the new scaled image boundaries
              const nextW = baseDim.width * nextScale;
              const nextH = baseDim.height * nextScale;
              setBoxPos(getConstrainedPos(boxPos.x, boxPos.y, nextW, nextH));
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

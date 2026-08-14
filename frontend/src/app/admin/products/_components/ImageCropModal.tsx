'use client';

import { useCallback, useState } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { X, RotateCcw, RotateCw } from 'lucide-react';
import { toPngFile } from '@/lib/image-crop';
import { Button } from '../../_components/ui';

interface ImageCropModalProps {
  open: boolean;
  imageSrc: string;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}

const ASPECTS: { label: string; value: number | undefined }[] = [
  { label: 'Free', value: undefined },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '16:9', value: 16 / 9 },
];

export default function ImageCropModal({ open, imageSrc, onCancel, onConfirm }: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [area, setArea] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset per-image editing state whenever a fresh image is presented or the
  // modal (re)opens. The component instance persists across close/reopen, so
  // without this a second upload would inherit the previous save's
  // `saving=true` guard (infinite spinner) and stale crop area. React
  // recommends adjusting state during render for this "reset on prop change"
  // case rather than in an effect.
  const [prev, setPrev] = useState({ open, imageSrc });
  if (prev.open !== open || prev.imageSrc !== imageSrc) {
    setPrev({ open, imageSrc });
    if (open) {
      setSaving(false);
      setArea(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
    }
  }

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setArea(croppedAreaPixels);
  }, []);

  if (!open) return null;

  const handleSave = async () => {
    if (!area || saving) return;
    setSaving(true);
    try {
      const file = await toPngFile(imageSrc, area, rotation);
      onConfirm(file);
    } catch {
      setSaving(false);
    }
  };

  const handleAspect = (value: number | undefined) => {
    setAspect(value);
    setCrop({ x: 0, y: 0 });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-100">Crop & Adjust Image</h2>
          <button type="button" onClick={onCancel} aria-label="Close" className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative h-80 m-4 rounded-lg overflow-hidden bg-zinc-950">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
            objectFit="contain"
            showGrid
            minZoom={1}
            maxZoom={3}
          />
        </div>

        <div className="p-4 pt-0 space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-xs w-14 text-zinc-400">Zoom</label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-indigo-500"
            />
            <span className="text-xs text-zinc-500 tabular-nums">{zoom.toFixed(2)}x</span>
          </div>

          <div className="flex items-center gap-4">
            <label className="text-xs w-14 text-zinc-400">Aspect</label>
            <div className="flex gap-2">
              {ASPECTS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleAspect(preset.value)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    aspect === preset.value
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                      : 'border-zinc-800 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="text-xs w-14 text-zinc-400">Rotate</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setRotation((r) => (r + 360 - 90) % 360)} className="p-2 rounded-lg border border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 transition-colors" aria-label="Rotate left">
                <RotateCcw className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => setRotation((r) => (r + 90) % 360)} className="p-2 rounded-lg border border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 transition-colors" aria-label="Rotate right">
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="button" loading={saving} onClick={handleSave}>
              Save & Upload
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

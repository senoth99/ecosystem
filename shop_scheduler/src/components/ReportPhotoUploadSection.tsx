"use client";

import { useRef } from "react";
import { Camera, ImagePlus } from "lucide-react";
import type { ReportPhotoKind } from "@/lib/reportPhotoKinds";

export function ReportPhotoUploadSection({
  label,
  kind,
  shiftId,
  previewUrl,
  uploaded,
  uploading,
  disabled,
  onPhotoSelected
}: {
  label: string;
  kind: ReportPhotoKind;
  shiftId: string;
  previewUrl: string;
  uploaded: boolean;
  uploading: boolean;
  disabled: boolean;
  onPhotoSelected: (kind: ReportPhotoKind, file: File) => void;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const inputId = `report-photo-${kind}-${shiftId}`;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <input
        ref={cameraRef}
        id={`${inputId}-camera`}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        disabled={disabled || uploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPhotoSelected(kind, file);
          e.target.value = "";
        }}
      />
      <input
        ref={galleryRef}
        id={`${inputId}-gallery`}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        disabled={disabled || uploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPhotoSelected(kind, file);
          e.target.value = "";
        }}
      />
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="btn-secondary inline-flex items-center justify-center gap-2"
          disabled={disabled || uploading}
          onClick={() => cameraRef.current?.click()}
        >
          <Camera size={16} aria-hidden />
          {uploading ? "Загружаем…" : "Сфоткать"}
        </button>
        <button
          type="button"
          className="btn-secondary inline-flex items-center justify-center gap-2"
          disabled={disabled || uploading}
          onClick={() => galleryRef.current?.click()}
        >
          <ImagePlus size={16} aria-hidden />
          Из галереи
        </button>
      </div>
      {uploaded ? <p className="text-xs text-muted">Фото загружено</p> : null}
      {previewUrl ? (
        <img
          src={previewUrl}
          alt={label}
          className="max-h-40 w-full rounded-lg border border-border object-cover"
        />
      ) : null}
    </div>
  );
}

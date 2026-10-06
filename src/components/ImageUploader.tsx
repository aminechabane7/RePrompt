import React, { useRef, useState } from 'react';
import { UploadCloud, Image as ImageIcon, X, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { SAMPLE_IMAGES, SampleImage } from '../data/samples';

interface ImageUploaderProps {
  selectedImage: string | null;
  imageInfo: { name: string; size: string; width?: number; height?: number } | null;
  onImageSelected: (dataUrl: string, info: { name: string; size: string; width?: number; height?: number }) => void;
  onClearImage: () => void;
  isLoading: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  selectedImage,
  imageInfo,
  onImageSelected,
  onClearImage,
  isLoading,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setErrorMsg(null);
    const validMimes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!validMimes.includes(file.type.toLowerCase())) {
      setErrorMsg('Unsupported image format. Allowed formats: image/jpeg, image/png, image/webp.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Image exceeds the 10 MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      setErrorMsg('Failed to read file from your device. Please try again.');
    };
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onerror = () => {
        setErrorMsg('The image file is corrupted or unreadable. Please choose another file.');
      };
      img.onload = () => {
        onImageSelected(dataUrl, {
          name: file.name,
          size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          width: img.width,
          height: img.height,
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isLoading) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isLoading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleSelectSample = async (sample: SampleImage) => {
    if (isLoading) return;
    setErrorMsg(null);
    try {
      const response = await fetch(sample.url);
      if (!response.ok) throw new Error('Sample fetch failed');
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const img = new Image();
        img.onload = () => {
          onImageSelected(dataUrl, {
            name: `${sample.name}.webp`,
            size: `${(blob.size / (1024 * 1024)).toFixed(2)} MB`,
            width: img.width,
            height: img.height,
          });
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(blob);
    } catch {
      setErrorMsg('Failed to load sample image. Please try uploading an image directly.');
    }
  };

  return (
    <div id="image-uploader-section" className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        id="hidden-file-input"
        aria-label="Upload an image file (JPEG, PNG, or WEBP up to 10MB)"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleFileChange}
        disabled={isLoading}
      />

      {errorMsg && (
        <div
          id="upload-error-banner"
          role="alert"
          className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2.5"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {!selectedImage ? (
        /* Empty Upload Zone */
        <div>
          <div
            id="dropzone-area"
            role="button"
            tabIndex={0}
            aria-label="Click or drag and drop to upload an image"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className={`cursor-pointer group relative rounded-2xl border-2 border-dashed transition-all duration-200 p-8 sm:p-12 text-center flex flex-col items-center justify-center bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 ${
              isDragging
                ? 'border-neutral-900 bg-neutral-50 scale-[0.99]'
                : 'border-neutral-300 hover:border-neutral-500 hover:bg-neutral-50/50'
            }`}
          >
            <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4 transition-transform group-hover:scale-110 text-neutral-800">
              <UploadCloud className="w-8 h-8" />
            </div>

            <div className="text-lg font-semibold text-neutral-900 mb-1.5">
              Upload your image
            </div>
            <p className="text-neutral-500 text-sm max-w-sm mb-4">
              Drag & drop or click to upload an image to reverse-engineer its visual prompt
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 text-neutral-600 text-xs font-mono">
              <span>image/jpeg</span>
              <span>•</span>
              <span>image/png</span>
              <span>•</span>
              <span>image/webp</span>
              <span>•</span>
              <span>Max 10 MB</span>
            </div>
          </div>

          {/* Quick Test Presets */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-neutral-400" />
                Or try a local sample image:
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {SAMPLE_IMAGES.map((sample) => (
                <button
                  key={sample.id}
                  id={`sample-btn-${sample.id}`}
                  type="button"
                  onClick={() => handleSelectSample(sample)}
                  aria-label={`Select sample image: ${sample.name} (${sample.category})`}
                  className="flex items-center gap-2 p-2 rounded-xl border border-neutral-200 bg-white hover:border-neutral-400 hover:bg-neutral-50 text-left transition-all group overflow-hidden focus:outline-none focus:ring-2 focus:ring-neutral-900"
                >
                  <img
                    src={sample.url}
                    alt={`Sample ${sample.category} visual: ${sample.name}`}
                    width={40}
                    height={40}
                    loading="lazy"
                    decoding="async"
                    className="w-10 h-10 rounded-lg object-cover shrink-0 group-hover:scale-105 transition-transform aspect-square"
                  />
                  <div className="min-w-0 pr-1">
                    <p className="text-xs font-medium text-neutral-900 truncate leading-tight">
                      {sample.name}
                    </p>
                    <p className="text-[11px] text-neutral-500 truncate leading-tight mt-0.5">
                      {sample.category}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Image Preview State */
        <div id="image-preview-card" className="bg-white rounded-2xl border border-neutral-200/80 p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="relative group shrink-0">
                <img
                  id="preview-img-element"
                  src={selectedImage}
                  alt={imageInfo?.name ? `Selected image for prompt analysis: ${imageInfo.name}` : 'Uploaded image preview'}
                  width={112}
                  height={112}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl object-cover border border-neutral-200 shadow-xs aspect-square"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <ImageIcon className="w-4 h-4 text-neutral-500 shrink-0" />
                  <span className="text-sm font-semibold text-neutral-900 truncate max-w-[200px] sm:max-w-xs">
                    {imageInfo?.name || 'Uploaded Image'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 font-mono">
                  {imageInfo?.size && <span>{imageInfo.size}</span>}
                  {imageInfo?.width && imageInfo?.height && (
                    <>
                      <span>•</span>
                      <span>{imageInfo.width} × {imageInfo.height}px</span>
                    </>
                  )}
                </div>

                <p className="text-xs text-emerald-600 font-medium mt-2 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Image verified & ready for vision analysis
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100">
              <button
                id="change-image-button"
                type="button"
                disabled={isLoading}
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Replace</span>
              </button>
              <button
                id="remove-image-button"
                type="button"
                disabled={isLoading}
                onClick={onClearImage}
                className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

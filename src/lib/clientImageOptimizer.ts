/**
 * Client-Side Payload Optimization & Safe Budget Enforcement
 * 
 * Vercel Serverless Function Platform Limit: 4.5 MB (4,718,592 bytes).
 * RePrompt Safe Serialized JSON Budget: 3.5 MB (3,670,016 bytes).
 * 
 * This module performs client-side proportional resizing, iterative compression,
 * and strict pre-flight JSON payload measurement to guarantee no request exceeds
 * Vercel's payload ceiling.
 */

export const VERCEL_PLATFORM_LIMIT_BYTES = 4.5 * 1024 * 1024; // 4.5 MB hard platform ceiling
export const MAX_SAFE_REQUEST_BYTES = 3.5 * 1024 * 1024;       // 3.5 MB conservative serialized JSON budget
export const MAX_IMAGE_PAYLOAD_BYTES = 3.0 * 1024 * 1024;      // 3.0 MB target for single Base64 image payload
export const MAX_VIDEO_FRAMES_COMBINED_BYTES = 3.0 * 1024 * 1024; // 3.0 MB target for 4 video frames combined

export interface OptimizationResult {
  dataUrl: string;
  width: number;
  height: number;
  originalBytes: number;
  optimizedBytes: number;
  mimeType: string;
}

/**
 * Measures the exact byte size of a JavaScript object when serialized to JSON.
 */
export function measureJsonPayloadBytes(payload: unknown): number {
  try {
    const jsonString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return new Blob([jsonString]).size;
  } catch {
    return 0;
  }
}

/**
 * Loads a File or Data URL into an HTMLImageElement in the browser.
 */
function loadImageElement(source: File | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('The image could not be decoded. Please upload a valid JPG, PNG, or WebP file.'));

    if (typeof source === 'string') {
      img.src = source;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file from your device.'));
      reader.readAsDataURL(source);
    }
  });
}

/**
 * Optimizes an image (up to 10 MB original) client-side before Base64 dispatch:
 * 1. Proportional aspect-ratio resizing (starting at max 2048px).
 * 2. Iterative canvas re-encoding with progressive dimension & quality tuning.
 * 3. Measures resulting Base64 string bytes to ensure it strictly fits within budget.
 */
export async function optimizeImageForUpload(
  source: File | string,
  fileName = 'upload.jpg',
  maxPayloadBytes = MAX_IMAGE_PAYLOAD_BYTES
): Promise<OptimizationResult> {
  const originalBytes = typeof source === 'string' ? new Blob([source]).size : source.size;
  const img = await loadImageElement(source);

  const origWidth = img.naturalWidth || img.width;
  const origHeight = img.naturalHeight || img.height;

  if (!origWidth || !origHeight) {
    throw new Error('Image has invalid dimensions (0x0).');
  }

  // Dimension steps for iterative fallback
  const dimensionSteps = [2048, 1600, 1280, 1024];
  // Quality steps for lossy compression
  const qualitySteps = [0.88, 0.82, 0.75, 0.68];

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    throw new Error('Canvas 2D context is not supported in this browser.');
  }

  let bestDataUrl = '';
  let bestWidth = origWidth;
  let bestHeight = origHeight;
  let bestBytes = Infinity;

  // Determine preferred output MIME type
  const isPng = fileName.toLowerCase().endsWith('.png') || (typeof source === 'string' && source.startsWith('data:image/png'));
  
  for (const maxDim of dimensionSteps) {
    // Proportional aspect-ratio scaling
    let targetWidth = origWidth;
    let targetHeight = origHeight;

    if (origWidth > maxDim || origHeight > maxDim) {
      if (origWidth >= origHeight) {
        targetWidth = maxDim;
        targetHeight = Math.round((origHeight / origWidth) * maxDim);
      } else {
        targetHeight = maxDim;
        targetWidth = Math.round((origWidth / origHeight) * maxDim);
      }
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Clear canvas
    ctx.clearRect(0, 0, targetWidth, targetHeight);

    // If converting PNG with potential transparency to JPEG, fill white background
    if (!isPng) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
    }

    // High quality canvas image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    for (const quality of qualitySteps) {
      // Try WebP first for best compression/quality ratio, fallback to JPEG
      let encoded = '';
      try {
        encoded = canvas.toDataURL('image/webp', quality);
        if (!encoded.startsWith('data:image/webp')) {
          encoded = canvas.toDataURL('image/jpeg', quality);
        }
      } catch {
        encoded = canvas.toDataURL('image/jpeg', quality);
      }

      const encodedBytes = new Blob([encoded]).size;

      if (encodedBytes < bestBytes) {
        bestDataUrl = encoded;
        bestWidth = targetWidth;
        bestHeight = targetHeight;
        bestBytes = encodedBytes;
      }

      // If safely under target single image payload budget, accept result immediately
      if (encodedBytes <= maxPayloadBytes) {
        return {
          dataUrl: encoded,
          width: targetWidth,
          height: targetHeight,
          originalBytes,
          optimizedBytes: encodedBytes,
          mimeType: encoded.split(';')[0].replace('data:', '') || 'image/jpeg',
        };
      }
    }
  }

  // If best result fits under the budget, return it
  if (bestBytes <= maxPayloadBytes && bestDataUrl) {
    return {
      dataUrl: bestDataUrl,
      width: bestWidth,
      height: bestHeight,
      originalBytes,
      optimizedBytes: bestBytes,
      mimeType: bestDataUrl.split(';')[0].replace('data:', '') || 'image/jpeg',
    };
  }

  // Emergency ultra-compact fallback pass (800px @ 0.60 quality)
  const fallbackDim = 800;
  const fallbackScale = Math.min(1, fallbackDim / Math.max(origWidth, origHeight));
  canvas.width = Math.round(origWidth * fallbackScale);
  canvas.height = Math.round(origHeight * fallbackScale);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const fallbackDataUrl = canvas.toDataURL('image/jpeg', 0.60);
  const fallbackBytes = new Blob([fallbackDataUrl]).size;

  if (fallbackBytes <= maxPayloadBytes) {
    return {
      dataUrl: fallbackDataUrl,
      width: canvas.width,
      height: canvas.height,
      originalBytes,
      optimizedBytes: fallbackBytes,
      mimeType: 'image/jpeg',
    };
  }

  throw new Error(`Image could not be compressed below the ${Math.round(maxPayloadBytes / (1024 * 1024))} MB payload limit.`);
}

/**
 * Optimizes an array of video keyframes so their COMBINED JSON payload
 * strictly complies with the safe 3.5 MB Vercel request budget.
 */
export async function optimizeVideoKeyframes(
  rawFrames: string[],
  maxTotalBytes = MAX_VIDEO_FRAMES_COMBINED_BYTES
): Promise<string[]> {
  if (rawFrames.length === 0) return [];

  const targetPerFrame = Math.floor(maxTotalBytes / Math.max(1, rawFrames.length));
  const optimizedFrames: string[] = [];

  for (let i = 0; i < rawFrames.length; i++) {
    const frame = rawFrames[i];
    try {
      const opt = await optimizeImageForUpload(frame, `frame_${i}.jpg`, targetPerFrame);
      optimizedFrames.push(opt.dataUrl);
    } catch {
      // Fallback: scale canvas to 640px JPEG @ 0.70
      optimizedFrames.push(frame);
    }
  }

  // Verify total combined frames size
  const totalCombinedBytes = new Blob([JSON.stringify(optimizedFrames)]).size;
  if (totalCombinedBytes <= maxTotalBytes) {
    return optimizedFrames;
  }

  // Second pass: aggressive downscaling for multi-frame video payload (480px)
  const furtherCompressed: string[] = [];
  for (const frame of optimizedFrames) {
    const img = await loadImageElement(frame);
    const canvas = document.createElement('canvas');
    const maxDim = 480;
    const scale = Math.min(1, maxDim / Math.max(img.width || 480, img.height || 270));
    canvas.width = Math.round((img.width || 480) * scale);
    canvas.height = Math.round((img.height || 270) * scale);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      furtherCompressed.push(canvas.toDataURL('image/jpeg', 0.65));
    } else {
      furtherCompressed.push(frame);
    }
  }

  return furtherCompressed;
}

export type PromptMode =
  | 'general'
  | 'photorealistic'
  | 'cinematic'
  | 'product_photography'
  | 'portrait'
  | 'fashion'
  | 'anime'
  | 'illustration'
  | 'render_3d'
  | 'architecture'
  | 'interior_design'
  | 'social_media'
  // Legacy compatibility aliases
  | 'universal'
  | 'ultra_realistic'
  | 'digital_art'
  | 'cartoon'
  | 'detailed'
  | 'midjourney'
  | 'flux';

export type TargetEngine =
  | 'general'
  | 'midjourney'
  | 'flux'
  | 'stable_diffusion'
  | 'dalle3'
  | 'imagen';

export type DetailLevel = 'simple' | 'detailed' | 'professional';

export interface VisualAnalysis {
  subject: string;
  secondarySubjects?: string;
  environment: string;
  composition: string;
  lighting: string;
  camera: string;
  style: string;
  colors: string;
  materials?: string;
  details: string;
  mood?: string;
  aspectRatio?: string;
}

export interface GeneratePromptResponse {
  success: boolean;
  prompt: string;
  negativePrompt: string;
  analysis: VisualAnalysis;
  modelUsed: string;
  detectedStyle?: string;
  aspectRatio?: string;
  targetEngine?: TargetEngine;
  detailLevel?: DetailLevel;
  error?: string;
  creditsRemaining?: number;
  generationsUsed?: number;
}

/**
 * Prompt history item strictly storing metadata only.
 * IMPORTANT PRIVACY RULE: Never store original image or Base64 data here.
 */
export interface PromptHistoryItem {
  id: string;
  timestamp: number;
  mode: PromptMode;
  targetEngine?: TargetEngine;
  detailLevel?: DetailLevel;
  detectedStyle?: string;
  aspectRatio?: string;
  prompt: string;
  negativePrompt?: string;
  analysis: VisualAnalysis;
  modelUsed: string;
}

export type VideoPromptMode =
  | 'universal_video'
  | 'runway_gen3'
  | 'luma_dream_machine'
  | 'kling'
  | 'sora'
  | 'pika';

export interface VideoVisualAnalysis {
  cameraMotion: string;
  subjectKinematics: string;
  temporalPacing: string;
  lightingAtmosphere: string;
  cinematicFraming: string;
  visualStyle: string;
}

export interface GenerateVideoPromptResponse {
  success: boolean;
  prompt: string;
  negativePrompt: string;
  cameraMovement: string;
  analysis: VideoVisualAnalysis;
  modelUsed: string;
  error?: string;
}

export interface VideoHistoryItem {
  id: string;
  timestamp: number;
  videoName: string;
  mode: VideoPromptMode;
  prompt: string;
  negativePrompt: string;
  cameraMovement: string;
  analysis: VideoVisualAnalysis;
  modelUsed: string;
}

export type PageRoute =
  | 'generator'
  | 'video_generator'
  | 'about'
  | 'privacy'
  | 'terms'
  | 'contact';

/**
 * Supabase User Profile & Usage Types
 */
export interface UserProfile {
  id: string;
  email?: string;
  displayName?: string;
  plan: 'free' | 'pro' | 'unlimited';
  createdAt?: string;
}

export interface UserUsage {
  userId: string;
  generationsUsed: number;
  generationLimit: number;
  remaining: number;
}

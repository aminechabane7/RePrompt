export type PromptMode =
  | 'universal'
  | 'ultra_realistic'
  | 'anime'
  | 'digital_art'
  | 'cartoon'
  | 'midjourney'
  | 'flux'
  | 'detailed';

export interface VisualAnalysis {
  subject: string;
  composition: string;
  environment: string;
  lighting: string;
  camera: string;
  style: string;
  colors: string;
  details: string;
}

export interface GeneratePromptResponse {
  success: boolean;
  prompt: string;
  analysis: VisualAnalysis;
  modelUsed: string;
  error?: string;
}

export interface PromptHistoryItem {
  id: string;
  timestamp: number;
  thumbnail: string;
  mode: PromptMode;
  prompt: string;
  analysis: VisualAnalysis;
  modelUsed: string;
}

export type PageRoute = 'generator' | 'about' | 'privacy';

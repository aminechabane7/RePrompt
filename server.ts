import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

// Allow base64 images up to 20MB
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasOpenRouterKey: Boolean(process.env.OPENROUTER_API_KEY),
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Helper to construct reverse-engineering prompt
function buildVisionPrompt(mode: string): string {
  let modeGuidance = '';
  switch (mode) {
    case 'digital_art':
      modeGuidance = 'Optimized for Digital Art & Concept Illustration. Specify digital painting techniques, brushwork texture, lighting ambiance, digital color blending (e.g. ArtStation trending, Octane 3D render or 2D concept illustration, matte painting, vibrant lighting, intricate stylization).';
      break;
    case 'anime':
      modeGuidance = 'Optimized for Anime & Manga aesthetic (Japanese animation / Niji style). Specify cel-shaded artwork, clean dynamic linework, expressive features, vibrant anime color palette, stylized hair/eyes, and cinematic keyframe anime background (e.g. Makoto Shinkai or Studio Ghibli inspired lighting, Kyoto Animation softness, or modern Ufotable vibrancy).';
      break;
    case 'cartoon':
      modeGuidance = 'Optimized for Cartoon & 3D Animated style. Specify stylized character proportions, playful exaggeration, smooth clay or 3D subsurface scattering (Pixar / Disney 3D animation feel or classic 2D Saturday morning cartoon), bold outlines, and bright whimsical lighting.';
      break;
    case 'ultra_realistic':
      modeGuidance = 'Optimized for Ultra-Realistic Photographic fidelity. Specify hyper-authentic optical camera parameters (e.g. Hasselblad H6D-100c or Sony A7R V, 50mm f/1.2 or 85mm f/1.4 lens, ISO 100, 1/250s shutter), micro skin pores, natural imperfections, subsurface skin scattering, authentic catchlights, RAW uncompressed photography, zero artificial plastic smoothing.';
      break;
    case 'detailed':
      modeGuidance = 'Maximum visual detail. Describe comprehensive textures, materials, and layered lighting nuances.';
      break;
    case 'midjourney':
      modeGuidance = 'Optimized for Midjourney v7 prompting. Use stylized descriptors, cinematic lighting keywords, composition, and include suitable flags like --ar 16:9 or --ar 4:5 and --v 7 --style raw.';
      break;
    case 'flux':
      modeGuidance = 'Optimized for FLUX 1.1 Pro and Stable Diffusion 3.5 Large (SD 3.5). Use natural language photographic art direction specifying lens focal length (e.g. 35mm, 85mm), sensor/film aesthetic, lighting rig, realistic skin/fabric texture, and clean framing.';
      break;
    case 'universal':
    default:
      modeGuidance = 'Works as a general-purpose image-generation prompt. Clean, descriptive, coherent, and highly effective across Midjourney v7, FLUX 1.1 Pro, SD 3.5 Large, and Gemini without generator-specific syntax.';
      break;
  }

  return `You are an expert AI image prompt engineer.

Analyze the provided image carefully.
Your goal is NOT simply to describe the image.
Reverse-engineer the visual characteristics that would be required to recreate a similar image with an AI image generator.

Analyze:
1. Main subject & appearance (facial features, expression, posture, clothing, materials)
2. Composition (framing, rule of thirds, negative space, camera perspective)
3. Environment (backdrop, architectural elements, atmosphere, time of day)
4. Lighting (primary light source, rim light, ambient fill, shadow depth, contrast)
5. Camera setup (focal length estimate, aperture/depth of field, camera height)
6. Artistic / photographic style (editorial, cinematic, 35mm film, digital render, octane, oil painting, etc.)
7. Color palette (dominant tones, accent highlights, color harmony)
8. Key textural details (subtle surfaces, reflections, fine patterns)

TARGET PROMPT MODE: ${mode.toUpperCase()}
Mode specification: ${modeGuidance}

Avoid inventing details that cannot reasonably be inferred.

Return your response strictly in the following structured format with these exact uppercase labels:

SUBJECT:
[2-3 sentences specifying the core subject, exact appearance, clothing, and pose]

COMPOSITION:
[Framing, orientation, aspect ratio feel, point of view]

ENVIRONMENT:
[Setting, background depth, atmospheric conditions]

LIGHTING:
[Lighting scheme, highlight roll-off, shadow quality, color temperature]

CAMERA:
[Lens millimeter estimate, aperture feel, shutter motion, sensor depth]

STYLE:
[Medium, aesthetic genre, visual treatment, grain or clarity]

COLOR PALETTE:
[Primary hues, secondary accents, overall color mood]

DETAILS:
[Essential textures, materials, and micro-details]

FINAL PROMPT:
[One clean, copy-ready prompt combining the most important reverse-engineered visual characteristics, customized specifically for the ${mode} mode. Do not use markdown backticks around it.]`;
}

// Parse structured output
function parseVisionResponse(rawText: string) {
  const extractSection = (label: string, nextLabels: string[]): string => {
    const pattern = new RegExp(`${label}:?\\s*([\\s\\S]*?)(?=(?:${nextLabels.join('|')}:)|$)`, 'i');
    const match = rawText.match(pattern);
    return match ? match[1].trim() : '';
  };

  const subject = extractSection('SUBJECT', ['COMPOSITION', 'ENVIRONMENT', 'LIGHTING', 'CAMERA', 'STYLE', 'COLOR PALETTE', 'DETAILS', 'FINAL PROMPT']);
  const composition = extractSection('COMPOSITION', ['ENVIRONMENT', 'LIGHTING', 'CAMERA', 'STYLE', 'COLOR PALETTE', 'DETAILS', 'FINAL PROMPT']);
  const environment = extractSection('ENVIRONMENT', ['LIGHTING', 'CAMERA', 'STYLE', 'COLOR PALETTE', 'DETAILS', 'FINAL PROMPT']);
  const lighting = extractSection('LIGHTING', ['CAMERA', 'STYLE', 'COLOR PALETTE', 'DETAILS', 'FINAL PROMPT']);
  const camera = extractSection('CAMERA', ['STYLE', 'COLOR PALETTE', 'DETAILS', 'FINAL PROMPT']);
  const style = extractSection('STYLE', ['COLOR PALETTE', 'DETAILS', 'FINAL PROMPT']);
  const colors = extractSection('COLOR PALETTE', ['DETAILS', 'FINAL PROMPT']);
  const details = extractSection('DETAILS', ['FINAL PROMPT']);

  // Extract FINAL PROMPT
  const finalPromptMatch = rawText.match(/FINAL PROMPT:?\s*([\s\\S]*)$/i);
  let prompt = finalPromptMatch ? finalPromptMatch[1].trim() : '';

  // Clean up any surrounding quotes or code blocks
  prompt = prompt.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();

  // If prompt is empty, synthesize a fallback from the extracted sections
  if (!prompt || prompt.length < 20) {
    const parts = [style, subject, environment, lighting, camera, details].filter(Boolean);
    prompt = parts.join(', ');
  }

  return {
    prompt,
    analysis: {
      subject: subject || 'Primary subject extracted from visual inspection.',
      composition: composition || 'Eye-level composition with balanced framing.',
      environment: environment || 'Natural background setting with contextual depth.',
      lighting: lighting || 'Balanced lighting with natural highlight falloff.',
      camera: camera || 'Standard focal length with natural perspective.',
      style: style || 'High-fidelity photorealistic rendering.',
      colors: colors || 'Rich natural tones with balanced contrast.',
      details: details || 'Sharp textures and realistic material finishes.',
    },
  };
}

// Vision Call via OpenRouter with valid vision models and resilient fallback
async function callOpenRouterVision(imageBase64DataUrl: string, promptText: string): Promise<{ text: string; modelName: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  // Use configured model or active high-capability vision models on OpenRouter
  const candidateModels = process.env.OPENROUTER_VISION_MODEL
    ? [process.env.OPENROUTER_VISION_MODEL]
    : ['inclusionai/ling-3.0-flash-vl:free', 'qwen/qwen2.5-vl-72b-instruct'];

  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': process.env.APP_URL || 'https://ai.studio',
          'X-Title': 'Image to Prompt SaaS',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: promptText,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageBase64DataUrl,
                  },
                },
              ],
            },
          ],
          max_tokens: 1500,
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.info(`OpenRouter model ${model} returned ${response.status}: ${errorBody.slice(0, 120)}`);
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        return { text: content, modelName: model };
      }
    } catch (err: any) {
      lastError = err;
      console.info(`OpenRouter attempt with ${model} note:`, err.message || err);
    }
  }

  throw lastError || new Error('All OpenRouter vision models failed or were unavailable');
}

// Vision Call via Google GenAI with resilient model failover
async function callGeminiVision(base64Data: string, mimeType: string, promptText: string): Promise<{ text: string; modelName: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.6-flash', 'gemini-flash-latest'];
  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType || 'image/jpeg',
                data: base64Data,
              },
            },
            {
              text: promptText,
            },
          ],
        },
      });

      if (response.text) {
        return { text: response.text, modelName: model };
      }
    } catch (err: any) {
      console.warn(`Vision attempt with ${model} failed:`, err.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error('All vision models failed to process image');
}

// POST /api/generate-prompt
app.post('/api/generate-prompt', async (req: Request, res: Response): Promise<void> => {
  try {
    const { image, mode = 'universal' } = req.body;

    if (!image || typeof image !== 'string') {
      res.status(400).json({
        success: false,
        error: 'An image is required in Base64 or Data URL format.',
      });
      return;
    }

    // Parse data URL
    let mimeType = 'image/jpeg';
    let base64Data = image;

    if (image.startsWith('data:')) {
      const match = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      } else {
        res.status(400).json({
          success: false,
          error: 'Invalid image data URI format.',
        });
        return;
      }
    }

    const promptText = buildVisionPrompt(mode);
    let rawResult = '';
    let modelUsed = '';

    // If OpenRouter key is present, try OpenRouter vision model first
    if (process.env.OPENROUTER_API_KEY) {
      try {
        const fullDataUrl = image.startsWith('data:')
          ? image
          : `data:${mimeType};base64,${base64Data}`;
        const orResult = await callOpenRouterVision(fullDataUrl, promptText);
        rawResult = orResult.text;
        modelUsed = `${orResult.modelName} (OpenRouter)`;
      } catch (openRouterErr: any) {
        console.info('OpenRouter note: falling back seamlessly to Gemini Vision:', openRouterErr.message);
      }
    }

    // Fallback to Gemini 2.5/3.8 Flash if OpenRouter was not used or failed
    if (!rawResult) {
      const geminiResult = await callGeminiVision(base64Data, mimeType, promptText);
      rawResult = geminiResult.text;
      modelUsed = process.env.OPENROUTER_API_KEY
        ? `${geminiResult.modelName} (Vision Fallback)`
        : `${geminiResult.modelName} (Vision)`;
    }

    const { prompt, analysis } = parseVisionResponse(rawResult);

    res.json({
      success: true,
      prompt,
      analysis,
      modelUsed,
    });
  } catch (error: any) {
    console.error('Error generating prompt:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze image and generate prompt.',
    });
  }
});

// POST /api/improve-prompt
app.post('/api/improve-prompt', async (req: Request, res: Response): Promise<void> => {
  try {
    const { prompt, mode = 'universal' } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ success: false, error: 'Prompt string is required.' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ success: false, error: 'GEMINI_API_KEY is required.' });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const instruction = `You are a master AI prompt engineer.
Take the following image generation prompt and IMPROVE it.
Elevate its visual fidelity, atmospheric depth, material realism, and optical camera specifications, while respecting the ${mode.toUpperCase()} generator style:
- If mode is DIGITAL_ART: enrich with concept art brushwork, dynamic digital illumination, volumetric depth, Octane render textures, and ArtStation trending mastery.
- If mode is ANIME: enrich with authentic Japanese anime/manga aesthetic, cel-shaded precision, expressive eyes and hair, dynamic action line work, and cinematic Makoto Shinkai / Kyoto Animation atmospheric lighting.
- If mode is CARTOON: enrich with stylized character silhouettes, expressive proportions, smooth clay or 3D Pixar/Disney subsurface scattering, and cheerful vibrant lighting.
- If mode is ULTRA_REALISTIC: maximize optical hyper-realism with authentic high-end medium-format camera specifications (e.g. Hasselblad/Sony, 85mm f/1.4, ISO 100), natural micro skin pores, fabric weaves, organic catchlights, and uncompressed 8K RAW fidelity.
- If mode is MIDJOURNEY: format for Midjourney v7 (use modern parameter flags like --ar 16:9 --v 7 --style raw, avoid old versions).
- If mode is FLUX: format for FLUX 1.1 Pro and Stable Diffusion 3.5 Large (use natural descriptive photography language, exact camera lens focal length, aperture, and realistic lighting).
- If mode is DETAILED or UNIVERSAL: create comprehensive, high-fidelity descriptive prose suitable for modern generators.
Do NOT output conversational remarks or explanations. Return ONLY the improved prompt text.

Original prompt:
${prompt}`;

    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.6-flash', 'gemini-flash-latest'];
    let improvedPrompt = prompt;

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: instruction,
        });
        if (response.text) {
          improvedPrompt = response.text.trim();
          break;
        }
      } catch (err: any) {
        console.warn(`Improve prompt attempt with ${model} failed:`, err.message || err);
      }
    }

    improvedPrompt = improvedPrompt.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();

    res.json({
      success: true,
      improvedPrompt,
    });
  } catch (err: any) {
    console.error('Error improving prompt:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to improve prompt.',
    });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Image-to-Prompt Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

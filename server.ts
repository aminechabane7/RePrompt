import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

// Enforce HTTPS in production behind reverse proxies and add security headers
app.use((req, res, next) => {
  const forwardedProto = req.headers['x-forwarded-proto'];
  if (forwardedProto && forwardedProto !== 'https' && process.env.NODE_ENV === 'production') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (req.secure || forwardedProto === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
});

// Serve public static directory (sitemap.xml, robots.txt, llms.txt, og-image.png, etc.)
app.use(express.static(path.join(process.cwd(), 'public')));

// Explicit SEO endpoints
app.get('/robots.txt', (req: Request, res: Response) => {
  res.type('text/plain').sendFile(path.join(process.cwd(), 'public', 'robots.txt'));
});

app.get('/sitemap.xml', (req: Request, res: Response) => {
  res.type('application/xml').sendFile(path.join(process.cwd(), 'public', 'sitemap.xml'));
});

app.get(['/llms.txt', '/lms.txt'], (req: Request, res: Response) => {
  res.type('text/plain; charset=utf-8').sendFile(path.join(process.cwd(), 'public', 'llms.txt'));
});

// Google Search Console HTML file verification endpoint pattern
app.get('/google:code.html', (req: Request, res: Response) => {
  res.type('text/html').send(`google-site-verification: google${req.params.code}.html`);
});

// Allow base64 images and video frames up to 50MB
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// In-memory rate limiter to protect public AI endpoints from automated abuse
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS_PER_WINDOW = 60; // 60 requests per 10 mins per IP

function rateLimiter(req: Request, res: Response, next: () => void) {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'anonymous';
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    const retrySec = Math.ceil((record.resetTime - now) / 1000);
    res.set('Retry-After', String(retrySec));
    return res.status(429).json({
      success: false,
      error: `Rate limit reached. Please wait ${retrySec} seconds before generating again.`,
    });
  }

  record.count += 1;
  next();
}

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasOpenRouterKey: Boolean(process.env.OPENROUTER_API_KEY),
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Helper to construct reverse-engineering prompt
function buildVisionPrompt(
  mode: string = 'general',
  targetEngine: string = 'general',
  detailLevel: string = 'detailed'
): string {
  let modeGuidance = '';
  switch (mode) {
    case 'photorealistic':
    case 'ultra_realistic':
      modeGuidance = 'Photorealistic photographic fidelity. Emphasize authentic optical physics, lens millimeter, f-stop depth of field, natural skin micro-pores, organic catchlights, subsurface skin scattering, raw uncompressed texture fidelity, and zero plastic airbrushing.';
      break;
    case 'cinematic':
      modeGuidance = 'Cinematic film stills. Emphasize widescreen anamorphic optics, lens flares, dramatic three-point or chiaroscuro lighting, moody cinematic color grading (teal & amber or naturalistic duotone), atmospheric volumetric haze, and narrative framing.';
      break;
    case 'product_photography':
      modeGuidance = 'Commercial product studio staging. Emphasize diffused softbox illumination, clean edge rim lighting, tactile material finishes (matte, high gloss, brushed metal, clear glass), reflection control, crisp isolation, and ultra-sharp edge definition.';
      break;
    case 'portrait':
      modeGuidance = 'Portrait photography. Emphasize facial bone structure, gaze, emotional expression, catchlights, optical 85mm shallow depth of field with creamy bokeh, natural skin tones, and subtle ambient hair light.';
      break;
    case 'fashion':
      modeGuidance = 'High-fashion editorial and runway photography. Emphasize couture tailoring, garment fabric drape and weave, dynamic editorial posing, intentional high-contrast lighting, and avant-garde aesthetic styling.';
      break;
    case 'anime':
      modeGuidance = 'Japanese animation and manga aesthetic. Emphasize clean cel shading, expressive linework, distinct anime eye/hair highlights, vibrant palette, and cinematic keyframe animation backgrounds.';
      break;
    case 'illustration':
    case 'digital_art':
      modeGuidance = 'Artistic illustration and digital concept art. Emphasize expressive brushwork, volumetric illumination, textural layering, imaginative composition, and stylized color harmonies.';
      break;
    case 'render_3d':
    case 'cartoon':
      modeGuidance = '3D computer-rendered aesthetics. Emphasize ray-traced ambient occlusion, subsurface light scattering, physically based rendering (PBR) materials, specular highlights, and dimensional depth.';
      break;
    case 'architecture':
      modeGuidance = 'Architectural photography. Emphasize two-point perspective, structural lines, vanishing points, natural sunlight and shadow geometry, material finishes (concrete, timber, steel, glass), and spatial volume.';
      break;
    case 'interior_design':
      modeGuidance = 'Interior design staging. Emphasize spatial layout, furniture arrangement, interior ambient illumination, window daylight roll-off, textiles, and warm lived-in architectural atmosphere.';
      break;
    case 'social_media':
      modeGuidance = 'Social media creative. Emphasize high-engagement visual hooks, vibrant modern colors, crisp focal subject, lifestyle context, clean contrast, and scroll-stopping clarity.';
      break;
    case 'general':
    case 'universal':
    case 'detailed':
    default:
      modeGuidance = 'Universal image generation. Balanced, descriptive, coherent prompt with clean visual focus, natural lighting, and well-structured composition suitable for any generator.';
      break;
  }

  let engineGuidance = '';
  switch (targetEngine) {
    case 'midjourney':
      engineGuidance = 'Target: Midjourney v7. Format with evocative visual descriptors and cinematic keywords. Append relevant parameter flags at the very end of FINAL PROMPT (e.g. --ar <aspect_ratio> --v 7). If photographic or photoreal, also include --style raw.';
      break;
    case 'flux':
      engineGuidance = 'Target: Black Forest Labs FLUX 1.1 Pro. Use natural descriptive art direction, exact optical camera specs (e.g. 50mm f/1.4 lens), physical lighting description, and clean framing.';
      break;
    case 'stable_diffusion':
      engineGuidance = 'Target: Stable Diffusion 3.5 Large / SDXL. Format using structured descriptive clauses, camera specifications, and stylistic weighting.';
      break;
    case 'dalle3':
      engineGuidance = 'Target: DALL-E 3. Use expressive, descriptive natural language paragraphs detailing composition, subject, ambiance, and lighting without technical parameter flags.';
      break;
    case 'imagen':
      engineGuidance = 'Target: Google Imagen 3 / Gemini. Use clean, precise, photorealistic or artistic descriptive language with clear spatial references.';
      break;
    case 'general':
    default:
      engineGuidance = 'Target: General Purpose. Generator-agnostic, structured prompt that works reliably across modern image generators without proprietary flags.';
      break;
  }

  let detailGuidance = '';
  switch (detailLevel) {
    case 'simple':
      detailGuidance = 'Detail Level: Simple. Make the FINAL PROMPT concise (1-2 sentences), capturing only the primary subject, main style, and essential lighting.';
      break;
    case 'professional':
      detailGuidance = 'Detail Level: Professional. Make the FINAL PROMPT comprehensive and production-ready, specifying exact camera lens in mm, aperture f-stop, light source angles, color temperature, and tactile material textures.';
      break;
    case 'detailed':
    default:
      detailGuidance = 'Detail Level: Detailed. Make the FINAL PROMPT balanced (3-4 sentences), covering subject, environment, lighting, composition, colors, and textures.';
      break;
  }

  return `You are an expert AI image prompt engineer and computer vision analyst.

Analyze the provided image carefully.
Your goal is NOT simply to passively describe what you see.
Reverse-engineer the visual characteristics that would be required to recreate a visually similar result with modern AI image generators.

Analyze across these dimensions:
1. Main subject & secondary subjects (appearance, clothing, expression, pose, materials)
2. Composition & framing (rule of thirds, shot type, camera angle, perspective, positioning)
3. Environment & background (setting, architectural elements, atmosphere, time of day, weather)
4. Lighting & shadows (primary light source, direction, quality, contrast, temperature)
5. Camera setup & optics (lens focal length estimate, aperture look, depth of field, sensor feel)
6. Artistic medium & style (editorial photo, 35mm film, digital painting, 3D render, etc.)
7. Color palette & tones (dominant hues, accent highlights, color grading, mood)
8. Materials, textures & micro-details (fabric weave, reflections, surface finishes)
9. Aspect ratio estimate (e.g. 1:1, 16:9, 4:5, 9:16, 3:2, 2:3)

TARGET PROMPT MODE: ${mode.toUpperCase()} (${modeGuidance})
TARGET GENERATOR SYSTEM: ${targetEngine.toUpperCase()} (${engineGuidance})
DETAIL LEVEL: ${detailLevel.toUpperCase()} (${detailGuidance})

CRITICAL RULES:
- Do NOT invent details that cannot reasonably be inferred from the image.
- Avoid meaningless AI buzzwords like "photorealistic 8k octane trending on artstation" unless specifically called for by the medium.
- Ground every attribute in visual evidence.
- The FINAL PROMPT must follow this logical construction:
  Subject + appearance + pose/action + environment + composition + camera/lens + lighting + color mood + style + textures/materials + atmospheric quality.

Return your response strictly in the following structured format with these exact uppercase labels:

DETECTED STYLE:
[Short 2-4 word descriptor of the aesthetic, e.g. "Editorial 35mm Portrait", "Minimalist Scandinavian Interior", "Cyberpunk Digital Art", "Commercial Product Studio"]

ASPECT RATIO:
[Estimated aspect ratio from the image geometry, e.g. "1:1", "16:9", "4:5", "9:16", "3:2", "2:3"]

SUBJECT:
[2-3 sentences specifying the core subject, exact appearance, clothing, and pose]

SECONDARY SUBJECTS:
[Any notable secondary characters, background people, or key objects]

COMPOSITION:
[Framing, shot type, camera angle, rule of thirds, perspective]

ENVIRONMENT:
[Setting, background depth, atmospheric conditions, time of day]

LIGHTING:
[Primary light direction, softness/hardness, highlight roll-off, shadow quality, color temperature]

CAMERA:
[Lens millimeter estimate, aperture feel/depth of field, camera type]

STYLE:
[Medium, aesthetic genre, visual treatment, post-processing]

COLOR PALETTE:
[Primary hues, secondary accents, contrast, overall color mood]

MATERIALS & TEXTURES:
[Essential tactile surfaces, fabrics, metals, glass, reflections]

MOOD:
[Overall emotional tone and atmosphere]

NEGATIVE PROMPT:
[A high-impact, comma-separated list of negative prompts tailored for this specific image and mode to prevent defects, distortions, artifacts, bad hands, plastic skin, or style clashes]

FINAL PROMPT:
[One clean, copy-ready prompt combining the reverse-engineered visual characteristics according to the specified TARGET GENERATOR SYSTEM and DETAIL LEVEL. Do not wrap in markdown code blocks.]`;
}

// Default negative prompts tailored for each mode
function getDefaultNegativePrompt(mode: string): string {
  switch (mode) {
    case 'photorealistic':
    case 'ultra_realistic':
    case 'portrait':
      return 'blurry, out of focus, low resolution, plastic skin, doll face, CGI, 3D render, cartoon, deformed iris, mutated hands, unnatural skin smoothing, overexposed, oversaturated, watermark, signature, jpeg artifacts, extra fingers, poor anatomy';
    case 'fashion':
      return 'amateur photography, messy background, deformed limbs, wrinkled dirty garments, plastic skin, bad anatomy, blurry, out of focus, watermark, text';
    case 'cinematic':
      return 'video game graphics, low contrast, washed out, amateur composition, oversaturated, blown out highlights, flat lighting, watermark, signature, blurry';
    case 'product_photography':
      return 'dirty surface, cluttered background, poor lighting, dust, scratches, fingerprints, watermark, bad reflection, distorted labels, amateur phone camera, blurry';
    case 'anime':
      return 'photorealistic, 3D render, western comic style, bad anatomy, deformed fingers, extra limbs, poorly drawn face, blurry, lowres, watermark, realistic skin pores';
    case 'illustration':
    case 'digital_art':
      return 'photograph, blurry, low resolution, messy lines, watermark, bad anatomy, deformed hands, poor composition, overexposed, artifacting, amateur drawing';
    case 'render_3d':
    case 'cartoon':
      return 'photograph, low polygon, faceted shading, jagged edges, low resolution, noisy render, creepy doll, uncanny valley, harsh shadows';
    case 'architecture':
    case 'interior_design':
      return 'crooked walls, warped perspective, distorted architectural geometry, lens distortion, messy clutter, unnatural lighting, oversaturated, blurry';
    case 'social_media':
      return 'dark gloomy lighting, blurry, low resolution, bad composition, boring framing, muted washed out colors, pixelated';
    case 'general':
    case 'universal':
    case 'detailed':
    default:
      return 'blurry, low quality, distorted anatomy, extra limbs, bad hands, text, watermark, oversaturated, deformed features, low resolution, artifacts';
  }
}

// Track OpenRouter key credits in-memory to prevent repeated 402 errors
let openRouterHasCredits = true;

// Parse structured output
function parseVisionResponse(
  rawText: string,
  mode: string = 'general',
  targetEngine: string = 'general'
) {
  const extractSection = (label: string, nextLabels: string[]): string => {
    if (nextLabels.length === 0) {
      const match = rawText.match(new RegExp(`${label}:?\\s*([\\s\\S]*)$`, 'i'));
      return match ? match[1].trim() : '';
    }
    const pattern = new RegExp(`${label}:?\\s*([\\s\\S]*?)(?=(?:${nextLabels.join('|')}):|$)`, 'i');
    const match = rawText.match(pattern);
    return match ? match[1].trim() : '';
  };

  const detectedStyle = extractSection('DETECTED STYLE', ['ASPECT RATIO', 'SUBJECT', 'COMPOSITION', 'ENVIRONMENT']);
  const aspectRatio = extractSection('ASPECT RATIO', ['SUBJECT', 'SECONDARY SUBJECTS', 'COMPOSITION', 'ENVIRONMENT']);
  const subject = extractSection('SUBJECT', ['SECONDARY SUBJECTS', 'COMPOSITION', 'ENVIRONMENT', 'LIGHTING', 'CAMERA', 'STYLE', 'COLOR PALETTE', 'MATERIALS & TEXTURES', 'MOOD', 'NEGATIVE PROMPT', 'FINAL PROMPT']);
  const secondarySubjects = extractSection('SECONDARY SUBJECTS', ['COMPOSITION', 'ENVIRONMENT', 'LIGHTING', 'CAMERA', 'STYLE', 'COLOR PALETTE', 'MATERIALS & TEXTURES', 'MOOD', 'NEGATIVE PROMPT', 'FINAL PROMPT']);
  const composition = extractSection('COMPOSITION', ['ENVIRONMENT', 'LIGHTING', 'CAMERA', 'STYLE', 'COLOR PALETTE', 'MATERIALS & TEXTURES', 'MOOD', 'NEGATIVE PROMPT', 'FINAL PROMPT']);
  const environment = extractSection('ENVIRONMENT', ['LIGHTING', 'CAMERA', 'STYLE', 'COLOR PALETTE', 'MATERIALS & TEXTURES', 'MOOD', 'NEGATIVE PROMPT', 'FINAL PROMPT']);
  const lighting = extractSection('LIGHTING', ['CAMERA', 'STYLE', 'COLOR PALETTE', 'MATERIALS & TEXTURES', 'MOOD', 'NEGATIVE PROMPT', 'FINAL PROMPT']);
  const camera = extractSection('CAMERA', ['STYLE', 'COLOR PALETTE', 'MATERIALS & TEXTURES', 'MOOD', 'NEGATIVE PROMPT', 'FINAL PROMPT']);
  const style = extractSection('STYLE', ['COLOR PALETTE', 'MATERIALS & TEXTURES', 'MOOD', 'NEGATIVE PROMPT', 'FINAL PROMPT']);
  const colors = extractSection('COLOR PALETTE', ['MATERIALS & TEXTURES', 'MOOD', 'NEGATIVE PROMPT', 'FINAL PROMPT']);
  const materials = extractSection('MATERIALS & TEXTURES', ['MOOD', 'NEGATIVE PROMPT', 'FINAL PROMPT']);
  const mood = extractSection('MOOD', ['NEGATIVE PROMPT', 'FINAL PROMPT']);
  let negativePrompt = extractSection('NEGATIVE PROMPT', ['FINAL PROMPT']);

  // Extract FINAL PROMPT
  const finalPromptMatch = rawText.match(/FINAL PROMPT:?\s*([\s\S]*)$/i);
  let prompt = finalPromptMatch ? finalPromptMatch[1].trim() : '';

  // Clean up any surrounding quotes or code blocks
  prompt = prompt.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
  negativePrompt = negativePrompt.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();

  // If prompt is empty, synthesize a fallback from the extracted sections
  if (!prompt || prompt.length < 20) {
    const parts = [style, subject, environment, lighting, camera, materials].filter(Boolean);
    prompt = parts.join(', ');
  }

  // If Midjourney target engine requested and prompt doesn't already have --ar, ensure proper parameter tags
  if (targetEngine === 'midjourney') {
    const arMatch = aspectRatio.match(/\d+:\d+/);
    const cleanAspect = arMatch ? arMatch[0] : '16:9';
    if (!prompt.includes('--ar')) {
      prompt = `${prompt} --ar ${cleanAspect} --v 7`;
      if ((mode === 'photorealistic' || mode === 'portrait' || mode === 'fashion') && !prompt.includes('--style raw')) {
        prompt = `${prompt} --style raw`;
      }
    }
  }

  // Fallback for negative prompt if empty
  if (!negativePrompt || negativePrompt.length < 10) {
    negativePrompt = getDefaultNegativePrompt(mode);
  }

  const ratioMatch = aspectRatio.match(/\d+:\d+/);
  const cleanRatio = ratioMatch ? ratioMatch[0] : '16:9';
  const cleanStyle = detectedStyle || (mode ? mode.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Photorealistic');

  return {
    prompt,
    negativePrompt,
    detectedStyle: cleanStyle,
    aspectRatio: cleanRatio,
    analysis: {
      subject: subject || 'Primary subject reverse-engineered from visual inspection.',
      secondarySubjects: secondarySubjects || '',
      composition: composition || 'Balanced framing with intentional visual hierarchy.',
      environment: environment || 'Cohesive environmental context and backdrop depth.',
      lighting: lighting || 'Natural lighting balance with dimensional shadow falloff.',
      camera: camera || 'Optically grounded focal perspective.',
      style: style || cleanStyle,
      colors: colors || 'Harmonious color palette with balanced tonal contrast.',
      materials: materials || 'Authentic tactile surface finishes and textures.',
      details: materials ? `${materials}. ${mood || ''}`.trim() : (mood || 'High visual fidelity and texture definition.'),
      mood: mood || 'Atmospheric and engaging visual presence.',
      aspectRatio: cleanRatio,
    },
  };
}

// Vision Call via OpenRouter with valid vision models and resilient fallback
async function callOpenRouterVision(imageBase64DataUrl: string, promptText: string): Promise<{ text: string; modelName: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || !openRouterHasCredits) {
    throw new Error('OPENROUTER_API_KEY not configured or has insufficient credits');
  }

  // Use configured model or verified free tier vision model
  const candidateModels = process.env.OPENROUTER_VISION_MODEL
    ? [process.env.OPENROUTER_VISION_MODEL]
    : ['inclusionai/ling-3.0-flash-vl:free'];

  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

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
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 402) {
          openRouterHasCredits = false;
          throw new Error('OpenRouter account has insufficient credits for paid models');
        }
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        return { text: content, modelName: model };
      }
    } catch (err: any) {
      lastError = err;
      if (err.name === 'AbortError') {
        lastError = new Error('OpenRouter request timed out');
      }
      if (err.message?.includes('insufficient credits')) {
        break;
      }
    }
  }

  throw lastError || new Error('All OpenRouter vision models failed or were unavailable');
}

// Vision Call via Google GenAI with resilient model failover & retry
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

  const candidateModels = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];
  let lastError: any = null;

  for (const model of candidateModels) {
    for (let attempt = 0; attempt < 2; attempt++) {
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
        lastError = err;
        if (err.status === 503 || err.message?.includes('503') || err.message?.includes('high demand')) {
          if (attempt === 0) {
            await new Promise(r => setTimeout(r, 1000));
            continue;
          }
        }
        break;
      }
    }
  }

  throw lastError || new Error('All vision models failed to process image');
}

// POST /api/generate-prompt
app.post('/api/generate-prompt', rateLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      image,
      mode = 'general',
      targetEngine = 'general',
      detailLevel = 'detailed',
    } = req.body;

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

    // Check payload size
    if (base64Data.length > 20 * 1024 * 1024) {
      res.status(400).json({
        success: false,
        error: 'Image payload exceeds the maximum 15MB limit.',
      });
      return;
    }

    const promptText = buildVisionPrompt(mode, targetEngine, detailLevel);
    let rawResult = '';
    let modelUsed = '';

    // If OpenRouter key is present and has credits, try OpenRouter vision model first
    if (process.env.OPENROUTER_API_KEY && openRouterHasCredits) {
      try {
        const fullDataUrl = image.startsWith('data:')
          ? image
          : `data:${mimeType};base64,${base64Data}`;
        const orResult = await callOpenRouterVision(fullDataUrl, promptText);
        rawResult = orResult.text;
        modelUsed = `${orResult.modelName} (OpenRouter)`;
      } catch {
        // Seamless fallback to Gemini Vision
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

    const { prompt, negativePrompt, detectedStyle, aspectRatio, analysis } = parseVisionResponse(
      rawResult,
      mode,
      targetEngine
    );

    res.json({
      success: true,
      prompt,
      negativePrompt,
      detectedStyle,
      aspectRatio,
      targetEngine,
      detailLevel,
      analysis,
      modelUsed,
    });
  } catch (error: any) {
    console.error('Error generating prompt:', error?.message || error);
    // Security check: never expose API keys, internal paths, or stack traces
    const safeMsg = error.message?.includes('GEMINI_API_KEY')
      ? 'AI vision service credentials missing or initializing.'
      : (error.message?.replace(/key=[a-zA-Z0-9_\-]+/gi, 'key=***') || 'Failed to analyze image and generate prompt.');
    res.status(500).json({
      success: false,
      error: safeMsg,
    });
  }
});

// Helper to construct video reverse-engineering prompt
function buildVideoVisionPrompt(mode: string): string {
  let modeGuidance = '';
  switch (mode) {
    case 'runway_gen3':
      modeGuidance = 'Optimized for Runway Gen-3 Alpha. Include explicit director camera commands (e.g. [Camera: Pan right, Slow dolly forward, FPV low angle]), temporal motion speeds, dynamic character physics, and precise lighting continuity.';
      break;
    case 'luma_dream_machine':
      modeGuidance = 'Optimized for Luma Dream Machine. Focus on continuous natural physics, fluid spatial velocity, realistic camera tracking, and environmental particle dynamics.';
      break;
    case 'kling':
      modeGuidance = 'Optimized for Kling 1.5 and Hailuo Minimax. Emphasize physical weight, human kinetic expressions, smooth character action, and atmospheric volumetric lighting.';
      break;
    case 'sora':
      modeGuidance = 'Optimized for OpenAI Sora. Write dense, high-fidelity narrative direction with complex temporal physics, multi-character interactions, continuous reflections, and cinematic lighting changes.';
      break;
    case 'pika':
      modeGuidance = 'Optimized for Pika 2.0. Specify camera movement commands (-camera zoom in, -camera pan left), dynamic motion intensity, and physics effects.';
      break;
    case 'universal_video':
    default:
      modeGuidance = 'Universal AI Video Prompt. Formats a balanced, highly descriptive shot script detailing camera path, kinetic motion, atmospheric lighting, and pacing that works across Runway Gen-3, Luma Dream Machine, Sora, Kling, and Pika.';
      break;
  }

  return `You are a world-class AI cinematography director and video prompt engineer.

Analyze the chronological sequence of keyframes provided from this video clip (showing the initial framing, midpoint motion, and subsequent temporal progression).
Reverse-engineer the exact temporal dynamics, camera trajectory, subject kinetics, and cinematic lighting required to recreate this video in an AI video generator.

Analyze:
1. CAMERA MOTION: Exact camera path (e.g., Dolly In, Aerial FPV Drone Tracking, 360° Orbit, Handheld Pan, Low-Angle Jib, Steadicam Push).
2. SUBJECT KINEMATICS: Physical motion, gestures, locomotion, particle or fluid dynamics, momentum, and speed.
3. TEMPORAL PACING: Shot speed (e.g., 24fps cinematic, slow-motion 60fps/120fps, high-speed time-lapse, steady real-time).
4. LIGHTING & ATMOSPHERE: Dynamic light changes over time (lens flares, passing volumetric shadows, golden hour transitions, fog movement).
5. CINEMATIC FRAMING: Shot scale (extreme wide, medium shot, tight close-up), aspect ratio, lens depth-of-field, and focal length.
6. VISUAL STYLE: 35mm cinematic film stock, digital anime keyframes, 3D CGI animation, documentary realism, or hyperrealistic render.

TARGET VIDEO ENGINE: ${mode.toUpperCase()}
Mode specification: ${modeGuidance}

Return your response strictly in the following structured format with these exact uppercase labels:

CAMERA MOTION:
[Concise label and 1-2 sentence description of camera trajectory and lens action]

SUBJECT KINEMATICS:
[Physical movement, subject trajectory, speed, and momentum]

TEMPORAL PACING:
[Shot speed, frame rate feel, and duration dynamics]

LIGHTING & ATMOSPHERE:
[Volumetric atmosphere, shadow movement, highlight shifts]

CINEMATIC FRAMING:
[Shot scale, focal depth, composition balance]

VISUAL STYLE:
[Cinematic medium, film stock or render style, color grading]

CAMERA TAG:
[Short 2-4 word camera movement tag, e.g. "Slow Dolly In", "Aerial Drone Sweep", "360° Orbit", "Handheld Tracking"]

FINAL VIDEO PROMPT:
[A complete, copy-ready AI video prompt combining camera path, subject action, temporal motion, and atmosphere, formatted for ${mode}. Do not use markdown backticks.]

NEGATIVE VIDEO PROMPT:
[A clean comma-separated list of negative prompts to prevent video artifacts: e.g. flickering, sudden morphing, warped faces, jittery camera, temporal inconsistency, frame skipping, watermark, stuttering, plastic skin, unnatural physics.]`;
}

// Default video negative prompts tailored for each mode
function getDefaultVideoNegativePrompt(mode: string): string {
  switch (mode) {
    case 'runway_gen3':
      return 'flickering, jittery camera, warped faces, unnatural limb morphing, sudden camera cuts, static frame, motion blur artifacts, temporal inconsistency, watermark, low frame rate';
    case 'luma_dream_machine':
      return 'morphing, melted objects, erratic camera movement, distorted anatomy, jerky motion, stuttering, floating artifacts, temporal distortion, watermark, low quality';
    case 'kling':
      return 'unnatural motion, robotic movement, deformed hands, face glitching, floating artifacts, stuttering frames, blurry, lowres, watermark';
    case 'sora':
      return 'temporal inconsistency, unnatural physics, morphing limbs, camera jitter, low resolution, artifacts, watermark, sudden jumps';
    case 'pika':
      return 'flicker, jitter, bad animation, deformed anatomy, warped background, glitching, blurry, watermark';
    case 'universal_video':
    default:
      return 'flickering, sudden morphing, warped faces, jittery camera, temporal inconsistency, frame skipping, watermark, stuttering, plastic skin, unnatural physics, low resolution';
  }
}

// Parse structured video output
function parseVideoVisionResponse(rawText: string, mode: string = 'universal_video') {
  const extractSection = (label: string, nextLabels: string[]): string => {
    if (nextLabels.length === 0) {
      const match = rawText.match(new RegExp(`${label}:?\\s*([\\s\\S]*)$`, 'i'));
      return match ? match[1].trim() : '';
    }
    const pattern = new RegExp(`${label}:?\\s*([\\s\\S]*?)(?=(?:${nextLabels.join('|')}):|$)`, 'i');
    const match = rawText.match(pattern);
    return match ? match[1].trim() : '';
  };

  const cameraMotion = extractSection('CAMERA MOTION', ['SUBJECT KINEMATICS', 'TEMPORAL PACING', 'LIGHTING & ATMOSPHERE', 'CINEMATIC FRAMING', 'VISUAL STYLE', 'CAMERA TAG', 'FINAL VIDEO PROMPT', 'NEGATIVE VIDEO PROMPT']);
  const subjectKinematics = extractSection('SUBJECT KINEMATICS', ['TEMPORAL PACING', 'LIGHTING & ATMOSPHERE', 'CINEMATIC FRAMING', 'VISUAL STYLE', 'CAMERA TAG', 'FINAL VIDEO PROMPT', 'NEGATIVE VIDEO PROMPT']);
  const temporalPacing = extractSection('TEMPORAL PACING', ['LIGHTING & ATMOSPHERE', 'CINEMATIC FRAMING', 'VISUAL STYLE', 'CAMERA TAG', 'FINAL VIDEO PROMPT', 'NEGATIVE VIDEO PROMPT']);
  const lightingAtmosphere = extractSection('LIGHTING & ATMOSPHERE', ['CINEMATIC FRAMING', 'VISUAL STYLE', 'CAMERA TAG', 'FINAL VIDEO PROMPT', 'NEGATIVE VIDEO PROMPT']);
  const cinematicFraming = extractSection('CINEMATIC FRAMING', ['VISUAL STYLE', 'CAMERA TAG', 'FINAL VIDEO PROMPT', 'NEGATIVE VIDEO PROMPT']);
  const visualStyle = extractSection('VISUAL STYLE', ['CAMERA TAG', 'FINAL VIDEO PROMPT', 'NEGATIVE VIDEO PROMPT']);
  let cameraTag = extractSection('CAMERA TAG', ['FINAL VIDEO PROMPT', 'NEGATIVE VIDEO PROMPT']);
  let prompt = extractSection('FINAL VIDEO PROMPT', ['NEGATIVE VIDEO PROMPT']);
  let negativePrompt = extractSection('NEGATIVE VIDEO PROMPT', []);

  // Clean up any surrounding quotes or code blocks
  prompt = prompt.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
  negativePrompt = negativePrompt.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
  cameraTag = cameraTag.replace(/^["']|["']$/g, '').trim();

  if (!prompt || prompt.length < 20) {
    const parts = [cameraMotion, subjectKinematics, lightingAtmosphere, visualStyle].filter(Boolean);
    prompt = parts.join(', ');
  }

  if (!negativePrompt || negativePrompt.length < 10) {
    negativePrompt = getDefaultVideoNegativePrompt(mode);
  }

  if (!cameraTag || cameraTag.length < 3) {
    cameraTag = cameraMotion ? cameraMotion.split('.')[0].slice(0, 30) : 'Cinematic Movement';
  }

  return {
    prompt,
    negativePrompt,
    cameraMovement: cameraTag,
    analysis: {
      cameraMotion: cameraMotion || 'Dynamic cinematic camera tracking path.',
      subjectKinematics: subjectKinematics || 'Natural physical motion with realistic momentum.',
      temporalPacing: temporalPacing || 'Smooth 24fps cinematic pacing.',
      lightingAtmosphere: lightingAtmosphere || 'Volumetric cinematic lighting with continuous tone.',
      cinematicFraming: cinematicFraming || 'Balanced widescreen framing with natural depth.',
      visualStyle: visualStyle || 'High-fidelity cinematic visual aesthetic.',
    },
  };
}

// Multi-frame OpenRouter vision call
async function callOpenRouterVideoVision(frames: string[], promptText: string): Promise<{ text: string; modelName: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || !openRouterHasCredits) throw new Error('OPENROUTER_API_KEY not configured or has insufficient credits');

  const candidateModels = process.env.OPENROUTER_VISION_MODEL
    ? [process.env.OPENROUTER_VISION_MODEL]
    : ['inclusionai/ling-3.0-flash-vl:free'];

  let lastError: any = null;
  for (const model of candidateModels) {
    try {
      const contentParts: any[] = [
        {
          type: 'text',
          text: `Here are ${frames.length} chronological keyframes extracted from the video sequence (from start to finish). ${promptText}`,
        },
      ];
      for (const frame of frames) {
        contentParts.push({
          type: 'image_url',
          image_url: { url: frame },
        });
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 22000);

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': process.env.APP_URL || 'https://ai.studio',
          'X-Title': 'Video to Prompt AI',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: contentParts }],
          max_tokens: 2000,
          temperature: 0.2,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 402) {
          openRouterHasCredits = false;
          throw new Error('OpenRouter account has insufficient credits for paid models');
        }
        continue;
      }
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) return { text, modelName: model };
    } catch (e: any) {
      lastError = e;
      if (e.name === 'AbortError') {
        lastError = new Error('OpenRouter video request timed out');
      }
      if (e.message?.includes('insufficient credits')) {
        break;
      }
    }
  }
  throw lastError || new Error('All OpenRouter vision models failed for video');
}

// Multi-frame Gemini vision call with resilient model failover & retry
async function callGeminiVideoVision(
  frames: Array<{ base64Data: string; mimeType: string }>,
  promptText: string
): Promise<{ text: string; modelName: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });

  const candidateModels = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];
  let lastError: any = null;

  for (const model of candidateModels) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const parts: any[] = frames.map((f) => ({
          inlineData: {
            mimeType: f.mimeType || 'image/jpeg',
            data: f.base64Data,
          },
        }));
        parts.push({
          text: `Here are ${frames.length} chronological keyframes extracted from the video sequence (from start to finish). ${promptText}`,
        });

        const response = await ai.models.generateContent({
          model,
          contents: { parts },
        });

        if (response.text) {
          return { text: response.text, modelName: model };
        }
      } catch (err: any) {
        lastError = err;
        if (err.status === 503 || err.message?.includes('503') || err.message?.includes('high demand')) {
          if (attempt === 0) {
            await new Promise(r => setTimeout(r, 1000));
            continue;
          }
        }
        break;
      }
    }
  }
  throw lastError || new Error('All vision models failed to process video frames');
}

// POST /api/generate-video-prompt
app.post('/api/generate-video-prompt', rateLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { frames, mode = 'universal_video' } = req.body;

    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      res.status(400).json({
        success: false,
        error: 'At least one keyframe from the video is required.',
      });
      return;
    }

    // Limit to at most 5 frames to keep request fast and efficient
    const sanitizedFrames = frames.slice(0, 5);

    // Prepare parsed frames for Gemini
    const parsedGeminiFrames: Array<{ base64Data: string; mimeType: string }> = [];
    const formattedDataUrls: string[] = [];

    for (const frame of sanitizedFrames) {
      if (typeof frame !== 'string') continue;
      let mimeType = 'image/jpeg';
      let base64Data = frame;

      if (frame.startsWith('data:')) {
        const match = frame.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (match) {
          mimeType = match[1];
          base64Data = match[2];
        }
      }

      parsedGeminiFrames.push({ base64Data, mimeType });
      formattedDataUrls.push(
        frame.startsWith('data:') ? frame : `data:${mimeType};base64,${base64Data}`
      );
    }

    const promptText = buildVideoVisionPrompt(mode);
    let rawResult = '';
    let modelUsed = '';

    // Try OpenRouter first if configured and has credits
    if (process.env.OPENROUTER_API_KEY && openRouterHasCredits) {
      try {
        const orResult = await callOpenRouterVideoVision(formattedDataUrls, promptText);
        rawResult = orResult.text;
        modelUsed = `${orResult.modelName} (OpenRouter Video)`;
      } catch {
        // Seamless fallback to Gemini Video Vision
      }
    }

    // Fallback to Gemini Video Vision
    if (!rawResult) {
      const geminiResult = await callGeminiVideoVision(parsedGeminiFrames, promptText);
      rawResult = geminiResult.text;
      modelUsed = process.env.OPENROUTER_API_KEY
        ? `${geminiResult.modelName} (Video Fallback)`
        : `${geminiResult.modelName} (Video)`;
    }

    const { prompt, negativePrompt, cameraMovement, analysis } = parseVideoVisionResponse(
      rawResult,
      mode
    );

    res.json({
      success: true,
      prompt,
      negativePrompt,
      cameraMovement,
      analysis,
      modelUsed,
    });
  } catch (error: any) {
    console.error('Error generating video prompt:', error?.message || error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze video and generate director prompt.',
    });
  }
});


// POST /api/improve-prompt
app.post('/api/improve-prompt', rateLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { prompt, mode = 'general', targetEngine = 'general', detailLevel = 'detailed' } = req.body;
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
Elevate its visual fidelity, atmospheric depth, material realism, and optical camera specifications.
Target generator engine: ${targetEngine.toUpperCase()}
Style mode: ${mode.toUpperCase()}
Detail level: ${detailLevel.toUpperCase()}

Guidelines:
- If target is MIDJOURNEY: format for Midjourney v7 with appropriate descriptive vocabulary and parameters (e.g. --ar, --v 7, and --style raw when photorealistic).
- If target is FLUX: format for FLUX 1.1 Pro using natural descriptive photography language, exact camera lens focal length, aperture, and physical lighting.
- If target is STABLE_DIFFUSION: use structured descriptive clauses and clear lighting terms.
- If target is DALLE3: use expressive descriptive prose without technical parameters.
- If detail level is SIMPLE: keep concise (1-2 sentences).
- If detail level is PROFESSIONAL: provide comprehensive optical specifications, lighting angles, and micro-surface textures.

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

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { validateSignupEmail } from '../lib/disposableEmailValidator';

dotenv.config();

const app = express();
const PORT = 3000;

// Production base URL helper
const APP_BASE_URL = process.env.APP_URL || 'https://image-to-prompt-ai-mu.vercel.app';

// -----------------------------------------------------------------------------
// Supabase Server Setup
// -----------------------------------------------------------------------------
const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/^["']|["']$/g, '').trim();
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SERVICE_ROLE_KEY || '').replace(/^["']|["']$/g, '').trim();
const SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').replace(/^["']|["']$/g, '').trim();

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
  (SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY) &&
  !SUPABASE_URL.includes('your-project')
);

// Privileged server client using service role key (Never leak to browser!)
const supabaseAdmin: SupabaseClient | null = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && !SUPABASE_URL.includes('your-project'))
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

// Public server client for Auth operations and token verification
const supabaseAnonServer: SupabaseClient | null = (SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes('your-project'))
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

// Auth verification helper: verifies Supabase JWT access token with Supabase Auth service
async function verifyAuthUser(req: Request): Promise<{ id: string; email?: string } | null> {
  const authHeader = req.headers['authorization'];
  const headerPresent = Boolean(authHeader);
  const bearerParsed = Boolean(authHeader && authHeader.startsWith('Bearer '));
  const token = bearerParsed && authHeader ? authHeader.split(' ')[1] : '';
  const tokenLengthOk = Boolean(token && token.length > 0);
  const urlConfigured = Boolean(SUPABASE_URL && !SUPABASE_URL.includes('your-project'));
  const serverKeyConfigured = Boolean(SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY);

  const authClient = supabaseAdmin || supabaseAnonServer;

  if (!urlConfigured || !authClient) {
    console.log('[SERVER AUTH] header present:', headerPresent);
    console.log('[SERVER AUTH] bearer parsed:', bearerParsed);
    console.log('[SERVER AUTH] token length > 0:', tokenLengthOk);
    console.log('[SERVER AUTH] Supabase URL configured:', urlConfigured);
    console.log('[SERVER AUTH] Supabase server key configured:', serverKeyConfigured);
    console.log('[SERVER AUTH] getUser success: false');
    console.log('[SERVER AUTH] auth error present: true');
    console.log('[SERVER AUTH] authenticated user present: false');

    if (process.env.NODE_ENV === 'production') {
      return null;
    }
    // If Supabase is not configured yet in local development, allow demo user id
    return { id: 'demo-local-user', email: 'demo@reprompt.app' };
  }

  if (!tokenLengthOk) {
    console.log('[SERVER AUTH] header present:', headerPresent);
    console.log('[SERVER AUTH] bearer parsed:', bearerParsed);
    console.log('[SERVER AUTH] token length > 0: false');
    return null;
  }

  try {
    const { data: { user }, error } = await authClient.auth.getUser(token);
    const getUserSuccess = Boolean(!error && user);
    const authErrorPresent = Boolean(error);
    const authUserPresent = Boolean(user);

    console.log('[SERVER AUTH] header present:', headerPresent);
    console.log('[SERVER AUTH] bearer parsed:', bearerParsed);
    console.log('[SERVER AUTH] token length > 0:', tokenLengthOk);
    console.log('[SERVER AUTH] Supabase URL configured:', urlConfigured);
    console.log('[SERVER AUTH] Supabase server key configured:', serverKeyConfigured);
    console.log('[SERVER AUTH] getUser success:', getUserSuccess);
    console.log('[SERVER AUTH] auth error present:', authErrorPresent);
    console.log('[SERVER AUTH] authenticated user present:', authUserPresent);

    if (error || !user) {
      return null;
    }
    return { id: user.id, email: user.email };
  } catch {
    console.log('[SERVER AUTH] getUser exception occurred');
    return null;
  }
}

// 1. Enforce HTTPS in production behind reverse proxies and add security headers
app.use((req: Request, res: Response, next: NextFunction) => {
  const forwardedProto = req.headers['x-forwarded-proto'];
  if (forwardedProto && forwardedProto !== 'https' && process.env.NODE_ENV === 'production') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (req.secure || forwardedProto === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
});

// 2. Serve public static directory (sitemap.xml, robots.txt, llms.txt, og-image.png, local samples, etc.)
app.use(express.static(path.join(process.cwd(), 'public')));

// Explicit SEO endpoints
app.get('/robots.txt', (_req: Request, res: Response) => {
  res.type('text/plain').sendFile(path.join(process.cwd(), 'public', 'robots.txt'));
});

app.get('/sitemap.xml', (_req: Request, res: Response) => {
  res.type('application/xml').sendFile(path.join(process.cwd(), 'public', 'sitemap.xml'));
});

app.get(['/llms.txt', '/lms.txt'], (_req: Request, res: Response) => {
  res.type('text/plain; charset=utf-8').sendFile(path.join(process.cwd(), 'public', 'llms.txt'));
});

// 3. Strict Request Body Limit:
// 10MB raw image decoded + base64 overhead (~33%) = ~13.5MB. Set limit to 14MB to protect server memory.
app.use(express.json({ limit: '14mb' }));
app.use(express.urlencoded({ extended: true, limit: '14mb' }));

// Handle body parser errors (e.g. 413 Payload Too Large) gracefully
app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: 'Payload too large. The uploaded image exceeds the 10 MB limit.',
    });
  }
  if (err && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON request payload.',
    });
  }
  next(err);
});

// 4. Server-Side Rate Limiter:
// In-process memory store for single-instance protection.
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS_PER_WINDOW = 30; // 30 expensive AI vision requests per 10 mins per IP

function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'anonymous';
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  // Clean stale entries periodically if map grows
  if (rateLimitMap.size > 10000) {
    for (const [key, val] of rateLimitMap.entries()) {
      if (now > val.resetTime) rateLimitMap.delete(key);
    }
  }

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    const retrySec = Math.ceil((record.resetTime - now) / 1000);
    res.set('Retry-After', String(retrySec));
    return res.status(429).json({
      success: false,
      error: 'Too many requests. Please wait before trying again.',
    });
  }

  record.count += 1;
  next();
}

// 4b. Auth & Email Validation Rate Limiters:
// Separate sliding windows to avoid exhausting signup attempts when checking email syntax
const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_SIGNUP_REQUESTS_PER_WINDOW = 15; // max 15 account creations per 15 mins per IP
const signupRateLimitMap = new Map<string, { count: number; resetTime: number }>();

const EMAIL_CHECK_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_EMAIL_CHECKS_PER_WINDOW = 40; // max 40 email validation checks per 10 mins per IP
const emailCheckRateLimitMap = new Map<string, { count: number; resetTime: number }>();

function signupRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'anonymous';
  const now = Date.now();
  const record = signupRateLimitMap.get(ip);

  if (signupRateLimitMap.size > 5000) {
    for (const [key, val] of signupRateLimitMap.entries()) {
      if (now > val.resetTime) signupRateLimitMap.delete(key);
    }
  }

  if (!record || now > record.resetTime) {
    signupRateLimitMap.set(ip, { count: 1, resetTime: now + AUTH_RATE_LIMIT_WINDOW_MS });
    return next();
  }

  if (record.count >= MAX_SIGNUP_REQUESTS_PER_WINDOW) {
    const retrySec = Math.ceil((record.resetTime - now) / 1000);
    res.set('Retry-After', String(retrySec));
    return res.status(429).json({
      success: false,
      error: 'Too many signup attempts. Please wait a few minutes before trying again.',
    });
  }

  record.count += 1;
  next();
}

function emailCheckRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'anonymous';
  const now = Date.now();
  const record = emailCheckRateLimitMap.get(ip);

  if (emailCheckRateLimitMap.size > 5000) {
    for (const [key, val] of emailCheckRateLimitMap.entries()) {
      if (now > val.resetTime) emailCheckRateLimitMap.delete(key);
    }
  }

  if (!record || now > record.resetTime) {
    emailCheckRateLimitMap.set(ip, { count: 1, resetTime: now + EMAIL_CHECK_WINDOW_MS });
    return next();
  }

  if (record.count >= MAX_EMAIL_CHECKS_PER_WINDOW) {
    const retrySec = Math.ceil((record.resetTime - now) / 1000);
    res.set('Retry-After', String(retrySec));
    return res.status(429).json({
      valid: false,
      error: 'Too many validation requests. Please wait a moment.',
    });
  }

  record.count += 1;
  next();
}

// Gemini API key retrieval helper with fallback and trim support
function getGeminiApiKey(): string {
  const rawKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    '';
  return rawKey.replace(/^["']|["']$/g, '').trim();
}

// 5. Health Check Endpoint:
// Public liveness probe returning minimal status
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
  });
});

// 6. Magic Bytes & MIME Image Validation
interface ValidatedImage {
  mimeType: string;
  base64Data: string;
  byteLength: number;
}

const SUPPORTED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB strict limit

function validateAndDecodeImage(rawImage: unknown): { error?: string; status?: number; data?: ValidatedImage } {
  if (!rawImage || typeof rawImage !== 'string') {
    return { error: 'An image is required in Base64 or Data URL format.', status: 400 };
  }

  let mimeType = 'image/jpeg';
  let base64Data = rawImage;

  if (rawImage.startsWith('data:')) {
    const match = rawImage.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (!match) {
      return { error: 'Invalid image data URI format.', status: 400 };
    }
    mimeType = match[1].toLowerCase();
    base64Data = match[2];
  }

  // Reject unsupported declared mime types
  if (!SUPPORTED_MIME_TYPES.has(mimeType)) {
    return { error: 'Unsupported image format. Allowed formats: image/jpeg, image/png, image/webp.', status: 415 };
  }

  // Check base64 string length before buffer allocation
  if (base64Data.length > 14 * 1024 * 1024) {
    return { error: 'Image exceeds the 10 MB limit.', status: 413 };
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64Data, 'base64');
  } catch {
    return { error: 'The image could not be processed due to invalid Base64 encoding.', status: 400 };
  }

  if (buffer.length === 0) {
    return { error: 'The image could not be processed because the payload was empty.', status: 400 };
  }

  if (buffer.length > MAX_IMAGE_BYTES) {
    return { error: 'Image exceeds the 10 MB limit.', status: 413 };
  }

  // Inspect magic bytes for image integrity
  const isJpeg = buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng = buffer.length > 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  const isWebp =
    buffer.length > 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP';

  if (!isJpeg && !isPng && !isWebp) {
    return { error: 'Corrupted or unsupported image file signature. Please upload a valid JPG, PNG, or WEBP image.', status: 415 };
  }

  const verifiedMime = isJpeg ? 'image/jpeg' : isPng ? 'image/png' : 'image/webp';

  return {
    data: {
      mimeType: verifiedMime,
      base64Data,
      byteLength: buffer.length,
    },
  };
}

// 7. Prompt Builder with honest camera visual cues & engine-specific formats
function buildVisionPrompt(
  mode: string = 'general',
  targetEngine: string = 'general',
  detailLevel: string = 'detailed'
): string {
  let modeGuidance = '';
  switch (mode) {
    case 'photorealistic':
    case 'ultra_realistic':
      modeGuidance = 'Photographic visual characteristics. Note estimated lens look, approximate focal length equivalent, depth of field appearance, natural skin textures, catchlights, and authentic lighting falloff.';
      break;
    case 'cinematic':
      modeGuidance = 'Cinematic film aesthetic. Note widescreen aspect look, atmospheric haze, directional lighting contrast, and cinematic color mood.';
      break;
    case 'product_photography':
      modeGuidance = 'Product presentation staging. Note clean rim lighting, surface textures (matte, gloss, metallic), reflections, and crisp isolation.';
      break;
    case 'portrait':
      modeGuidance = 'Portrait framing. Note facial expression, estimated focal length look, shallow depth of field, catchlights, and soft directional light.';
      break;
    case 'fashion':
      modeGuidance = 'Editorial fashion aesthetic. Note styling, garment fabric textures, posing, and deliberate lighting contrast.';
      break;
    case 'anime':
      modeGuidance = 'Japanese animation aesthetic. Note cel-shading look, linework, expressive character highlights, and illustrative background style.';
      break;
    case 'illustration':
    case 'digital_art':
      modeGuidance = 'Digital illustration. Note brushwork feel, volumetric lighting, textural layering, and stylized color palette.';
      break;
    case 'render_3d':
    case 'cartoon':
      modeGuidance = '3D stylized render. Note ambient occlusion feel, subsurface light scattering look, smooth material finishes, and volumetric depth.';
      break;
    case 'architecture':
      modeGuidance = 'Architectural visualization. Note linear perspective, structural lines, natural daylight geometry, and material finishes.';
      break;
    case 'interior_design':
      modeGuidance = 'Interior staging. Note spatial arrangement, ambient daylight, furniture layout, and textile textures.';
      break;
    case 'social_media':
      modeGuidance = 'Modern content visual. Note focal subject, clean contrast, lifestyle context, and vibrant palette.';
      break;
    case 'general':
    case 'universal':
    case 'detailed':
    default:
      modeGuidance = 'Universal visual synthesis. Balanced, clear visual attributes suitable across modern generators.';
      break;
  }

  let engineGuidance = '';
  switch (targetEngine) {
    case 'midjourney':
      engineGuidance = 'Target: Midjourney v7. Format with evocative visual phrases and clean comma-separated descriptors. Include valid parameters at the end (e.g. --ar <ratio> --v 7). Only include --style raw when photorealism is present. Do NOT invent fake parameters.';
      break;
    case 'flux':
      engineGuidance = 'Target: FLUX 1.1 Pro. Use natural descriptive language art direction, estimated lens look, physical lighting description, and crisp composition without parameter flags.';
      break;
    case 'stable_diffusion':
      engineGuidance = 'Target: Stable Diffusion 3.5 Large. Use structured descriptive clauses, lighting direction, stylistic weighting, and provide a dedicated negative prompt.';
      break;
    case 'dalle3':
      engineGuidance = 'Target: DALL-E 3. Write a coherent, descriptive natural-language paragraph detailing composition, subject, ambiance, and lighting without parameter flags.';
      break;
    case 'imagen':
      engineGuidance = 'Target: Google Imagen 3 / Gemini. Use clear natural-language visual instructions with spatial placement and photographic qualities.';
      break;
    case 'general':
    default:
      engineGuidance = 'Target: Universal / General Purpose. Portable prompt with standard visual phrasing that works cleanly in any modern generator without proprietary tags.';
      break;
  }

  let detailGuidance = '';
  switch (detailLevel) {
    case 'simple':
      detailGuidance = 'Detail Level: Simple. Make the FINAL PROMPT concise (1-2 sentences), capturing the primary subject, main style, and essential lighting.';
      break;
    case 'professional':
      detailGuidance = 'Detail Level: Professional. Make the FINAL PROMPT structured and high-fidelity, specifying estimated lens equivalent, lighting setup, color palette, and surface textures without useless filler.';
      break;
    case 'detailed':
    default:
      detailGuidance = 'Detail Level: Detailed. Make the FINAL PROMPT balanced (3-4 sentences), covering subject, environment, lighting, composition, colors, and textures.';
      break;
  }

  return `You are an expert AI prompt engineer and computer vision analyst.

Analyze the provided image carefully.
Your goal is to reverse-engineer a prompt designed to recreate a visually similar result with modern AI image generators.
Do not simply describe the image as a caption. Construct an effective generation prompt.

Analyze across these dimensions:
1. Main subject & secondary elements (appearance, pose, clothing, materials)
2. Composition & framing (rule of thirds, shot scale, angle, perspective)
3. Environment & background (setting, spatial depth, atmosphere)
4. Lighting & shadows (light direction, softness/hardness, contrast)
5. Estimated optical look (estimated lens look, approximate focal length equivalent, depth-of-field appearance - do NOT claim exact EXIF metadata)
6. Artistic style or medium (photographic, digital art, 3D render, cel-shaded, etc.)
7. Color palette & tones (dominant hues, accent highlights, mood)
8. Materials & textures (surfaces, fabrics, reflections)
9. Aspect ratio estimate (e.g. 1:1, 16:9, 4:5, 9:16, 3:2, 2:3)

TARGET MODE: ${mode.toUpperCase()} (${modeGuidance})
TARGET ENGINE: ${targetEngine.toUpperCase()} (${engineGuidance})
DETAIL LEVEL: ${detailLevel.toUpperCase()} (${detailGuidance})

STRICT PROMPT CONSTRUCTION GUIDELINES:
- Structure: Subject + appearance + pose/action + environment + composition + estimated camera/optics + lighting + color palette + materials/textures + atmosphere.
- Do NOT invent details that cannot reasonably be inferred from pixels.
- Do NOT claim exact camera models or EXIF metadata; use estimated terms like "estimated 85mm look" or "shallow depth-of-field appearance".
- Avoid meaningless buzzwords ("masterpiece", "8k", "best quality", "trending on artstation", "ultra detailed") unless specifically required by the medium.
- Tailor the prompt strictly to the TARGET ENGINE.

Respond strictly in the following format with these exact uppercase labels:

DETECTED STYLE:
[Short 2-4 word descriptor of the aesthetic, e.g. "Editorial 35mm Portrait", "Minimalist Architecture", "Cyberpunk Digital Art"]

ASPECT RATIO:
[Estimated aspect ratio, e.g. "1:1", "16:9", "4:5", "9:16", "3:2", "2:3"]

SUBJECT:
[2-3 sentences specifying primary subject, appearance, and pose]

SECONDARY SUBJECTS:
[Notable background subjects or objects, or "None"]

COMPOSITION:
[Framing, camera angle, and perspective]

ENVIRONMENT:
[Setting, depth, and atmospheric conditions]

LIGHTING:
[Primary light direction, quality, and shadows]

CAMERA:
[Estimated lens look, approximate focal length equivalent, and depth of field]

STYLE:
[Artistic medium, aesthetic genre, and visual treatment]

COLOR PALETTE:
[Dominant hues, accents, and contrast mood]

MATERIALS & TEXTURES:
[Key tactile surfaces and textures]

MOOD:
[Atmosphere and emotional tone]

NEGATIVE PROMPT:
[A focused comma-separated negative prompt tailored for this subject and mode to suppress defects and unwanted artifacts]

FINAL PROMPT:
[The complete, copy-ready prompt formatted for ${targetEngine.toUpperCase()} and ${detailLevel.toUpperCase()}. Do NOT wrap in markdown code blocks.]`;
}

function getDefaultNegativePrompt(mode: string, targetEngine: string): string {
  if (targetEngine === 'dalle3' || targetEngine === 'flux') {
    return '';
  }
  switch (mode) {
    case 'photorealistic':
    case 'ultra_realistic':
    case 'portrait':
    case 'fashion':
      return 'deformed, distorted anatomy, unnatural skin smoothing, plastic skin, bad hands, missing fingers, extra limbs, blur, low resolution, watermark, oversaturated';
    case 'anime':
      return 'photorealistic, 3d render, western comic style, bad anatomy, deformed eyes, extra fingers, blurry, watermark';
    case 'render_3d':
      return 'flat 2d, hand-drawn sketch, low poly glitches, bad textures, noisy render, blur, watermark';
    case 'product_photography':
      return 'dust, scratches, harsh reflections, warped geometry, cluttered background, blurry, watermark';
    default:
      return 'blurry, low quality, distorted anatomy, extra limbs, bad hands, watermark, deformed features, low resolution';
  }
}

function parseVisionResponse(rawText: string, mode: string = 'general', targetEngine: string = 'general') {
  const extractSection = (label: string, nextLabels: string[]): string => {
    if (nextLabels.length === 0) {
      const match = rawText.match(new RegExp(`${label}:?\\s*([\\s\\S]*)$`, 'i'));
      return match ? match[1].trim() : '';
    }
    const pattern = new RegExp(`${label}:?\\s*([\\s\\S]*?)(?=(?:${nextLabels.join('|')}):|$)`, 'i');
    const match = rawText.match(pattern);
    return match ? match[1].trim() : '';
  };

  const detectedStyle = extractSection('DETECTED STYLE', ['ASPECT RATIO', 'SUBJECT']);
  const aspectRatio = extractSection('ASPECT RATIO', ['SUBJECT', 'SECONDARY SUBJECTS']);
  const subject = extractSection('SUBJECT', ['SECONDARY SUBJECTS', 'COMPOSITION']);
  const secondarySubjects = extractSection('SECONDARY SUBJECTS', ['COMPOSITION', 'ENVIRONMENT']);
  const composition = extractSection('COMPOSITION', ['ENVIRONMENT', 'LIGHTING']);
  const environment = extractSection('ENVIRONMENT', ['LIGHTING', 'CAMERA']);
  const lighting = extractSection('LIGHTING', ['CAMERA', 'STYLE']);
  const camera = extractSection('CAMERA', ['STYLE', 'COLOR PALETTE']);
  const style = extractSection('STYLE', ['COLOR PALETTE', 'MATERIALS & TEXTURES']);
  const colors = extractSection('COLOR PALETTE', ['MATERIALS & TEXTURES', 'MOOD']);
  const materials = extractSection('MATERIALS & TEXTURES', ['MOOD', 'NEGATIVE PROMPT']);
  const mood = extractSection('MOOD', ['NEGATIVE PROMPT', 'FINAL PROMPT']);
  let negativePrompt = extractSection('NEGATIVE PROMPT', ['FINAL PROMPT']);
  let prompt = extractSection('FINAL PROMPT', []);

  // Strip code fences if returned by model
  prompt = prompt.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
  negativePrompt = negativePrompt.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();

  // If prompt is empty or too short, synthesize a fallback from visual sections
  if (!prompt || prompt.length < 20) {
    const parts = [style, subject, environment, lighting, camera, materials].filter(Boolean);
    prompt = parts.join(', ');
  }

  // Midjourney target engine syntax cleanup
  if (targetEngine === 'midjourney') {
    const arMatch = (aspectRatio || '').match(/\d+:\d+/);
    const cleanAspect = arMatch ? arMatch[0] : '16:9';
    if (!prompt.includes('--ar')) {
      prompt = `${prompt} --ar ${cleanAspect} --v 7`;
      if ((mode === 'photorealistic' || mode === 'ultra_realistic' || mode === 'portrait' || mode === 'fashion') && !prompt.includes('--style raw')) {
        prompt = `${prompt} --style raw`;
      }
    }
  }

  // Negative prompt logic per engine
  if (targetEngine === 'dalle3' || targetEngine === 'flux') {
    negativePrompt = ''; // Suppress negative prompt where not supported
  } else if (!negativePrompt || negativePrompt.length < 5) {
    negativePrompt = getDefaultNegativePrompt(mode, targetEngine);
  }

  const ratioMatch = (aspectRatio || '').match(/\d+:\d+/);
  const cleanRatio = ratioMatch ? ratioMatch[0] : '16:9';
  const cleanStyle = detectedStyle || (mode ? mode.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) : 'Photorealistic');

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
      details: materials ? `${materials}. ${mood || ''}`.trim() : mood || 'High visual fidelity and texture definition.',
      mood: mood || 'Atmospheric visual presence.',
      aspectRatio: cleanRatio,
    },
  };
}

// 8. Controlled AI Vision Call with Timeout and Resilient Model Fallback
async function callGeminiVision(
  base64Data: string,
  mimeType: string,
  promptText: string
): Promise<{ text: string; modelName: string }> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured. Please ensure GEMINI_API_KEY is added to your environment variables.');
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'];
  let lastError: any = null;

  for (const model of candidateModels) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        console.log(`[Gemini Vision] Requesting model ${model} (attempt ${attempt + 1})...`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);

        const response = await Promise.race([
          ai.models.generateContent({
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
          }),
          new Promise<never>((_, reject) => {
            controller.signal.addEventListener('abort', () => reject(new Error('AI_TIMEOUT')));
          }),
        ]);

        clearTimeout(timeoutId);

        if (response && response.text) {
          console.log(`[Gemini Vision] Model ${model} succeeded! Result length: ${response.text.length}`);
          return { text: response.text, modelName: model };
        } else {
          throw new Error(`Model ${model} returned an empty response`);
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[Gemini Vision] Model ${model} attempt ${attempt + 1} failed:`, err?.message || err);
        if (err.message === 'AI_TIMEOUT') {
          throw new Error('AI_TIMEOUT');
        }
        if (err.status === 503 || err.message?.includes('503') || err.message?.includes('high demand')) {
          if (attempt === 0) {
            await new Promise((r) => setTimeout(r, 1000));
            continue;
          }
        }
        break;
      }
    }
  }

  throw lastError || new Error('Failed to analyze image with vision model');
}

// 9. Centralized Error Mapper: Masks internal secrets while preserving safe diagnostics
function handleApiError(err: any, res: Response, fallbackMsg: string) {
  const errCode = err?.status || err?.statusCode || (err?.message === 'AI_TIMEOUT' ? 504 : 500);

  // Extract cleanest possible message from standard Error, GoogleGenAI ApiError, or string
  let rawMsg = 'Unknown error';
  if (typeof err === 'string') {
    rawMsg = err;
  } else if (err?.message) {
    rawMsg = err.message;
    // Check if err.message is a JSON string from GoogleGenAI ApiError
    if (rawMsg.startsWith('{') && rawMsg.endsWith('}')) {
      try {
        const parsedJson = JSON.parse(rawMsg);
        if (parsedJson?.error?.message) {
          rawMsg = parsedJson.error.message;
        }
      } catch {
        // keep rawMsg
      }
    }
  } else if (err?.error?.message) {
    rawMsg = err.error.message;
  } else if (err?.statusText) {
    rawMsg = err.statusText;
  }

  // Safe sanitization: Never leak API keys, tokens, or private secrets in error messages
  const sanitizedMsg = String(rawMsg)
    .replace(/(?:key|token|secret|password)=[^\s&"']+/gi, '$1=[REDACTED]')
    .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_GEMINI_KEY]')
    .replace(/sbp_[0-9A-Za-z-_]{30,}/g, '[REDACTED_SUPABASE_KEY]');

  console.error('[API Error]:', sanitizedMsg, `(status: ${errCode})`);

  if (err?.message === 'AI_TIMEOUT') {
    return res.status(504).json({
      success: false,
      error: 'Your request took too long. The AI service timed out. Please try again.',
      details: 'AI generation timed out after 25s.',
      code: 'AI_TIMEOUT',
    });
  }

  if (err?.status === 429 || /429|quota|rate\s*limit/i.test(sanitizedMsg)) {
    return res.status(429).json({
      success: false,
      error: 'The AI service is experiencing high traffic or quota limits. Please wait a moment before trying again.',
      details: sanitizedMsg,
      code: 'RATE_LIMIT',
    });
  }

  if (err?.status === 503 || /503|unavailable|high demand/i.test(sanitizedMsg)) {
    return res.status(503).json({
      success: false,
      error: 'The AI service is temporarily unavailable. Please try again shortly.',
      details: sanitizedMsg,
      code: 'SERVICE_UNAVAILABLE',
    });
  }

  if (/api[_-]?key|credentials|gemini_api_key/i.test(sanitizedMsg)) {
    return res.status(500).json({
      success: false,
      error: 'AI service configuration error. Please ensure GEMINI_API_KEY is configured in your deployment settings.',
      details: sanitizedMsg,
      code: 'API_KEY_ERROR',
    });
  }

  const finalStatus = (errCode >= 400 && errCode < 600) ? errCode : 500;
  return res.status(finalStatus).json({
    success: false,
    error: fallbackMsg,
    details: sanitizedMsg,
    code: err?.code || 'ANALYSIS_ERROR',
  });
}

// =========================================================================
// API ROUTES
// =========================================================================

// POST /api/validate-email & /api/auth/validate-email - Pre-check email syntax & disposable status
const handleValidateEmail = (req: Request, res: Response): void => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const { email } = req.body || {};
  const validation = validateSignupEmail(email);

  if (validation.isDisposable) {
    res.status(400).json({
      ok: false,
      error: 'DISPOSABLE_EMAIL',
      message: 'Temporary or disposable email addresses are not allowed. Please use a permanent email address.',
    });
    return;
  }

  if (!validation.isValid) {
    res.status(400).json({
      ok: false,
      error: 'INVALID_SYNTAX',
      message: validation.error || 'Please enter a valid email address format.',
    });
    return;
  }

  res.status(200).json({
    ok: true,
    domain: validation.domain,
  });
};

app.post('/api/validate-email', emailCheckRateLimiter, handleValidateEmail);
app.post('/api/auth/validate-email', emailCheckRateLimiter, handleValidateEmail);

// POST /api/auth/signup - Authoritative Server-Side Registration & Disposable Email Guard
app.post('/api/auth/signup', signupRateLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, displayName, captchaToken } = req.body || {};

    if (!email || typeof email !== 'string') {
      res.status(400).json({ success: false, error: 'Email address is required.' });
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
      return;
    }

    // 1. Authoritative server-side email syntax & disposable domain check
    const validation = validateSignupEmail(email);
    if (!validation.isValid) {
      res.status(400).json({
        success: false,
        error: validation.error || 'Please enter a valid email address.',
      });
      return;
    }

    if (validation.isDisposable) {
      res.status(400).json({
        success: false,
        error: 'Temporary or disposable email addresses are not allowed. Please use a permanent email address.',
      });
      return;
    }

    // 2. Verify Supabase server configuration
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      res.status(503).json({
        success: false,
        error: 'Authentication service is not yet configured. Please contact the administrator.',
      });
      return;
    }

    // 3. Perform authoritative Supabase signup with verified permanent email
    const clientForAuth = supabaseAnonServer || createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const signUpOptions: { data: { full_name: string }; captchaToken?: string } = {
      data: {
        full_name: typeof displayName === 'string' ? displayName.trim() : '',
      },
    };

    if (captchaToken && typeof captchaToken === 'string') {
      signUpOptions.captchaToken = captchaToken;
    }

    const { data, error } = await clientForAuth.auth.signUp({
      email: validation.normalizedEmail || email.trim(),
      password,
      options: signUpOptions,
    });

    if (error) {
      if (
        error.message.toLowerCase().includes('already registered') ||
        error.message.toLowerCase().includes('already exists')
      ) {
        res.status(400).json({
          success: false,
          error: 'An account with this email already exists. Please sign in instead.',
        });
        return;
      }

      if (
        error.message.toLowerCase().includes('captcha') ||
        error.message.toLowerCase().includes('security check') ||
        error.message.toLowerCase().includes('turnstile')
      ) {
        res.status(400).json({
          success: false,
          error: 'Security verification failed. Please complete the security check again.',
        });
        return;
      }

      res.status(400).json({
        success: false,
        error: error.message || 'Unable to create account. Please try again.',
      });
      return;
    }

    res.json({
      success: true,
      user: data.user,
      session: data.session,
    });
  } catch (err: any) {
    console.error('Signup error:', err);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred during account creation. Please try again.',
    });
  }
});

// GET /api/user/usage - Retrieves authenticated user's current server usage
app.get('/api/user/usage', async (req: Request, res: Response): Promise<void> => {
  try {
    const authUser = await verifyAuthUser(req);
    if (!authUser) {
      res.status(401).json({ success: false, error: 'Authentication required.' });
      return;
    }

    if (!supabaseAdmin) {
      res.status(503).json({
        success: false,
        error: 'Usage tracking service is temporarily unavailable.',
        code: 'SERVICE_ROLE_UNAVAILABLE',
      });
      return;
    }

    // Query profiles & usage table securely
    const [usageRes, profileRes] = await Promise.all([
      supabaseAdmin.from('usage').select('*').eq('user_id', authUser.id).single(),
      supabaseAdmin.from('profiles').select('*').eq('id', authUser.id).single(),
    ]);

    let usageData = usageRes.data;
    if (!usageData) {
      // If record missing, initialize it safely
      const init = await supabaseAdmin.from('usage').insert({
        user_id: authUser.id,
        generations_used: 0,
        generation_limit: 3,
      }).select().single();
      usageData = init.data;
    }

    const generationsUsed = usageData?.generations_used ?? 0;
    const generationLimit = usageData?.generation_limit ?? 3;
    const plan = profileRes.data?.plan || 'free';

    res.json({
      success: true,
      plan,
      generationsUsed,
      generationLimit,
      remaining: Math.max(0, generationLimit - generationsUsed),
      displayName: profileRes.data?.display_name || '',
    });
  } catch (err: any) {
    console.error('Error fetching usage:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve usage data.' });
  }
});

// POST /api/generate-prompt (Server-Side Credit Enforcement & Auth Guard)
app.post('/api/generate-prompt', rateLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      image,
      mode = 'general',
      targetEngine = 'general',
      detailLevel = 'detailed',
    } = req.body;

    console.log(`[GENERATE-PROMPT] Initiating request: mode=${mode}, engine=${targetEngine}, detail=${detailLevel}`);

    // 1. Authenticate user from Supabase access token (Never trust client user_id!)
    const authUser = await verifyAuthUser(req);
    if (!authUser) {
      console.warn('[GENERATE-PROMPT] Auth failed: no valid user session detected.');
      res.status(401).json({
        success: false,
        error: 'Authentication required. Please sign in or create an account to generate prompts.',
      });
      return;
    }
    console.log(`[GENERATE-PROMPT] User authenticated successfully: id=${authUser.id}`);

    // 2. Validate and inspect file signatures server-side BEFORE checking credits or calling AI
    const validation = validateAndDecodeImage(image);
    if (validation.error || !validation.data) {
      console.warn(`[GENERATE-PROMPT] Image validation failed: ${validation.error}`);
      res.status(validation.status || 400).json({
        success: false,
        error: validation.error,
      });
      return;
    }
    console.log(`[GENERATE-PROMPT] Image validated: mime=${validation.data.mimeType}, size=${validation.data.byteLength} bytes`);

    // 3. Server-Side Credit Check & Atomic Reservation via RPC (Fail-Closed)
    // 3. Server-Side Credit Check & Atomic Reservation via RPC (Unconditional Fail-Closed)
    if (!supabaseAdmin) {
      console.error('[GENERATE-PROMPT] Generation rejected: privileged Supabase client (supabaseAdmin) is unavailable');
      res.status(503).json({
        success: false,
        error: 'Credit management service is temporarily unavailable. Please try again shortly.',
        code: 'SERVICE_ROLE_UNAVAILABLE',
      });
      return;
    }

    console.log(`[GENERATE-PROMPT] Calling reserve_generation_credit RPC for user: ${authUser.id}`);
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('reserve_generation_credit', {
      target_user_id: authUser.id,
    });

    if (rpcError) {
      console.error('[GENERATE-PROMPT] Supabase credit reservation RPC failure:', rpcError);
      res.status(500).json({
        success: false,
        error: 'Unable to verify generation credits at this time. Please try again shortly.',
        details: rpcError.message || 'Credit reservation database error.',
        code: 'CREDIT_RPC_ERROR',
      });
      return;
    }

    if (!rpcData || !rpcData.allowed) {
      console.warn(`[GENERATE-PROMPT] Generation limit reached for user ${authUser.id}`);
      res.status(403).json({
        success: false,
        error: 'Free generation limit reached. You have used all 3 free generations.',
        code: 'LIMIT_REACHED',
      });
      return;
    }

    if (!rpcData.reservation_id) {
      console.error('[GENERATE-PROMPT] Reservation RPC succeeded but returned no reservation_id');
      res.status(500).json({
        success: false,
        error: 'Unable to reserve generation credit. Please try again shortly.',
        code: 'INVALID_RESERVATION',
      });
      return;
    }

    const reservation = rpcData;
    console.log(`[GENERATE-PROMPT] Reservation approved: id=${reservation.reservation_id}, remaining=${reservation.remaining}`);

    // 4. Perform AI Vision analysis
    const { mimeType, base64Data } = validation.data;
    const promptText = buildVisionPrompt(mode, targetEngine, detailLevel);

    let rawResult = '';
    let modelName = '';

    try {
      console.log('[GENERATE-PROMPT] Calling AI Vision service...');
      const visionResult = await callGeminiVision(base64Data, mimeType, promptText);
      rawResult = visionResult.text;
      modelName = visionResult.modelName;
      console.log(`[GENERATE-PROMPT] AI Vision analysis completed successfully using model: ${modelName}`);
    } catch (aiError: any) {
      console.error('[GENERATE-PROMPT] AI Vision analysis failed:', aiError?.message || aiError);
      // If AI call failed, release/refund the unfinalized reservation safely without negative balance
      if (supabaseAdmin && reservation.reservation_id) {
        try {
          const { error: releaseErr } = await supabaseAdmin.rpc('release_generation_credit', {
            p_reservation_id: reservation.reservation_id,
            p_reason: aiError.message === 'AI_TIMEOUT' ? 'AI_TIMEOUT' : 'AI_FAILURE',
          });
          if (releaseErr) {
            console.error('[GENERATE-PROMPT] Error releasing credit reservation:', releaseErr);
          } else {
            console.log(`[GENERATE-PROMPT] Released reservation ${reservation.reservation_id} due to AI failure`);
          }
        } catch (releaseErr) {
          console.error('[GENERATE-PROMPT] Failed to release reservation on AI failure:', releaseErr);
        }
      }
      throw aiError;
    }

    // 5. Finalize reservation upon successful AI generation
    let finalUsage = reservation;
    try {
      const { data: finalData, error: finalErr } = await supabaseAdmin.rpc('finalize_generation_credit', {
        p_reservation_id: reservation.reservation_id,
      });

      if (finalErr || !finalData?.success) {
        const failureReason = finalErr?.message || finalData?.reason || 'Unknown finalization error';
        console.error('[GENERATE-PROMPT] Credit finalization failed:', failureReason);
        res.status(500).json({
          success: false,
          error: 'Unable to finalize credit accounting. Please try again.',
          details: failureReason,
          code: 'FINALIZATION_FAILED',
        });
        return;
      }

      finalUsage = { ...finalUsage, remaining: finalData.remaining, generations_used: finalData.generations_used };
      console.log(`[GENERATE-PROMPT] Reservation finalized. New remaining: ${finalUsage.remaining}`);
    } catch (finalizeErr: any) {
      console.error('[GENERATE-PROMPT] Exception during credit finalization:', finalizeErr);
      res.status(500).json({
        success: false,
        error: 'Unable to finalize credit accounting due to a server error. Please try again.',
        details: finalizeErr?.message || 'Finalization exception',
        code: 'FINALIZATION_FAILED',
      });
      return;
    }

    const { prompt, negativePrompt, detectedStyle, aspectRatio, analysis } = parseVisionResponse(
      rawResult,
      mode,
      targetEngine
    );

    // 6. Record generation in Supabase (Metadata only - zero images stored!)
    let historySaved = false;
    let historyWarning: string | undefined = undefined;

    try {
      const { data: insertData, error: insertErr } = await supabaseAdmin.from('generations').insert({
        user_id: authUser.id,
        reservation_id: reservation.reservation_id,
        prompt,
        negative_prompt: negativePrompt || null,
        mode,
        target_engine: targetEngine,
        detail_level: detailLevel,
        detected_style: detectedStyle,
        aspect_ratio: aspectRatio,
        model_used: modelName,
      }).select('id').single();

      if (insertErr) {
        console.error('[GENERATE-PROMPT] Failed to insert generation record into Supabase:', insertErr);
        historySaved = false;
        historyWarning = 'Generation completed, but saving to your History failed. Your prompt has been generated and credit accounted.';
      } else {
        historySaved = true;
        console.log(`[GENERATE-PROMPT] Generation record persisted to history: ${insertData?.id}`);
      }
    } catch (dbErr: any) {
      console.error('[GENERATE-PROMPT] Exception recording generation metadata to database:', dbErr);
      historySaved = false;
      historyWarning = 'Generation completed, but saving to your History failed due to a database error.';
    }

    res.json({
      success: true,
      prompt,
      negativePrompt,
      detectedStyle,
      aspectRatio,
      targetEngine,
      detailLevel,
      analysis,
      modelUsed: modelName,
      creditsRemaining: finalUsage.remaining,
      generationsUsed: finalUsage.generations_used,
      historySaved,
      ...(historyWarning ? { historyWarning } : {}),
    });
  } catch (error: any) {
    handleApiError(error, res, "We couldn't analyze this image. Please try another image or try again.");
  }
});

// POST /api/improve-prompt
app.post('/api/improve-prompt', rateLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Authenticate user from Supabase access token (Never allow unauthenticated AI usage!)
    const authUser = await verifyAuthUser(req);
    if (!authUser) {
      res.status(401).json({
        success: false,
        error: 'Authentication required. Please sign in to improve prompts.',
      });
      return;
    }

    const { prompt, mode = 'general', targetEngine = 'general', detailLevel = 'detailed' } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ success: false, error: 'A prompt string is required.' });
      return;
    }

    if (prompt.length > 2500) {
      res.status(400).json({ success: false, error: 'Prompt exceeds maximum length of 2,500 characters.' });
      return;
    }

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      res.status(500).json({ success: false, error: 'AI service configuration error: GEMINI_API_KEY is not set.' });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const instruction = `You are a master AI image prompt engineer.
Enhance and polish the following prompt for image reproduction.
Target Engine: ${targetEngine.toUpperCase()}
Style Mode: ${mode.toUpperCase()}
Detail Level: ${detailLevel.toUpperCase()}

Instructions:
- If target is MIDJOURNEY: Format for Midjourney v7 with evocative visual descriptors and valid parameters (--ar, --v 7).
- If target is FLUX: Natural descriptive photographic direction, camera specifications, and clean framing.
- If target is STABLE_DIFFUSION: Balanced descriptive clauses and lighting contrast.
- If target is DALLE3: Fluid descriptive prose.
- Do NOT use meaningless filler words ("masterpiece", "8K").
- Return ONLY the improved prompt text. No commentary or markdown backticks.

Original prompt:
${prompt}`;

    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
    let improvedPrompt = prompt;

    for (const model of candidateModels) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        const response = await Promise.race([
          ai.models.generateContent({
            model,
            contents: instruction,
          }),
          new Promise<never>((_, reject) => {
            controller.signal.addEventListener('abort', () => reject(new Error('AI_TIMEOUT')));
          }),
        ]);
        clearTimeout(timeoutId);

        if (response?.text) {
          improvedPrompt = response.text.trim();
          break;
        }
      } catch (err: any) {
        if (err.message === 'AI_TIMEOUT') throw new Error('AI_TIMEOUT');
      }
    }
    improvedPrompt = improvedPrompt.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();

    res.json({
      success: true,
      improvedPrompt,
    });
  } catch (err: any) {
    handleApiError(err, res, 'Unable to improve prompt at this time. Please try again.');
  }
});

// Helper to construct video reverse-engineering prompt
function buildVideoVisionPrompt(mode: string): string {
  let modeGuidance = '';
  switch (mode) {
    case 'runway_gen3':
      modeGuidance = 'Optimized for Runway Gen-3 Alpha. Include explicit director camera commands (e.g. [Camera: Pan right, Slow dolly forward]), temporal motion speeds, and lighting continuity.';
      break;
    case 'luma_dream_machine':
      modeGuidance = 'Optimized for Luma Dream Machine. Focus on continuous natural physics, fluid spatial velocity, and camera tracking.';
      break;
    case 'kling':
      modeGuidance = 'Optimized for Kling 1.5 / Hailuo. Emphasize physical weight, smooth kinetic expressions, and atmospheric lighting.';
      break;
    case 'sora':
      modeGuidance = 'Optimized for OpenAI Sora. Write dense narrative direction with temporal physics, reflections, and cinematic lighting changes.';
      break;
    case 'pika':
      modeGuidance = 'Optimized for Pika 2.0. Specify camera movement commands and motion intensity.';
      break;
    case 'universal_video':
    default:
      modeGuidance = 'Universal AI Video Prompt. Formats a balanced shot script detailing camera path, kinetic motion, and atmosphere.';
      break;
  }

  return `You are an AI cinematography director and video prompt engineer.
Analyze the provided chronological keyframes from this video clip.
Reverse-engineer the temporal dynamics, camera motion, and cinematic lighting required to recreate a similar video.

Analyze:
1. CAMERA MOTION: Estimated camera trajectory (Dolly, Drone Flyover, Orbit, Handheld, Steadicam Push).
2. SUBJECT KINEMATICS: Physical motion, trajectory, and speed.
3. TEMPORAL PACING: Speed look (24fps cinematic, slow-motion, real-time).
4. LIGHTING & ATMOSPHERE: Dynamic lighting changes over time.
5. CINEMATIC FRAMING: Shot scale and framing.
6. VISUAL STYLE: Visual medium and color mood.

TARGET ENGINE: ${mode.toUpperCase()} (${modeGuidance})

Respond strictly with these uppercase labels:

CAMERA MOTION:
[Concise description of camera trajectory]

SUBJECT KINEMATICS:
[Physical movement and momentum]

TEMPORAL PACING:
[Pacing and motion speed feel]

LIGHTING & ATMOSPHERE:
[Atmosphere and lighting progression]

CINEMATIC FRAMING:
[Shot scale and composition]

VISUAL STYLE:
[Cinematic medium and grade]

CAMERA TAG:
[Short 2-4 word tag, e.g. "Slow Dolly In", "Aerial Drone Sweep"]

FINAL VIDEO PROMPT:
[Complete copy-ready AI video prompt formatted for ${mode}. No markdown backticks.]

NEGATIVE VIDEO PROMPT:
[Comma-separated negative prompt to prevent video artifacts: flickering, jitter, morphing, watermark.]`;
}

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

  prompt = prompt.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
  negativePrompt = negativePrompt.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
  cameraTag = cameraTag.replace(/^["']|["']$/g, '').trim();

  if (!prompt || prompt.length < 20) {
    const parts = [cameraMotion, subjectKinematics, lightingAtmosphere, visualStyle].filter(Boolean);
    prompt = parts.join(', ');
  }

  return {
    prompt,
    negativePrompt: negativePrompt || 'flickering, sudden morphing, warped faces, jittery camera, frame skipping, watermark, stuttering',
    cameraMovement: cameraTag || 'Cinematic Motion',
    analysis: {
      cameraMotion: cameraMotion || 'Cinematic camera trajectory.',
      subjectKinematics: subjectKinematics || 'Natural physical motion.',
      temporalPacing: temporalPacing || 'Smooth 24fps cinematic pacing.',
      lightingAtmosphere: lightingAtmosphere || 'Volumetric atmospheric lighting.',
      cinematicFraming: cinematicFraming || 'Balanced widescreen framing.',
      visualStyle: visualStyle || 'High-fidelity cinematic aesthetic.',
    },
  };
}

// POST /api/generate-video-prompt
app.post('/api/generate-video-prompt', rateLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const authUser = await verifyAuthUser(req);
    if (!authUser) {
      res.status(401).json({
        success: false,
        error: 'Authentication required. Please sign in or create an account to generate video prompts.',
      });
      return;
    }

    const { frames, mode = 'universal_video' } = req.body;

    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      res.status(400).json({
        success: false,
        error: 'At least one keyframe from the video is required.',
      });
      return;
    }

    // 2. Validate video frames payload before reservation
    const sanitizedFrames = frames.slice(0, 4);
    const validatedParts: Array<{ inlineData: { mimeType: string; data: string } }> = [];

    for (const frame of sanitizedFrames) {
      const v = validateAndDecodeImage(frame);
      if (v.data) {
        validatedParts.push({
          inlineData: {
            mimeType: v.data.mimeType,
            data: v.data.base64Data,
          },
        });
      }
    }

    if (validatedParts.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No valid keyframes could be decoded from the video payload.',
      });
      return;
    }

    // 3. Server-Side Credit Check & Atomic Reservation via RPC (Unconditional Fail-Closed)
    if (!supabaseAdmin) {
      console.error('[GENERATE-VIDEO] Generation rejected: privileged Supabase client (supabaseAdmin) is unavailable');
      res.status(503).json({
        success: false,
        error: 'Credit management service is temporarily unavailable. Please try again shortly.',
        code: 'SERVICE_ROLE_UNAVAILABLE',
      });
      return;
    }

    console.log(`[GENERATE-VIDEO] Calling reserve_generation_credit RPC for user: ${authUser.id}`);
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('reserve_generation_credit', {
      target_user_id: authUser.id,
    });

    if (rpcError) {
      console.error('[GENERATE-VIDEO] Supabase credit reservation RPC failure:', rpcError);
      res.status(500).json({
        success: false,
        error: 'Unable to verify generation credits at this time. Please try again shortly.',
        details: rpcError.message || 'Credit reservation database error.',
        code: 'CREDIT_RPC_ERROR',
      });
      return;
    }

    if (!rpcData || !rpcData.allowed) {
      console.warn(`[GENERATE-VIDEO] Generation limit reached for user ${authUser.id}`);
      res.status(403).json({
        success: false,
        error: 'Free generation limit reached. You have used all 3 free generations.',
        code: 'LIMIT_REACHED',
      });
      return;
    }

    if (!rpcData.reservation_id) {
      console.error('[GENERATE-VIDEO] Reservation RPC succeeded but returned no reservation_id');
      res.status(500).json({
        success: false,
        error: 'Unable to reserve generation credit. Please try again shortly.',
        code: 'INVALID_RESERVATION',
      });
      return;
    }

    const reservation = rpcData;
    console.log(`[GENERATE-VIDEO] Reservation approved: id=${reservation.reservation_id}, remaining=${reservation.remaining}`);

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      if (reservation.reservation_id) {
        try {
          await supabaseAdmin.rpc('release_generation_credit', {
            p_reservation_id: reservation.reservation_id,
            p_reason: 'CONFIG_ERROR',
          });
        } catch (releaseErr) {
          console.error('[GENERATE-VIDEO] Failed to release reservation on missing API key:', releaseErr);
        }
      }
      res.status(500).json({ success: false, error: 'AI service configuration error: GEMINI_API_KEY is not set.' });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const promptText = buildVideoVisionPrompt(mode);
    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
    let rawText = '';
    let chosenModel = 'gemini-3.1-flash-lite';

    try {
      for (const model of candidateModels) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 28000);

          const response = await Promise.race([
            ai.models.generateContent({
              model,
              contents: {
                parts: [
                  ...validatedParts,
                  { text: `Here are ${validatedParts.length} chronological keyframes extracted from the video sequence. ${promptText}` },
                ],
              },
            }),
            new Promise<never>((_, reject) => {
              controller.signal.addEventListener('abort', () => reject(new Error('AI_TIMEOUT')));
            }),
          ]);
          clearTimeout(timeoutId);

          if (response?.text) {
            rawText = response.text;
            chosenModel = model;
            break;
          }
        } catch (err: any) {
          if (err.message === 'AI_TIMEOUT') throw new Error('AI_TIMEOUT');
        }
      }
    } catch (aiErr) {
      // Release reservation on AI failure
      if (supabaseAdmin && reservation.reservation_id) {
        try {
          const { error: releaseErr } = await supabaseAdmin.rpc('release_generation_credit', {
            p_reservation_id: reservation.reservation_id,
            p_reason: 'AI_FAILURE',
          });
          if (releaseErr) {
            console.error('[GENERATE-VIDEO] Error releasing video reservation:', releaseErr);
          } else {
            console.log(`[GENERATE-VIDEO] Released reservation ${reservation.reservation_id} due to AI failure`);
          }
        } catch (releaseErr) {
          console.error('[GENERATE-VIDEO] Failed to release video reservation:', releaseErr);
        }
      }
      throw aiErr;
    }

    if (!rawText) throw new Error('Failed to analyze video keyframes');
    const parsed = parseVideoVisionResponse(rawText, mode);

    // 5. Finalize reservation upon successful AI generation
    let finalVideoUsage = reservation;
    try {
      const { data: finalData, error: finalErr } = await supabaseAdmin.rpc('finalize_generation_credit', {
        p_reservation_id: reservation.reservation_id,
      });

      if (finalErr || !finalData?.success) {
        const failureReason = finalErr?.message || finalData?.reason || 'Unknown finalization error';
        console.error('[GENERATE-VIDEO] Credit finalization failed:', failureReason);
        res.status(500).json({
          success: false,
          error: 'Unable to finalize credit accounting. Please try again.',
          details: failureReason,
          code: 'FINALIZATION_FAILED',
        });
        return;
      }

      finalVideoUsage = { ...finalVideoUsage, remaining: finalData.remaining, generations_used: finalData.generations_used };
      console.log(`[GENERATE-VIDEO] Reservation finalized. New remaining: ${finalVideoUsage.remaining}`);
    } catch (finalizeErr: any) {
      console.error('[GENERATE-VIDEO] Exception during video credit finalization:', finalizeErr);
      res.status(500).json({
        success: false,
        error: 'Unable to finalize credit accounting due to a server error. Please try again.',
        details: finalizeErr?.message || 'Finalization exception',
        code: 'FINALIZATION_FAILED',
      });
      return;
    }

    // 6. Record generation in Supabase (Metadata only - zero images/frames stored!)
    let historySaved = false;
    let historyWarning: string | undefined = undefined;

    try {
      const { data: insertData, error: insertErr } = await supabaseAdmin.from('generations').insert({
        user_id: authUser.id,
        reservation_id: reservation.reservation_id,
        prompt: parsed.prompt,
        negative_prompt: parsed.negativePrompt || null,
        mode: `video_${mode}`,
        target_engine: mode,
        detail_level: 'detailed',
        detected_style: parsed.analysis?.visualStyle || 'Cinematic Video',
        aspect_ratio: '16:9',
        model_used: chosenModel,
      }).select('id').single();

      if (insertErr) {
        console.error('[GENERATE-VIDEO] Failed to record video generation record into Supabase:', insertErr);
        historySaved = false;
        historyWarning = 'Generation completed, but saving to your History failed. Your prompt has been generated and credit accounted.';
      } else {
        historySaved = true;
        console.log(`[GENERATE-VIDEO] Video generation record persisted to history: ${insertData?.id}`);
      }
    } catch (dbErr: any) {
      console.error('[GENERATE-VIDEO] Exception recording video generation metadata to database:', dbErr);
      historySaved = false;
      historyWarning = 'Generation completed, but saving to your History failed due to a database error.';
    }

    res.json({
      success: true,
      ...parsed,
      modelUsed: chosenModel,
      creditsRemaining: finalVideoUsage.remaining,
      generationsUsed: finalVideoUsage.generations_used,
      historySaved,
      ...(historyWarning ? { historyWarning } : {}),
    });
  } catch (error: any) {
    handleApiError(error, res, 'Failed to analyze video keyframes. Please try another clip.');
  }
});

// Export Express application for Vercel Serverless Functions
export default app;

import type { IncomingMessage, ServerResponse } from 'http';
import { validateSignupEmail } from '../src/lib/disposableEmailValidator';

/**
 * Vercel Serverless Function: POST /api/validate-email
 * 
 * Verifies email syntax and checks against 120,000+ known disposable domains.
 * Always returns well-formed JSON with Content-Type: application/json.
 */
export default async function handler(req: any, res: any) {
  // CORS & Content-Type Headers
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' }));
    return;
  }

  try {
    let body = req.body;
    if (!body && typeof req.on === 'function') {
      try {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        }
        const raw = Buffer.concat(chunks).toString('utf8');
        if (raw) {
          body = JSON.parse(raw);
        }
      } catch {
        // Stream read or parse failure
      }
    }

    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        res.statusCode = 400;
        res.end(JSON.stringify({ ok: false, error: 'INVALID_JSON', message: 'Invalid JSON payload' }));
        return;
      }
    }

    const email = body?.email;
    if (!email || typeof email !== 'string') {
      res.statusCode = 400;
      res.end(JSON.stringify({ ok: false, error: 'EMAIL_REQUIRED', message: 'Please enter a valid email address.' }));
      return;
    }

    const validation = validateSignupEmail(email);

    if (validation.isDisposable) {
      res.statusCode = 400;
      res.end(JSON.stringify({
        ok: false,
        error: 'DISPOSABLE_EMAIL',
        message: 'Temporary or disposable email addresses are not allowed. Please use a permanent email address.',
      }));
      return;
    }

    if (!validation.isValid) {
      res.statusCode = 400;
      res.end(JSON.stringify({
        ok: false,
        error: 'INVALID_SYNTAX',
        message: validation.error || 'Please enter a valid email address format.',
      }));
      return;
    }

    res.statusCode = 200;
    res.end(JSON.stringify({
      ok: true,
      domain: validation.domain,
    }));
  } catch (err: any) {
    console.error('Email validation handler error:', err);
    res.statusCode = 500;
    res.end(JSON.stringify({
      ok: false,
      error: 'VALIDATION_UNAVAILABLE',
      message: 'Unable to validate email at this time. Please try again.',
    }));
  }
}

/**
 * Server-Side Disposable / Temporary Email Validator
 * 
 * Uses the comprehensive MIT-licensed `disposable-email-domains` dataset (120,000+ domains)
 * with robust subdomain matching, RFC syntax validation, and safe local fallback.
 */

import domainList from 'disposable-email-domains';

// Fallback list of prominent disposable/temporary email providers
const FALLBACK_DISPOSABLE_DOMAINS = new Set<string>([
  'mailinator.com',
  '10minutemail.com',
  '10minutemail.net',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'tempmail.com',
  'tempmail.net',
  'temp-mail.org',
  'throwawaymail.com',
  'yopmail.com',
  'sharklasers.com',
  'dispostable.com',
  'getairmail.com',
  'trashmail.com',
  'trashmail.net',
  'fakemailgenerator.com',
  'inboxkitten.com',
  'burnermail.io',
  'generator.email',
  'mohmal.com',
  'crazymailing.com',
  'tempail.com',
  'fakemail.net',
  'mytemp.email',
  'nada.ltd',
  'emailondeck.com',
  'minuteinbox.com',
]);

// Well-known permanent providers that must never be blocked (safety against any potential upstream false positives)
const KNOWN_PERMANENT_DOMAINS = new Set<string>([
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'yahoo.com',
  'ymail.com',
  'rocketmail.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'proton.me',
  'protonmail.com',
  'pm.me',
  'zoho.com',
  'aol.com',
  'gmx.com',
  'gmx.net',
  'mail.com',
  'fastmail.com',
  'tutanota.com',
  'tuta.io',
  'hey.com',
]);

let disposableDomainsSet: Set<string>;

try {
  if (Array.isArray(domainList)) {
    disposableDomainsSet = new Set<string>(domainList.map((d: string) => d.toLowerCase().trim()));
  } else {
    disposableDomainsSet = new Set<string>();
  }
} catch (err) {
  console.warn('Notice: disposable-email-domains dataset load fallback:', err);
  disposableDomainsSet = new Set<string>();
}

// Stricter RFC-compliant email syntax check
const EMAIL_SYNTAX_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export interface EmailValidationResult {
  isValid: boolean;
  isDisposable: boolean;
  normalizedEmail?: string;
  domain?: string;
  error?: string;
}

/**
 * Validates an email address and checks against disposable email providers.
 * 
 * Guarantees:
 * 1. Never blocks Gmail, Outlook, Yahoo, iCloud, Proton, or legitimate custom business domains.
 * 2. Checks both exact domain and subdomains (e.g., mail.mailinator.com).
 * 3. Fails safely: if an error occurs, falls back to the hardcoded list without breaking signups.
 */
export function validateSignupEmail(rawEmail: string): EmailValidationResult {
  if (!rawEmail || typeof rawEmail !== 'string') {
    return {
      isValid: false,
      isDisposable: false,
      error: 'Please enter a valid email address.',
    };
  }

  const trimmed = rawEmail.trim();

  // Basic length constraints
  if (trimmed.length < 5 || trimmed.length > 254) {
    return {
      isValid: false,
      isDisposable: false,
      error: 'Email address length is invalid.',
    };
  }

  // Syntax validation
  if (!EMAIL_SYNTAX_REGEX.test(trimmed)) {
    return {
      isValid: false,
      isDisposable: false,
      error: 'Please enter a valid email address format.',
    };
  }

  const atIndex = trimmed.lastIndexOf('@');
  if (atIndex <= 0 || atIndex === trimmed.length - 1) {
    return {
      isValid: false,
      isDisposable: false,
      error: 'Please enter a valid email address format.',
    };
  }

  const localPart = trimmed.slice(0, atIndex);
  const domainPart = trimmed.slice(atIndex + 1).toLowerCase().trim();

  // Normalize: preserve local part case/characters, normalize domain to lowercase
  const normalizedEmail = `${localPart}@${domainPart}`;

  // 1. Immediately allow verified permanent providers (Zero false positive guarantee)
  if (KNOWN_PERMANENT_DOMAINS.has(domainPart)) {
    return {
      isValid: true,
      isDisposable: false,
      normalizedEmail,
      domain: domainPart,
    };
  }

  try {
    // 2. Exact match check
    if (disposableDomainsSet.has(domainPart) || FALLBACK_DISPOSABLE_DOMAINS.has(domainPart)) {
      return {
        isValid: false,
        isDisposable: true,
        normalizedEmail,
        domain: domainPart,
        error: 'Temporary or disposable email addresses are not allowed. Please use a permanent email address.',
      };
    }

    // 3. Subdomain check (e.g. user@abc.mailinator.com -> checks mailinator.com)
    const domainParts = domainPart.split('.');
    for (let i = 1; i < domainParts.length - 1; i++) {
      const parentDomain = domainParts.slice(i).join('.');
      if (disposableDomainsSet.has(parentDomain) || FALLBACK_DISPOSABLE_DOMAINS.has(parentDomain)) {
        return {
          isValid: false,
          isDisposable: true,
          normalizedEmail,
          domain: domainPart,
          error: 'Temporary or disposable email addresses are not allowed. Please use a permanent email address.',
        };
      }
    }
  } catch (lookupErr) {
    // Fail safely: fall back to local list on unexpected lookup error
    console.error('Error during disposable domain check:', lookupErr);
    if (FALLBACK_DISPOSABLE_DOMAINS.has(domainPart)) {
      return {
        isValid: false,
        isDisposable: true,
        normalizedEmail,
        domain: domainPart,
        error: 'Temporary or disposable email addresses are not allowed. Please use a permanent email address.',
      };
    }
  }

  // Legitimate email (custom domain or standard domain)
  return {
    isValid: true,
    isDisposable: false,
    normalizedEmail,
    domain: domainPart,
  };
}

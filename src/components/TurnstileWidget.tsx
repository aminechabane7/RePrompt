import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';

interface TurnstileRenderOptions {
  sitekey: string;
  callback?: (token: string) => void;
  'error-callback'?: (error?: any) => void;
  'expired-callback'?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact' | 'flexible';
  action?: string;
  cData?: string;
}

interface TurnstileObject {
  render: (container: string | HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
  getResponse: (widgetId?: string) => string | undefined;
}

declare global {
  interface Window {
    turnstile?: TurnstileObject;
  }
}

interface TurnstileWidgetProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (error?: any) => void;
  resetRef?: React.MutableRefObject<(() => void) | null>;
  className?: string;
}

export const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({
  siteKey,
  onVerify,
  onExpire,
  onError,
  resetRef,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!siteKey) return;

    let isMounted = true;
    let timerId: any = null;

    // Load Cloudflare Turnstile script explicitly if not already present
    const SCRIPT_ID = 'cf-turnstile-script';
    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        if (isMounted) {
          setLoadError(true);
          onError?.('Failed to load Cloudflare Turnstile security script.');
        }
      };
      document.head.appendChild(script);
    }

    const renderWidget = () => {
      if (!isMounted || !containerRef.current || !window.turnstile) return;

      // Prevent duplicate rendering
      if (widgetIdRef.current) return;

      try {
        const id = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => {
            if (isMounted) {
              onVerify(token);
            }
          },
          'expired-callback': () => {
            if (isMounted) {
              onExpire?.();
            }
          },
          'error-callback': (err?: any) => {
            if (isMounted) {
              onError?.(err);
            }
          },
          theme: 'light',
          size: 'normal',
        });

        widgetIdRef.current = id;
      } catch (err) {
        console.warn('Turnstile render warning:', err);
      }
    };

    // Attach reset function to parent ref
    if (resetRef) {
      resetRef.current = () => {
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.reset(widgetIdRef.current);
          } catch (e) {
            console.warn('Turnstile reset warning:', e);
          }
        }
      };
    }

    // Check if turnstile is already loaded, otherwise poll until available
    if (window.turnstile) {
      renderWidget();
    } else {
      let attempts = 0;
      const MAX_ATTEMPTS = 50; // 5 seconds maximum
      timerId = setInterval(() => {
        attempts++;
        if (window.turnstile) {
          clearInterval(timerId);
          renderWidget();
        } else if (attempts >= MAX_ATTEMPTS) {
          clearInterval(timerId);
          if (isMounted) {
            setLoadError(true);
            onError?.('Timeout loading security verification.');
          }
        }
      }, 100);
    }

    return () => {
      isMounted = false;
      if (timerId) clearInterval(timerId);
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore cleanup errors on unmount
        }
        widgetIdRef.current = null;
      }
      if (resetRef) {
        resetRef.current = null;
      }
    };
  }, [siteKey, onVerify, onExpire, onError, resetRef]);

  if (!siteKey) {
    return (
      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2 my-2">
        <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
        <div>
          <p className="font-semibold">Turnstile Site Key Required</p>
          <p className="text-[11px] text-amber-700 mt-0.5">
            Please configure <code className="font-mono font-bold">VITE_TURNSTILE_SITE_KEY</code> in your environment variables to enable Cloudflare verification.
          </p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between my-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>Security check failed to load.</span>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoadError(false);
            window.location.reload();
          }}
          className="text-xs font-semibold text-red-800 hover:underline flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`my-2 flex flex-col items-center justify-center min-h-[68px] ${className}`}>
      <div ref={containerRef} className="w-full flex justify-center overflow-hidden" />
    </div>
  );
};

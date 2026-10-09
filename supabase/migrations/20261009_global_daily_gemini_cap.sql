-- ============================================================================
-- Migration: 20261009_global_daily_gemini_cap.sql
-- Description: Shared atomic Global Daily Gemini API Cap for RePrompt Beta
--
-- Protects the Gemini API Free Tier quota from excessive usage across all users.
-- Enforces a shared atomic ceiling across all Vercel serverless instances per UTC day.
--
-- CRITICAL COMPLIANCE:
-- - This is a separate, isolated migration file.
-- - Does NOT modify SQL v2.2 (20261006_reprompt_schema.sql).
-- - Does NOT alter existing credit reservation/finalization functions.
-- ============================================================================

-- 1. Create table for tracking daily Gemini API attempts
CREATE TABLE IF NOT EXISTS public.global_daily_usage (
  usage_date DATE PRIMARY KEY,
  request_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.global_daily_usage ENABLE ROW LEVEL SECURITY;

-- Deny all access to public, anon, and authenticated roles. Only service_role can access.
REVOKE ALL ON TABLE public.global_daily_usage FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.global_daily_usage TO service_role;

-- 2. Atomic check-and-increment function
-- Uses PostgreSQL atomic UPDATE with row-locking to guarantee no race conditions across serverless instances.
-- Returns JSONB with { allowed: boolean, current_count: integer, cap_limit: integer, usage_date: date }
CREATE OR REPLACE FUNCTION public.check_and_increment_daily_cap(
  p_cap_limit INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_today DATE := (timezone('utc'::text, now()))::date;
  v_current_count INTEGER;
  v_allowed BOOLEAN;
  v_effective_cap INTEGER;
BEGIN
  -- Validate and normalize cap limit (default to 20 if invalid or <= 0)
  IF p_cap_limit IS NULL OR p_cap_limit < 1 THEN
    v_effective_cap := 20;
  ELSE
    v_effective_cap := p_cap_limit;
  END IF;

  -- Ensure today's row exists atomically
  INSERT INTO public.global_daily_usage (usage_date, request_count, created_at, updated_at)
  VALUES (v_today, 0, timezone('utc'::text, now()), timezone('utc'::text, now()))
  ON CONFLICT (usage_date) DO NOTHING;

  -- Atomically increment if below the effective cap limit
  UPDATE public.global_daily_usage
  SET request_count = request_count + 1,
      updated_at = timezone('utc'::text, now())
  WHERE usage_date = v_today
    AND request_count < v_effective_cap
  RETURNING request_count INTO v_current_count;

  IF FOUND THEN
    v_allowed := true;
  ELSE
    -- Row was not updated because request_count reached or exceeded v_effective_cap
    SELECT request_count INTO v_current_count
    FROM public.global_daily_usage
    WHERE usage_date = v_today;

    v_allowed := false;
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'current_count', COALESCE(v_current_count, v_effective_cap),
    'cap_limit', v_effective_cap,
    'usage_date', v_today
  );
END;
$$;

-- Revoke execute from public/anon/authenticated; only service_role can call this RPC
REVOKE ALL ON FUNCTION public.check_and_increment_daily_cap(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_daily_cap(INTEGER) TO service_role;

-- 3. Read-only status inspection RPC for monitoring/dashboards
CREATE OR REPLACE FUNCTION public.get_current_daily_cap_status(
  p_cap_limit INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_today DATE := (timezone('utc'::text, now()))::date;
  v_current_count INTEGER;
  v_effective_cap INTEGER;
BEGIN
  IF p_cap_limit IS NULL OR p_cap_limit < 1 THEN
    v_effective_cap := 20;
  ELSE
    v_effective_cap := p_cap_limit;
  END IF;

  SELECT request_count INTO v_current_count
  FROM public.global_daily_usage
  WHERE usage_date = v_today;

  RETURN jsonb_build_object(
    'usage_date', v_today,
    'current_count', COALESCE(v_current_count, 0),
    'cap_limit', v_effective_cap,
    'is_exhausted', (COALESCE(v_current_count, 0) >= v_effective_cap)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_current_daily_cap_status(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_daily_cap_status(INTEGER) TO service_role;

-- ============================================================================
-- DOCUMENTED ROLLBACK PROCEDURE:
--
-- METHOD 1 (Zero-downtime, no DB alteration):
-- Set the environment variable in your Vercel Project Settings:
--   DAILY_BETA_CAP=999999
-- This immediately bypasses any quota bottleneck in runtime without redeploying SQL.
--
-- METHOD 2 (Complete database rollback):
-- Execute the following SQL in Supabase SQL Editor:
--   DROP FUNCTION IF EXISTS public.get_current_daily_cap_status(INTEGER);
--   DROP FUNCTION IF EXISTS public.check_and_increment_daily_cap(INTEGER);
--   DROP TABLE IF EXISTS public.global_daily_usage;
-- ============================================================================

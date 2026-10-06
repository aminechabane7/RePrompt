-- ==============================================================================
-- RePrompt Production Supabase Database Migration (Hardened)
-- Version: 2.2.0
-- Architecture: Profiles, Server-Enforced Usage, Atomic Reservations, Lightweight History
-- Concurrency & Expiration: Explicit TTL, Safe State Machine, Strict Invariant Enforcement
-- Security: Strict RLS, Dedicated Service-Role Functions, Search-Path Hardening
-- Privilege Audit: SECURITY INVOKER for Triggers, Least-Privilege Grants & Revokes
-- ==============================================================================

-- 1. Enable pgcrypto for UUID generation if not already active
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Automated updated_at trigger function
-- SECURITY INVOKER: Runs with caller privileges without elevating context.
-- Uses explicit safe search_path to prevent schema resolution ambiguity.
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Explicit least-privilege permissions on trigger function
REVOKE ALL ON FUNCTION public.handle_updated_at() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.handle_updated_at() TO authenticated, service_role;

-- ==============================================================================
-- 3. PROFILES TABLE
-- ==============================================================================
-- Note: User email is managed exclusively by Supabase Auth (auth.users) to eliminate
-- redundant personally identifiable data from public tables.
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_plan_check CHECK (plan IN ('free', 'pro', 'unlimited'))
);

-- Index on profiles plan
CREATE INDEX IF NOT EXISTS idx_profiles_plan ON public.profiles(plan);

-- Updated_at trigger for profiles
DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security (RLS) on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Clean existing policies for idempotency
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own display_name only" ON public.profiles;
DROP POLICY IF EXISTS "Service role manages all profiles" ON public.profiles;

-- RLS Policies:
-- Authenticated users can view ONLY their own profile record
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Authenticated users can update ONLY their own display_name, NEVER alter plan or id
CREATE POLICY "Users can update own display_name only"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    plan = (SELECT p.plan FROM public.profiles p WHERE p.id = auth.uid())
  );

-- Service role has full administrative access for trusted backend logic
CREATE POLICY "Service role manages all profiles"
  ON public.profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Table Grants:
REVOKE ALL ON public.profiles FROM PUBLIC, anon;
GRANT SELECT, UPDATE(display_name) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- ==============================================================================
-- 4. USAGE TABLE (Server-Enforced Credits & Limits)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.usage (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  generations_used INTEGER NOT NULL DEFAULT 0,
  generation_limit INTEGER NOT NULL DEFAULT 3,
  period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT generations_used_non_negative CHECK (generations_used >= 0),
  CONSTRAINT generation_limit_positive CHECK (generation_limit >= 0)
);

-- Updated_at trigger for usage
DROP TRIGGER IF EXISTS trigger_usage_updated_at ON public.usage;
CREATE TRIGGER trigger_usage_updated_at
  BEFORE UPDATE ON public.usage
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS on usage
ALTER TABLE public.usage ENABLE ROW LEVEL SECURITY;

-- Clean existing policies
DROP POLICY IF EXISTS "Users can read own usage" ON public.usage;
DROP POLICY IF EXISTS "Users can view own usage" ON public.usage;
DROP POLICY IF EXISTS "Service role manages all usage" ON public.usage;

-- Usage Policies:
-- Users can inspect only their own usage and limit
CREATE POLICY "Users can view own usage"
  ON public.usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Normal users CANNOT insert, update, or delete usage records directly.
-- Only the trusted service role / backend can modify usage!
CREATE POLICY "Service role manages all usage"
  ON public.usage
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Table Grants:
REVOKE ALL ON public.usage FROM PUBLIC, anon;
GRANT SELECT ON public.usage TO authenticated;
GRANT ALL ON public.usage TO service_role;

-- ==============================================================================
-- 5. CREDIT RESERVATIONS TABLE (Safe Atomic Reservation & Expiration Tracking)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.credit_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'reserved',
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
  finalized_at TIMESTAMPTZ,
  CONSTRAINT valid_reservation_status CHECK (status IN ('reserved', 'finalized', 'refunded', 'expired'))
);

-- Idempotent column check for existing databases
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'credit_reservations'
      AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE public.credit_reservations
    ADD COLUMN expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reservations_user_status_expires
  ON public.credit_reservations(user_id, status, expires_at);

-- Enable RLS on credit_reservations
ALTER TABLE public.credit_reservations ENABLE ROW LEVEL SECURITY;

-- Clean existing policies
DROP POLICY IF EXISTS "Users can view own credit reservations" ON public.credit_reservations;
DROP POLICY IF EXISTS "Service role manages all reservations" ON public.credit_reservations;

CREATE POLICY "Users can view own credit reservations"
  ON public.credit_reservations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages all reservations"
  ON public.credit_reservations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Table Grants:
REVOKE ALL ON public.credit_reservations FROM PUBLIC, anon;
GRANT SELECT ON public.credit_reservations TO authenticated;
GRANT ALL ON public.credit_reservations TO service_role;

-- ==============================================================================
-- 6. GENERATIONS TABLE (Metadata & Prompt History Only - Zero Images Stored)
-- ==============================================================================
-- Uploaded images and base64 payloads are NEVER stored in Supabase.
CREATE TABLE IF NOT EXISTS public.generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES public.credit_reservations(id) ON DELETE SET NULL,
  prompt TEXT NOT NULL,
  negative_prompt TEXT,
  mode TEXT NOT NULL DEFAULT 'general',
  target_engine TEXT NOT NULL DEFAULT 'general',
  detail_level TEXT NOT NULL DEFAULT 'detailed',
  detected_style TEXT,
  aspect_ratio TEXT,
  model_used TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user history pagination ordered by latest first
CREATE INDEX IF NOT EXISTS idx_generations_user_created ON public.generations(user_id, created_at DESC);

-- Enable RLS on generations
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;

-- Clean existing policies
DROP POLICY IF EXISTS "Users can view own generations" ON public.generations;
DROP POLICY IF EXISTS "Users can delete own generations" ON public.generations;
DROP POLICY IF EXISTS "Users can insert own generations" ON public.generations;
DROP POLICY IF EXISTS "Service role manages all generations" ON public.generations;

-- Generations Policies:
-- Users can view ONLY their own generations
CREATE POLICY "Users can view own generations"
  ON public.generations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can delete ONLY their own generations
CREATE POLICY "Users can delete own generations"
  ON public.generations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- NO INSERT POLICY for authenticated users!
-- Generations can only be written by trusted backend logic (service role)
-- after successful AI generation and credit finalization.
CREATE POLICY "Service role manages all generations"
  ON public.generations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Table Grants:
REVOKE ALL ON public.generations FROM PUBLIC, anon;
GRANT SELECT, DELETE ON public.generations TO authenticated;
GRANT ALL ON public.generations TO service_role;

-- ==============================================================================
-- 7. AUTOMATED NEW-USER SETUP TRIGGER (Hardened)
-- ==============================================================================
-- SECURITY DEFINER: Required to insert initial profile and usage records across schemas.
-- Protected with explicit search_path and execution restricted to trigger context.
CREATE OR REPLACE FUNCTION public.handle_new_user_setup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Insert default free profile (display name safely sanitized, no duplicated email column)
  INSERT INTO public.profiles (id, display_name, plan)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1),
      'RePrompt Creator'
    ),
    'free'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Insert initial free usage allowance (3 free generations)
  INSERT INTO public.usage (user_id, generations_used, generation_limit, period_start)
  VALUES (
    NEW.id,
    0,
    3,
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Revoke execution from PUBLIC, anon, and authenticated so normal users cannot invoke it directly
REVOKE ALL ON FUNCTION public.handle_new_user_setup() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user_setup() TO postgres, service_role;

-- Trigger attached to auth.users
DROP TRIGGER IF EXISTS trigger_on_auth_user_created ON auth.users;
CREATE TRIGGER trigger_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_setup();

-- ==============================================================================
-- 8. ATOMIC CREDIT RESERVATION RPC (Backend / Service-Role Only)
-- ==============================================================================
-- Transitions stale reservations to 'expired' and atomically reserves 1 credit.
-- Locks usage row to prevent concurrent race condition overconsumption.
CREATE OR REPLACE FUNCTION public.reserve_generation_credit(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_used INTEGER;
  v_limit INTEGER;
  v_plan TEXT;
  v_active_reservations INTEGER;
  v_reservation_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- 1. Lock usage row to serialize concurrent transactions for this user
  SELECT generations_used, generation_limit
  INTO v_used, v_limit
  FROM public.usage
  WHERE user_id = target_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    -- If usage record missing, initialize it
    INSERT INTO public.usage (user_id, generations_used, generation_limit)
    VALUES (target_user_id, 0, 3)
    RETURNING generations_used, generation_limit INTO v_used, v_limit;
  END IF;

  -- 2. Safely expire any stale reservations for this user before computing available credits
  UPDATE public.credit_reservations
  SET status = 'expired',
      reason = COALESCE(reason, 'RESERVATION_TTL_EXPIRED'),
      finalized_at = NOW()
  WHERE user_id = target_user_id
    AND status = 'reserved'
    AND expires_at <= NOW();

  -- 3. Fetch user plan
  SELECT plan INTO v_plan FROM public.profiles WHERE id = target_user_id;
  v_plan := COALESCE(v_plan, 'free');

  -- 4. Calculate explicit expiration timestamp (5 minutes TTL)
  v_expires_at := NOW() + INTERVAL '5 minutes';

  -- 5. If plan is 'unlimited', always permit reservation
  IF v_plan = 'unlimited' THEN
    INSERT INTO public.credit_reservations (user_id, status, expires_at)
    VALUES (target_user_id, 'reserved', v_expires_at)
    RETURNING id INTO v_reservation_id;

    RETURN jsonb_build_object(
      'allowed', true,
      'reservation_id', v_reservation_id,
      'plan', v_plan,
      'generations_used', v_used,
      'generation_limit', v_limit,
      'expires_at', v_expires_at,
      'remaining', 9999
    );
  END IF;

  -- 6. For limited plans ('free' and 'pro'):
  -- Count only non-expired active reservations
  SELECT COUNT(*)
  INTO v_active_reservations
  FROM public.credit_reservations
  WHERE user_id = target_user_id
    AND status = 'reserved'
    AND expires_at > NOW();

  -- Limit invariant check: used + active >= limit
  IF (v_used + v_active_reservations) >= v_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'FREE_LIMIT_REACHED',
      'plan', v_plan,
      'generations_used', v_used,
      'active_reservations', v_active_reservations,
      'generation_limit', v_limit,
      'remaining', 0
    );
  END IF;

  -- 7. Insert new active reservation
  INSERT INTO public.credit_reservations (user_id, status, expires_at)
  VALUES (target_user_id, 'reserved', v_expires_at)
  RETURNING id INTO v_reservation_id;

  RETURN jsonb_build_object(
    'allowed', true,
    'reservation_id', v_reservation_id,
    'plan', v_plan,
    'generations_used', v_used,
    'active_reservations', v_active_reservations + 1,
    'generation_limit', v_limit,
    'expires_at', v_expires_at,
    'remaining', GREATEST(0, v_limit - (v_used + v_active_reservations + 1))
  );
END;
$$;

-- CRITICAL: Explicitly revoke execute from PUBLIC, anon, and authenticated.
-- ONLY trusted backend logic (service_role) can invoke this RPC!
REVOKE ALL ON FUNCTION public.reserve_generation_credit(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_generation_credit(UUID) TO service_role;

-- ==============================================================================
-- 9. ATOMIC CREDIT FINALIZATION RPC (Backend / Service-Role Only)
-- ==============================================================================
-- Called after the AI provider produces a valid prompt response.
-- Verifies the reservation is strictly active and unexpired, enforces limit
-- invariant, marks reservation 'finalized', and increments generations_used.
CREATE OR REPLACE FUNCTION public.finalize_generation_credit(p_reservation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_status TEXT;
  v_expires_at TIMESTAMPTZ;
  v_plan TEXT;
  v_used INTEGER;
  v_limit INTEGER;
BEGIN
  -- 1. Lock reservation row for atomic state transition
  SELECT user_id, status, expires_at
  INTO v_user_id, v_status, v_expires_at
  FROM public.credit_reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'RESERVATION_NOT_FOUND');
  END IF;

  -- Prevent duplicate finalization or transitions from already resolved states
  IF v_status <> 'reserved' THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'ALREADY_RESOLVED',
      'current_status', v_status
    );
  END IF;

  -- 2. Strictly refuse expired reservations
  IF v_expires_at <= NOW() THEN
    UPDATE public.credit_reservations
    SET status = 'expired',
        reason = 'RESERVATION_EXPIRED_BEFORE_FINALIZATION',
        finalized_at = NOW()
    WHERE id = p_reservation_id;

    RETURN jsonb_build_object(
      'success', false,
      'reason', 'RESERVATION_EXPIRED',
      'current_status', 'expired'
    );
  END IF;

  -- 3. Lock usage row to serialize credit updates
  SELECT generations_used, generation_limit
  INTO v_used, v_limit
  FROM public.usage
  WHERE user_id = v_user_id
  FOR UPDATE;

  -- 4. Check user plan
  SELECT plan INTO v_plan FROM public.profiles WHERE id = v_user_id;
  v_plan := COALESCE(v_plan, 'free');

  -- 5. Invariant Protection:
  -- For limited plans ('free' and 'pro'), generations_used must NEVER exceed generation_limit
  IF v_plan <> 'unlimited' THEN
    IF v_used >= v_limit THEN
      UPDATE public.credit_reservations
      SET status = 'expired',
          reason = 'LIMIT_ALREADY_REACHED',
          finalized_at = NOW()
      WHERE id = p_reservation_id;

      RETURN jsonb_build_object(
        'success', false,
        'reason', 'LIMIT_REACHED',
        'generations_used', v_used,
        'generation_limit', v_limit,
        'remaining', 0
      );
    END IF;

    -- Increment usage within limit
    UPDATE public.usage
    SET generations_used = generations_used + 1
    WHERE user_id = v_user_id
    RETURNING generations_used, generation_limit INTO v_used, v_limit;
  ELSE
    -- Unlimited plan increments metric without cap
    UPDATE public.usage
    SET generations_used = generations_used + 1
    WHERE user_id = v_user_id
    RETURNING generations_used, generation_limit INTO v_used, v_limit;
  END IF;

  -- 6. Mark reservation as finalized
  UPDATE public.credit_reservations
  SET status = 'finalized',
      finalized_at = NOW()
  WHERE id = p_reservation_id;

  RETURN jsonb_build_object(
    'success', true,
    'reservation_id', p_reservation_id,
    'user_id', v_user_id,
    'generations_used', COALESCE(v_used, 0),
    'generation_limit', COALESCE(v_limit, 3),
    'remaining', CASE
      WHEN v_plan = 'unlimited' THEN 9999
      ELSE GREATEST(0, COALESCE(v_limit, 3) - COALESCE(v_used, 0))
    END
  );
END;
$$;

-- CRITICAL: Explicitly revoke execute from PUBLIC, anon, and authenticated.
REVOKE ALL ON FUNCTION public.finalize_generation_credit(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_generation_credit(UUID) TO service_role;

-- ==============================================================================
-- 10. ATOMIC CREDIT RELEASE / REFUND RPC (Backend / Service-Role Only)
-- ==============================================================================
-- Called if Gemini/AI times out, fails, or returns an error.
-- Safely unlocks the reserved slot without negative usage or repeated refunds.
-- One-way transitions: cannot release an expired, finalized, or refunded row.
CREATE OR REPLACE FUNCTION public.release_generation_credit(
  p_reservation_id UUID,
  p_reason TEXT DEFAULT 'AI_FAILURE'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_status TEXT;
  v_expires_at TIMESTAMPTZ;
  v_used INTEGER;
  v_limit INTEGER;
BEGIN
  -- 1. Lock reservation row for atomic state transition
  SELECT user_id, status, expires_at
  INTO v_user_id, v_status, v_expires_at
  FROM public.credit_reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'RESERVATION_NOT_FOUND');
  END IF;

  -- Idempotency check: Cannot release an already resolved reservation
  IF v_status <> 'reserved' THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'ALREADY_RESOLVED',
      'current_status', v_status
    );
  END IF;

  -- 2. If reservation already expired past TTL, transition to expired rather than refunded
  IF v_expires_at <= NOW() THEN
    UPDATE public.credit_reservations
    SET status = 'expired',
        reason = 'EXPIRED_BEFORE_RELEASE',
        finalized_at = NOW()
    WHERE id = p_reservation_id;

    RETURN jsonb_build_object(
      'success', false,
      'reason', 'RESERVATION_EXPIRED',
      'current_status', 'expired'
    );
  END IF;

  -- 3. Mark reservation as refunded
  UPDATE public.credit_reservations
  SET status = 'refunded',
      reason = p_reason,
      finalized_at = NOW()
  WHERE id = p_reservation_id;

  -- 4. Return current usage state (generations_used is untouched)
  SELECT generations_used, generation_limit
  INTO v_used, v_limit
  FROM public.usage
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'refunded', true,
    'reservation_id', p_reservation_id,
    'user_id', v_user_id,
    'generations_used', COALESCE(v_used, 0),
    'generation_limit', COALESCE(v_limit, 3),
    'remaining', GREATEST(0, COALESCE(v_limit, 3) - COALESCE(v_used, 0))
  );
END;
$$;

-- CRITICAL: Explicitly revoke execute from PUBLIC, anon, and authenticated.
REVOKE ALL ON FUNCTION public.release_generation_credit(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_generation_credit(UUID, TEXT) TO service_role;

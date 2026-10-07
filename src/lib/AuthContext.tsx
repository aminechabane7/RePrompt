import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { UserProfile, UserUsage } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  usage: UserUsage | null;
  loading: boolean;
  isConfigured: boolean;
  isPasswordRecovery: boolean;
  recoveryError: string | null;
  clearPasswordRecovery: () => void;
  refreshUsage: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
}

const checkIsRecoveryFromUrl = (): boolean => {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash || '';
  const search = window.location.search || '';
  if (hash.includes('type=recovery') || search.includes('type=recovery')) return true;
  try {
    const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
    if (hashParams.get('type') === 'recovery') return true;
    const searchParams = new URLSearchParams(search);
    if (searchParams.get('type') === 'recovery') return true;
  } catch {
    // Ignore URL parse errors
  }
  return false;
};

const checkRecoveryErrorFromUrl = (): string | null => {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash || '';
  const search = window.location.search || '';
  try {
    const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
    const searchParams = new URLSearchParams(search);
    const desc = hashParams.get('error_description') || searchParams.get('error_description');
    const code = hashParams.get('error_code') || searchParams.get('error_code');
    const err = hashParams.get('error') || searchParams.get('error');

    if (desc) {
      return decodeURIComponent(desc.replace(/\+/g, ' '));
    }
    if (code === '401' || err === 'unauthorized_client' || err === 'access_denied') {
      return 'The password reset link is invalid or has expired. Please request a new one.';
    }
  } catch {
    // Ignore URL parse errors
  }
  return null;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  usage: null,
  loading: true,
  isConfigured: false,
  isPasswordRecovery: false,
  recoveryError: null,
  clearPasswordRecovery: () => {},
  refreshUsage: async () => {},
  getAccessToken: async () => null,
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [usage, setUsage] = useState<UserUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(() => checkIsRecoveryFromUrl());
  const [recoveryError, setRecoveryError] = useState<string | null>(() => checkRecoveryErrorFromUrl());

  const fetchProfileAndUsage = async (userId: string, accessToken: string) => {
    try {
      // Fetch user usage from backend or Supabase directly
      const response = await fetch('/api/user/usage', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await response.json();
          if (data.success) {
            setUsage({
              userId,
              generationsUsed: data.generationsUsed ?? 0,
              generationLimit: data.generationLimit ?? 3,
              remaining: Math.max(0, (data.generationLimit ?? 3) - (data.generationsUsed ?? 0)),
            });
            setProfile({
              id: userId,
              plan: data.plan || 'free',
              displayName: data.displayName || user?.user_metadata?.name || '',
            });
            return;
          }
        }
      }
    } catch (err) {
      console.warn('Error fetching user profile/usage:', err);
    }

    // Default fallback state if offline or fetch failed
    setUsage((prev) => prev || { userId, generationsUsed: 0, generationLimit: 3, remaining: 3 });
  };

  const refreshUsage = async () => {
    if (session?.access_token && user) {
      await fetchProfileAndUsage(user.id, session.access_token);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    // 1. Initial session check
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession?.user && initialSession.access_token) {
        fetchProfileAndUsage(initialSession.user.id, initialSession.access_token).finally(() => {
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // 2. Auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
        setRecoveryError(null);
      } else if (event === 'SIGNED_OUT') {
        setIsPasswordRecovery(false);
        setRecoveryError(null);
      }

      if (currentSession?.user && currentSession.access_token) {
        await fetchProfileAndUsage(currentSession.user.id, currentSession.access_token);
      } else {
        setProfile(null);
        setUsage(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const clearPasswordRecovery = () => {
    setIsPasswordRecovery(false);
    setRecoveryError(null);
    if (typeof window !== 'undefined') {
      try {
        const hash = window.location.hash || '';
        if (
          hash.includes('recovery') ||
          hash.includes('access_token') ||
          hash.includes('error') ||
          hash.includes('type=')
        ) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      } catch {
        // Ignore history replace errors
      }
    }
  };

  const getAccessToken = async (): Promise<string | null> => {
    if (!isSupabaseConfigured || !supabase) return session?.access_token ?? null;
    try {
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      if (error || !currentSession) return session?.access_token ?? null;
      if (currentSession.access_token !== session?.access_token) {
        setSession(currentSession);
        setUser(currentSession.user);
      }
      return currentSession.access_token;
    } catch {
      return session?.access_token ?? null;
    }
  };

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    setUsage(null);
    setIsPasswordRecovery(false);
    setRecoveryError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        usage,
        loading,
        isConfigured: isSupabaseConfigured,
        isPasswordRecovery,
        recoveryError,
        clearPasswordRecovery,
        refreshUsage,
        getAccessToken,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

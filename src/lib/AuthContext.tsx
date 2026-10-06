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
  refreshUsage: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  usage: null,
  loading: true,
  isConfigured: false,
  refreshUsage: async () => {},
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [usage, setUsage] = useState<UserUsage | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfileAndUsage = async (userId: string, accessToken: string) => {
    try {
      // Fetch user usage from backend or Supabase directly
      const response = await fetch('/api/user/usage', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
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

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    setUsage(null);
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
        refreshUsage,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

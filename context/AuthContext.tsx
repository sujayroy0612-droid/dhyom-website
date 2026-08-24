"use client";

import {
  createContext, useContext, useEffect, useState, useCallback, useRef,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

type AuthCtx = {
  user:             User | null;
  loading:          boolean;
  modalOpen:        boolean;
  openModal:        () => void;
  closeModal:       () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail:  (email: string) => Promise<{ error?: string }>;
  verifyOtp:        (email: string, token: string) => Promise<{ error?: string }>;
  signOut:          () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,      setUser]      = useState<User | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const resolveRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setModalOpen(false);
        resolveRef.current?.();
        resolveRef.current = null;
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const openModal  = useCallback(() => setModalOpen(true),  []);
  const closeModal = useCallback(() => setModalOpen(false), []);

  const signInWithGoogle = useCallback(async () => {
    const redirectTo = `${window.location.origin}/auth/callback`;
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
  }, []);

  const signInWithEmail = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    return error ? { error: error.message } : {};
  }, []);

  const verifyOtp = useCallback(async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    return error ? { error: error.message } : {};
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return (
    <Ctx.Provider value={{
      user, loading, modalOpen, openModal, closeModal,
      signInWithGoogle, signInWithEmail, verifyOtp, signOut,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}

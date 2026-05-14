import { supabase, isSupabaseConfigured } from "./supabase";
import type { Session, User } from "@supabase/supabase-js";

export type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
};

/** Sign in with email and password */
export async function signInWithEmail(email: string, password: string) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured.");
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

/** Sign out */
export async function signOut() {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Get the current session (non-blocking) */
export async function getSession() {
  if (!isSupabaseConfigured) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/** Listen for auth state changes. Returns an unsubscribe function. */
export function onAuthStateChange(callback: (session: Session | null) => void) {
  if (!isSupabaseConfigured) return () => {};
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => subscription.unsubscribe();
}

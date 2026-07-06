import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export async function ensureSupabaseSession(): Promise<Session | null> {
  const {
    data: { session: initialSession },
  } = await supabase.auth.getSession();

  if (initialSession?.access_token) {
    return initialSession;
  }

  const {
    data: { session: refreshedSession },
    error: refreshError,
  } = await supabase.auth.refreshSession();

  if (!refreshError && refreshedSession?.access_token) {
    return refreshedSession;
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const {
    data: { session: latestSession },
  } = await supabase.auth.getSession();

  return latestSession?.access_token ? latestSession : null;
}

export function waitForSupabaseSession(timeoutMs = 6000): Promise<Session | null> {
  return new Promise((resolve) => {
    let settled = false;

    const finish = (session: Session | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      subscription.unsubscribe();
      resolve(session);
    };

    const timer = window.setTimeout(() => {
      void ensureSupabaseSession().then(finish);
    }, timeoutMs);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        session?.access_token &&
        (event === "INITIAL_SESSION" ||
          event === "SIGNED_IN" ||
          event === "TOKEN_REFRESHED")
      ) {
        finish(session);
      }
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        finish(session);
      }
    });
  });
}
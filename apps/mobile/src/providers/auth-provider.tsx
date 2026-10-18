import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import { AppState } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const AuthContext = createContext<{
  session: Session | null;
  loading: boolean;
  error: string | null;
}>({
  session: null,
  loading: true,
  error: null,
});

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let active = true;
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, next) => {
      if (active) {
        setSession(next);
        setLoading(false);
      }
    });
    void client.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (active) {
          setSession(data.session);
          setError(
            sessionError
              ? "Your session could not be restored. Please sign in again."
              : null,
          );
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setError(
            "Could not connect to sign-in. Try again when you're online.",
          );
          setLoading(false);
        }
      });
    if (AppState.currentState === "active") client.auth.startAutoRefresh();
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") client.auth.startAutoRefresh();
      else client.auth.stopAutoRefresh();
    });
    return () => {
      active = false;
      subscription.unsubscribe();
      listener.remove();
      client.auth.stopAutoRefresh();
    };
  }, []);
  return (
    <AuthContext.Provider value={{ session, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

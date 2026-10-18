import { useRef, useState } from "react";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { normalizeUfEmail, signupPasswordError } from "@breadcrumb/shared";
import { LoafSlicer, type LoafSlice } from "./loaf-slicer";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { useCampus } from "@/providers/world-provider";
import { ToastLogo } from "./pixel-art";
import { GameButton, Feedback, gameStyles as s } from "./game-ui";
import { theme as t } from "@/lib/theme";

export function AccountScreen({ mode }: { mode: "login" | "signup" }) {
  const insets = useSafeAreaInsets();
  const { session, error } = useAuth();
  const { stop } = useCampus();
  const lock = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [slice, setSlice] = useState<LoafSlice | null>(null);
  const [sliceReady, setSliceReady] = useState(false);
  const [sliceRetry, setSliceRetry] = useState(0);
  const signup = mode === "signup";

  async function enterCampus() {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !normalizeUfEmail(user.email) || !user.email_confirmed_at) {
      await supabase.auth.signOut({ scope: "local" });
      throw new Error("Your session could not be verified. Please sign in again.");
    }
    const { data: profile, error } = await supabase.from("profiles")
      .select("account_completed,avatar_completed").eq("id", user.id).single();
    if (error) throw new Error("Could not load your profile. Please retry.");
    router.replace(!profile?.account_completed || !profile.avatar_completed ? "/profile?edit=1" : "/");
  }

  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setMessage("");
    setSuccess(false);
    try { await action(); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Could not connect. Please retry."); }
    finally { lock.current = false; setPending(false); }
  }

  async function submit() {
    if (!supabase) return;
    const client = supabase;
    await run(async () => {
      const normalized = normalizeUfEmail(email);
      if (!normalized) throw new Error("Enter your @ufl.edu email address.");
      if (!password) throw new Error("Enter your password.");
      if (signup) {
        const error = signupPasswordError(password, password);
        if (error) throw new Error(error);
        if (!sliceReady) throw new Error("Slice the loaf before creating your account.");
      }
      const response = await apiFetch(signup ? "/api/auth/signup" : "/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signup
          ? { email: normalized, password, loafChallenge: slice?.challenge, loafTrace: slice?.trace }
          : { identifier: normalized, password }),
      });
      if (signup) setSliceRetry(n => n + 1);
      const result = await response.json();
      if (!response.ok || !result.session) throw new Error(result.error ?? "Account services are unavailable. Please retry.");
      const { error } = await client.auth.setSession(result.session);
      if (error) throw new Error("Could not save your session. Please sign in.");
      setPassword("");
      await enterCampus();
    });
  }

  async function resetPassword() {
    await run(async () => {
      const normalized = normalizeUfEmail(email);
      if (!normalized) throw new Error("Enter your UF email above to request a password reset link.");
      const response = await apiFetch("/api/auth/reset-password", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: normalized }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not send a password reset. Please retry.");
      setSuccess(true);
      setMessage(result.message ?? "Check your UF inbox for a password reset link.");
    });
  }

  return (
    <KeyboardAvoidingView style={s.page} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={[s.content, { paddingTop: session ? 16 : insets.top + 16, paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
        <View style={[s.row, { paddingVertical: 8 }]}>
          <ToastLogo size={48}/><Text style={[s.title, { fontSize: 20 }]}>Breadcrumb</Text>
        </View>
        {session ? <>
          <Text style={s.title}>Welcome back.</Text>
          <GameButton loading={pending} onPress={() => void run(enterCampus)}>Continue to campus</GameButton>
          <GameButton variant="secondary" disabled={pending} onPress={() => router.replace("/profile")}>Your profile</GameButton>
          <GameButton variant="danger" disabled={pending} onPress={() => void run(async () => {
            await stop();
            const result = await supabase?.auth.signOut();
            if (result?.error) throw new Error("Could not sign out. Please retry.");
          })}>Sign out</GameButton>
        </> : <>
          <Text style={s.title}>{signup ? "Join the loaf." : "Welcome back."}</Text>
          <GameButton variant="secondary" disabled={pending} onPress={() => router.replace(signup ? "/login" : "/signup")}>
            {signup ? "Already have an account? Sign in" : "New here? Create an account"}
          </GameButton>
          <Text style={s.label}>UF email address</Text>
          <TextInput style={s.input} accessibilityLabel="UF email address" value={email} onChangeText={setEmail}
            placeholder="you@ufl.edu" placeholderTextColor={t.muted} autoCapitalize="none" autoCorrect={false}
            autoComplete="email" keyboardType="email-address" editable={!pending}/>
          <Text style={s.label}>Password</Text>
          <View style={s.row}>
            <TextInput style={[s.input, { flex: 1 }]} accessibilityLabel="Password" value={password} onChangeText={setPassword}
              secureTextEntry={!showPassword} autoComplete={signup ? "new-password" : "current-password"}
              textContentType={signup ? "newPassword" : "password"} autoCapitalize="none" autoCorrect={false}
              maxLength={128} editable={!pending} onSubmitEditing={signup ? undefined : () => void submit()}/>
            <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              onPress={() => setShowPassword(!showPassword)} style={{ minHeight: 48, minWidth: 48, justifyContent: "center" }}>
              <Text style={s.label}>{showPassword ? "Hide" : "Show"}</Text>
            </Pressable>
          </View>
          {signup ? <LoafSlicer onChange={setSlice} onReady={setSliceReady} resetKey={sliceRetry}/> :
            <GameButton variant="secondary" disabled={pending} onPress={() => void resetPassword()}>Forgot password?</GameButton>}
          <GameButton disabled={!supabase || (signup && !sliceReady)} loading={pending} onPress={() => void submit()}>
            {signup ? "Create account" : "Sign in"}
          </GameButton>
        </>}
        <Feedback error={!success} message={message || error || (!supabase ? "Sign-in is unavailable. Please try again later." : "")}/>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

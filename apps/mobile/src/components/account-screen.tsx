import { useRef, useState } from "react";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { normalizeUfEmail, signupPasswordError } from "@breadcrumb/shared";
import { LoafSlicer, type LoafSlice } from "./loaf-slicer";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { useCampus } from "@/providers/world-provider";
import { ToastLogo } from "./pixel-art";
import { Icon } from "./icon";
import { PixelFrame } from "./pixel-frame";
import { GameButton, Feedback, PIXEL_FONT, gameStyles as s } from "./game-ui";
import { theme as t } from "@/lib/theme";

export function AccountScreen({ mode }: { mode: "login" | "signup" }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const compact = height - insets.top - insets.bottom < 850;
  const { session, error } = useAuth();
  const { stop } = useCampus();
  const lock = useRef(false);
  const passwordInput = useRef<TextInput>(null);
  const [slicing, setSlicing] = useState(false);
  const [focused, setFocused] = useState<"email" | "password" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [entering, setEntering] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [slice, setSlice] = useState<LoafSlice | null>(null);
  const [sliceReady, setSliceReady] = useState(false);
  const [sliceRetry, setSliceRetry] = useState(0);
  const signup = mode === "signup";
  const disabled = !supabase || pending || (signup && !sliceReady);

  async function enterCampus() {
    if (!supabase) return;
    setEntering(true);
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
    catch (e) { setEntering(false); setMessage(e instanceof Error ? e.message : "Could not connect. Please retry."); }
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
      // Auth listeners fire before setSession resolves. Keep the handoff visible
      // instead of briefly rendering the signed-in account menu underneath it.
      setEntering(true);
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

  if (entering) return <View style={[s.page, { alignItems: "center", justifyContent: "center", gap: 12 }]}>
    <ActivityIndicator color={t.ink}/>
    <Text accessibilityLiveRegion="polite" style={styles.description}>{signup ? "Opening your profile..." : "Signing you in..."}</Text>
  </View>;

  return (
    <KeyboardAvoidingView style={s.page} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: session ? 24 : insets.top + (compact ? 16 : 24), paddingBottom: insets.bottom + (compact ? 20 : 28) }]}
        keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
        scrollEnabled={!slicing} canCancelContentTouches={false}
      >
        {!signup && <View style={[styles.hero, compact && styles.compactHero]}>
          <ToastLogo size={session ? 96 : height < 500 ? 96 : compact ? 152 : 168} centered/>
          <Text style={styles.wordmark}>breadcrumb</Text>
          <Text style={styles.tagline}>Leave a crumb. Spread the word.</Text>
        </View>}
        {session ? <View style={styles.form}>
          <Text style={s.title}>Welcome back.</Text>
          <GameButton loading={pending} onPress={() => void run(enterCampus)}>Continue to campus</GameButton>
          <GameButton variant="secondary" disabled={pending} onPress={() => router.replace("/profile")}>Your profile</GameButton>
          <GameButton variant="danger" disabled={pending} onPress={() => void run(async () => {
            await stop();
            const result = await supabase?.auth.signOut();
            if (result?.error) throw new Error("Could not sign out. Please retry.");
          })}>Sign out</GameButton>
        </View> : <View style={styles.form}>
          <View style={styles.intro}>
            <Text accessibilityRole="header" style={styles.heading}>{signup ? "Join the loaf." : "Welcome back."}</Text>
            <Text style={styles.description}>{signup ? "A little slice of campus starts here." : "Your next campus discovery is waiting."}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>UF email</Text>
            <View style={styles.inputFrame}>
              <PixelFrame fill={focused === "email" ? t.crumbSurface : t.surface} />
              <TextInput style={styles.input} accessibilityLabel="UF email address" value={email} onChangeText={setEmail}
                placeholder="you@ufl.edu" placeholderTextColor={t.muted} autoCapitalize="none" autoCorrect={false}
                autoComplete="email" textContentType="emailAddress" keyboardType="email-address" editable={!pending}
                onFocus={() => setFocused("email")} onBlur={() => setFocused(null)}
                returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => passwordInput.current?.focus()}/>
            </View>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordField}>
            <PixelFrame fill={focused === "password" ? t.crumbSurface : t.surface} />
            <TextInput ref={passwordInput} style={styles.passwordInput} accessibilityLabel="Password" value={password} onChangeText={setPassword}
              secureTextEntry={!showPassword} autoComplete={signup ? "new-password" : "current-password"}
              textContentType={signup ? "newPassword" : "password"} autoCapitalize="none" autoCorrect={false}
              placeholder={signup ? "Create a password" : "Enter your password"} placeholderTextColor={t.muted}
              onFocus={() => setFocused("password")} onBlur={() => setFocused(null)}
              maxLength={128} editable={!pending} returnKeyType={signup ? "done" : "go"}
              onSubmitEditing={signup ? undefined : () => void submit()}/>
            <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              disabled={pending} onPress={() => setShowPassword(v => !v)}
              style={({ pressed }) => [styles.eyeButton, pressed && styles.pressed]}>
              <Icon name={showPassword ? "eye-off" : "eye"} size={22}/>
            </Pressable>
            </View>
            {signup && <Text style={styles.helper}>Use 8 or more characters.</Text>}
          </View>
          {signup ? <LoafSlicer key={sliceRetry} onChange={setSlice} onReady={setSliceReady} onInteractionChange={setSlicing}/> :
            <Pressable accessibilityRole="button" disabled={pending} onPress={() => void resetPassword()}
              style={({ pressed }) => [styles.forgotButton, pressed && styles.pressed]}>
              <Text style={styles.link}>Forgot password?</Text>
            </Pressable>}
          <Feedback error={!success} message={message || error || (!supabase ? "Sign-in is unavailable. Please try again later." : "")}/>
          <View style={[styles.buttonBase, signup && styles.signupButtonBase, disabled && styles.disabled]}>
            <Pressable accessibilityRole="button" accessibilityState={{ disabled, busy: pending }} disabled={disabled}
              onPress={() => void submit()} style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}>
              <PixelFrame fill={t.toast} accent />
              {pending && <ActivityIndicator color={t.ink}/>}
              <Text style={styles.primaryLabel}>{pending ? (signup ? "Creating account..." : "Signing in...") : (signup ? "Create account" : "Sign in")}</Text>
              {!pending && <Icon name="chevron" size={20}/>}
            </Pressable>
          </View>
        </View>}
        {session ? <Feedback error={!success} message={message || error || ""}/> :
          <View style={[styles.footer, compact && styles.compactFooter]}>
            <View style={styles.divider}/>
            <Text style={styles.footerPrompt}>{signup ? "Already part of the loaf?" : "New around here?"}</Text>
            <Pressable accessibilityRole="button" disabled={pending} onPress={() => router.replace(signup ? "/login" : "/signup")}
              style={({ pressed }) => [styles.footerButton, pressed && styles.pressed]}>
              <Text style={styles.footerLink}>{signup ? "Sign in" : "Create an account"}</Text>
              <Icon name="chevron" size={16}/>
            </Pressable>
            {!signup && <Pressable accessibilityRole="button" disabled={pending} onPress={()=>router.push("/ask")}
              style={({pressed})=>[styles.footerButton,pressed&&styles.pressed]}>
              <Text style={styles.footerLink}>Explore with Ask Breadcrumb</Text>
            </Pressable>}
          </View>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, width: "100%", maxWidth: 440, alignSelf: "center", paddingHorizontal: 28 },
  hero: { alignItems: "center", paddingTop: 8, paddingBottom: 36, gap: 14 },
  compactHero: { paddingTop: 0, paddingBottom: 24, gap: 10 },
  wordmark: { fontFamily: "PressStart2P_400Regular", fontSize: 22, lineHeight: 32, color: t.ink, textAlign: "center" },
  tagline: { fontSize: 14, lineHeight: 22, color: t.muted, textAlign: "center" },
  form: { gap: 20 },
  intro: { gap: 6, marginBottom: 4 },
  heading: { fontFamily: PIXEL_FONT, fontSize: 19, lineHeight: 32, color: t.ink },
  description: { fontSize: 15, lineHeight: 23, color: t.muted },
  field: { gap: 8 },
  label: { fontFamily: PIXEL_FONT, fontSize: 11, lineHeight: 20, color: t.ink },
  inputFrame: { minHeight: 56 },
  input: { minHeight: 56, paddingHorizontal: 16, paddingVertical: 14, fontFamily: PIXEL_FONT, fontSize: 11, lineHeight: 22, color: t.ink },
  passwordField: { flexDirection: "row", alignItems: "center", minHeight: 56 },
  passwordInput: { flex: 1, minWidth: 0, minHeight: 53, paddingLeft: 16, paddingRight: 4, paddingVertical: 14, fontFamily: PIXEL_FONT, fontSize: 11, lineHeight: 22, color: t.ink },
  eyeButton: { minHeight: 52, minWidth: 48, alignItems: "center", justifyContent: "center" },
  helper: { fontSize: 13, lineHeight: 20, color: t.muted },
  forgotButton: { alignSelf: "flex-end", minHeight: 44, justifyContent: "center", marginTop: -16, paddingHorizontal: 2 },
  link: { color: t.ink, fontFamily: PIXEL_FONT, fontSize: 10, lineHeight: 20, textDecorationLine: "underline" },
  buttonBase: { paddingBottom: 4, marginTop: 4 },
  signupButtonBase: { marginTop: -12 },
  primaryButton: { minHeight: 58, paddingHorizontal: 16, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
  primaryLabel: { color: t.ink, fontFamily: PIXEL_FONT, fontSize: 12, lineHeight: 22, flexShrink: 1, textAlign: "center" },
  buttonPressed: { transform: [{ translateY: 3 }] },
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.5 },
  footer: { alignItems: "center", paddingTop: 32, marginTop: "auto" },
  compactFooter: { paddingTop: 24 },
  divider: { width: 48, height: 4, backgroundColor: t.border, marginBottom: 24 },
  footerPrompt: { color: t.muted, fontSize: 14, lineHeight: 22, textAlign: "center" },
  footerButton: { flexDirection: "row", gap: 8, minHeight: 48, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  footerLink: { color: t.ink, fontFamily: PIXEL_FONT, fontSize: 10, lineHeight: 20, textAlign: "center", flexShrink: 1, textDecorationLine: "underline" },
});

import { useRef, useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { normalizeUfEmail, normalizeUfLogin } from "@breadcrumb/shared";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { useCampus } from "@/providers/world-provider";
import { ToastLogo } from "@/components/pixel-art";
import { GameButton, Feedback, gameStyles as s } from "@/components/game-ui";
import { theme as t } from "@/lib/theme";
export default function LoginScreen() {
  const { session, loading, error } = useAuth(),
    { stop } = useCampus(),
    lock = useRef(false);
  const [mode, setMode] = useState<"login" | "signup" | "recover">("login"),
    [identity, setIdentity] = useState(""),
    [password, setPassword] = useState(""),
    [showPassword, setShowPassword] = useState(false),
    [code, setCode] = useState(""),
    [sentTo, setSentTo] = useState<string | null>(null),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState("");
  async function enterCampus() {
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !normalizeUfEmail(user.email) || !user.email_confirmed_at) {
      await supabase.auth.signOut();
      setMessage("A confirmed UF email address is required.");
      return;
    }
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("account_completed,avatar_completed")
      .eq("id", user.id)
      .single();
    if (error) {
      setMessage("Could not load your profile. Please retry.");
      return;
    }
    router.replace(
      mode === "recover" ||
        !profile?.account_completed ||
        !profile.avatar_completed
        ? "/profile?edit=1"
        : "/",
    );
  }
  async function submit() {
    if (!supabase || lock.current) return;
    lock.current = true;
    setPending(true);
    setMessage("");
    try {
      if (mode === "login") {
        const login = normalizeUfLogin(identity);
        if (!login || !password) {
          setMessage("Enter your UF email or username and password.");
          return;
        }
        if (login.includes("@")) {
          const { error } = await supabase.auth.signInWithPassword({
            email: login,
            password,
          });
          if (error) {
            setMessage(
              error.code === "email_not_confirmed"
                ? "Confirm your UF email before signing in."
                : "Email/username or password is incorrect.",
            );
            return;
          }
        } else {
          const response = await apiFetch("/api/auth/password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier: login, password }),
          });
          const result = await response.json();
          if (!response.ok || !result.session)
            throw new Error(result.error ?? "Could not sign in.");
          const { error } = await supabase.auth.setSession(result.session);
          if (error)
            throw new Error("Could not save your session. Please retry.");
        }
        setPassword("");
        await enterCampus();
      } else if (sentTo) {
        if (!/^\d{6,10}$/.test(code.trim())) {
          setMessage("Enter the full numeric code from your UF inbox.");
          return;
        }
        const { error } = await supabase.auth.verifyOtp({
          email: sentTo,
          token: code.trim(),
          type: "email",
        });
        if (error) {
          setMessage("That code is invalid or expired. Request a new one.");
          return;
        }
        await enterCampus();
      } else {
        const email = normalizeUfEmail(identity);
        if (!email) {
          setMessage("Use your @ufl.edu email address.");
          return;
        }
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: mode === "signup" },
        });
        if (error)
          throw new Error("Could not send a code. Please wait and retry.");
        setSentTo(email);
        setMessage("Check your UF inbox for the verification code.");
      }
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Could not connect. Please retry.",
      );
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  function switchMode(next: typeof mode) {
    setMode(next);
    setSentTo(null);
    setCode("");
    setPassword("");
    setMessage("");
  }
  async function resend() {
    if (!supabase || !sentTo || pending) return;
    setPending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: sentTo,
        options: { shouldCreateUser: mode === "signup" },
      });
      setMessage(
        error
          ? "Could not resend. Wait a moment and retry."
          : "A new code was sent. Check your inbox.",
      );
    } catch {
      setMessage("Could not connect. Please retry.");
    } finally {
      setPending(false);
    }
  }
  if (loading)
    return (
      <View style={[s.page, { justifyContent: "center" }]}>
        <ActivityIndicator color={t.ink} />
      </View>
    );
  return (
    <KeyboardAvoidingView
      style={s.page}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[s.row, { paddingVertical: 8 }]}>
          <ToastLogo size={48} />
          <Text style={[s.title, { fontSize: 20 }]}>Breadcrumb</Text>
        </View>
        {session && !sentTo ? (
          <>
            <Text style={s.title}>Welcome back.</Text>
            <Text style={s.body}>Your UF account is signed in.</Text>
            <GameButton onPress={() => void enterCampus()}>
              Continue to campus
            </GameButton>
            <GameButton
              variant="secondary"
              onPress={() => router.replace("/profile")}
            >
              Your profile
            </GameButton>
            <GameButton
              variant="danger"
              loading={pending}
              onPress={() => {
                setPending(true);
                void stop()
                  .then(() => supabase?.auth.signOut())
                  .then(() => setMessage(""))
                  .catch(() => setMessage("Could not sign out. Please retry."))
                  .finally(() => setPending(false));
              }}
            >
              Sign out
            </GameButton>
          </>
        ) : (
          <>
            <Text style={s.title}>
              {sentTo
                ? "Check your UF inbox"
                : mode === "signup"
                  ? "Join the campus."
                  : mode === "recover"
                    ? "Get back into your account."
                    : "Welcome back."}
            </Text>
            <Text style={s.body}>
              {mode === "login"
                ? "Sign in with your UF email or Breadcrumb username."
                : mode === "recover"
                  ? "We’ll email a code to sign you in. You can then change your password in your profile."
                  : "Verify your UF email to share discoveries."}
            </Text>
            <Text style={s.label}>
              {mode === "login" ? "Email or username" : "UF email address"}
            </Text>
            <TextInput
              style={s.input}
              accessibilityLabel={
                mode === "login" ? "Email or username" : "UF email address"
              }
              value={identity}
              onChangeText={setIdentity}
              placeholder={
                mode === "login"
                  ? "you@ufl.edu or your username"
                  : "you@ufl.edu"
              }
              placeholderTextColor={t.muted}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete={mode === "login" ? "username" : "email"}
              keyboardType={mode === "login" ? "default" : "email-address"}
              editable={!pending && !sentTo}
            />
            {mode === "login" && (
              <>
                <Text style={s.label}>Password</Text>
                <View style={s.row}>
                  <TextInput
                    style={[s.input, { flex: 1 }]}
                    accessibilityLabel="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoComplete="current-password"
                    textContentType="password"
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={128}
                    editable={!pending}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      showPassword ? "Hide password" : "Show password"
                    }
                    onPress={() => setShowPassword(!showPassword)}
                    style={{
                      minHeight: 48,
                      minWidth: 48,
                      justifyContent: "center",
                    }}
                  >
                    <Text style={s.label}>
                      {showPassword ? "Hide" : "Show"}
                    </Text>
                  </Pressable>
                </View>
                <GameButton
                  variant="secondary"
                  onPress={() => switchMode("recover")}
                >
                  Forgot password?
                </GameButton>
              </>
            )}
            {sentTo && (
              <>
                <Text style={s.label}>Verification code sent to {sentTo}</Text>
                <TextInput
                  style={s.input}
                  accessibilityLabel="Verification code"
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  maxLength={10}
                />
                <GameButton
                  variant="secondary"
                  disabled={pending}
                  onPress={() => void resend()}
                >
                  Resend code
                </GameButton>
                <GameButton
                  variant="secondary"
                  disabled={pending}
                  onPress={() => {
                    setSentTo(null);
                    setCode("");
                  }}
                >
                  Change email
                </GameButton>
              </>
            )}
            <Feedback
              error={
                !message.startsWith("Check your") &&
                !message.startsWith("A new code")
              }
              message={
                message ||
                error ||
                (!supabase
                  ? "Sign-in is unavailable. You can still explore campus."
                  : "")
              }
            />
            <GameButton
              disabled={!supabase}
              loading={pending}
              onPress={() => void submit()}
            >
              {mode === "login"
                ? "Sign in"
                : sentTo
                  ? "Verify code"
                  : "Send verification code"}
            </GameButton>
            <GameButton
              variant="secondary"
              disabled={pending}
              onPress={() => switchMode(mode === "login" ? "signup" : "login")}
            >
              {mode === "login"
                ? "Create a UF account"
                : "Already have an account? Sign in"}
            </GameButton>
          </>
        )}
        <GameButton variant="secondary" onPress={() => router.replace("/")}>
          Explore campus
        </GameButton>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

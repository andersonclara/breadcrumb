import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { normalizeUfEmail, palette } from "@breadcrumb/shared";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";

export default function LoginScreen() {
  const { session, loading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function sendCode() {
    const address = normalizeUfEmail(email);
    if (!address) { setMessage("Enter your @ufl.edu email address."); return; }
    if (!supabase) return;
    setPending(true);
    try {
      const { error: sendError } = await supabase.auth.signInWithOtp({ email: address });
      if (sendError) { setMessage("We couldn't send an email. Please wait a minute and try again."); return; }
      setSentTo(address); setMessage("Enter the sign-in code from your UF inbox.");
    } catch { setMessage("Could not connect. Check your internet connection and try again."); }
    finally { setPending(false); }
  }
  async function verifyCode() {
    if (!supabase || !sentTo) return;
    if (!/^\d{6,10}$/.test(code.trim())) { setMessage("Enter the full numeric code from your email."); return; }
    setPending(true);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({ email: sentTo, token: code.trim(), type: "email" });
      setMessage(verifyError ? "That code is invalid or expired. Try again or request a new one." : "You're signed in.");
    } catch { setMessage("Could not connect. Check your internet connection and try again."); }
    finally { setPending(false); }
  }
  async function signOut() {
    if (!supabase) return;
    setPending(true);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) setMessage("Could not sign out. Please try again.");
      else { setSentTo(null); setCode(""); setMessage(""); }
    } catch { setMessage("Could not sign out. Please try again."); }
    finally { setPending(false); }
  }
  if (loading) return <View style={styles.loading}><ActivityIndicator color={palette.crust} accessibilityLabel="Restoring your session" /></View>;
  return <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>FOR THE GATOR COMMUNITY</Text>
      <Text style={styles.title}>{session ? "You're part of the loaf." : "A little local knowledge goes a long way."}</Text>
      <Text style={styles.description}>{session ? "Your UF account is signed in on this device." : "Browse freely. Sign in with your UF email to join the community."}</Text>
      {!session && <>
        <Text style={styles.label}>UF email address</Text>
        <TextInput accessibilityLabel="UF email address" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" placeholder="you@ufl.edu" placeholderTextColor="#8B7B6E" editable={!pending && Boolean(supabase) && !sentTo} style={styles.input} />
        {sentTo && <>
          <Text style={styles.label}>Sign-in code</Text>
          <TextInput accessibilityLabel="Sign-in code" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={10} editable={!pending} style={styles.input} />
        </>}
        <Pressable accessibilityRole="button" disabled={pending || !supabase} onPress={sentTo ? verifyCode : sendCode} style={[styles.button, (pending || !supabase) && styles.disabled]}>
          <Text style={styles.buttonText}>{pending ? "Please wait…" : sentTo ? "Verify code" : "Email me a sign-in code"}</Text>
        </Pressable>
        {sentTo && <Pressable accessibilityRole="button" disabled={pending} onPress={() => { setSentTo(null); setCode(""); setMessage(""); }}><Text style={styles.link}>Request a new code or change email</Text></Pressable>}
      </>}
      {session && <Pressable accessibilityRole="button" disabled={pending} onPress={signOut} style={styles.button}><Text style={styles.buttonText}>Sign out</Text></Pressable>}
      <Text accessibilityLiveRegion="polite" style={styles.message}>{message || error || (!supabase ? "Sign-in will be available once Supabase is connected." : "")}</Text>
    </ScrollView>
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.cream },
  loading: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: palette.cream },
  content: { padding: 28, paddingTop: 44, gap: 16, flexGrow: 1 },
  eyebrow: { color: palette.crust, fontSize: 10, letterSpacing: 2, fontWeight: "700" },
  title: { color: palette.crust, fontSize: 34, fontWeight: "700", lineHeight: 40 },
  description: { color: palette.crust, fontSize: 15, lineHeight: 25, marginBottom: 12 },
  label: { color: palette.crust, fontSize: 13, fontWeight: "700" },
  input: { backgroundColor: "#FFFAF1", color: palette.crust, borderWidth: 1, borderColor: "#774D3540", borderRadius: 14, padding: 16, fontSize: 16 },
  button: { backgroundColor: palette.crust, borderRadius: 28, padding: 17, alignItems: "center", minHeight: 50 },
  buttonText: { color: "#FFFAF1", fontWeight: "700", fontSize: 14 },
  disabled: { opacity: 0.5 },
  link: { color: palette.crust, textDecorationLine: "underline", paddingVertical: 10 },
  message: { color: palette.crust, fontSize: 13, lineHeight: 22 },
});

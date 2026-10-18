import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { signupPasswordError, type AvatarConfig } from "@breadcrumb/shared";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";
import { useCampus } from "@/providers/world-provider";
import { AvatarWorkshop } from "./avatar-workshop";
import { AvatarStage } from "./avatar-stage";
import { GameButton, Feedback, gameStyles as s } from "./game-ui";
export function ProfileEditor({
  initialUsername,
  initialAvatar,
  userId,
  passwordManagedByAuth0=false,
  email,
  onSaved,
}: {
  initialUsername: string;
  initialAvatar: AvatarConfig;
  userId: string;
  passwordManagedByAuth0?: boolean;
  email?: string;
  onSaved: (onboarding: boolean) => void;
}) {
  const { act } = useCampus();
  const [username, setUsername] = useState(initialUsername),
    [avatar, setAvatar] = useState(initialAvatar),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [complete, setComplete] = useState(false),
    [ready, setReady] = useState(false),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState(""),
    [customize, setCustomize] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase
      .from("profiles")
      .select("account_completed")
      .eq("id", userId)
      .single()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setMessage("Could not load your account. Please retry.");
          return;
        }
        setComplete(!!data.account_completed);
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, [userId, retry]);
  async function save() {
    if (!supabase || pending) return;
    const chosen = username.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9_.-]{2,29}$/.test(chosen)) {
      setMessage("Use 3 to 30 letters, numbers, dots, underscores, or hyphens.");
      return;
    }
    if (!passwordManagedByAuth0 && (!complete || password || confirm)) {
      const error = signupPasswordError(password, confirm);
      if (error) {
        setMessage(error);
        return;
      }
    }
    setPending(true);
    setMessage("");
    try {
      if (!passwordManagedByAuth0 && password) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error && error.code !== "same_password")
          throw new Error(
            "Could not set your password. Choose a stronger password or sign in again.",
          );
      }
      if (!complete || chosen !== initialUsername) {
        const { error } = await supabase.rpc("complete_account", {
          p_username: chosen,
        });
        if (error)
          throw new Error(
            error.code === "P0001"
              ? error.message
              : "Could not save your username. Please retry.",
          );
      }
      await act("avatar", avatar);
      setPassword("");
      setConfirm("");
      onSaved(!complete);
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Could not save your profile.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <View style={{ gap: 16 }}>
      <Text style={s.title}>
        {complete ? "Make it yours." : "Finish your campus account."}
      </Text>
      <Text style={s.label}>Username</Text>
      <TextInput
        style={s.input}
        accessibilityLabel="Your username"
        value={username}
        onChangeText={setUsername}
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={30}
      />
      <Text style={s.muted}>
        3 to 30 characters. This is how friends recognize you.
      </Text>
      {!passwordManagedByAuth0&&<><Text style={s.label}>
        {complete ? "New password (optional)" : "Create a password"}
      </Text>
      <TextInput
        style={s.input}
        accessibilityLabel="New password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={128}
      />
      <Text style={s.label}>Confirm password</Text>
      <TextInput
        style={s.input}
        accessibilityLabel="Confirm password"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        autoComplete="new-password"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={128}
      />
      </>}
      {passwordManagedByAuth0&&<GameButton variant="secondary" disabled={pending||!email} onPress={()=>{
        setPending(true);setMessage("");
        void apiFetch("/api/auth/reset-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email})})
          .then(async response=>{const data=await response.json();setMessage(data.message??data.error??"Could not send a password reset.");})
          .catch(()=>setMessage("Could not connect. Please retry."))
          .finally(()=>setPending(false));
      }}>Email a password reset link</GameButton>}
      <Text style={s.label}>Your avatar</Text>
      {customize ? (
        <AvatarWorkshop initial={avatar} hideSave onChange={setAvatar} />
      ) : (
        <View style={{ gap: 12 }}>
          <AvatarStage avatar={avatar} />
          <Text style={s.muted}>
            This avatar is ready to use. You can customize it later.
          </Text>
        </View>
      )}
      <GameButton variant="secondary" onPress={() => setCustomize(!customize)}>
        {customize ? "Done customizing" : "Customize avatar"}
      </GameButton>
      <Feedback error message={message} />
      {!ready && !!message && (
        <GameButton variant="secondary" onPress={() => setRetry((n) => n + 1)}>
          Retry account
        </GameButton>
      )}
      <GameButton
        loading={pending}
        disabled={!ready}
        onPress={() => void save()}
      >
        Save and continue
      </GameButton>
    </View>
  );
}

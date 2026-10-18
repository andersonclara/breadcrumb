import { normalizeUfEmail } from "@breadcrumb/shared";
import { useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { useAuth } from "@/providers/auth-provider";
import { useCampus } from "@/providers/world-provider";
import { useExplore } from "@/providers/explore-provider";
import { supabase } from "@/lib/supabase";
import { ProfileEditor } from "@/components/profile-editor";
import { PixelAvatar } from "@/components/pixel-art";
import {
  GameButton,
  Feedback,
  EmptyState,
  gameStyles as s,
} from "@/components/game-ui";
export default function ProfileScreen() {
  const { session, loading } = useAuth(),
    c = useCampus(),
    e = useExplore(),
    params = useLocalSearchParams<{ edit?: string }>(),
    [editing, setEditing] = useState(false),
    [changing, setChanging] = useState(false),
    [signingOut, setSigningOut] = useState(false),
    [signOutError, setSignOutError] = useState("");
  const signOutLock = useRef(false);
  async function signOut() {
    if (signOutLock.current) return;
    signOutLock.current = true;
    setSigningOut(true);
    setSignOutError("");
    try {
      if (!supabase) throw new Error("Sign-out is unavailable. Please try again.");
      await c.stop();
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw new Error("Could not log out. Please try again.");
      router.replace("/login");
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : "Could not log out. Please try again.");
    } finally {
      signOutLock.current = false;
      setSigningOut(false);
    }
  }
  if (loading)
    return (
      <View style={s.page}>
        <ActivityIndicator />
      </View>
    );
  const signedIn =
    !!session &&
    !!normalizeUfEmail(session.user.email) &&
    !!session.user.email_confirmed_at;
  return (
    <KeyboardAvoidingView
      style={s.page}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
      >
        {!signedIn ? (
          <>
            <EmptyState
              title="Your campus starts here."
              description="Sign in with your UF account to post, add friends, and join communities."
              action="Sign in or create account"
              onAction={() => router.push("/login")}
            />
            <GameButton
              variant="secondary"
              onPress={() => router.push("/saved")}
            >
              Saved discoveries
            </GameButton>
            <GameButton
              variant="secondary"
              onPress={() => router.push("/communities")}
            >
              Browse communities
            </GameButton>
          </>
        ) : !c.world.profile ? (
          c.loading || c.refreshing ? <View style={[s.row, { paddingVertical: 24 }]}>
            <ActivityIndicator/>
            <Text accessibilityLiveRegion="polite" style={s.body}>Loading your profile...</Text>
          </View> : <>
            <Text style={s.body}>
              Your profile could not load.
            </Text>
            <Feedback error message={c.error} />
            <GameButton variant="secondary" onPress={() => void c.refresh()}>
              Retry profile
            </GameButton>
          </>
        ) : editing ||
          params.edit === "1" ||
          !c.world.profile.avatar_completed ? (
          <ProfileEditor
            initialUsername={c.world.profile.handle}
            initialAvatar={c.world.profile.avatar}
            userId={session!.user.id}
            passwordManagedByAuth0={!!session!.user.app_metadata?.auth0_sub}
            email={session!.user.email}
            onSaved={() => {
              setEditing(false);
              router.replace(e.resumePost ? "/" : "/profile");
            }}
          />
        ) : (
          <>
            <View style={[s.row, { paddingVertical: 8 }]}>
              <PixelAvatar avatar={c.world.profile.avatar} size={48} />
              <View style={{ flex: 1, gap: 8 }}>
                <Text style={s.title}>{c.world.profile.handle}</Text>
                <Text style={s.muted}>Your campus self</Text>
              </View>
            </View>
            <GameButton variant="secondary" onPress={() => setEditing(true)}>
              Edit profile, avatar and password
            </GameButton>
            <GameButton
              variant="secondary"
              onPress={() => router.push("/saved")}
            >
              Saved discoveries
            </GameButton>
            <GameButton
              variant="secondary"
              onPress={() => router.push("/friends")}
            >
              Friends and requests
            </GameButton>
            <GameButton
              variant="secondary"
              onPress={() => router.push("/communities")}
            >
              Your communities
            </GameButton>
            <View style={s.card}>
              <Text style={s.label}>Location sharing</Text>
              <Text style={s.body}>
                Only accepted friends see your approximate location, rounded to
                about 100 metres. Sharing stops when the app leaves the
                foreground.
              </Text>
              <View style={s.row}>
                <Switch
                  disabled={changing || signingOut}
                  accessibilityLabel="Share approximate location with accepted friends"
                  value={c.sharing}
                  onValueChange={(enabled) => {
                    setChanging(true);
                    void (enabled ? c.share() : c.stop())
                      .catch(() => {})
                      .finally(() => setChanging(false));
                  }}
                />
                <Text style={[s.label, { flex: 1 }]}>
                  {c.sharing ? "Visible to friends" : "Location private"}
                </Text>
              </View>
            </View>
            <Feedback message={c.notice} />
            <Feedback error message={c.actionError || c.error} />
          </>
        )}
        {signedIn && <>
          <GameButton variant="danger" loading={signingOut} disabled={changing}
            onPress={() => void signOut()}>
            {signingOut ? "Logging out..." : "Log out"}
          </GameButton>
          <Feedback error message={signOutError} />
        </>}
        <GameButton variant="secondary" onPress={() => router.navigate("/")}>
          Back to Explore
        </GameButton>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

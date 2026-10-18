import { useState } from "react";
import { router } from "expo-router";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import { useCampus } from "@/providers/world-provider";
import { PixelAvatar } from "@/components/pixel-art";
import { Sheet } from "@/components/sheet";
import {
  GameButton,
  Feedback,
  EmptyState,
  gameStyles as s,
} from "@/components/game-ui";
export default function FriendsScreen() {
  const c = useCampus(),
    [code, setCode] = useState(""),
    [remove, setRemove] = useState<string | null>(null),
    [error, setError] = useState("");
  const request = (action: string, data: unknown) => {
    setError("");
    void c
      .act(action, data)
      .then(() => {
        if (action === "friend_request") setCode("");
      })
      .catch((e) => setError(e.message));
  };
  return (
    <KeyboardAvoidingView
      style={s.page}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
      >
        <Feedback error message={error || c.actionError || c.error} />
        <Feedback message={c.notice} />
        {!c.world.profile ? (
          <EmptyState
            title="Bring your campus crew."
            description="Sign in to add friends and manage your requests."
            action="Sign in"
            onAction={() => router.push("/login")}
          />
        ) : (
          <>
            <View style={s.card}>
              <Text style={s.label}>Your friend code</Text>
              <Text selectable style={[s.title, { letterSpacing: 2 }]}>
                {c.world.profile.friend_code}
              </Text>
              <Text style={s.muted}>Press and hold the code to copy it.</Text>
              <GameButton
                variant="secondary"
                onPress={() => {
                  void Share.share({
                    message:
                      "Add me on Breadcrumb: " + c.world.profile!.friend_code,
                  }).catch(() => setError("Could not share your code."));
                }}
              >
                Share code
              </GameButton>
            </View>
            <Text style={s.label}>Add a friend</Text>
            <TextInput
              style={s.input}
              value={code}
              onChangeText={(v) =>
                setCode(v.toUpperCase().replace(/[^A-F0-9]/g, ""))
              }
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={8}
              placeholder="8-character friend code"
              placeholderTextColor="#786451"
              accessibilityLabel="Friend code"
            />
            <GameButton
              loading={c.isPending("friend_request")}
              disabled={code.length !== 8}
              onPress={() => request("friend_request", { code })}
            >
              Send friend request
            </GameButton>
            <Text style={s.title}>Requests</Text>
            {!c.world.friends.some((f) => !f.accepted) && (
              <Text style={s.muted}>No pending requests.</Text>
            )}
            {c.world.friends
              .filter((f) => !f.accepted)
              .map((f) => (
                <View key={f.id} style={s.card}>
                  <View style={s.row}>
                    <PixelAvatar avatar={f.avatar} size={28} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.label}>{f.handle}</Text>
                      <Text style={s.muted}>
                        {f.incoming
                          ? "Wants to be your friend"
                          : "Request sent"}
                      </Text>
                    </View>
                  </View>
                  {f.incoming && (
                    <GameButton
                      loading={c.isPending("friend_accept", f.id)}
                      onPress={() => request("friend_accept", { id: f.id })}
                    >
                      Accept request
                    </GameButton>
                  )}
                  <GameButton
                    variant="secondary"
                    onPress={() => request("friend_remove", { id: f.id })}
                  >
                    {f.incoming ? "Decline" : "Cancel request"}
                  </GameButton>
                </View>
              ))}
            <Text style={s.title}>Your friends</Text>
            {!c.world.friends.some((f) => f.accepted) && (
              <Text style={s.muted}>
                Share your code to add your first friend.
              </Text>
            )}
            {c.world.friends
              .filter((f) => f.accepted)
              .map((f) => (
                <View key={f.id} style={s.card}>
                  <View style={s.row}>
                    <PixelAvatar avatar={f.avatar} size={32} />
                    <Text style={[s.label, { flex: 1 }]}>{f.handle}</Text>
                  </View>
                  <GameButton
                    variant="secondary"
                    onPress={() => setRemove(f.id)}
                  >
                    Remove friend?
                  </GameButton>
                </View>
              ))}
            <GameButton
              variant="secondary"
              onPress={() => router.push("/profile")}
            >
              Manage location sharing
            </GameButton>
          </>
        )}
      </ScrollView>
      <Sheet
        visible={!!remove}
        title="Remove friend?"
        onClose={() => setRemove(null)}
      >
        <Text style={s.body}>
          You will stop sharing your approximate location with each other.
        </Text>
        <GameButton
          variant="danger"
          loading={c.isPending("friend_remove", remove ?? undefined)}
          onPress={() => {
            if (remove)
              void c
                .act("friend_remove", { id: remove })
                .then(() => setRemove(null))
                .catch((e) => setError(e.message));
          }}
        >
          Remove friend
        </GameButton>
        <GameButton variant="secondary" onPress={() => setRemove(null)}>
          Keep friend
        </GameButton>
        <Feedback error message={error} />
      </Sheet>
    </KeyboardAvoidingView>
  );
}

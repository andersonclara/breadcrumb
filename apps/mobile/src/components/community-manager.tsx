import { useState } from "react";
import { router } from "expo-router";
import { Pressable, Text, TextInput, View } from "react-native";
import { communities } from "@breadcrumb/shared";
import { useCampus } from "@/providers/world-provider";
import { GameButton, Feedback, gameStyles as s } from "./game-ui";
const colors = [
  { name: "Berry", hex: "#BD4B83" },
  { name: "Forest", hex: "#307D69" },
  { name: "Lake", hex: "#3B7FAD" },
  { name: "Violet", hex: "#7454B3" },
  { name: "Toast", hex: "#D78636" },
];
export function CommunityManager() {
  const c = useCampus(),
    [name, setName] = useState(""),
    [description, setDescription] = useState(""),
    [accent, setAccent] = useState(colors[0].hex),
    [creating, setCreating] = useState(false),
    [error, setError] = useState("");
  const directory =
    c.world.communities ??
    communities.map((v) => ({
      ...v,
      joined: v.id === "campus",
      featured: true,
      created_by: null,
    }));
  return (
    <View style={{ gap: 16 }}>
      <Text style={s.body}>
        Choose who you discover and share with. Joining a community never shares
        your location.
      </Text>
      <Feedback error message={error || c.actionError || c.error} />
      <Feedback message={c.notice} />
      {directory.map((group) => (
        <View
          key={group.id}
          style={[
            s.card,
            { borderLeftWidth: 4, borderLeftColor: group.accent },
          ]}
        >
          <Text style={s.title}>{group.name}</Text>
          <Text style={s.body}>{group.description}</Text>
          {group.id === "girls" && (
            <Text style={s.muted}>Membership is self-selected.</Text>
          )}
          {group.id === "campus" ? (
            <Text style={s.muted}>
              Public campus discoveries ? always available
            </Text>
          ) : (
            <GameButton
              loading={c.isPending(
                group.joined ? "community_leave" : "community_join",
                group.id,
              )}
              variant={group.joined ? "secondary" : "primary"}
              onPress={() => {
                if (!c.world.profile) {
                  router.push("/login");
                  return;
                }
                void c
                  .act(group.joined ? "community_leave" : "community_join", {
                    community_id: group.id,
                  })
                  .catch(() => {});
              }}
            >
              {group.joined
                ? "Leave community"
                : c.world.profile
                  ? "Join community"
                  : "Sign in to join"}
            </GameButton>
          )}
        </View>
      ))}
      {c.world.profile && (
        <>
          <GameButton
            variant="secondary"
            onPress={() => setCreating(!creating)}
          >
            {creating ? "Cancel creation" : "Start a community"}
          </GameButton>
          {creating && (
            <View style={s.card}>
              <Text style={s.label}>Community name</Text>
              <TextInput
                style={s.input}
                accessibilityLabel="Community name"
                value={name}
                onChangeText={setName}
                maxLength={48}
              />
              <Text style={s.label}>Description</Text>
              <TextInput
                style={s.input}
                accessibilityLabel="Community description"
                value={description}
                onChangeText={setDescription}
                maxLength={280}
                multiline
              />
              <Text style={s.label}>Accent colour</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {colors.map((v) => (
                  <Pressable
                    key={v.hex}
                    accessibilityRole="button"
                    accessibilityLabel={v.name + " accent"}
                    accessibilityState={{ selected: accent === v.hex }}
                    onPress={() => setAccent(v.hex)}
                    style={{
                      minWidth: 48,
                      minHeight: 48,
                      borderRadius: 12,
                      backgroundColor: v.hex,
                      borderWidth: accent === v.hex ? 4 : 1,
                      borderColor: "#49382C",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: "#FFF", fontSize: 20 }}>
                      {accent === v.hex ? "?" : ""}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <GameButton
                disabled={name.trim().length < 3}
                loading={c.isPending("community_create")}
                onPress={() => {
                  setError("");
                  void c
                    .act("community_create", { name, description, accent })
                    .then(() => {
                      setName("");
                      setDescription("");
                      setCreating(false);
                    })
                    .catch((e) => setError(e.message));
                }}
              >
                Create community
              </GameButton>
            </View>
          )}
        </>
      )}
    </View>
  );
}

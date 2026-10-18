import { useState } from "react";
import { Text, View } from "react-native";
import { avatarOptions, type AvatarConfig } from "@breadcrumb/shared";
import { useCampus } from "@/providers/world-provider";
import { PixelAvatar } from "./pixel-art";
import { Chip, GameButton, Feedback, gameStyles as s } from "./game-ui";
export function AvatarWorkshop({
  initial,
  signedIn = true,
  onSaved,
  onChange,
  hideSave = false,
}: {
  initial: AvatarConfig;
  signedIn?: boolean;
  onSaved?: () => void;
  onChange?: (avatar: AvatarConfig) => void;
  hideSave?: boolean;
}) {
  const [avatar, setAvatar] = useState(initial),
    [key, setKey] = useState<keyof AvatarConfig>("hairstyle"),
    [error, setError] = useState(""),
    c = useCampus();
  const labels: Record<keyof AvatarConfig, string> = {
    skin: "Skin tone",
    hair: "Hair colour",
    hairstyle: "Hair style",
    shirt: "Top colour",
    top: "Top style",
    pants: "Bottoms",
    accessory: "Accessory",
  };
  function cycle(delta: number) {
    const next = {
      ...avatar,
      [key]:
        (avatar[key] + delta + avatarOptions[key].length) %
        avatarOptions[key].length,
    };
    setAvatar(next);
    onChange?.(next);
  }
  const value = avatarOptions[key][avatar[key]],
    color = value.startsWith("#");
  return (
    <View style={{ gap: 16 }}>
      <View
        style={[s.card, { alignItems: "center", backgroundColor: "#E8EEDC" }]}
      >
        <PixelAvatar avatar={avatar} size={64} />
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {(Object.keys(labels) as (keyof AvatarConfig)[]).map((k) => (
          <Chip
            key={k}
            label={labels[k]}
            selected={key === k}
            onPress={() => setKey(k)}
          />
        ))}
      </View>
      <Text style={s.label}>
        {labels[key]} · {avatar[key] + 1} of {avatarOptions[key].length}
      </Text>
      <View style={[s.row, { justifyContent: "center" }]}>
        {color && (
          <View
            accessible
            accessibilityLabel={
              "Selected " + labels[key] + ", shade " + (avatar[key] + 1)
            }
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: value,
              borderWidth: 1,
              borderColor: "#49382C",
            }}
          />
        )}
        <Text style={s.body}>
          {color ? "Shade " + (avatar[key] + 1) : value}
        </Text>
      </View>
      <View style={s.row}>
        <GameButton
          variant="secondary"
          style={{ flex: 1 }}
          onPress={() => cycle(-1)}
        >
          Previous
        </GameButton>
        <GameButton
          variant="secondary"
          style={{ flex: 1 }}
          onPress={() => cycle(1)}
        >
          Next
        </GameButton>
      </View>
      <Feedback error message={error} />
      {!hideSave && (
        <GameButton
          loading={c.isPending("avatar")}
          disabled={!signedIn}
          onPress={() => {
            void c
              .act("avatar", avatar)
              .then(() => onSaved?.())
              .catch((e) => setError(e.message));
          }}
        >
          Save avatar
        </GameButton>
      )}
    </View>
  );
}

import { Pressable, Text } from "react-native";
import { PixelBread } from "./pixel-art";
import { gameStyles as s } from "./game-ui";
export function ToastCrumbButton({ onPick }: { onPick: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Post a Crumb"
      onPress={onPick}
      style={({ pressed }) => [s.button, { opacity: pressed ? 0.7 : 1 }]}
    >
      <PixelBread size={28} />
      <Text style={s.buttonText}>Post a Crumb</Text>
    </Pressable>
  );
}

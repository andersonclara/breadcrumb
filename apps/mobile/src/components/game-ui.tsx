import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import type { PropsWithChildren } from "react";
import { theme as t } from "@/lib/theme";
export const gameStyles = StyleSheet.create({
  page: { flex: 1, backgroundColor: t.background },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
  },
  title: { fontSize: 24, lineHeight: 30, fontWeight: "700", color: t.ink },
  body: { fontSize: 16, lineHeight: 24, color: t.ink },
  label: { fontSize: 14, lineHeight: 20, fontWeight: "600", color: t.ink },
  input: {
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 12,
    padding: 14,
    minHeight: 52,
    color: t.ink,
    fontSize: 16,
  },
  button: {
    borderRadius: 12,
    backgroundColor: t.toast,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
    color: t.ink,
    textAlign: "center",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  error: {
    fontSize: 14,
    lineHeight: 21,
    color: t.danger,
    padding: 12,
    backgroundColor: "#FCEAE1",
    borderRadius: 12,
  },
  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 16,
    backgroundColor: t.surface,
    gap: 8,
  },
  muted: { fontSize: 14, lineHeight: 20, color: t.muted },
});
export function GameButton({
  children,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
  style,
}: {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger";
  style?: StyleProp<ViewStyle>;
} & PropsWithChildren) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        gameStyles.button,
        variant !== "primary" && {
          backgroundColor: variant === "danger" ? "#FCEAE1" : t.sage,
        },
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.7 },
        style,
      ]}
    >
      {loading && <ActivityIndicator color={t.ink} />}
      <Text
        style={[
          gameStyles.buttonText,
          variant === "danger" && { color: t.danger },
        ]}
      >
        {children}
      </Text>
    </Pressable>
  );
}
export function Feedback({
  message,
  error = false,
}: {
  message?: string | null;
  error?: boolean;
}) {
  return message ? (
    <Text
      accessibilityRole={error ? "alert" : undefined}
      accessibilityLiveRegion="polite"
      style={
        error
          ? gameStyles.error
          : [
              gameStyles.muted,
              { padding: 12, backgroundColor: t.sage, borderRadius: 12 },
            ]
      }
    >
      {message}
    </Text>
  ) : null;
}
export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: selected ? t.ink : t.border,
        backgroundColor: selected ? t.ink : t.surface,
        opacity: pressed ? 0.7 : 1,
        justifyContent: "center",
      })}
    >
      <Text
        style={{
          fontSize: 14,
          fontWeight: "600",
          color: selected ? t.surface : t.ink,
        }}
      >
        {selected ? "✓ " : ""}
        {label}
      </Text>
    </Pressable>
  );
}
export function EmptyState({
  title,
  description,
  action,
  onAction,
}: {
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={{ gap: 12, paddingVertical: 16 }}>
      <Text style={gameStyles.title}>{title}</Text>
      <Text style={gameStyles.muted}>{description}</Text>
      {action && onAction && (
        <GameButton variant="secondary" onPress={onAction}>
          {action}
        </GameButton>
      )}
    </View>
  );
}

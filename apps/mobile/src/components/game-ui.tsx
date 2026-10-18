import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useMemo, type PropsWithChildren, type ReactNode } from "react";
import { theme, type Theme } from "@/lib/theme";
import { PixelFrame } from "./pixel-frame";
import { PixelIcon } from "./pixel-art";
import { usePixelTheme, useTheme } from "@/lib/theme-context";
const createGameStyles = (t: Theme, pixel = false) => StyleSheet.create({
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
    borderRadius: pixel ? 8 : 12,
    borderWidth: pixel ? 2 : 1,
    borderColor: t.border,
    borderRightWidth: pixel ? 3 : 1,
    borderBottomWidth: pixel ? 3 : 1,
    padding: 14,
    minHeight: 52,
    color: t.ink,
    fontFamily: pixel ? "PressStart2P_400Regular" : undefined,
    fontSize: pixel ? 11 : 16,
    lineHeight: 22,
  },
  button: {
    borderRadius: pixel ? 0 : 12,
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
    fontFamily: pixel ? "PressStart2P_400Regular" : undefined,
    fontSize: pixel ? 11 : 16,
    lineHeight: pixel ? 20 : 22,
    fontWeight: pixel ? "400" : "600",
    color: t.buttonInk,
    textAlign: "center",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  error: {
    fontSize: 14,
    lineHeight: 21,
    color: t.danger,
    padding: 12,
    backgroundColor: t.dangerSurface,
    borderRadius: 12,
  },
  card: {
    padding: 16,
    borderRadius: pixel ? 8 : 16,
    borderColor: t.border,
    backgroundColor: t.surface,
    borderWidth: pixel ? 2 : 1,
    borderRightWidth: pixel ? 3 : 1,
    borderBottomWidth: pixel ? 3 : 1,
    gap: 8,
  },
  muted: { fontSize: 14, lineHeight: 20, color: t.muted },
});
export const gameStyles = createGameStyles(theme);
export function useGameStyles() {
  const t = useTheme(), pixel = usePixelTheme();
  return useMemo(() => t === theme && !pixel ? gameStyles : createGameStyles(t, pixel), [t, pixel]);
}
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
  const t = useTheme(), pixel = usePixelTheme(), gameStyles = useGameStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        gameStyles.button,
        variant !== "primary" && { backgroundColor: variant === "danger" ? t.dangerSurface : t.sage },
        pixel && { backgroundColor: "transparent" },
        (disabled || loading) && { opacity: 0.5 },
        pressed && { opacity: 0.7 },
        style,
      ]}
    >
      {pixel && <PixelFrame fill={variant === "primary" ? t.toast : variant === "danger" ? t.dangerSurface : t.sage} accent={variant === "primary"} />}
      {loading && <ActivityIndicator color={variant === "primary" ? t.buttonInk : t.ink} />}
      <Text
        style={[
          gameStyles.buttonText,
          variant === "secondary" && { color: t.ink },
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
  const t = useTheme(), gameStyles = useGameStyles();
  if (message && error)
    return (
      <View style={[gameStyles.error, { flexDirection: "row", alignItems: "center", gap: 10 }]}>
        <PixelIcon name="warning" size={20} />
        <Text accessibilityRole="alert" accessibilityLiveRegion="polite"
          style={[gameStyles.error, { flex: 1, padding: 0, backgroundColor: "transparent" }]}>
          {message}
        </Text>
      </View>
    );
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
  icon,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: ReactNode;
}) {
  const t = useTheme(), pixel = usePixelTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: pixel ? 8 : 24,
        borderWidth: 1,
        borderColor: selected ? t.ink : t.border,
        backgroundColor: selected ? t.ink : t.surface,
        opacity: pressed ? 0.7 : 1,
        justifyContent: "center",
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
      })}
    >
      {icon}
      <Text
        style={{
          fontFamily: pixel ? "PressStart2P_400Regular" : undefined,
          fontSize: pixel ? 10 : 14,
          lineHeight: pixel ? 18 : 20,
          fontWeight: pixel ? "400" : "600",
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
  const s = useGameStyles();
  return (
    <View style={{ gap: 12, paddingVertical: 16 }}>
      <Text style={s.title}>{title}</Text>
      <Text style={s.muted}>{description}</Text>
      {action && onAction && (
        <GameButton variant="secondary" onPress={onAction}>
          {action}
        </GameButton>
      )}
    </View>
  );
}

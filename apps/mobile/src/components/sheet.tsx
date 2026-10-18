import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import {
  AccessibilityInfo,
  Animated,
  findNodeHandle,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "./icon";
import type { Theme } from "@/lib/theme";
import { usePixelTheme, useTheme } from "@/lib/theme-context";
import { useReducedMotion } from "@/lib/use-reduced-motion";
export function Sheet({
  visible,
  title,
  onClose,
  children,
  footer,
  scroll = true,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  footer?: React.ReactNode;
  scroll?: boolean;
} & PropsWithChildren) {
  const t = useTheme();
  const pixel = usePixelTheme();
  const styles = useMemo(() => createStyles(t, pixel), [t, pixel]);
  const insets = useSafeAreaInsets(),
    heading = useRef<Text>(null),
    [translation] = useState(() => new Animated.Value(0)),
    reduced = useReducedMotion();
  useEffect(() => {
    translation.setValue(0);
  }, [visible, title, translation]);
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => g.dy > 10 && Math.abs(g.dx) < 30,
        onPanResponderMove: (_, g) => translation.setValue(Math.max(0, g.dy)),
        onPanResponderRelease: (_, g) => {
          if (g.dy > 80) {
            onClose();
            translation.setValue(0);
          } else
            Animated.timing(translation, {
              toValue: 0,
              useNativeDriver: Platform.OS !== "web",
              duration: reduced ? 0 : 220,
            }).start();
        },
        onPanResponderTerminate: () => translation.setValue(0),
      }),
    [translation, onClose, reduced],
  );
  useEffect(() => {
    if (!visible || Platform.OS === "web") return;
    const timer = setTimeout(() => {
      const node = findNodeHandle(heading.current);
      if (node && Platform.OS !== "web")
        AccessibilityInfo.setAccessibilityFocus(node);
    }, 350);
    return () => clearTimeout(timer);
  }, [visible]);
  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduced ? "none" : "slide"}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.backdrop}
      >
        <Pressable
          accessible={false}
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <Animated.View
          accessibilityViewIsModal
          onAccessibilityEscape={onClose}
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, 16),
              maxHeight: "92%",
              transform: [{ translateY: translation }],
            },
          ]}
        >
          <View {...pan.panHandlers}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <Text
                ref={heading}
                accessibilityRole="header"
                style={styles.title}
              >
                {title}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={"Close " + title}
                onPress={onClose}
                style={({ pressed }) => [
                  styles.close,
                  pressed && { opacity: 0.5 },
                ]}
              >
                <Icon name="close" />
              </Pressable>
            </View>
          </View>
          {scroll ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.content}
            >
              {children}
            </ScrollView>
          ) : (
            children
          )}
          {footer && <View style={styles.footer}>{footer}</View>}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const createStyles = (t: Theme, pixel: boolean) => StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: t.backdrop,
  },
  sheet: {
    backgroundColor: t.surface,
    borderTopLeftRadius: pixel ? 12 : 24,
    borderTopRightRadius: pixel ? 12 : 24,
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    borderWidth: pixel ? 2 : 0,
    borderColor: pixel ? t.border : "transparent",
    borderBottomWidth: 0,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: t.border,
    alignSelf: "center",
    marginTop: 10,
  },
  header: {
    paddingLeft: 16,
    paddingRight: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "700",
    color: t.ink,
  },
  close: {
    minWidth: 48,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { padding: 16, gap: 16 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: t.border,
    gap: 8,
  },
});

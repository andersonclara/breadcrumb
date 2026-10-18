import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { router } from "expo-router";
import * as Location from "expo-location";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  inCampus,
  mappable,
  discoveryKey,
  resolveDiscoveryLocation,
  roundedLocation,
  demoRemaining,
  isDemoRecord,
  type AskResult,
  type DiscoveryRecord,
} from "@breadcrumb/shared";
import { useExplore } from "@/providers/explore-provider";
import { apiFetch } from "@/lib/api";
import { DiscoveryRow } from "@/components/discovery-row";
import { DiscoveryDetail } from "@/components/discovery-detail";
import { Sheet } from "@/components/sheet";
import { ToastLogo } from "@/components/pixel-art";
import { GameButton, Feedback, gameStyles as s } from "@/components/game-ui";
import { theme as t } from "@/lib/theme";
import { DemoBanner } from "@/components/demo-banner";
const prompts = [
  "Free food now",
  "What’s on tonight?",
  "Events near Reitz this week",
];
export default function AskScreen() {
  const e = useExplore(),
    insets = useSafeAreaInsets(),
    scroll = useRef<ScrollView>(null),
    abort = useRef<AbortController | null>(null),
    busy = useRef(false);
  const [pending, setPending] = useState(false),
    [locationEnabled, setLocationEnabled] = useState(false),
    [locating, setLocating] = useState(false),
    [error, setError] = useState(""),
    [lastQuestion, setLastQuestion] = useState(""),
    [detail, setDetail] = useState<DiscoveryRecord | null>(null);
  useEffect(
    () => () => {
      abort.current?.abort();
    },
    [],
  );
  useLayoutEffect(() => () => abort.current?.abort(), [e.demoKey]);
  async function send(value = e.chatInput) {
    const question = value.trim();
    if (busy.current || !question) return;
    busy.current = true;
    setPending(true);
    setError("");
    setLastQuestion(question);
    e.setChatInput(question);
    const request = new AbortController();
    abort.current = request;
    try {
      let coarseUserLocation;
      if (locationEnabled) {
        const permission = await Location.getForegroundPermissionsAsync();
        if (permission.status !== "granted") {
          setLocationEnabled(false);
          throw new Error("Location access has ended. Choose a campus place or enable location again.");
        }
        const position = await Location.getCurrentPositionAsync({accuracy: Location.Accuracy.Balanced});
        coarseUserLocation = roundedLocation({latitude: position.coords.latitude, longitude: position.coords.longitude});
        if (!inCampus(coarseUserLocation)) throw new Error("Choose a UF campus place to search from your current location.");
      }
      const response = await apiFetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: request.signal,
        body: JSON.stringify({
          message: question,
          ...(e.context ? { context: e.context } : {}),
          ...(coarseUserLocation ? { coarseUserLocation } : {}),
          ...(e.demo ? { demo: e.demo } : {}),
        }),
      });
      const data = await response.json();
      if (request.signal.aborted) return;
      if (e.demo && !demoRemaining(e.demo))
        throw new Error('The demo has ended. Ask again to search live discoveries.');
      if (!response.ok)
        throw new Error(
          response.status === 429
            ? "You have reached the question limit. Please wait a minute and retry."
            : (data.error ?? "Could not find discoveries."),
        );
      if (
        !Array.isArray(data.cards) ||
        !data.context ||
        typeof data.answer !== "string"
      )
        throw new Error("The response could not be read. Please retry.");
      const result = {
        ...data,
        cards: data.cards.map(resolveDiscoveryLocation),
      } as AskResult;
      e.setTurns((turns) => [
        ...turns,
        { id: Date.now().toString(), question, result, demoKey: e.demoKey },
      ]);
      e.setContext(result.context);
      e.setChatInput("");
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      if (!request.signal.aborted)
        setError(
          err instanceof Error
            ? err.message
            : "Could not connect. Please retry.",
        );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  function onMap(r: DiscoveryRecord) {
    e.setScope("campus");
    e.setQuery("");
    e.setCategory("all");
    e.selectRecord(r);
    router.navigate("/");
  }
  const latest = e.turns[e.turns.length - 1]?.result;
  const visibleDetail = detail && (!isDemoRecord(detail) || e.demo && e.demoRecords.some(r => r.id === detail.id)) ? detail : null;
  return (
    <KeyboardAvoidingView
      style={s.page}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 96 : 0}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <Text style={s.muted}>Public campus discoveries</Text>
        <Pressable
          accessibilityRole="button"
          disabled={pending || locating}
          onPress={() => {
            e.setTurns([]);
            e.setContext(undefined);
            e.setChatInput("");
            e.setChatScroll(0);
            setLocationEnabled(false);
            setError("");
          }}
          style={{ minHeight: 48, justifyContent: "center", padding: 8 }}
        >
          <Text style={s.label}>New chat</Text>
        </Pressable>
      </View>
      {e.demo && <View style={{ marginHorizontal: 16, marginVertical: 8 }}><DemoBanner /></View>}
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[s.content, { paddingBottom: 24 }]}
        onScroll={(event) => e.setChatScroll(event.nativeEvent.contentOffset.y)}
        scrollEventThrottle={150}
        onLayout={() => {
          if (e.chatScroll)
            scroll.current?.scrollTo({ y: e.chatScroll, animated: false });
        }}
      >
        {!e.turns.length && (
          <View style={{ paddingVertical: 24, gap: 20 }}>
            <ToastLogo size={52} />
            <Text style={[s.title, { fontSize: 30, lineHeight: 37 }]}>
              A little help finding{"\n"}your next thing.
            </Text>
            <Text style={s.body}>
              Ask about free food, campus events, or a place you know.
            </Text>
            {prompts.map((q) => (
              <GameButton
                key={q}
                variant="secondary"
                disabled={pending}
                onPress={() => void send(q)}
              >
                {q}
              </GameButton>
            ))}
          </View>
        )}
        {e.turns.map((turn) => (
          <View key={turn.id} style={{ gap: 14, marginBottom: 16 }}>
            <View
              style={{
                padding: 16,
                borderRadius: 16,
                backgroundColor: t.sage,
                alignSelf: "flex-end",
                maxWidth: "90%",
              }}
            >
              <Text style={s.body}>{turn.question}</Text>
            </View>
            <Text style={s.body}>{turn.result.answer}</Text>
            {turn.result.cards.map((r, index) => (
              <View key={discoveryKey(r)} style={{ gap: 8 }}>
                <Text style={s.label}>Option {index + 1}</Text>
                <DiscoveryRow record={r} onPress={() => setDetail(r)} />
                {mappable(r) &&
                  inCampus({
                    latitude: r.latitude!,
                    longitude: r.longitude!,
                  }) && (
                    <GameButton variant="secondary" onPress={() => onMap(r)}>
                      View on map
                    </GameButton>
                  )}
              </View>
            ))}
            <Text style={s.muted}>{turn.result.dataFreshnessNote}</Text>
          </View>
        ))}
        {latest && !pending && (
          <View style={{ gap: 8 }}>
            <Text style={s.label}>Keep exploring</Text>
            {latest.suggestedFollowUps.map((q) => (
              <GameButton
                key={q}
                variant="secondary"
                onPress={() => void send(q)}
              >
                {q}
              </GameButton>
            ))}
          </View>
        )}
        {pending && (
          <View accessibilityLiveRegion="polite" style={s.row}>
            <ActivityIndicator color={t.ink} />
            <Text style={s.body}>Looking through campus discoveries…</Text>
          </View>
        )}
        <Feedback error message={error} />
        {!!error && (
          <GameButton
            variant="secondary"
            onPress={() => void send(lastQuestion)}
          >
            Retry question
          </GameButton>
        )}
      </ScrollView>
      <View
        style={{
          backgroundColor: t.surface,
          padding: 16,
          paddingBottom: Math.max(insets.bottom, 16),
          borderTopWidth: 1,
          borderColor: t.border,
          gap: 8,
        }}
      >
        {e.context && (
          <Text style={s.muted}>
            {e.context.constraints.time.period.replace(
              "next7days",
              "This week",
            )}
            {e.context.constraints.freeOnly ? " ? Free only" : ""}
            {e.context.constraints.nearPlace
              ? " ? Near " + e.context.constraints.nearPlace
              : ""}
          </Text>
        )}
        <Text style={s.label}>Ask Breadcrumb</Text>
        <GameButton variant="secondary" disabled={pending || locating} onPress={() => {
          if (locationEnabled) { setLocationEnabled(false); return; }
          setLocating(true);
          void Location.requestForegroundPermissionsAsync().then(permission => {
            if (permission.status === "granted") setLocationEnabled(true);
            else setError("Location was not enabled. Try a campus place like Reitz.");
          }).catch(() => setError("Could not enable location. Try a campus place like Reitz.")).finally(() => setLocating(false));
        }}>
          {locating ? "Enabling location…" : locationEnabled ? "Approximate location on · Remove" : "Use approximate location"}
        </GameButton>
        <TextInput
          accessibilityLabel="Ask Breadcrumb"
          style={[s.input, { maxHeight: 120 }]}
          multiline
          placeholder="What’s happening around campus?"
          placeholderTextColor={t.muted}
          value={e.chatInput}
          onChangeText={e.setChatInput}
          maxLength={1200}
          editable={!pending}
        />
        <GameButton
          loading={pending}
          disabled={!e.chatInput.trim()}
          onPress={() => void send()}
        >
          Find something
        </GameButton>
      </View>
      <Sheet
        visible={!!visibleDetail}
        title="Discovery"
        onClose={() => setDetail(null)}
      >
        {visibleDetail && (
          <DiscoveryDetail
            key={discoveryKey(visibleDetail)}
            record={visibleDetail}
            onClose={() => setDetail(null)}
          />
        )}
      </Sheet>
    </KeyboardAvoidingView>
  );
}

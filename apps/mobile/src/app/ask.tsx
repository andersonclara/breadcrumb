import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { router } from "expo-router";
import * as Location from "expo-location";
import {
  ActivityIndicator,
  AppState,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  inCampus,
  mappable,
  discoveryKey,
  resolveDiscoveryLocation,
  roundedLocation,
  isDemoRecord,
  ASK_TURN_LIMIT, askPrompts, askFilterLabels, discoveryMatch, askRecordAvailable,
  type DiscoveryRecord,
} from "@breadcrumb/shared";
import { useExplore } from "@/providers/explore-provider";
import {useAskRequest} from "@breadcrumb/client";
import {useAuth} from "@/providers/auth-provider";
import { apiFetch } from "@/lib/api";
import { DiscoveryRow } from "@/components/discovery-row";
import { DiscoveryDetail } from "@/components/discovery-detail";
import { Sheet } from "@/components/sheet";
import { ToastLogo } from "@/components/pixel-art";
import { GameButton, Feedback, gameStyles as s } from "@/components/game-ui";
import { theme as t } from "@/lib/theme";
import { DemoBanner } from "@/components/demo-banner";
export default function AskScreen() {
  const e = useExplore(),
    insets = useSafeAreaInsets(),
    scroll = useRef<ScrollView>(null);
  const {session}=useAuth();
  const {height}=useWindowDimensions(),compact=height<500;
  const locationEpoch=useRef(0);
  const scrollToAnswer=useRef(false);
  const {run,cancel,pending,error,setError,retrySeconds}=useAskRequest();
  const [locationEnabled, setLocationEnabled] = useState(false),
    [locating, setLocating] = useState(false),
    [lastQuestion, setLastQuestion] = useState(""),
    [detail, setDetail] = useState<DiscoveryRecord | null>(null);
  const [now,setNow]=useState(()=>Date.now());
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(timer);},[]);
  useEffect(()=>{
    const listener=AppState.addEventListener('change',state=>{if(state!=='active'){cancel();locationEpoch.current++;setLocating(false);}});
    return()=>listener.remove();
  },[cancel]);
  useLayoutEffect(() => () => {cancel();locationEpoch.current++;setLocationEnabled(false);setLocating(false);}, [e.demoKey, session?.user.id, cancel]);
  async function send(value = e.chatInput) {
    const question = value.trim();
    if (pending || retrySeconds || locating || !question) return;
    setLastQuestion(question);
    scrollToAnswer.current=true;
    e.setChatInput(question);
    const result = await run(async signal => {
      let coarseUserLocation;
      if (locationEnabled) {
        const permission = await Location.getForegroundPermissionsAsync();
        if (signal.aborted) throw new Error("Search stopped.");
        if (permission.status !== "granted") {
          setLocationEnabled(false);
          throw new Error("Location access has ended. Choose a campus place or enable location again.");
        }
        const position = await Location.getCurrentPositionAsync({accuracy: Location.Accuracy.Balanced});
        coarseUserLocation = roundedLocation({latitude: position.coords.latitude, longitude: position.coords.longitude});
        if (!inCampus(coarseUserLocation)) throw new Error("Choose a UF campus place to search from your current location.");
      }
      if (signal.aborted) throw new Error("Search stopped.");
      return apiFetch("/api/ask", {
        method: "POST", headers: {"Content-Type": "application/json"}, signal,
        body: JSON.stringify({message: question, ...(e.context ? {context: e.context} : {}),
          ...(coarseUserLocation ? {coarseUserLocation} : {}), ...(e.demo ? {demo: e.demo} : {})}),
      });
    });
    if (!result) return;
    scrollToAnswer.current=true;
    const resolved = {...result, cards: result.cards.map(resolveDiscoveryLocation)};
    e.setTurns(turns => [...turns, {id: Date.now().toString(), question, result: resolved, demoKey: e.demoKey}].slice(-ASK_TURN_LIMIT));
    e.setContext(result.context);
    e.setChatInput("");
    scroll.current?.scrollToEnd({animated: true});
  }
  function clearFilters() {
    cancel();locationEpoch.current++;setLocating(false);e.setContext(undefined);setLocationEnabled(false);setError("");
  }
  function onMap(r: DiscoveryRecord) {
    if(!session){
      void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${r.latitude},${r.longitude}`)}`).catch(()=>setError("Could not open the map. Please retry."));
      return;
    }
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
          onPress={() => {
            cancel();locationEpoch.current++;setLocating(false);setLastQuestion("");setDetail(null);
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
        onContentSizeChange={()=>{if(scrollToAnswer.current){scroll.current?.scrollToEnd({animated:true});scrollToAnswer.current=false;}}}
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
            {askPrompts.map((q) => (
              <GameButton
                key={q}
                variant="secondary"
                disabled={pending || !!retrySeconds || locating}
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
                {!!discoveryMatch(r, turn.result.context.constraints) && <Text style={s.muted}>{discoveryMatch(r, turn.result.context.constraints)}</Text>}
                {askRecordAvailable(r,now) && mappable(r) &&
                  inCampus({
                    latitude: r.latitude!,
                    longitude: r.longitude!,
                  }) && (
                    <GameButton variant="secondary" onPress={() => onMap(r)}>
                      {session ? "View on map" : "Open location"}
                    </GameButton>
                  )}
              </View>
            ))}
            <Text style={s.muted}>{turn.result.dataFreshnessNote}</Text>
          </View>
        ))}
        {latest && e.context && !pending && (
          <View style={{ gap: 8 }}>
            <Text style={s.label}>Keep exploring</Text>
            {latest.suggestedFollowUps.map((q) => (
              <GameButton
                key={q}
                variant="secondary"
                disabled={!!retrySeconds || locating}
                onPress={() => void send(q)}
              >
                {q}
              </GameButton>
            ))}
          </View>
        )}
        {e.context && <View style={{gap: 4}}><Text style={s.muted}>{askFilterLabels(e.context.constraints).join(" · ")}</Text><Pressable accessibilityRole="button" onPress={clearFilters} style={{minHeight: 44, justifyContent: "center"}}><Text style={s.label}>Clear filters</Text></Pressable></View>}
        {!!retrySeconds && <Text accessibilityLiveRegion="polite" style={s.muted}>Try again in {retrySeconds}s.</Text>}
        {pending && (
          <View accessibilityLiveRegion="polite" style={s.row}>
            <ActivityIndicator color={t.ink} />
            <Text style={s.body}>Looking through campus discoveries…</Text>
          </View>
        )}
        <Feedback error message={error} />
        {!!error && !!lastQuestion && (
          <GameButton
            variant="secondary"
            disabled={pending || !!retrySeconds || locating}
            onPress={() => void send(lastQuestion)}
          >
            Retry question
          </GameButton>
        )}
      </ScrollView>
      <View
        style={{
          backgroundColor: t.surface,
          padding: compact?8:16,
          paddingBottom: Math.max(insets.bottom, compact?8:16),
          borderTopWidth: 1,
          borderColor: t.border,
          gap: 8,
        }}
      >
        <Text style={s.label}>Ask Breadcrumb</Text>
        <TextInput
          accessibilityLabel="Ask Breadcrumb"
          style={[s.input, { maxHeight: compact?56:120 }]}
          multiline
          placeholder="What’s happening around campus?"
          placeholderTextColor={t.muted}
          value={e.chatInput}
          onChangeText={e.setChatInput}
          maxLength={1200}
          editable={!pending}
        />
        <View style={{flexDirection:compact?"row":"column",gap:8}}>
          <GameButton style={compact?{flex:1}:undefined} variant="secondary" disabled={pending || locating} onPress={() => {
            const epoch=++locationEpoch.current;
            if (locationEnabled) { setLocationEnabled(false); return; }
            setLocating(true);
            void Location.requestForegroundPermissionsAsync().then(permission => {
              if(epoch!==locationEpoch.current)return;
              if (permission.status === "granted") setLocationEnabled(true);
              else setError("Location was not enabled. Try a campus place like Reitz.");
            }).catch(() => {if(epoch===locationEpoch.current)setError("Could not enable location. Try a campus place like Reitz.");}).finally(() => {if(epoch===locationEpoch.current)setLocating(false);});
          }}>
            {locating ? "Enabling location…" : locationEnabled ? "Approximate location on · Remove" : "Use approximate location"}
          </GameButton>
          {pending ? <GameButton style={compact?{flex:1}:undefined} variant="secondary" onPress={cancel}>Stop search</GameButton> : <GameButton style={compact?{flex:1}:undefined} disabled={!e.chatInput.trim() || !!retrySeconds || locating} onPress={() => void send()}>Find something</GameButton>}
        </View>
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

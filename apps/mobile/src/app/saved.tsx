import { ActivityIndicator, FlatList, Text, View } from "react-native";
import { router } from "expo-router";
import { discoveryKey, isCurrentRecord } from "@breadcrumb/shared";
import { useExplore } from "@/providers/explore-provider";
import { DiscoveryRow } from "@/components/discovery-row";
import {
  EmptyState,
  Feedback,
  GameButton,
  gameStyles as s,
} from "@/components/game-ui";
export default function SavedScreen() {
  const e = useExplore();
  return (
    <FlatList
      style={s.page}
      contentContainerStyle={s.content}
      data={e.saved}
      keyExtractor={discoveryKey}
      ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
      ListHeaderComponent={
        <View style={{ gap: 8, marginBottom: 16 }}>
          <Text style={s.title}>Worth coming back to.</Text>
          <Text style={s.muted}>
            Saved on this device for this account. Details are checked again
            when opened.
          </Text>
          <Feedback error message={e.savedError} />
          {!!e.savedError && (
            <GameButton variant="secondary" onPress={e.retrySaved}>
              Retry saved items
            </GameButton>
          )}
        </View>
      }
      ListEmptyComponent={
        !e.savedReady ? (
          <ActivityIndicator />
        ) : (
          <EmptyState
            title="Your next good find goes here"
            description="Save a discovery from its details to find it again."
            action="Explore campus"
            onAction={() => router.navigate("/")}
          />
        )
      }
      renderItem={({ item }) => (
        <View style={{ gap: 8 }}>
          {!isCurrentRecord(item) && (
            <Text style={s.muted}>Expired or past discovery</Text>
          )}
          <DiscoveryRow
            record={item}
            onPress={() => {
              e.selectRecord(item);
              router.navigate("/");
            }}
          />
          <GameButton
            disabled={!e.savedWritable}
            variant="secondary"
            onPress={() => e.toggleSaved(item)}
          >
            Remove from saved
          </GameButton>
        </View>
      )}
    />
  );
}

import { ActivityIndicator, FlatList, Text, View } from "react-native";
import { router } from "expo-router";
import { discoveryKey } from "@breadcrumb/shared";
import { useExplore } from "@/providers/explore-provider";
import { useCampus } from "@/providers/world-provider";
import { DiscoveryRow } from "@/components/discovery-row";
import {
  EmptyState,
  Feedback,
  GameButton,
  gameStyles as s,
} from "@/components/game-ui";
export default function NearbyScreen() {
  const e = useExplore(),
    c = useCampus();
  return (
    <FlatList
      style={s.page}
      contentContainerStyle={s.content}
      data={e.records}
      keyExtractor={discoveryKey}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      refreshing={e.refreshing}
      onRefresh={() => {
        void e.refresh();
        void c.refresh();
      }}
      ListHeaderComponent={
        <View style={{ gap: 16, marginBottom: 16 }}>
          <Text style={s.title}>Campus picks</Text>
          <Feedback error message={e.error || c.error} />
          {(e.error || c.error) && (
            <GameButton
              variant="secondary"
              onPress={() => {
                void e.refresh();
                void c.refresh();
              }}
            >
              Retry
            </GameButton>
          )}
        </View>
      }
      ListEmptyComponent={
        e.loading ? (
          <ActivityIndicator />
        ) : (
          <EmptyState
            title="No matches right now"
            description="Change your filters or share something happening on campus."
            action="Back to Explore"
            onAction={() => router.navigate("/")}
          />
        )
      }
      renderItem={({ item }) => (
        <DiscoveryRow
          record={item}
          onPress={() => {
            e.selectRecord(item);
            router.navigate("/");
          }}
        />
      )}
    />
  );
}

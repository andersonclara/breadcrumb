import { Text, TextInput, View } from "react-native";
import {
  categories,
  type Coordinate,
  type CrumbCategory,
  type WorldCrumb,
  relatedCrumbs,
  postHeadline,
  describePostLocation,
} from "@breadcrumb/shared";
import { useExplore } from "@/providers/explore-provider";
import { useCampus } from "@/providers/world-provider";
import { Chip, GameButton, useGameStyles } from "./game-ui";
import { useTheme } from "@/lib/theme-context";
import { isDarkTheme } from "@/lib/map-ui-theme";
export function CrumbComposer({
  onChangeLocation,
  onConfirm,
}: {
  onChangeLocation: () => void;
  onConfirm: (id: string) => void;
}) {
  const t = useTheme(), s = useGameStyles();
  const { draft, setDraft } = useExplore(),
    { world } = useCampus();
  const joined = world.communities?.filter(
    (c) => c.id === "campus" || c.joined,
  ) ?? [{ id: "campus", name: "Campus" }];
  const related = draft.point
    ? relatedCrumbs(
        world.crumbs.filter(
          (c) => (c.community_id ?? "campus") === draft.community,
        ),
        postHeadline(draft.text),
        draft.category,
        draft.point,
      ).filter((c) => !c.is_author)
    : [];
  return (
    <View style={{ gap: 16 }}>
      <Text nativeID="post-text-label" style={s.label}>
        What&apos;s happening?
      </Text>
      <TextInput
        accessibilityLabel="What's happening?"
        accessibilityLabelledBy="post-text-label"
        style={[
          s.input,
          { minHeight: 120, lineHeight: 24, textAlignVertical: "top" },
        ]}
        multiline
        value={draft.text}
        onChangeText={(text) => setDraft((d) => ({ ...d, text }))}
        maxLength={2000}
        placeholder="Free pizza outside Reitz until 2?"
        placeholderTextColor={t.muted}
        selectionColor={t.ink}
        keyboardAppearance={isDarkTheme(t) ? "dark" : "light"}
      />
      <Text style={s.muted}>{draft.text.length}/2000</Text>
      <Text style={s.label}>Location</Text>
      <Text style={s.body}>
        {draft.point ? describePostLocation(draft.point) : "Choose a location"}
      </Text>
      <GameButton variant="secondary" onPress={onChangeLocation}>
        Change location or choose a building
      </GameButton>
      <Text style={s.label}>Category</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {categories.map((c) => (
          <Chip
            key={c.id}
            label={c.label}
            selected={draft.category === c.id}
            onPress={() =>
              setDraft((d) => ({ ...d, category: c.id as CrumbCategory }))
            }
          />
        ))}
      </View>
      <Text style={s.label}>Share with</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {joined.map((c) => (
          <Chip
            key={c.id}
            label={c.name}
            selected={draft.community === c.id}
            onPress={() => setDraft((d) => ({ ...d, community: c.id }))}
          />
        ))}
      </View>
      {related.length > 0 && (
        <View style={s.card}>
          <Text style={s.label}>Already happening nearby?</Text>
          <Text style={s.muted}>
            Confirm an existing report instead of posting a duplicate.
          </Text>
          {related.map((c: WorldCrumb) => (
            <GameButton
              key={c.id}
              variant="secondary"
              onPress={() => onConfirm(c.id)}
            >
              {c.title}
            </GameButton>
          ))}
        </View>
      )}
    </View>
  );
}
export type ComposerPoint = Coordinate;

import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { CommunityManager } from "@/components/community-manager";
import { gameStyles as s } from "@/components/game-ui";
export default function CommunitiesScreen() {
  return (
    <KeyboardAvoidingView
      style={s.page}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
      >
        <CommunityManager />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

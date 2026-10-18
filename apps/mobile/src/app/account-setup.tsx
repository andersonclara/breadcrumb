import { Redirect } from "expo-router";
export default function ProfileSetupRedirect() {
  return <Redirect href="/profile?edit=1" />;
}

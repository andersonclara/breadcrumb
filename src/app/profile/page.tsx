import {CommunityManager} from '@/components/community-manager';
import {ProfileAvatar} from "@/components/profile-avatar";
import {validAvatar,defaultAvatar} from "@breadcrumb/shared";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { normalizeUfEmail, canAct } from "@/lib/auth/rules";
import { signOut } from "@/app/auth/actions";

export const dynamic = "force-dynamic";
export default async function ProfilePage() {
  if (!getSupabaseConfig()) redirect("/login");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !normalizeUfEmail(user.email)) redirect("/login");
  const { data: profile, error } = await supabase.from("profiles").select("handle, banned, suspended_until, avatar").eq("id", user.id).single();
  return <main className="mx-auto max-w-3xl space-y-6 px-6 py-16">
    <Link href="/">← Back to the map</Link><h1 className="text-4xl font-semibold">Your profile</h1>
    <p className="text-xl">{profile?.handle ?? "UF community member"}</p>
    <ProfileAvatar initial={validAvatar(profile?.avatar)?profile.avatar:defaultAvatar}/>
    {error || !profile ? <p role="alert">Your profile could not be loaded. Check that the database migration has been applied.</p> :
      <p>{profile.banned ? "Your account is banned." : !canAct(profile) && profile.suspended_until
        ? `Suspended until ${new Date(profile.suspended_until).toLocaleString("en-US", { timeZone: "America/New_York" })} ET.` : "Your account is active."}</p>}
    <CommunityManager/><form action={signOut}><button className="button">Sign out</button></form>
  </main>;
}

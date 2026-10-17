import {ProfileEditor} from '@/components/profile-editor';
import {ToastLogo} from '@/components/pixel-art';
import {CommunityManager} from '@/components/community-manager';
import {ProfileAvatar} from "@/components/profile-avatar";
import {validAvatar,defaultAvatar} from "@breadcrumb/shared";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { normalizeUfEmail, canAct } from "@/lib/auth/rules";

export const dynamic = "force-dynamic";
export default async function ProfilePage({searchParams}:{searchParams:Promise<{edit?:string;setup?:string}>}) {
  const params=await searchParams;
  if (!getSupabaseConfig()) redirect("/login");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !normalizeUfEmail(user.email) || !user.email_confirmed_at) redirect("/login");
  const { data: profile, error } = await supabase.from("profiles").select("handle, banned, suspended_until, avatar, account_completed, avatar_completed").eq("id", user.id).single();
  const onboarding=!profile?.account_completed||!profile?.avatar_completed;
  if(profile&&(onboarding||params.edit==='1'||params.setup==='1'))return <main className="pixel-page profile-edit-page"><Link href="/">? CAMPUS</Link><div className="profile-edit-brand"><ToastLogo size={70}/><p className="pixel-kicker">{onboarding?'UF EMAIL VERIFIED / WELCOME TO BREADCRUMB':'YOUR CAMPUS PROFILE'}</p></div><ProfileEditor initialUsername={profile.handle} initialAvatar={validAvatar(profile.avatar)?profile.avatar:defaultAvatar} accountCompleted={!!profile.account_completed} onboarding={onboarding}/></main>;
  return <main className="mx-auto max-w-3xl space-y-6 px-6 py-16">
    <Link href="/">← Back to the map</Link><h1 className="text-4xl font-semibold">Your profile</h1>
    <p className="text-xl">{profile?.handle ?? "UF community member"}</p>
    <Link href="/profile?edit=1" className="text-button">EDIT USERNAME OR PASSWORD</Link>
    <ProfileAvatar initial={validAvatar(profile?.avatar)?profile.avatar:defaultAvatar}/>
    {error || !profile ? <p role="alert">Your profile could not be loaded. Check that the database migration has been applied.</p> :
      <p>{profile.banned ? "Your account is banned." : !canAct(profile) && profile.suspended_until
        ? `Suspended until ${new Date(profile.suspended_until).toLocaleString("en-US", { timeZone: "America/New_York" })} ET.` : "Your account is active."}</p>}
    <CommunityManager/><form action="/signout" method="post"><button className="button">Sign out</button></form>
  </main>;
}

import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {getSupabaseConfig} from '@/lib/env';
import {validAvatar,defaultAvatar} from '@breadcrumb/shared';
import {ProfileAvatar} from '@/components/profile-avatar';
export default async function AvatarPage(){
 if(!getSupabaseConfig())redirect('/login');
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();
 if(!user)redirect('/login');
 const {data:profile}=await supabase.from('profiles').select('avatar,avatar_completed').eq('id',user.id).single();
 if(profile?.avatar_completed)redirect('/profile');
 return <main className="pixel-page"><p className="pixel-kicker">WELCOME TO BREADCRUMB</p><h1>MEET YOUR<br/>CAMPUS SELF.</h1><p>Create your avatar to finish setting up your account. You can change it later in your profile.</p><ProfileAvatar onboarding initial={validAvatar(profile?.avatar)?profile.avatar:defaultAvatar}/></main>;
}

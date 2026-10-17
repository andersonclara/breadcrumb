import {normalizeUfEmail} from '@breadcrumb/shared';
import {useState} from 'react';
import {Redirect,Link,router,useLocalSearchParams} from 'expo-router';
import {ScrollView,Text,View} from 'react-native';
import {useAuth} from '@/providers/auth-provider';
import {useCampus} from '@/providers/world-provider';
import {CommunityManager} from '@/components/community-manager';
import {ProfileEditor} from '@/components/profile-editor';
import {PixelAvatar,ToastLogo} from '@/components/pixel-art';
import {GameButton,gameStyles as s} from '@/components/game-ui';
export default function ProfileScreen(){
 const {session,loading}=useAuth(),{world,error}=useCampus(),params=useLocalSearchParams<{edit?:string}>();const [editing,setEditing]=useState(false);
 if(loading)return <Text>Loading your account...</Text>;
 if(!session||!normalizeUfEmail(session.user.email)||!session.user.email_confirmed_at)return <Redirect href="/login"/>;
 if(world.profile&&(editing||params.edit==='1'||!world.profile.avatar_completed))return <ScrollView style={s.page} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled"><View style={{alignItems:'center'}}><ToastLogo size={75}/><Text style={s.label}>YOUR CAMPUS PROFILE</Text></View><ProfileEditor initialUsername={world.profile.handle} initialAvatar={world.profile.avatar} userId={session.user.id} onSaved={onboarding=>{setEditing(false);router.replace(onboarding||!world.profile?.avatar_completed?'/':'/profile');}}/>{error&&<Text style={s.error}>{error}</Text>}</ScrollView>;
 return <ScrollView style={s.page} contentContainerStyle={s.content}><Text style={s.title}>YOUR PROFILE</Text><Text style={s.body}>{world.profile?.handle??'Your campus account'}</Text>{world.profile&&<><PixelAvatar avatar={world.profile.avatar} size={80}/><GameButton onPress={()=>setEditing(true)}>EDIT PROFILE & AVATAR</GameButton></>}<CommunityManager/><Link href="/" style={s.body}>Back to campus / drop a crumb</Link><Link href="/login" style={s.body}>Account settings and sign out</Link>{error&&<Text style={s.error}>{error}</Text>}</ScrollView>;
}

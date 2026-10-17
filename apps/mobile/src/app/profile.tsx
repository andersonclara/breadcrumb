import {CommunityManager} from '@/components/community-manager';
import {useState} from 'react';
import {Redirect,Link} from 'expo-router';
import {ScrollView,Text} from 'react-native';
import {useAuth} from '@/providers/auth-provider';
import {useCampus} from '@/providers/world-provider';
import {AvatarWorkshop} from '@/components/avatar-workshop';
import {PixelAvatar} from '@/components/pixel-art';
import {GameButton,gameStyles as s} from '@/components/game-ui';
export default function ProfileScreen(){
 const {session,loading}=useAuth(),{world,error}=useCampus();const [editing,setEditing]=useState(false);
 if(loading)return <Text>Loading your account...</Text>;
 if(!session)return <Redirect href="/login"/>;
 return <ScrollView style={s.page} contentContainerStyle={s.content}><Text style={s.title}>YOUR PROFILE</Text><Text style={s.body}>{world.profile?.handle??'Your campus account'}</Text>{world.profile&&(editing?<><AvatarWorkshop initial={world.profile.avatar} signedIn onSaved={()=>setEditing(false)}/><GameButton onPress={()=>setEditing(false)}>CANCEL</GameButton></>:<><PixelAvatar avatar={world.profile.avatar} size={80}/><GameButton onPress={()=>setEditing(true)}>EDIT AVATAR</GameButton></>)}<CommunityManager/><Link href="/" style={s.body}>Back to campus / drop a crumb</Link><Link href="/login" style={s.body}>Account settings and sign out</Link>{error&&<Text style={s.error}>{error}</Text>}</ScrollView>;
}

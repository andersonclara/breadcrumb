import {Redirect,router} from 'expo-router';
import {ScrollView,Text} from 'react-native';
import {useCampus} from '@/providers/world-provider';
import {useAuth} from '@/providers/auth-provider';
import {AvatarWorkshop} from '@/components/avatar-workshop';
import {gameStyles as s} from '@/components/game-ui';
export default function AvatarScreen(){
 const {world,error,notice}=useCampus();const {session,loading}=useAuth();
 if(loading)return <Text>Loading your account...</Text>;
 if(!session)return <Redirect href="/login"/>;
 if(world.profile?.avatar_completed)return <Redirect href="/profile"/>;
 return <ScrollView style={s.page} contentContainerStyle={s.content}><Text style={s.title}>MEET YOUR CAMPUS SELF.</Text><Text style={s.body}>Create your avatar to finish signing up. Change it later in Profile.</Text>{world.profile?<AvatarWorkshop initial={world.profile.avatar} signedIn onSaved={()=>router.replace('/')}/>:<Text style={s.body}>Loading your player...</Text>}{(error||notice)&&<Text style={s.error}>{notice||error}</Text>}</ScrollView>;
}

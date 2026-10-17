import {useState} from 'react';
import {ScrollView,Text,TextInput,View} from 'react-native';
import {useCampus} from '@/providers/world-provider';
import {PixelAvatar} from '@/components/pixel-art';
import {GameButton,gameStyles as s} from '@/components/game-ui';
export default function FriendsScreen(){
 const {world,act,pending,sharing,share,stop,error,notice}=useCampus();const [code,setCode]=useState('');
 const safe=(action:string,data:unknown)=>{void act(action,data).catch(()=>{});};
 return <ScrollView style={s.page} contentContainerStyle={s.content}><Text style={s.title}>YOUR CAMPUS{ '\n' }CREW.</Text><Text style={s.body}>Only accepted friends can see your avatar location. Sharing is off by default, rounded to about 100 meters, and stops when the app goes into the background.</Text>{world.profile?<>
 <Text selectable style={s.label}>YOUR CODE: {world.profile.friend_code}</Text><Text style={s.label}>ADD A FRIEND</Text><TextInput style={s.input} value={code} onChangeText={v=>setCode(v.toUpperCase())} autoCapitalize="characters" autoCorrect={false} maxLength={8} placeholder="8-character friend code" accessibilityLabel="Friend code"/>
 <GameButton disabled={pending||code.length!==8} onPress={()=>safe('friend_request',{code})}>SEND FRIEND REQUEST →</GameButton>
 {world.friends.map(f=><View key={f.id} style={{gap:12,borderBottomWidth:1,borderColor:'#C5AE8C',paddingBottom:18}}><View style={s.row}><PixelAvatar avatar={f.avatar} size={28}/><View><Text style={s.label}>PLAYER {f.handle.slice(-5).toUpperCase()}</Text><Text style={s.body}>{f.accepted?'Friend':f.incoming?'Incoming request':'Request sent'}</Text></View></View>{!f.accepted&&f.incoming&&<GameButton disabled={pending} onPress={()=>safe('friend_accept',{id:f.id})}>ACCEPT</GameButton>}<GameButton disabled={pending} onPress={()=>safe('friend_remove',{id:f.id})}>{f.accepted?'REMOVE FRIEND':'CANCEL / DECLINE'}</GameButton></View>)}
 <Text style={s.label}>{sharing?'VISIBLE TO FRIENDS':'EXPLORING PRIVATELY'}</Text><GameButton onPress={()=>{if(sharing)stop();else void share().catch(()=>{});}}>{sharing?'STOP SHARING':'SHARE WITH FRIENDS →'}</GameButton>
 <Text style={s.body}>Your marker disappears within 90 seconds if updates stop. Friendship removal revokes access immediately.</Text>
 </>:<Text style={s.body}>Sign in to add friends.</Text>}{(notice||error)&&<Text style={s.error} accessibilityLiveRegion="polite">{notice||error}</Text>}</ScrollView>;
}

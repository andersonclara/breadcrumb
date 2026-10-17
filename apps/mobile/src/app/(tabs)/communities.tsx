import {useState} from 'react';
import {Link} from 'expo-router';
import {Pressable,ScrollView,Text,View} from 'react-native';
import {communities,type CommunityId} from '@breadcrumb/shared';
import {useCampus} from '@/providers/world-provider';
import {gameStyles as s} from '@/components/game-ui';
import {PixelBread} from '@/components/pixel-art';
export default function CommunitiesScreen(){
 const {world,error,notice}=useCampus();const [tab,setTab]=useState<CommunityId>('campus');
 const directory=world.communities??communities.map(c=>({...c,joined:c.id==='campus'}));
 const theme=directory.find(c=>c.id===tab)??directory[0],membership=world.communities?.find(c=>c.id===tab),joined=tab==='campus'||membership?.joined;
 const posts=world.crumbs.filter(c=>(c.community_id??'campus')===tab);
 return <ScrollView style={{flex:1,backgroundColor:theme.background}} contentContainerStyle={s.content}><Text style={s.title}>FIND YOUR PEOPLE.</Text><View accessibilityRole="tablist" style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>{directory.filter(c=>c.id==='campus'||c.joined).map(c=><Pressable key={c.id} accessibilityRole="tab" accessibilityState={{selected:tab===c.id}} onPress={()=>setTab(c.id)} style={{padding:12,borderWidth:2,borderColor:c.accent,backgroundColor:tab===c.id?c.accent:c.background}}><Text style={{fontFamily:'PressStart2P_400Regular',fontSize:7,color:tab===c.id?'#FFF8EA':'#49382C'}}>{c.name.toUpperCase()}</Text></Pressable>)}</View><View style={{padding:18,gap:15,borderWidth:3,borderColor:theme.accent,backgroundColor:'#FFFAF0'}}><Text style={[s.title,{fontSize:14,color:theme.accent}]}>{theme.name.toUpperCase()}</Text><Text style={s.body}>{theme.description}</Text>{tab==='girls'&&<Text style={s.body}>Membership is self-selected.</Text>}<Link href="/profile" style={s.label}>MANAGE COMMUNITIES IN PROFILE ?</Link>{joined?<><Link href="/" style={[s.label,{color:theme.accent}]}>DROP A CRUMB ON THE MAP →</Link><Text style={s.body}>Choose this community in the post composer.</Text>{posts.length?posts.map(c=><View key={c.id} style={{borderTopWidth:2,borderColor:theme.accent,paddingTop:18,gap:10}}><View style={s.row}><PixelBread state={c.state}/><Text style={[s.body,{flex:1,fontWeight:'700'}]}>{c.title}</Text></View><Text style={s.body}>{c.description}</Text><Text style={s.label}>{c.confirm_count}/3 CONFIRMATIONS</Text></View>):<Text style={s.body}>No active crumbs here yet. Be the first to leave one.</Text>}</>:<><Text style={s.body}>Join to see and share this community’s breadcrumbs. Joining never shares your location.</Text>{!world.profile&&<Link href="/login" style={s.label}>SIGN IN WITH UF</Link>}</>}</View>{(error||notice)&&<Text style={s.error}>{notice||error}</Text>}</ScrollView>;
}

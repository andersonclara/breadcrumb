import {useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {avatarOptions,type AvatarConfig} from '@breadcrumb/shared';
import {useCampus} from '@/providers/world-provider';
import {PixelAvatar} from '@/components/pixel-art';
import {GameButton,gameStyles as s} from '@/components/game-ui';
export function AvatarWorkshop({initial,signedIn,onSaved}:{initial:AvatarConfig;signedIn:boolean;onSaved:()=>void}){
 const [avatar,setAvatar]=useState(initial);const {act,pending}=useCampus();
 const labels:Record<keyof AvatarConfig,string>={skin:'SKIN TONE',hair:'HAIR COLOR',shirt:'TOP COLOR',pants:'BOTTOMS',hairstyle:'HAIR STYLE',top:'TOP STYLE',accessory:'ACCESSORY'};
 return <><View style={styles.stage}><PixelAvatar avatar={avatar} size={100}/><Text style={s.label}>LOOKING CRUMB-TASTIC</Text></View>
 {(Object.keys(avatarOptions) as (keyof AvatarConfig)[]).map(key=><View key={key} style={{gap:12}}><Text style={s.label}>{labels[key]}</Text><View style={styles.options}>{avatarOptions[key].map((value,i)=><Pressable key={value} accessibilityRole="button" accessibilityLabel={`${labels[key]} ${value}`} accessibilityState={{selected:avatar[key]===i}} onPress={()=>setAvatar({...avatar,[key]:i})} style={[styles.option,avatar[key]===i&&styles.selected]}>{value.startsWith('#')?<View style={{width:22,height:22,backgroundColor:value}}/>:<Text style={styles.optionText}>{value.toUpperCase()}</Text>}</Pressable>)}</View></View>)}
 <GameButton disabled={pending||!signedIn} onPress={()=>{void act('avatar',avatar).then(onSaved).catch(()=>{});}}>{signedIn?'SAVE MY AVATAR →':'SIGN IN TO SAVE'}</GameButton></>;
}
const styles=StyleSheet.create({stage:{alignItems:'center',gap:16,borderWidth:2,borderColor:'#C5AE8C',padding:24,backgroundColor:'#E8D9BB'},options:{flexDirection:'row',flexWrap:'wrap',gap:8},option:{borderWidth:2,borderColor:'#C5AE8C',padding:10,minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'},selected:{borderColor:'#49382C',backgroundColor:'#E8D9BB'},optionText:{fontSize:11,color:'#49382C'}});

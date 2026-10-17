import {useEffect,useState} from 'react';
import {Text,TextInput,View} from 'react-native';
import {signupPasswordError,type AvatarConfig} from '@breadcrumb/shared';
import {supabase} from '@/lib/supabase';
import {useCampus} from '@/providers/world-provider';
import {AvatarWorkshop} from './avatar-workshop';
import {GameButton,gameStyles as s} from './game-ui';
export function ProfileEditor({initialUsername,initialAvatar,userId,onSaved}:{initialUsername:string;initialAvatar:AvatarConfig;userId:string;onSaved:(onboarding:boolean)=>void}){
 const {act}=useCampus();const [username,setUsername]=useState(initialUsername),[avatar,setAvatar]=useState(initialAvatar),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[complete,setComplete]=useState(false),[ready,setReady]=useState(false),[pending,setPending]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{if(!supabase)return;let active=true;void supabase.from('profiles').select('account_completed').eq('id',userId).single().then(({data,error})=>{if(!active)return;if(error){setMessage('Apply the username-account migration to finish your profile.');return;}setComplete(!!data.account_completed);setReady(true);});return()=>{active=false;};},[userId]);
 async function save(){
  if(!supabase)return;const chosen=username.trim().toLowerCase();if(!/^[a-z0-9][a-z0-9_.-]{2,29}$/.test(chosen)){setMessage('Use 3–30 letters, numbers, dots, underscores, or hyphens.');return;}
  if(!complete||password||confirm){const error=signupPasswordError(password,confirm);if(error){setMessage(error);return;}}
  setPending(true);setMessage('');try{if(password){const {error}=await supabase.auth.updateUser({password});if(error&&error.code!=='same_password'){setMessage('Could not set your password. Choose a stronger password or sign in again.');return;}}
   if(!complete||chosen!==initialUsername){const {error}=await supabase.rpc('complete_account',{p_username:chosen});if(error){setMessage(error.code==='P0001'?error.message:'Could not save your username. Check the username-account migration.');return;}}
   await act('avatar',avatar);setPassword('');setConfirm('');onSaved(!complete);
  }catch(e){setMessage(e instanceof Error?e.message:'Could not save your profile.');}finally{setPending(false);}
 }
 return <View style={{gap:18}}><Text style={s.title}>MAKE YOURSELF AT HOME.</Text><Text style={s.label}>YOUR USERNAME</Text><TextInput style={s.input} accessibilityLabel="Your username" value={username} onChangeText={setUsername} autoComplete="username" autoCapitalize="none" autoCorrect={false} maxLength={30}/><Text style={s.body}>Starts with your GatorLink name. Change it to make it yours.</Text><Text style={s.label}>{complete?'NEW PASSWORD (OPTIONAL)':'CREATE YOUR BREADCRUMB PASSWORD'}</Text><TextInput style={s.input} accessibilityLabel="New password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" autoCapitalize="none" autoCorrect={false} maxLength={128}/><Text style={s.label}>CONFIRM PASSWORD</Text><TextInput style={s.input} accessibilityLabel="Confirm password" value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password" autoCapitalize="none" autoCorrect={false}/><Text style={s.title}>YOUR CAMPUS SELF</Text><AvatarWorkshop initial={initialAvatar} hideSave onChange={setAvatar}/><GameButton disabled={pending||!ready} onPress={()=>{void save();}}>{pending?'SAVING…':'SAVE PROFILE & EXPLORE →'}</GameButton>{message&&<Text style={s.error} accessibilityLiveRegion="polite">{message}</Text>}</View>;
}

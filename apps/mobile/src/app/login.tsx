import {useState} from 'react';
import {Link,router} from 'expo-router';
import {ActivityIndicator,KeyboardAvoidingView,Platform,Pressable,ScrollView,Text,TextInput,View} from 'react-native';
import {normalizeUfEmail,normalizeUfLogin,palette} from '@breadcrumb/shared';
import {supabase} from '@/lib/supabase';
import {apiFetch} from '@/lib/api';
import {useAuth} from '@/providers/auth-provider';
import {useCampus} from '@/providers/world-provider';
import {ToastLogo} from '@/components/pixel-art';
import {GameButton,gameStyles as s} from '@/components/game-ui';
export default function LoginScreen(){
 const {session,loading,error}=useAuth(),{stop}=useCampus();
 const [mode,setMode]=useState<'login'|'signup'>('login'),[identity,setIdentity]=useState(''),[password,setPassword]=useState(''),[showPassword,setShowPassword]=useState(false),[code,setCode]=useState(''),[sentTo,setSentTo]=useState<string|null>(null),[pending,setPending]=useState(false),[message,setMessage]=useState('');
 async function enterCampus(){if(!supabase)return;const {data:{user}}=await supabase.auth.getUser();if(!user||!normalizeUfEmail(user.email)||!user.email_confirmed_at){await supabase.auth.signOut();setMessage('A confirmed UF email address is required.');return;}const {data:profile}=await supabase.from('profiles').select('account_completed,avatar_completed').eq('id',user.id).single();router.replace(!profile?.account_completed||!profile.avatar_completed?'/profile?edit=1':'/');}
 async function submit(){
  if(!supabase)return;setPending(true);setMessage('');
  try{
   if(mode==='login'){
    const login=normalizeUfLogin(identity);if(!login||!password){setMessage('Enter your UF email or Breadcrumb username and password.');return;}
    if(login.includes('@')){const {error}=await supabase.auth.signInWithPassword({email:login,password});if(error){setMessage(error.code==='email_not_confirmed'?'Confirm your UF email before signing in.':'Email/username or password is incorrect.');return;}}
    else{const response=await apiFetch('/api/auth/password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({identifier:login,password})});const result=await response.json();if(!response.ok||!result.session){setMessage(result.error??'Could not sign in.');return;}const {error}=await supabase.auth.setSession({access_token:result.session.access_token,refresh_token:result.session.refresh_token});if(error){setMessage('Could not save your session. Please try again.');return;}}
    setPassword('');await enterCampus();
   }else if(sentTo){
    if(!/^\d{6,10}$/.test(code.trim())){setMessage('Enter the full numeric code from your UF inbox.');return;}
    const {error}=await supabase.auth.verifyOtp({email:sentTo,token:code.trim(),type:'email'});if(error){setMessage('That code is invalid or expired. Request a new one.');return;}await enterCampus();
   }else{
    const email=normalizeUfEmail(identity);if(!email){setMessage('Use your @ufl.edu email address.');return;}
    const {error}=await supabase.auth.signInWithOtp({email,options:{shouldCreateUser:true}});if(error){setMessage('Could not send your verification email. Please wait and try again.');return;}setSentTo(email);setMessage('Enter the code from your UF inbox.');
   }
  }catch{setMessage('Could not connect. Please try again.');}finally{setPending(false);}
 }
 function switchMode(next:typeof mode){setMode(next);setSentTo(null);setCode('');setPassword('');setMessage('');}
 async function signOut(){setPending(true);try{await stop();await supabase?.auth.signOut();setMessage('');}catch{setMessage('Could not sign out.');}finally{setPending(false);}}
 if(loading)return <View style={[s.page,{justifyContent:'center'}]}><ActivityIndicator color={palette.crust}/></View>;
 return <KeyboardAvoidingView style={s.page} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView contentContainerStyle={[s.content,{paddingTop:30,maxWidth:540,width:'100%',alignSelf:'center'}]} keyboardShouldPersistTaps="handled"><View style={{alignItems:'center',gap:10}}><ToastLogo size={90}/><Text style={s.title}>BREADCRUMB</Text><Text style={s.label}>LEAVE A CRUMB. SPREAD THE WORD.</Text></View>{session?<><Text style={s.body}>Your UF account is signed in.</Text><GameButton onPress={()=>{void enterCampus().catch(()=>setMessage('Could not load your account.'));}}>CONTINUE TO CAMPUS</GameButton><Link href="/profile" style={s.label}>YOUR PROFILE</Link><GameButton disabled={pending} onPress={()=>{void signOut();}}>SIGN OUT</GameButton></>:<><Text style={s.title}>{mode==='login'?'WELCOME BACK.':'JOIN THE LOAF.'}</Text>{mode==='login'&&<Text style={s.body}>Sign in with your UF email or Breadcrumb username.</Text>}<Text style={s.label}>{mode==='login'?'EMAIL OR USERNAME':'UF EMAIL ADDRESS'}</Text><TextInput style={s.input} accessibilityLabel={mode==='login'?'Email or username':'UF email address'} value={identity} onChangeText={setIdentity} placeholder={mode==='login'?'you@ufl.edu or your username':'you@ufl.edu'} autoCapitalize="none" autoCorrect={false} autoComplete={mode==='login'?'username':'email'} keyboardType={mode==='login'?'default':'email-address'} editable={!pending&&!sentTo}/>{mode==='login'&&<><Text style={s.label}>PASSWORD</Text><View style={{flexDirection:'row',alignItems:'center',gap:8}}><TextInput style={[s.input,{flex:1}]} accessibilityLabel="Password" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoComplete="current-password" textContentType="password" autoCapitalize="none" autoCorrect={false} maxLength={128} editable={!pending}/><Pressable onPress={()=>setShowPassword(!showPassword)} accessibilityLabel={showPassword?'Hide password':'Show password'}><Text style={s.label}>{showPassword?'HIDE':'SHOW'}</Text></Pressable></View></>}{sentTo&&<><Text style={s.label}>VERIFICATION CODE</Text><TextInput style={s.input} accessibilityLabel="Verification code" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={10}/><Pressable onPress={()=>{setSentTo(null);setCode('');}}><Text style={s.label}>CHANGE EMAIL / REQUEST NEW CODE</Text></Pressable></>}<GameButton disabled={pending||!supabase} onPress={()=>{void submit();}}>{pending?'PLEASE WAIT…':mode==='login'?'LOG IN \u2192':sentTo?'VERIFY MY UF EMAIL \u2192':'CREATE ACCOUNT'}</GameButton>{mode==='login'?<Pressable accessibilityRole="link" onPress={()=>switchMode('signup')}><Text style={{fontSize:12,color:palette.crust,textDecorationLine:'underline'}}>Don&apos;t have an account? Create account</Text></Pressable>:<Pressable accessibilityRole="link" onPress={()=>switchMode('login')}><Text style={{fontSize:12,color:palette.crust,textDecorationLine:'underline'}}>Already have an account? Log in</Text></Pressable>}</>}<Text style={s.error} accessibilityLiveRegion="polite">{message||error||(!supabase?'Supabase is not connected yet.':'')}</Text></ScrollView></KeyboardAvoidingView>;
}

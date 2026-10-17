"use client";
import {useState,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import {signupPasswordError,type AvatarConfig} from '@breadcrumb/shared';
import {createClient} from '@/lib/supabase/client';
import {worldAction} from '@/lib/world-client';
import {AvatarWorkshop} from './avatar-workshop';
export function ProfileEditor({initialUsername,initialAvatar,accountCompleted,onboarding,passwordManagedByAuth0=false}:{initialUsername:string;initialAvatar:AvatarConfig;accountCompleted:boolean;onboarding:boolean;passwordManagedByAuth0?:boolean}){
 const [username,setUsername]=useState(initialUsername),[avatar,setAvatar]=useState(initialAvatar),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[pending,setPending]=useState(false),[message,setMessage]=useState('');const router=useRouter();
 async function save(event:FormEvent){
  event.preventDefault();const chosen=username.trim().toLowerCase();if(!/^[a-z0-9][a-z0-9_.-]{2,29}$/.test(chosen)){setMessage('Use 3–30 letters, numbers, dots, underscores, or hyphens.');return;}
  // Auth0 owns passwords when configured; nothing to set here.
  if(!passwordManagedByAuth0&&(!accountCompleted||password||confirm)){const error=signupPasswordError(password,confirm);if(error){setMessage(error);return;}}
  setPending(true);setMessage('');try{const client=createClient();if(password){const {error}=await client.auth.updateUser({password});if(error&&error.code!=='same_password'){setMessage('Could not set your password. Try a stronger password or sign in again.');return;}}
   if(!accountCompleted||chosen!==initialUsername){const {error}=await client.rpc('complete_account',{p_username:chosen});if(error){setMessage(error.code==='P0001'?error.message:'Could not save your username. Check the username-account migration.');return;}}
   await worldAction('avatar',avatar);setPassword('');setConfirm('');router.replace(onboarding?'/':'/profile');router.refresh();
  }catch(e){setMessage(e instanceof Error?e.message:'Could not save your profile.');}finally{setPending(false);}
 }
 return <form onSubmit={save} className="profile-editor"><h2>{onboarding?'MAKE YOURSELF AT HOME.':'EDIT YOUR PROFILE.'}</h2><div className="auth-form"><label htmlFor="profile-username">YOUR USERNAME</label><input id="profile-username" value={username} onChange={e=>setUsername(e.target.value)} autoCapitalize="none" autoComplete="username" spellCheck={false} minLength={3} maxLength={30} required/><p className="auth-copy">Starts with your GatorLink name. Change it to make it yours.</p>{!passwordManagedByAuth0&&<><label htmlFor="profile-password">{accountCompleted?'NEW PASSWORD (OPTIONAL)':'CREATE YOUR BREADCRUMB PASSWORD'}</label><input id="profile-password" type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} maxLength={128} required={!accountCompleted}/><label htmlFor="profile-confirm">CONFIRM PASSWORD</label><input id="profile-confirm" type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} required={!accountCompleted||!!password}/></>}</div><h2>BUILD YOUR LITTLE CAMPUS SELF.</h2><AvatarWorkshop initial={initialAvatar} onChange={setAvatar} hideSave/><button className="pixel-button auth-submit" disabled={pending}>{pending?'SAVING…':onboarding?'SAVE PROFILE & EXPLORE →':'SAVE PROFILE →'}</button>{message&&<p role="status" className="auth-message">{message}</p>}</form>;
}

"use client";
import {useState} from 'react';
import {avatarOptions,defaultAvatar,type AvatarConfig} from '@breadcrumb/shared';
import {AvatarArt} from './pixel-art';
export function AvatarWorkshop({initial=defaultAvatar,onSave}:{initial?:AvatarConfig;onSave?:(avatar:AvatarConfig)=>Promise<void>}) {
 const [avatar,setAvatar]=useState<AvatarConfig>(initial),[pending,setPending]=useState(false),[error,setError]=useState('');
 async function save(){if(!onSave)return;setPending(true);try{await onSave(avatar);}catch(e){setError(e instanceof Error?e.message:'Could not save your avatar.');}finally{setPending(false);}}
 const names:Record<keyof AvatarConfig,string>={skin:'Skin tone',hair:'Hair color',hairstyle:'Hair style',shirt:'Top color',top:'Top style',pants:'Bottoms',accessory:'Accessory'};
 return <div className="workshop">
  <div className="avatar-stage"><span className="pixel-kicker">PLAYER PREVIEW</span><AvatarArt avatar={avatar} size={104}/><span className="pixel-kicker">LOOKING CRUMB-TASTIC</span></div>
  <div className="outfit-options">{(Object.keys(avatarOptions) as (keyof AvatarConfig)[]).map(key=><fieldset key={key}><legend>{names[key]}</legend><div className="option-row">{avatarOptions[key].map((option,i)=><button key={option} type="button" aria-label={`${names[key]}: ${option}`} aria-pressed={avatar[key]===i} className={`outfit-option ${avatar[key]===i?'selected':''}`} onClick={()=>setAvatar({...avatar,[key]:i})}>
   {option.startsWith('#')?<span style={{background:option}} className="color-swatch"/>:option}
  </button>)}</div></fieldset>)}</div>
  <button className="pixel-button" type="button" disabled={pending||!onSave} onClick={save}>{!onSave?'SIGN IN TO SAVE':pending?'SAVING…':'SAVE MY AVATAR →'}</button>
  {error&&<p role="alert">{error}</p>}
 </div>;
}

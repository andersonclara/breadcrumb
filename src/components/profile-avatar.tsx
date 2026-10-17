"use client";
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import type {AvatarConfig} from '@breadcrumb/shared';
import {worldAction} from '@/lib/world-client';
import {AvatarWorkshop} from './avatar-workshop';
import {AvatarArt} from './pixel-art';
export function ProfileAvatar({initial,onboarding=false}:{initial:AvatarConfig;onboarding?:boolean}){
 const [avatar,setAvatar]=useState(initial),[editing,setEditing]=useState(onboarding);const router=useRouter();
 return <section>{editing?<><AvatarWorkshop initial={avatar} onSave={async next=>{await worldAction('avatar',next);setAvatar(next);setEditing(false);if(onboarding)router.replace('/');else router.refresh();}}/>{!onboarding&&<button className="text-button" onClick={()=>setEditing(false)}>CANCEL</button>}</>:<><AvatarArt avatar={avatar} size={72}/><button className="pixel-button" onClick={()=>setEditing(true)}>EDIT AVATAR</button></>}</section>;
}

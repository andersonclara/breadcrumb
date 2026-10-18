"use client";
import {useState} from 'react';
export function PasswordReset({email}:{email:string}){
 const [pending,setPending]=useState(false),[message,setMessage]=useState('');
 async function reset(){
  setPending(true);setMessage('');
  try{
   const response=await fetch('/api/auth/reset-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});
   const result=await response.json();
   setMessage(result.message??result.error??'Could not send a password reset. Please retry.');
  }catch{setMessage('Could not connect. Please retry.');}finally{setPending(false);}
 }
 return <div><button className="text-button" type="button" disabled={pending} onClick={()=>void reset()}>{pending?'SENDING…':'EMAIL A PASSWORD RESET LINK'}</button><p role="status" className="auth-message">{message}</p></div>;
}

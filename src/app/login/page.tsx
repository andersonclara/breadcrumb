import Link from 'next/link';
import {LoginForm} from '@/components/login-form';
import {ToastLogo} from '@/components/pixel-art';
import {getSupabaseConfig} from '@/lib/env';
import {auth0Config} from '@/lib/auth/auth0';
export default async function LoginPage({searchParams}:{searchParams:Promise<{error?:string}>}){
 const {error}=await searchParams;
 return <main className="auth-page"><section className="auth-card"><Link href="/" className="auth-brand"><ToastLogo size={88}/><span>BREADCRUMB</span><small>LEAVE A CRUMB. SPREAD THE WORD.</small></Link>{error&&<p role="alert" className="auth-message">That sign-in attempt could not be completed. Please try again.</p>}<LoginForm configured={Boolean(getSupabaseConfig())} passwordSignup={Boolean(auth0Config())}/></section></main>;
}

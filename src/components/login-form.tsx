"use client";
import { useActionState } from "react";
import { sendMagicLink } from "@/app/auth/actions";

export function LoginForm({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState(sendMagicLink, { message: "", sent: false });
  return <form action={action} className="space-y-5">
    <div><label className="mb-2 block text-sm font-semibold" htmlFor="email">UF email address</label>
      <input id="email" name="email" type="email" autoComplete="email" placeholder="you@ufl.edu" required disabled={!configured || pending}
        className="w-full border-2 border-crust bg-cream px-4 py-3 disabled:opacity-50" /></div>
    <button disabled={!configured || pending} className="button w-full disabled:cursor-not-allowed disabled:opacity-50">{pending ? "Sending…" : "Email me a sign-in link"}</button>
    <p role="status" aria-live="polite" className="text-sm leading-6">{state.message || (!configured ? "Supabase is not connected yet. Anonymous browsing is available." : "No password needed. Use the link in your UF inbox to sign in.")}</p>
  </form>;
}

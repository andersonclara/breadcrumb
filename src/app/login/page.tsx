import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { getSupabaseConfig } from "@/lib/env";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <main className="mx-auto max-w-lg px-6 py-16">
    <Link href="/" className="text-sm">← Back to the map</Link>
    <p className="eyebrow mt-12">FOR THE GATOR COMMUNITY</p>
    <h1 className="mt-3 text-4xl font-semibold tracking-tight">A little local knowledge goes a long way.</h1>
    <p className="mb-8 mt-5 leading-7 text-crust/75">Browse freely. Sign in with your UF email to post, confirm, and report crumbs.</p>
    {error && <p role="alert" className="mb-5 rounded-xl bg-coral/15 p-4">That link is invalid or expired. Request a fresh one below.</p>}
    <LoginForm configured={Boolean(getSupabaseConfig())} />
  </main>;
}

import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { getSupabaseConfig } from "@/lib/env";
import { auth0 } from "@/lib/auth0";
import { breadPassLoginUrl } from "@/lib/auth/breadpass";

const errors: Record<string, string> = {
  "invalid-link": "That link is invalid or expired. Request a fresh one below.",
  "not-uf": "BreadPass needs a verified @ufl.edu email. Try again with your UF address.",
  breadpass: "We couldn't unlock your BreadPass. Please try again in a minute.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next } = await searchParams;
  const breadPass = Boolean(auth0 && getSupabaseConfig());
  return <main className="mx-auto max-w-lg px-6 py-16">
    <Link href="/" className="text-sm">← Back to the map</Link>
    <p className="eyebrow mt-12">FOR THE GATOR COMMUNITY</p>
    <h1 className="mt-3 text-4xl font-semibold tracking-tight">{breadPass ? "Claim your BreadPass." : "A little local knowledge goes a long way."}</h1>
    <p className="mb-8 mt-5 leading-7 text-crust/75">{breadPass
      ? "Browse freely. Verify your UF email to post, confirm, and report crumbs anonymously."
      : "Browse freely. Sign in with your UF email to post, confirm, and report crumbs."}</p>
    {error && <p role="alert" className="mb-5 rounded-xl bg-coral/15 p-4">{errors[error] ?? errors.breadpass}</p>}
    {breadPass ? <div className="space-y-5">
      {/* A plain link: the Auth0 login route must be a full navigation, not a client-side fetch. */}
      <a href={breadPassLoginUrl(next, { fresh: error === "not-uf" })} className="button block w-full text-center">Claim your BreadPass</a>
      <p className="text-sm leading-6">Enter your UF email. We&apos;ll send a one-time code. No password needed. Your posts never show your name or email.</p>
    </div> : <LoginForm configured={Boolean(getSupabaseConfig())} />}
  </main>;
}

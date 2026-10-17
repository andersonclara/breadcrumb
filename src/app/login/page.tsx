
import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { ToastLogo } from "@/components/pixel-art";
import { getSupabaseConfig } from "@/lib/env";
import { auth0 } from "@/lib/auth0";
import { breadPassLoginUrl } from "@/lib/auth/breadpass";

const errors: Record<string, string> = {
  "invalid-link":
    "That link is invalid or expired. Request a fresh one below.",
  "not-uf":
    "BreadPass needs a verified @ufl.edu email. Try again with your UF address.",
  breadpass:
    "We couldn't unlock your BreadPass. Please try again in a minute.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const configured = Boolean(getSupabaseConfig());
  const breadPass = Boolean(auth0 && configured);

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link href="/" className="auth-brand">
          <ToastLogo size={88} />
          <span>BREADCRUMB</span>
          <small>LEAVE A CRUMB. SPREAD THE WORD.</small>
        </Link>

        <h1>
          {breadPass
            ? "Claim your BreadPass."
            : "A little local knowledge goes a long way."}
        </h1>

        <p>
          {breadPass
            ? "Browse freely. Verify your UF email to post, confirm, and report crumbs anonymously."
            : "Browse freely. Sign in with your UF email to post, confirm, and report crumbs."}
        </p>

        {error && (
          <p role="alert" className="auth-message">
            {errors[error] ?? errors.breadpass}
          </p>
        )}

        {breadPass ? (
          <div className="space-y-5">
            <a
              href={breadPassLoginUrl(next, {
                fresh: error === "not-uf",
              })}
              className="button block w-full text-center"
            >
              Claim your BreadPass
            </a>

            <p className="text-sm leading-6">
              Enter your UF email. We&apos;ll send a one-time code.
              No password needed. Your posts never show your name
              or email.
            </p>
          </div>
        ) : (
          <LoginForm configured={configured} />
        )}
      </section>
    </main>
  );
}

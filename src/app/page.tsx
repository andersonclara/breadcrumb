import Link from "next/link";
import { CampusMap } from "@/components/campus-map";
import { categories } from "@/lib/crumbs";

export default function Home() {
  return <main className="mx-auto flex min-h-screen max-w-[1600px] flex-col">
    <header className="flex items-center justify-between border-b border-crust/10 px-5 py-5 md:px-10">
      <Link href="/" className="flex items-center gap-3 text-xl font-bold tracking-tight"><span aria-hidden="true" className="bread-mark">b.</span> breadcrumb<span className="ml-2 hidden text-xs font-medium tracking-wide text-crust/50 sm:inline">UNIVERSITY OF FLORIDA</span></Link>
      <Link href="/login" className="rounded-full border border-crust/25 px-5 py-2 text-sm font-semibold hover:bg-toasted/15">Sign in</Link>
    </header>
    <div className="grid flex-1 lg:grid-cols-[340px_1fr]">
      <aside className="px-6 py-8 lg:px-8 lg:py-12">
        <p className="eyebrow">A LITTLE CLOSER TO CAMPUS</p>
        <h1 className="mt-4 text-4xl font-semibold leading-[1.12] tracking-tight">Leave a crumb.<br /><span className="text-crust/50">Spread the word.</span></h1>
        <p className="mt-5 max-w-md text-sm leading-7 text-crust/75">A shared map of what’s happening around UF. Little discoveries, fresh updates, and the people who see them.</p>
        <div className="mt-8 flex flex-wrap gap-2" aria-label="Crumb categories">
          {categories.map(category => <span key={category.id} className="flex items-center gap-2 rounded-full border border-crust/15 bg-white/50 px-3 py-2 text-xs font-medium"><span aria-hidden="true" style={{ color: category.color }}>{category.icon}</span>{category.label}</span>)}
        </div>
        <div className="mt-9 border-t border-crust/15 pt-6">
          <h2 className="font-semibold">Better with a few witnesses.</h2>
          <p className="mt-2 text-sm leading-6 text-crust/70">A Crumb rises to a Full Loaf with three independent confirmations. Community corroborated, never official verification.</p>
        </div>
        <p className="mt-7 text-xs leading-5 text-crust/55">Foundation preview · Posting and live campus data are coming next.</p>
      </aside>
      <section className="relative min-h-[460px] overflow-hidden border-y border-crust/10 lg:border-y-0 lg:border-l" aria-label="UF campus map"><CampusMap /></section>
    </div>
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-crust/10 px-6 py-4 text-xs text-crust/65 md:px-10">
      <p>Made for the moments between classes.</p><p>Community reports · Not an official alert service</p>
    </footer>
  </main>;
}

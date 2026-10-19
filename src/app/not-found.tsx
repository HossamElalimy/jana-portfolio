import type { Metadata } from "next";
import Link from "next/link";

import { copy } from "@/lib/content";

export const metadata: Metadata = {
  title: "404",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="nf">
      <Link href="/" className="brand-name nf-brand">
        {copy.brand}
      </Link>
      <p className="nf-code" aria-hidden="true">
        404
      </p>
      <div className="nf-grid">
        <h1 className="nf-title display">{copy.notFound.title}</h1>
        <p>
          {copy.notFound.body} <Link href="/">{copy.notFound.back}</Link>
        </p>
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";

export default function PalettesError({
  unstable_retry,
}: {
  unstable_retry: () => void;
}) {
  return (
    <main className="not-found-shell">
      <p className="empty-code">503 / CATALOG UNAVAILABLE</p>
      <h1>The palette archive is unavailable.</h1>
      <p>Its color records could not be loaded. Try again or return home.</p>
      <div className="flex flex-wrap gap-3">
        <button className="primary-button" type="button" onClick={unstable_retry}>
          Reload catalog
        </button>
        <Link className="secondary-button" href="/">
          Return home
        </Link>
      </div>
    </main>
  );
}

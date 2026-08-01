import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found-shell">
      <p className="empty-code">404 / MISSING</p>
      <h1>That page is not in Pigment.</h1>
      <p>Return home to open the studio, lessons, or palette catalog.</p>
      <Link className="primary-button" href="/">
        Return home
      </Link>
    </main>
  );
}

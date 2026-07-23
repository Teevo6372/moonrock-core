import Link from "next/link";

export default function Home() {
  return (
    <main>
      <p className="eyebrow">Moonrock Enterprises</p>
      <h1>Commerce OS</h1>
      <p className="summary">
        Internal commerce intelligence for evaluating opportunities, protecting
        margin, and improving realized outcomes.
      </p>
      <section aria-labelledby="manual-evaluation">
        <h2 id="manual-evaluation">Manual opportunity evaluation</h2>
        <p>
          Record supplier evidence and evaluate expected profit with
          database-owned marketplace assumptions.
        </p>
        <Link className="button-link" href="/opportunities/new">
          Start an evaluation
        </Link>
      </section>
    </main>
  );
}

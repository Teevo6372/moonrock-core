const readiness = [
  "Typed application foundation",
  "Relational schema and migrations",
  "Automated validation pipeline",
  "Health endpoint",
];

export default function Home() {
  return (
    <main>
      <p className="eyebrow">Moonrock Enterprises</p>
      <h1>Commerce OS</h1>
      <p className="summary">
        Internal commerce intelligence for evaluating opportunities, protecting margin, and improving realized outcomes.
      </p>
      <section aria-labelledby="foundation-status">
        <h2 id="foundation-status">Foundation status</h2>
        <ul>
          {readiness.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}

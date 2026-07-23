import Link from "next/link";

import { getOpportunityOptions } from "@/services/opportunity-service";

import { OpportunityForm } from "../opportunity-form";

export const dynamic = "force-dynamic";

export default async function NewOpportunityPage() {
  const options = await getOpportunityOptions();
  return (
    <main>
      <Link href="/" className="back-link">
        ← Commerce OS
      </Link>
      <p className="eyebrow">Manual workflow</p>
      <h1>Evaluate an opportunity</h1>
      <p className="summary">
        Capture normalized product and supplier evidence, apply the current
        marketplace fee profile, and preserve an auditable calculation snapshot.
      </p>
      <OpportunityForm options={options} />
    </main>
  );
}

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("manual opportunity form", () => {
  const component = readFileSync(
    new URL("./opportunity-form.tsx", import.meta.url),
    "utf8",
  );
  const styles = readFileSync(
    new URL("../styles.css", import.meta.url),
    "utf8",
  );

  it("associates every form control with an accessible label", () => {
    const ids = [
      ...component.matchAll(/<(?:input|select|textarea) id="([^"]+)"/g),
    ].map((match) => match[1]);
    expect(ids.length).toBeGreaterThanOrEqual(10);
    for (const id of ids) {
      expect(component).toContain(`<label htmlFor="${id}">`);
    }
  });

  it("provides a single-column mobile layout and full-width primary action", () => {
    expect(styles).toContain("@media (max-width: 640px)");
    expect(styles).toMatch(/\.grid,[\s\S]*grid-template-columns: 1fr/);
    expect(styles).toMatch(/\.actions button \{[\s\S]*width: 100%/);
  });
});

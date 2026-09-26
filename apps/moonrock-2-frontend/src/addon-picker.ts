import { getAddonOffers } from "./api.js";
import type { AddonOffer } from "./types.js";

/**
 * Optional Launch add-on picker shown inside the Flight Plan save card.
 * Nova's suggestions only highlight and sort rows ("Suggested by Nova"); nothing
 * is ever pre-ticked, so the visitor always opts in themselves with the price in view.
 * The list comes from the server (only add-ons that can actually be charged), and if
 * it can't be loaded the picker stays hidden and checkout proceeds without add-ons.
 */

const suggested = new Set<string>();
let offers: AddonOffer[] = [];
let selected = new Set<string>();
let launchMonthlyUsd = 0;
let mounted: HTMLElement | undefined;

window.addEventListener("nova:addon-suggestions", (event) => {
  for (const id of (event as CustomEvent<string[]>).detail) suggested.add(id);
  if (mounted?.isConnected && offers.length > 0) render(mounted);
});

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char]!);

/** The add-on ids the visitor ticked, in the order shown. Sent as-is to checkout. */
export function selectedAddonIds(): string[] {
  return offers.filter((offer) => selected.has(offer.id)).map((offer) => offer.id);
}

function render(container: HTMLElement): void {
  const ordered = [...offers].sort((a, b) => Number(suggested.has(b.id)) - Number(suggested.has(a.id)));
  const total = launchMonthlyUsd + ordered.filter((offer) => selected.has(offer.id)).reduce((sum, offer) => sum + offer.monthlyFeeUsd, 0);
  container.innerHTML = `
    <fieldset class="addon-picker">
      <legend>Add to your Launch Plan <span class="optional">optional</span></legend>
      ${ordered.map((offer) => `
        <label class="addon-row">
          <input type="checkbox" name="addon" value="${escapeHtml(offer.id)}"${selected.has(offer.id) ? " checked" : ""}>
          <span class="addon-name"><span class="addon-title">${escapeHtml(offer.name)}${suggested.has(offer.id) ? '<span class="addon-suggested">Suggested by Nova</span>' : ""}</span><span class="addon-summary">${escapeHtml(offer.summary)}</span></span>
          <span class="addon-price">+$${offer.monthlyFeeUsd}/mo</span>
        </label>`).join("")}
      <p class="addon-total"><span>Monthly total</span><strong>$${total}/mo</strong></p>
    </fieldset>`;
  container.querySelectorAll<HTMLInputElement>("input[name=addon]").forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) selected.add(input.value); else selected.delete(input.value);
      render(container);
      container.querySelector<HTMLInputElement>(`input[value="${input.value}"]`)?.focus();
    });
  });
}

/** Fills `container` with the picker. Leaves it empty and hidden when no add-ons are purchasable or the list can't be loaded. */
export async function mountAddonPicker(container: HTMLElement, monthlyFeeUsd: number): Promise<void> {
  container.hidden = true;
  launchMonthlyUsd = monthlyFeeUsd;
  selected = new Set();
  mounted = container;
  try {
    offers = (await getAddonOffers()).addons;
  } catch {
    offers = [];
  }
  if (offers.length === 0 || !container.isConnected) return;
  render(container);
  container.hidden = false;
}

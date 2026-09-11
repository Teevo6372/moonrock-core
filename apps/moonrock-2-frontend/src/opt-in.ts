import { submitOptIn } from "./api.js";

function statusElement(): HTMLElement | null {
  return document.querySelector<HTMLElement>("#opt-in-status");
}

function setStatus(message: string): void {
  const status = statusElement();
  if (status) status.textContent = message;
}

function normalizePhone(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("+")) {
    const digits = trimmed.slice(1).replace(/\D/g, "");
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : undefined;
  }
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return undefined;
}

function wireForm(): void {
  const form = document.querySelector<HTMLFormElement>("#opt-in-form");
  if (!form) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void handleSubmit(form);
  });
}

async function handleSubmit(form: HTMLFormElement): Promise<void> {
  const data = new FormData(form);
  const rawPhone = String(data.get("phone") ?? "");
  const phone = normalizePhone(rawPhone);
  if (!phone) {
    setStatus("Please enter a valid phone number, e.g. (555) 123-4567.");
    return;
  }
  const optedIn = Boolean(data.get("smsOptIn"));
  const firstName = String(data.get("firstName") ?? "").trim();
  const lastName = String(data.get("lastName") ?? "").trim();
  const email = String(data.get("email") ?? "").trim();

  form.querySelectorAll<HTMLInputElement | HTMLButtonElement>("input,button").forEach((element) => {
    element.disabled = true;
  });
  setStatus(optedIn ? "Saving your opt-in…" : "Saving your opt-out…");
  try {
    const response = await submitOptIn({
      phone,
      optedIn,
      ...(firstName ? { firstName } : {}),
      ...(lastName ? { lastName } : {}),
      ...(email ? { email } : {}),
    });
    setStatus(response.message);
    form.reset();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Moonrock could not save this preference right now. Please try again.");
  } finally {
    form.querySelectorAll<HTMLInputElement | HTMLButtonElement>("input,button").forEach((element) => {
      element.disabled = false;
    });
  }
}

wireForm();

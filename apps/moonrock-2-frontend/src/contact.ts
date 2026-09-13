import { submitContactForm } from "./api.js";

function statusElement(): HTMLElement | null {
  return document.querySelector<HTMLElement>("#form-status");
}

function setStatus(message: string, state?: "ok" | "error"): void {
  const status = statusElement();
  if (!status) return;
  status.textContent = message;
  if (state) status.dataset.state = state;
  else status.removeAttribute("data-state");
}

function wireForm(): void {
  const form = document.querySelector<HTMLFormElement>("#contact-form");
  if (!form) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void handleSubmit(form);
  });
}

async function handleSubmit(form: HTMLFormElement): Promise<void> {
  const data = new FormData(form);
  const name = String(data.get("name") ?? "").trim();
  const email = String(data.get("email") ?? "").trim();
  const message = String(data.get("message") ?? "").trim();
  const phone = String(data.get("phone") ?? "").trim();

  form.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLTextAreaElement>("input,textarea,button").forEach((element) => {
    element.disabled = true;
  });
  setStatus("Sending...");
  try {
    const response = await submitContactForm({ name, email, message, ...(phone ? { phone } : {}) });
    setStatus(response.answer, "ok");
    form.reset();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Something went wrong. Please email or call us directly.", "error");
  } finally {
    form.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLTextAreaElement>("input,textarea,button").forEach((element) => {
      element.disabled = false;
    });
  }
}

wireForm();

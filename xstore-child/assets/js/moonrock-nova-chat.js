(() => {
  "use strict";

  const config = window.MoonrockNovaConfig || {};
  const runtimeUrl = String(config.runtimeUrl || "").replace(/\/$/, "");
  const modal = document.querySelector("#nova-chat");
  const conversation = modal?.querySelector("[data-nova-conversation]");
  const form = modal?.querySelector("[data-nova-form]");
  const input = modal?.querySelector("[data-nova-input]");
  const status = modal?.querySelector("[data-nova-status]");
  const openers = document.querySelectorAll('a[href="#nova-chat"]');

  if (!modal || !conversation || !form || !input || !status || !runtimeUrl || !openers.length) return;

  let session = null;
  let sequence = 0;
  let starting = null;
  let previousFocus = null;

  const clientContext = () => ({
    locale: document.documentElement.lang || "en-US",
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  });

  const pageContext = () => ({
    path: window.location.pathname || config.pagePath || "/",
    referrerClass: document.referrer && new URL(document.referrer).origin !== window.location.origin ? "external" : "internal"
  });

  const makeId = () => window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  function appendMessage(speaker, text) {
    const message = document.createElement("div");
    message.className = `mr-nova-chat__message mr-nova-chat__message--${speaker}`;

    const label = document.createElement("strong");
    label.textContent = speaker === "visitor" ? "You" : "Nova";

    const body = document.createElement("p");
    body.textContent = text;

    message.append(label, body);
    conversation.append(message);
    conversation.scrollTop = conversation.scrollHeight;
  }

  async function request(path, body) {
    const response = await fetch(`${runtimeUrl}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store"
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || data.title || "Nova could not complete that request.");
    return data;
  }

  async function startSession() {
    if (session) return session;
    if (starting) return starting;

    status.textContent = "Connecting to Nova…";
    starting = request("/v1/sessions", {
      client: clientContext(),
      page: pageContext()
    })
      .then((created) => {
        session = created;
        sequence = 0;
        appendMessage("nova", created.disclosure?.aiIdentityText || "I’m Nova, Moonrock’s AI Website Advisor—not a human.");
        status.textContent = "";
        return created;
      })
      .catch((error) => {
        status.textContent = "Nova is temporarily unavailable. Please try again shortly.";
        throw error;
      })
      .finally(() => {
        starting = null;
      });

    return starting;
  }

  async function openModal(event) {
    event?.preventDefault();
    previousFocus = document.activeElement;
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("mr-nova-chat-open");
    window.history.replaceState(null, "", "#nova-chat");
    input.focus();

    try {
      await startSession();
    } catch (error) {
      console.error("Nova session startup failed", error);
    }
  }

  function closeModal() {
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("mr-nova-chat-open");
    if (window.location.hash === "#nova-chat") {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }
    if (previousFocus instanceof HTMLElement) previousFocus.focus();
  }

  openers.forEach((opener) => opener.addEventListener("click", openModal));
  modal.querySelectorAll("[data-nova-close]").forEach((control) => control.addEventListener("click", closeModal));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) closeModal();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    appendMessage("visitor", text);
    status.textContent = "Nova is considering your request…";
    form.querySelector("button")?.setAttribute("disabled", "disabled");

    try {
      const activeSession = await startSession();
      const reply = await request(`/v1/sessions/${activeSession.sessionId}/messages`, {
        messageId: makeId(),
        sequence: ++sequence,
        text,
        client: clientContext(),
        page: pageContext()
      });
      appendMessage("nova", reply.publicMessage || "I’m ready to help with the next step.");
      status.textContent = "";
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : "Nova is temporarily unavailable.";
    } finally {
      form.querySelector("button")?.removeAttribute("disabled");
      input.focus();
    }
  });

  if (window.location.hash === "#nova-chat") openModal();
})();

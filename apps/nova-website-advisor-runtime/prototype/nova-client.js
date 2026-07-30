const conversation = document.querySelector("#conversation");
const messageForm = document.querySelector("#message-form");
const handoffForm = document.querySelector("#handoff-form");
const status = document.querySelector("#status");
let session;
let sequence = 0;

function append(speaker, text) {
  const item = document.createElement("p");
  item.className = `message ${speaker === "You" ? "visitor" : "nova"}`;
  const label = document.createElement("strong");
  label.textContent = `${speaker}: `;
  item.append(label, document.createTextNode(text));
  conversation.append(item);
}

async function request(path, body) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || data.title || "Request failed");
  return data;
}

async function start() {
  session = await request("/v1/sessions", {
    client: { locale: "en-US", timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" },
    page: { path: location.pathname, referrerClass: "internal" },
  });
  append("Nova", session.disclosure.aiIdentityText);
}

messageForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = document.querySelector("#message");
  const text = input.value.trim();
  if (!text) return;
  append("You", text);
  input.value = "";
  status.textContent = "Nova is considering your request…";
  try {
    const reply = await request(`/v1/sessions/${session.sessionId}/messages`, {
      messageId: crypto.randomUUID(),
      sequence: ++sequence,
      text,
      client: { locale: "en-US", timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" },
      page: { path: location.pathname, referrerClass: "internal" },
    });
    append("Nova", reply.publicMessage);
    status.textContent = "";
  } catch (error) {
    status.textContent = error.message;
  }
});

document.querySelector("#handoff").addEventListener("click", () => {
  handoffForm.hidden = false;
  document.querySelector("#name").focus();
});

handoffForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  status.textContent = "Recording your consent and request…";
  try {
    await request(`/v1/sessions/${session.sessionId}/consents`, {
      actionId: crypto.randomUUID(),
      category: "save_contact",
      action: "grant",
      disclosureVersion: session.disclosure.version,
      affirmativeControlId: "save-contact",
    });
    const reply = await request(`/v1/sessions/${session.sessionId}/handoffs`, {
      actionId: crypto.randomUUID(),
      route: "general_advisor",
      contact: {
        firstName: document.querySelector("#name").value.trim(),
        email: document.querySelector("#email").value.trim(),
        preferredChannel: "email",
      },
    });
    append("Nova", reply.publicMessage);
    handoffForm.hidden = true;
    status.textContent = "";
  } catch (error) {
    status.textContent = error.message;
  }
});

start().catch((error) => { status.textContent = error.message; });

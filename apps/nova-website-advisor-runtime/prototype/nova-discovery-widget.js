(() => {
  const script = document.currentScript;
  const apiBase = (script?.dataset.apiBase || (script?.src ? new URL(script.src).origin : window.location.origin)).replace(/\/$/, "");

  class MoonrockNovaDiscovery extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.sessionId = null;
      this.identity = null;
      this.path = null;
      this.response = null;
      this.busy = false;
    }

    connectedCallback() {
      this.renderWelcome();
    }

    async request(path, body) {
      const response = await fetch(`${apiBase}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await response.text();
      let data;
      try { data = text ? JSON.parse(text) : {}; } catch { data = { detail: text }; }
      if (!response.ok) throw new Error(data.detail || data.title || `Nova request failed (${response.status})`);
      return data;
    }

    renderShell(content) {
      this.shadowRoot.innerHTML = `
        <style>${styles}</style>
        <section class="nova-shell" aria-live="polite">
          <div class="nova-orb" aria-hidden="true"><span>N</span></div>
          <div class="nova-panel">${content}</div>
        </section>`;
    }

    renderWelcome() {
      this.renderShell(`
        <div class="eyebrow">MOONROCK 2.0 • NOVA</div>
        <h2>Let’s build your Flight Plan.</h2>
        <p class="lede">I’m Nova, Moonrock’s AI Growth Advisor. I’ll ask a few focused questions, diagnose where momentum is getting stuck, and build a practical AI Employee recommendation.</p>
        <form id="start-form" class="stack">
          <div class="grid">
            <label>First name<input name="firstName" autocomplete="given-name" required></label>
            <label>Last name<input name="lastName" autocomplete="family-name"></label>
          </div>
          <label>Email<input name="email" type="email" autocomplete="email" required></label>
          <label>Business or project name <span class="muted">(optional)</span><input name="businessName" autocomplete="organization"></label>
          <fieldset>
            <legend>Which path fits you today?</legend>
            <div class="path-grid">
              <label class="path-card"><input type="radio" name="path" value="startup" required><strong>I’m starting something</strong><span>Turn an idea into a practical launch Flight Plan.</span></label>
              <label class="path-card"><input type="radio" name="path" value="existing_business" required><strong>My business needs to grow</strong><span>Find the bottlenecks slowing leads, sales and operations.</span></label>
            </div>
          </fieldset>
          <button class="primary" type="submit">START WITH NOVA</button>
          <p class="fine">By continuing, you’re asking Nova to use the information you provide to create your Moonrock Flight Plan and CRM record. Don’t share passwords, payment-card details, government IDs, or other sensitive information.</p>
          <p id="status" class="status" role="status"></p>
        </form>`);
      this.shadowRoot.querySelector("#start-form").addEventListener("submit", (event) => this.start(event));
    }

    async start(event) {
      event.preventDefault();
      if (this.busy) return;
      this.busy = true;
      const form = new FormData(event.currentTarget);
      this.path = String(form.get("path"));
      const firstName = String(form.get("firstName") || "").trim();
      const lastName = String(form.get("lastName") || "").trim();
      const businessName = String(form.get("businessName") || "").trim();
      this.identity = {
        email: String(form.get("email") || "").trim(),
        firstName,
        ...(lastName ? { lastName } : {}),
        ...(businessName ? { companyName: businessName } : {}),
      };
      this.seedBusinessName = businessName;
      this.setStatus("Nova is opening your discovery session…");
      try {
        this.sessionId = crypto.randomUUID();
        this.response = await this.request(`/v1/discovery/${this.sessionId}/start`, { path: this.path });
        if (this.seedBusinessName && this.response.nextQuestion?.field === "businessName") {
          this.response = await this.submitAnswer("businessName", this.seedBusinessName);
        }
        this.renderResponse();
      } catch (error) {
        this.busy = false;
        this.setStatus(error instanceof Error ? error.message : "Nova could not start the discovery session.", true);
      }
    }

    async submitAnswer(field, value) {
      return this.request(`/v1/discovery/${this.sessionId}/answers`, {
        field,
        value,
        identity: this.identity,
      });
    }

    renderResponse() {
      this.busy = false;
      if (this.response?.completed && this.response.result) {
        this.renderResult();
        return;
      }
      const q = this.response?.nextQuestion;
      if (!q) {
        this.renderError("Nova didn’t receive the next discovery question. Please restart the session.");
        return;
      }
      const progress = Math.max(8, Math.min(95, Number(this.response?.view?.progressPercent || 0)));
      this.renderShell(`
        <div class="eyebrow">${escapeHtml(this.response?.view?.eyebrow || "GROWTH DIAGNOSIS")}</div>
        <div class="progress"><span style="width:${progress}%"></span></div>
        <h2>${escapeHtml(q.prompt)}</h2>
        ${q.helpText ? `<p class="lede">${escapeHtml(q.helpText)}</p>` : ""}
        <form id="answer-form" class="stack">
          ${questionControl(q)}
          <button class="primary" type="submit">CONTINUE</button>
          <p id="status" class="status" role="status"></p>
        </form>`);
      this.shadowRoot.querySelector("#answer-form").addEventListener("submit", (event) => this.answer(event, q));
    }

    async answer(event, question) {
      event.preventDefault();
      if (this.busy) return;
      this.busy = true;
      const form = new FormData(event.currentTarget);
      let value = form.get("answer");
      if (question.answerType === "number") value = Number(value);
      if (question.answerType === "boolean") value = value === "true";
      this.setStatus("Nova is updating your diagnosis…");
      try {
        this.response = await this.submitAnswer(question.field, value);
        this.renderResponse();
      } catch (error) {
        this.busy = false;
        this.setStatus(error instanceof Error ? error.message : "Nova could not save that answer.", true);
      }
    }

    renderResult() {
      const result = this.response.result;
      const plan = result.flightPlan;
      const recommendation = plan.recommendation;
      const opportunity = plan.opportunity;
      const handoff = this.response.ghlHandoff;
      this.renderShell(`
        <div class="eyebrow">YOUR MOONROCK FLIGHT PLAN</div>
        <div class="progress"><span style="width:100%"></span></div>
        <h2>${escapeHtml(plan.headline)}</h2>
        <p class="lede">${escapeHtml(recommendation.reason)}</p>
        <div class="result-card">
          <span class="kicker">RECOMMENDED AI EMPLOYEE</span>
          <h3>${escapeHtml(recommendation.offerName)}</h3>
          <div class="price"><strong>$${Number(recommendation.monthlyFeeUsd).toLocaleString()}</strong><span>/month</span></div>
          <p>$${Number(recommendation.setupFeeUsd).toLocaleString()} setup</p>
        </div>
        ${opportunity?.monthlyOpportunityUsd != null ? `<div class="opportunity"><span>Estimated monthly opportunity identified</span><strong>$${Number(opportunity.monthlyOpportunityUsd).toLocaleString()}</strong><small>${escapeHtml(opportunity.disclaimer)}</small></div>` : ""}
        <div class="bottlenecks">
          <span class="kicker">PRIMARY BOTTLENECKS</span>
          ${plan.primaryBottlenecks.map((item) => `<div><strong>${escapeHtml(humanize(item.id))}</strong><span>${escapeHtml(item.explanation)}</span></div>`).join("")}
        </div>
        <p class="success">${handoff?.status === "confirmed" ? "Your Flight Plan has been saved with Moonrock." : "Your Flight Plan is ready."}</p>
        <p class="fine">${plan.disclosures.map(escapeHtml).join(" ")}</p>
        <button id="restart" class="secondary" type="button">START ANOTHER FLIGHT PLAN</button>`);
      this.shadowRoot.querySelector("#restart").addEventListener("click", () => {
        this.sessionId = null;
        this.identity = null;
        this.response = null;
        this.renderWelcome();
      });
      this.dispatchEvent(new CustomEvent("nova-flight-plan-complete", { bubbles: true, composed: true, detail: { sessionId: this.sessionId, result, ghlHandoff: handoff } }));
    }

    renderError(message) {
      this.renderShell(`<div class="eyebrow">NOVA</div><h2>Something interrupted the session.</h2><p class="lede">${escapeHtml(message)}</p><button id="restart" class="primary">TRY AGAIN</button>`);
      this.shadowRoot.querySelector("#restart").addEventListener("click", () => this.renderWelcome());
    }

    setStatus(message, error = false) {
      const node = this.shadowRoot.querySelector("#status");
      if (!node) return;
      node.textContent = message;
      node.classList.toggle("error", error);
    }
  }

  function questionControl(q) {
    const help = q.helpText ? ` aria-describedby="question-help"` : "";
    if (q.answerType === "boolean") {
      return `<div class="choice-grid"><label class="choice"><input type="radio" name="answer" value="true" required><span>Yes</span></label><label class="choice"><input type="radio" name="answer" value="false" required><span>No</span></label></div>`;
    }
    if (q.answerType === "single_select") {
      return `<div class="choice-grid">${(q.options || []).map((option) => `<label class="choice"><input type="radio" name="answer" value="${escapeAttr(option)}" required><span>${escapeHtml(humanize(option))}</span></label>`).join("")}</div>`;
    }
    if (q.answerType === "number") return `<input class="answer" name="answer" type="number" min="0" step="any" required${help}>`;
    return `<input class="answer" name="answer" type="text" required${help}>`;
  }

  function humanize(value) {
    return String(value || "").replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  }

  function escapeAttr(value) { return escapeHtml(value); }

  const styles = `
    :host{display:block;--pink:#ff2bbd;--violet:#8b5cf6;--cyan:#22d3ee;--ink:#f8f7ff;--muted:#b8b2cb;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--ink)}
    *{box-sizing:border-box}.nova-shell{position:relative;overflow:hidden;display:grid;grid-template-columns:84px 1fr;gap:22px;padding:24px;border:1px solid rgba(255,255,255,.14);border-radius:26px;background:radial-gradient(circle at 8% 8%,rgba(139,92,246,.25),transparent 28%),radial-gradient(circle at 90% 10%,rgba(34,211,238,.15),transparent 24%),rgba(8,6,20,.92);box-shadow:0 20px 70px rgba(0,0,0,.35),0 0 45px rgba(255,43,189,.08)}
    .nova-orb{width:72px;height:72px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(145deg,var(--pink),var(--violet),var(--cyan));box-shadow:0 0 32px rgba(255,43,189,.35);padding:2px}.nova-orb span{width:100%;height:100%;display:grid;place-items:center;border-radius:50%;background:#0b0818;font-weight:900;font-size:28px}
    .nova-panel{min-width:0}.eyebrow,.kicker{font-size:12px;letter-spacing:.16em;font-weight:800;color:#eeb6ff}.eyebrow{margin:2px 0 10px}h2{font-size:clamp(25px,4vw,42px);line-height:1.05;margin:0 0 14px}h3{font-size:24px;margin:5px 0 10px}.lede{font-size:16px;line-height:1.65;color:var(--muted);max-width:760px}.stack{display:grid;gap:15px;margin-top:20px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}label{display:grid;gap:7px;font-size:13px;font-weight:700;color:#ddd7ed}input,.answer{width:100%;border:1px solid rgba(255,255,255,.16);border-radius:12px;background:rgba(255,255,255,.06);color:#fff;padding:13px 14px;font:inherit;outline:none}input:focus{border-color:var(--cyan);box-shadow:0 0 0 3px rgba(34,211,238,.12)}fieldset{border:0;padding:0;margin:4px 0}legend{font-size:13px;font-weight:800;margin-bottom:10px}.path-grid,.choice-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.path-card,.choice{position:relative;display:grid;gap:5px;border:1px solid rgba(255,255,255,.14);border-radius:16px;padding:15px;background:rgba(255,255,255,.04);cursor:pointer}.path-card input,.choice input{position:absolute;opacity:0;pointer-events:none}.path-card:has(input:checked),.choice:has(input:checked){border-color:var(--pink);background:rgba(255,43,189,.1);box-shadow:0 0 0 2px rgba(255,43,189,.12)}.path-card span{font-size:12px;line-height:1.45;color:var(--muted)}.choice span{text-align:center;font-weight:800}.primary,.secondary{border:0;border-radius:999px;padding:13px 20px;font-weight:900;letter-spacing:.04em;cursor:pointer}.primary{color:#080612;background:linear-gradient(90deg,var(--pink),#b96cff,var(--cyan));box-shadow:0 8px 28px rgba(255,43,189,.18)}.secondary{color:#fff;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14)}.fine{font-size:11px;line-height:1.55;color:#89839a}.muted{color:#89839a;font-weight:500}.status{min-height:1.3em;margin:0;color:var(--cyan);font-size:12px}.status.error{color:#ff8cad}.progress{height:5px;background:rgba(255,255,255,.08);border-radius:99px;overflow:hidden;margin:4px 0 18px}.progress span{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,var(--pink),var(--cyan));transition:width .3s ease}.result-card,.opportunity,.bottlenecks{margin-top:18px;border:1px solid rgba(255,255,255,.12);border-radius:18px;padding:18px;background:rgba(255,255,255,.045)}.price{display:flex;align-items:baseline;gap:5px}.price strong{font-size:38px}.price span,.result-card p{color:var(--muted)}.opportunity{display:grid;gap:4px}.opportunity>span{font-size:13px;color:var(--muted)}.opportunity>strong{font-size:30px;color:#baf7ff}.opportunity small{color:#858093;line-height:1.45}.bottlenecks>div{display:grid;gap:3px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.08)}.bottlenecks>div:last-child{border-bottom:0}.bottlenecks span{font-size:12px;color:var(--muted);line-height:1.45}.success{font-weight:800;color:#b7f7dc;margin-top:18px}
    @media(max-width:640px){.nova-shell{grid-template-columns:1fr;padding:18px;border-radius:20px}.nova-orb{width:58px;height:58px}.grid,.path-grid,.choice-grid{grid-template-columns:1fr}h2{font-size:28px}}
  `;

  if (!customElements.get("moonrock-nova-discovery")) customElements.define("moonrock-nova-discovery", MoonrockNovaDiscovery);
})();

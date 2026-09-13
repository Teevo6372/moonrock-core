const NAV_LINKS: Array<{ href: string; label: string }> = [
  { href: "/", label: "Home" },
  { href: "/about.html", label: "About" },
  { href: "/services.html", label: "Services" },
  { href: "/contact.html", label: "Contact" },
  { href: "/privacy-policy.html", label: "Privacy Policy" },
  { href: "/terms-of-service.html", label: "Terms of Service" },
  { href: "/opt-in.html", label: "SMS Opt-In / Opt-Out" },
];

const STYLE = `
.site-nav-root { position: fixed; top: 18px; right: 18px; z-index: 200; }
.site-nav-toggle {
  width: 46px; height: 46px; border-radius: 50%;
  border: 1px solid rgba(255,255,255,.18);
  background: rgba(9,9,25,.7);
  backdrop-filter: blur(6px);
  display: grid; place-items: center; gap: 5px;
  cursor: pointer; padding: 0;
}
.site-nav-toggle:hover { border-color: #ff4fd8; }
.site-nav-toggle span { display: block; width: 20px; height: 2px; background: #f8f7ff; border-radius: 2px; transition: transform .18s ease, opacity .18s ease; }
.site-nav-root[data-open="true"] .site-nav-toggle span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
.site-nav-root[data-open="true"] .site-nav-toggle span:nth-child(2) { opacity: 0; }
.site-nav-root[data-open="true"] .site-nav-toggle span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
.site-nav-panel {
  position: absolute; top: 56px; right: 0;
  min-width: 220px;
  border: 1px solid rgba(255,255,255,.14);
  border-radius: 16px;
  background: rgba(9,9,25,.92);
  backdrop-filter: blur(10px);
  box-shadow: 0 30px 80px rgba(0,0,0,.5);
  padding: 10px;
  display: none;
  flex-direction: column;
}
.site-nav-root[data-open="true"] .site-nav-panel { display: flex; }
.site-nav-panel a {
  color: #f8f7ff; text-decoration: none; font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  font-size: .95rem; padding: 10px 12px; border-radius: 10px;
}
.site-nav-panel a:hover { background: rgba(255,255,255,.08); color: #ff4fd8; }
`;

function currentPath(): string {
  const path = window.location.pathname.replace(/index\.html$/, "");
  return path === "" ? "/" : path;
}

export function mountSiteNav(): void {
  if (document.querySelector(".site-nav-root")) return; // avoid double-mount if included twice

  const styleTag = document.createElement("style");
  styleTag.textContent = STYLE;
  document.head.appendChild(styleTag);

  const root = document.createElement("div");
  root.className = "site-nav-root";
  root.dataset.open = "false";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "site-nav-toggle";
  toggle.setAttribute("aria-label", "Open site menu");
  toggle.setAttribute("aria-expanded", "false");
  toggle.innerHTML = "<span></span><span></span><span></span>";

  const panel = document.createElement("nav");
  panel.className = "site-nav-panel";
  panel.setAttribute("aria-label", "Site");
  const here = currentPath();
  panel.innerHTML = NAV_LINKS.map((link) => {
    const isCurrent = link.href === here;
    return `<a href="${link.href}"${isCurrent ? ' aria-current="page"' : ""}>${link.label}</a>`;
  }).join("");

  function setOpen(open: boolean): void {
    root.dataset.open = String(open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close site menu" : "Open site menu");
  }

  toggle.addEventListener("click", () => setOpen(root.dataset.open !== "true"));
  document.addEventListener("click", (event) => {
    if (root.dataset.open === "true" && !root.contains(event.target as Node)) setOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && root.dataset.open === "true") setOpen(false);
  });

  root.append(toggle, panel);
  document.body.appendChild(root);
}

mountSiteNav();

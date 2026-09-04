(() => {
  "use strict";

  // The legacy /v1/sessions runtime API this widget depended on has been
  // removed (Nova traffic now runs entirely through moonrock-2.pages.dev +
  // /v1/discovery). This WordPress surface is not receiving live Nova
  // traffic, so the chat modal is disabled rather than left calling a
  // dead endpoint. See docs/moonrock-2-production-cutover.md.
  const modal = document.querySelector("#nova-chat");
  const openers = document.querySelectorAll('a[href="#nova-chat"]');
  if (!modal || !openers.length) return;

  openers.forEach((opener) => {
    opener.setAttribute("aria-disabled", "true");
    opener.addEventListener("click", (event) => {
      event.preventDefault();
      window.location.assign("https://moonrock-2.pages.dev");
    });
  });
})();

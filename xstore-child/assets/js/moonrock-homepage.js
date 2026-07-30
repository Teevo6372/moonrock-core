(() => {
  "use strict";

  document.documentElement.classList.add("mr-js");

  if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.querySelectorAll(".mr-reveal").forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  document.querySelectorAll(".mr-homepage .mr-card, .mr-homepage .mr-section-head").forEach((element) => {
    element.classList.add("mr-reveal");
    observer.observe(element);
  });
})();

const MAX_STAGGER = 5;

const revealSiblings = (element) => {
  const group = [...element.parentElement.children].filter((child) => child.hasAttribute("data-reveal"));
  group.forEach((item, index) => {
    if (item.classList.contains("is-visible")) return;
    item.style.setProperty("--reveal-index", Math.min(index, MAX_STAGGER));
    item.classList.add("is-visible");
  });
  return group;
};

export function initReveal() {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reducedMotion || !("IntersectionObserver" in window)) return;

  const items = [...document.querySelectorAll("[data-reveal]")];
  const pending = items.filter((item) => {
    if (item.getBoundingClientRect().top < window.innerHeight) {
      item.removeAttribute("data-reveal");
      return false;
    }
    return true;
  });

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        for (const item of revealSiblings(entry.target)) observer.unobserve(item);
      }
    },
    { rootMargin: "0px 0px -10% 0px" },
  );

  pending.forEach((item) => observer.observe(item));
  document.documentElement.classList.add("reveal-ready");
}

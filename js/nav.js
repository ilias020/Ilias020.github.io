const NONE = -1;

function initIndicator(nav) {
  const pill = nav.querySelector(".segmented");
  const indicator = pill.querySelector(".segmented__indicator");
  const links = [...nav.querySelectorAll('a[href^="#"]')];

  const sections = [];
  links.forEach((link, index) => {
    const targets = [link.getAttribute("href"), ...(link.dataset.navAlso ?? "").split(" ")].filter(Boolean);
    for (const selector of targets) {
      const element = document.querySelector(selector);
      if (element) sections.push({ element, index });
    }
  });
  const contact = sections.find(({ element }) => element.tagName === "FOOTER");

  let current = NONE;
  let locked = false;

  const setActive = (index) => {
    if (index === current) return;
    if (current === NONE) {
      indicator.style.transition = "none";
      pill.style.setProperty("--segmented-active", Math.max(index, 0));
      indicator.getBoundingClientRect();
      indicator.style.transition = "";
    } else if (index !== NONE) {
      pill.style.setProperty("--segmented-active", index);
    }
    pill.dataset.active = index === NONE ? "none" : String(index);
    links.forEach((link, i) => {
      if (i === index) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
    current = index;
  };

  const intersecting = new Set();
  let footerRatio = 0;

  const resolve = () => {
    if (contact && footerRatio >= 0.5) return contact.index;
    const visible = sections.filter(({ element }) => intersecting.has(element));
    return visible.length ? visible[visible.length - 1].index : NONE;
  };

  const update = () => {
    if (!locked) setActive(resolve());
  };

  const middleLine = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) intersecting.add(entry.target);
        else intersecting.delete(entry.target);
      }
      update();
    },
    { rootMargin: "-40% 0px -55% 0px" },
  );
  sections.forEach(({ element }) => middleLine.observe(element));

  if (contact) {
    new IntersectionObserver(
      ([entry]) => {
        footerRatio = entry.intersectionRatio;
        update();
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    ).observe(contact.element);
  }

  let unlockTimer;
  const unlock = () => {
    clearTimeout(unlockTimer);
    locked = false;
    update();
  };

  links.forEach((link, index) => {
    link.addEventListener("click", () => {
      setActive(index);
      locked = true;
      clearTimeout(unlockTimer);
      unlockTimer = setTimeout(unlock, 1200);
    });
  });

  if ("onscrollend" in window) {
    window.addEventListener("scrollend", () => {
      if (locked) unlock();
    });
  }
}

function initHeaderDivider(header) {
  if (CSS.supports("animation-timeline: scroll()")) return;
  let ticking = false;
  const sync = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 8);
    ticking = false;
  };
  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(sync);
    },
    { passive: true },
  );
  sync();
}

export function initNav() {
  const nav = document.querySelector("[data-site-nav]");
  const header = document.querySelector("[data-site-header]");
  if (nav) initIndicator(nav);
  if (header) initHeaderDivider(header);
}

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function initTabs(tablist) {
  const tabs = [...tablist.querySelectorAll('[role="tab"]')];

  const scrollBehavior = () => (reducedMotion.matches ? "auto" : "smooth");

  const bringIntoRow = (tab) => {
    if (tablist.scrollWidth <= tablist.clientWidth) return;
    const padding = parseFloat(getComputedStyle(tablist).scrollPaddingInlineStart) || 0;
    const start = tab.offsetLeft - padding;
    const end = tab.offsetLeft + tab.offsetWidth + padding - tablist.clientWidth;
    if (tablist.scrollLeft > start) tablist.scrollTo({ left: start, behavior: scrollBehavior() });
    else if (tablist.scrollLeft < end) tablist.scrollTo({ left: end, behavior: scrollBehavior() });
  };

  const select = (tab, { focus = false } = {}) => {
    for (const other of tabs) {
      const isActive = other === tab;
      other.setAttribute("aria-selected", String(isActive));
      other.tabIndex = isActive ? 0 : -1;
      document.getElementById(other.getAttribute("aria-controls")).hidden = !isActive;
    }
    if (focus) tab.focus({ preventScroll: true });
    bringIntoRow(tab);
  };

  const revealPanel = (tab) => {
    const panel = document.getElementById(tab.getAttribute("aria-controls"));
    const { top, bottom } = panel.getBoundingClientRect();
    if (top < 0 || bottom > window.innerHeight) {
      panel.scrollIntoView({ block: "nearest", behavior: scrollBehavior() });
    }
  };

  tablist.addEventListener("click", (event) => {
    const tab = event.target.closest('[role="tab"]');
    if (!tab) return;
    select(tab);
    revealPanel(tab);
  });

  tablist.addEventListener("keydown", (event) => {
    const index = tabs.indexOf(document.activeElement);
    if (index === -1) return;
    const targets = {
      ArrowRight: tabs[(index + 1) % tabs.length],
      ArrowDown: tabs[(index + 1) % tabs.length],
      ArrowLeft: tabs[(index - 1 + tabs.length) % tabs.length],
      ArrowUp: tabs[(index - 1 + tabs.length) % tabs.length],
      Home: tabs[0],
      End: tabs[tabs.length - 1],
    };
    const next = targets[event.key];
    if (!next) return;
    event.preventDefault();
    select(next, { focus: true });
  });
}

function initModals() {
  let opener = null;

  document.addEventListener("click", (event) => {
    const openButton = event.target.closest("[data-modal-open]");
    if (openButton) {
      const dialog = document.getElementById(openButton.getAttribute("aria-controls"));
      opener = openButton;
      dialog.showModal();
      dialog.scrollTop = 0;
      return;
    }

    if (event.target.closest("[data-modal-close]")) {
      event.target.closest("dialog").close();
      return;
    }

    if (event.target instanceof HTMLDialogElement && event.target.open) {
      event.target.close();
    }
  });

  for (const dialog of document.querySelectorAll("dialog.modal")) {
    dialog.addEventListener("close", () => {
      opener?.focus();
      opener = null;
    });
  }
}

export function initProjects() {
  const tablist = document.querySelector("[data-project-tabs]");
  if (tablist) initTabs(tablist);
  initModals();
}

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function initTabs(tablist) {
  const tabs = [...tablist.querySelectorAll('[role="tab"]')];

  const select = (tab, { focus = false } = {}) => {
    for (const other of tabs) {
      const isActive = other === tab;
      other.setAttribute("aria-selected", String(isActive));
      other.tabIndex = isActive ? 0 : -1;
      document.getElementById(other.getAttribute("aria-controls")).hidden = !isActive;
    }
    if (focus) tab.focus();
  };

  const revealPanel = (tab) => {
    const panel = document.getElementById(tab.getAttribute("aria-controls"));
    const { top, bottom } = panel.getBoundingClientRect();
    if (top < 0 || bottom > window.innerHeight) {
      panel.scrollIntoView({ block: "nearest", behavior: reducedMotion.matches ? "auto" : "smooth" });
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

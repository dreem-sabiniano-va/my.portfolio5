(() => {
  "use strict";
  const data = window.PORTFOLIO_CONTENT;
  if (!data) return;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const safeImagePath = (slot) => data.photos[slot] || "";
  const photoOverridesKey = "dreem-portfolio-photo-overrides";
  let photoOverrides = {};
  try { photoOverrides = JSON.parse(localStorage.getItem(photoOverridesKey) || "{}"); } catch { photoOverrides = {}; }

  document.title = `${data.name} | ${data.role}`;
  $$("[data-name]").forEach(el => el.textContent = data.name);
  $$("[data-hero]").forEach(el => { const key = el.dataset.hero; if (key === "title") return; if (data.hero[key] !== undefined && key !== "headline") el.textContent = data.hero[key]; });
  $$("[data-section]").forEach(el => {
    const path = el.dataset.section.split(".");
    const value = path.reduce((obj, key) => obj?.[key], data);
    if (value !== undefined) el.textContent = value;
  });
  $$("[data-link]").forEach(el => { const key = el.dataset.link; if (data.links[key]) el.href = data.links[key]; });
  $("[data-footer]").textContent = data.footer;

  function photoMarkup(slot, alt, className = "") {
    const src = photoOverrides[slot] || safeImagePath(slot);
    return `<img class="${className}" data-photo="${escapeHTML(slot)}" src="${escapeHTML(src)}" alt="${escapeHTML(alt)}" loading="${slot === "hero" ? "eager" : "lazy"}"><div class="image-placeholder" data-placeholder="${escapeHTML(slot)}">Add image<br><small>${escapeHTML(safeImagePath(slot))}</small></div>`;
  }
  function wireImages(root = document) {
    $$("img[data-photo]", root).forEach(img => {
      const showFallback = () => {
        img.style.display = "none";
        const placeholder = img.parentElement.querySelector(`[data-placeholder="${img.dataset.photo}"]`);
        if (placeholder) placeholder.classList.add("visible");
      };
      img.addEventListener("error", showFallback, { once: true });
      if (!img.getAttribute("src")) img.src = photoOverrides[img.dataset.photo] || safeImagePath(img.dataset.photo);
      if (img.complete && img.naturalWidth === 0) showFallback();
    });
  }
  wireImages($(".hero"));
  const serviceGrid = $("#service-grid");
  serviceGrid.innerHTML = data.services.items.map(item => `<article class="service-card reveal"><div class="icon-box" aria-hidden="true">${escapeHTML(item.icon)}</div><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.description)}</p><ul class="star-list">${item.bullets.map(line => `<li>${escapeHTML(line)}</li>`).join("")}</ul></article>`).join("");

  const projectTrack = $("#project-track");
  projectTrack.innerHTML = data.projects.items.map((item, index) => `<article class="project-card reveal"><div class="project-image"><div class="project-image-inner">${photoMarkup(item.image, `${item.title} project screenshot`)}</div><span class="preview-label">PROJECT ${String(index + 1).padStart(2, "0")}</span><a class="live-preview-button" href="${escapeHTML(item.projectUrl || "#")}" target="_blank" rel="noopener noreferrer">Live preview <span aria-hidden="true">↗</span></a></div><div class="project-body"><p class="project-category">${escapeHTML(item.category)}</p><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.description)}</p><button class="view-project" type="button" data-project="${index}">Project details <span aria-hidden="true">↗</span></button></div></article>`).join("");
  projectTrack.addEventListener("click", event => {
    const button = event.target.closest("button[data-project]");
    if (!button || !projectTrack.contains(button)) return;
    event.preventDefault();
    openProject(Number(button.dataset.project), button);
  });
  wireImages(projectTrack);

  // Accessible responsive navigation.
  const menuToggle = $(".menu-toggle"), nav = $("#site-nav");
  menuToggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  });
  $$(".site-nav a").forEach(link => link.addEventListener("click", () => {
    nav.classList.remove("open"); menuToggle.setAttribute("aria-expanded", "false"); menuToggle.setAttribute("aria-label", "Open navigation");
  }));

  // Header treatment and active section tracking.
  const header = $(".site-header");
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 8);
  onScroll(); window.addEventListener("scroll", onScroll, { passive: true });
  const sections = $$("main section[id]");
  if ("IntersectionObserver" in window) {
    const navObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        $$(".nav-link").forEach(link => {
          const active = link.getAttribute("href") === `#${entry.target.id}`;
          link.classList.toggle("active", active);
          if (active) link.setAttribute("aria-current", "location"); else link.removeAttribute("aria-current");
        });
      }
    }), { rootMargin: "-30% 0px -55% 0px", threshold: 0 });
    sections.forEach(section => navObserver.observe(section));
    const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add("is-visible"); revealObserver.unobserve(entry.target); }
    }), { threshold: .12 });
    $$(".reveal").forEach(el => revealObserver.observe(el));
  } else $$(".reveal").forEach(el => el.classList.add("is-visible"));

  // Lightbox dialog: native dialog handles focus containment and Escape.
  const dialog = $("#project-dialog");
  let returnFocus = null;
  function openProject(index, trigger) {
    const item = data.projects.items[index]; if (!item) return;
    returnFocus = trigger;
    $("#dialog-category").textContent = item.category;
    $("#dialog-title").textContent = item.title;
    $("#dialog-description").innerHTML = `<span class="detail-label">THE PROBLEM</span><span class="detail-copy">${escapeHTML(item.problem || item.description)}</span><span class="detail-label">FINDINGS</span><span class="detail-copy">${escapeHTML(item.findings || "A clear, easy-to-follow system makes routine work simpler.")}</span><span class="detail-label">THE RESULT</span><span class="detail-copy">${escapeHTML(item.result || item.detail || item.description)}</span>`;
    $("#dialog-tags").innerHTML = item.tags.map(tag => `<span class="tag">${escapeHTML(tag)}</span>`).join("");
    $("#dialog-caption").textContent = item.caption || "";
    $("#dialog-status").textContent = item.status || "";
    const projectLink = $("#dialog-project-link");
    projectLink.href = item.projectUrl || "#";
    projectLink.hidden = !item.projectUrl;
    projectLink.textContent = item.projectUrl?.includes("notion.site") ? "Live preview ↗" : "Open project ↗";
    dialog.showModal(); document.body.classList.add("modal-open");
  }
  $(".dialog-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener("close", () => { document.body.classList.remove("modal-open"); returnFocus?.focus(); });

  const tools = [
    { title: "Workspace & planning", items: ["Notion", "ClickUp", "Asana", "Trello"] },
    { title: "Scheduling & communication", items: ["Calendly", "Google Calendar", "Gmail", "Zoom"] },
    { title: "Documents & creative", items: ["Google Workspace", "Microsoft 365", "Canva", "Google Drive"] }
  ];
  $("#tool-groups").innerHTML = tools.map(group => `<article class="tool-group reveal"><h3>${group.title}</h3><div class="tool-pills">${group.items.map((tool, i) => `<span class="tool-pill"><b aria-hidden="true">${["✳","◷","▤","✓"][i]}</b>${tool}</span>`).join("")}</div></article>`).join("");
  const fitTasks = [
    "I lose track of emails and follow-ups.",
    "Scheduling takes more time than it should.",
    "My files and business information are scattered.",
    "I need help comparing suppliers or quotations.",
    "Our tasks and deadlines are hard to see at a glance.",
    "I want a Notion workspace that fits how we work."
  ];
  $("#fit-options").innerHTML = fitTasks.map((task, i) => `<label class="fit-option"><input type="checkbox" value="${i}"><span class="fit-check" aria-hidden="true">✓</span><span>${task}</span><span class="fit-arrow" aria-hidden="true">↗</span></label>`).join("");
  const fitOptions = $("#fit-options"), fitResult = $("#fit-result");
  fitOptions.addEventListener("change", () => {
    const count = fitOptions.querySelectorAll("input:checked").length;
    const message = count === 0 ? "Your time back starts with one task." : count < 3 ? "A little support could make a real difference." : "Let’s make a plan to take these off your plate.";
    fitResult.innerHTML = `<strong>${count} ${count === 1 ? "task" : "tasks"} selected</strong><span>${message}</span>`;
  });

  // Optional private photo editing mode: visit the site URL with #edit.
  const editBadge = $("#edit-badge"), filePicker = $("#photo-file-picker");
  let currentPhotoSlot = null;
  function activateEditMode() {
    editBadge.hidden = false;
    $$("img[data-photo]").forEach(img => {
      img.style.cursor = "pointer";
      img.title = "Click to replace this image in edit mode";
      img.addEventListener("click", () => { currentPhotoSlot = img.dataset.photo; filePicker.click(); });
    });
  }
  if (location.hash === "#edit") activateEditMode();
  filePicker.addEventListener("change", () => {
    const file = filePicker.files?.[0]; if (!file || !currentPhotoSlot) return;
    const reader = new FileReader();
    reader.onload = () => {
      photoOverrides[currentPhotoSlot] = reader.result;
      try { localStorage.setItem(photoOverridesKey, JSON.stringify(photoOverrides)); } catch {}
      $$(`img[data-photo="${currentPhotoSlot}"]`).forEach(img => { img.src = reader.result; img.style.display = "block"; img.parentElement.querySelector(`[data-placeholder="${currentPhotoSlot}"]`)?.classList.remove("visible"); });
      if (currentPhotoSlot === "hero") $("[data-photo='hero']").src = reader.result;
    };
    reader.readAsDataURL(file); filePicker.value = "";
  });
  $("#reset-photos").addEventListener("click", () => {
    photoOverrides = {};
    try { localStorage.removeItem(photoOverridesKey); } catch {}
    location.reload();
  });
})();

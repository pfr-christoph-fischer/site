(() => {
  const dialog = document.getElementById("site-lightbox");
  if (!dialog) return;

  const image = document.getElementById("site-lightbox-image");
  const caption = document.getElementById("site-lightbox-caption");
  const prevButton = dialog.querySelector(".lightbox__nav--prev");
  const nextButton = dialog.querySelector(".lightbox__nav--next");
  const triggers = [...document.querySelectorAll("[data-lightbox-src]")];
  if (!triggers.length) return;

  const groups = new Map();
  triggers.forEach((trigger) => {
    const group = trigger.dataset.lightboxGroup || "default";
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(trigger);
  });

  let currentGroup = [];
  let currentIndex = 0;

  function render() {
    const current = currentGroup[currentIndex];
    if (!current) return;
    image.src = current.dataset.lightboxSrc || current.getAttribute("href");
    image.alt = current.dataset.lightboxAlt || "";
    caption.textContent = current.dataset.lightboxCaption || "";
    prevButton.disabled = currentGroup.length < 2;
    nextButton.disabled = currentGroup.length < 2;
  }

  function openFrom(trigger) {
    const group = trigger.dataset.lightboxGroup || "default";
    currentGroup = groups.get(group) || [trigger];
    currentIndex = Math.max(0, currentGroup.indexOf(trigger));
    render();
    dialog.showModal();
  }

  function step(delta) {
    if (!currentGroup.length) return;
    currentIndex = (currentIndex + delta + currentGroup.length) % currentGroup.length;
    render();
  }

  triggers.forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      openFrom(trigger);
    });
  });

  prevButton.addEventListener("click", () => step(-1));
  nextButton.addEventListener("click", () => step(1));

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  window.addEventListener("keydown", (event) => {
    if (!dialog.open) return;
    if (event.key === "ArrowLeft") step(-1);
    if (event.key === "ArrowRight") step(1);
  });
})();

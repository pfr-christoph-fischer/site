(() => {
  function readValue(targetId) {
    const element = document.getElementById(targetId);
    if (!element) return "";
    return "value" in element ? element.value : element.textContent || "";
  }

  async function copyText(text) {
    if (!text) return false;
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const fallback = document.createElement("textarea");
    fallback.value = text;
    fallback.setAttribute("readonly", "");
    fallback.style.position = "absolute";
    fallback.style.left = "-9999px";
    document.body.appendChild(fallback);
    fallback.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(fallback);
    return copied;
  }

  function batchUrls() {
    const node = document.getElementById("share-batch-urls");
    if (!node) return [];
    try {
      const parsed = JSON.parse(node.textContent || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function withTokens(url, values) {
    return String(url || "")
      .replace(/<permalink>/g, encodeURIComponent(values.permalink))
      .replace(/<title>/g, encodeURIComponent(values.title))
      .replace(/<summary>/g, encodeURIComponent(values.summary))
      .replace(/<text>/g, encodeURIComponent(values.text));
  }

  document.addEventListener("click", async (event) => {
    const copyButton = event.target.closest("[data-copy-target]");
    if (copyButton) {
      const targetId = copyButton.getAttribute("data-copy-target");
      await copyText(readValue(targetId));
      return;
    }

    const fediverseButton = event.target.closest("[data-fediverse-share]");
    if (fediverseButton) {
      const textTarget = fediverseButton.getAttribute("data-text-target");
      const text = readValue(textTarget);
      window.open(`https://toot.kytta.dev/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
      return;
    }

    const batchButton = event.target.closest("[data-batch-share]");
    if (batchButton) {
      const textTarget = batchButton.getAttribute("data-text-target");
      const text = readValue(textTarget);
      await copyText(text);

      const values = {
        permalink: readValue("share-permalink"),
        title: readValue("share-title-line"),
        summary: readValue("share-summary-only"),
        text
      };

      for (const url of batchUrls()) {
        const resolvedUrl = withTokens(url, values);
        if (!resolvedUrl) continue;
        window.open(resolvedUrl, "_blank", "noopener");
      }
    }
  });
})();

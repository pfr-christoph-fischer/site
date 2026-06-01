import { parseDocument } from "htmlparser2";
import { getChildren, textContent } from "domutils";

function normalizeWhitespace(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\r\n/g, "\n");
}

function escapeMarkdown(value) {
  return value.replace(/([*_`])/g, "\\$1");
}

function normalizeInline(value) {
  return normalizeWhitespace(value)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .replace(/[ \t]{2,}/g, " ");
}

function indentBlock(value, prefix) {
  return value
    .split("\n")
    .map((line) => `${prefix}${line}`.trimEnd())
    .join("\n");
}

function renderChildrenMarkdown(nodes) {
  return nodes.map((node) => renderNodeMarkdown(node)).join("");
}

function renderListItem(node, index, ordered) {
  const marker = ordered ? `${index + 1}. ` : "- ";
  const content = renderChildrenMarkdown(getChildren(node)).trim();
  if (!content) return "";
  const lines = content.split("\n");
  return `${marker}${lines[0]}\n${lines.slice(1).map((line) => (line ? `   ${line}` : "")).join("\n")}`.trimEnd();
}

function renderNodeMarkdown(node) {
  if (node.type === "text") {
    return escapeMarkdown(normalizeInline(node.data));
  }

  if (node.type !== "tag") {
    return "";
  }

  const name = node.name.toLowerCase();
  const children = getChildren(node);

  switch (name) {
    case "div":
    case "section":
    case "article":
    case "span":
      return renderChildrenMarkdown(children);
    case "p": {
      const content = renderChildrenMarkdown(children).trim();
      return content ? `${content}\n\n` : "";
    }
    case "br":
      return "  \n";
    case "strong":
    case "b": {
      const content = renderChildrenMarkdown(children).trim();
      return content ? `**${content}**` : "";
    }
    case "em":
    case "i": {
      const content = renderChildrenMarkdown(children).trim();
      return content ? `*${content}*` : "";
    }
    case "blockquote": {
      const content = renderChildrenMarkdown(children).trim();
      return content ? `${indentBlock(content, "> ")}\n\n` : "";
    }
    case "h1":
    case "h2":
    case "h3":
    case "h4": {
      const depth = Number(name.slice(1));
      const content = renderChildrenMarkdown(children).trim();
      return content ? `${"#".repeat(depth)} ${content}\n\n` : "";
    }
    case "ul":
    case "ol": {
      const ordered = name === "ol";
      const items = children
        .filter((child) => child.type === "tag" && child.name.toLowerCase() === "li")
        .map((child, index) => renderListItem(child, index, ordered))
        .filter(Boolean);
      return items.length ? `${items.join("\n")}\n\n` : "";
    }
    case "li":
      return renderChildrenMarkdown(children);
    case "a": {
      const href = node.attribs?.href;
      const label = renderChildrenMarkdown(children).trim() || escapeMarkdown(textContent(node).trim());
      return href ? `[${label}](${href})` : label;
    }
    case "hr":
      return "\n---\n\n";
    case "sub":
    case "sup":
      return `<${name}>${renderChildrenMarkdown(children)}</${name}>`;
    case "iframe": {
      const src = node.attribs?.src;
      return src ? `[Eingebetteter Inhalt](${src})` : "";
    }
    default:
      return renderChildrenMarkdown(children);
  }
}

export function htmlToMarkdown(html) {
  const document = parseDocument(normalizeWhitespace(html));
  return renderChildrenMarkdown(document.children)
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

export function textExcerpt(input, maxLength = 220) {
  const plain = String(input || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) return "";
  return plain.length <= maxLength ? plain : `${plain.slice(0, maxLength).trim()}…`;
}

export function normalizeSermonBody(input, summary = "") {
  const raw = normalizeWhitespace(input).trim();
  if (!raw) return "";

  let markdown = raw.includes("<") ? htmlToMarkdown(raw) : raw;
  markdown = markdown
    .replace(/^\s*<div[^>]*>/i, "")
    .replace(/<\/div>\s*$/i, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (summary) {
    const escapedSummary = summary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    markdown = markdown.replace(new RegExp(`^${escapedSummary}\\s*(\\n\\n|$)`, "u"), "").trim();
  }

  return markdown;
}

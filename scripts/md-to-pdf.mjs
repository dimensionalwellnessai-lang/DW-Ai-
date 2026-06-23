import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const md = readFileSync("ARCHITECTURE.md", "utf8");

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inline(s) {
  // inline code first (protect contents)
  const codes = [];
  s = s.replace(/`([^`]+)`/g, (_, c) => {
    codes.push(c);
    return `\u0000${codes.length - 1}\u0000`;
  });
  s = escapeHtml(s);
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // links [text](url)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${escapeHtml(codes[Number(i)])}</code>`);
  return s;
}

const lines = md.split("\n");
let html = "";
let i = 0;
let inUL = false;
let inOL = false;

function closeLists() {
  if (inUL) { html += "</ul>\n"; inUL = false; }
  if (inOL) { html += "</ol>\n"; inOL = false; }
}

while (i < lines.length) {
  let line = lines[i];

  // code fence
  if (line.startsWith("```")) {
    closeLists();
    i++;
    let code = "";
    while (i < lines.length && !lines[i].startsWith("```")) {
      code += lines[i] + "\n";
      i++;
    }
    i++; // skip closing fence
    html += `<pre><code>${escapeHtml(code.replace(/\n$/, ""))}</code></pre>\n`;
    continue;
  }

  // table block
  if (line.includes("|") && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|[\s:|-]+/.test(lines[i + 1]) && lines[i + 1].includes("-")) {
    closeLists();
    const header = line.split("|").map((c) => c.trim()).filter((c, idx, arr) => !(idx === 0 && c === "") && !(idx === arr.length - 1 && c === ""));
    i += 2; // skip header + separator
    html += "<table><thead><tr>" + header.map((h) => `<th>${inline(h)}</th>`).join("") + "</tr></thead><tbody>\n";
    while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") {
      const cells = lines[i].split("|").map((c) => c.trim());
      cells.shift(); // leading empty
      if (cells[cells.length - 1] === "") cells.pop();
      html += "<tr>" + cells.map((c) => `<td>${inline(c)}</td>`).join("") + "</tr>\n";
      i++;
    }
    html += "</tbody></table>\n";
    continue;
  }

  // headings
  let m;
  if ((m = line.match(/^(#{1,6})\s+(.*)$/))) {
    closeLists();
    const level = m[1].length;
    html += `<h${level}>${inline(m[2])}</h${level}>\n`;
    i++;
    continue;
  }

  // hr
  if (/^---+\s*$/.test(line)) {
    closeLists();
    html += "<hr/>\n";
    i++;
    continue;
  }

  // blockquote
  if (line.startsWith(">")) {
    closeLists();
    let quote = "";
    while (i < lines.length && lines[i].startsWith(">")) {
      quote += lines[i].replace(/^>\s?/, "") + " ";
      i++;
    }
    html += `<blockquote>${inline(quote.trim())}</blockquote>\n`;
    continue;
  }

  // ordered list
  if ((m = line.match(/^\s*\d+\.\s+(.*)$/))) {
    if (!inOL) { closeLists(); html += "<ol>\n"; inOL = true; }
    html += `<li>${inline(m[1])}</li>\n`;
    i++;
    continue;
  }

  // unordered list
  if ((m = line.match(/^\s*[-*]\s+(.*)$/))) {
    if (!inUL) { closeLists(); html += "<ul>\n"; inUL = true; }
    html += `<li>${inline(m[1])}</li>\n`;
    i++;
    continue;
  }

  // blank
  if (line.trim() === "") {
    closeLists();
    i++;
    continue;
  }

  // paragraph
  closeLists();
  html += `<p>${inline(line)}</p>\n`;
  i++;
}
closeLists();

const doc = `<!doctype html><html><head><meta charset="utf-8"><style>
  @page { margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1a1a2e; line-height: 1.55; font-size: 11px; }
  h1 { font-size: 24px; color: #4c2a85; border-bottom: 3px solid #7c3aed; padding-bottom: 8px; margin-top: 0; }
  h2 { font-size: 17px; color: #4c2a85; border-bottom: 1px solid #d6c8f0; padding-bottom: 4px; margin-top: 26px; }
  h3 { font-size: 13.5px; color: #5b21b6; margin-top: 18px; }
  h4 { font-size: 12px; color: #6d28d9; margin-top: 14px; }
  p { margin: 7px 0; }
  ul, ol { margin: 7px 0 7px 0; padding-left: 22px; }
  li { margin: 3px 0; }
  code { background: #f3eefb; color: #6d28d9; padding: 1px 4px; border-radius: 3px; font-family: "SFMono-Regular", Consolas, monospace; font-size: 10px; }
  pre { background: #1e1b2e; color: #e6e1f5; padding: 12px 14px; border-radius: 6px; overflow: auto; page-break-inside: avoid; }
  pre code { background: transparent; color: #e6e1f5; padding: 0; font-size: 9px; line-height: 1.4; white-space: pre; }
  blockquote { border-left: 3px solid #a78bfa; background: #faf7ff; margin: 10px 0; padding: 6px 14px; color: #4b3b6b; }
  table { border-collapse: collapse; width: 100%; margin: 10px 0; font-size: 10px; page-break-inside: avoid; }
  th, td { border: 1px solid #d6c8f0; padding: 5px 8px; text-align: left; vertical-align: top; }
  th { background: #ede5fb; color: #4c2a85; }
  tr:nth-child(even) td { background: #faf7ff; }
  hr { border: none; border-top: 1px solid #e3d9f5; margin: 18px 0; }
  a { color: #7c3aed; text-decoration: none; }
  strong { color: #2d1b4e; }
</style></head><body>${html}</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(doc, { waitUntil: "networkidle" });
await page.pdf({
  path: "ARCHITECTURE.pdf",
  format: "A4",
  printBackground: true,
});
await browser.close();
console.log("ARCHITECTURE.pdf written");

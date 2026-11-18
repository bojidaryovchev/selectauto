/**
 * A rehype step for the blog's markdown tables (board `in-blog-post`): on a phone each row becomes a card whose cells
 * carry their column's name, so every body cell gets `data-l` with its header's text and its content wrapped in
 * `span.in-cell`. Cells that hold a figure get `num` (tabular digits, right-aligned), and a row whose every cell is
 * wholly bold (the „Общо" lines) gets `is-sum`. Plain HAST walking, no dependencies.
 */

type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

const isElement = (node: HastNode, tag?: string) => node.type === "element" && (!tag || node.tagName === tag);

function textOf(node: HastNode): string {
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(textOf).join("");
}

/** A figure: a number with an optional currency, unit or a parenthetical, e.g. „24 690 € (≈ 48 290 лв)", „≈ 900 €", „10%". */
const NUMERIC = /^[≈~+−-]?\s*\d[\d\s.,]*\s*(€|\$|%|лв\.?|км)?(\s*\(.*\))?$/u;

function addClass(node: HastNode, name: string) {
  const props = (node.properties ??= {});
  const current = props.className;
  const list = Array.isArray(current) ? current.map(String) : typeof current === "string" ? current.split(/\s+/) : [];
  if (!list.includes(name)) list.push(name);
  props.className = list;
}

function cellsOf(row: HastNode): HastNode[] {
  return (row.children ?? []).filter((c) => isElement(c, "td") || isElement(c, "th"));
}

function processTable(table: HastNode) {
  const sections = (table.children ?? []).filter((c) => isElement(c, "thead") || isElement(c, "tbody"));
  const thead = sections.find((s) => s.tagName === "thead");
  const headerRow = thead?.children?.find((c) => isElement(c, "tr"));
  const labels = headerRow ? cellsOf(headerRow).map((th) => textOf(th).trim()) : [];

  for (const tbody of sections.filter((s) => s.tagName === "tbody")) {
    for (const row of (tbody.children ?? []).filter((c) => isElement(c, "tr"))) {
      const cells = cellsOf(row);
      const allBold =
        cells.length > 0 &&
        cells.every((td) => {
          const kids = (td.children ?? []).filter((k) => !(k.type === "text" && !(k.value ?? "").trim()));
          return kids.length === 1 && isElement(kids[0], "strong");
        });
      if (allBold) addClass(row, "is-sum");
      cells.forEach((td, i) => {
        if (labels[i]) (td.properties ??= {})["data-l"] = labels[i];
        if (i > 0 && NUMERIC.test(textOf(td).trim())) addClass(td, "num");
        td.children = [{ type: "element", tagName: "span", properties: { className: ["in-cell"] }, children: td.children ?? [] }];
      });
    }
  }
}

function walk(node: HastNode) {
  if (isElement(node, "table")) processTable(node);
  for (const child of node.children ?? []) walk(child);
}

export function rehypeTableCards() {
  return (tree: HastNode) => {
    walk(tree);
  };
}

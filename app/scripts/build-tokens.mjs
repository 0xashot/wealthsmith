/**
 * build-tokens.mjs
 *
 * Generates src/styles/tokens.generated.css from the design-system token
 * source of truth:
 *
 *   ../tokens/primitives/*.json  (raw values — used only for resolution)
 *   ../tokens/semantic/*.json    (emitted as CSS custom properties)
 *
 * Rules honored (tokens/README.md):
 * - Components use semantic tokens; primitives exist only to resolve them.
 * - No token names are invented here. CSS variable names are a mechanical
 *   mapping of the existing semantic token path: dots become hyphens,
 *   camelCase is preserved. e.g. color.action.primary.background.default
 *   -> --color-action-primary-background-default
 * - Composite tokens (typography, boxShadow, motion, viewport) emit one
 *   variable per sub-property, suffixed with the kebab-cased key.
 *   Typography additionally emits a `-font` shorthand for convenience.
 *
 * This file is the only place token JSON is read; the source folders are
 * never modified.
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKENS_DIR = join(__dirname, "..", "..", "tokens");
const OUT_FILE = join(__dirname, "..", "src", "styles", "tokens.generated.css");

/** Flatten a Tokens Studio file into path -> { value, type } */
function flatten(obj, prefix = "", out = new Map()) {
  for (const [key, node] of Object.entries(obj)) {
    if (key === "$schema" || key === "meta") continue;
    if (node && typeof node === "object" && "value" in node && "type" in node) {
      out.set(prefix ? `${prefix}.${key}` : key, node);
    } else if (node && typeof node === "object") {
      flatten(node, prefix ? `${prefix}.${key}` : key, out);
    }
  }
  return out;
}

function loadDir(dir) {
  const map = new Map();
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const json = JSON.parse(readFileSync(join(dir, file), "utf8"));
    flatten(json, "", map);
  }
  return map;
}

const primitives = loadDir(join(TOKENS_DIR, "primitives"));
const semantic = loadDir(join(TOKENS_DIR, "semantic"));

const warnings = [];

/**
 * Resolve a raw token value. `{path}` references resolve against primitives
 * first (semantic and primitive namespaces overlap, e.g. color.text.primary
 * exists in both), then against other semantic tokens, with a cycle guard.
 */
function resolve(value, seen = new Set()) {
  if (typeof value === "string") {
    const m = value.match(/^\{(.+)\}$/);
    if (!m) return value;
    const path = m[1];
    if (seen.has(path)) {
      warnings.push(`cycle detected at {${path}}`);
      return value;
    }
    seen.add(path);
    const node = primitives.get(path) ?? semantic.get(path);
    if (!node) {
      warnings.push(`unresolved reference {${path}}`);
      return value;
    }
    return resolve(node.value, seen);
  }
  if (Array.isArray(value)) return value.map((v) => resolve(v, new Set(seen)));
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = resolve(v, new Set(seen));
    return out;
  }
  return value;
}

const cssVar = (path) => `--${path.replaceAll(".", "-")}`;
const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

const quoteFamily = (family) =>
  /\s/.test(family) ? `"${family}"` : family;

const composeShadow = (v) =>
  typeof v === "string" ? v : `${v.x} ${v.y} ${v.blur} ${v.spread} ${v.color}`;

const lines = [];

for (const [path, node] of semantic) {
  const value = resolve(node.value);
  const base = cssVar(path);

  switch (node.type) {
    case "typography": {
      // sub-properties + a `font` shorthand (letter-spacing stays separate;
      // the CSS font shorthand cannot carry it)
      for (const [k, v] of Object.entries(value)) {
        const out = k === "fontFamily" ? quoteFamily(v) : v;
        lines.push(`  ${base}-${kebab(k)}: ${out};`);
      }
      const { fontWeight, fontSize, lineHeight, fontFamily } = value;
      if (fontWeight && fontSize && lineHeight && fontFamily) {
        lines.push(
          `  ${base}-font: ${fontWeight} ${fontSize}/${lineHeight} ${quoteFamily(fontFamily)};`
        );
      }
      break;
    }
    case "boxShadow":
      lines.push(`  ${base}: ${composeShadow(value)};`);
      break;
    default:
      if (value && typeof value === "object") {
        for (const [k, v] of Object.entries(value)) {
          lines.push(`  ${base}-${kebab(k)}: ${v};`);
        }
      } else {
        lines.push(`  ${base}: ${value};`);
      }
  }
}

const header = `/*
 * GENERATED FILE — do not edit.
 * Source of truth: tokens/semantic/*.json (resolved via tokens/primitives/*.json)
 * Regenerate with: npm run tokens
 */`;

mkdirSync(dirname(OUT_FILE), { recursive: true });
writeFileSync(OUT_FILE, `${header}\n:root {\n${lines.join("\n")}\n}\n`);

console.log(
  `tokens.generated.css written: ${semantic.size} semantic tokens -> ${lines.length} CSS custom properties`
);
if (warnings.length) {
  console.warn(`WARNINGS (${warnings.length}):`);
  for (const w of warnings) console.warn(`  - ${w}`);
  process.exitCode = 1;
}

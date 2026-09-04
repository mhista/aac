/**
 * Guards the one Next.js rule TypeScript cannot see.
 *
 * A module marked "use server" may export ONLY async functions. Exporting a
 * constant, an object or a class from one compiles perfectly and then throws
 * at request time with "A 'use server' file can only export async functions".
 * It has caught us twice, so it is a build step now.
 *
 * Types and interfaces are fine — they are erased before the rule applies.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const roots = ["app", "components", "lib"];
const bad = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      walk(p);
      continue;
    }
    if (!/\.tsx?$/.test(p)) continue;

    const src = readFileSync(p, "utf8");
    if (!src.trimStart().startsWith('"use server"')) continue;

    const re = /^export\s+(?!async\s+function)(?!type\b)(?!interface\b)(\S+)/gm;
    let m;
    while ((m = re.exec(src))) {
      const line = src.slice(0, m.index).split("\n").length;
      bad.push(`${p}:${line}  export ${m[1]} …`);
    }
  }
}

for (const r of roots) {
  try { walk(r); } catch { /* directory may not exist */ }
}

if (bad.length) {
  console.error('"use server" files may only export async functions:\n');
  for (const b of bad) console.error("  " + b);
  console.error("\nMove constants and types into a plain module next to it.\n");
  process.exit(1);
}
console.log(`✓ server export rule holds across ${roots.join(", ")}`);

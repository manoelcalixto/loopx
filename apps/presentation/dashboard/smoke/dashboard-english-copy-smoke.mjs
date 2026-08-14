import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const sourceRoot = join(root, "src");
const textExtensions = new Set([".ts", ".tsx"]);
const hanPattern = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u;

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(path);
    }
    return textExtensions.has(extname(entry.name)) ? [path] : [];
  });
}

const files = [join(root, "index.html"), ...sourceFiles(sourceRoot)];
const findings = [];

for (const file of files) {
  const lines = readFileSync(file, "utf8").split(/\r?\n/u);
  lines.forEach((line, index) => {
    if (hanPattern.test(line)) {
      findings.push(`${relative(root, file)}:${index + 1}: ${line.trim()}`);
    }
  });
}

if (findings.length > 0) {
  throw new Error(`Dashboard-owned source must use English copy:\n${findings.join("\n")}`);
}

const dashboardSource = readFileSync(join(sourceRoot, "views", "dashboard-page.tsx"), "utf8");
for (const requiredCopy of [
  "LoopX control plane",
  "First-screen decision frame",
  "Todo Responsibility Matrix",
  "Guard and evidence signals",
  "Control-plane event ledger",
]) {
  if (!dashboardSource.includes(requiredCopy)) {
    throw new Error(`Missing canonical English dashboard copy: ${requiredCopy}`);
  }
}

console.log(`dashboard English copy smoke ok (${files.length} source files)`);

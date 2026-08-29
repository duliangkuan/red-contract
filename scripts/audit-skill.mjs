#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const target = process.argv[2] ? path.resolve(process.argv[2]) : "";
if (!target || !fs.existsSync(target) || !fs.statSync(target).isDirectory()) {
  console.error(JSON.stringify({ status: "error", message: "请提供存在的 Skill 目录" }));
  process.exit(2);
}

const ignoredDirs = new Set([".git", "node_modules", "dist", "build", "__pycache__"]);
const researchDirs = new Set(["_research", "research", "corpus"]);
const runtimeArtifactDirs = new Set(["output", "outputs", "logs", "cache", "backup", "backups", "tmp", "temp"]);
const textExtensions = new Set([".md", ".txt", ".json", ".yaml", ".yml", ".js", ".mjs", ".cjs", ".ts", ".py"]);
const sensitiveNames = [
  /^\.env(?:\..+)?$/i,
  /^(?:id_rsa|id_dsa|id_ecdsa|id_ed25519)$/i,
  /^(?:credentials|secrets?)\.json$/i,
  /\.(?:pem|p12|pfx|key)$/i,
];
const findings = [];

function add(severity, rule, file, line, message) {
  findings.push({ severity, rule, file: path.relative(target, file).replaceAll("\\", "/"), line, message });
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      add("high", "symbolic-link", full, 0, "发现符号链接，公开包内容可能指向目录外部");
      continue;
    }
    if (entry.isDirectory()) {
      const normalized = entry.name.toLowerCase();
      if (researchDirs.has(normalized)) {
        add("medium", "bundled-research-artifacts", full, 0, "发现研究材料目录，确认其运行必需且具有公开权利");
      }
      if (runtimeArtifactDirs.has(normalized)) {
        add("medium", "bundled-runtime-artifacts", full, 0, "发现输出、缓存、日志、备份或临时目录");
      }
      walk(full);
    }
    else if (entry.isFile()) scanFile(full);
  }
}

function scanFile(file) {
  if (path.resolve(file) === path.resolve(process.argv[1])) return;
  const basename = path.basename(file);
  if (sensitiveNames.some((pattern) => pattern.test(basename)) && !/\.example$/i.test(basename)) {
    add("high", "sensitive-file", file, 0, "发现不应进入公开包的敏感文件名");
  }
  const ext = path.extname(file).toLowerCase();
  if (!textExtensions.has(ext) && basename !== ".gitignore" && !basename.startsWith(".env")) return;
  let content;
  try { content = fs.readFileSync(file, "utf8"); } catch { return; }
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    const n = index + 1;
    if (/[A-Za-z]:\\(?:Users|Documents|Desktop|Dev|GitHub)\\/i.test(line)) {
      add("high", "absolute-windows-path", file, n, "发现用户或开发机绝对路径");
    }
    if (/\/(?:Users|home)\/[^/\s]+\//.test(line)) {
      add("high", "absolute-home-path", file, n, "发现用户主目录绝对路径");
    }
    if (/(?:API[_-]?KEY|ACCESS[_-]?TOKEN|REFRESH[_-]?TOKEN|PASSWORD|CLIENT[_-]?SECRET)\s*[:=]\s*["']?[A-Za-z0-9_\-]{8,}/i.test(line)) {
      add("high", "embedded-secret", file, n, "疑似嵌入凭据");
    }
    if (
      /agent-browser\s+--cdp|--cookies-from-browser|读取.{0,8}(?:Cookie|浏览器登录态)/i.test(line)
      && !/不(?:连接|读取|使用)/.test(line)
    ) {
      add("high", "browser-session", file, n, "发现浏览器会话或 Cookie 读取逻辑");
    }
    if (/(?:~|%USERPROFILE%)?[\\/]\.agents[\\/]skills[\\/][\w-]+/i.test(line)) {
      add("medium", "private-skill-dependency", file, n, "发现本机 Skill 路径依赖");
    }
  });
}

const skillFile = path.join(target, "SKILL.md");
if (!fs.existsSync(skillFile)) {
  add("high", "missing-skill-md", skillFile, 0, "缺少 SKILL.md");
} else {
  const source = fs.readFileSync(skillFile, "utf8");
  const lineCount = source.split(/\r?\n/).length;
  if (lineCount > 500) {
    add("high", "skill-md-too-long", skillFile, 1, `SKILL.md 共 ${lineCount} 行，超过 500 行硬上限`);
  } else if (lineCount > 300) {
    add("medium", "skill-md-needs-split", skillFile, 1, `SKILL.md 共 ${lineCount} 行，建议拆到 references/`);
  }
  const fm = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) add("high", "invalid-frontmatter", skillFile, 1, "缺少 YAML frontmatter");
  else {
    for (const key of ["name", "description", "version", "author"]) {
      if (!new RegExp(`^${key}:`, "m").test(fm[1])) add("medium", `missing-${key}`, skillFile, 1, `frontmatter 缺少 ${key}`);
    }
    const name = fm[1].match(/^name:\s*["']?([^\r\n"']+)/m)?.[1]?.trim();
    const version = fm[1].match(/^version:\s*["']?([^\r\n"']+)/m)?.[1]?.trim();
    if (name && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
      add("high", "invalid-skill-name", skillFile, 1, "frontmatter name 必须是稳定的 kebab-case 技术标识");
    }
    if (name && path.basename(target) !== name) {
      add("high", "skill-directory-mismatch", skillFile, 1, "目录名必须与 frontmatter name 一致");
    }
    if (version && !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
      add("medium", "invalid-version", skillFile, 1, "version 应使用语义化版本号");
    }
  }
}

walk(target);
const counts = { high: 0, medium: 0, low: 0 };
for (const finding of findings) counts[finding.severity]++;
const status = counts.high ? "block" : counts.medium ? "review" : "pass";
console.log(JSON.stringify({ status, target, counts, findings }, null, 2));
process.exit(counts.high ? 1 : 0);

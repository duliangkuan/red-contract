import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const auditor = new URL("./audit-skill.mjs", import.meta.url).pathname.replace(/^\/(.:)/, "$1");

function fixture(extra = "") {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "red-contract-test-"));
  fs.writeFileSync(path.join(dir, "SKILL.md"), `---\nname: clean-skill\ndescription: 一个干净的测试 Skill。\nversion: "1.0.0"\nauthor: 测试\n---\n\n# Test\n${extra}\n`);
  return dir;
}

function audit(dir) {
  const result = spawnSync(process.execPath, [auditor, dir], { encoding: "utf8" });
  return { code: result.status, json: JSON.parse(result.stdout) };
}

{
  const result = audit(fixture("只处理本地文本。"));
  assert.equal(result.code, 0);
  assert.equal(result.json.status, "pass");
}

{
  const result = audit(fixture("运行目录：C:\\Users\\demo\\Documents\\secret"));
  assert.equal(result.code, 1);
  assert.equal(result.json.status, "block");
  assert.ok(result.json.findings.some((x) => x.rule === "absolute-windows-path"));
}

{
  const marker = "ACCESS_" + "TOKEN=" + "abcd1234secret";
  const result = audit(fixture(marker));
  assert.equal(result.code, 1);
  assert.ok(result.json.findings.some((x) => x.rule === "embedded-secret"));
}

console.log("audit-skill tests passed");

---
name: red-contract
description: 红色契约：面向小红书 Red Skill 的保守批量构建与发布前审计协议。当用户说“红色契约”、要求批量新建 Red Skill、一天制作多个 Skill，或要求按 Red Skill 规范从选题推进到 dry-run 时使用；默认创建同名公开 GitHub 仓库，但最终 Red Skill 提交必须再次获得明确确认。
version: "1.0.0"
author: 风云
---

# 红色契约

把一个或一批选题做成可公开、可移植、可验证的 Red Skill。默认推进到 CLI dry-run，然后停止并等待用户明确说“提交”“确认”或 `submit`。

## 默认交付

每个候选最终应得到：

1. 一个独立、同名的 Skill 目录；
2. 通过结构、安全、许可、可移植性和代表性测试；
3. 一个与 Skill ID 同名的公开 GitHub 仓库及首次推送；
4. 一份 Red Skill CLI dry-run 载荷；
5. 最终提交前的用户确认闸门。

公开 GitHub 推送属于本协议默认动作，但不等于允许最终提交 Red Skill。

## 保守门禁

以下任一项不清楚，就把候选标为 `hold`，不要赌审核：

- 原创权、素材权或第三方许可证不清；
- 依赖 Cookie、浏览器登录态、私人密钥、个人知识库或未随包提供的私有 Skill；
- 写死本机绝对路径、个人账号、内部项目名或运行状态；
- 宣称的核心能力无法在代表性输入上验证；
- 医疗、法律、金融、心理或玄学内容伪装成确定性诊断或预测；
- 一句话说不清输入、输出和使用边界；
- 为了显得强大而加入首版不需要的外部服务。

## 批量流程

### 1. 建立清单

为每个选题记录：`name`、一句话用途、输入、输出、原创性、依赖、风险、推荐标签、状态。状态只能是 `idea`、`building`、`tested`、`dry-run`、`submitted`、`hold`。

### 2. 选择最小形态

- 判断、改写、评审类：优先纯指令型。
- 需要精确计算、解析或转换：使用小型确定性脚本。
- 不得把私人生产系统原样打包成公开 Skill。
- 第三方开源库只保留必要依赖，并附许可证与来源说明。

### 3. 创建 Skill

目录名和 frontmatter `name` 使用同一个 kebab-case Skill ID。`SKILL.md` 至少包含清晰 description、version、author、输入、输出、工作流、错误处理、边界与隐私说明。复杂细节放入 `references/`；重复且必须可靠的逻辑放入 `scripts/`。

### 4. 验证

先运行本 Skill 的审计器：

```bash
node scripts/audit-skill.mjs <skill-directory>
```

再运行目标 Skill 自带测试和 Skill 结构校验。完整检查表见 [references/release-checklist.md](references/release-checklist.md)。发现 `high` 必须修复；`medium` 必须说明为何可接受。

### 5. 公开 GitHub

在目标 Skill 的精确目录上再次扫描。确认没有密钥、私人语料、运行状态、构建缓存和绝对路径后：初始化独立 Git 仓库，提交验证过的文件，创建同名公开仓库并推送。不得打印或写入 GitHub token。

### 6. Red Skill dry-run

如果环境中存在 `redskillhub-upload` Skill，严格按其规范执行版本门禁、实时标签获取、来源与标签确认以及 CLI dry-run。批量汇总每个载荷的名称、Skill ID、版本、描述、原创性和中文标签。

### 7. 最终提交闸门

只有用户看到 dry-run 载荷后明确回复“提交”“确认”或 `submit`，才允许逐项真实提交。登录授权、GitHub 推送、允许安装依赖或说“好了”都不等于提交授权。

## 禁止事项

- 不使用浏览器自动化处理上传、审核或登录。
- 不绕过 TLS、权限或登录校验。
- 不为了凑数量复制同质 Skill。
- 不把未通过测试的候选带入 dry-run。
- 不把公开仓库创建理解为可公开用户隐私或第三方受限资料。

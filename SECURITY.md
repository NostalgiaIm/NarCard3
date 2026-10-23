# Security Policy

## Supported versions

NarCard3 is maintained from the latest code on the default branch. Security fixes are not backported to older commits, forks, or unofficial binary packages.

The Tauri editor is currently a source-based development preview. The project does not publish or endorse prebuilt installers yet.

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability.

Use [GitHub private vulnerability reporting](https://github.com/NostalgiaIm/NarCard3/security/advisories/new) to send the report privately. Private vulnerability reporting is enabled for this repository.

If GitHub does not show the private reporting form, open a public issue that says only that the private channel is unavailable. Do not include vulnerability details, reproduction steps, logs, or proof-of-concept code in that issue; the maintainer will restore a private channel first.

Include, when possible:

- the affected commit or version;
- whether the problem affects the Astro website, browser editor, or Tauri editor;
- operating system and Rust/Node.js versions;
- clear reproduction steps and expected impact;
- a minimal proof of concept without personal data, credentials, or destructive payloads;
- any suggested mitigation.

Relevant security boundaries include filesystem access and path validation, symlink or traversal handling, Git credential use and publishing, WebView content and CSP behavior, unsafe HTML rendering, and exploitable dependency vulnerabilities.

Please test only against repositories and data you own or have permission to use. Do not access other users' data, disrupt services, or include secrets in a report.

## Response expectations

This is a small, volunteer-maintained project with no guaranteed response or remediation SLA. The maintainer will normally try to:

- acknowledge a complete report within 7 days;
- provide a status update within 14 days when investigation is still active;
- coordinate public disclosure after a fix or mitigation is available.

Timelines may vary with severity, reproducibility, and maintainer availability. Private reports are appreciated and will be handled in good faith.

## 简体中文

发现疑似安全漏洞时，请不要创建公开 Issue。本仓库已启用 [GitHub 私密漏洞报告](https://github.com/NostalgiaIm/NarCard3/security/advisories/new)，请在私密表单中提供受影响版本、运行环境、复现步骤、影响说明和不包含私人数据或凭据的最小验证示例。

如果 GitHub 没有显示私密报告表单，可以创建公开 Issue，但只能说明“私密报告渠道不可用”，不要写入漏洞细节、复现步骤、日志或验证代码；维护者会先恢复私密渠道。

本项目由个人利用业余时间维护，不承诺 SLA；通常会尽量在 7 天内确认完整报告，并在调查持续时于 14 天内提供一次状态更新。请只对自己拥有或获准测试的数据和仓库进行验证。

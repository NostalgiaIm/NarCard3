import { access, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, '..');

const requiredFiles = [
  'CODE_STYLE.md',
  'CONTRIBUTING.md',
  'ROADMAP.md',
  'SECURITY.md',
  '.github/ISSUE_TEMPLATE/bug_report.yml',
  '.github/ISSUE_TEMPLATE/feature_request.yml',
  '.github/ISSUE_TEMPLATE/config.yml',
  '.github/PULL_REQUEST_TEMPLATE.md',
];

const bilingualPairs = [
  {
    english: 'README.md',
    chinese: 'README.zh-CN.md',
    englishLink: './README.zh-CN.md',
    chineseLink: './README.md',
  },
  {
    english: 'narcard-editor/README.md',
    chinese: 'narcard-editor/README.zh-CN.md',
    englishLink: './README.zh-CN.md',
    chineseLink: './README.md',
  },
  {
    english: 'narcard-editor/docs/ONE_CLICK_SETUP_IMPLEMENTATION.md',
    chinese: 'narcard-editor/docs/ONE_CLICK_SETUP_IMPLEMENTATION.zh-CN.md',
    englishLink: './ONE_CLICK_SETUP_IMPLEMENTATION.zh-CN.md',
    chineseLink: './ONE_CLICK_SETUP_IMPLEMENTATION.md',
  },
];

const problems = [];

for (const relativePath of requiredFiles) {
  try {
    await access(join(projectRoot, relativePath));
  } catch {
    problems.push(`Missing required community file: ${relativePath}`);
  }
}

for (const pair of bilingualPairs) {
  try {
    const [english, chinese] = await Promise.all([
      readFile(join(projectRoot, pair.english), 'utf8'),
      readFile(join(projectRoot, pair.chinese), 'utf8'),
    ]);

    if (!english.includes(pair.englishLink)) {
      problems.push(`${pair.english} must link to ${pair.chinese}`);
    }
    if (!chinese.includes(pair.chineseLink)) {
      problems.push(`${pair.chinese} must link to ${pair.english}`);
    }
  } catch (error) {
    problems.push(`Unable to read bilingual pair ${pair.english} / ${pair.chinese}: ${error.message}`);
  }
}

const security = await readFile(join(projectRoot, 'SECURITY.md'), 'utf8');
if (!security.includes('/security/advisories/new')) {
  problems.push('SECURITY.md must link to GitHub private vulnerability reporting.');
}
if (!security.includes('## 简体中文')) {
  problems.push('SECURITY.md must retain its Simplified Chinese summary.');
}

const discussionsUrl = 'https://github.com/NostalgiaIm/NarCard3/discussions';
for (const communityFile of [
  'README.md',
  'README.zh-CN.md',
  'CONTRIBUTING.md',
  '.github/ISSUE_TEMPLATE/config.yml',
]) {
  const content = await readFile(join(projectRoot, communityFile), 'utf8');
  if (!content.includes(discussionsUrl)) {
    problems.push(`${communityFile} must link to GitHub Discussions.`);
  }
}

for (const policyFile of ['CONTRIBUTING.md', 'ROADMAP.md']) {
  const content = await readFile(join(projectRoot, policyFile), 'utf8');
  if (!content.includes('简体中文')) {
    problems.push(`${policyFile} must retain its Simplified Chinese summary.`);
  }
}

if (problems.length > 0) {
  console.error('Documentation checks failed:');
  for (const problem of problems) console.error(`- ${problem}`);
  process.exitCode = 1;
} else {
  console.log(`Documentation checks passed: ${requiredFiles.length} required files and ${bilingualPairs.length} bilingual pairs.`);
}

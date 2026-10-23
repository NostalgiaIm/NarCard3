import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/* ================= 路径配置 ================= */

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, '..');
const contentDirectory = join(projectRoot, 'src', 'content', 'blog');
const outputFile = join(projectRoot, 'src', 'data', 'posts.ts');

/* ================= Frontmatter 解析 ================= */

// 解析 Markdown 文件顶部的 frontmatter 文本。
function parseFrontmatter(source, fileName) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) throw new Error(`${fileName}: 缺少有效的 frontmatter。`);

  const fields = {};
  const lines = match[1].split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const field = lines[index].match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!field) continue;

    const name = field[1];
    const value = field[2].trim();
    if (value) {
      fields[name] = value;
      continue;
    }

    const list = [];
    while (index + 1 < lines.length && /^\s+-\s+/.test(lines[index + 1])) {
      index += 1;
      list.push(lines[index].replace(/^\s+-\s+/, '').trim());
    }
    fields[name] = list.length > 0 ? `[${list.join(', ')}]` : '';
  }

  return fields;
}

// 去除 YAML 字符串外围引号并恢复常见转义字符。
function parseString(value) {
  const text = String(value ?? '').trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1).replace(/\\([\\"'])/g, '$1');
  }
  return text;
}

// 解析 YAML 行数组和简单的内联数组。
function parseTags(value, fileName) {
  const text = String(value ?? '').trim();
  if (!text) return [];

  if (text.startsWith('[') && text.endsWith(']')) {
    const body = text.slice(1, -1).trim();
    if (!body) return [];
    return body
      .split(',')
      .map((item) => parseString(item))
      .filter(Boolean);
  }

  if (text.startsWith('-')) {
    return text
      .split(/\s+-\s+/)
      .map((item) => parseString(item.replace(/^-\s*/, '')))
      .filter(Boolean);
  }

  throw new Error(`${fileName}: tags 必须是内联数组，例如 [Example, Notes]。`);
}

// 将日期字段转换成稳定的 ISO 日期字符串。
function parseDate(fields, fileName) {
  const value = parseString(fields.pubDate || fields.date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${fileName}: pubDate/date 必须使用 YYYY-MM-DD 格式。`);
  }

  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error(`${fileName}: 日期无效：${value}。`);
  }

  return value;
}

// 将单个 Markdown 文件转换成首页使用的文章对象。
function toPost(fileName, fields) {
  const slug = fileName.slice(0, -extname(fileName).length);
  const title = parseString(fields.title);
  if (!title) throw new Error(`${fileName}: title 不能为空。`);

  const iso = parseDate(fields, fileName);
  const date = new Date(`${iso}T00:00:00Z`);
  const short = date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', timeZone: 'UTC' });
  const display = date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric', timeZone: 'UTC' });
  const draft = parseString(fields.draft).toLowerCase() === 'true';
  if (draft) return null;

  const post = {
    slug,
    title,
    iso,
    short,
    display,
    tags: parseTags(fields.tags, fileName),
    category: parseString(fields.category) || 'Uncategorized',
    variant: Number.isInteger(Number(fields.variant)) ? Number(fields.variant) : 0,
    excerpt: parseString(fields.description || fields.excerpt),
  };

  if (!post.excerpt) throw new Error(`${fileName}: description 不能为空。`);

  for (const field of ['cover', 'coverAlt', 'coverPosition']) {
    const value = parseString(fields[field]);
    if (value) post[field] = value;
  }

  return post;
}

/* ================= TypeScript 输出 ================= */

// 将文本安全序列化为 TypeScript 字符串字面量。
function quoteString(value) {
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, '\\n')}'`;
}

// 将单篇文章格式化为稳定、易读的 TypeScript 对象。
function renderPost(post) {
  const fields = [
    `slug: ${quoteString(post.slug)}`,
    `title: ${quoteString(post.title)}`,
    `iso: ${quoteString(post.iso)}`,
    `short: ${quoteString(post.short)}`,
    `display: ${quoteString(post.display)}`,
    `tags: [${post.tags.map(quoteString).join(', ')}]`,
    `category: ${quoteString(post.category)}`,
    `variant: ${post.variant}`,
    `excerpt: ${quoteString(post.excerpt)}`,
  ];

  for (const field of ['cover', 'coverAlt', 'coverPosition']) {
    if (post[field]) fields.push(`${field}: ${quoteString(post[field])}`);
  }

  const firstLine = `  { ${fields.slice(0, 8).join(', ')},`;
  const optionalFields = fields.slice(8);
  if (optionalFields.length === 0) return `${firstLine.slice(0, -1)} },`;
  return `${firstLine}\n    ${optionalFields.join(', ')} },`;
}

// 生成稳定排序的 posts.ts，避免构建时出现无意义 diff。
function renderPostsFile(posts) {
  const postLines = posts.map(renderPost).join('\n');

  return `/* ================= 自动生成文件 ================= */

// 本文件由 scripts/generate-posts.mjs 自动生成。
// 请直接编辑 src/content/blog/*.md，不要手动修改本文件。

export const posts = [
${postLines}
] as const;

export type DemoPost = (typeof posts)[number];

export const tagCounts = [...new Set<string>(posts.flatMap((post) => [...post.tags]))]
  .map((tag) => ({ tag, count: posts.filter((post) => post.tags.some((value) => value === tag)).length }))
  .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
`;
}

/* ================= 生成流程 ================= */

// 扫描 Markdown 内容并写入首页数据文件。
async function generatePosts() {
  const files = (await readdir(contentDirectory))
    .filter((fileName) => extname(fileName).toLowerCase() === '.md')
    .sort((a, b) => a.localeCompare(b));

  const posts = [];
  for (const fileName of files) {
    const source = await readFile(join(contentDirectory, fileName), 'utf8');
    const post = toPost(fileName, parseFrontmatter(source, fileName));
    if (post) posts.push(post);
  }

  posts.sort((a, b) => b.iso.localeCompare(a.iso) || a.slug.localeCompare(b.slug));
  await writeFile(outputFile, renderPostsFile(posts), 'utf8');
  console.log(`Generated ${posts.length} posts from ${files.length} Markdown files.`);
}

await generatePosts();

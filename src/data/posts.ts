/* ================= 自动生成文件 ================= */

// 本文件由 scripts/generate-posts.mjs 自动生成。
// 请直接编辑 src/content/blog/*.md，不要手动修改本文件。

export const posts = [
  { slug: 'a-quiet-introduction', title: 'A Quiet Introduction', iso: '2025-01-10', short: 'Jan 10', display: 'Jan 10, 2025', tags: ['Example', 'Notes'], category: 'Notes', variant: 0,
    excerpt: 'A short example entry for demonstrating the template.' },
  { slug: 'building-a-small-static-site', title: 'Building a Small Static Site', iso: '2025-01-10', short: 'Jan 10', display: 'Jan 10, 2025', tags: ['Example', 'Notes'], category: 'Notes', variant: 0,
    excerpt: 'A short example entry for demonstrating the template.' },
] as const;

export type DemoPost = (typeof posts)[number];

export const tagCounts = [...new Set<string>(posts.flatMap((post) => [...post.tags]))]
  .map((tag) => ({ tag, count: posts.filter((post) => post.tags.some((value) => value === tag)).length }))
  .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));

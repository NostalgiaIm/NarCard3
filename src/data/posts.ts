export const posts = [
  { slug: 'a-quiet-introduction', title: 'A Quiet Introduction', iso: '2025-01-10', short: 'Jan 10', display: 'Jan 10, 2025', tags: ['Example', 'Notes'], category: 'Notes', variant: 0, excerpt: 'A short example entry for demonstrating the template.' },
  { slug: 'building-a-small-static-site', title: 'Building a Small Static Site', iso: '2025-02-18', short: 'Feb 18', display: 'Feb 18, 2025', tags: ['Astro', 'Example'], category: 'Craft', variant: 1, excerpt: 'A neutral example article about designing a maintainable static site.' },
  { slug: 'notes-on-readable-design', title: 'Notes on Readable Design', iso: '2025-03-24', short: 'Mar 24', display: 'Mar 24, 2025', tags: ['Design', 'Reading'], category: 'Design', variant: 2, excerpt: 'A short placeholder for typography, spacing, and accessible interfaces.' },
] as const;

export type DemoPost = (typeof posts)[number];

export const tagCounts = [...new Set<string>(posts.flatMap((post) => [...post.tags]))]
  .map((tag) => ({ tag, count: posts.filter((post) => post.tags.some((value) => value === tag)).length }))
  .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
import { posts, tagCounts } from '../data/posts';

export const prerender = true;

// 封面相关字段是可选的：编辑器写入后才会出现在 posts.ts 里
type CoverFields = {
  cover?: string;
  coverAlt?: string;
  coverPosition?: string;
};

export function GET() {
  const data = posts.map((post) => {
    const extra = post as CoverFields;

    return {
      slug: post.slug,
      title: post.title,
      iso: post.iso,
      display: post.display,
      tags: [...post.tags],
      category: post.category,
      excerpt: post.excerpt,
      cover: extra.cover ?? '',
      coverAlt: extra.coverAlt ?? '',
      coverPosition: extra.coverPosition ?? 'center',
      // 编辑器需要正文才能在切换文章时加载对应内容；没有独立正文字段的演示文章使用摘要生成可编辑初稿。
      body: `# ${post.title}\n\n${post.excerpt}\n`,
    };
  });

  return new Response(JSON.stringify({
    posts: data,
    tags: tagCounts.map(({ tag, count }) => ({ tag, count })),
  }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

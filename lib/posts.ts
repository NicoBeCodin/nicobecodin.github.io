import matter from 'gray-matter';
import { marked } from 'marked';
import firstPost from '@/content/posts/building-a-dex-part-1.md?raw';
import secondPost from '@/content/posts/building-a-dex-part-2.md?raw';
import leafPayPost from '@/content/posts/how-a-solana-zk-mixer-works-leafpay.md?raw';
import thirdPost from '@/content/posts/building-a-dex-part-3.md?raw';
import fourthPost from '@/content/posts/building-a-dex-part-4.md?raw';

export type Post = {
  slug: string;
  title: string;
  description: string;
  date: string;
  series?: string;
  part?: number;
  topic?: string;
  readTime: string;
  html: string;
};

// Add the next Markdown import here, then register it in this object.
const sources: Record<string, string> = {
  'building-a-dex-part-1': firstPost,
  'building-a-dex-part-2': secondPost,
  'how-a-solana-zk-mixer-works-leafpay': leafPayPost,
  'building-a-dex-part-3': thirdPost,
  'building-a-dex-part-4': fourthPost,
};

export function getPostLabel(post: Post): string {
  if (post.series) return post.series;
  return post.topic?.toUpperCase() || 'ARTICLE';
}

export function getPostShortLabel(post: Post): string {
  if (post.series) return post.series;
  return post.topic || 'Article';
}

export function getPosts(): Post[] {
  return Object.entries(sources).map(([slug, source]) => {
    const { data, content } = matter(source);
    return {
      slug,
      title: String(data.title),
      description: String(data.description),
      date: data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date),
      series: typeof data.series === 'string' ? data.series : undefined,
      part: data.part === undefined ? undefined : Number(data.part),
      topic: typeof data.topic === 'string' ? data.topic : undefined,
      readTime: String(data.readTime),
      html: marked.parse(content, { async: false }) as string,
    };
  }).sort((a, b) => b.date.localeCompare(a.date) || (b.part ?? 0) - (a.part ?? 0));
}

export function getPost(slug: string): Post | undefined {
  return getPosts().find((post) => post.slug === slug);
}

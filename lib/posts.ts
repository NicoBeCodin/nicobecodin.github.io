import matter from 'gray-matter';
import { marked } from 'marked';
import firstPost from '@/content/posts/building-a-dex-part-1.md?raw';
import secondPost from '@/content/posts/building-a-dex-part-2.md?raw';

export type Post = {
  slug: string;
  title: string;
  description: string;
  date: string;
  series: string;
  part: number;
  readTime: string;
  html: string;
};

// Add the next Markdown import here, then register it in this object.
const sources: Record<string, string> = {
  'building-a-dex-part-1': firstPost,
  'building-a-dex-part-2': secondPost,
};

export function getPosts(): Post[] {
  return Object.entries(sources).map(([slug, source]) => {
    const { data, content } = matter(source);
    return {
      slug,
      title: String(data.title),
      description: String(data.description),
      date: String(data.date),
      series: String(data.series),
      part: Number(data.part),
      readTime: String(data.readTime),
      html: marked.parse(content, { async: false }) as string,
    };
  }).sort((a, b) => b.date.localeCompare(a.date));
}

export function getPost(slug: string): Post | undefined {
  return getPosts().find((post) => post.slug === slug);
}

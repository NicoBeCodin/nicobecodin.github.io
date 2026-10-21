import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';
import { getPost, getPostLabel, getPosts } from '@/lib/posts';
import { ArticleBody } from '@/components/article-body';

export function generateStaticParams() { return getPosts().map(({slug}) => ({slug})); }

export async function generateMetadata({params}: {params: Promise<{slug: string}>}): Promise<Metadata> {
  const post = getPost((await params).slug);
  if (!post) return {};
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nicobecodin.github.io';
  return { title: `${post.title} | nicobecodin`, description: post.description, alternates: { canonical: `${siteUrl}/writing/${post.slug}/` }, openGraph: { title: post.title, description: post.description, type: 'article', publishedTime: post.date, images: [] }, twitter: { card: 'summary', title: post.title, description: post.description, images: [] } };
}

export default async function ArticlePage({params}: {params: Promise<{slug: string}>}) {
  const post = getPost((await params).slug);
  if (!post) notFound();
  const series = post.series ? getPosts().filter(p=>p.series===post.series).sort((a,b)=>(a.part??0)-(b.part??0)) : [];
  return <main><div className="page-shell"><SiteHeader/>
    <article className="article-shell">
      <div className="article-top"><a className="back-link" href="/writing/"><ArrowLeft size={16}/> All writing</a><span>{getPostLabel(post)}</span></div>
      <header className="article-header"><span className="section-kicker">{post.series ? 'BUILD LOG / LIGHT DEX' : getPostLabel(post)}</span><h1>{post.title}</h1><p>{post.description}</p><div className="article-byline"><span>{post.series ? 'LIGHT DEX JOURNAL' : 'TECHNICAL NOTE'}</span><span>{new Date(`${post.date}T12:00:00Z`).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</span><span>{post.readTime.toUpperCase()}</span></div></header>
      <ArticleBody html={post.html}/>
      {series.length > 0 && <nav className="article-series" aria-label="Building Light DEX series">
        <h2>{post.series}</h2>
        {series.map(p => <a key={p.slug} href={`/writing/${p.slug}/`} aria-current={p.slug === post.slug ? 'page' : undefined}>{p.title}</a>)}
      </nav>}
      <div className="article-end"><span>END OF ARTICLE</span><a href="/writing/">More writing <ArrowUpRight size={17}/></a></div>
    </article><SiteFooter/>
  </div></main>;
}

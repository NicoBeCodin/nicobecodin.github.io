import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';
import { getPost, getPosts } from '@/lib/posts';

export function generateStaticParams() { return getPosts().map(({slug}) => ({slug})); }

export async function generateMetadata({params}: {params: Promise<{slug: string}>}): Promise<Metadata> {
  const post = getPost((await params).slug);
  if (!post) return {};
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nicobecodin.github.io';
  return { title: `${post.title} — nicobecodin`, description: post.description, alternates: { canonical: `${siteUrl}/writing/${post.slug}/` }, openGraph: { title: post.title, description: post.description, type: 'article', publishedTime: post.date, images: [] }, twitter: { card: 'summary', title: post.title, description: post.description, images: [] } };
}

export default async function ArticlePage({params}: {params: Promise<{slug: string}>}) {
  const post = getPost((await params).slug);
  if (!post) notFound();
  return <main><div className="page-shell"><SiteHeader/><article className="article-shell"><div className="article-top"><Link className="back-link" href="/writing"><ArrowLeft size={16}/> All writing</Link><span>{post.series.toUpperCase()} / PART {String(post.part).padStart(2,'0')}</span></div><header className="article-header"><span className="section-kicker">BUILD LOG / LIGHT DEX</span><h1>{post.title}</h1><p>{post.description}</p><div className="article-byline"><span>LIGHT DEX JOURNAL</span><span>{new Date(`${post.date}T12:00:00Z`).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</span><span>{post.readTime.toUpperCase()}</span></div></header><div className="article-body" dangerouslySetInnerHTML={{__html: post.html}}/><div className="article-end"><span>END OF PART {String(post.part).padStart(2,'0')}</span><Link href="/writing">More writing <ArrowUpRight size={17}/></Link></div></article><SiteFooter/></div></main>;
}

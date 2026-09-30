import type { Metadata } from 'next';
import { ArrowUpRight } from 'lucide-react';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';
import { getPosts } from '@/lib/posts';

export const metadata: Metadata = { title: 'Writing — nicobecodin', description: 'Build logs and technical notes on distributed exchanges, market infrastructure, Rust and DeFi.', alternates: { canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://nicobecodin.github.io'}/writing/` } };

export default function WritingPage() {
  const posts = getPosts();
  return <main><div className="page-shell"><SiteHeader/><section className="interior-hero"><span className="section-kicker">WRITING / FIELD NOTES</span><h1>What I&apos;m learning<br/><em>by building.</em></h1><p>Build logs, technical notes and the occasional wrong turn. I write down the parts that took longer than the clean diagrams suggest.</p></section><section className="archive-list" aria-label="Articles">{posts.map((post) => <a className="archive-row" href={`/writing/${post.slug}/`} key={post.slug}><div className="archive-date">{new Date(`${post.date}T12:00:00Z`).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</div><div><span className="work-kind">{post.series.toUpperCase()} / PART {String(post.part).padStart(2,'0')}</span><h2>{post.title}</h2><p>{post.description}</p><span className="read-time">{post.readTime}</span></div><ArrowUpRight size={23}/></a>)}</section><SiteFooter/></div></main>;
}

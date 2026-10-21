import type { Metadata } from 'next';
import { ArrowUpRight } from 'lucide-react';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';
import { getPostLabel, getPosts } from '@/lib/posts';

export const metadata: Metadata = { title: 'Writing | nicobecodin', description: 'Build logs and technical notes on distributed exchanges, market infrastructure, Rust and DeFi.', alternates: { canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://nicobecodin.github.io'}/writing/` } };

export default function WritingPage() {
  const posts = getPosts();
  const groups = [
    { title: 'Building Light DEX', id: 'light-dex', posts: posts.filter(post => post.series === 'Building Light DEX').sort((a, b) => (a.part ?? 0) - (b.part ?? 0)) },
    { title: 'LeafPay', id: 'leafpay', posts: posts.filter(post => !post.series) },
  ];
  return <main><div className="page-shell">
    <SiteHeader/>
    <section className="interior-hero">
      <h1>Writing</h1>
      <p>Build logs, technical explainers and whatever is on my mind. Writing helps me check that I understand something so here you go.</p>
    </section>
    {groups.filter(group => group.posts.length > 0).map(group => <section className="writing-group" key={group.id} aria-labelledby={group.id}>
      <h2 id={group.id}>{group.title}</h2>
      <div className="archive-list">{group.posts.map(post => <a className="archive-row" href={`/writing/${post.slug}/`} key={post.slug}>
        <div className="archive-date">{new Date(`${post.date}T12:00:00Z`).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}</div>
        <div>{!post.series && <span className="work-kind">{getPostLabel(post)}</span>}<h3>{post.title}</h3><p>{post.description}</p><span className="read-time">{post.readTime}</span></div>
        <ArrowUpRight size={23}/>
      </a>)}</div>
    </section>)}
    <SiteFooter/>
  </div></main>;
}

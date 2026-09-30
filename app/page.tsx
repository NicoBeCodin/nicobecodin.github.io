import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';
import { getPosts } from '@/lib/posts';

const projects = [
  {
    number: '01',
    title: 'Light DEX',
    label: 'Rust · distributed systems',
    description: 'A small decentralized exchange I am building to learn networking, consensus and exchange state by actually implementing them.',
    href: '/writing/building-a-dex-part-1',
    action: 'Follow the build log',
    sourceLink: 'https://github.com/NicoBeCodin/light_dex',
  },
  {
    number: '02',
    title: 'Multi-venue market making',
    label: 'Rust · trading infrastructure',
    description: 'A private research and execution project that has me thinking about market data, orders, fills and what really happens between a backtest and a live system.',
    href: '/projects#market-making',
    action: 'Read about the project',
  },
  {
    number: '03',
    title: 'LeafPay',
    label: 'Solana · zero knowledge',
    description: 'A privacy-pool prototype that made the final round of a Colosseum hackathon. It taught me a lot about the gap between a prototype and production.',
    href: '/projects#leafpay',
    action: 'Read about the project',
  },
];

const tools = [
  {
    title: 'ptimer',
    description: 'A little Pomodoro timer for the terminal, with ASCII art and session logging.',
    href: 'https://github.com/NicoBeCodin/ptimer',
    action: 'View on GitHub',
  },
  {
    title: 'terminal-tips',
    description: 'Short, random learning cards that appear when I open a new terminal tab.',
    href: 'https://github.com/NicoBeCodin/terminal-tips',
    action: 'View on GitHub',
  },
  {
    title: 'tmux cheat sheet',
    description: 'A desktop wallpaper I made to keep the tmux commands I use close at hand.',
    href: '/tools/tmux-cheatsheet',
    action: 'Preview and download',
  },
];

export default function Home() {
  const recentPosts = getPosts().slice(0, 3);

  return <main><div className="page-shell">
    <SiteHeader />

    <section className="home-intro" id="about" aria-labelledby="intro-title">
      <h1 className="sr-only" id="intro-title">About me</h1>
      <p>I&apos;m interested in decentralized finance, trading systems, low-level performance and multicore architecture. Rust is usually where I end up. I recently finished a quant analyst internship at a crypto broker, and I&apos;m using this time to build things, break them, and write down what I learn.</p>
      <Link className="inline-arrow" href="/about">A bit more about me <ArrowUpRight size={17}/></Link>
    </section>

    <section className="home-section" id="writing" aria-labelledby="writing-heading">
      <div className="home-section-heading"><div><span className="section-kicker">WRITING</span><h2 id="writing-heading">Recent articles</h2></div><Link className="section-link" href="/writing">All articles <ArrowUpRight size={17}/></Link></div>
      <div className="home-articles">{recentPosts.map((post) => <Link className="home-article" href={`/writing/${post.slug}`} key={post.slug}><span className="home-item-meta">{post.series} · Part {post.part} · {post.readTime}</span><h3>{post.title}</h3><p>{post.description}</p><span className="home-item-action">Read article <ArrowUpRight size={16}/></span></Link>)}</div>
    </section>

    <section className="home-section" id="projects" aria-labelledby="projects-heading">
      <div className="home-section-heading"><div><span className="section-kicker">PROJECTS</span><h2 className="sr-only" id="projects-heading">Projects</h2></div><Link className="section-link" href="/projects">More projects <ArrowUpRight size={17}/></Link></div>
      <div className="home-projects">{projects.map((project) => 'sourceLink' in project ? <div className="home-project" key={project.number}><span className="home-project-number">{project.number}</span><div><span className="home-item-meta">{project.label}</span><h3>{project.title}</h3><p>{project.description}</p><div className="home-project-links"><Link className="home-item-action" href={project.href}>{project.action} <ArrowUpRight size={16}/></Link><a className="home-item-action" href={project.sourceLink} target="_blank" rel="noreferrer">View source <ArrowUpRight size={16}/></a></div></div></div> : <Link className="home-project" href={project.href} key={project.number}><span className="home-project-number">{project.number}</span><div><span className="home-item-meta">{project.label}</span><h3>{project.title}</h3><p>{project.description}</p><span className="home-item-action">{project.action} <ArrowUpRight size={16}/></span></div></Link>)}</div>
      <p className="highload-note">I also like a good performance puzzle. You can find my challenge work on <a href="https://highload.fun/users/nicobecodin/overview" target="_blank" rel="noreferrer">HighLoad.fun / @nicobecodin <ArrowUpRight size={15}/></a>.</p>
    </section>

    <section className="home-section" id="tools" aria-labelledby="tools-heading">
      <div className="home-section-heading"><div><span className="section-kicker">SMALL TOOLS</span><h2 className="sr-only" id="tools-heading">Tools</h2></div></div>
      <div className="home-tools">{tools.map((tool) => <a className="home-tool" href={tool.href} key={tool.title} {...(tool.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}><h3>{tool.title}</h3><p>{tool.description}</p><span className="home-item-action">{tool.action} <ArrowUpRight size={16}/></span></a>)}</div>
    </section>

    <section className="home-contact" id="contact" aria-labelledby="contact-heading">
      <span className="section-kicker">GET IN TOUCH</span>
      <h2 className="sr-only" id="contact-heading">Contact</h2>
      <p>If you have questions, want to work with me, or just want to chat, I&apos;m always available :)</p>
      <div className="home-contact-links"><a href="mailto:nicobecodin@duck.com">nicobecodin@duck.com <ArrowUpRight size={18}/></a><a href="https://github.com/NicoBeCodin" target="_blank" rel="noreferrer">github.com/NicoBeCodin <ArrowUpRight size={18}/></a></div>
    </section>

    <SiteFooter />
  </div></main>;
}

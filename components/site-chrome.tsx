import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

export function SiteHeader() {
  return <header className="site-header">
    <Link className="wordmark" href="/" aria-label="nicobecodin home"><span className="wordmark-mark">&lt;<span>/</span>&gt;</span><span className="wordmark-name">nicobecodin</span></Link>
    <nav aria-label="Main navigation" className="top-nav"><Link href="/#about">About</Link><Link href="/#writing">Writing</Link><Link href="/#projects">Projects</Link><Link href="/#tools">Tools</Link></nav>
    <Link className="header-contact" href="/#contact">Get in touch <ArrowUpRight size={16}/></Link>
  </header>;
}

export function SiteFooter() {
  return <footer className="site-footer site-footer-simple"><small>© 2026 · Notes on code and markets</small><div className="footer-links"><Link href="/">Home</Link><Link href="/writing">Articles</Link><Link href="/projects">Projects</Link></div></footer>;
}

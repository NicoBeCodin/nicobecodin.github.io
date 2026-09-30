import { ArrowUpRight } from 'lucide-react';

export function SiteHeader() {
  return <header className="site-header">
    <a className="wordmark" href="/" aria-label="nicobecodin home"><span className="wordmark-mark">&lt;<span>/</span>&gt;</span><span className="wordmark-name">nicobecodin</span></a>
    <nav aria-label="Main navigation" className="top-nav"><a href="/#about">About</a><a href="/#writing">Writing</a><a href="/#projects">Projects</a><a href="/#tools">Tools</a></nav>
    <a className="header-contact" href="/#contact">Get in touch <ArrowUpRight size={16}/></a>
  </header>;
}

export function SiteFooter() {
  return <footer className="site-footer site-footer-simple"><small>© 2026 · Notes on code and markets</small><div className="footer-links"><a href="/">Home</a><a href="/writing/">Articles</a><a href="/projects/">Projects</a></div></footer>;
}

import type { Metadata } from 'next';
import Image from 'next/image';
import { ArrowLeft, Download } from 'lucide-react';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';

export const metadata: Metadata = {
  title: 'tmux cheat sheet wallpaper — nicobecodin',
  description: 'A dark tmux quick-reference wallpaper. Preview it and download a 1080p or 4K copy.',
  alternates: { canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://nicobecodin.github.io'}/tools/tmux-cheatsheet/` },
  openGraph: { title: 'tmux cheat sheet wallpaper', description: 'A dark tmux quick-reference wallpaper, available in 1080p and 4K.', images: [{ url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://nicobecodin.github.io'}/downloads/tmux-cheatsheet-1920x1080.png`, width: 1920, height: 1080, alt: 'Dark tmux quick-reference wallpaper' }] },
  twitter: { card: 'summary_large_image', title: 'tmux cheat sheet wallpaper', description: 'A dark tmux quick-reference wallpaper, available in 1080p and 4K.', images: [`${process.env.NEXT_PUBLIC_SITE_URL || 'https://nicobecodin.github.io'}/downloads/tmux-cheatsheet-1920x1080.png`] },
};

export default function TmuxCheatsheetPage() {
  return <main><div className="page-shell"><SiteHeader />
    <section className="tmux-page" aria-labelledby="tmux-title">
      <a className="back-link" href="/#tools"><ArrowLeft size={16}/> Back to tools</a>
      <div className="tmux-intro"><span className="section-kicker">SMALL TOOLS / TMUX</span><h1 id="tmux-title">tmux cheat sheet wallpaper</h1><p>I wanted the tmux shortcuts I use to be one glance away, so I made this desktop wallpaper. It covers sessions, windows, panes, copy mode and a few commands I keep forgetting.</p></div>
      <div className="tmux-preview"><Image unoptimized src="/downloads/tmux-cheatsheet-1920x1080.png" width={1920} height={1080} alt="Dark tmux quick-reference wallpaper with columns for sessions, windows, panes, copy mode and help commands." /></div>
      <div className="tmux-downloads"><a href="/downloads/tmux-cheatsheet-1920x1080.png" download="tmux-cheatsheet-1920x1080.png"><Download size={17}/> Download 1080p PNG</a><a href="/downloads/tmux-cheatsheet-3840x2160.png" download="tmux-cheatsheet-3840x2160.png"><Download size={17}/> Download 4K PNG</a></div>
      <p className="tmux-credit">The command reference is based on <a href="https://tmuxcheatsheet.com/" target="_blank" rel="noreferrer">tmuxcheatsheet.com</a>; I made this wallpaper layout for my own desktop.</p>
    </section><SiteFooter />
  </div></main>;
}

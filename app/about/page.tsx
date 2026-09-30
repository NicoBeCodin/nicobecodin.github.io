import type { Metadata } from 'next';
import { ArrowUpRight } from 'lucide-react';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';

export const metadata: Metadata = {
  title: 'About & CV — nicobecodin',
  description: 'A student building with Rust and C++, and learning about market infrastructure and distributed systems.',
  alternates: { canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://nicobecodin.github.io'}/about/` },
};

export default function AboutPage() {
  return <main><div className="page-shell"><SiteHeader/>
    <section className="interior-hero about-hero"><span className="section-kicker">ABOUT / CV</span><h1>A bit more about me.</h1><p>I&apos;m a computer science undergraduate interested in the infrastructure behind electronic markets and decentralized protocols. I learn best by building small versions and finding out where my assumptions break.</p></section>
    <div className="cv-layout"><div className="cv-intro"><p>My path began in applied mathematics and economics, then moved into high-performance computing. That combination led me toward market microstructure, Rust and C++, and decentralized exchange design.</p><p>I&apos;m currently building a market-making research system and Light DEX. I write about the implementation decisions and the parts that surprise me along the way.</p><a className="inline-arrow" href="mailto:nicobecodin@duck.com">nicobecodin@duck.com <ArrowUpRight size={17}/></a></div>
      <div className="cv-detail">
        <section><span className="cv-label">EXPERIENCE</span><div className="cv-entry"><div><h2>Quantitative Analyst Intern</h2><span>CRYPTO BROKER · SIX MONTHS</span></div><p>Worked on a C++ crypto RFQ pricing and execution module, and researched market-making strategies with Python backtests across market regimes and liquidity conditions.</p></div><div className="cv-entry"><div><h2>Data Science Intern</h2><span>AEROSPACE · INTERNSHIP</span></div><p>Simulated aeronautics-related physics models using machine learning tools.</p></div></section>
        <section><span className="cv-label">EDUCATION</span><div className="cv-entry"><div><h2>High Performance Computing &amp; Simulation</h2><span>COMPUTER SCIENCE STUDIES</span></div><p>Parallel and distributed programming, multicore architectures, operating systems, compilation and performance evaluation.</p></div><div className="cv-entry"><div><h2>Applied Mathematics, Computer Science &amp; Economics</h2><span>UNDERGRADUATE STUDY</span></div><p>Quantitative and computational foundations across mathematics, computing and economics.</p></div></section>
        <section><span className="cv-label">TOOLS &amp; INTERESTS</span><p className="cv-skills">Rust · C++ · Python · Linux · distributed systems · market data · DeFi · concurrency · quantitative research</p></section>
        <section><span className="cv-label">ELSEWHERE</span><p><a className="inline-arrow" href="https://github.com/NicoBeCodin" target="_blank" rel="noreferrer">github.com/NicoBeCodin <ArrowUpRight size={16}/></a></p><p><a className="inline-arrow" href="mailto:nicobecodin@duck.com">nicobecodin@duck.com <ArrowUpRight size={16}/></a></p><p><a className="inline-arrow" href="/writing/">Read the build log <ArrowUpRight size={16}/></a></p></section>
      </div></div><SiteFooter/>
  </div></main>;
}

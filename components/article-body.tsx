import { HotstuffWalkthrough, MerkleWalkthrough, StateSharingWalkthrough } from './article-interactives';
import { splitArticleFigures } from '../lib/article-figures';

function CapacityFigure() {
  return <figure className="article-diagram">
    <img src="/diagrams/light-dex-capacity.svg" width="900" height="540" loading="lazy" alt="Two four-validator runs: 2,600 requested TPS achieved 2,593 successful TPS and 310 millisecond p95 latency over 120 seconds. At 2,800 requested TPS, successful throughput was 2,771 and p95 latency rose to 796 milliseconds over 90 seconds." />
    <figcaption>Same six-market workload and 64 submission workers; different run durations. Both delivered every scheduled slot and passed journal replay. The dashed line is the 500 ms latency target. <a href="/data/light-dex-capacity.json">Aggregate data and methodology</a>.</figcaption>
  </figure>;
}

const figures = {
  hotstuff: HotstuffWalkthrough,
  'state-sharing': StateSharingWalkthrough,
  merkle: MerkleWalkthrough,
  capacity: CapacityFigure,
};

// Only known, standalone figure markers from trusted repository Markdown
// become components. All other HTML keeps the existing rendering behaviour.
export function ArticleBody({html}:{html:string}) {
  const sections=splitArticleFigures(html);
  return <div className="article-body">{sections.map((section,index)=>{
    if(section.type === 'figure'){
      const Figure=figures[section.name];
      return <Figure key={index}/>;
    }
    return <div className="article-prose-section" key={index} dangerouslySetInnerHTML={{__html:section.value}}/>;
  })}</div>;
}

import { HotstuffWalkthrough, MerkleWalkthrough, StateSharingWalkthrough } from './article-interactives';
import { splitArticleFigures } from '../lib/article-figures';

function CapacityFigure() {
  return <figure className="article-diagram">
    <img src="/diagrams/light-dex-capacity.svg" width="900" height="540" loading="lazy" alt="Two four-validator runs: 2,600 requested TPS achieved 2,593 successful TPS and 310 millisecond p95 latency over 120 seconds. At 2,800 requested TPS, successful throughput was 2,771 and p95 latency rose to 796 milliseconds over 90 seconds." />
    <figcaption>Same six-market workload and 64 submission workers; different run durations. Both delivered every scheduled slot and passed journal replay. The dashed line is the 500 ms latency target. <a href="/data/light-dex-capacity.json">Aggregate data and methodology</a>.</figcaption>
  </figure>;
}

function StaticFigure({ src, width, height, alt, caption, wide = false }: {
  src: string; width: number; height: number; alt: string; caption: string; wide?: boolean;
}) {
  return <figure className={`article-diagram${wide ? ' article-diagram-wide' : ''}`}>
    <img src={src} width={width} height={height} loading="lazy" alt={alt} />
    <figcaption>{caption}</figcaption>
  </figure>;
}

const figures = {
  hotstuff: HotstuffWalkthrough,
  'hotstuff-topology': () => <StaticFigure
    src="/diagrams/hotstuff-topology.svg" width={800} height={310}
    alt="Four PBFT replicas exchange votes with every other replica. In HotStuff, three replicas send phase votes to a leader, which distributes a certificate."
    caption="Who receives the votes during one phase. In HotStuff, the leader collects them and sends a certificate back."
  />,
  'state-sharing': StateSharingWalkthrough,
  merkle: MerkleWalkthrough,
  capacity: CapacityFigure,
  'leafpay-private-withdrawal': () => <StaticFigure
    src="/diagrams/leafpay-private-withdrawal.svg" width={780} height={432} wide
    alt="Four-leaf Merkle tree. L2 and its hashes up to the root are green; the sibling values L3 and H01 needed to recompute that root are orange."
    caption="A four-leaf example. Green is the recomputed path from the note; orange values are its siblings. The proof checks membership without publicly naming L2."
  />,
  'leafpay-tree-rollup': () => <StaticFigure
    src="/diagrams/leafpay-tree-rollup.svg" width={987} height={528} wide
    alt="Merkle mountain range after six completed 16-leaf batches. B0 through B3 form a stored 64-leaf peak; B4 and new batch B5 form a stored 32-leaf peak. Dashed lines show a separately derived verification root."
    caption="Solid branches are stored peak merges. The dashed top derives one root from unequal peaks. A partly filled next batch stays outside the stored peaks but can be included temporarily when checking a proof."
  />,
  'leafpay-memo-indexing': () => <StaticFigure
    src="/diagrams/leafpay-memo-indexing.svg" width={867} height={493} wide
    alt="Eight-leaf Merkle subtree reconstructed from one memo. L5's path is green; its sibling leaf L4 and sibling hashes H67 and H03 are orange."
    caption="The memo supplies the eight leaves; pairwise hashes reconstruct their subtree. The green path and orange siblings form this portion of L5's witness."
  />,
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

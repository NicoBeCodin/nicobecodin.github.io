import { HotstuffWalkthrough, MerkleWalkthrough, StateSharingWalkthrough } from './article-interactives';

const figures = {
  hotstuff: HotstuffWalkthrough,
  'state-sharing': StateSharingWalkthrough,
  merkle: MerkleWalkthrough,
};

// Only known, standalone figure markers from trusted repository Markdown
// become components. All other HTML keeps the existing rendering behaviour.
export function ArticleBody({html}:{html:string}) {
  const sections=html.split(/<!-- interactive:(hotstuff|state-sharing|merkle) -->/g);
  return <div className="article-body">{sections.map((section,index)=>{
    if(index%2===1){
      const Figure=figures[section as keyof typeof figures];
      return <Figure key={index}/>;
    }
    return <div className="article-prose-section" key={index} dangerouslySetInnerHTML={{__html:section}}/>;
  })}</div>;
}

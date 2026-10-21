import type { ReactNode } from 'react';

const c = { bg: '#0b151b', ink: '#d5e7e5', muted: '#91aab0', line: '#36515a', green: '#83ead1', orange: '#f0b37b', red: '#f39b9b' };
function Canvas({ children, label, height = 320 }: { children: ReactNode; label: string; height?: number }) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 800 ${height}`} role="img" aria-label={label} style={{ background: c.bg, fontFamily: 'ui-monospace, monospace', fontSize: 14 }}>
    <title>{label}</title><rect width="800" height={height} rx="8" fill={c.bg}/>{children}
  </svg>;
}
function Text({ x, y, children, color = c.ink, size = 14 }: { x: number; y: number; children: ReactNode; color?: string; size?: number }) {
  return <text x={x} y={y} fill={color} fontSize={size} textAnchor="middle">{children}</text>;
}
function Box({ x, y, label, active = false, width = 138, color = c.green }: { x: number; y: number; label: string; active?: boolean; width?: number; color?: string }) {
  return <g><rect x={x - width / 2} y={y - 19} width={width} height="38" rx="7" fill={active ? '#193b3b' : '#13232c'} stroke={active ? color : c.line} strokeWidth={active ? 2 : 1}/><Text x={x} y={y + 5} color={active ? color : c.ink}>{label}</Text></g>;
}
function Arrow({ x1, y1, x2, y2, active = true, dashed = false, color = c.green, moving = false }: { x1: number; y1: number; x2: number; y2: number; active?: boolean; dashed?: boolean; color?: string; moving?: boolean }) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const points = [[x2, y2], [x2 - 9 * Math.cos(angle - .45), y2 - 9 * Math.sin(angle - .45)], [x2 - 9 * Math.cos(angle + .45), y2 - 9 * Math.sin(angle + .45)]];
  return <g opacity={active ? 1 : .38}><line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="2" strokeDasharray={dashed ? '6 5' : undefined}/><polygon points={points.map(p => p.join(',')).join(' ')} fill={color}/>{moving&&<circle className="diagram-packet" r="5" fill="#ffffff"><animateMotion dur="1.2s" repeatCount="indefinite" path={`M ${x1} ${y1} L ${x2} ${y2}`}/></circle>}</g>;
}

export function TopologyDiagram() {
  const left = [[100, 110], [280, 110], [100, 240], [280, 240]];
  const right = [[590, 100], [470, 240], [590, 240], [710, 240]];
  return <Canvas label="Vote topology: all-to-all PBFT and leader-collected HotStuff votes" height={310}>
    <Text x={190} y={35}>PBFT · replica broadcasts</Text><Text x={590} y={35}>HotStuff · votes to leader</Text>
    <line x1="400" y1="55" x2="400" y2="280" stroke={c.line}/>
    {left.flatMap(([x,y], i) => left.slice(i+1).map(([xx,yy], j) => {
      const length=Math.hypot(xx-x,yy-y), ux=(xx-x)/length, uy=(yy-y)/length;
      return <g key={`${i}-${j}`}><Arrow x1={x+ux*32-uy*5} y1={y+uy*32+ux*5} x2={xx-ux*32-uy*5} y2={yy-uy*32+ux*5} color={c.orange}/><Arrow x1={xx-ux*32+uy*5} y1={yy-uy*32-ux*5} x2={x+ux*32+uy*5} y2={y+uy*32-ux*5} color={c.orange}/></g>;
    }))}
    {right.slice(1).map(([x,y], i) => <Arrow key={i} x1={x} y1={y-22} x2={590+(i-1)*15} y2={125}/>)}
    {left.map(([x,y],i) => <Box key={i} x={x} y={y} label={`N${i}`} width={52}/>)}
    {right.map(([x,y],i) => <Box key={i} x={x} y={y} label={i === 0 ? 'N0 · leader' : `N${i}`} width={i===0?134:52} active={i===0}/>)}
    <Text x={190} y={291} size={12} color={c.muted}>Each pair exchanges votes</Text>
    <Text x={590} y={291} size={12} color={c.muted}>Certificate sent back afterward</Text>
  </Canvas>;
}

export type ConsensusFrame = {
  label: string; text: string; flow: 'out' | 'in' | 'none' | 'new-view';
  evidence: string; votes: string; lock: boolean; failed?: boolean; leader?: number;
};
export const happyFrames: ConsensusFrame[] = [
  {label:'A block is ready', text:'N0 leads view 0. The replicas expect the same next height. A certificate requires three distinct voters, including the leader when it votes.',flow:'none',evidence:'No QC for B yet',votes:'0 / 3',lock:false},
  {label:'Prepare',text:'N0 sends block B and its justification. Replicas validate the proposal before returning a prepare vote.',flow:'out',evidence:'Proposal B + justification',votes:'1 / 3 · leader vote',lock:false},
  {label:'Prepare votes',text:'N1 and N2 return matching votes. Together with N0, they form a prepare QC. N3 can respond later; unanimity is not required.',flow:'in',evidence:'Prepare QC for B',votes:'3 / 3',lock:false},
  {label:'PreCommit',text:'The leader distributes the prepare QC. Replicas check it, then send pre-commit votes.',flow:'out',evidence:'Prepare QC for B',votes:'1 / 3 · new phase',lock:false},
  {label:'Pre-commit votes',text:'A quorum of pre-commit votes produces a pre-commit QC. These are new votes, not the previous phase’s votes counted again.',flow:'in',evidence:'PreCommit QC for B',votes:'3 / 3',lock:false},
  {label:'Commit · take the lock',text:'Replicas receive the pre-commit QC, record it as locked_qc, and return commit votes. The Commit message is not yet a final decision.',flow:'out',evidence:'PreCommit QC for B',votes:'1 / 3 · new phase',lock:true},
  {label:'Commit votes',text:'Three matching commit votes form the commit QC. The leader can now announce the decision.',flow:'in',evidence:'Commit QC for B',votes:'3 / 3',lock:true},
  {label:'Decide',text:'The leader distributes the commit QC. Each replica that has B verifies the decision and asks the node to persist the block.',flow:'out',evidence:'Commit QC for B',votes:'Quorum certified',lock:true},
  {label:'Durable block',text:'After the journal write and disk synchronization succeed, the node publishes the prepared exchange state. A delayed replica uses catch-up to recover missing blocks.',flow:'none',evidence:'B + certificate in journal',votes:'Next height',lock:true},
];
export const failureFrames: ConsensusFrame[] = [
  {label:'Leader stops after locks',text:'N1, N2 and N3 have received B’s pre-commit QC and locked on B. N0 stops before distributing a decision.',flow:'none',evidence:'PreCommit QC for B retained',votes:'No decision yet',lock:true,failed:true},
  {label:'Timeout → NewView',text:'The surviving validators broadcast NewView reports carrying their high_qc. This implementation broadcasts these reports; the picture highlights the copies collected by N1.',flow:'new-view',evidence:'Three NewView reports',votes:'3 / 3 · includes N1',lock:true,failed:true,leader:1},
  {label:'StartView',text:'N1 becomes leader for view 1 after gathering a quorum. It broadcasts the selected certificate and signed view-change evidence to the survivors.',flow:'out',evidence:'Highest reported QC: B',votes:'View 1 ready',lock:true,failed:true,leader:1},
  {label:'Carry B forward',text:'In this scenario N1 already has B. It reproposes B at the same height, carrying the QC. The three surviving validators must all participate to finish its voting phases.',flow:'out',evidence:'Prepare B in view 1',votes:'Same height · new view',lock:true,failed:true,leader:1},
];

export function HotstuffDiagram({ frame, moving=false }: { frame: ConsensusFrame; moving?: boolean }) {
  const leader = frame.leader ?? 0;
  const positions = [[400,65],[135,210],[400,210],[665,210]];
  return <Canvas label={`${frame.label}. ${frame.evidence}. ${frame.votes}.`} height={320}>
    {positions.map(([x,y],i) => {
      if(i===leader || (frame.failed && i===0) || frame.flow==='none')return null;
      if(frame.flow==='in' && i===3)return null;
      const [lx,ly]=positions[leader];
      const incoming=frame.flow==='in'||frame.flow==='new-view';
      const dx=x-lx,dy=y-ly,len=Math.hypot(dx,dy);
      const a=[lx+dx/len*53,ly+dy/len*32],b=[x-dx/len*53,y-dy/len*32];
      return <Arrow key={`${frame.label}-${i}`} x1={incoming?b[0]:a[0]} y1={incoming?b[1]:a[1]} x2={incoming?a[0]:b[0]} y2={incoming?a[1]:b[1]} dashed={frame.flow==='new-view'} moving={moving}/>;
    })}
    {positions.map(([x,y],i)=><g key={i}><Box x={x} y={y} label={`N${i}${frame.failed&&i===0?' · stopped':i===leader?' · leader':''}`} active={i===leader} color={frame.failed&&i===0?c.red:c.green}/>
      <Text x={x} y={y+43} size={12} color={frame.failed&&i===0?c.red:c.muted}>{frame.failed&&i===0?'no response':i===0?'collects certificates':frame.lock?'lock: B':'no lock on B'}</Text></g>)}
    <Text x={400} y={284} color={c.green}>{frame.evidence}</Text>
    <Text x={400} y={308} color={c.muted} size={12}>{frame.votes}</Text>
  </Canvas>;
}

export function HotstuffSummaryDiagram() {
  const stages=['Prepare','PreCommit','Commit','Decide'];
  return <Canvas label="Phased HotStuff: prepare votes form prepare QC, pre-commit votes form pre-commit QC, commit votes form commit QC, then Decide." height={255}>
    <Text x={400} y={34}>ONE BLOCK · THREE VOTING PHASES</Text>
    {stages.map((stage,i)=><g key={stage}>{i<3&&<Arrow x1={153+i*193} y1={95} x2={215+i*193} y2={95}/>}<Box x={110+i*193} y={95} width={150} label={stage} active={i===2}/><Text x={110+i*193} y={146} size={12} color={c.muted}>{['Prepare QC','PreCommit QC','Commit QC','Persist block'][i]}</Text></g>)}
    <Text x={400} y={197} size={13} color={c.green}>Lock when receiving the PreCommit QC in Commit.</Text>
    <Text x={400} y={224} size={12} color={c.muted}>Four validators · quorum of three · individual signatures</Text>
  </Canvas>;
}

export const sharingFrames = [
  ['Committed state','Alice’s account and the BTC and ETH books belong to the current state. Boxes stand for collection branches; the real structures contain many more entries.'],
  ['Fork the roots','The candidate shares the existing collection roots. Creating the fork does not copy every account or order. Both versions still describe the same state.'],
  ['Change Alice','The candidate copies the affected collection path and stages Alice’s changed value. Its BTC and ETH branches still point to the unchanged data.'],
  ['Discard a failed candidate','If the transaction fails, drop its speculative changes. The original account and books remain available through the committed roots.'],
];
export function SharingDiagram({ step=2 }: { step?: number }) {
  const candidate=step===1||step===2;
  return <Canvas label={`${sharingFrames[step][0]}: committed and candidate state share untouched books.`} height={310}>
    {[145,400,655].map(x=><Arrow key={x} x1={210} y1={75} x2={x} y2={151} color={c.muted}/>)}
    {candidate&&[145,400,655].map((x,i)=><Arrow key={x} x1={590} y1={75} x2={step===2&&i===0?520:x} y2={step===2&&i===0?238:151} dashed color={step===2&&i===0?c.orange:c.green}/>)}
    <Box x={210} y={55} label="Committed" width={170}/>
    <Box x={590} y={55} label={step===0?'No fork yet':step===3?'Discarded':'Candidate'} width={170} active={candidate}/>
    <Box x={145} y={175} label="Alice: 100 USD"/>
    <Box x={400} y={175} label="BTC book"/>
    <Box x={655} y={175} label="ETH book"/>
    {step===2&&<Box x={520} y={261} label="Alice′: 90 USD" active color={c.orange} width={170}/>}
    <Text x={230} y={270} size={12} color={c.muted}>{step===2?'Original remains unchanged':step===3?'Original state survives':'Collection branches, simplified'}</Text>
  </Canvas>;
}
export const merkleFrames = [
  ['Cached root','All eight leaves and their ancestors already have hashes. This balanced illustration stands in for the compressed tree used by the implementation.'],
  ['Record two dirty leaves','Transactions change A and B. Pending writes keep the latest value for each key; repeated writes to A do not require retaining every intermediate leaf hash.'],
  ['Recompute their shared path','Hash the final leaf values, then their shared ancestors. The other six leaves and untouched subtrees reuse cached hashes.'],
];
export function MerkleDiagram({ step=2 }: { step?: number }) {
  const nodes=[{x:400,y:40,label:'Root',hot:true},{x:220,y:110,label:'HABCD',hot:true},{x:580,y:110,label:'HEFGH',hot:false},
    ...[130,310,490,670].map((x,i)=>({x,y:185,label:['HAB','HCD','HEF','HGH'][i],hot:i===0})),
    ...[85,175,265,355,445,535,625,715].map((x,i)=>({x,y:260,label:'ABCDEFGH'[i],hot:i<2}))];
  return <Canvas label={`${merkleFrames[step][0]}. Leaves A and B share the path HAB, HABCD, root.`} height={310}>
    {nodes.slice(1).map((node,index)=>{const parent=nodes[Math.floor(index/2)];return <line key={node.label} x1={parent.x} y1={parent.y+19} x2={node.x} y2={node.y-19} stroke={step===2&&node.hot?c.orange:c.line} strokeWidth={step===2&&node.hot?3:1.5}/>;})}
    {nodes.map((n,i)=><Box key={n.label} x={n.x} y={n.y} label={n.label} width={i>=7?60:105} active={n.hot&&(step===2||step===1&&i>=7)} color={c.orange}/>)}
    <Text x={400} y={300} color={c.muted} size={12}>{step===0?'Existing hashes cached':step===1?'Changed: A, B · all other leaves unchanged':'Orange: recomputed · dim: reused'}</Text>
  </Canvas>;
}

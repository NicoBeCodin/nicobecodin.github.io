'use client';

import { useEffect, useId, useState } from 'react';
import { failureFrames, happyFrames, HotstuffDiagram, MerkleDiagram, merkleFrames, SharingDiagram, sharingFrames } from './article-diagrams';
import type { ReactNode } from 'react';

function Walkthrough({ title, frames, render, staticImage, controls }: {
  title: string; frames: readonly (readonly string[])[]; render: (step: number, moving: boolean) => ReactNode;
  staticImage: string; controls?: ReactNode;
}) {
  const [step,setStep]=useState(0);
  const [playing,setPlaying]=useState(false);
  const [reduced,setReduced]=useState(false);
  const id=useId();
  useEffect(()=>{
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    const update=()=>{setReduced(media.matches);if(media.matches)setPlaying(false);};
    update(); media.addEventListener('change',update);
    return()=>media.removeEventListener('change',update);
  },[]);
  useEffect(()=>{
    if(!playing||reduced)return;
    const timer=window.setTimeout(()=>{
      if(step>=frames.length-1)setPlaying(false);
      else setStep(step+1);
    },2800);
    return()=>window.clearTimeout(timer);
  },[playing,reduced,frames.length,step]);
  function move(next:number){setPlaying(false);setStep(Math.max(0,Math.min(frames.length-1,next)));}
  return <figure className="article-walkthrough" aria-labelledby={`${id}-title`}>
    <div className="walkthrough-heading"><span className="figure-kicker">STEP BY STEP</span><h3 id={`${id}-title`}>{title}</h3>{controls}</div>
    <div className="walkthrough-live">
      <div className="diagram-viewport">{render(step,playing&&!reduced)}</div>
      <div className="walkthrough-progress" aria-hidden="true">{frames.map((_,i)=><span key={i} className={i<=step?'is-reached':''}/>)}</div>
      <div className="walkthrough-caption" aria-live={playing?'off':'polite'} aria-atomic="true"><span className="figure-kicker">STEP {step+1} / {frames.length}</span><h4>{frames[step][0]}</h4><p>{frames[step][1]}</p></div>
      <div className="walkthrough-controls">
        <button type="button" onClick={()=>move(step-1)} disabled={step===0} aria-label="Previous step">← Back</button>
        <button type="button" onClick={()=>move(step+1)} disabled={step===frames.length-1} aria-label="Next step">Next →</button>
        {!reduced&&<button type="button" aria-pressed={playing} onClick={()=>{if(step===frames.length-1)setStep(0);setPlaying(!playing);}}>{playing?'Pause':'Play'}</button>}
        <button type="button" onClick={()=>move(0)}>Reset</button>
      </div>
    </div>
    <img className="diagram-print" src={staticImage} alt={`${title}: static overview`} width="800" height="320"/>
    <noscript><p>Interactive controls need JavaScript. <a href={staticImage}>Open the static illustration</a>.</p></noscript>
    <figcaption><a href={staticImage}>Open the static illustration</a> to save or print it.</figcaption>
  </figure>;
}
export function HotstuffWalkthrough(){
  const [failure,setFailure]=useState(false);
  const frames=failure?failureFrames:happyFrames;
  const controls=<div className="walkthrough-scenarios" role="group" aria-label="Consensus scenario">
    <button type="button" aria-pressed={!failure} onClick={()=>setFailure(false)}>One block</button>
    <button type="button" aria-pressed={failure} onClick={()=>setFailure(true)}>Leader fails</button>
  </div>;
  return <Walkthrough key={String(failure)} title="A certificate, one phase at a time" frames={frames.map(f=>[f.label,f.text])} render={(step,moving)=><HotstuffDiagram frame={frames[step]} moving={moving}/>} staticImage="/diagrams/hotstuff-phases.svg" controls={controls}/>;
}
export function StateSharingWalkthrough(){
  return <Walkthrough title="Try a change without copying the exchange" frames={sharingFrames} render={step=><SharingDiagram step={step}/>} staticImage="/diagrams/state-sharing.svg"/>;
}
export function MerkleWalkthrough(){
  return <Walkthrough title="Two changed leaves, one shared path" frames={merkleFrames} render={step=><MerkleDiagram step={step}/>} staticImage="/diagrams/incremental-merkle.svg"/>;
}

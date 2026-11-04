"use client";
import {useEffect,useState} from 'react';
const origin = "https://light-dex.13.230.102.125.sslip.io";
type Network = {status?:string; height?:number; successful_order_tps?:number; gateway_commit_p95_ms?:number|null; latency_samples?:number};
export function LightDexLive() {
  const [network,setNetwork]=useState<Network|null>(null);
  const [connected,setConnected]=useState(false);
  useEffect(()=>{let active=true;const refresh=async()=>{try{const response=await fetch(origin+'/api/v1/network',{signal:AbortSignal.timeout(5000)});if(!response.ok)throw Error();const value=await response.json();if(active){setNetwork(value);setConnected(true);}}catch{if(active)setConnected(false);}};void refresh();const timer=setInterval(refresh,15000);return()=>{active=false;clearInterval(timer);};},[]);
  return <aside className="article-diagram" aria-label="Live Light DEX research network">
    <p style={{marginTop:0}}>Live network: 4 validators, 2 hosts.</p>
    <a href={origin} target="_blank" rel="noreferrer" style={{display:'inline-block',padding:'10px 18px',border:'1px solid currentColor',borderRadius:8}}>Try the live network ↗</a>
    <p role="status" style={{fontSize:14,marginBottom:0}}>{connected ? `${network?.status||'Connecting'} · Height ${network?.height??0} · ${(network?.successful_order_tps??0).toFixed(1)} successful order TPS` : 'Live status unavailable.'}{connected&&network?.gateway_commit_p95_ms!=null ? ` · Tokyo gateway p95 ${Math.round(network.gateway_commit_p95_ms)} ms (${network.latency_samples??0} samples, 5 min)` : ''}</p>
    <small>Test assets only. TPS is observed activity, not a capacity benchmark. A whole-host outage removes quorum.</small>
  </aside>;
}

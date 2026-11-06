'use client';

import { LIGHT_DEX_URL, useLightDexStatus } from './light-dex-status';

export function LightDexLive() {
  const { state, height } = useLightDexStatus();
  return <aside className="article-diagram light-dex-entry" aria-label="Light DEX demo">
    <a href={LIGHT_DEX_URL} target="_blank" rel="noreferrer">Try Light DEX ↗</a>
    <span role="status">{state === 'live' ? `Live · Block ${height}` : state === 'checking' ? 'Checking network' : 'Live status unavailable'}</span>
  </aside>;
}

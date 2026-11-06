'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, X } from 'lucide-react';

export const LIGHT_DEX_URL = 'https://light-dex.13.230.102.125.sslip.io';

type Network = {
  status: string;
  updated_at: number;
  height: number;
  quorum: number;
  validators: { online: boolean }[];
};

export function useLightDexStatus() {
  const [state, setState] = useState<'checking' | 'live' | 'unavailable'>('checking');
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let request: AbortController | undefined;
    async function refresh() {
      request = new AbortController();
      const timeout = setTimeout(() => request?.abort(), 5000);
      try {
        const response = await fetch(`${LIGHT_DEX_URL}/api/v1/network`, {
          signal: request.signal,
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('Status unavailable');
        const network: Network = await response.json();
        const age = Date.now() / 1000 - network.updated_at;
        const live = network.status === 'online' && age >= -30 && age < 60
          && network.quorum > 0
          && network.validators.filter(node => node.online).length >= network.quorum;
        if (active) {
          setState(live ? 'live' : 'unavailable');
          setHeight(network.height);
        }
      } catch {
        if (active) setState('unavailable');
      } finally {
        clearTimeout(timeout);
        if (active) timer = setTimeout(refresh, 20_000);
      }
    }
    void refresh();
    return () => { active = false; clearTimeout(timer); request?.abort(); };
  }, []);

  return { state, height };
}

export function LightDexStatus() {
  const { state } = useLightDexStatus();
  const label = state === 'live' ? 'Live ↗' : state === 'checking' ? 'Checking' : 'Unavailable';
  const content = <><i aria-hidden="true" />{label}</>;
  return <span className={`light-dex-status is-${state}`} role="status">
    {state === 'live'
      ? <a href={LIGHT_DEX_URL} target="_blank" rel="noreferrer" aria-label="Open the live Light DEX demo">{content}</a>
      : <span>{content}</span>}
  </span>;
}

export function LightDexBanner() {
  const { state } = useLightDexStatus();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(window.sessionStorage.getItem('light-dex-banner-dismissed') === '1');
    } catch {
      setDismissed(false);
    }
  }, []);

  if (state !== 'live' || dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try {
      window.sessionStorage.setItem('light-dex-banner-dismissed', '1');
    } catch {
      // The close button still works when browser storage is unavailable.
    }
  }

  return <aside className="light-dex-banner" aria-label="Light DEX is live">
    <a href={LIGHT_DEX_URL} target="_blank" rel="noreferrer">Light DEX is up, go try it now! <ArrowUpRight size={16} aria-hidden="true" /></a>
    <button type="button" onClick={dismiss} aria-label="Dismiss Light DEX banner"><X size={17} aria-hidden="true" /></button>
  </aside>;
}

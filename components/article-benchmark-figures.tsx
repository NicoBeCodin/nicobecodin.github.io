const chartStyle = {
  display: 'block',
  width: '100%',
  height: 'auto',
  background: '#0b151b',
  border: '1px solid #36515a',
  borderRadius: 5,
} as const;

const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const ink = '#d5e7e5';
const muted = '#91aab0';
const grid = '#29414a';
const before = '#f0b37b';
const after = '#83ead1';

export function StructuralSharingFigure() {
  const ticks = [0.1, 1, 10, 100, 1000, 10000];
  // A log axis keeps both 0.364 µs and 1,965 µs legible in the same plot.
  const x = (microseconds: number) => 72 + (Math.log10(microseconds) + 1) * 118;

  return <figure className="article-diagram article-diagram-wide">
    <svg viewBox="0 0 740 300" aria-labelledby="sharing-title sharing-desc" style={chartStyle}>
      <title id="sharing-title">Exchange snapshot time before and after structural sharing</title>
      <desc id="sharing-desc">For 10,000 accounts and 10,000 resting orders, the old snapshot took 1,965 microseconds and the persistent fork took 0.364 microseconds. The horizontal axis is logarithmic.</desc>
      <text x="32" y="37" fill={ink} fontFamily={mono} fontSize="17" fontWeight="700">What structural sharing saved</text>
      <text x="32" y="62" fill={muted} fontFamily={mono} fontSize="12">10,000 accounts · 10,000 resting orders · median snapshot time</text>
      {ticks.map((tick) => <g key={tick}>
        <line x1={x(tick)} x2={x(tick)} y1="91" y2="221" stroke={grid} strokeWidth="1" />
        <text x={x(tick)} y="245" fill={muted} fontFamily={mono} fontSize="11" textAnchor="middle">{tick.toLocaleString('en-US')}</text>
      </g>)}
      <line x1={x(0.364)} x2={x(1965)} y1="155" y2="155" stroke="#506c70" strokeWidth="3" />
      <circle cx={x(0.364)} cy="155" r="9" fill={after} />
      <circle cx={x(1965)} cy="155" r="9" fill={before} />
      <text x={x(0.364)} y="123" fill={after} fontFamily={mono} fontSize="13" fontWeight="700" textAnchor="middle">PERSISTENT FORK</text>
      <text x={x(0.364)} y="186" fill={ink} fontFamily={mono} fontSize="14" textAnchor="middle">0.364 µs</text>
      <text x={x(1965)} y="123" fill={before} fontFamily={mono} fontSize="13" fontWeight="700" textAnchor="middle">OLD SNAPSHOT</text>
      <text x={x(1965)} y="186" fill={ink} fontFamily={mono} fontSize="14" textAnchor="middle">1,965 µs</text>
      <text x="32" y="278" fill={muted} fontFamily={mono} fontSize="11">Time in microseconds · logarithmic scale · lower is better</text>
    </svg>
    <figcaption>Same 10,000-account, 10,000-order fixture, 100 samples per operation. This measures making a snapshot, not executing a transaction or end-to-end TPS. <a href="/data/light-dex-optimization-microbench.json">Data and method</a>.</figcaption>
  </figure>;
}

const quoteRows = [
  { label: 'Standalone + final root', individual: 833.94, batch: 243.77 },
  { label: 'Proposal build', individual: 464.42, batch: 340.30 },
  { label: 'Follower validation', individual: 277.41, batch: 272.24 },
];

export function QuoteBatchingFigure() {
  const plotLeft = 230;
  const plotWidth = 435;
  const x = (microseconds: number) => plotLeft + (microseconds / 900) * plotWidth;

  return <figure className="article-diagram article-diagram-wide">
    <svg viewBox="0 0 740 420" aria-labelledby="quotes-title quotes-desc" style={chartStyle}>
      <title id="quotes-title">Time to process eight cancellations and eight placements, individually or as one quote batch</title>
      <desc id="quotes-desc">Standalone execution and root calculation took 834 versus 244 microseconds. Proposal building took 464 versus 340 microseconds. Follower validation took 277 versus 272 microseconds. Lower is better.</desc>
      <text x="32" y="37" fill={ink} fontFamily={mono} fontSize="17" fontWeight="700">Batching a quote refresh</text>
      <text x="32" y="63" fill={muted} fontFamily={mono} fontSize="12">Eight cancels + eight placements · median of 300 samples</text>
      <rect x="32" y="80" width="12" height="12" rx="2" fill={before} />
      <text x="51" y="91" fill={muted} fontFamily={mono} fontSize="11">Individual transactions</text>
      <rect x="230" y="80" width="12" height="12" rx="2" fill={after} />
      <text x="249" y="91" fill={muted} fontFamily={mono} fontSize="11">One atomic quote batch</text>
      {[0, 200, 400, 600, 800].map((tick) => <g key={tick}>
        <line x1={x(tick)} x2={x(tick)} y1="113" y2="370" stroke={grid} strokeWidth="1" />
        <text x={x(tick)} y="393" fill={muted} fontFamily={mono} fontSize="11" textAnchor="middle">{tick}</text>
      </g>)}
      {quoteRows.map((row, index) => {
        const y = 120 + index * 83;
        return <g key={row.label}>
          <text x="32" y={y + 17} fill={ink} fontFamily={mono} fontSize="12">{row.label}</text>
          <rect x={plotLeft} y={y} width={x(row.individual) - plotLeft} height="18" rx="3" fill={before} />
          <rect x={plotLeft} y={y + 25} width={x(row.batch) - plotLeft} height="18" rx="3" fill={after} />
          <text x={x(row.individual) + 7} y={y + 14} fill={ink} fontFamily={mono} fontSize="11">{Math.round(row.individual)} µs</text>
          <text x={x(row.batch) + 7} y={y + 39} fill={ink} fontFamily={mono} fontSize="11">{Math.round(row.batch)} µs</text>
        </g>;
      })}
      <text x="32" y="411" fill={muted} fontFamily={mono} fontSize="11">Median time in microseconds · lower is better</text>
    </svg>
    <figcaption>One signer and nonce for the atomic batch. The standalone path is about 3.4× faster, but proposal building gains about 27% and follower validation barely changes. These are local execution timings, not a chain-TPS result. <a href="/data/light-dex-optimization-microbench.json">Data and method</a>.</figcaption>
  </figure>;
}

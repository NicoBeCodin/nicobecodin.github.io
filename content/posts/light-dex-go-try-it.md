---
title: "Light DEX: Go try it"
description: A working trading blockchain on a refurbished ThinkPad, with a control plane for launching validators, trading agents and a few experiments of your own.
date: 2026-11-03
series: Building Light DEX
part: 5
readTime: 10 min read
---

## Why I built this

Over the past two months, after finishing my M2 internship in quant finance, I found myself wondering how decentralized exchanges actually work. They've been popping up pretty quickly since Hyperliquid exploded in popularity, and I wanted to understand what was happening underneath the trading interface.

I like the idea of an exchange where several independent computers agree on the orders, trades and balances. But how do you get those computers to agree quickly enough for trading? What happens when one stops responding? And how much of the time is spent matching orders, rather than getting everyone to agree on them?

With a background in high performance computing, squeezing more performance out of a computer is something I enjoy. And to be honest, I don't have the resources for the 128 GB RAM and 16 vCPU setup listed in [this Hyperliquid full-node guide](https://rpcnode.dev/blog/hyperliquid-full-node-complete-guide). Those are non-validator specs; the [official node repository](https://github.com/hyperliquid-dex/node#machine-specs) lists 32 vCPUs for a validator. My refurbished ThinkPad would have to do.

So here's a first version of Light DEX that people can actually try. Not to be confused with lighter.xyz lol. The name comes from wanting a lightweight implementation I could run and experiment with on my laptop. Building a DEX seemed like a good excuse to explore both exchanges and blockchain performance.

The code is available on [GitHub](https://github.com/NicoBeCodin/light_dex). It comes with a browser control plane, so you can launch validators, add trading agents and watch what happens without following seven terminals at once.

I've written a few posts about building it already, but quite a lot happened between those posts. I wasn't exactly a regular writer while I was heads down trying to make it faster. This is a tour of where it is now, and a few things I learned along the way.

<figure class="article-diagram">
  <video controls playsinline preload="metadata" aria-label="A tour of the Light DEX control plane">
    <source src="/videos/light-dex-tour.mp4" type="video/mp4">
    <a href="/videos/light-dex-tour.mp4">Watch the Light DEX control plane tour</a>
  </video>
  <figcaption>A quick tour of the control plane, markets and participants. You can run the same interface locally.</figcaption>
</figure>

## What you can do with it

The control plane is where you'll spend most of your time. In Node operations, you can choose the number of validators, consensus algorithm, block time, timeout and leader rotation interval, then launch the chain. The default rotates leaders every four blocks.

Node monitoring shows what each validator thinks is happening: its height, current leader, pending transactions and recent activity. You can query a node directly, pause it or kill it and watch the survivors react. Having those controls next to the status made debugging much easier than matching log lines across processes.

Once the chain is running, add some participants. Each has its own address and signing key, and claims test assets through a faucet transaction before trading. The assets are made up; the orders still go through the actual transaction and consensus path.

There are market makers that follow Binance, makers with inventory-sensitive quoting, random order placers and agents that react to the local price trend. You can change their parameters while they run, or load a mix instead of creating them individually. Loading a mix stages the participants; Claim & launch fleet gets them started.

The market page shows the book, recent trades, balances, orders and positions. You can select a participant to inspect the exchange from its point of view. BTC, ETH, BNB, XRP and SOL each have separate spot and perpetual markets. Perps have collateral, cross or isolated margin, funding and an external liquidation keeper. Participants use public exchange data or the local book to make decisions, then trade inside Light DEX.

Start small, then add more agents and see when the backlog starts growing. That's one of the easiest ways to see the chain getting overwhelmed. A growing backlog means transactions are arriving faster than they're being cleared. Execution, consensus, networking or a bad leader handoff can all contribute.

## Following one order

An agent signs a transaction using Ed25519 and sends it to a validator. The validator checks it and adds it to its mempool, which is the pending work it knows about. Transactions are forwarded in batches to the current leader, and shared ahead of time with peers so future proposals don't always have to carry everything from scratch.

The leader selects transactions and executes a candidate block. Followers check the proposal and its effects before voting. Matching is deterministic: given the same starting state and ordered transactions, everyone should produce the same book, balances and positions.

Account nonces prevent replay. I started with a much stricter sequencing approach, but the current implementation uses a bounded window of unused nonces. That allows independent transactions from an account to arrive out of order without one missing transaction blocking everything behind it. It doesn't fix application dependencies: cancelling an order that hasn't been created yet is still a problem.

There is no MEV profit-maximizing scheduler here. Proposal selection is about finding valid work efficiently, though MEV could be interesting to explore.

The UI defaults to chained HotStuff. It pipelines proposals, and a block commits once the required chain of three certificates has formed. I went through that mechanism in [Making sense of HotStuff](/writing/building-a-dex-part-3/).

There is also a [HotStuff2-style implementation](https://eprint.iacr.org/2023/397.pdf), with prepare and final voting phases. That's the mode used for the cross-region results below. It's a research implementation because I've adapted parts of the messaging and handoff, and I'm still expanding the fault tests. It has been the more promising option in the recent cross-region experiments.

Every validator has equal voting weight. With seven validators, a quorum is five. There is no stake weighting, and the validator set is fixed for a session.

The configured block time isn't the same as finality. A batching trigger can make a leader propose earlier when the protocol allows it; the periodic timer is another production trigger. The block still has to travel, be checked and gather the required votes.

Once a block commits, its certified contents are journaled and the committed state becomes visible through the read API. The UI also has an explorer for inspecting those blocks and transactions.

## Keeping the price consistent

The perpetual markets need a common mark price. Having every validator read an exchange independently and use its latest local price would be a pretty easy way to make them disagree.

On one computer, a separate market-data hub shares upstream WebSocket connections to Binance, OKX and Coinbase. Each validator subscribes to the relayed feeds and parses the messages itself.

The important part happens when an oracle update enters a block. The proposer includes the selected observations, and validators recompute the weighted price from those same inputs. The committed update becomes their shared mark. They don't need to have received the latest external message at exactly the same instant.

The hub avoids redundant connections when several nodes run on the same computer. It doesn't decide the chain's mark price. Authenticating those external observations against a dishonest proposer is a separate problem I haven't addressed yet.

## The parts that were less straightforward

Getting the initial node discovery and startup barriers right was surprisingly annoying. Starting several processes is easy. Making sure they all know their peers and agree on when they can begin is where the asynchronous communication starts getting interesting.

The order book itself was reasonably straightforward to get working. Making it efficient took more thought. I covered the state copying, incremental hashing and quote batching in [Optimization tricks for a DEX validator](/writing/building-a-dex-part-4/), so I won't go through all of that again here.

### Stop waiting for the next timer tick

One improvement since that post was changing when the leader tries to produce a block. Previously, an arriving transaction could sit there until the next periodic tick, even when the leader was ready to do useful work.

Now, the first pending transaction starts a short batching window, 50 ms by default. That gives nearby arrivals a chance to join the block, then triggers a proposal as soon as consensus permits. The normal timer remains a fallback. Chained HotStuff also needs later certified blocks to finalize earlier ones, so producing those descendants promptly matters even when no new orders arrive.

In a local four-validator test at 32 offered transfer TPS, with a one-second periodic timer, p95 went from about 3 seconds to 1.1 seconds. The matching engine wasn't getting faster. Transactions were spending less time waiting for a proposal opportunity.

### Getting a block to Tokyo

Cross-region testing was another reality check. My Tokyo VPS had roughly 250 ms round-trip latency from home, so I initially thought subsecond finality with HotStuff shouldn't be too difficult.

That estimate ignored a lot. A block can wait for batching, execution, several dependent messages and a leader handoff. A busy queue or a missing parent adds more waiting. Shared VPS hardware can introduce CPU steal too, although a slow run by itself doesn't establish that as the cause.

One useful change was getting transactions to peers before the proposal, rather than delivering a large body only when everyone was ready to vote. This is transaction dissemination, part of the gossip layer. In this implementation it uses direct batched peer sends, rather than an epidemic gossip algorithm. A compact proposal can then carry an ordered list of transaction hashes, and receivers reconstruct its contents from transactions they already have.

For blocks containing roughly 64 to 127 transactions, the measured proposal size fell from about 12 to 15 KB to 6 to 8 KB. The transaction bytes still have to travel, but more of that work happens before the proposal becomes the next thing everyone is waiting on. If a receiver is missing data, it requests the full signed proposal and validates it before voting.

### Handing over without starting from scratch

Leader rotation happens every four blocks, so even a small pause at each handoff adds up. Previously, a scheduled rotation started a NewView exchange: validators sent evidence to establish the next view, then waited for a quorum before proceeding.

But the last block already had a final certificate. For a scheduled rotation, the new path uses that verified certificate and the known leader schedule to enter the next view after the block is durable. A lagging validator checks that the certificate matches its own durable predecessor before following the handoff. Timeout-driven changes still use the NewView path. This handoff and compact proposals are currently opt-in settings.

In the recorded baseline, the NewView quorum wait had a p95 of about 370 ms. The certificate-backed run recorded no such waits at scheduled rotations. This was a more useful target than shaving a few microseconds off matching while everyone was waiting for another network exchange.

## Some numbers, with the setup attached

The early international runs were pretty rough. One of the first pilots, with three validators at home and one in Tokyo, had about 8.7 seconds p95 at just 2 offered transfer TPS. A later version sustained roughly 31 TPS, while trying 64 TPS pushed p95 towards 14 seconds and caused responsiveness problems. Those were different stages of the implementation, rather than one clean before-and-after test, but they give an idea of where this started.

An intermediate version got much further with seven validators: three on my ThinkPad, two on the IdeaPad and two on the Tokyo VPS. Before the certificate-backed handoff and compact-proposal improvements, HotStuff2 was already handling roughly 500 order transactions per second:

| Seven-validator workload | Committed TPS | Submission-to-commit p95 | Measurement duration |
| --- | ---: | ---: | ---: |
| BTC-USD spot orders, five-minute repeat | 497 | 1.94 s | 5 min |
| BTC, ETH and SOL, spot and perpetual orders | 496 | About 2 s | 1 min |

The BTC spot figures count successful spot order-book transactions, including exchange execution, rather than simpler balance transfers; one transaction can produce several fills. The mixed-market row also includes perpetual orders.

That was decent throughput on two laptops and a small VPS, but p95 was still around two seconds. I wanted subsecond finality, so getting more transactions through wasn't enough. Tokyo took its normal leader turns, although locally led blocks could form a five-vote quorum using the five validators at home.

The more recent experiment used four validators: two on a laptop at home and two on the Tokyo VPS, which has 2 GB RAM and 2 vCPUs. A three-vote quorum required a vote from the other region. The workload was BTC-USD spot orders, with 96 submitting accounts, four-block leader rotation and a 70-second measurement after warm-up.

At 200 offered order TPS, HotStuff2 with compact proposals and certificate-backed handoff committed about 200 TPS, with a submission-to-commit p95 of about 820 ms. That p95 means 95% of measured transactions committed at the observing node within that time.

| Configuration | Committed TPS | Submission-to-commit p95 |
| --- | ---: | ---: |
| Baseline, first run | 193 | 3.3 s |
| Baseline, repeat | 198 | 1.0 s |
| Compact proposals and certificate-backed handoff | 198 | 0.82 s |

The median in the final run was around 550 ms. Leader rotation remained every four blocks, and signed journal replay verified a shared committed history.

At the time of writing, I can't benchmark the full seven-validator setup with the handoff and compact-proposal improvements because I'm not at home lol. I'll probably update this with those results when I'm back.

I care about p95 because an average can hide pauses that are painful for trading. A market maker whose cancel takes several seconds is still exposed while the price moves. On the validator side, slow execution or message handling can make a replica fall behind, need catch-up and add pressure to the queues. A high client p95 doesn't prove that's happening, but it tells me to inspect those paths rather than just celebrate the TPS counter.

The [repository has the benchmark setup and results](https://github.com/NicoBeCodin/light_dex/blob/main/RESEARCH.md).

## What I understand better now

Reading consensus papers makes the rounds look quite tidy. Implementing them makes you care about who has the block body, when a vote gets processed and what the next leader is still waiting for. Getting the protocol and those implementation details to work well together is where a lot of the performance came from.

It also made me more careful about comparing protocols. For example, Alpenglow's proposed 20+20 fault model makes a different tradeoff from the usual one-third Byzantine model. That's about fault assumptions, not the Nakamoto coefficient, which measures concentration of control. The [Alpenglow proposal](https://github.com/solana-foundation/solana-improvement-documents/blob/main/proposals/0326-alpenglow.md) explains that choice.

And decentralization doesn't remove the trading latency game. It changes where the advantages appear. Sharing transactions before commitment is useful for propagation, but it also exposes pending order flow that someone might try to trade around. Gossip alone isn't MEV; visibility, ordering rules and the ability to act on that information all matter.

Hyperliquid, for example, has [gossip priority auctions](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/priority-fees) tied to IP addresses for earlier data delivery, as well as separate order priority fees. I find that intersection between market structure and infrastructure really interesting.

## Try it, and tell me what breaks

You'll need Rust, Node.js and the native build dependencies listed in the [control-plane guide](https://github.com/NicoBeCodin/light_dex/blob/main/control-plane/README.md). From a terminal:

```bash
git clone https://github.com/NicoBeCodin/light_dex.git
cd light_dex
cargo test
cd control-plane
npm ci
npm run serve
```

Open `http://127.0.0.1:1421`, launch a small cluster from Node operations, then stage the 13-agent spot mix and use Claim & launch fleet. Open BTC-USD spot to watch the book and trades. Internet access is needed for live price feeds, and the first build takes a while.

Try pausing a validator, changing agent parameters or increasing the load. Stop all shuts down the cluster; Ctrl-C in the terminal stops the browser service. Remote validators are also supported through your own local SSH configuration.

I've spent much more time on performance than adversarial hardening, so the next thing I want to work on is a stronger set of Byzantine fault tests: conflicting messages, withheld data and failures around leader changes. Everything here runs with test assets.

Joining an already-running chain is another thing I'd like to add. That needs both a safe change of validator membership and a way to transfer and verify state without overwhelming an already busy machine. A snapshot could avoid replaying everything from genesis, but it still has to be trusted or verified correctly.

Stake-weighted voting isn't my priority right now. I'd rather understand the failure cases of the system I have, and make it easier for someone else to reproduce them.

If you try it, I'd be interested in a concrete failure: which settings you used, what you expected and what stopped making progress. That's probably the most useful contribution to this project at the moment.

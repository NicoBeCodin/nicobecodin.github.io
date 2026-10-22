---
title: "Making sense of HotStuff"
description: "Working through HotStuff in Rust, from the first proposal to replacing a leader and catching up a node that fell behind."
date: "2026-10-20"
series: "Building Light DEX"
part: 3
readTime: "8 min read"
---

The project is on [GitHub](https://github.com/NicoBeCodin/light_dex) if you want to try it yourself. It includes a control plane UI where you can launch nodes, switch between PBFT and HotStuff, add market participants and kill a leader to see what happens. You can mess around with it without writing a test harness first.

After [adding the exchange](/writing/building-a-dex-part-2), I wanted to try another consensus algorithm. The exchange already handled balances and orders separately from consensus, so I could keep that code and work on how the nodes agreed on blocks. HotStuff seemed like a good next step after PBFT.

Most of the questions came up around failures. What should a node remember if the leader disappears halfway through a block? What if the next leader proposes something different? And what happens when a node falls forty blocks behind?

I'll go through the version currently in Light DEX, using four validators and one block. The sequence-gap problem at the end came from an actual load test.

## Why change PBFT?

In my [PBFT implementation](/writing/building-a-dex-part-1), replicas broadcast prepare and commit votes to one another. Each extra validator adds another sender and another recipient. That becomes a lot of traffic.

HotStuff collects phase votes at the leader. The leader sends back evidence of a quorum, so replicas can check the result without receiving every vote directly from its sender.

[Figure: PBFT and HotStuff vote paths](#figure-hotstuff-topology)

My certificates contain individual Ed25519 signatures, so they grow with the number of voters. View-change messages are also still broadcasts. That means this implementation doesn't have the paper's linear communication cost.

The [original paper](https://arxiv.org/abs/1803.05069) describes Basic and Chained HotStuff. I started with explicit phases for each block, closer to the Basic version. The chained version pipelines those phases across blocks; that isn't implemented here.

## Following one block

Take four validators, numbered 0 to 3. Validator 0 is the leader. With at most one Byzantine validator, a quorum requires three distinct votes.

Why three? Two sets of three drawn from four validators overlap in at least two validators. At least one of those must be honest. That overlap is useful only if honest validators follow rules about what they will sign.

A quorum certificate, or QC, records the view, height, phase and block digest, together with the voters and their signatures. The three votes must agree on all of those fields. Two votes for block B and one for block C don't make a certificate.

You can follow block B through the steps below, then switch to the leader-failure scenario.

[Figure: Follow a HotStuff block](#figure-hotstuff)

In Prepare, the leader proposes B with a certificate justifying the proposal. Replicas check the leader, view, height, digest and certificate, along with their voting rules. The node's validation path also checks the block's execution. Accepting replicas send prepare votes to the leader.

Once it has a quorum of prepare votes, the leader broadcasts PreCommit with the resulting QC. Replicas verify it and return pre-commit votes.

A quorum of pre-commit votes produces the next QC. The leader broadcasts it in a Commit message. A replica records this certificate as its lock before sending its commit vote. We'll come back to the lock in a moment.

Finally, the leader gathers a quorum of commit votes and broadcasts Decide with the commit QC. The node can now persist the block and publish the resulting exchange state. The naming takes a bit of getting used to: receiving `Commit` still means there's another vote to send before the decision.

These are separate handlers in `src/consensus/hotstuff.rs`. Their output is a list of `ConsensusAction`s: send a message, broadcast, arm a timer, or commit a proposal. The node handles the sockets, storage and exchange execution around those actions.

## What is the lock protecting?

Suppose B has made it far enough that replicas are locked on it. The leader disappears. Its replacement proposes a different block C at the same height, perhaps because its mempool contains a different transaction order.

“The new leader said so” cannot be enough to discard B.

Light DEX keeps two certificates:

- `high_qc`: the highest certificate the validator knows about.
- `locked_qc`: the certificate that restricts which proposals it may vote for.

The implementation's voting predicate accepts a proposal when the lock is the initial sentinel, the lock is below the proposed height, the digest matches the lock, or the justification comes from a later view. A separate `voted` map prevents another vote at the same `(view, height, phase)`.

The height check works alongside the node's validation of the next block against its local chain. A version that kept several competing branches would also need to track their ancestry.

A QC records the votes a node has seen. Its lock determines whether it can vote for the next proposal. The code is still a learning implementation, and I haven't formally verified its safety.

## The next leader needs evidence

A view identifies a leader: in Light DEX, `view % node_count`. A timeout can trigger a new view. I also run benchmarks with a leader change every four committed blocks, so handoff gets exercised throughout the run.

In `advance_view`, the node clears transient vote collection but retains its certificates. A NewView message carries `high_qc`. The next leader gathers a quorum of those reports and selects the highest certificate, ordered by height, view and phase.

It broadcasts StartView with signed evidence. If the selected certificate refers to the still-uncommitted height and the leader has that proposal, it reproposes that block. Building a fresh block from its own mempool could otherwise contradict evidence the previous leader had already gathered.

The new leader needs the actual block as well as its certificate. A digest tells it which block to look for, but doesn't supply the transactions.

## “Expected sequence 221, got 261”

One load test produced exactly that rejection. Several validators were behind, although none had been deliberately killed.

The other nodes were still committing blocks. A node expecting sequence 221 couldn't execute block 261 because it was missing the state changes in between. Sending it more recent proposals would just produce more rejections.

The recovery path lives in `src/node/sync.rs`. A node fetches batches of committed blocks and their certificates from a peer, checks that the sequence is continuous, then validates and applies them locally.

Only after applying the missing blocks does it advance the consensus engine's expected height. The catch-up method retains vote and lock information: forgetting what the node has already signed could permit an unsafe later vote.

With four validators, three can keep the chain moving while the fourth falls behind. Catch-up lets that fourth node rejoin once it has recovered the missing history.

## Back to the exchange

HotStuff still knows nothing about a bid, margin or a maker fee. It handles proposals and evidence. The exchange checks that executing an agreed sequence produces the claimed state.

With the cluster running, I started looking at how much work went into preparing and committing a block. The exchange still had some expensive habits, starting with cloning the whole state before trying a transaction.

[Next: Optimization tricks for a DEX validator.](/writing/building-a-dex-part-4)

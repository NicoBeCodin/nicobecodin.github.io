---
title: "Building a DEX from scratch — Part 1: Making nodes agree"
description: "How does a decentralized exchange work? Part 1 starts with node discovery and consensus."
date: "2026-09-28"
series: "Building Light DEX"
part: 1
readTime: "8 min read"
---

Hyperliquid is one of crypto's most talked-about exchanges. Its [documentation](https://hyperliquid.gitbook.io/hyperliquid-docs/hypercore/overview) explains the broad architecture, but its public [node repository](https://github.com/hyperliquid-dex/node) distributes binaries rather than the core implementation. How does a decentralized exchange like that work underneath?

One way to find out is to build a smaller version. Light DEX is an experiment in the pieces an exchange needs: nodes that find each other, consensus on transaction order, an execution layer that updates balances, and eventually an order book. It is not a Hyperliquid clone or a production-ready chain. The point is to understand the design choices and the problems that appear when those pieces meet.

This series explains each piece through the implementation, including the parts that did not work on the first try. The code is still evolving; you can [follow Light DEX on GitHub](https://github.com/NicoBeCodin/light_dex).

## Where do you even start?

A decentralized exchange needs a network of nodes that can agree on an ordered sequence of actions. For a first implementation, those nodes can be separate processes on one computer rather than machines on different VPSs. Light DEX uses localhost TCP sockets for communication, so the networking and consensus problems are still visible without deployment getting in the way.

One controller process launches the nodes and acts as a matchmaker during startup. It helps them discover one another; afterward, the nodes communicate directly. Even this first step introduces a distributed-systems problem: knowing a peer's address does not mean the peer is ready to accept a connection.

### Discovery

When a node starts, it only knows the controller's address. It binds a TCP listener to an available local port and sends back its node number and address:

```text
REGISTER 3 127.0.0.1:43127
```

The controller gathers all registrations and sends each node the peer table. Then each pair of nodes needs one connection. TCP is bidirectional, so Light DEX uses a simple rule: **the node with the smaller ID connects to the one with the larger ID**.

For four nodes, that means:

```text
0 → 1    0 → 2    0 → 3
1 → 2    1 → 3
2 → 3
```

That is six connections in total, or `n(n−1)/2` for `n` nodes. Counting both directions separately would double-count each TCP stream.

There is still a startup race: a node can begin connecting before another is ready to accept it. A barrier solves it. After discovery, every node sends `READY`; the controller waits for everyone and replies with `START`. Only then does the network begin work.

<figure class="article-diagram">
  <img src="/diagrams/peer-discovery.svg" width="652" height="513" loading="lazy" alt="PlantUML sequence diagram: nodes register addresses with a controller, connect to peers, report ready, then receive start." />
  <figcaption>Startup discovery and the READY/START barrier. The controller helps with setup; the nodes talk directly afterward.</figcaption>
</figure>

TCP introduces another easy-to-miss detail: it provides a stream of bytes, not message boundaries. Light DEX frames each message as one line of JSON and keeps a buffered reader alive for the connection. Replacing that reader between messages can lose bytes it has already read ahead. Before consensus can begin, even this small network needs a protocol: JSON followed by a newline.

## Making nodes agree

Once nodes can exchange messages, they need to agree on the same ordered blocks. Light DEX starts with PBFT, Practical Byzantine Fault Tolerance. It makes the core questions concrete: who proposes a block, what must replicas check, and how many matching votes are enough to commit it? PBFT-style protocols have been used in real systems; their all-to-all communication is one reason they are less attractive as validator sets grow. The original [Castro–Liskov paper](https://www.usenix.org/conference/osdi-99/presentation/practical-byzantine-fault-tolerance) is worth reading.

The model assumes at most `f` Byzantine nodes among at least `3f + 1` participants. A Byzantine node can behave arbitrarily, including sending conflicting information. In Light DEX, node 0 is the primary in view 0.

<figure class="article-diagram">
  <img src="/diagrams/pbft-happy-path.svg" width="737" height="318" loading="lazy" alt="PlantUML sequence diagram: primary sends PRE-PREPARE; a replica gathers PREPARE and COMMIT votes before appending a block." />
  <figcaption>A simplified view of one replica's PBFT happy path. PREPARE and COMMIT are broadcasts, not single point-to-point messages.</figcaption>
</figure>

The primary broadcasts a `PRE-PREPARE` with a proposal and its digest. A replica checks the expected primary, view, sequence number, and digest. If it accepts the proposal, it records and broadcasts a `PREPARE`. In this implementation, reaching the prepare threshold means seeing `2f` matching prepare votes after accepting the pre-prepare. It then broadcasts `COMMIT`, and commits the block after seeing `2f + 1` matching commit votes.

### Why those numbers?

Take four nodes. Here `f = 1`, so the protocol must tolerate one faulty node. A commit certificate needs three votes. Any two groups of three chosen from four nodes overlap in at least two places. Since at most one overlapping node can be Byzantine, at least one honest node belongs to both groups. That node cannot honestly vote to commit two conflicting blocks at the same sequence number.

The prepare phase helps establish the value the replicas are committing to. The exact safety proof needs more than this small picture, especially across view changes, but the quorum overlap is the intuition needed before the code makes any sense.

That is a lot of messages just to agree on one block. And the tidy `PRE-PREPARE → PREPARE → COMMIT` diagram is not an arrival-order guarantee. A `PREPARE` can reach a node before the proposal it refers to. Light DEX stores votes keyed by `(view, sequence, digest)` and reevaluates a proposal whenever new evidence arrives. Each vote set is a `HashSet` of node IDs, so duplicate votes cannot count twice.

## What if the primary dies?

The happy path is not enough. If the primary stops, the remaining nodes still expect proposals from it, so progress stops too.

Leader rotation is the next step. Proposals are made within a **view**, whose primary is `view % node_count`. A timer notices when progress stalls. In the current local setup the default timeout is 1,500 ms; nodes broadcast a `VIEW_CHANGE` vote, and after a quorum the new primary announces `NEW_VIEW`.

That lets the local cluster continue in the failure cases tested, but there is an important limit: **this is a simplified view change**, not the full PBFT protocol. A correct PBFT view change must carry proof of prepared values so a new primary cannot silently choose an unsafe replacement. Leader rotation working in a demo is a much weaker claim than protocol safety.

It is easy to get a process to print “new leader.” It is harder to justify that the network will never commit conflicting histories.

## Next up: exchange state

At this stage, separate processes can discover peers, open persistent connections, propose blocks, gather PBFT-style votes, and rotate the primary in a simplified failure test. That is the beginning of a blockchain, but not yet an exchange.

The transactions inside those blocks are still just strings such as `"Dummy tx 42"`. The network agrees on their order, but executing them changes nothing.

In the next part, those strings become state changes: accounts, balances, nonces, transfers, and the beginnings of an order book. Once transactions have nonces, primary failure also becomes more interesting. Replayed transactions can arrive in a different order, so “just retry them” is not enough.

[Continue to Part 2: Adding an exchange and agreeing on execution](/writing/building-a-dex-part-2)

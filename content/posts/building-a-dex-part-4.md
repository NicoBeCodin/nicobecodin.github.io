---
title: Optimization tricks for a DEX validator
description: Finding where Light DEX spent its time as the books grew, and
  changing how it copies, hashes and executes exchange state.
date: 2026-10-20
series: Building Light DEX
part: 4
readTime: 8 min read
---
The project is on [GitHub](https://github.com/NicoBeCodin/light_dex) if you want to try it yourself. The control plane UI lets you launch a local cluster, add market participants and watch the books, trades and node metrics as you increase the load. It's an easy way to mess around with the exchange and see where it starts struggling. 

When I first [added the exchange](/writing/building-a-dex-part-2), the simplest way to handle a failed transaction was to clone the exchange first. Execute against the clone, keep it if everything succeeds, otherwise throw it away. That made it much easier to avoid leaving balances or orders half-updated.

It also meant that Alice placing one order could copy state belonging to everyone else.

As I added accounts, deeper books and perpetual positions, I started looking for work that grew with the whole exchange even when a transaction only touched two accounts. Copying was one part of it. Hashing the state and executing the same block again were others.

## Keeping the clone cheap

Putting the exchange inside `Arc<ExchangeState>` would make another reference cheap. But if a speculative transaction, e.g a Fill Or Kill (FOK) order that only changes the book state if all of it's demand for liquidity is filled then needs exclusive access to the whole value, we are back to copying it.

The current `ExchangeState::fork()` shares the roots of persistent collections. Here, "persistent" means an older version stays usable after an update. Disk storage is a separate concern.

Accounts, markets and collateral use persistent maps. The order book uses persistent ordered price maps and FIFO sequences. When a fork changes one entry, the collection copies the affected paths or chunks and shares the untouched parts with the original.

[Figure: Shared exchange state](#figure-state-sharing)

For a transfer in an exchange with thousands of accounts, the transaction stages just the two accounts it touches. The books remain shared. If validation fails, discard the candidate; the committed version still refers to the original data.

The fork provides an isolated place to try a state transition. Pointer indirection, allocations along modified paths and copying inside touched values still cost something.

The difference is pretty stark when the exchange has 10,000 accounts and 10,000 resting orders. Creating the old snapshot took 1.965 ms in the focused benchmark. The persistent fork took 0.364 µs. That's the cost of *making the snapshot*, not the cost of executing an order against it.

[Figure: Snapshot time before and after structural sharing](#figure-sharing-benchmark)

In a later four-validator profile, creating the proposal forks took about 29 ms over the whole run. Executing the transactions took about 1.36 seconds. At that point, keeping the fork for rollback seemed worth its small share of the time.

## Hashing what changed

The next expensive habit was computing a state digest by sorting and hashing the entire exchange. How could we commit to the result without rereading every unchanged balance?

Light DEX now stores commitments in an incremental Merkle tree, this is the same mechanism that is used on other blockchains like Ethereum.  A typed key identifies an account, order, market or another state entry. Its canonical byte encoding gives every node the same bytes to hash. Explicit domain tags distinguish kinds of hashes.

Changing a leaf invalidates the hashes on its path to the root. Unchanged subtrees keep their cached hashes. The implementation is a compressed binary tree over hashed keys; the small balanced tree below illustrates the dependency rather than its exact shape.

[Figure: Incremental Merkle tree](#figure-merkle)

There is another saving inside a block. Suppose Alice's account changes twenty times. The transactions must still execute in order, because later orders depend on earlier balances and nonces. But the final root only needs Alice's final value.

The state tree collects pending writes by key. Repeated updates replace that key's pending value. When it's time to calculate the block's root, it applies the final values. Larger batches merge their paths together so shared ancestors don't have to be rebuilt separately for every leaf.

Balance and margin checks still happen for every transaction. Only the final hashing is batched.

Canonical encoding remains part of the cost. The clean profile showed more time encoding and hashing changed values than merging tree paths. Reusing a scratch buffer for account encoding removes repeated allocations, but the account still has to be represented and hashed correctly.

## Why execute the same block again?

The proposer already executes transactions to construct a block and determine its resulting root. Throwing that result away means repeating work when it validates its own proposal or commits it.

Light DEX retains a prepared result: the resulting exchange fork and transaction receipts. Reuse is tied to the exact block digest and parent state, with height and parent-chain checks. A result calculated for another block or another starting state is useless.

Followers still validate and execute independently. The cache records this node's work; it cannot substitute for checking another validator's execution.

The same idea applies to authentication. The network path verifies signed blocks before the state-owning thread handles them. A bounded cache of successful whole-block verification lets that later path reuse the check. Changing the signed block or chain identity prevents a hit.

The node publishes the prepared state after writing the block and certificate to its journal and waiting for the disk synchronization to succeed. If the write fails, it keeps the previous state.

The tests check that failure case, verify that changing a fork leaves the original untouched, and replay committed journals to compare state roots.

This also made the economics of block building more concrete for me. Block execution and state computation are the most compute consuming parts of my program at the moment (though I haven't worked on execution parallelization yet). Computing optimal block transaction sequencing is what MEV is, and allows for validators to maximize revenue, sometimes at the expense of users. This can also explain the advantage of externalizing it to searchers whose task is to maximize this sequencing for the builder (validator) and avoid using too much of the precious compute time of a network leader, that's how MEV currently works on Solana with services like Harmonic and Jito, or Flashbots on Ethereum. But I digress (though MEV will for sure have a post of it's own here one day).

## The queue also grew

The earlier nonce scheduler grouped and sorted pending transactions each time it built a block. That was better than executing arrival order blindly, but a large backlog still made every proposal revisit work.

The mempool now maintains indexes as transactions arrive: by digest, arrival order and account nonce. Selection starts from each account's eligible head and advances through contiguous nonces. Committing a block removes included entries and stale transactions for affected accounts.

The exchange also indexes order ownership and account-to-market relationships. Each index saves lookups but adds redundant data to maintain alongside the orders and positions.

Market makers have another repetitive job: cancel old quotes and place new ones. `UpdateQuotes` can put up to 32 cancels and placements in one signed transaction, using one nonce. I compared eight cancels plus eight placements sent individually against one atomic quote batch. The standalone execution path improved a lot, but the gain was smaller when I measured proposal building and almost disappeared in follower validation. Batching saves work, but it doesn't make the whole chain 3.4 times faster.

[Figure: Quote refresh with individual transactions and an atomic batch](#figure-quote-batching)

I then tested the whole cluster with order traffic to see where it would start falling behind.

## What the laptop actually sustained

The latest sustained test ran on my laptop, an i5-8365U with four physical cores. Each core hosted one HotStuff validator. The load generator used 192 accounts trading BTC, ETH and SOL across both spot and perpetual books, with signed transactions and a 100 ms proposal timer.

Accounts, positions and order books live in RAM. There is no disk-backed account database yet, but this isn't a disk-free benchmark: committed blocks and certificates are written to journals and synchronized to disk before publishing the new state.

All four nodes communicate over localhost, so there are no geographic network delays here. Local TCP and message processing still cost something. Block time, consensus timeout, submission concurrency and leader rotation all affect these numbers. I chose rotation every four blocks after Solana's [four-slot leader windows](https://solana.com/news/lowering-slot-time-and-validators-economic), though a slot isn't necessarily a produced block.

Compared with the early versions where I was seeing roughly 300 TPS, I'm now around 2,500 TPS. That's the progression of the project, not a controlled comparison of identical workloads.

At 2,600 requested TPS, it achieved about 2,593 successful transactions per second over two minutes. The p95 delay from the scheduled submission time to durable commit was 310 ms, meaning 95% of the measured transactions finished within that time. All 312,000 scheduled originals were matched to commits, and all four journals replayed to the same state.

At 2,800 requested TPS, throughput increased to about 2,771, but p95 reached 796 ms and the sampled mempool peaked at 2,388 transactions. The driver delivered every scheduled slot. The chain kept committing, but transactions spent longer waiting. Since this is a trading chain, my goal was to always have a p95 of under 500ms. 

Some earlier runs were limited by the driver itself as it was handling about 500 different accounts all submitting transactions at various intervals. The load generator shares the laptop with the validators too. These runs tell me what this setup handles, not what a cluster on separate machines would handle.

## What's next

The current profile points toward transaction execution, encoding changed state and journal synchronization. Mempool selection is now comparatively small, though we aren't running any MEV software.

I'd like to execute independent transactions in parallel, along the lines of Solana's [Sealevel runtime](https://solana.com/news/sealevel---parallel-processing-thousands-of-smart-contracts).  For realistic performance, this would probably require running a single node on my laptop and pinning different threads to each a CPU to test what maximum performance we can achieve, transactions that touch different state can run together; conflicting writes need an agreed order though shared collateral in for perp transactions severely limit parallelization between different perp orderbooks.

Leader handoffs could use more work too. Pending transactions already get forwarded in bounded batches when the primary changes. One next step would be sending eligible transactions to the upcoming leader before rotation, giving it a warm queue rather than waiting for the switch. Any precomputed execution would still need to match the actual parent state.

Finally, the journal has its own thread, but waiting for durability still delays state-dependent work. I'd like to see how much useful incoming-message work the node can do during that wait. There is still plenty to try before reaching for a bigger laptop and/or running on an actual network.

## Where it stands

For now, the result I can defend is about 2,593 successful transactions per second across six markets, with a 310 ms p95 to durable commit on four local validators. Asking for 2,800 TPS got more transactions through, but missed my 500 ms latency target. That's where the laptop stands today, not a limit I've established for Light DEX on other machines.

[Figure: Laptop benchmark results](#figure-capacity)

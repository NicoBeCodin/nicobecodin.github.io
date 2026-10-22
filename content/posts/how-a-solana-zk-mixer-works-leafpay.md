---
title: "How a Solana ZK mixer works: building LeafPay"
description: "How LeafPay uses Merkle commitments, browser-generated proofs, Solana memos and sharded nullifiers to make private withdrawals possible."
date: "2026-10-02"
topic: "Solana / zero knowledge"
readTime: "12 min read"
---

On a blockchain, anyone can follow the money. That is useful for verifying transactions, but less useful when you want to pay someone without publishing the link between your wallet and theirs. A mixer breaks that link. The interesting question is how it can still tell a real withdrawal from someone asking for money they never deposited.

I tried to answer that with **LeafPay**, an open-source Solana ZK mixer I built for a Colosseum hackathon in June 2025. I wanted to build the first open-source mixer of this kind on Solana. It made it to a final-round interview with the Solana Foundation, but no further. By then, the question I had started with had split into several: where does a browser get the data to make a proof? How much of that data belongs on-chain? And where do you put the growing list of notes that have already been spent?

The [on-chain program is on GitHub](https://github.com/NicoBeCodin/solana_mixer). **Please don't deposit funds into it.** The published code discards proof-verification failures, so it cannot safely enforce the withdrawal rules described here. This article is about the design and the engineering problems it led me to, not a usable privacy service.

## The core trick: prove a deposit without pointing to it

Start with a note. In LeafPay, a note combines an amount, a private nullifier, and an asset identifier. Its public commitment is a Poseidon hash:

```text
commitment = Poseidon(amount, private_nullifier, asset_id)
```

For the implemented SOL pool, `asset_id` is zero. The value of the commitment can be published without publishing the private nullifier. Each deposit adds a commitment as a leaf in a Merkle tree. Pairwise hashes build up to a root that commits to the entire set of leaves.

A withdrawal proof is meant to show that the person withdrawing knows a note whose commitment is in that tree, without saying *which* commitment it is. The browser gives the note and its Merkle path to a Groth16 circuit as private inputs. The circuit checks the path and reveals a **nullifier hash**, derived from the private nullifier. The program should verify the proof and reject a nullifier hash it has already seen.

That is the zero-knowledge part: the browser proves a statement about private inputs (the note and its path) without handing those inputs to the program. Groth16 produces a succinct proof for a fixed circuit. Its verifier does not need to inspect every deposit, although proving still requires the browser to obtain and hash the data for a valid path. In a depth-30 binary tree, that path contains 30 sibling positions, not a billion leaves.

The private nullifier never goes on-chain. Its hash is the one-time marker: spend the same note again and you get the same marker, which the program can reject without learning which deposit it came from.

The small tree below shows why a path is enough. To prove that `L2` belongs to the root, start with `L2`, combine it with sibling `L3` to obtain `H23`, then combine that with sibling hash `H01` to recompute the root. A proof can check those steps while keeping the chosen leaf and its siblings private.

[Figure: Private withdrawal proof](#figure-leafpay-private-withdrawal)

The proof hides the cryptographic link, not every clue around it. If one person deposits 7.13 SOL and someone withdraws 7.13 SOL shortly afterward, the amounts and timing may give them away. The size of the pool, RPC access, and who pays the withdrawal fee matter too. A relayer can pay that fee for a fresh recipient address, but it cannot make the other clues disappear.

## Why LeafPay proves deposits too

[Tornado Cash Classic](https://docs.tornado.cash/tornado-cash-classic/circuits/core-deposit-circuit) uses fixed denominations and does not need a ZK proof for an ordinary deposit. I wanted LeafPay to accept variable SOL amounts, so the deposit path also builds a proof to tie the commitment or commitments to the amount going into the pool. That made deposits more flexible, but it gave me another proof and another set of public inputs to get right.

The circuits also support consuming one note and creating a new commitment for the remainder of a partial withdrawal:

```text
old note: 10 SOL
withdraw:  3 SOL
new note:  7 SOL, with a new private nullifier
```

The old nullifier hash is recorded as spent and the new commitment is added to the tree. This is a useful property of the note model: a withdrawal does not have to consume the entire balance. It also adds more things to get right: value conservation in the circuit, a fresh secret for the change note, and correct ordering of the payout and new leaf.

I also added transfer and combine flows, plus direct and relayed withdrawals. The pool itself handles native SOL. I included an asset identifier in the commitment because I wanted to explore other tokens later; the program does not support them yet.

## Keeping the Merkle state small

The obvious way to build the tree is to keep every leaf in one on-chain account and rebuild it after each deposit. That stops looking attractive as the pool grows: both the account and the work per deposit keep getting bigger. LeafPay keeps a 16-leaf in-flight batch and a collection of Merkle peaks instead.

For each new commitment, the program updates the small batch root. When the batch fills, its root is folded into the peaks. Equal-height peaks are merged, much like carrying a bit in binary addition. The number of peaks grows logarithmically rather than with the number of deposits. The program also derives a current root that can be checked against a withdrawal proof.

Think of each completed 16-leaf batch as one small tree. After six completed batches, LeafPay does not need six separate roots: batches `B0–B3` have merged into one 64-leaf peak, while `B4–B5` form a 32-leaf peak. That is the binary decomposition `6 = 4 + 2`. A newly completed `B5` only merges with its equal-sized neighbor `B4`; it does not rebuild the earlier 64-leaf peak.

[Figure: Rolling up the Merkle tree](#figure-leafpay-tree-rollup)

There is still hashing to do. The small batch gets recomputed as leaves arrive, and a rollover can merge several peaks. But the program does **not** need to keep and rehash every historical leaf each time someone deposits.

## The client-side problem: finding your Merkle path

The root is enough to check a proof, but not enough to make one. To build a Merkle path, the browser needs the sibling hashes between its leaf and the root. We just decided not to keep every leaf in the pool account. So where does the browser find them?

Ethereum contracts can expose deposit data through logs; [Tornado describes rebuilding its tree from emitted events](https://docs.tornado.cash/tornado-cash-classic/circuits/anonymity-mining/tornado-trees). On Solana, I tried a combination I had not expected to use in a privacy project: Memo instructions and an indexing account.

At each eight-leaf boundary, the transaction carries a Base64-encoded memo containing an eight-byte batch number and eight 32-byte commitments. The program checks that the memo matches its current leaves and that the transaction includes the expected `leaves_indexer` program-derived address (PDA). A browser can then query `getSignaturesForAddress` for that PDA, read the memos, and replay the commitments locally to build a Merkle path. The Solnado frontend does this in the browser alongside Groth16 proof generation.

One fetched memo gives the browser eight leaves. It can hash those leaves into a small subtree and extract the sibling values for a note inside it. In the example below, a note at `L5` needs `L4`, `H67`, and `H03` to reach the eight-leaf root. The complete pool path continues above this subtree using data from other batches.

[Figure: Finding leaves from memos](#figure-leafpay-memo-indexing)

At eight leaves per memo, a page of 1,000 signatures could point to as many as 8,000 leaves. That is just the arithmetic, not a measured download speed. The browser currently pages through the leaf-indexer signatures and rebuilds the tree from the leaves it finds. It still needs RPC access, and [public RPC endpoints have variable rate limits](https://solana.com/docs/references/clusters). The useful distinction is that LeafPay does not need its *own* server to tell the browser which leaf exists or to construct its proof.

There is a catch. Anyone can include a read-only address in an unrelated transaction. A signature returned for the indexing account is therefore not automatically a LeafPay deposit. The program checks the required memo when accepting a deposit, but the browser should also verify the transaction and its place in the sequence rather than trusting any memo it finds. [Solana's indexing guidance discusses this distinction](https://solana.com/docs/tools/actions).

### The next step for a much bigger tree

The program has a second `subtree_indexer` PDA and a path for posting a subtree root after 4,096 full 16-leaf batches (65,536 leaves). The idea is to fetch the leaves around *your* note and use posted subtree roots for the rest of a much larger tree, instead of downloading every historical leaf. A depth-30 tree would hold about a billion leaves.

The frontend does not use those subtree roots to build a witness yet; it still fetches leaf memos. The on-chain checkpoint is there, but the browser-side shortcut is unfinished. I would like to measure how much history it actually saves once that path is wired up, rather than guess at an RPC-call count.

## Storing the one-time markers

Every spend leaves a public nullifier hash behind. I could have created one Solana PDA for each hash, but that felt like a lot of accounts just to answer “have we seen this before?” LeafPay groups hashes into shard accounts instead. Each shard owns a prefix of the hash space and keeps its hashes sorted, so binary search can find a duplicate or the insertion point. The user supplies the shard account; the program checks that the prefix and PDA match the hash.

When a shard fills, the plan is to split it into two child prefixes. That split path is not fully integrated yet. The idea is simple, though: pay for fewer, fuller accounts instead of creating a new account for every spend.

## The ideas that stuck with me

I started LeafPay thinking mostly about zero-knowledge proofs. I finished the hackathon thinking about all the less glamorous things around a proof. Someone has to make the witness data findable. The tree has to keep growing without becoming too expensive to update. Spent notes have to stay spent without leaving a trail of tiny accounts everywhere.

The solutions I enjoyed most were the ones that changed the shape of the problem. Shard the nullifiers instead of giving each one a PDA. Put leaf data in memos and make it discoverable through an indexing address instead of standing up a LeafPay server. Roll completed batches into Merkle peaks instead of storing the whole tree. None of those ideas is magic, and the browser-side indexing still needs work. But they made me interested in how far careful data layout can get you before you need another service in the middle.

The hackathon also got me talking to people in the French crypto community after a long stretch of building alone. I spent most of the event on the code and probably not enough time explaining why these choices mattered. Writing this is partly my attempt to do that now.

### A later Solana change

In June 2025, the 1,232-byte transaction limit made fitting proofs, accounts and memos into a transaction a recurring headache. [Solana activated 4,096-byte v1 transactions in September 2026](https://solana.com/upgrades/larger-transaction-sizes). I would be curious to revisit some of those trade-offs with the extra room.

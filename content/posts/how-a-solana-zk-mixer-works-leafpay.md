---
title: "How a Solana ZK mixer works: building LeafPay"
description: How LeafPay used commitments, browser-generated proofs, memo-based
  indexing and nullifier shards in a Solana privacy-pool prototype.
date: 2026-10-02
topic: Solana / zero knowledge
readTime: 12 min read
---
Blockchains publish transactions so anyone can check what happened. A privacy pool tries to preserve that verifiability by unlinking a depositor from a withdrawer. How can a program check that a withdrawal is legitimate if it cannot see the deposit being spent?

I explored that question with **LeafPay**, an open-source Solana ZK mixer I built for a Colosseum hackathon in June 2025. I set out to build the first open-source mixer of this kind on Solana. The project reached a final-round interview with the Solana Foundation, although it did not make it further. More importantly, it forced a set of practical design questions: how does a client find the data needed to create a proof, how much tree state belongs on-chain, and how do you record spent notes without creating an account for every withdrawal?

The [on-chain program is on GitHub](https://github.com/NicoBeCodin/solana_mixer). This article explains the hackathon prototype's intended design, and doesn't encourage any illicit behaviour. Currently, the published program does not yet propagate proof-verification failures, so the implementation does not enforce the security property described below.

## The core trick: prove a deposit without pointing to it

Start with a note. In LeafPay, a note combines an amount, a private nullifier, and an asset identifier. Its public commitment is a Poseidon hash:

```text
commitment = Poseidon(amount, private_nullifier, asset_id)
```

For the implemented SOL pool, `asset_id` is zero. The value of the commitment can be published without publishing the private nullifier. Each deposit adds a commitment as a leaf in a Merkle tree. Pairwise hashes build up to a root that commits to the entire set of leaves.

A valid withdrawal proof should establish, roughly, that the prover knows a note whose commitment belongs to the tree represented by an accepted root. The prover supplies a Merkle path privately to a Groth16 circuit. The circuit checks the path and exposes a nullifier hash, derived from the private nullifier, as a public output. In the intended flow, the program verifies the proof and rejects a nullifier hash that has already been used.

That is the zero-knowledge part: the browser proves a statement about private inputs (the note and its path) without handing those inputs to the program. Groth16 produces a succinct proof for a fixed circuit. Its verifier does not need to inspect every deposit, although proving still requires the browser to obtain and hash the data for a valid path. In a depth-30 binary tree, that path contains 30 sibling positions, not a billion leaves.

That distinction matters: the private nullifier is not published; its hash is the one-time marker stored on-chain. Reusing the note produces the same public marker, so a second spend fails without revealing which commitment was spent.

The small tree below shows why a path is enough. To prove that `L2` belongs to the root, start with `L2`, combine it with sibling `L3` to obtain `H23`, then combine that with sibling hash `H01` to recompute the root. A proof can check those steps while keeping the chosen leaf and its siblings private.

[Figure: Private withdrawal proof](#figure-leafpay-private-withdrawal)

This hides the cryptographic link between a note and its spend; it does not guarantee complete anonymity. Amounts, timing, pool size, RPC access and the way a recipient pays transaction fees can still reveal information. Variable amounts, in particular, may make a deposit and withdrawal easier to correlate. A relayer can pay the withdrawal fee for a fresh recipient address, but that only addresses one source of linkage.

## Why LeafPay proves deposits too

[Tornado Cash Classic](https://docs.tornado.cash/tornado-cash-classic/circuits/core-deposit-circuit) uses fixed denominations and does not need a ZK proof for its ordinary deposit. LeafPay took a different route: it allowed variable SOL amounts and included a deposit-proof check intended to bind the published commitment or commitments to the amount transferred into the pool. The browser builds that proof; enforcing its validity on-chain remains part of the security work described above.

The circuits also support consuming one note and creating a new commitment for the remainder of a partial withdrawal:

```text
old note: 10 SOL
withdraw:  3 SOL
new note:  7 SOL, with a new private nullifier
```

The old nullifier hash is recorded as spent and the new commitment is added to the tree. This is a useful property of the note model: a withdrawal does not have to consume the entire balance. It also adds more things to get right: value conservation in the circuit, a fresh secret for the change note, and correct ordering of the payout and new leaf.

The code contains transfer and combine flows as well as direct and relayed withdrawals. The implemented pool handles native SOL; although the commitment includes an asset identifier, support for arbitrary tokens was a design direction, not a finished feature.

## Keeping the Merkle state small

A naïve implementation could store every leaf in one on-chain account and rebuild the whole tree after each deposit. That would make both account size and computation grow with the pool. LeafPay instead keeps a 16-leaf in-flight batch plus a collection of Merkle peaks in the pool account.

For each new commitment, the program updates the small batch root. When the batch fills, its root is folded into the peaks. Equal-height peaks are merged, much like carrying a bit in binary addition. The number of peaks grows logarithmically rather than with the number of deposits. The program also derives a current root that can be checked against a withdrawal proof.

Think of each completed 16-leaf batch as one small tree. After six completed batches, LeafPay does not need six separate roots: batches `B0–B3` have merged into one 64-leaf peak, while `B4–B5` form a 32-leaf peak. That is the binary decomposition `6 = 4 + 2`. A newly completed `B5` only merges with its equal-sized neighbor `B4`; it does not rebuild the earlier 64-leaf peak.

[Figure: Rolling up the Merkle tree](#figure-leafpay-tree-rollup)

The practical saving is not that hashing disappears. The small batch is recomputed as leaves arrive, and merging peaks can still take logarithmically many hashes at a rollover. The saving is that the on-chain program does **not** need to retain and rehash every historical leaf on each insertion.

## The client-side problem: finding your Merkle path

The root alone is enough for a verifier, but not for a prover. To prove that a leaf belongs to the tree, the browser needs its sibling hashes along the path to the root. Where do those come from if the program deliberately does not store all leaves?

Ethereum contracts can expose deposit data through logs. [Tornado's documentation describes reconstructing tree state from emitted events](https://docs.tornado.cash/tornado-cash-classic/circuits/anonymity-mining/tornado-trees). LeafPay used a Solana-specific route: Memo instructions plus an indexing account.

At each eight-leaf boundary, the transaction carries a Base64-encoded memo containing an eight-byte batch number and eight 32-byte commitments. The program checks that the memo matches its current leaves and that the transaction includes the expected `leaves_indexer` program-derived address (PDA). A browser can then query `getSignaturesForAddress` for that PDA, read the memos, and replay the commitments locally to build a Merkle path. The Solnado frontend does this in the browser alongside Groth16 proof generation.

One fetched memo gives the browser eight leaves. It can hash those leaves into a small subtree and extract the sibling values for a note inside it. In the example below, a note at `L5` needs `L4`, `H67`, and `H03` to reach the eight-leaf root. The complete pool path continues above this subtree using data from other batches.

[Figure: Finding leaves from memos](#figure-leafpay-memo-indexing)

One 1,000-signature page could contain up to 8,000 leaves at eight leaves per memo. That is **capacity arithmetic**, not a benchmark or a promise that one RPC request will always return a complete usable history. The current browser code paginates through the leaf-indexer signatures and reconstructs the leaves it finds. Solana's [public RPC endpoints have variable rate limits and are not recommended as production infrastructure](https://solana.com/docs/references/clusters). Nor does avoiding a project-operated indexer mean avoiding third-party RPC providers altogether.

There is also a trust boundary here. A read-only account can be included in an unrelated transaction, so a client must not treat every signature returned for that address as a valid LeafPay deposit. [Solana's indexing guidance makes the same warning](https://solana.com/docs/tools/actions). LeafPay checks the required memo on the deposit path; a robust reader should also validate the transaction and its ordering rather than trusting an arbitrary memo string.

### A potential scaling idea 

The program has a second `subtree_indexer` PDA and a path for posting a subtree root after 4,096 full 16-leaf batches (65,536 leaves). The idea is to fetch the leaves around *your* note and use posted subtree roots for the rest of a much larger tree, instead of downloading every historical leaf. A depth-30 tree would hold about a billion leaves.

The frontend, however, still fetches leaf memos for its witness-building path; its subtree-indexer reconstruction branch is marked for future integration. The proposed layout could reduce how much history a client must fetch, but I have not implemented or benchmarked that shortcut, so I cannot give it a reliable RPC-call bound yet.

## Storing the one-time markers

Every successful spend leaves a public nullifier hash behind. A simple design would create one Solana PDA per nullifier. LeafPay instead groups hashes into shard accounts. Each shard owns a prefix of the nullifier-hash space and holds a sorted vector; binary search detects duplicates and finds the insertion point. The user supplies the shard account, and the program checks that its prefix and PDA are the right ones for the hash.

The intended next step is to split a shard into two child prefixes when it fills. This trades many small account creations for fewer growing accounts, but integration of that split path was not finished in the prototype.

## What this taught me

The most surprising part was that the ZK circuit was only one piece of the system. A proof is useful only if the client can reconstruct its witness from available data, the program checks the right public inputs, and the note can be spent exactly once. Memo indexing, tree rollups and nullifier storage are all parts of that same problem. I explored practical approaches to each, though some of the scaling work remained theoretical.

The hackathon also pulled me out of solo-building mode. I met people in the French crypto community, which I am grateful for; working on a project alone can be grueling at times. I spent most of the event engineering and too little time explaining why the work mattered. Communicating a project's value is part of building it, and that was a useful lesson to take away.

LeafPay is a hackathon prototype, not a privacy guarantee. Its on-chain proof checks need correction and tests before anyone should use it with funds. The demo frontend's note storage and relayer setup also need a security redesign, and neither the circuits nor the Solana program have been audited. Small anonymity sets and public metadata remain privacy constraints even with a sound proof system. The useful result of the project was learning which parts of “a mixer” live outside the cryptography. The [on-chain implementation](https://github.com/NicoBeCodin/solana_mixer) is open for inspection.

### A later Solana change

This was built for the June 2025 hackathon, when the 1,232-byte transaction limit made packing proofs, accounts and memos painful. [Solana activated 4,096-byte v1 transactions in September 2026](https://solana.com/upgrades/larger-transaction-sizes). That gives a future version more room, but it does not retroactively change the 2025 design or fix the indexing and safety work still needed here.
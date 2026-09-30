---
title: "Building a DEX from scratch — Part 2: Adding an exchange and agreeing on execution"
description: "How does a decentralized exchange work? Part 2 adds accounts, balances, an order book, and deterministic execution."
date: "2026-09-29"
series: "Building Light DEX"
part: 2
readTime: "14 min read"
---

In [the previous post](/writing/building-a-dex-part-1), the nodes learned to discover each other, communicate over TCP, agree on blocks with PBFT-style voting, and rotate the primary when it stopped. But the transactions inside those blocks still looked roughly like this:

```text
"Dummy tx 42"
```

Agreeing on arbitrary strings is a start, but it does not make an exchange. Consensus establishes transaction order; an execution layer gives those transactions meaning. Once the network agrees on a block, that block must **change some state**: balances move, orders enter the book, trades happen, and cancels remove resting orders.

You can [follow the Light DEX code on GitHub](https://github.com/NicoBeCodin/light_dex) as the project develops.

## From a blockchain to a state machine

The distinction between consensus and execution is easy to blur. Consensus does not need to know what a transaction means. Its job is roughly:

```text
Here is a sequence of transactions.
Do we agree this is the next sequence?
```

After a block is committed, another part of the system has to answer:

```text
Okay, what does executing these transactions actually do?
```

The pieces now look roughly like this:

```text
Consensus
    ↓
committed block
    ↓
BlockchainState
    ↓
ExchangeState
    ↓
balances / markets / order books
```

`BlockchainState` owns the chain and mempool, while exchange-specific state lives in `ExchangeState`:

```rust
pub struct BlockchainState {
    pub blocks: Vec<Block>,
    pub mempool: Vec<Transaction>,
    pub seen_transactions: HashSet<Digest>,
    // Other bookkeeping and persistence fields omitted here.
    pub exchange_state: ExchangeState,
}
```

This separation also makes consensus replaceable. If Light DEX moves from PBFT to HotStuff, HotStuff should not need to know what a limit order is. It should agree on blocks; the exchange state should execute them.

## Transactions that mean something

First, the string-wrapped transaction becomes an enum of operations the exchange understands:

```rust
pub enum Transaction {
    Transfer {
        from: AccountId,
        to: AccountId,
        asset: AssetId,
        amount: u64,
        nonce: u64,
    },
    PlaceOrder {
        account_id: AccountId,
        market_id: MarketId,
        order_type: OrderType,
        side: Side,
        price: u64,
        quantity: u64,
        nonce: u64,
    },
    CancelOrder {
        account_id: AccountId,
        market_id: MarketId,
        order_id: OrderId,
        nonce: u64,
    },
}
```

`Transfer` moves an asset between accounts, `PlaceOrder` submits an order to a market, and `CancelOrder` removes an existing resting order. These operations are enough to exercise the execution layer without reproducing every feature of a real exchange.

## Accounts and balances

A transfer requires balances, and balances require accounts. The chain now has state that can become inconsistent if execution goes wrong. Light DEX models each account with a nonce and asset balances:

```rust
pub struct Account {
    pub id: AccountId,
    pub nonce: u64,
    pub balances: HashMap<AssetId, Balance>,
}

pub struct Balance {
    pub available: u64,
    pub locked: u64,
}
```

The difference between `available` and `locked` barely matters for a normal transfer, but it is essential for an order book. If Alice has $1,000 and places a bid that could spend $700, that $700 cannot remain available for another order. Otherwise she can effectively spend the same money twice.

```text
available balance
        ↓ place order
locked balance
        ↓ fill or cancel
balances update
```

### Making transfers atomic

A transfer is the simplest useful state transition:

```text
Alice: 1000 USD             Alice: 900 USD
Bob:    200 USD   ──100──▶  Bob:   300 USD
```

An unsafe implementation might do this:

```text
check Alice exists
check Alice has enough money
subtract from Alice
check Bob exists
add to Bob
```

If Bob does not exist, Alice's balance has already changed by the time the transaction fails. An invalid transaction must not leave a partial state change behind.

The rule is: **validate what can be checked first, and never expose a partial state change.** For a transfer, that means checking the accounts, amount, nonce, available balance, and arithmetic limits. Light DEX also stages the transition on a clone of the exchange state; it replaces the live state only if the entire transaction succeeds. That makes failure atomic for this prototype, though cloning the state will eventually be too expensive. Rust's borrow rules also make it worth planning how to update two `HashMap` entries safely.

## Nonces and replay protection

What stops someone from submitting Alice's transfer twice? Each account has a nonce, and every transaction carries the nonce it expects to consume.

```text
Alice's current nonce: 12
Next valid transaction: nonce = 12
After it succeeds:     nonce = 13
Replay of nonce 12:    rejected
```

In this implementation, **failed transactions do not increment the nonce**. If Alice has nonce 12 but tries to transfer more money than she owns, the nonce stays 12. The rule for now is:

```text
invalid transaction = no state change
```

No fees yet, no partial effects, nothing fancy.

## Executing blocks

Now committing a block has consequences. Its transactions execute in order, so every honest replica should end up with the same blocks **and** the same balances, order books and nonces.

```text
same previous state
      +
same ordered block
      ↓
same resulting state
```

That is a replicated deterministic state machine, not just a distributed linked list. Light DEX computes a deterministic digest of the exchange state: accounts and balances are sorted before hashing, as are markets and book levels. A replica can reject a block whose claimed state root does not match the result of executing it. This is a useful guardrail, not a proof that every possible failure has been handled.

## Building an order book

Light DEX uses a central limit order book rather than an AMM. It makes matching, price-time priority, and balance reservation explicit. An order looks roughly like:

```rust
pub struct Order {
    pub id: OrderId,
    pub account: AccountId,
    pub market: MarketId,
    pub side: Side,
    pub price: u64,
    pub original_quantity: u64,
    pub remaining_quantity: u64,
}

pub enum Side { Buy, Sell }
```

Prices and quantities use integers, not `f64`, in consensus-critical financial state. A price of `$67,123.45` could be represented as `6,712,345` with two implied decimals. Fixed-point arithmetic makes the intended precision and rounding rules explicit across replicas.

### Representing the CLOB

For each market, the book is:

```rust
pub struct OrderBook {
    pub bids: BTreeMap<u64, VecDeque<Order>>,
    pub asks: BTreeMap<u64, VecDeque<Order>>,
}
```

`BTreeMap` keeps price levels sorted. The best ask is the lowest price; the best bid is the highest. At a given level, `VecDeque` keeps older orders at the front and newer orders at the back. That gives price-time priority:

```text
ask prices: 100, 101, 102 ...  → best ask = 100
bid prices:  99,  98,  97 ...  → best bid = 99

same price: order A arrives, then order B
match order A first
```

Inserting a resting order is simple:

```rust
self.bids.entry(order.price).or_default().push_back(order);
```

### Matching

Suppose the asks are:

```text
100 → 2 BTC
101 → 3 BTC
105 → 10 BTC
```

Then someone sends `BUY 5 BTC @ 102`. The buy crosses the spread because its limit is at least the best ask. It fills `2 BTC @ 100` and `3 BTC @ 101` and is done.

For a buy, the matching loop repeatedly finds the best ask, checks whether it crosses, takes the oldest order at that level, matches quantities, removes a filled order, removes an empty price level, and repeats. Sells work in reverse against the highest bid.

In Rust, `iter_mut()` allows mutation of elements while the iterator borrows the collection; it does not allow removing elements with `pop_front()` during that iteration. The matching loop instead works on `front_mut()` and then `pop_front()`. That also mirrors the book's rule: always deal with the oldest order at the best price first.

### Order types

The prototype supports three order types:

```rust
pub enum OrderType { IOC, FOK, LO }
```

- **LO (limit order):** match what can be matched; rest any remainder on the book.
- **IOC (immediate or cancel):** match immediately; cancel any remainder.
- **FOK (fill or kill):** fill the whole order or do nothing.

FOK makes “validate first, mutate second” particularly important. The engine cannot fill part of an order, discover insufficient liquidity, and then call the result “kill.” Before modifying the book, it scans eligible liquidity on the opposite side to check that the entire order can fill. Staging the transaction state is another backstop against partial effects.

### Cancelling orders

The cancel transaction contains only an account, market, order ID, and nonce. The client does not supply the original price, side, or quantity: those facts must come from the exchange's stored order, not a client's claim.

Scanning every price level on both sides would work, but lookup grows with the book. Light DEX uses an index like `HashMap<OrderId, OrderLocation>`, where a location holds the market, side, and price. The book remains the source of truth; the map only tells the engine where to look.

```text
order ID
   ↓ find market, side and price
price level
   ↓ find order and verify its owner
remove order
   ↓
unlock remaining balance
```

The index adds a little redundant data in exchange for cheaper order lookup.

## A failover test exposes transaction reordering

What happens if the primary stops while transactions are flowing? In a simplified failure test, the remaining nodes voted for a new view and node 1 became primary. Replicas replayed transactions they still had toward it; node 1 collected them and proposed another block. The resulting transaction nonces arrived in this order:

```text
nonce 116
nonce 117
nonce 118
nonce 127
nonce 120
nonce 126
nonce 123
...
```

The network had reordered transactions during failover. TCP preserves message order on **one connection**, but several replicas were replaying to the new primary at the same time. An account expecting `116, 117, 118, 119, 120...` was now seeing `116, 117, 118, 127, 120...`. The execution layer correctly rejected transactions with the wrong nonce.

The simplified leader rotation worked. The nonce checks worked. The assumption connecting them—that replay would preserve each account's order—did not. A system can be wrong even when its components each do what they were designed to do.

## Mempool order isn't execution order

The first block builder effectively cloned the mempool into the block. Whatever order transactions arrived in became blockchain order. That stopped working when a leader failure changed arrival order.

The block builder needs a different rule: **nonce determines eligibility; arrival order determines priority among currently eligible transactions.**

Suppose the mempool contains:

```text
arrival 0: Alice nonce 5
arrival 1: Bob   nonce 9
arrival 2: Alice nonce 7
arrival 3: Carol nonce 2
arrival 4: Alice nonce 6
arrival 5: Bob   nonce 10
```

Current state expects Alice 5, Bob 9 and Carol 2. Alice 7 arrived early, but it can't execute until Alice 6 has happened. Initially eligible are Alice 5, Bob 9 and Carol 2. The scheduler picks Alice 5, the oldest eligible transaction, which unlocks Alice 6. The next eligible heads are Bob 9 (arrival 1), Carol 2 (arrival 3) and Alice 6 (arrival 4).

The block can become:

```text
Alice 5
Bob 9
Carol 2
Alice 6
Bob 10
Alice 7
```

Nonce order is preserved without grouping one account's entire queue together. Light DEX uses one temporary nonce-ordered queue per account and a heap containing only each account's currently eligible head. That makes the selection step roughly `O(N log A)` for `N` pending transactions across `A` active accounts, after grouping and sorting the account queues. More importantly, it removes the assumption that TCP arrival order is valid execution order.

### A tangent: the mempool and MEV

The **mempool** is the set of pending transactions waiting to enter a block. Whoever builds that block chooses an order for transactions that are otherwise eligible. That choice can change who gets filled, at what price, or whether a cancel beats an incoming order. **MEV (maximal extractable value)** is value gained by controlling transaction inclusion or ordering, for example by placing a trade ahead of someone else's. Transaction-ordering opportunities in decentralized exchanges are well documented in [*Flash Boys 2.0*](https://arxiv.org/abs/1904.05234).

This makes the scheduler a market-design decision, not just a data structure. [Hyperliquid's public rules](https://hyperliquid.gitbook.io/hyperliquid-docs/hypercore/order-book) say that, within a block, cancels are processed before actions that send GTC or IOC orders to the book. That gives makers a better chance to withdraw stale quotes before a new taker order trades against them. Light DEX does **not** implement cancel priority yet: among nonce-eligible transactions, it currently uses arrival order. Adding priority would still need to respect each account's nonce dependencies and would require tests for the trade-offs it creates.

Hyperliquid publishes that high-level rule, but its [public node repository](https://github.com/hyperliquid-dex/node) does not provide the core source code. My inference is that this raises the cost for an outsider trying to reproduce or exploit exact proposer behavior; it also makes independent code-level auditing of the scheduler harder. It does **not** prevent a block producer from seeking MEV, and it is not evidence that hidden MEV extraction exists. Finalized transaction order can be studied, but without the full set of pending submissions and their arrival times, an outside observer cannot reconstruct every scheduling choice.

## What the execution layer now does

The project has gone from `"Dummy tx 42"` to the beginnings of an exchange state machine: accounts, balances, nonces, transfers, markets, price-time-priority matching, limit/IOC/FOK orders, partial fills, cancellation, locked balances and nonce-aware block construction.

The important connection is between layers. Consensus orders transactions, but the execution layer must apply them deterministically, and block construction must respect dependencies such as nonces. A primary failure made that dependency visible: agreeing on a block is not enough if its transaction order cannot execute as intended.

## Next up: testing and consensus

The execution layer still needs stronger validation and better observability. There is a deterministic state digest now, but divergence and failure should be easier to diagnose across replicas. Useful workload scenarios include heavy transfer traffic, order-book building, crossing orders, IOC/FOK stress, cancel-heavy traffic, and primary failures during trading.

Those workloads would make it possible to benchmark orders per second, fills per second, committed transactions per second, block latency, book depth, and recovery time. Once execution is more robust, the plan is to replace PBFT with HotStuff and run both protocols against the same exchange workload. That comparison will mean more than an isolated consensus benchmark.

First, the exchange state has to stay correct when transactions and failures arrive in inconvenient orders.

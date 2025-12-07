Sui 10-Second Challenge + Global Leaderboard
===========================================

Players try to stop a timer as close as possible to **10.00 seconds (10,000 ms)**. Each player holds an owned `Game` object for their personal best, while everyone updates a shared `Leaderboard` object. The Sui on-chain `Clock` is used for timing, so the diff is always computed on-chain.

Repo layout
-----------
- `move/` — Sui Move package with the `ten_second::game` module and a minimal test.
- `frontend/` — React + TypeScript single-page app using Sui dApp Kit for wallet connect and transactions.

On-chain design (move/sources/game.move)
----------------------------------------
- `struct Game has key { id: UID, best_diff_ms: u64, active_start_ms: Option<u64> }` (owned per player).
- `struct Leaderboard has key { id: UID, entries: vector<Entry> }` shared object with linear search.
- `struct Entry { player: address, best_diff_ms: u64 }` and `StoppedEvent` emitted on every stop.
- Target time is `10_000` ms. `start` records `Clock::timestamp_ms`; `stop` computes `abs(elapsed - target)`, updates `game.best_diff_ms`, and inserts/replaces the player on the shared leaderboard.
- Entry functions: `create_leaderboard`, `create_game`, `start`, `stop`, `reset_best`.
- Error codes: `1` already started, `2` not started.
- Basic test exercises create → start → stop → improved best + leaderboard update with a testing clock.

Move usage
----------
1) Build/tests
```
cd move
sui move build
sui move test
```

2) Publish (grab the package ID from the output)
```
sui client publish --gas-budget 100000000
```

3) Example calls (replace placeholders)
```
PACKAGE=<package_id_from_publish>
GAME=<your_game_object_id>
BOARD=<shared_leaderboard_object_id>
CLOCK=0x6

# Create shared leaderboard once
sui client call --package $PACKAGE --module game --function create_leaderboard --gas-budget 20000000

# Create your owned game object
sui client call --package $PACKAGE --module game --function create_game --gas-budget 20000000

# Start then stop (Clock object is required)
sui client call --package $PACKAGE --module game --function start --args $GAME $CLOCK --gas-budget 20000000
sui client call --package $PACKAGE --module game --function stop --args $GAME $BOARD $CLOCK --gas-budget 20000000
```

Frontend (frontend/)
--------------------
Prereqs: Node 18+. Update `frontend/.env.local` with:
```
VITE_PACKAGE_ID=<your published package id>
VITE_SUI_NETWORK=testnet   # or devnet/mainnet
```

Install + run:
```
cd frontend
npm install
npm run dev
```

Page sections:
- Wallet connect (Sui dApp Kit).
- Setup: buttons to create the shared leaderboard and your owned game, plus manual ID inputs.
- Game panel: big Start/Stop buttons that call on-chain `start`/`stop` with the Clock object; shows last diff from the `StoppedEvent` and your best diff from the Game object.
- Global leaderboard: fetches the shared object, sorts client-side by `best_diff_ms`, and shows the top 10 players.

Demo flow
---------
1) Publish the Move package and set `VITE_PACKAGE_ID`.
2) Create the leaderboard (shared) via the UI or CLI, paste the ID.
3) Create your Game object (owned) via the UI.
4) Click **Start**, wait, then **Stop**. The diff is computed on-chain via `Clock::timestamp_ms`.
5) Refresh: your Game stores the new best, and the shared Leaderboard records/updates your score. Everyone sees the same top list.

Folder structure suggestion
---------------------------
- `move/Move.toml`
- `move/sources/game.move`
- `frontend/src/App.tsx`
- `frontend/src/config.ts`
- `frontend/src/main.tsx`, `frontend/src/App.css`, `frontend/src/index.css`

Transaction-building snippets (TypeScript)
------------------------------------------
```ts
// Create leaderboard
const tx = new Transaction();
tx.moveCall({ target: `${PACKAGE_ID}::game::create_leaderboard` });

// Create game
tx.moveCall({ target: `${PACKAGE_ID}::game::create_game` });

// Start
tx.moveCall({
  target: `${PACKAGE_ID}::game::start`,
  arguments: [tx.object(gameId), tx.object(SUI_CLOCK_OBJECT_ID)],
});

// Stop (owned Game + shared Leaderboard + on-chain Clock)
tx.moveCall({
  target: `${PACKAGE_ID}::game::stop`,
  arguments: [tx.object(gameId), tx.object(leaderboardId), tx.object(SUI_CLOCK_OBJECT_ID)],
});
```

Notes
-----
- The Move test uses `Clock::create_for_testing` and `Clock::set_for_testing`; production calls use the real shared clock at `0x6`.
- Leaderboard search is intentionally linear to keep the prototype simple.

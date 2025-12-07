/// ============================================================================
/// 10 SECOND CHALLENGE - Game Teaching Sui Object Model
/// ============================================================================
/// 
/// This module teaches the most powerful features of Sui:
/// 
/// 🔷 SHARED OBJECTS - Objects accessible by everyone (Leaderboard)
/// 🔶 OWNED OBJECTS - Objects only the owner can use (Game)
/// ⏰ CLOCK OBJECT - Trusted time source on blockchain
/// 📡 EVENTS - Sending information to frontend
/// 
/// ============================================================================
/// 
/// 🎓 CORE CONCEPT: SHARED vs OWNED OBJECTS
/// 
/// Objects in Sui can be stored in two ways:
/// 
/// 🔶 OWNED:
///    - Belongs to a single address
///    - Only owner can modify
///    - Transactions can run in parallel (fast!)
///    - Example: Game object - your game
/// 
/// 🔷 SHARED:
///    - Has NO owner
///    - Anyone can read/write
///    - Transactions are sequential (consensus needed)
///    - Example: Leaderboard - everyone's scores
/// 
/// ============================================================================
module ten_second::game {
    use std::option;
    use std::option::Option;
    use std::u64;
    use std::vector;
    use sui::clock::{Self, Clock};
    use sui::event;
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context;
    use sui::tx_context::TxContext;

    /// ========================================================================
    /// ERROR CODES
    /// ========================================================================
    /// Move uses numeric codes for runtime errors
    const ERR_ALREADY_STARTED: u64 = 1;  // Timer already running!
    const ERR_NOT_STARTED: u64 = 2;      // Timer not started yet!

    /// Target time: Exactly 10 seconds = 10,000 milliseconds
    const TARGET_MS: u64 = 10_000;

    /// ========================================================================
    /// GAME STRUCT - Personal Game Object (OWNED)
    /// ========================================================================
    /// 
    /// This struct holds each player's OWN game state.
    /// 
    /// 💡 Why `has key` but NOT `has store`?
    /// - `has key` = Can be an independent object on blockchain
    /// - `has store` NOT present = CANNOT be put inside other objects
    /// - This ensures Game is only in direct ownership
    /// 
    /// 📊 What is OPTION<u64>?
    /// - Used when a value may or may not exist
    /// - option::none() = Value doesn't exist
    /// - option::some(x) = Value is x
    /// - If timer not running → none, if running → some(start_time)
    /// 
    public struct Game has key {
        id: UID,                       // Unique game ID
        best_diff_ms: u64,             // Best score (difference from 10 seconds, in ms)
        active_start_ms: Option<u64>,  // Active timer start time (or null)
    }

    /// ========================================================================
    /// ENTRY STRUCT - Leaderboard Entry
    /// ========================================================================
    /// 
    /// 💡 ABILITIES explanation:
    /// - `store` = Can be stored inside other objects (inside vector)
    /// - `copy` = Can be copied
    /// - `drop` = Can be deleted (automatically cleaned when leaving scope)
    /// 
    public struct Entry has store, copy, drop {
        player: address,       // Player's wallet address
        best_diff_ms: u64,     // Their best score
        name: vector<u8>,      // Nickname (as bytes)
    }

    /// ========================================================================
    /// LEADERBOARD STRUCT - Global Leaderboard (SHARED)
    /// ========================================================================
    /// 
    /// 🌍 SHARED OBJECT:
    /// - Created with share_object()
    /// - Anyone can read and write to this object
    /// - Ideal for global state (leaderboard, game rooms, etc.)
    /// 
    /// ⚠️ NOTE: Shared object transactions are slower than owned
    /// Because all validators in the network must agree
    /// 
    public struct Leaderboard has key {
        id: UID,                   // Unique ID
        entries: vector<Entry>,    // All players' scores
    }

    /// ========================================================================
    /// EVENT - Sending Information to Frontend
    /// ========================================================================
    /// 
    /// 📡 What are EVENTS?
    /// - Way to send information from blockchain to outside world
    /// - Frontend can listen to these events
    /// - Used to relay transaction results to UI
    /// 
    public struct StoppedEvent has copy, drop {
        player: address,   // Who stopped?
        diff_ms: u64,      // What was the difference in this attempt?
        new_best_ms: u64,  // What's the new best score?
    }

    /// ========================================================================
    /// CREATE LEADERBOARD - Create Global Leaderboard
    /// ========================================================================
    /// 
    /// 🔷 share_object() vs transfer():
    /// 
    /// transfer(obj, addr) → SEND object to an address (becomes owned)
    /// share_object(obj)   → OPEN object to EVERYONE (becomes shared)
    /// 
    /// THIS IS ONE-TIME: Once shared, cannot be taken back!
    /// 
    public entry fun create_leaderboard(ctx: &mut TxContext) {
        let board = new_leaderboard(ctx);
        // 🔷 SHARE: This object no longer has an owner, everyone can access
        transfer::share_object(board);
    }

    /// ========================================================================
    /// CREATE GAME - Create Personal Game Object
    /// ========================================================================
    /// 
    /// 🔶 Usage of transfer():
    /// - Sends object to a specific address
    /// - No one else can use this object except that address
    /// - This provides security: Your game state is only yours!
    /// 
    public entry fun create_game(ctx: &mut TxContext) {
        let game = new_game(ctx);
        // 🔶 SEND: This Game now belongs to caller's wallet
        transfer::transfer(game, tx_context::sender(ctx));
    }

    /// ========================================================================
    /// START - Start the Timer
    /// ========================================================================
    /// 
    /// ⏰ What is CLOCK OBJECT (0x6)?
    /// - Sui network's official time source
    /// - Fixed address: 0x0000000000000000000000000000000000000000000000000000000000000006
    /// - timestamp_ms() → Current time (in milliseconds)
    /// 
    /// ❓ Why don't we use our own time?
    /// - User could send fake time!
    /// - Clock object is validated by validators
    /// - Trusted and cannot be manipulated
    /// 
    public entry fun start(game: &mut Game, clock: &Clock) {
        // Security: If timer already running, throw error
        assert!(!option::is_some(&game.active_start_ms), ERR_ALREADY_STARTED);
        
        // Get current time from Clock and save
        game.active_start_ms = option::some(clock::timestamp_ms(clock));
    }

    /// ========================================================================
    /// STOP - Stop Timer and Calculate Score
    /// ========================================================================
    /// 
    /// 🎯 THIS FUNCTION USES 3 DIFFERENT OBJECTS:
    /// 
    /// 1. game: &mut Game (OWNED, writable)
    ///    → Your game object, to update your score
    /// 
    /// 2. board: &mut Leaderboard (SHARED, writable)
    ///    → Global leaderboard, anyone can write
    /// 
    /// 3. clock: &Clock (SHARED, read-only)
    ///    → System clock, to get current time
    /// 
    /// 💡 This shows Sui's power:
    /// - Objects with different ownership types can be combined in one transaction
    /// - This is called "composability"
    /// 
    public entry fun stop(
        game: &mut Game,
        board: &mut Leaderboard,
        clock: &Clock,
        name: vector<u8>,
        ctx: &mut TxContext,
    ) {
        // Check if timer is running
        assert!(option::is_some(&game.active_start_ms), ERR_NOT_STARTED);
        
        // Get start time (and extract from Option)
        let start_ms = option::extract(&mut game.active_start_ms);
        
        // Get current time
        let now_ms = clock::timestamp_ms(clock);
        
        // Calculate elapsed time
        let elapsed = now_ms - start_ms;
        
        // Find difference from 10 seconds (absolute value)
        let diff = diff_from_target(elapsed);

        // Update personal best score
        if (diff < game.best_diff_ms) {
            game.best_diff_ms = diff;
        };
        
        // Update global leaderboard
        update_leaderboard(board, tx_context::sender(ctx), diff, name);
        
        // Reset timer (for playing again)
        game.active_start_ms = option::none();

        // 📡 Send event to frontend
        event::emit(StoppedEvent {
            player: tx_context::sender(ctx),
            diff_ms: diff,
            new_best_ms: game.best_diff_ms,
        });
    }

    /// Reset a game to allow replays during demos.
    public entry fun reset_best(game: &mut Game) {
        game.best_diff_ms = u64::max_value!();
        game.active_start_ms = option::none();
    }

    fun update_leaderboard(board: &mut Leaderboard, player: address, diff: u64, name: vector<u8>) {
        let len = vector::length(&board.entries);
        let mut i: u64 = 0;
        while (i < len) {
            let entry = vector::borrow_mut(&mut board.entries, i);
            if (entry.player == player) {
                if (diff < entry.best_diff_ms) {
                    entry.best_diff_ms = diff;
                };
                if (!vector::is_empty(&name)) {
                    entry.name = name;
                };
                return ()
            };
            i = i + 1;
        };
        let final_name = if (vector::is_empty(&name)) default_name(player) else name;
        vector::push_back(&mut board.entries, Entry { player, best_diff_ms: diff, name: final_name });
    }

    fun diff_from_target(elapsed_ms: u64): u64 {
        if (elapsed_ms >= TARGET_MS) {
            elapsed_ms - TARGET_MS
        } else {
            TARGET_MS - elapsed_ms
        }
    }

    fun new_game(ctx: &mut TxContext): Game {
        Game {
            id: object::new(ctx),
            best_diff_ms: u64::max_value!(),
            active_start_ms: option::none(),
        }
    }

    fun new_leaderboard(ctx: &mut TxContext): Leaderboard {
        Leaderboard {
            id: object::new(ctx),
            entries: vector::empty(),
        }
    }

    #[test]
    fun start_stop_updates_best_and_leaderboard() {
        let mut ctx = tx_context::new(@0xB, tx_context::dummy_tx_hash_with_hint(1), 0, 0, 0);
        let mut clock_obj = clock::create_for_testing(&mut ctx);
        let mut board = new_leaderboard(&mut ctx);
        let mut game = new_game(&mut ctx);

        clock::set_for_testing(&mut clock_obj, 0);
        start(&mut game, &clock_obj);

        clock::set_for_testing(&mut clock_obj, 10_020);
        stop(&mut game, &mut board, &clock_obj, b"tester", &mut ctx);

        assert!(game.best_diff_ms == 20, 100);
        assert!(vector::length(&board.entries) == 1, 101);
        let entry = vector::borrow(&board.entries, 0);
        assert!(entry.best_diff_ms == 20, 102);
        assert!(entry.name == b"tester", 105);

        clock::set_for_testing(&mut clock_obj, 20_030);
        start(&mut game, &clock_obj);

        clock::set_for_testing(&mut clock_obj, 30_035);
        stop(&mut game, &mut board, &clock_obj, b"tester2", &mut ctx);

        assert!(game.best_diff_ms == 5, 103);
        let entry_again = vector::borrow(&board.entries, 0);
        assert!(entry_again.best_diff_ms == 5, 104);
        assert!(entry_again.name == b"tester2", 106);

        transfer::share_object(board);
        transfer::transfer(game, tx_context::sender(&ctx));
        clock::destroy_for_testing(clock_obj);
    }

    fun default_name(_addr: address): vector<u8> {
        b"player"
    }
}

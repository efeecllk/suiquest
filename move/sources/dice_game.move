/// ============================================================================
/// 🎲 DICE GAME - On-Chain Randomness Tutorial
/// ============================================================================
/// 
/// This module teaches one of the most important concepts in Sui:
/// ON-CHAIN RANDOMNESS (Secure Random Number Generation)
/// 
/// 🎲 RANDOM MODULE - Secure random number generation
/// 📡 EVENTS - Sending results to the frontend
/// 💰 STAKE/REWARD - Betting and reward system
/// 
/// ============================================================================
/// 
/// 🎓 CORE CONCEPT: WHY IS ON-CHAIN RANDOMNESS IMPORTANT?
/// 
/// Traditional methods are NOT SECURE:
/// 
/// ❌ Clock timestamp → Validators can manipulate
/// ❌ Object ID → Predictable in advance
/// ❌ Frontend random → User can send fake values
/// 
/// ✅ sui::random → Real randomness produced by validator network
///    - Uses threshold cryptography
///    - No single party can manipulate
///    - Requires consensus from all validators
/// 
/// ============================================================================
/// 
/// 🎯 GAME MECHANICS:
/// 
/// 1. Player selects a number (1-6)
/// 2. Places bet with SUI
/// 3. Dice is rolled (on-chain random)
/// 4. If match → Win 6x! (1/6 chance, 6x reward)
///    If no match → Bet goes to pool
/// 
/// ============================================================================
module ten_second::dice_game {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::random::{Self, Random, RandomGenerator};

    /// ========================================================================
    /// ERROR CODES
    /// ========================================================================
    /// Move uses numeric codes for runtime errors
    /// These codes inform the frontend about error types
    
    /// Invalid guess (must be in range 1-6)
    const EInvalidGuess: u64 = 0;
    /// Insufficient pool balance (cannot pay out)
    const EInsufficientPoolBalance: u64 = 1;
    /// Bet amount cannot be zero
    const EZeroBet: u64 = 2;

    /// ========================================================================
    /// GAME POOL - Betting Pool (SHARED OBJECT)
    /// ========================================================================
    /// 
    /// 🎯 PURPOSE OF THIS STRUCT:
    /// Central pool where all bets are collected and payouts are made
    /// 
    /// 🔷 WHY SHARED OBJECT?
    /// - Anyone should be able to place bets
    /// - Anyone should be able to receive payouts
    /// - Not owned by a single address → created with share_object()
    /// 
    /// 💰 WHY BALANCE<SUI>?
    /// - Funds are safely stored inside the object
    /// - Multiple bets can be combined
    /// - Standard structure for DeFi protocols
    /// 
    public struct GamePool has key {
        id: UID,
        balance: Balance<SUI>,  // Total SUI in the pool
    }

    /// ========================================================================
    /// DICE ROLLED EVENT - Dice Result Event
    /// ========================================================================
    /// 
    /// 📡 WHAT ARE EVENTS?
    /// - A way to send information from blockchain to the outside world
    /// - Emitted within a transaction
    /// - Frontend can listen via WebSocket
    /// - Indexers record these events
    /// 
    /// 💡 ABILITIES:
    /// - `copy` = Can be copied (required for event emit)
    /// - `drop` = Can be automatically cleaned up (when leaving scope)
    /// 
    /// NOTE: Events are NOT STORED on blockchain, only emitted!
    /// To see past events, you need an indexer.
    /// 
    public struct DiceRolled has copy, drop {
        player: address,     // Who played?
        guess: u8,           // What did they guess? (1-6)
        rolled: u8,          // What did the dice show? (1-6)
        bet_amount: u64,     // How much did they bet? (MIST)
        won: bool,           // Did they win?
        payout: u64,         // How much did they win? (MIST, 0 if lost)
    }

    /// ========================================================================
    /// CREATE POOL - Create Pool (Admin Function)
    /// ========================================================================
    /// 
    /// 🎯 PURPOSE: Creates a new empty betting pool
    /// 
    /// ⚠️ IMPORTANT: This function should only be called once!
    /// Multiple pools create confusion.
    /// 
    /// In real applications:
    /// - Admin control is added (only deployer can call)
    /// - init() function is used (runs automatically)
    /// 
    public entry fun create_pool(ctx: &mut TxContext) {
        let pool = GamePool {
            id: object::new(ctx),      // Unique pool ID
            balance: balance::zero(),  // Starting balance: 0 SUI
        };
        // 🔷 SHARE: Open pool to everyone
        // Now anyone can see and use this pool
        transfer::share_object(pool);
    }

    /// ========================================================================
    /// FUND POOL - Add Funds to Pool
    /// ========================================================================
    /// 
    /// 🎯 PURPOSE: Adds SUI to increase the pool's payout capacity
    /// 
    /// 💰 COIN → BALANCE CONVERSION:
    /// - coin::into_balance() DESTROYS the Coin object
    /// - Converts value to Balance
    /// - balance::join() adds to existing balance
    /// 
    /// We learned this pattern in detail in SuiBank!
    /// 
    public entry fun fund_pool(pool: &mut GamePool, coin: Coin<SUI>) {
        // Convert Coin to Balance and add to pool
        let coin_balance = coin::into_balance(coin);
        balance::join(&mut pool.balance, coin_balance);
    }

    /// ========================================================================
    /// PLAY - Main Game Function 🎲
    /// ========================================================================
    /// 
    /// 🎯 PURPOSE: Place bet, roll dice, win or lose!
    /// 
    /// 📥 PARAMETERS:
    /// 
    /// 1. pool: &mut GamePool
    ///    - Betting pool (shared object)
    ///    - Bets go in here, payouts come from here
    /// 
    /// 2. bet: Coin<SUI>
    ///    - Player's bet
    ///    - Coin object from wallet
    /// 
    /// 3. guess: u8
    ///    - Player's guess (1-6)
    ///    - If dice shows this number, they WIN!
    /// 
    /// 4. r: &Random (🔷 SPECIAL SHARED OBJECT)
    ///    - Sui's official randomness source
    ///    - Fixed address: 0x8
    ///    - Read-only access (&Random, not mut)
    /// 
    /// 5. ctx: &mut TxContext
    ///    - Transaction info (sender, etc.)
    /// 
    /// ⚠️ ENTRY FUNCTION REQUIREMENT:
    /// Functions using Random MUST be entry functions!
    /// This enforces PTB (Programmable Transaction Block) restrictions.
    /// 
    #[allow(lint(public_random))]
    public entry fun play(
        pool: &mut GamePool,
        bet: Coin<SUI>,
        guess: u8,
        r: &Random,
        ctx: &mut TxContext
    ) {
        // ====================================================================
        // STEP 1: INPUT VALIDATION
        // ====================================================================
        // 
        // assert! = If condition is not met, ABORT the transaction
        // This ensures atomic safety - either everything happens or nothing
        
        // Is the guess between 1-6?
        assert!(guess >= 1 && guess <= 6, EInvalidGuess);
        
        // Get bet amount
        let bet_amount = coin::value(&bet);
        // Bet cannot be zero
        assert!(bet_amount > 0, EZeroBet);
        
        // Potential payout = bet x 6 (fair odds for 1/6 chance)
        let potential_payout = bet_amount * 6;
        
        // Is there enough money in the pool? (Payment guarantee)
        assert!(
            balance::value(&pool.balance) >= potential_payout - bet_amount,
            EInsufficientPoolBalance
        );

        // ====================================================================
        // STEP 2: CREATE RANDOM GENERATOR 🎲
        // ====================================================================
        // 
        // 🔐 SECURITY: RandomGenerator MUST be created inside the function!
        // 
        // Why?
        // - If passed as a parameter, caller can see its contents
        // - bcs::to_bytes(&generator) can read internal state
        // - This would allow PREDICTING the next random values!
        // 
        // new_generator(r, ctx):
        // - r = Gets seed from Random shared object
        // - ctx = Additional entropy from transaction context
        // - Different seed each call → different results
        // 
        let mut generator = random::new_generator(r, ctx);
        
        // ====================================================================
        // STEP 3: ROLL THE DICE 🎲
        // ====================================================================
        // 
        // generate_u8_in_range(&mut gen, min, max):
        // - Generates random u8 including min and max
        // - [1, 6] = 1, 2, 3, 4, 5, or 6
        // 
        // IMPORTANT: Generator must be mutable!
        // Each random call changes internal state
        // This allows getting different values from the same generator
        // 
        let rolled = random::generate_u8_in_range(&mut generator, 1, 6);
        
        // ====================================================================
        // STEP 4: WIN/LOSE CHECK
        // ====================================================================
        let won = (guess == rolled);
        let player = tx_context::sender(ctx);
        
        // ====================================================================
        // STEP 5: PAYMENT PROCESSING
        // ====================================================================
        // 
        // IF WON:
        // 1. Add bet to pool
        // 2. Withdraw 6x payout from pool
        // 3. Send payout to player
        // 
        // IF LOST:
        // 1. Add bet to pool (player lost their money)
        //
        let payout: u64;
        
        if (won) {
            // 🎉 WON!
            payout = potential_payout;
            
            // First add bet to pool
            let bet_balance = coin::into_balance(bet);
            balance::join(&mut pool.balance, bet_balance);
            
            // Then withdraw payout from pool
            let payout_balance = balance::split(&mut pool.balance, payout);
            let payout_coin = coin::from_balance(payout_balance, ctx);
            
            // Send payout to player
            transfer::public_transfer(payout_coin, player);
        } else {
            // 😢 LOST
            payout = 0;
            
            // Bet goes to pool
            let bet_balance = coin::into_balance(bet);
            balance::join(&mut pool.balance, bet_balance);
        };

        // ====================================================================
        // STEP 6: EMIT EVENT 📡
        // ====================================================================
        // 
        // event::emit() → Broadcast the event to blockchain
        // 
        // This event:
        // - Appears in transaction digest
        // - Recorded by indexers
        // - Frontend can listen via WebSocket
        // 
        // 💡 TIP: Events are cheap! Use them freely.
        // No storage cost because they only write to logs.
        // 
        event::emit(DiceRolled {
            player,
            guess,
            rolled,
            bet_amount,
            won,
            payout,
        });
    }

    /// ========================================================================
    /// GET POOL BALANCE - Query Pool Balance
    /// ========================================================================
    /// 
    /// 📖 VIEW FUNCTION:
    /// - Only READS (&GamePool - not mutable!)
    /// - Does NOT CHANGE blockchain state
    /// - Gas cost is VERY LOW
    /// - Result is in MIST (1 SUI = 1,000,000,000 MIST)
    /// 
    public fun get_pool_balance(pool: &GamePool): u64 {
        balance::value(&pool.balance)
    }
}

/// ============================================================================
/// 📚 SUMMARY: WHAT DID WE LEARN FROM THIS MODULE?
/// ============================================================================
/// 
/// 1. 🎲 sui::random MODULE
///    - Random shared object (0x8)
///    - Create generator with new_generator()
///    - Generate random numbers with generate_u8_in_range()
///    - MUST use inside entry functions!
/// 
/// 2. 📡 EVENTS
///    - Emit events with event::emit()
///    - Requires copy, drop abilities
///    - Way to send information to frontend
///    - Indexers record events
/// 
/// 3. 💰 STAKE/REWARD SYSTEM
///    - Coin → Balance conversion (into_balance)
///    - Balance → Coin conversion (from_balance)
///    - Centralized fund management with shared pool
/// 
/// 4. 🔐 SECURITY PRACTICES
///    - Input validation (assert!)
///    - Function-local RandomGenerator creation
///    - Sufficient balance checks
/// 
/// These concepts are used in:
/// - 🎰 Casino & Gambling dApps
/// - 🎮 GameFi (Play-to-Earn)
/// - 🎁 NFT Loot Boxes & Gacha
/// - 🎲 On-chain Lottery
/// 
/// ============================================================================

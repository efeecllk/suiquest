/// ============================================================================
/// NFT CARD BATTLE - Pokemon/Yu-Gi-Oh Style Card Battle Game
/// ============================================================================
/// 
/// This module teaches advanced Sui Move concepts:
/// 
/// 🎴 DYNAMIC NFTs - NFTs with evolving properties (level, XP, power)
/// 🏗️ STRUCT COMPOSITION - Nested data structures
/// 📚 VECTOR USAGE - List management for deck handling
/// 📦 OBJECT WRAPPING - Wrapping objects inside other objects
/// 
/// ============================================================================
module ten_second::card_battle {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use std::string::{Self, String};
    use std::vector;

    /// ========================================================================
    /// ERROR CODES
    /// ========================================================================
    const EDeckFull: u64 = 0;           // Deck is full (max 5 cards)
    const EDeckEmpty: u64 = 1;          // Deck is empty
    const EInvalidIndex: u64 = 2;       // Invalid card index
    const ENotEnoughXP: u64 = 3;        // Not enough XP
    const EMaxLevelReached: u64 = 4;    // Maximum level reached

    /// ========================================================================
    /// CONSTANTS
    /// ========================================================================
    const MAX_DECK_SIZE: u64 = 5;       // Maximum deck size
    const XP_PER_WIN: u64 = 25;         // XP gained per battle win
    const XP_FOR_LEVEL_UP: u64 = 100;   // XP required to level up
    const MAX_LEVEL: u64 = 10;          // Maximum level

    // Element constants (rock-paper-scissors balance)
    const ELEMENT_FIRE: u8 = 0;         // 🔥 Fire - beats Earth
    const ELEMENT_WATER: u8 = 1;        // 💧 Water - beats Fire
    const ELEMENT_EARTH: u8 = 2;        // 🌿 Earth - beats Water

    /// ========================================================================
    /// STATS STRUCT - Card Statistics
    /// ========================================================================
    /// 
    /// 🏗️ STRUCT COMPOSITION:
    /// This struct is used INSIDE the Card struct. This pattern is called
    /// "composition" - building larger structures from smaller pieces.
    /// 
    /// Benefits:
    /// - Prevents code repetition (DRY - Don't Repeat Yourself)
    /// - More readable code
    /// - Can be tested independently
    /// 
    /// 💡 `has store, copy, drop`:
    /// - `store` → Can be stored inside other structs
    /// - `copy` → Can be copied (value type)
    /// - `drop` → Can be automatically deleted
    /// 
    public struct Stats has store, copy, drop {
        attack: u64,    // Attack power (10-100 range)
        defense: u64,   // Defense power (10-100 range)
        level: u64,     // Current level (1-10)
        xp: u64,        // Experience points (100 XP = 1 level)
    }

    /// ========================================================================
    /// CARD STRUCT - NFT Card
    /// ========================================================================
    /// 
    /// 🎴 DYNAMIC NFT:
    /// Traditional NFTs are static - created once, never change.
    /// Dynamic NFTs can EVOLVE over time!
    /// 
    /// What's dynamic in this card?
    /// - stats.xp → Increases after each battle
    /// - stats.level → Increases when XP is sufficient
    /// - stats.attack/defense → Increases based on level
    /// 
    /// This is ideal for game characters, evolving art, or
    /// collectibles that change based on user interaction.
    /// 
    /// 💡 `has key, store`:
    /// - `key` → Stored on blockchain with unique ID
    /// - `store` → Can be stored inside other objects (for Deck!)
    /// 
    public struct Card has key, store {
        id: UID,            // Unique card identifier
        name: String,       // Card name (e.g., "Flame Dragon")
        element: u8,        // Element type: 0=Fire, 1=Water, 2=Earth
        stats: Stats,       // Nested struct! (Composition)
        image_id: u64,      // Visual ID (1-10 range)
    }

    /// ========================================================================
    /// DECK STRUCT - Card Deck
    /// ========================================================================
    /// 
    /// 📚 VECTOR USAGE:
    /// Vector is Move's dynamic array structure. Unlike static arrays,
    /// its size can change at runtime - you can add and remove cards.
    /// 
    /// Important Vector Functions:
    /// - vector::push_back() → Add element to end
    /// - vector::pop_back() → Remove element from end
    /// - vector::length() → Get length
    /// - vector::borrow() → Get reference to element (read)
    /// - vector::borrow_mut() → Get mutable reference (write)
    /// - vector::swap_remove() → Delete from specific index (fast but unordered)
    /// 
    /// 📦 OBJECT WRAPPING:
    /// Notice: `cards: vector<Card>` - Cards are INSIDE the deck!
    /// This is called the "wrapping" pattern. Wrapped cards:
    /// - Cannot be accessed directly (invisible to others except deck owner)
    /// - Cannot be transferred (must be removed from deck first)
    /// - Are stored securely
    /// 
    public struct Deck has key, store {
        id: UID,                // Deck identifier
        cards: vector<Card>,    // Cards are WRAPPED here!
    }

    /// ========================================================================
    /// MINT STARTER PACK - Create Starter Pack
    /// ========================================================================
    /// 
    /// 🎯 PURPOSE: Gives new player 3 starter cards
    /// 
    /// This function creates and transfers multiple objects.
    /// Each card has a different element (for balance).
    /// 
    /// 💡 IMPORTANT PATTERN: Minting multiple NFTs in one transaction
    /// Done in single transaction for gas efficiency.
    /// 
    #[allow(lint(self_transfer))]
    public entry fun mint_starter_pack(ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);
        
        // 🔥 Fire Card - High attack, low defense
        let fire_card = Card {
            id: object::new(ctx),
            name: string::utf8(b"Flame Dragon"),
            element: ELEMENT_FIRE,
            stats: Stats {
                attack: 40,
                defense: 25,
                level: 1,
                xp: 0,
            },
            image_id: 1,
        };
        transfer::transfer(fire_card, sender);
        
        // 💧 Water Card - Balanced stats
        let water_card = Card {
            id: object::new(ctx),
            name: string::utf8(b"Ocean Guardian"),
            element: ELEMENT_WATER,
            stats: Stats {
                attack: 30,
                defense: 35,
                level: 1,
                xp: 0,
            },
            image_id: 2,
        };
        transfer::transfer(water_card, sender);
        
        // 🌿 Earth Card - High defense, low attack
        let earth_card = Card {
            id: object::new(ctx),
            name: string::utf8(b"Forest Titan"),
            element: ELEMENT_EARTH,
            stats: Stats {
                attack: 25,
                defense: 40,
                level: 1,
                xp: 0,
            },
            image_id: 3,
        };
        transfer::transfer(earth_card, sender);
    }

    /// ========================================================================
    /// MINT SINGLE CARD - Create Single Card
    /// ========================================================================
    /// 
    /// For testing and demos - mint individual cards.
    /// Element parameter selects the desired type.
    /// 
    #[allow(lint(self_transfer))]
    public entry fun mint_card(element: u8, ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);
        
        // Card properties based on element
        let (name, attack, defense, image_id) = if (element == ELEMENT_FIRE) {
            (b"Fire Warrior", 35, 25, 4)
        } else if (element == ELEMENT_WATER) {
            (b"Water Spirit", 30, 30, 5)
        } else {
            (b"Earth Golem", 25, 35, 6)
        };
        
        let card = Card {
            id: object::new(ctx),
            name: string::utf8(name),
            element: element % 3, // Ensure 0, 1, or 2
            stats: Stats {
                attack,
                defense,
                level: 1,
                xp: 0,
            },
            image_id,
        };
        
        transfer::transfer(card, sender);
    }

    /// ========================================================================
    /// CREATE DECK - Create Empty Deck
    /// ========================================================================
    /// 
    /// 📚 VECTOR CREATION:
    /// `vector::empty()` creates an empty vector.
    /// Elements can be added later with `push_back`.
    /// 
    #[allow(lint(self_transfer))]
    public entry fun create_deck(ctx: &mut TxContext) {
        let deck = Deck {
            id: object::new(ctx),
            cards: vector::empty<Card>(),  // Create empty vector
        };
        transfer::transfer(deck, tx_context::sender(ctx));
    }

    /// ========================================================================
    /// ADD TO DECK - Add Card to Deck
    /// ========================================================================
    /// 
    /// 📦 OBJECT WRAPPING IN ACTION:
    /// This function CONSUMES the `card` parameter (by value).
    /// The card is no longer an independent object - it's INSIDE the deck!
    /// 
    /// Ownership in Move is crucial:
    /// - `card: Card` → Ownership transfers to this function
    /// - `vector::push_back` → Card is added to vector
    /// - Card can no longer be transferred individually!
    /// 
    /// 📚 VECTOR PUSH_BACK:
    /// `vector::push_back(&mut v, elem)` - Adds element to end
    /// O(1) complexity - very fast!
    /// 
    public entry fun add_to_deck(deck: &mut Deck, card: Card) {
        // Check if deck is full
        assert!(vector::length(&deck.cards) < MAX_DECK_SIZE, EDeckFull);
        
        // Add card to deck (WRAP)
        // From this point, the card is inside the deck!
        vector::push_back(&mut deck.cards, card);
    }

    /// ========================================================================
    /// REMOVE FROM DECK - Remove Card from Deck
    /// ========================================================================
    /// 
    /// 📦 OBJECT UNWRAPPING:
    /// Making a wrapped object independent again.
    /// 
    /// 📚 VECTOR SWAP_REMOVE:
    /// `vector::swap_remove(&mut v, index)` - Deletes specified index
    /// 
    /// How it works:
    /// 1. SWAP the element at index with the last element
    /// 2. Remove (pop) the last element
    /// 
    /// ⚠️ WARNING: Order changes! [A, B, C] → remove(0) → [C, B]
    /// But O(1) performance makes this acceptable.
    /// 
    #[allow(lint(self_transfer))]
    public entry fun remove_from_deck(
        deck: &mut Deck, 
        index: u64, 
        ctx: &mut TxContext
    ) {
        let len = vector::length(&deck.cards);
        assert!(len > 0, EDeckEmpty);
        assert!(index < len, EInvalidIndex);
        
        // Remove card from deck (UNWRAP)
        let card = vector::swap_remove(&mut deck.cards, index);
        
        // Send card back to user
        // It's now an independent NFT again!
        transfer::transfer(card, tx_context::sender(ctx));
    }

    /// ========================================================================
    /// BATTLE - Battle Two Cards
    /// ========================================================================
    /// 
    /// 🎮 BATTLE MECHANICS:
    /// 
    /// 1. ELEMENT ADVANTAGE (Rock-Paper-Scissors):
    ///    🔥 Fire → 🌿 Earth (Fire burns Earth)
    ///    💧 Water → 🔥 Fire (Water extinguishes Fire)
    ///    🌿 Earth → 💧 Water (Earth absorbs Water)
    ///    Element advantage: +15 attack bonus!
    /// 
    /// 2. POWER CALCULATION:
    ///    Effective Attack = attack + (level * 5) + element_bonus
    ///    Winner = Card with higher effective attack
    /// 
    /// 3. XP GAIN:
    ///    Winner gains 25 XP
    ///    Loser loses nothing (no burn!)
    /// 
    /// 🎴 DYNAMIC NFT:
    /// Card's XP changes after every battle → This is Dynamic NFT!
    /// The card truly EVOLVES on the blockchain.
    /// 
    public entry fun battle(
        my_card: &mut Card,
        opponent_card: &mut Card,
    ) {
        // Calculate element advantage
        let my_bonus: u64 = if (has_element_advantage(my_card.element, opponent_card.element)) {
            15
        } else {
            0
        };
        
        let opponent_bonus: u64 = if (has_element_advantage(opponent_card.element, my_card.element)) {
            15
        } else {
            0
        };
        
        // Calculate effective attack power
        let my_power = my_card.stats.attack + 
                       (my_card.stats.level * 5) + 
                       my_bonus;
        
        let opponent_power = opponent_card.stats.attack + 
                            (opponent_card.stats.level * 5) + 
                            opponent_bonus;
        
        // Determine winner and award XP
        // Both cards gain XP, but winner gets more!
        if (my_power >= opponent_power) {
            // My card won!
            add_xp(my_card, XP_PER_WIN);
            add_xp(opponent_card, XP_PER_WIN / 2); // Loser also gains some XP
        } else {
            // Opponent won
            add_xp(opponent_card, XP_PER_WIN);
            add_xp(my_card, XP_PER_WIN / 2);
        };
    }

    /// ========================================================================
    /// LEVEL UP - Level Up Card
    /// ========================================================================
    /// 
    /// 🎴 DYNAMIC NFT UPDATE:
    /// This function updates the card's MOST IMPORTANT properties:
    /// - Level increases
    /// - XP resets
    /// - Attack and defense increase!
    /// 
    /// 💡 Why a separate function?
    /// Level up is an important event. User should consciously
    /// trigger it (for UX). Auto level-up could work too but
    /// this provides a better learning experience.
    /// 
    public entry fun level_up(card: &mut Card) {
        // Enough XP?
        assert!(card.stats.xp >= XP_FOR_LEVEL_UP, ENotEnoughXP);
        
        // Max level reached?
        assert!(card.stats.level < MAX_LEVEL, EMaxLevelReached);
        
        // Level up!
        card.stats.level = card.stats.level + 1;
        card.stats.xp = card.stats.xp - XP_FOR_LEVEL_UP; // Extra XP carries over
        
        // +3 attack, +3 defense per level
        card.stats.attack = card.stats.attack + 3;
        card.stats.defense = card.stats.defense + 3;
        
        // 🎴 Card is now stronger! Dynamic NFT in action!
    }

    /// ========================================================================
    /// HELPER: Element Advantage Check
    /// ========================================================================
    /// 
    /// Rock-Paper-Scissors logic:
    /// Fire (0) beats Earth (2)
    /// Water (1) beats Fire (0)
    /// Earth (2) beats Water (1)
    /// 
    fun has_element_advantage(attacker: u8, defender: u8): bool {
        if (attacker == ELEMENT_FIRE && defender == ELEMENT_EARTH) {
            true
        } else if (attacker == ELEMENT_WATER && defender == ELEMENT_FIRE) {
            true
        } else if (attacker == ELEMENT_EARTH && defender == ELEMENT_WATER) {
            true
        } else {
            false
        }
    }

    /// ========================================================================
    /// HELPER: Add XP
    /// ========================================================================
    /// 
    /// Safely adds XP (with overflow check).
    /// 
    fun add_xp(card: &mut Card, amount: u64) {
        let new_xp = card.stats.xp + amount;
        // Max XP limit (enough for 2 levels)
        if (new_xp > XP_FOR_LEVEL_UP * 2) {
            card.stats.xp = XP_FOR_LEVEL_UP * 2;
        } else {
            card.stats.xp = new_xp;
        };
    }

    /// ========================================================================
    /// VIEW FUNCTIONS - Read-only Functions
    /// ========================================================================
    
    /// Return deck size
    public fun deck_size(deck: &Deck): u64 {
        vector::length(&deck.cards)
    }

    /// Return card stats
    public fun card_stats(card: &Card): (u64, u64, u64, u64) {
        (card.stats.attack, card.stats.defense, card.stats.level, card.stats.xp)
    }

    /// Return card element
    public fun card_element(card: &Card): u8 {
        card.element
    }
}

/// ============================================================================
/// 📚 SUMMARY: WHAT DID WE LEARN FROM THIS MODULE?
/// ============================================================================
/// 
/// 1. DYNAMIC NFTs
///    - NFTs can change (XP, level, power)
///    - Ideal for game characters and evolving art
///    - Real evolution on blockchain!
/// 
/// 2. STRUCT COMPOSITION
///    - Nested struct structures (Stats in Card)
///    - Code organization and reuse
///    - `store`, `copy`, `drop` abilities
/// 
/// 3. VECTOR USAGE
///    - Dynamic arrays (cards in Deck)
///    - push_back, pop_back, swap_remove
///    - Collection management
/// 
/// 4. OBJECT WRAPPING
///    - Storing objects inside other objects
///    - Security and access control
///    - Wrap/Unwrap pattern
/// 
/// These concepts are used in REAL WORLD applications:
/// - NFT collections and games
/// - Inventory systems
/// - Complex data structures
/// 
/// ============================================================================

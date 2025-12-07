/// ============================================================================
/// SUI PET - Virtual Pet Game on Blockchain
/// ============================================================================
/// 
/// This module is a virtual pet game running on blockchain.
/// It is designed to teach fundamental concepts of the Move language:
/// 
/// 📦 OBJECTS: Pet is an "object" stored on the blockchain
/// 🔑 OWNERSHIP: Each Pet belongs to a wallet and only the owner can modify it
/// ✍️ MUTABLE REFERENCES (&mut): "Borrowing" system to modify objects
/// 
/// ============================================================================
module ten_second::sui_pet {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;

    /// ========================================================================
    /// PET STRUCT - Pet Data Structure
    /// ========================================================================
    /// 
    /// This struct defines an "object" stored on the blockchain.
    /// 
    /// `has key` → This struct can be stored with a unique ID on blockchain
    /// `has store` → This struct can be stored inside other objects
    /// 
    /// Each Pet has these properties:
    /// - id: Unique identity on blockchain (e.g., 0x1a2b3c...)
    /// - hunger: Hunger level (0 = full, 100 = very hungry)
    /// - happiness: Happiness level (0 = sad, 100 = very happy)  
    /// - energy: Energy level (0 = tired, 100 = energetic)
    /// 
    public struct Pet has key, store {
        id: UID,        // Unique object ID - each Pet's fingerprint
        hunger: u64,    // Hunger: 0-100 (low = good)
        happiness: u64, // Happiness: 0-100 (high = good)
        energy: u64,    // Energy: 0-100 (high = good)
    }

    /// Maximum limit for stat values
    const MAX_STAT: u64 = 100;

    /// ========================================================================
    /// MINT - Create New Pet
    /// ========================================================================
    /// 
    /// 🎯 PURPOSE: Creates a new Pet object on blockchain and sends to owner
    /// 
    /// When this function is called:
    /// 1. object::new(ctx) → Creates new unique ID
    /// 2. Pet struct → Filled with initial values
    /// 3. transfer::transfer → Pet is sent to the signer's wallet
    /// 
    /// 💡 IMPORTANT CONCEPT: "Minting" = Creating new digital asset on blockchain
    /// NFTs, tokens - all are "minted" this way
    /// 
    #[allow(lint(self_transfer))]
    public entry fun mint(ctx: &mut TxContext) {
        // Create new Pet - just like adopting a pet!
        let pet = Pet {
            id: object::new(ctx),  // Get unique ID from blockchain
            hunger: 0,              // Initially full (0 = not hungry at all)
            happiness: 100,         // Initially very happy
            energy: 100,            // Initially full energy
        };
        
        // Transfer Pet to the signer's wallet
        // tx_context::sender(ctx) → Who signed the transaction? Their address
        transfer::transfer(pet, tx_context::sender(ctx));
    }

    /// ========================================================================
    /// FEED - Feed the Pet
    /// ========================================================================
    /// 
    /// 🎯 PURPOSE: Decreases hunger value (makes Pet full)
    /// 
    /// 💡 MUTABLE REFERENCE (&mut Pet):
    /// - "&mut" = "Borrow this object AND modify it"
    /// - In Move, you must specify this for security when modifying objects
    /// - Only the Pet's OWNER can call this function!
    /// 
    /// 🔒 SECURITY: Blockchain automatically checks:
    /// - Does this Pet belong to this person? ✓
    /// - Is there modification permission? ✓ (specified with &mut)
    /// 
    public entry fun feed(pet: &mut Pet) {
        // Decrease hunger by 20 points (minimum 0)
        // Why "else 0"? → Because u64 cannot be negative!
        if (pet.hunger > 20) {
            pet.hunger = pet.hunger - 20;
        } else {
            pet.hunger = 0;  // If less than 20, set directly to 0
        };
        // Changes are automatically saved when function ends
    }

    /// ========================================================================
    /// PLAY - Play with Pet
    /// ========================================================================
    /// 
    /// 🎯 PURPOSE: Modifies multiple stats at once
    /// 
    /// This function demonstrates "ATOMICITY" concept:
    /// - Either ALL changes happen
    /// - Or NONE happen (if transaction fails)
    /// 
    /// Effects of playing:
    /// ✅ Happiness +10 (Having fun!)
    /// ⚡ Energy -10 (Getting tired)
    /// 🍖 Hunger +10 (Getting hungry)
    /// 
    public entry fun play(pet: &mut Pet) {
        // 1. Increase happiness (maximum 100)
        if (pet.happiness + 10 <= MAX_STAT) {
            pet.happiness = pet.happiness + 10;
        } else {
            pet.happiness = MAX_STAT;  // Cannot exceed 100
        };

        // 2. Decrease energy (minimum 0)
        if (pet.energy > 10) {
            pet.energy = pet.energy - 10;
        } else {
            pet.energy = 0;
        };

        // 3. Increase hunger (exercise makes hungry!)
        if (pet.hunger + 10 <= MAX_STAT) {
            pet.hunger = pet.hunger + 10;
        } else {
            pet.hunger = MAX_STAT;
        };
        
        // 🎯 IMPORTANT: These 3 changes happen in a single transaction
        // This is called an "atomic operation" - indivisible!
    }

    /// ========================================================================
    /// SLEEP - Put Pet to Sleep
    /// ========================================================================
    /// 
    /// 🎯 PURPOSE: Fully restores energy, but gets hungry while sleeping
    /// 
    /// This function shows a simple but important pattern:
    /// - Some actions have side effects
    /// - Realistic game mechanic: sleep = energy ↑ but hunger also ↑
    /// 
    public entry fun sleep(pet: &mut Pet) {
        // Fully restore energy
        pet.energy = MAX_STAT;  // 💤 Zzz... Fully rested!
        
        // Gets a bit hungry while sleeping (metabolism working)
        if (pet.hunger + 10 <= MAX_STAT) {
            pet.hunger = pet.hunger + 10;
        } else {
            pet.hunger = MAX_STAT;
        };
    }
}

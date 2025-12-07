/// ============================================================================
/// SUI BANK - Bank Simulator Teaching DeFi Fundamentals
/// ============================================================================
/// 
/// This module teaches the most important DeFi concepts on Sui blockchain:
/// 
/// 💰 COIN vs BALANCE - Two different forms of tokens
/// 🔄 CONVERSION - Coin ↔ Balance conversion
/// 🏦 CUSTODY - Secure storage of funds
/// 
/// ============================================================================
/// 
/// 🎓 CORE CONCEPT: WHAT IS COIN vs BALANCE?
/// 
/// Think of it like having 100 dollars:
/// 
/// 📱 COIN<SUI> = Cash in your pocket
///    - Independent object (has its own ID)
///    - Can be transferred (you can give it to someone)
///    - Visible in your wallet
/// 
/// 🏦 BALANCE<SUI> = Money in your bank account
///    - STORED INSIDE another object
///    - Cannot be transferred directly
///    - Must be converted to Coin first
/// 
/// ============================================================================
module ten_second::sui_bank {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;

    /// ========================================================================
    /// ERROR CODES
    /// ========================================================================
    /// In Move, errors are indicated with numeric codes
    const EInsufficientBalance: u64 = 0;  // Insufficient balance error

    /// ========================================================================
    /// BANK ACCOUNT - Bank Account Struct
    /// ========================================================================
    /// 
    /// Why does this struct hold Balance<SUI>, not Coin<SUI>?
    /// 
    /// ✅ Advantages of using BALANCE:
    /// - Stored safely INSIDE the account
    /// - Only the account owner can access
    /// - Multiple deposits can be combined
    /// 
    /// ❌ If we used COIN:
    /// - Each coin would be a separate object
    /// - Complex management required
    /// - Professional DeFi apps use Balance
    /// 
    public struct BankAccount has key, store {
        id: UID,                  // Unique account ID
        balance: Balance<SUI>,    // SUI balance (internal storage)
    }

    /// ========================================================================
    /// CREATE ACCOUNT - Open New Bank Account
    /// ========================================================================
    /// 
    /// 🎯 PURPOSE: Creates an empty bank account
    /// 
    /// This pattern is used in all Sui applications:
    /// 1. Create new object
    /// 2. Transfer to user
    /// 
    #[allow(lint(self_transfer))]
    public entry fun create_account(ctx: &mut TxContext) {
        let account = BankAccount {
            id: object::new(ctx),      // New unique ID
            balance: balance::zero(),  // Starting balance: 0 SUI
        };
        // Send account to the creator
        transfer::transfer(account, tx_context::sender(ctx));
    }

    /// ========================================================================
    /// DEPOSIT - Deposit Funds
    /// ========================================================================
    /// 
    /// 🎯 PURPOSE: Converts wallet Coin to account Balance
    /// 
    /// 🔄 CONVERSION FLOW:
    /// 
    ///   [Coin<SUI>]  ──coin::into_balance()──►  [Balance<SUI>]
    ///   (In wallet)                              (In account)
    /// 
    /// 💡 IMPORTANT: into_balance() DESTROYS the Coin and returns Balance
    /// This is safe because total value is preserved (conservation of value)
    /// 
    public entry fun deposit(account: &mut BankAccount, coin: Coin<SUI>) {
        // STEP 1: Convert Coin to Balance
        // NOTE: This operation consumes the Coin object!
        let coin_balance = coin::into_balance(coin);
        
        // STEP 2: Add new Balance to existing balance
        // join() = combine two Balances
        balance::join(&mut account.balance, coin_balance);
        
        // 🎯 RESULT: Coin is gone, its value is added to account
    }

    /// ========================================================================
    /// WITHDRAW - Withdraw Funds
    /// ========================================================================
    /// 
    /// 🎯 PURPOSE: Converts account Balance to Coin and sends to wallet
    /// 
    /// 🔄 REVERSE CONVERSION:
    /// 
    ///   [Balance<SUI>]  ──balance::split()──►  [Balance portion]
    ///                   ──coin::from_balance()──►  [Coin<SUI>]
    /// 
    /// 🔒 SECURITY: Balance check with assert!
    /// If insufficient balance, transaction FAILS (atomicity!)
    /// 
    #[allow(lint(self_transfer))]
    public entry fun withdraw(
        account: &mut BankAccount, 
        amount: u64,               // Amount to withdraw (in MIST)
        ctx: &mut TxContext
    ) {
        // STEP 1: Check if sufficient balance exists
        // assert! = If condition is false, abort transaction
        assert!(
            balance::value(&account.balance) >= amount, 
            EInsufficientBalance  // Error code: 0
        );
        
        // STEP 2: Split requested amount from Balance
        // split() = Extract a portion from existing Balance
        let withdrawn_balance = balance::split(&mut account.balance, amount);
        
        // STEP 3: Convert Balance to Coin
        // from_balance() creates a new Coin object
        let coin = coin::from_balance(withdrawn_balance, ctx);
        
        // STEP 4: Send Coin to user's wallet
        // public_transfer = Send so anyone can receive
        transfer::public_transfer(coin, tx_context::sender(ctx));
        
        // 🎯 RESULT: Deducted from account, arrived in wallet!
    }

    /// ========================================================================
    /// ADD INTEREST - Add Interest (Conceptual)
    /// ========================================================================
    /// 
    /// ⚠️ NOTE: This function is for educational purposes, doesn't actually work!
    /// 
    /// In real DeFi, where does interest come from?
    /// - Lending pools
    /// - Staking rewards
    /// - Protocol fees
    /// 
    /// We cannot create SUI from nothing - this is blockchain's fundamental rule!
    /// 
    public entry fun add_interest(account: &mut BankAccount, ctx: &mut TxContext) {
        let current = balance::value(&account.balance);
        // Concept: Calculate 10% interest
        let _interest_amount = current / 10;
        // In reality: SUI must come from another source for interest
        let _ = ctx; // Suppress unused variable warning
    }

    /// ========================================================================
    /// GET BALANCE - Query Balance
    /// ========================================================================
    /// 
    /// 🎯 PURPOSE: Returns total balance in account
    /// 
    /// 📖 VIEW FUNCTION:
    /// - Only reads (&BankAccount - not mutable!)
    /// - Does NOT CHANGE blockchain state
    /// - Gas cost is VERY LOW
    /// 
    public fun get_balance(account: &BankAccount): u64 {
        balance::value(&account.balance)
    }
}

/// ============================================================================
/// 📚 SUMMARY: WHAT DID WE LEARN FROM THIS MODULE?
/// ============================================================================
/// 
/// 1. COIN vs BALANCE difference - Building block of DeFi
/// 2. Ownership - Who can modify what
/// 3. Conversion - into_balance() and from_balance()
/// 4. Error Handling - Safe checks with assert!
/// 
/// These concepts are used in ALL Sui DeFi applications:
/// - DEXs (Decentralized Exchanges)
/// - Lending Protocols
/// - Staking
/// - Liquidity Pools
/// 
/// ============================================================================

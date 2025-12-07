import { useEffect, useState } from 'react';
import {
    ConnectButton,
    useCurrentAccount,
    useSignAndExecuteTransaction,
    useSuiClient,
} from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';

// Package ID - deployed to testnet
const PACKAGE_ID = '0x4134ca8bda08bbed3785b83aa1412942c233a84b4fc4130a425e16a7e4b651d7';

type BankAccount = {
    id: string;
    balance: string; // u64 comes as string
};

type TutorialStep = 'intro' | 'create' | 'deposit' | 'withdraw';

interface TutorialStepData {
    key: TutorialStep;
    title: string;
    body: string;
    details: string;
    icon: string;
    code?: string;
}

const tutorialSteps: TutorialStepData[] = [
    {
        key: 'intro',
        title: '🏦 Welcome to Sui Bank!',
        body: 'Coin vs Balance - Foundation of DeFi',
        details: `In [Sui Move](https://docs.sui.io/concepts/sui-move-concepts), there are **two different ways** to hold tokens:

**💵 [Coin<T>](https://docs.sui.io/standards/coin)** = Cash in your pocket
• Independent [object](https://docs.sui.io/concepts/object-model) (has its own ID)
• Can be [transferred](https://docs.sui.io/references/framework/sui/transfer) to someone
• Directly visible in your wallet

**🏦 [Balance<T>](https://docs.sui.io/references/framework/sui/balance)** = Money in your bank account
• Stored INSIDE another [object](https://docs.sui.io/concepts/object-model)
• Cannot be transferred directly
• Must be converted to [Coin](https://docs.sui.io/standards/coin) first

This game teaches the conversion between these two forms - which **forms the foundation of all DeFi applications**.

📖 [Coin Standard](https://docs.sui.io/standards/coin) | [Balance Module](https://docs.sui.io/references/framework/sui/balance)`,
        icon: '🏦',
    },
    {
        key: 'create',
        title: '📂 Opening Bank Account',
        body: 'Object Initialization',
        details: `When you open an account, **a new [object](https://docs.sui.io/concepts/object-model)** is created on the blockchain.

**Step by step what happens:**
1. \`[object::new(ctx)](https://docs.sui.io/references/framework/sui/object)\` → Unique account ID is created
2. \`[balance::zero()](https://docs.sui.io/references/framework/sui/balance)\` → Initialized with empty balance
3. \`[transfer::transfer](https://docs.sui.io/references/framework/sui/transfer)\` → Account is sent to your wallet

**After account is opened:**
• This BankAccount [object](https://docs.sui.io/concepts/object-model) is now **YOURS**
• Only YOU can deposit/withdraw ([ownership](https://docs.sui.io/concepts/object-ownership))
• No one can access without permission

This pattern is used everywhere: [NFT](https://docs.sui.io/standards/nft) collections, game inventories, DeFi vaults...

📖 [Object Model](https://docs.sui.io/concepts/object-model) | [Transfer Module](https://docs.sui.io/references/framework/sui/transfer)`,
        icon: '📂',
        code: `public entry fun create_account(ctx: &mut TxContext) {
    let account = BankAccount {
        id: object::new(ctx),      // Unique ID
        balance: balance::zero(),  // Start with 0 SUI
    };
    // Send account to you
    transfer::transfer(account, tx_context::sender(ctx));
}`
    },
    {
        key: 'deposit',
        title: '💰 Deposit Funds',
        body: 'Coin → Balance Conversion',
        details: `When you deposit, **[Coin<SUI>](https://docs.sui.io/standards/coin)** → **[Balance<SUI>](https://docs.sui.io/references/framework/sui/balance)** conversion happens.

**Why is this conversion important?**
• \`[Coin<SUI>](https://docs.sui.io/standards/coin)\` = Transferable independent [object](https://docs.sui.io/concepts/object-model)
• \`[Balance<SUI>](https://docs.sui.io/references/framework/sui/balance)\` = Stored safely INSIDE the account

**Main functions:**
• \`[coin::into_balance](https://docs.sui.io/references/framework/sui/coin)(coin)\` → Destroys Coin, returns Balance
• \`[balance::join](https://docs.sui.io/references/framework/sui/balance)(&mut target, source)\` → Combines two Balances

**Real world equivalent:**
When you deposit cash ([Coin](https://docs.sui.io/standards/coin)) to bank, money is now in your account ([Balance](https://docs.sui.io/references/framework/sui/balance)).

All DeFi protocols store user funds this way!

📖 [Coin Module](https://docs.sui.io/references/framework/sui/coin) | [Balance Module](https://docs.sui.io/references/framework/sui/balance)`,
        icon: '💰',
        code: `public entry fun deposit(
    account: &mut BankAccount, 
    coin: Coin<SUI>
) {
    // Convert Coin to Balance (Coin is destroyed!)
    let coin_balance = coin::into_balance(coin);
    
    // Add to existing balance
    balance::join(&mut account.balance, coin_balance);
}`
    },
    {
        key: 'withdraw',
        title: '💸 Withdraw Funds',
        body: 'Balance → Coin Conversion',
        details: `Withdrawing is the **exact opposite** of depositing.

**Withdrawal steps:**
1. \`[balance::split](https://docs.sui.io/references/framework/sui/balance)\` → Split amount from balance
2. \`[coin::from_balance](https://docs.sui.io/references/framework/sui/coin)\` → Convert Balance to Coin
3. \`[transfer::public_transfer](https://docs.sui.io/references/framework/sui/transfer)\` → Send Coin to wallet

**🔒 SECURITY ([Ownership](https://docs.sui.io/concepts/object-ownership)):**
Only the account [owner](https://docs.sui.io/concepts/object-ownership/address-owned) can call this function. Why?

In [Move](https://move-book.com/), \`[&mut BankAccount](https://move-book.com/concepts/references.html)\` parameter means:
• "I will modify this [object](https://docs.sui.io/concepts/object-model)"
• Only the [OWNER](https://docs.sui.io/concepts/object-ownership) can provide this [reference](https://move-book.com/concepts/references.html)

This pattern **guarantees only you can withdraw your money**.

📖 [Ownership](https://docs.sui.io/concepts/object-ownership) | [References](https://move-book.com/concepts/references.html)`,
        icon: '💸',
        code: `public entry fun withdraw(
    account: &mut BankAccount, 
    amount: u64, 
    ctx: &mut TxContext
) {
    // Split amount from balance
    let withdrawn = balance::split(
        &mut account.balance, amount
    );
    
    // Convert Balance to Coin
    let coin = coin::from_balance(withdrawn, ctx);
    
    // Send Coin to wallet
    transfer::public_transfer(
        coin, tx_context::sender(ctx)
    );
}`
    }
];

const TechnicalSidebar = ({ step, steps }: { step: TutorialStep; steps: TutorialStepData[] }) => {
    const currentStep = steps.find((s) => s.key === step) || steps[0];
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (currentStep.code) {
            navigator.clipboard.writeText(currentStep.code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const renderMarkdown = (text: string) => {
        const parts = text.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*)/g);

        return parts.map((part, i) => {
            const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
            if (linkMatch) {
                return (
                    <a
                        key={i}
                        href={linkMatch[2]}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#4facfe', textDecoration: 'underline' }}
                    >
                        {linkMatch[1]}
                    </a>
                );
            }

            const boldMatch = part.match(/^\*\*([^*]+)\*\*$/);
            if (boldMatch) {
                return <strong key={i} style={{ color: '#fff' }}>{boldMatch[1]}</strong>;
            }

            return part;
        });
    };

    return (
        <aside className="technical-sidebar">
            <div className="sidebar-header">
                <h2>Technical Inspector</h2>
            </div>
            <div className="technical-content" key={currentStep.key}>
                <div className="technical-concept">
                    <h3>
                        <span>{currentStep.icon}</span>
                        {currentStep.title}
                    </h3>
                    <div className="concept-body">
                        {currentStep.details.split('\n\n').map((paragraph, idx) => (
                            <p key={idx}>{renderMarkdown(paragraph)}</p>
                        ))}
                    </div>
                </div>
                {currentStep.code && (
                    <div className="code-display">
                        <div className="code-header">
                            <span className="lang-badge">Move / Sui</span>
                            <button className="copy-btn" onClick={handleCopy}>
                                {copied ? '✓ Copied' : '📋 Copy'}
                            </button>
                        </div>
                        <pre><code>{currentStep.code}</code></pre>
                    </div>
                )}
            </div>
        </aside>
    );
};

export default function SuiBank() {
    const account = useCurrentAccount();
    const client = useSuiClient();
    const { mutateAsync: signAndExecute, isPending } = useSignAndExecuteTransaction();

    const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [selectedTopic, setSelectedTopic] = useState<TutorialStep>('intro');
    const [depositAmount, setDepositAmount] = useState<string>('0.1');
    const [withdrawAmount, setWithdrawAmount] = useState<string>('0.05');

    // Fetch user's bank account on load
    useEffect(() => {
        if (account) {
            fetchBankAccount();
        } else {
            setBankAccount(null);
        }
    }, [account]);

    const fetchBankAccount = async (retries = 3) => {
        if (!account) return;
        console.log(`[SuiBank] Fetching account for ${account.address}`);
        try {
            const { data } = await client.getOwnedObjects({
                owner: account.address,
                filter: { StructType: `${PACKAGE_ID}::sui_bank::BankAccount` },
                options: { showContent: true }
            });

            console.log(`[SuiBank] Found ${data.length} accounts`, data);

            if (data.length > 0) {
                const objectResp = data[0];
                const content = objectResp.data?.content;
                if (content && content.dataType === 'moveObject') {
                    const fields = content.fields as any;
                    setBankAccount({
                        id: objectResp.data?.objectId || '',
                        balance: fields.balance,
                    });
                }
            } else {
                if (retries > 0) {
                    console.log(`[SuiBank] No account found, retrying...`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    return fetchBankAccount(retries - 1);
                }
                setBankAccount(null);
            }
        } catch (e) {
            console.error('[SuiBank] Error fetching account:', e);
            setError("Failed to fetch bank account.");
        }
    };

    const handleCreateAccount = async () => {
        if (!account) return;
        setSelectedTopic('create');
        setError(null);
        setMessage("Creating bank account...");
        try {
            const tx = new Transaction();
            tx.moveCall({
                target: `${PACKAGE_ID}::sui_bank::create_account`,
                arguments: [],
            });
            tx.setGasBudget(10_000_000);

            const res = await signAndExecute({ transaction: tx });
            const digest = (res as { digest?: string }).digest;
            if (!digest) throw new Error('No transaction digest');

            await client.waitForTransaction({
                digest,
                options: { showObjectChanges: true }
            });

            setMessage("Bank account created! 🎉");
            await new Promise(resolve => setTimeout(resolve, 2000));
            await fetchBankAccount();
        } catch (e: any) {
            console.error('[SuiBank] Create error:', e);
            setError(e.message || "Failed to create account");
        }
    };

    const handleDeposit = async () => {
        if (!bankAccount) return;
        setSelectedTopic('deposit');
        setError(null);

        const amountInMist = Math.floor(parseFloat(depositAmount) * 1_000_000_000);
        if (isNaN(amountInMist) || amountInMist <= 0) {
            setError("Invalid deposit amount");
            return;
        }

        setMessage(`Depositing ${depositAmount} SUI...`);
        try {
            const tx = new Transaction();

            // Split the deposit amount from gas
            const [depositCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(amountInMist)]);

            tx.moveCall({
                target: `${PACKAGE_ID}::sui_bank::deposit`,
                arguments: [
                    tx.object(bankAccount.id),
                    depositCoin,
                ],
            });
            tx.setGasBudget(10_000_000);

            const res = await signAndExecute({ transaction: tx });
            const digest = (res as { digest?: string }).digest;
            if (!digest) throw new Error('No transaction digest');

            await client.waitForTransaction({ digest });
            setMessage(`Deposited ${depositAmount} SUI! 💰`);
            await fetchBankAccount();
        } catch (e: any) {
            console.error('[SuiBank] Deposit error:', e);
            setError(e.message || "Deposit failed");
        }
    };

    const handleWithdraw = async () => {
        if (!bankAccount) return;
        setSelectedTopic('withdraw');
        setError(null);

        const amountInMist = Math.floor(parseFloat(withdrawAmount) * 1_000_000_000);
        if (isNaN(amountInMist) || amountInMist <= 0) {
            setError("Invalid withdraw amount");
            return;
        }

        setMessage(`Withdrawing ${withdrawAmount} SUI...`);
        try {
            const tx = new Transaction();
            tx.moveCall({
                target: `${PACKAGE_ID}::sui_bank::withdraw`,
                arguments: [
                    tx.object(bankAccount.id),
                    tx.pure.u64(amountInMist),
                ],
            });
            tx.setGasBudget(10_000_000);

            const res = await signAndExecute({ transaction: tx });
            const digest = (res as { digest?: string }).digest;
            if (!digest) throw new Error('No transaction digest');

            await client.waitForTransaction({ digest });
            setMessage(`Withdrawn ${withdrawAmount} SUI! 💸`);
            await fetchBankAccount();
        } catch (e: any) {
            console.error('[SuiBank] Withdraw error:', e);
            setError(e.message || "Withdraw failed");
        }
    };

    // Format balance from MIST to SUI
    const formatBalance = (mist: string): string => {
        const value = parseInt(mist) || 0;
        return (value / 1_000_000_000).toFixed(4);
    };

    // Get emoji based on balance
    const getBalanceEmoji = () => {
        if (!bankAccount) return '🏦';
        const balance = parseInt(bankAccount.balance) || 0;
        if (balance === 0) return '📭';
        if (balance < 100_000_000) return '💵';
        if (balance < 1_000_000_000) return '💰';
        return '🤑';
    };

    return (
        <div className="page" style={{ height: 'calc(100vh - 60px)', position: 'relative' }}>
            {/* Back Button */}
            <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 100 }}>
                <a href="/" style={{ textDecoration: 'none', color: '#fff', fontWeight: 'bold' }}>← Back to Hub</a>
            </div>

            <div className="game-area">
                <header>
                    <div className="logo-area">
                        <img src="/sui-bank-logo.jpg" alt="Sui Bank Logo" style={{ height: '50px', borderRadius: '8px', marginRight: '1rem' }} />
                        <h1>Sui Bank</h1>
                    </div>
                    <div className="wallet-box">
                        <ConnectButton />
                    </div>
                </header>

                {error && <div className="error">{error}</div>}
                {message && <div className="info">{message}</div>}

                <div className="bank-container" style={{ textAlign: 'center', marginTop: '2rem' }}>
                    {/* Balance Display */}
                    <div className="balance-display" style={{
                        background: 'linear-gradient(135deg, rgba(77, 162, 255, 0.1), rgba(168, 85, 247, 0.1))',
                        border: '1px solid rgba(77, 162, 255, 0.3)',
                        borderRadius: '24px',
                        padding: '2rem 3rem',
                        marginBottom: '2rem',
                        display: 'inline-block'
                    }}>
                        <div style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>
                            {getBalanceEmoji()}
                        </div>
                        {bankAccount ? (
                            <>
                                <div style={{ fontSize: '3rem', fontWeight: '800', color: '#4da2ff' }}>
                                    {formatBalance(bankAccount.balance)} SUI
                                </div>
                                <div style={{ fontSize: '0.9rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                                    Account: {bankAccount.id.slice(0, 8)}...{bankAccount.id.slice(-6)}
                                </div>
                            </>
                        ) : (
                            <div style={{ fontSize: '1.5rem', color: '#94a3b8' }}>
                                No Account
                            </div>
                        )}
                    </div>

                    {!bankAccount ? (
                        <div className="no-account">
                            <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>
                                You don't have a bank account yet.
                            </p>
                            <button
                                className="primary-btn"
                                onClick={handleCreateAccount}
                                disabled={isPending || !account}
                                style={{ maxWidth: '300px', margin: '0 auto' }}
                            >
                                📂 Create Bank Account
                            </button>
                        </div>
                    ) : (
                        <div className="bank-controls" style={{ maxWidth: '500px', margin: '0 auto' }}>
                            {/* Deposit Section - Clickable */}
                            <div
                                onClick={() => setSelectedTopic('deposit')}
                                style={{
                                    background: selectedTopic === 'deposit'
                                        ? 'rgba(34, 197, 94, 0.2)'
                                        : 'rgba(34, 197, 94, 0.1)',
                                    border: selectedTopic === 'deposit'
                                        ? '2px solid rgba(34, 197, 94, 0.6)'
                                        : '1px solid rgba(34, 197, 94, 0.3)',
                                    borderRadius: '16px',
                                    padding: '1.5rem',
                                    marginBottom: '1rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    marginBottom: '1rem'
                                }}>
                                    <span style={{ fontWeight: '700', color: '#22c55e', flex: 1, textAlign: 'left' }}>
                                        💰 Deposit SUI
                                    </span>
                                    <span style={{
                                        fontSize: '0.75rem',
                                        color: '#94a3b8',
                                        opacity: selectedTopic === 'deposit' ? 1 : 0.5
                                    }}>
                                        ← Click to learn
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="number"
                                        value={depositAmount}
                                        onChange={(e) => setDepositAmount(e.target.value)}
                                        placeholder="Amount"
                                        step="0.01"
                                        min="0"
                                        style={{ flex: 1 }}
                                    />
                                    <button
                                        onClick={handleDeposit}
                                        disabled={isPending}
                                        className="start"
                                        style={{ width: 'auto', padding: '0.75rem 1.5rem' }}
                                    >
                                        Deposit
                                    </button>
                                </div>
                            </div>

                            {/* Withdraw Section - Clickable */}
                            <div
                                onClick={() => setSelectedTopic('withdraw')}
                                style={{
                                    background: selectedTopic === 'withdraw'
                                        ? 'rgba(239, 68, 68, 0.2)'
                                        : 'rgba(239, 68, 68, 0.1)',
                                    border: selectedTopic === 'withdraw'
                                        ? '2px solid rgba(239, 68, 68, 0.6)'
                                        : '1px solid rgba(239, 68, 68, 0.3)',
                                    borderRadius: '16px',
                                    padding: '1.5rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    marginBottom: '1rem'
                                }}>
                                    <span style={{ fontWeight: '700', color: '#ef4444', flex: 1, textAlign: 'left' }}>
                                        💸 Withdraw SUI
                                    </span>
                                    <span style={{
                                        fontSize: '0.75rem',
                                        color: '#94a3b8',
                                        opacity: selectedTopic === 'withdraw' ? 1 : 0.5
                                    }}>
                                        ← Click to learn
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="number"
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                        placeholder="Amount"
                                        step="0.01"
                                        min="0"
                                        style={{ flex: 1 }}
                                    />
                                    <button
                                        onClick={handleWithdraw}
                                        disabled={isPending}
                                        className="stop"
                                        style={{ width: 'auto', padding: '0.75rem 1.5rem' }}
                                    >
                                        Withdraw
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <TechnicalSidebar step={selectedTopic} steps={tutorialSteps} />
        </div>
    );
}

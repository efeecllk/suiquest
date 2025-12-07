import { useEffect, useState } from 'react';
import {
    ConnectButton,
    useCurrentAccount,
    useSignAndExecuteTransaction,
    useSuiClient,
} from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';

// Package ID - will need to be updated after deployment
const PACKAGE_ID = '0x4134ca8bda08bbed3785b83aa1412942c233a84b4fc4130a425e16a7e4b651d7';

// Shared objects - need to be created after deployment
// const GAME_POOL_ID = ''; // Create via create_pool()

type TutorialStep = 'intro' | 'random' | 'events' | 'stake' | 'security';

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
        title: '🎲 Welcome to Dice Game!',
        body: 'On-Chain Randomness & Gambling',
        details: `This game teaches you how to build **secure [randomness](https://docs.sui.io/guides/developer/advanced/randomness-onchain)** and **betting systems** in [Sui](https://docs.sui.io/).

**❓ Why is On-Chain Randomness Important?**

Traditional methods are NOT SECURE:
• ❌ Clock timestamp → [Validators](https://docs.sui.io/concepts/tokenomics/validators) can manipulate
• ❌ Object ID → Predictable in advance
• ❌ Frontend random → User can send fake values

**✅ Solution: [sui::random](https://docs.sui.io/guides/developer/advanced/randomness-onchain) module**
• Uses threshold cryptography
• Requires all validators to agree
• No single party can manipulate

📖 [Randomness Docs](https://docs.sui.io/guides/developer/advanced/randomness-onchain) | [Move Docs](https://move-book.com/)`,
        icon: '🎲',
    },
    {
        key: 'random',
        title: '🔮 sui::random Module',
        body: 'Secure Random Number Generation',
        details: `[Sui](https://docs.sui.io/) uses the \`[Random](https://docs.sui.io/guides/developer/advanced/randomness-onchain)\` [shared object](https://docs.sui.io/concepts/object-ownership/shared) for secure randomness.

**[Random Object](https://docs.sui.io/guides/developer/advanced/randomness-onchain) (0x8)**
• Fixed address: always in the same place
• [Shared object](https://docs.sui.io/concepts/object-ownership/shared) but cannot be modified
• Produced by the [validator](https://docs.sui.io/concepts/tokenomics/validators) network

**Creating RandomGenerator:**
\`\`\`move
let mut gen = random::new_generator(r, ctx);
\`\`\`
• \`r\` = [Random](https://docs.sui.io/guides/developer/advanced/randomness-onchain) shared object
• \`ctx\` = [Transaction context](https://docs.sui.io/concepts/transactions) (additional entropy)
• Different seed each call → different result

**Generating Random Numbers:**
\`\`\`move
let dice = random::generate_u8_in_range(&mut gen, 1, 6);
\`\`\`
• Random number from 1-6 (inclusive)
• Generator must be mutable!`,
        icon: '🔮',
        code: `entry fun play(
    pool: &mut GamePool,
    bet: Coin<SUI>,
    guess: u8,
    r: &Random,  // Shared object at address 0x8
    ctx: &mut TxContext
) {
    // Generator MUST be created inside the function!
    let mut generator = random::new_generator(r, ctx);
    
    // Roll dice: 1-6
    let rolled = random::generate_u8_in_range(
        &mut generator, 1, 6
    );
    
    // Win check
    let won = (guess == rolled);
}`
    },
    {
        key: 'events',
        title: '📡 Events',
        body: 'Blockchain → Frontend Communication',
        details: `[Events](https://docs.sui.io/concepts/events) are the way to send information from [smart contracts](https://docs.sui.io/concepts/sui-move-concepts) to the outside world.

**What is an [Event](https://docs.sui.io/concepts/events)?**
• Emitted within a [transaction](https://docs.sui.io/concepts/transactions)
• NOT STORED on blockchain (only logs)
• Indexers record events
• Frontend can listen via WebSocket

**Event [Struct](https://move-book.com/concepts/struct.html) Definition:**
• \`has copy\` = Can be copied (required for emit)
• \`has drop\` = Can be auto-cleaned

**Why Use [Events](https://docs.sui.io/concepts/events)?**
• For UI updates
• To broadcast game results
• For analytics and logging
• For light clients (instead of full state)

📖 [Events Docs](https://docs.sui.io/concepts/events)`,
        icon: '📡',
        code: `/// Event struct definition
public struct DiceRolled has copy, drop {
    player: address,
    guess: u8,
    rolled: u8,
    bet_amount: u64,
    won: bool,
    payout: u64,
}

// Emitting an event
event::emit(DiceRolled {
    player,
    guess,
    rolled,
    bet_amount,
    won,
    payout,
});`
    },
    {
        key: 'stake',
        title: '💰 Stake/Reward System',
        body: 'Betting and Reward Mechanics',
        details: `Betting systems heavily use [Coin](https://docs.sui.io/standards/coin) and [Balance](https://docs.sui.io/references/framework/sui/balance) conversions.

**Game Flow:**
1. Player bets with [Coin<SUI>](https://docs.sui.io/standards/coin)
2. Bet is converted to [Balance](https://docs.sui.io/references/framework/sui/balance) (into_balance)
3. Added to pool (join)
4. If won: Reward withdrawn from pool (split)
5. Reward converted to [Coin](https://docs.sui.io/standards/coin) (from_balance)
6. [Transferred](https://docs.sui.io/references/framework/sui/transfer) to player

**6x Reward Math:**
• Dice: 1/6 chance
• Fair reward: 6x bet
• Winners: 16.67%
• Losing bets stay in pool

**Pool Security:**
• [Balance](https://docs.sui.io/references/framework/sui/balance) check before payout
• Guaranteed with [assert!](https://move-book.com/concepts/abort-and-assert.html)
• [Atomic](https://docs.sui.io/concepts/transactions) execution (all or nothing)

📖 [Coin Standard](https://docs.sui.io/standards/coin) | [Balance Module](https://docs.sui.io/references/framework/sui/balance)`,
        icon: '💰',
        code: `// IF WON
if (won) {
    payout = bet_amount * 6;
    
    // Add bet to pool
    let bet_balance = coin::into_balance(bet);
    balance::join(&mut pool.balance, bet_balance);
    
    // Withdraw payout from pool
    let payout_balance = balance::split(
        &mut pool.balance, payout
    );
    let payout_coin = coin::from_balance(
        payout_balance, ctx
    );
    
    // Send to player
    transfer::public_transfer(payout_coin, player);
}`
    },
    {
        key: 'security',
        title: '🔐 Security Practices',
        body: 'Secure Random Usage',
        details: `Things to pay attention to when using on-chain [randomness](https://docs.sui.io/guides/developer/advanced/randomness-onchain):

**1. [Entry Function](https://move-book.com/concepts/entry-functions.html) Requirement**
Functions using [Random](https://docs.sui.io/guides/developer/advanced/randomness-onchain) must be \`entry\`!
• Enforces [PTB](https://docs.sui.io/concepts/transactions/prog-txn-blocks) restrictions
• Limits composability (for security)

**2. Function-Local Generator**
[RandomGenerator](https://docs.sui.io/guides/developer/advanced/randomness-onchain) should NEVER be passed as parameter!
• If from outside, contents can be read
• bcs::to_bytes() can reveal state
• Next values can be PREDICTED!

**3. Resource Control**
• "Unhappy path" should not consume more [gas](https://docs.sui.io/concepts/tokenomics/gas-pricing)
• Attacker can do gas manipulation
• [Balance](https://docs.sui.io/references/framework/sui/balance) check before payout is mandatory

**4. Input Validation**
• Early reject invalid inputs
• [Atomic](https://docs.sui.io/concepts/transactions) security with [assert!](https://move-book.com/concepts/abort-and-assert.html)
• Error codes should be meaningful

📖 [Security Best Practices](https://docs.sui.io/guides/developer/advanced/randomness-onchain)`,
        icon: '🔐',
        code: `// 🔐 SECURITY: Input validation
assert!(guess >= 1 && guess <= 6, EInvalidGuess);
assert!(bet_amount > 0, EZeroBet);

// Check payment guarantee FIRST
let potential_payout = bet_amount * 6;
assert!(
    balance::value(&pool.balance) >= potential_payout,
    EInsufficientPoolBalance
);

// Generator MUST be inside function!
let mut generator = random::new_generator(r, ctx);`
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
        // Split by code blocks first
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        const parts: (string | { type: 'code'; lang: string; content: string })[] = [];
        let lastIndex = 0;
        let match;

        while ((match = codeBlockRegex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                parts.push(text.slice(lastIndex, match.index));
            }
            parts.push({ type: 'code', lang: match[1] || 'move', content: match[2] });
            lastIndex = match.index + match[0].length;
        }
        if (lastIndex < text.length) {
            parts.push(text.slice(lastIndex));
        }

        return parts.map((part, i) => {
            if (typeof part === 'object' && part.type === 'code') {
                return (
                    <pre key={i} style={{
                        background: 'rgba(0,0,0,0.4)',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        overflow: 'auto',
                        fontSize: '0.8rem',
                        margin: '0.5rem 0'
                    }}>
                        <code>{part.content}</code>
                    </pre>
                );
            }

            // Handle inline formatting
            const inlineParts = (part as string).split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|`[^`]+`)/g);

            return inlineParts.map((inlinePart, j) => {
                const linkMatch = inlinePart.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
                if (linkMatch) {
                    return (
                        <a
                            key={`${i}-${j}`}
                            href={linkMatch[2]}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#4facfe', textDecoration: 'underline' }}
                        >
                            {linkMatch[1]}
                        </a>
                    );
                }

                const boldMatch = inlinePart.match(/^\*\*([^*]+)\*\*$/);
                if (boldMatch) {
                    return <strong key={`${i}-${j}`} style={{ color: '#fff' }}>{boldMatch[1]}</strong>;
                }

                const codeMatch = inlinePart.match(/^`([^`]+)`$/);
                if (codeMatch) {
                    return (
                        <code key={`${i}-${j}`} style={{
                            background: 'rgba(79, 172, 254, 0.2)',
                            padding: '0.1rem 0.3rem',
                            borderRadius: '4px',
                            fontSize: '0.85em',
                            color: '#4facfe'
                        }}>
                            {codeMatch[1]}
                        </code>
                    );
                }

                return inlinePart;
            });
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

export default function DiceGame() {
    const account = useCurrentAccount();
    const client = useSuiClient();
    const { mutateAsync: signAndExecute, isPending } = useSignAndExecuteTransaction();

    const STORAGE_KEY = 'dice-game-pool-id';

    const [poolId, setPoolId] = useState<string | null>(null);
    const [poolBalance, setPoolBalance] = useState<string>('0');
    const [selectedNumber, setSelectedNumber] = useState<number>(1);
    const [betAmount, setBetAmount] = useState<string>('0.1');
    const [fundAmount, setFundAmount] = useState<string>('1');
    const [selectedTopic, setSelectedTopic] = useState<TutorialStep>('intro');
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [lastResult, setLastResult] = useState<{ rolled: number; won: boolean; payout: string } | null>(null);
    const [isRolling, setIsRolling] = useState(false);
    const [displayDice, setDisplayDice] = useState<number>(1);

    // Load pool ID from localStorage on mount
    useEffect(() => {
        const savedPoolId = localStorage.getItem(STORAGE_KEY);
        if (savedPoolId) {
            setPoolId(savedPoolId);
        }
    }, []);

    // Fetch pool balance when poolId changes
    useEffect(() => {
        if (poolId) {
            fetchPoolBalance(poolId);
        }
    }, [poolId]);

    const fetchPoolBalance = async (id: string) => {
        try {
            const resp = await client.getObject({
                id,
                options: { showContent: true }
            });
            const fields = (resp.data?.content as any)?.fields;
            if (fields?.balance) {
                setPoolBalance(fields.balance);
            }
        } catch (e) {
            console.error('[DiceGame] Error fetching pool balance:', e);
        }
    };

    const handleCreatePool = async () => {
        if (!account) return;
        setError(null);
        setMessage('Creating game pool...');

        try {
            const tx = new Transaction();
            tx.moveCall({
                target: `${PACKAGE_ID}::dice_game::create_pool`,
                arguments: [],
            });
            tx.setGasBudget(10_000_000);

            const res = await signAndExecute({ transaction: tx });
            const digest = (res as { digest?: string }).digest;
            if (!digest) throw new Error('No transaction digest');

            const txResult = await client.waitForTransaction({
                digest,
                options: { showObjectChanges: true, showEffects: true }
            });

            console.log('[DiceGame] Full TX Result:', txResult);

            // Method 1: Check objectChanges for 'created' type
            const createdObjects = txResult.objectChanges?.filter(
                (change) => change.type === 'created'
            ) || [];

            console.log('[DiceGame] Created objects from objectChanges:', createdObjects);

            // Try to find GamePool in objectChanges
            let poolObjectId: string | null = null;

            for (const obj of createdObjects) {
                if ('objectType' in obj && 'objectId' in obj) {
                    console.log('[DiceGame] Object type:', obj.objectType);
                    if (obj.objectType.includes('GamePool') || obj.objectType.includes('dice_game')) {
                        poolObjectId = obj.objectId;
                        break;
                    }
                }
            }

            // Method 2: Fall back to effects.created if objectChanges didn't work
            if (!poolObjectId && txResult.effects?.created) {
                console.log('[DiceGame] Checking effects.created:', txResult.effects.created);
                for (const created of txResult.effects.created) {
                    if (created.reference?.objectId) {
                        poolObjectId = created.reference.objectId;
                        console.log('[DiceGame] Found ID from effects.created:', poolObjectId);
                        break;
                    }
                }
            }

            // Method 3: Try effects.sharedObjects (for shared objects)
            if (!poolObjectId && (txResult.effects as any)?.sharedObjects) {
                console.log('[DiceGame] Checking sharedObjects:', (txResult.effects as any).sharedObjects);
                const sharedObjs = (txResult.effects as any).sharedObjects;
                if (sharedObjs.length > 0) {
                    poolObjectId = sharedObjs[0].objectId;
                    console.log('[DiceGame] Found ID from sharedObjects:', poolObjectId);
                }
            }

            if (poolObjectId) {
                setPoolId(poolObjectId);
                localStorage.setItem(STORAGE_KEY, poolObjectId);
                setMessage(`Pool created! ID: ${poolObjectId.slice(0, 16)}...`);
                await fetchPoolBalance(poolObjectId);
            } else {
                // Show the digest so user can find it manually on Sui Explorer
                console.error('[DiceGame] Could not find pool. Full result:', JSON.stringify(txResult, null, 2));
                setMessage(`Pool created but ID not detected. Digest: ${digest}`);
                setError(`Check Sui Explorer for digest: ${digest.slice(0, 30)}... and paste Pool ID manually.`);
            }
        } catch (e: any) {
            console.error('[DiceGame] Create pool error:', e);
            setError(e.message || 'Failed to create pool');
        }
    };

    const handleFundPool = async () => {
        if (!account || !poolId) return;
        setError(null);
        setSelectedTopic('stake');

        const amountInMist = Math.floor(parseFloat(fundAmount) * 1_000_000_000);
        if (isNaN(amountInMist) || amountInMist <= 0) {
            setError('Invalid fund amount');
            return;
        }

        setMessage(`Funding pool with ${fundAmount} SUI...`);
        try {
            const tx = new Transaction();
            const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(amountInMist)]);
            tx.moveCall({
                target: `${PACKAGE_ID}::dice_game::fund_pool`,
                arguments: [tx.object(poolId), coin],
            });
            tx.setGasBudget(10_000_000);

            const res = await signAndExecute({ transaction: tx });
            const digest = (res as { digest?: string }).digest;
            if (!digest) throw new Error('No transaction digest');

            await client.waitForTransaction({ digest });
            setMessage('Pool funded! 💰');
            await fetchPoolBalance(poolId);
        } catch (e: any) {
            console.error('[DiceGame] Fund pool error:', e);
            setError(e.message || 'Failed to fund pool');
        }
    };

    const handleRollDice = async () => {
        if (!account || !poolId) {
            setError('Please connect wallet and ensure pool exists');
            return;
        }
        setSelectedTopic('random');
        setError(null);
        setLastResult(null);

        const amountInMist = Math.floor(parseFloat(betAmount) * 1_000_000_000);
        if (isNaN(amountInMist) || amountInMist <= 0) {
            setError('Invalid bet amount');
            return;
        }

        // Start rolling animation
        setIsRolling(true);
        const rollInterval = setInterval(() => {
            setDisplayDice(Math.floor(Math.random() * 6) + 1);
        }, 100);

        setMessage(`Rolling dice... 🎲 (Bet: ${betAmount} SUI on ${selectedNumber})`);

        try {
            const tx = new Transaction();
            const [betCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(amountInMist)]);

            tx.moveCall({
                target: `${PACKAGE_ID}::dice_game::play`,
                arguments: [
                    tx.object(poolId),
                    betCoin,
                    tx.pure.u8(selectedNumber),
                    tx.object('0x8'), // Random shared object
                ],
            });
            tx.setGasBudget(10_000_000);

            const res = await signAndExecute({ transaction: tx });
            const digest = (res as { digest?: string }).digest;
            if (!digest) throw new Error('No transaction digest');

            const txResult = await client.waitForTransaction({
                digest,
                options: { showEvents: true }
            });

            // Stop rolling animation
            clearInterval(rollInterval);
            setIsRolling(false);

            // Parse event
            const events = txResult.events || [];
            const diceEvent = events.find(e => e.type.includes('DiceRolled'));

            if (diceEvent && diceEvent.parsedJson) {
                const { rolled, won, payout } = diceEvent.parsedJson as any;
                setDisplayDice(rolled);
                setLastResult({
                    rolled,
                    won,
                    payout: (parseInt(payout) / 1_000_000_000).toFixed(4)
                });

                if (won) {
                    setMessage(`🎉 YOU WON! Rolled ${rolled}, Payout: ${(parseInt(payout) / 1_000_000_000).toFixed(4)} SUI`);
                    setSelectedTopic('events');
                } else {
                    setMessage(`😢 You lost. Rolled ${rolled}, your guess was ${selectedNumber}`);
                }
            } else {
                setMessage('Dice rolled! Check transaction for results.');
            }

            // Refresh pool balance
            await fetchPoolBalance(poolId);
        } catch (e: any) {
            clearInterval(rollInterval);
            setIsRolling(false);
            console.error('[DiceGame] Roll error:', e);
            setError(e.message || 'Failed to roll dice');
        }
    };

    const handleClearPool = () => {
        localStorage.removeItem(STORAGE_KEY);
        setPoolId(null);
        setPoolBalance('0');
        setMessage('Pool ID cleared. You can create a new pool or enter an existing one.');
    };

    const handleSetPoolId = (id: string) => {
        const trimmedId = id.trim();
        if (trimmedId) {
            setPoolId(trimmedId);
            localStorage.setItem(STORAGE_KEY, trimmedId);
            fetchPoolBalance(trimmedId);
        }
    };

    // Dice face SVG component
    const DiceFace = ({ value, size = 120 }: { value: number; size?: number }) => {
        const dotPositions: { [key: number]: [number, number][] } = {
            1: [[50, 50]],
            2: [[25, 25], [75, 75]],
            3: [[25, 25], [50, 50], [75, 75]],
            4: [[25, 25], [75, 25], [25, 75], [75, 75]],
            5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
            6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
        };

        const dots = dotPositions[value] || [];

        return (
            <svg width={size} height={size} viewBox="0 0 100 100" style={{
                filter: isRolling ? 'blur(2px)' : 'none',
                transform: isRolling ? `rotate(${Math.random() * 30 - 15}deg)` : 'none',
                transition: isRolling ? 'none' : 'all 0.3s ease'
            }}>
                <rect x="5" y="5" width="90" height="90" rx="15" ry="15"
                    fill="linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)"
                    stroke={lastResult?.won ? '#22c55e' : lastResult ? '#ef4444' : '#4facfe'}
                    strokeWidth="3"
                />
                {dots.map(([cx, cy], i) => (
                    <circle
                        key={i}
                        cx={cx}
                        cy={cy}
                        r="10"
                        fill="#fff"
                    />
                ))}
            </svg>
        );
    };

    const formatBalance = (mist: string): string => {
        const value = parseInt(mist) || 0;
        return (value / 1_000_000_000).toFixed(4);
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
                        <span style={{ fontSize: '2.5rem', marginRight: '0.5rem' }}>🎲</span>
                        <h1>Dice Game</h1>
                    </div>
                    <div className="wallet-box">
                        <ConnectButton />
                    </div>
                </header>

                {error && <div className="error">{error}</div>}
                {message && <div className="info">{message}</div>}

                <div className="dice-container" style={{ textAlign: 'center', marginTop: '1rem' }}>
                    {/* Dice Display */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        marginBottom: '2rem'
                    }}>
                        <div style={{
                            padding: '2rem',
                            background: 'linear-gradient(135deg, rgba(77, 162, 255, 0.1), rgba(168, 85, 247, 0.1))',
                            borderRadius: '24px',
                            border: lastResult
                                ? `2px solid ${lastResult.won ? '#22c55e' : '#ef4444'}`
                                : '1px solid rgba(77, 162, 255, 0.3)',
                        }}>
                            <DiceFace value={displayDice} size={140} />
                            {lastResult && (
                                <div style={{
                                    marginTop: '1rem',
                                    fontSize: '1.5rem',
                                    fontWeight: '800',
                                    color: lastResult.won ? '#22c55e' : '#ef4444'
                                }}>
                                    {lastResult.won ? `🎉 WON ${lastResult.payout} SUI!` : '😢 Better luck next time!'}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Number Selector */}
                    <div
                        onClick={() => setSelectedTopic('random')}
                        style={{
                            background: 'rgba(79, 172, 254, 0.1)',
                            border: selectedTopic === 'random'
                                ? '2px solid rgba(79, 172, 254, 0.6)'
                                : '1px solid rgba(79, 172, 254, 0.3)',
                            borderRadius: '16px',
                            padding: '1.5rem',
                            marginBottom: '1rem',
                            cursor: 'pointer',
                            maxWidth: '500px',
                            margin: '0 auto 1rem'
                        }}
                    >
                        <div style={{
                            marginBottom: '1rem',
                            fontWeight: '700',
                            color: '#4facfe',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <span>🎯 Choose Your Number (1-6)</span>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>← Click to learn</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            {[1, 2, 3, 4, 5, 6].map((num) => (
                                <button
                                    key={num}
                                    onClick={(e) => { e.stopPropagation(); setSelectedNumber(num); }}
                                    style={{
                                        width: '60px',
                                        height: '60px',
                                        borderRadius: '12px',
                                        border: selectedNumber === num
                                            ? '3px solid #4facfe'
                                            : '2px solid rgba(255,255,255,0.2)',
                                        background: selectedNumber === num
                                            ? 'linear-gradient(135deg, #4facfe, #a855f7)'
                                            : 'rgba(255,255,255,0.05)',
                                        color: '#fff',
                                        fontSize: '1.5rem',
                                        fontWeight: '800',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        transform: selectedNumber === num ? 'scale(1.1)' : 'scale(1)'
                                    }}
                                >
                                    {num}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Bet Amount */}
                    <div
                        onClick={() => setSelectedTopic('stake')}
                        style={{
                            background: 'rgba(168, 85, 247, 0.1)',
                            border: selectedTopic === 'stake'
                                ? '2px solid rgba(168, 85, 247, 0.6)'
                                : '1px solid rgba(168, 85, 247, 0.3)',
                            borderRadius: '16px',
                            padding: '1.5rem',
                            marginBottom: '1rem',
                            cursor: 'pointer',
                            maxWidth: '500px',
                            margin: '0 auto 1rem'
                        }}
                    >
                        <div style={{
                            marginBottom: '1rem',
                            fontWeight: '700',
                            color: '#a855f7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <span>💰 Bet Amount (SUI)</span>
                            <span style={{ fontSize: '0.85rem', color: '#22c55e', fontWeight: '600' }}>Win = 6x payout!</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                            <input
                                type="number"
                                value={betAmount}
                                onChange={(e) => setBetAmount(e.target.value)}
                                placeholder="0.1"
                                step="0.01"
                                min="0"
                                style={{
                                    minWidth: '180px',
                                    width: '180px',
                                    background: 'rgba(15, 23, 42, 0.8)',
                                    border: '2px solid rgba(168, 85, 247, 0.4)',
                                    borderRadius: '12px',
                                    padding: '1rem 1.5rem',
                                    color: '#ffffff',
                                    fontSize: '1.5rem',
                                    fontWeight: '700',
                                    textAlign: 'center'
                                }}
                            />
                            <span style={{ color: '#94a3b8', fontWeight: '600', fontSize: '1.1rem' }}>SUI</span>
                            <button
                                onClick={handleRollDice}
                                disabled={isPending || isRolling || !poolId}
                                className="primary-btn"
                                style={{
                                    background: poolId
                                        ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                                        : 'rgba(100, 116, 139, 0.3)',
                                    padding: '1rem 2rem',
                                    fontSize: '1.1rem',
                                    fontWeight: '700',
                                    border: 'none',
                                    borderRadius: '12px',
                                    color: '#fff',
                                    cursor: poolId ? 'pointer' : 'not-allowed',
                                    opacity: !poolId ? 0.5 : 1
                                }}
                            >
                                {isRolling ? '🎲 Rolling...' : '🎲 ROLL DICE!'}
                            </button>
                        </div>
                    </div>

                    {/* Pool Info / Setup */}
                    <div
                        onClick={() => setSelectedTopic('security')}
                        style={{
                            background: poolId ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            border: `1px solid ${poolId ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                            borderRadius: '16px',
                            padding: '1.5rem',
                            maxWidth: '500px',
                            margin: '0 auto',
                            cursor: 'pointer'
                        }}
                    >
                        <div style={{
                            marginBottom: '1rem',
                            fontWeight: '700',
                            color: poolId ? '#22c55e' : '#ef4444',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <span>{poolId ? '🏦 Pool Active' : '⚠️ Pool Not Set'}</span>
                            {poolId && (
                                <span style={{ fontSize: '1.25rem', fontWeight: '800' }}>
                                    {formatBalance(poolBalance)} SUI
                                </span>
                            )}
                        </div>

                        {/* Pool ID Input */}
                        <div style={{ marginBottom: '1rem' }} onClick={(e) => e.stopPropagation()}>
                            <label style={{ color: '#94a3b8', fontSize: '0.85rem', display: 'block', marginBottom: '0.5rem' }}>
                                Pool Object ID
                            </label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input
                                    type="text"
                                    value={poolId || ''}
                                    onChange={(e) => handleSetPoolId(e.target.value)}
                                    placeholder="0x... (enter pool ID or create new)"
                                    style={{ flex: 1, fontSize: '0.85rem' }}
                                />
                                {poolId && (
                                    <button
                                        onClick={handleClearPool}
                                        style={{
                                            background: 'rgba(239, 68, 68, 0.2)',
                                            border: '1px solid rgba(239, 68, 68, 0.5)',
                                            borderRadius: '8px',
                                            padding: '0.5rem 0.75rem',
                                            color: '#ef4444',
                                            cursor: 'pointer',
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Create or Fund buttons */}
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
                            {!poolId ? (
                                <button
                                    onClick={handleCreatePool}
                                    disabled={isPending || !account}
                                    className="primary-btn"
                                    style={{ flex: 1 }}
                                >
                                    📦 Create New Pool
                                </button>
                            ) : (
                                <>
                                    <input
                                        type="number"
                                        value={fundAmount}
                                        onChange={(e) => setFundAmount(e.target.value)}
                                        placeholder="Amount"
                                        step="0.1"
                                        min="0"
                                        style={{ width: '100px' }}
                                    />
                                    <button
                                        onClick={handleFundPool}
                                        disabled={isPending}
                                        style={{
                                            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                            border: 'none',
                                            borderRadius: '8px',
                                            padding: '0.5rem 1rem',
                                            color: '#fff',
                                            cursor: 'pointer',
                                            fontWeight: '600'
                                        }}
                                    >
                                        + Fund Pool
                                    </button>
                                </>
                            )}
                        </div>

                        {!poolId && (
                            <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '1rem', textAlign: 'center' }}>
                                Create a new pool or paste an existing pool ID above
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <TechnicalSidebar step={selectedTopic} steps={tutorialSteps} />
        </div>
    );
}

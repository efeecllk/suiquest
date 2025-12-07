import { useEffect, useMemo, useState } from 'react';
import {
    ConnectButton,
    useCurrentAccount,
    useSignAndExecuteTransaction,
    useSuiClient,
} from '@mysten/dapp-kit';
import type { SuiObjectChangeCreated, SuiTransactionBlockResponse } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { SUI_CLOCK_OBJECT_ID } from '@mysten/sui/utils';
import { PACKAGE_ID, TARGET_MS } from '../config';

type GameState = {
    bestDiffMs: number | null;
    activeStartMs: number | null;
};

type BoardEntry = {
    player: string;
    bestDiffMs: number;
    name?: string;
};

const formatAddress = (addr?: string | null) => {
    if (!addr) return '—';
    const value = String(addr);
    if (value.length <= 10) return value;
    return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

const parseU64 = (raw: any): number | null => {
    if (raw === null || raw === undefined) return null;
    try {
        const asBig = BigInt(raw);
        if (asBig > BigInt(Number.MAX_SAFE_INTEGER)) return null;
        return Number(asBig);
    } catch {
        return null;
    }
};
const STORAGE_KEYS = {
    leaderboard: 'ten-second-leaderboard-id',
    game: 'ten-second-game-id',
};

const parseOption = (opt: any): number | null => {
    if (!opt) return null;
    if (typeof opt === 'object') {
        if ('some' in opt) return Number((opt as any).some);
        if ('Some' in opt) return Number((opt as any).Some);
        if ('none' in opt || 'None' in opt) return null;
    }
    if (typeof opt === 'string') return Number(opt);
    return null;
};

const safeDecodeName = (bytes: number[]): string => {
    try {
        return new TextDecoder().decode(Uint8Array.from(bytes));
    } catch {
        return 'player';
    }
};

type TutorialStep = 'leaderboard' | 'game' | 'start' | 'stop' | 'done';

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
        key: 'leaderboard',
        title: '📋 Shared Object',
        body: 'Global Data Accessible by Everyone',
        details: `In [Sui Move](https://docs.sui.io/concepts/sui-move-concepts), [objects](https://docs.sui.io/concepts/object-model) can be "[owned](https://docs.sui.io/concepts/object-ownership/address-owned)" or "[shared](https://docs.sui.io/concepts/object-ownership/shared)".

**🔷 What is a [Shared Object](https://docs.sui.io/concepts/object-ownership/shared)?**
An [object](https://docs.sui.io/concepts/object-model) with NO owner. Anyone can read and write.

**Why is Leaderboard shared?**
• If it belonged to you, only YOU could update it
• By making it [shared](https://docs.sui.io/concepts/object-ownership/shared), ALL players can add their scores

**Technical flow:**
1. \`create_leaderboard()\` → Creates new Leaderboard [struct](https://move-book.com/concepts/struct.html)
2. \`[transfer::share_object](https://docs.sui.io/references/framework/sui/transfer)\` → Opens object to EVERYONE
3. Now anyone can access it with this ID

⚠️ [Shared object](https://docs.sui.io/concepts/object-ownership/shared) operations are a bit slower (requires [consensus](https://docs.sui.io/concepts/consensus))

📖 [Shared Objects](https://docs.sui.io/concepts/object-ownership/shared) | [Object Model](https://docs.sui.io/concepts/object-model)`,
        icon: '📋',
        code: `public fun create_leaderboard(ctx: &mut TxContext) {
    let board = Leaderboard { 
        id: object::new(ctx), 
        entries: vector[]  // Empty score list
    };
    // Open to everyone - belongs to no one now!
    transfer::share_object(board);
}`,
    },
    {
        key: 'game',
        title: '🎮 Owned Object',
        body: 'Data Only Owner Can Access',
        details: `[Owned Objects](https://docs.sui.io/concepts/object-ownership/address-owned) are [Sui](https://docs.sui.io/)'s default mode.

**🔶 What is an [Owned Object](https://docs.sui.io/concepts/object-ownership/address-owned)?**
An [object](https://docs.sui.io/concepts/object-model) BELONGING to a specific wallet address. Only [owner](https://docs.sui.io/concepts/object-ownership) can modify.

**Why is Game owned?**
• SECURITY: Only YOU can change your own game state
• PERFORMANCE: [Owned object](https://docs.sui.io/concepts/object-ownership/address-owned) operations are very fast (run in [parallel](https://docs.sui.io/concepts/consensus))

**[Parallel processing](https://docs.sui.io/concepts/consensus) advantage:**
While transacting with your Game [object](https://docs.sui.io/concepts/object-model), you DON'T WAIT for others' [transactions](https://docs.sui.io/concepts/transactions). This is what makes [Sui](https://docs.sui.io/) so fast!

When \`create_game\` is called, Game object is sent to \`[tx_context::sender](https://docs.sui.io/references/framework/sui/tx_context)\` address - meaning YOU.

📖 [Owned Objects](https://docs.sui.io/concepts/object-ownership/address-owned) | [Transactions](https://docs.sui.io/concepts/transactions)`,
        icon: '🎮',
        code: `public fun create_game(ctx: &mut TxContext) {
    let game = Game { 
        id: object::new(ctx), 
        best_diff_ms: MAX_U64,      // No score yet
        active_start_ms: option::none()  // Timer off
    };
    // Send to you - now it's yours!
    transfer::transfer(game, tx_context::sender(ctx));
}`,
    },
    {
        key: 'start',
        title: '⏱️ Clock Object - Blockchain Time',
        body: 'Trusted Time Source',
        details: `Blockchains run asynchronously - we DON'T TRUST user-sent time. So where do we get reliable time?

**⏰ [Clock Object](https://docs.sui.io/guide/developer/sui-101/access-time) (0x6)**
[Sui](https://docs.sui.io/) network's official clock [object](https://docs.sui.io/concepts/object-model). Fixed address: \`0x6\`

**When Start button is clicked:**
1. [Transaction](https://docs.sui.io/concepts/transactions) is sent
2. Current time is read from \`[Clock](https://docs.sui.io/guide/developer/sui-101/access-time)\` object
3. This time is saved to Game object

**Why don't we take user's time?**
• User could send fake time (cheating!)
• [Clock](https://docs.sui.io/guide/developer/sui-101/access-time) is validated by [validators](https://docs.sui.io/concepts/tokenomics/validators)
• Trusted and cannot be manipulated

📖 [Time Access](https://docs.sui.io/guide/developer/sui-101/access-time) | [Clock Module](https://docs.sui.io/references/framework/sui/clock)`,
        icon: '⏱️',
        code: `public fun start(game: &mut Game, clock: &Clock) {
    // Check if timer is already running
    assert!(option::is_none(&game.active_start_ms), 1);
    
    // Get TRUSTED time from Clock and save
    game.active_start_ms = option::some(
        clock::timestamp_ms(clock)
    );
}`,
    },
    {
        key: 'stop',
        title: '🏁 Stop - Score Calculation',
        body: 'Shared + Owned + Clock = Composability',
        details: `The \`stop\` function uses **3 different [objects](https://docs.sui.io/concepts/object-model) at once**:

**1. Game ([owned](https://docs.sui.io/concepts/object-ownership/address-owned), &mut)**
→ Your game, to stop timer and update your score

**2. Leaderboard ([shared](https://docs.sui.io/concepts/object-ownership/shared), &mut)**
→ Global ranking, to add your new score

**3. [Clock](https://docs.sui.io/guide/developer/sui-101/access-time) (shared, read-only)**
→ To get current time

**Why is this important?**
You can combine [objects](https://docs.sui.io/concepts/object-model) with different [ownership types](https://docs.sui.io/concepts/object-ownership) in ONE [TRANSACTION](https://docs.sui.io/concepts/transactions). This is called "[composability](https://docs.sui.io/concepts/transactions/prog-txn-blocks)".

**How is score calculated?**
\`diff = |elapsed_time - 10000ms|\`
The closer to 10 seconds, the better!

📖 [PTB](https://docs.sui.io/concepts/transactions/prog-txn-blocks) | [Object Ownership](https://docs.sui.io/concepts/object-ownership)`,
        icon: '🏁',
        code: `public fun stop(
    game: &mut Game,          // Yours
    board: &mut Leaderboard,  // Everyone's
    clock: &Clock             // System clock
) {
    let start = option::extract(&mut game.active_start_ms);
    let now = clock::timestamp_ms(clock);
    let diff = abs_diff(now - start, TARGET_MS);
    
    // Update personal best
    if (diff < game.best_diff_ms) { 
        game.best_diff_ms = diff; 
    };
    
    // Add to global leaderboard
    update_leaderboard(board, diff, ...);
}`,
    },
    {
        key: 'done',
        title: '🎉 Congratulations - You Learned Move!',
        body: 'Key Concepts Summary',
        details: `In this game you learned the fundamental building blocks of [Sui Move](https://docs.sui.io/concepts/sui-move-concepts):

**📦 [Object Types](https://docs.sui.io/concepts/object-ownership):**
• **[Shared Objects](https://docs.sui.io/concepts/object-ownership/shared)** → Global state (Leaderboard)
• **[Owned Objects](https://docs.sui.io/concepts/object-ownership/address-owned)** → Personal state (Game)
• **System Objects** → [Clock](https://docs.sui.io/guide/developer/sui-101/access-time) (0x6)

**🔗 [PTB - Programmable Transaction Blocks](https://docs.sui.io/concepts/transactions/prog-txn-blocks):**
You were able to combine these functions in [a single transaction](https://docs.sui.io/concepts/transactions/prog-txn-blocks).

**⚡ Why is [Sui](https://docs.sui.io/) fast?**
[Owned objects](https://docs.sui.io/concepts/object-ownership/address-owned) can be processed in [PARALLEL](https://docs.sui.io/concepts/consensus). Your Game doesn't wait for someone else's transaction.

Thanks to this model, games, financial apps, and social platforms can run without being affected by network congestion!

📖 [Sui Docs](https://docs.sui.io/) | [Move Book](https://move-book.com/)`,
        icon: '🎉',
    },
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

    const renderTextWithLinks = (text: string) => {
        const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);

        return parts.map((part, i) => {
            const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
            if (match) {
                return (
                    <a
                        key={i}
                        href={match[2]}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#4facfe', textDecoration: 'underline' }}
                    >
                        {match[1]}
                    </a>
                );
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
                            <p key={idx}>{renderTextWithLinks(paragraph)}</p>
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
                        <pre>
                            <code>{currentStep.code}</code>
                        </pre>
                    </div>
                )}
            </div>
        </aside>
    );
};

export default function TenSecondChallenge() {
    const account = useCurrentAccount();
    const connectedAddress = account?.address ?? '';
    const client = useSuiClient();
    const { mutateAsync: signAndExecute, isPending } = useSignAndExecuteTransaction();

    const [leaderboardId, setLeaderboardId] = useState('');
    const [gameId, setGameId] = useState('');
    const [game, setGame] = useState<GameState | null>(null);
    const [entries, setEntries] = useState<BoardEntry[]>([]);
    const [lastDiff, setLastDiff] = useState<number | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [nickname, setNickname] = useState<string>('');
    const [selectedTopic, setSelectedTopic] = useState<TutorialStep>('leaderboard');

    const sortedEntries = useMemo(
        () =>
            entries
                .filter((e) => Number.isFinite(e.bestDiffMs))
                .slice()
                .sort((a, b) => a.bestDiffMs - b.bestDiffMs)
                .slice(0, 10),
        [entries],
    );

    useEffect(() => {
        if (gameId) {
            refreshGame(gameId);
        }
        if (gameId) {
            localStorage.setItem(STORAGE_KEYS.game, gameId);
        }
    }, [gameId]);

    useEffect(() => {
        if (leaderboardId) {
            refreshLeaderboard(leaderboardId);
            try {
                localStorage.setItem(STORAGE_KEYS.leaderboard, leaderboardId);
            } catch (err) {
                console.warn('localStorage set leaderboard failed', err);
            }
        }
    }, [leaderboardId]);

    useEffect(() => {
        const savedGame = localStorage.getItem(STORAGE_KEYS.game);
        const savedBoard = localStorage.getItem(STORAGE_KEYS.leaderboard);
        if (savedBoard && !leaderboardId) setLeaderboardId(savedBoard);
        if (savedGame && !gameId) setGameId(savedGame);
    }, []);

    const refreshGame = async (id: string) => {
        try {
            const resp = await client.getObject({ id, options: { showContent: true } });
            const fields = (resp.data?.content as any)?.fields;
            if (!fields) return;

            const bestNumber = parseU64(fields.best_diff_ms);

            setGame({
                bestDiffMs: bestNumber,
                activeStartMs: parseOption(fields.active_start_ms),
            });
        } catch (e) {
            console.error(e);
            setError('Unable to read game object.');
        }
    };

    const refreshLeaderboard = async (id: string) => {
        try {
            const resp = await client.getObject({ id, options: { showContent: true } });
            const fields = (resp.data?.content as any)?.fields;
            if (!fields) return;

            const parsedEntries =
                (fields.entries as any[] | undefined)
                    ?.map((entry) => {
                        const e = (entry as any).fields ?? entry;
                        const best = parseU64(e.best_diff_ms);
                        const player = e.player as string | undefined;
                        if (!player || best === null || !Number.isFinite(best)) return null;
                        const rawName: any = e.name;
                        const decodedName =
                            Array.isArray(rawName) && rawName.length
                                ? safeDecodeName(rawName as number[])
                                : undefined;
                        return { player, bestDiffMs: best, name: decodedName };
                    })
                    .filter(Boolean) as BoardEntry[] ?? [];

            setEntries(parsedEntries);
        } catch (e) {
            console.error(e);
            setError('Unable to read leaderboard.');
        }
    };

    const requirePackage = () => {
        if (!PACKAGE_ID) {
            setError('Set VITE_PACKAGE_ID in .env.local to your published package ID.');
            return false;
        }
        return true;
    };

    const extractError = (e: unknown) => {
        if (typeof e === 'string') return e;
        if (e && typeof e === 'object') {
            const maybe = (e as any).message ?? (e as any).toString?.();
            if (maybe) return String(maybe);
        }
        return 'Unknown error';
    };

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const runTransaction = async (tx: Transaction): Promise<SuiTransactionBlockResponse> => {
        const res = await signAndExecute({
            transaction: tx,
        });
        const digest = (res as { digest?: string }).digest;
        if (!digest) throw new Error('No transaction digest returned from wallet.');

        const fetchDetails = () =>
            client.waitForTransaction({
                digest,
                options: { showEvents: true, showObjectChanges: true, showEffects: true },
                pollInterval: 1200,
            });

        let lastErr: unknown = null;
        for (let i = 0; i < 3; i += 1) {
            try {
                return await fetchDetails();
            } catch (err) {
                lastErr = err;
                await sleep(800);
            }
        }
        throw lastErr ?? new Error('Failed to fetch transaction details.');
    };

    const handleCreateLeaderboard = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!requirePackage() || !account) return;
        setError(null);
        setMessage(null);

        try {
            const tx = new Transaction();
            tx.moveCall({ target: `${PACKAGE_ID}::game::create_leaderboard` });
            tx.setGasBudget(20_000_000);

            const details = await runTransaction(tx);
            const created = details.objectChanges?.find(
                (change): change is SuiObjectChangeCreated =>
                    change.type === 'created' &&
                    'objectType' in change &&
                    change.objectType.includes('game::Leaderboard'),
            );

            if (!created?.objectId) {
                throw new Error('Leaderboard not created. Check gas and package ID.');
            }
            setLeaderboardId(created.objectId);
            setMessage(`Leaderboard created: ${created.objectId}`);
            await refreshLeaderboard(created.objectId);
        } catch (e) {
            console.error(e);
            setError('Failed to create leaderboard.');
        }
    };

    const handleCreateGame = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!requirePackage() || !account) return;
        setError(null);
        setMessage(null);

        try {
            const tx = new Transaction();
            tx.moveCall({ target: `${PACKAGE_ID}::game::create_game` });
            tx.setGasBudget(20_000_000);

            const details = await runTransaction(tx);
            const created = details.objectChanges?.find(
                (change): change is SuiObjectChangeCreated =>
                    change.type === 'created' && 'objectType' in change && change.objectType.includes('game::Game'),
            );

            if (!created?.objectId) {
                throw new Error('Game object not created. Check gas and package ID.');
            }
            setGameId(created.objectId);
            setMessage(`Game created: ${created.objectId}`);
            await refreshGame(created.objectId);
        } catch (e) {
            console.error(e);
            setError(`Failed to create game: ${extractError(e)}`);
        }
    };

    const handleStart = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedTopic('start');
        if (!requirePackage() || !account || !gameId) {
            setError('Connect a wallet and set your Game object ID first.');
            return;
        }
        setError(null);
        setMessage(null);

        try {
            const tx = new Transaction();
            tx.moveCall({
                target: `${PACKAGE_ID}::game::start`,
                arguments: [tx.object(gameId), tx.object(SUI_CLOCK_OBJECT_ID)],
            });
            tx.setGasBudget(10_000_000);

            await runTransaction(tx);
            setMessage('Timer started on-chain.');
            await refreshGame(gameId);
        } catch (e) {
            console.error(e);
            setError(`Start failed: ${extractError(e)}`);
        }
    };

    const handleStop = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedTopic('stop');
        if (!requirePackage() || !account || !gameId || !leaderboardId) {
            setError('Set Game and Leaderboard IDs, then connect a wallet.');
            return;
        }
        setError(null);
        setMessage(null);

        try {
            const tx = new Transaction();
            tx.moveCall({
                target: `${PACKAGE_ID}::game::stop`,
                arguments: [
                    tx.object(gameId),
                    tx.object(leaderboardId),
                    tx.object(SUI_CLOCK_OBJECT_ID),
                    tx.pure.string(nickname || connectedAddress || 'player'),
                ],
            });
            tx.setGasBudget(20_000_000);

            const details = await runTransaction(tx);
            const stopped = details.events?.find((evt) => evt.type === `${PACKAGE_ID}::game::StoppedEvent`);
            const diffFromEvent =
                stopped && 'parsedJson' in stopped ? parseU64((stopped.parsedJson as any)?.diff_ms) : null;
            if (Number.isFinite(diffFromEvent)) setLastDiff(diffFromEvent as number);
            setMessage('Stopped! Stats refreshed.');
            await Promise.all([refreshGame(gameId), refreshLeaderboard(leaderboardId)]);
        } catch (e) {
            console.error(e);
            setError(`Stop failed: ${extractError(e)}`);
        }
    };

    const bestDiffDisplay =
        game && Number.isFinite(game.bestDiffMs) && game.bestDiffMs !== null ? `${game.bestDiffMs} ms` : 'No score yet';

    return (
        <div className="page" style={{ height: 'calc(100vh - 60px)', position: 'relative' }}>
            {/* Back Button */}
            <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 100 }}>
                <a href="/" style={{ textDecoration: 'none', color: '#fff', fontWeight: 'bold' }}>← Back to Hub</a>
            </div>
            {/* Left Panel: Game Dashboard */}
            <div className="game-area">
                <header>
                    <div className="logo-area">
                        <img src="/logo.png" alt="10SC Challenge" className="game-logo" />
                    </div>
                    <div className="wallet-box">
                        <ConnectButton />
                    </div>
                </header>

                {error && <div className="error">{error}</div>}
                {message && <div className="info">{message}</div>}

                {/* Setup Section */}
                <div
                    className={`card card-leaderboard ${selectedTopic === 'leaderboard' ? 'active-topic' : ''}`}
                    onClick={() => setSelectedTopic('leaderboard')}
                >
                    <div className="card-header">
                        <h2>1. Global Leaderboard</h2>
                        <span className="badge">Shared Object</span>
                    </div>
                    <div className="field">
                        <label>Leaderboard Object ID</label>
                        <input
                            value={leaderboardId}
                            onChange={(e) => setLeaderboardId(e.target.value.trim())}
                            placeholder="0x... (Shared Object ID)"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    <button onClick={handleCreateLeaderboard} disabled={!account || isPending}>
                        Create New Leaderboard
                    </button>

                    {/* Simplified Leaderboard View */}
                    <div className="table">
                        <div className="table-header">
                            <span>Rank</span>
                            <span>Name</span>
                            <span>Diff</span>
                        </div>
                        {sortedEntries.length === 0 ? (
                            <div className="table-row" style={{ justifyContent: 'center', opacity: 0.5 }}>No records yet</div>
                        ) : (
                            sortedEntries.map((entry, i) => (
                                <div className="table-row" key={i}>
                                    <span>#{i + 1}</span>
                                    <span>{entry.name || formatAddress(entry.player)}</span>
                                    <span>{entry.bestDiffMs}ms</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Game Object Section */}
                <div
                    className={`card card-game ${selectedTopic === 'game' ? 'active-topic' : ''}`}
                    onClick={() => setSelectedTopic('game')}
                >
                    <div className="card-header">
                        <h2>2. Your Game Object</h2>
                        <span className="badge">Owned Object</span>
                    </div>
                    <div className="field">
                        <label>Game Object ID</label>
                        <input
                            value={gameId}
                            onChange={(e) => setGameId(e.target.value.trim())}
                            placeholder="0x... (Owned Object ID)"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    <button onClick={handleCreateGame} disabled={!account || isPending}>
                        Initialize New Game
                    </button>
                </div>

                {/* Game Play Section */}
                <div
                    className={`card card-play ${selectedTopic === 'start' || selectedTopic === 'stop' ? 'active-topic' : ''}`}
                    onClick={() => setSelectedTopic('start')}
                >
                    <div className="card-header">
                        <h2>3. Play Area</h2>
                        <span className="badge">Target: {TARGET_MS}ms</span>
                    </div>

                    <div className="field">
                        <label>Nickname</label>
                        <input
                            value={nickname}
                            placeholder="Enter name..."
                            onChange={e => setNickname(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>

                    {/* Prominent Status Indicator */}
                    <div className="game-status-container">
                        {game?.activeStartMs ? (
                            <div className="status-badge active">
                                <span className="pulse-dot"></span>
                                TIMER ACTIVE
                            </div>
                        ) : (
                            <div className="status-badge idle">
                                READY TO START
                            </div>
                        )}
                    </div>

                    <div className="stats">
                        <div className="stat-box">
                            <p className="label">Your Best</p>
                            <p className="value highlight">{bestDiffDisplay}</p>
                        </div>
                        <div className="stat-box">
                            <p className="label">Last Attempt</p>
                            <p className="value">{lastDiff !== null ? `${lastDiff} ms` : '—'}</p>
                        </div>
                    </div>

                    <div className="row-actions" style={{ marginTop: '1.5rem' }}>
                        <button
                            className="start"
                            disabled={!gameId || isPending || !!game?.activeStartMs}
                            onClick={handleStart}
                        >
                            {game?.activeStartMs ? 'Timer Running...' : 'Start Timer'}
                        </button>
                        <button
                            className="stop"
                            disabled={!gameId || isPending || !game?.activeStartMs}
                            onClick={handleStop}
                        >
                            Stop & Submit
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Panel: Technical Sidebar */}
            <TechnicalSidebar step={selectedTopic} steps={tutorialSteps} />
        </div>
    );
}

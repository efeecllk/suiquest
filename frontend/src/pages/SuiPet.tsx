import { useEffect, useState } from 'react';
import {
    ConnectButton,
    useCurrentAccount,
    useSignAndExecuteTransaction,
    useSuiClient,
} from '@mysten/dapp-kit';
import type { SuiTransactionBlockResponse } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

// HARDCODED Package ID for deployed contract
const PACKAGE_ID = '0x4134ca8bda08bbed3785b83aa1412942c233a84b4fc4130a425e16a7e4b651d7';

// Define the Pet structure based on the Move contract
type Pet = {
    id: { id: string };
    hunger: string; // u64 comes as string
    happiness: string;
    energy: string;
};

type TutorialStep = 'intro' | 'mint' | 'feed' | 'play' | 'sleep';

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
        title: '🐶 Welcome to Sui Pet!',
        body: 'What Does This Game Teach?',
        details: `Sui Pet is a virtual pet game **running entirely on the blockchain**.

**How is it different from classic games:**
• Data is stored on blockchain, NOT on company servers
• Your Pet is a REAL [digital asset](https://docs.sui.io/concepts/object-model) - in your wallet
• No one can delete or modify your Pet

**What you'll learn in this game:**
• 📦 [Objects](https://docs.sui.io/concepts/object-model) - How data is stored on blockchain
• 🔑 [Ownership](https://docs.sui.io/concepts/object-ownership) - How the ownership system works
• ✍️ [Mutable References](https://move-book.com/concepts/references.html) - How do we update data

📖 [Move Language Docs](https://move-book.com/) | [Sui Developer Docs](https://docs.sui.io/)`,
        icon: '🐶',
    },
    {
        key: 'mint',
        title: '🥚 What is Minting?',
        body: 'Creating New Digital Assets',
        details: `**[Minting](https://docs.sui.io/concepts/dynamic-fields)** = Creating a new [object](https://docs.sui.io/concepts/object-model) on the blockchain.

**Real life analogy:**
Adopting a Pet is like getting an animal from a shelter. The [smart contract](https://docs.sui.io/concepts/sui-move-concepts) creates a new Pet and hands it to you.

**What happens technically:**
1. \`[object::new(ctx)](https://docs.sui.io/references/framework/sui/object)\` → A unique ID is created
2. \`Pet { ... }\` → [Struct](https://move-book.com/concepts/struct.html) values are assigned
3. \`[transfer::transfer](https://docs.sui.io/references/framework/sui/transfer)\` → Pet is SENT to your wallet

**Initial Values:**
• 🍖 Hunger: 0 (not hungry at all)
• 😊 Happiness: 100 (very happy)
• ⚡ Energy: 100 (energetic)

This pattern is used in all [NFTs](https://docs.sui.io/standards/nft) and digital assets!`,
        icon: '🥚',
        code: `public entry fun mint(ctx: &mut TxContext) {
    // Create new Pet
    let pet = Pet { 
        id: object::new(ctx),  // Get unique ID
        hunger: 0,             // Start full
        happiness: 100,        // Start happy
        energy: 100            // Start energetic
    };
    // Send Pet to you
    transfer::transfer(pet, tx_context::sender(ctx));
}`
    },
    {
        key: 'feed',
        title: '🍖 Feeding the Pet',
        body: 'Modifying Data on Blockchain',
        details: `When you feed your Pet, **you're modifying data recorded on the blockchain**.

**What is [Mutable Reference](https://move-book.com/concepts/references.html) (\`&mut\`)?**
In [Move](https://move-book.com/), if you want to modify an object, you must request "borrowing" permission:
• \`&Pet\` → Read only (cannot modify)
• \`&mut Pet\` → Read AND write (can modify)

**[Ownership](https://docs.sui.io/concepts/object-ownership) Security:**
Only YOU (the Pet's [owner](https://docs.sui.io/concepts/object-ownership/address-owned)) can call this function. Someone else cannot feed your Pet!

**What changes:**
• Hunger: Decreases by 20 points (minimum 0)

📖 [References Docs](https://move-book.com/concepts/references.html) | [Ownership Docs](https://docs.sui.io/concepts/object-ownership)`,
        icon: '🍖',
        code: `public entry fun feed(pet: &mut Pet) {
    // &mut = "I will modify this Pet"
    // Only owner can call!
    
    if (pet.hunger > 20) {
        pet.hunger = pet.hunger - 20;
    } else {
        pet.hunger = 0;  // Minimum 0
    };
}`
    },
    {
        key: 'play',
        title: '🎾 Playing with Pet',
        body: 'Multiple Changes - Atomicity',
        details: `Playing **changes multiple values at once**:
• 😊 Happiness: +10 (having fun!)
• ⚡ Energy: -10 (getting tired)
• 🍖 Hunger: +10 (getting hungry)

**[ATOMICITY](https://docs.sui.io/concepts/transactions) principle:**
These 3 changes happen in a single [transaction](https://docs.sui.io/concepts/transactions).
• Either ALL happen
• Or NONE happen

Why is this important? Imagine if only happiness increased but energy didn't decrease - that would be an inconsistent state!

[Transaction guarantees](https://docs.sui.io/concepts/transactions) all changes either fully succeed or are completely cancelled.

📖 [Transactions Docs](https://docs.sui.io/concepts/transactions)`,
        icon: '🎾',
        code: `public entry fun play(pet: &mut Pet) {
    // 3 changes in SINGLE TRANSACTION
    pet.happiness = pet.happiness + 10;  // Happy!
    pet.energy = pet.energy - 10;        // Tired
    pet.hunger = pet.hunger + 10;        // Hungry
    
    // Either all happen, or none!
    // This is called an "atomic operation"
}`
    },
    {
        key: 'sleep',
        title: '💤 Putting Pet to Sleep',
        body: 'Energy Restoration',
        details: `Sleep **fully restores** Pet's energy (brings to 100).

But there's a side effect: Gets a bit hungry while sleeping (+10 hunger).

**[Gas Fees](https://docs.sui.io/concepts/tokenomics/gas-pricing):**
Every blockchain operation requires a small fee. This "[gas](https://docs.sui.io/concepts/tokenomics/gas-pricing) fee" is paid to [validators](https://docs.sui.io/concepts/tokenomics/validators) running the network.

**Sui's advantage:**
• [Gas fees](https://docs.sui.io/concepts/tokenomics/gas-pricing) are very low (measured in cents)
• This allows frequent [transactions](https://docs.sui.io/concepts/transactions) in games
• This game would be very expensive on Ethereum!

📖 [Gas Pricing](https://docs.sui.io/concepts/tokenomics/gas-pricing) | [Validators](https://docs.sui.io/concepts/tokenomics/validators)`,
        icon: '💤',
        code: `public entry fun sleep(pet: &mut Pet) {
    pet.energy = 100;  // Fully rested!
    
    // Metabolism works while sleeping...
    pet.hunger = pet.hunger + 10;
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
        // Split by links [text](url) OR bold **text**
        const parts = text.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*)/g);

        return parts.map((part, i) => {
            // Check for Link
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

            // Check for Bold
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

export default function SuiPet() {
    const account = useCurrentAccount();
    const client = useSuiClient();
    const { mutateAsync: signAndExecute, isPending } = useSignAndExecuteTransaction();

    const [pet, setPet] = useState<Pet | null>(null);
    const [petId, setPetId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [selectedTopic, setSelectedTopic] = useState<TutorialStep>('intro');

    // Fetch user's pet on load or account change
    useEffect(() => {
        if (account) {
            fetchPet();
        } else {
            setPet(null);
            setPetId(null);
        }
    }, [account]);

    const fetchPet = async (retries = 3) => {
        if (!account) return;
        console.log(`[SuiPet] Fetching pets for ${account.address} with PACKAGE_ID: ${PACKAGE_ID}`);
        try {
            // Get all objects owned by user that match the Pet struct type
            const { data } = await client.getOwnedObjects({
                owner: account.address,
                filter: { StructType: `${PACKAGE_ID}::sui_pet::Pet` },
                options: { showContent: true }
            });

            console.log(`[SuiPet] Found ${data.length} pets`, data);

            if (data.length > 0) {
                const objectResp = data[0];
                const content = objectResp.data?.content;
                console.log('[SuiPet] Pet content:', content);
                if (content && content.dataType === 'moveObject') {
                    const fields = content.fields as any;
                    setPet({
                        id: { id: objectResp.data?.objectId || '' },
                        hunger: fields.hunger,
                        happiness: fields.happiness,
                        energy: fields.energy
                    });
                    setPetId(objectResp.data?.objectId || null);
                    console.log('[SuiPet] Pet state set successfully');
                }
            } else {
                // Retry if no pet found (indexer might be slow)
                if (retries > 0) {
                    console.log(`[SuiPet] No pet found, retrying in 2s... (${retries} retries left)`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    return fetchPet(retries - 1);
                }
                console.log('[SuiPet] No pet found after retries');
                setPet(null);
                setPetId(null);
            }
        } catch (e) {
            console.error('[SuiPet] Error fetching pet:', e);
            setError("Failed to fetch pets.");
        }
    };

    const runTransaction = async (tx: Transaction): Promise<SuiTransactionBlockResponse> => {
        const res = await signAndExecute({ transaction: tx });
        const digest = (res as { digest?: string }).digest;
        if (!digest) throw new Error('No transaction digest');

        // Wait for effect
        await client.waitForTransaction({ digest, options: { showEffects: true } });
        return res as unknown as SuiTransactionBlockResponse;
    };

    const handleMint = async () => {
        if (!account) return;
        setSelectedTopic('mint');
        setError(null);
        setMessage("Minting Pet...");
        try {
            const tx = new Transaction();
            tx.moveCall({
                target: `${PACKAGE_ID}::sui_pet::mint`,
                arguments: [],
            });
            tx.setGasBudget(10_000_000);

            // Execute and get full transaction details
            const res = await signAndExecute({ transaction: tx });
            const digest = (res as { digest?: string }).digest;
            if (!digest) throw new Error('No transaction digest');

            // Wait for transaction and get object changes
            const txDetails = await client.waitForTransaction({
                digest,
                options: { showObjectChanges: true, showEffects: true }
            });

            console.log('[SuiPet] Full transaction response:', JSON.stringify(txDetails, null, 2));

            // Find ANY created object (the Pet should be the only one created)
            const createdObjects = txDetails.objectChanges?.filter(
                (change) => change.type === 'created'
            ) || [];

            console.log('[SuiPet] Created objects:', createdObjects);

            // Get the first created object that's not a Coin
            const createdPet = createdObjects.find(
                (obj) => 'objectType' in obj && !obj.objectType.includes('Coin')
            );

            if (createdPet && 'objectId' in createdPet) {
                const petObjectId = createdPet.objectId;
                console.log('[SuiPet] Found pet with ID:', petObjectId);

                // Set pet with default initial values immediately (we know what they are!)
                setPet({
                    id: { id: petObjectId },
                    hunger: '0',
                    happiness: '100',
                    energy: '100'
                });
                setPetId(petObjectId);
                setMessage("Your pet is ready! 🎉");
            } else {
                // Last resort: set a temporary pet so UI updates, then fetch
                console.log('[SuiPet] No created object found, trying fallback...');
                setMessage("Pet minted! Refreshing...");
                await new Promise(resolve => setTimeout(resolve, 3000));
                await fetchPet();
                if (!pet) {
                    setError("Could not load pet. Please refresh the page.");
                }
            }
        } catch (e: any) {
            console.error('[SuiPet] Mint error:', e);
            setError(e.message || "Mint failed");
        }
    };

    const handleFeed = async () => {
        if (!petId) return;
        setSelectedTopic('feed');
        setMessage("Feeding...");
        try {
            const tx = new Transaction();
            tx.moveCall({
                target: `${PACKAGE_ID}::sui_pet::feed`,
                arguments: [tx.object(petId)],
            });
            tx.setGasBudget(10_000_000);
            await runTransaction(tx);
            setMessage("Yum! Hunger decreased.");
            await fetchPet();
        } catch (e: any) {
            setError(e.message || "Feed failed");
        }
    };

    const handlePlay = async () => {
        if (!petId) return;
        setSelectedTopic('play');
        setMessage("Playing...");
        try {
            const tx = new Transaction();
            tx.moveCall({
                target: `${PACKAGE_ID}::sui_pet::play`,
                arguments: [tx.object(petId)],
            });
            tx.setGasBudget(10_000_000);
            await runTransaction(tx);
            setMessage("Fun! Happiness increased.");
            await fetchPet();
        } catch (e: any) {
            setError(e.message || "Play failed");
        }
    };

    const handleSleep = async () => {
        if (!petId) return;
        setSelectedTopic('sleep');
        setMessage("Sleeping...");
        try {
            const tx = new Transaction();
            tx.moveCall({
                target: `${PACKAGE_ID}::sui_pet::sleep`,
                arguments: [tx.object(petId)],
            });
            tx.setGasBudget(10_000_000);
            await runTransaction(tx);
            setMessage("Zzz... Energy restored.");
            await fetchPet();
        } catch (e: any) {
            setError(e.message || "Sleep failed");
        }
    };

    // Calculate Pet State for UI - returns class name for animation
    const getPetMood = () => {
        if (!pet) return 'happy';
        const hunger = parseInt(pet.hunger);
        const energy = parseInt(pet.energy);
        const happiness = parseInt(pet.happiness);

        if (energy < 20) return 'sleepy';
        if (hunger > 80) return 'hungry';
        if (happiness > 80) return 'very-happy';
        if (happiness < 30) return 'sad';
        return 'happy';
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
                        <img src="/sui-pet-top.jpg" alt="Sui Pet Logo" style={{ height: '50px', borderRadius: '8px', marginRight: '1rem' }} />
                        <h1>Sui Pet</h1>
                    </div>
                    <div className="wallet-box">
                        <ConnectButton />
                    </div>
                </header>

                {error && <div className="error">{error}</div>}
                {message && <div className="info">{message}</div>}

                <div className="pet-container" style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                    <div className="pet-display" style={{
                        margin: '1rem',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}>
                        <img
                            src={pet ? "/sui-pet-character.png" : "/sui-pet-character.png"}
                            alt="Sui Pet"
                            style={{
                                width: '180px',
                                height: '180px',
                                objectFit: 'contain',
                                filter: !pet ? 'grayscale(0.8) opacity(0.5)' : 'none',
                                animation: getPetMood() === 'very-happy' ? 'bounce 0.5s ease infinite' :
                                    getPetMood() === 'sleepy' ? 'none' :
                                        'float 3s ease-in-out infinite',
                                opacity: getPetMood() === 'sleepy' ? 0.7 : 1,
                                transform: getPetMood() === 'hungry' ? 'scale(0.95)' : 'scale(1)',
                                transition: 'all 0.3s ease'
                            }}
                        />
                    </div>

                    {!pet ? (
                        <div className="no-pet">
                            <p>You don't have a pet yet.</p>
                            <button className="primary-btn" onClick={handleMint} disabled={isPending || !account}>
                                Mint New Pet 🥚
                            </button>
                        </div>
                    ) : (
                        <div className="pet-controls">
                            {/* Compact Stats Row */}
                            <div className="stats-row" style={{
                                display: 'flex',
                                gap: '0.75rem',
                                maxWidth: '400px',
                                margin: '0 auto 1.5rem',
                                justifyContent: 'center'
                            }}>
                                <div className="stat-item" style={{
                                    background: 'rgba(255, 107, 107, 0.15)',
                                    border: '1px solid rgba(255, 107, 107, 0.3)',
                                    borderRadius: '12px',
                                    padding: '0.5rem 1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}>
                                    <span style={{ fontSize: '1rem' }}>🍖</span>
                                    <span style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ff6b6b' }}>{pet.hunger}</span>
                                </div>
                                <div className="stat-item" style={{
                                    background: 'rgba(78, 205, 196, 0.15)',
                                    border: '1px solid rgba(78, 205, 196, 0.3)',
                                    borderRadius: '12px',
                                    padding: '0.5rem 1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}>
                                    <span style={{ fontSize: '1rem' }}>😊</span>
                                    <span style={{ fontSize: '1.1rem', fontWeight: '700', color: '#4ecdc4' }}>{pet.happiness}</span>
                                </div>
                                <div className="stat-item" style={{
                                    background: 'rgba(255, 230, 109, 0.15)',
                                    border: '1px solid rgba(255, 230, 109, 0.3)',
                                    borderRadius: '12px',
                                    padding: '0.5rem 1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}>
                                    <span style={{ fontSize: '1rem' }}>⚡</span>
                                    <span style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ffe66d' }}>{pet.energy}</span>
                                </div>
                            </div>

                            {/* Action Buttons with Info Icons */}
                            <div className="actions" style={{
                                display: 'flex',
                                gap: '1rem',
                                justifyContent: 'center',
                                flexWrap: 'wrap'
                            }}>
                                <div className="action-group" style={{ display: 'flex', gap: '0.25rem' }}>
                                    <button
                                        onClick={() => setSelectedTopic('feed')}
                                        style={{
                                            padding: '0.5rem 0.75rem',
                                            borderRadius: '8px 0 0 8px',
                                            background: 'rgba(77, 162, 255, 0.1)',
                                            border: '1px solid var(--sui-blue)',
                                            color: 'var(--sui-blue)',
                                            fontSize: '0.85rem'
                                        }}
                                        title="View explanation"
                                    >ℹ️</button>
                                    <button
                                        onClick={handleFeed}
                                        disabled={isPending}
                                        style={{ borderRadius: '0 8px 8px 0' }}
                                    >🍖 Feed</button>
                                </div>
                                <div className="action-group" style={{ display: 'flex', gap: '0.25rem' }}>
                                    <button
                                        onClick={() => setSelectedTopic('play')}
                                        style={{
                                            padding: '0.5rem 0.75rem',
                                            borderRadius: '8px 0 0 8px',
                                            background: 'rgba(77, 162, 255, 0.1)',
                                            border: '1px solid var(--sui-blue)',
                                            color: 'var(--sui-blue)',
                                            fontSize: '0.85rem'
                                        }}
                                        title="View explanation"
                                    >ℹ️</button>
                                    <button
                                        onClick={handlePlay}
                                        disabled={isPending}
                                        style={{ borderRadius: '0 8px 8px 0' }}
                                    >🎾 Play</button>
                                </div>
                                <div className="action-group" style={{ display: 'flex', gap: '0.25rem' }}>
                                    <button
                                        onClick={() => setSelectedTopic('sleep')}
                                        style={{
                                            padding: '0.5rem 0.75rem',
                                            borderRadius: '8px 0 0 8px',
                                            background: 'rgba(77, 162, 255, 0.1)',
                                            border: '1px solid var(--sui-blue)',
                                            color: 'var(--sui-blue)',
                                            fontSize: '0.85rem'
                                        }}
                                        title="View explanation"
                                    >ℹ️</button>
                                    <button
                                        onClick={handleSleep}
                                        disabled={isPending}
                                        style={{ borderRadius: '0 8px 8px 0' }}
                                    >💤 Sleep</button>
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

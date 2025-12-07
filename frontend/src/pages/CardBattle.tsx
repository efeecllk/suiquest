import { useEffect, useState } from 'react';
import {
    ConnectButton,
    useCurrentAccount,
    useSignAndExecuteTransaction,
    useSuiClient,
} from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';

// Package ID - deployed on testnet
const PACKAGE_ID = '0xb40bef80d8cd6740302a20b2fd6d73383cabbbc2526e0298a1ccec70e55f1758';

// Types matching Move contract
type Stats = {
    attack: string;
    defense: string;
    level: string;
    xp: string;
};

type Card = {
    id: { id: string };
    name: string;
    element: number;
    stats: Stats;
    image_id: string;
};

// Deck type for future deck management feature
// type Deck = {
//     id: { id: string };
//     cards: Card[];
// };

type TutorialStep = 'intro' | 'struct' | 'mint' | 'deck' | 'wrap' | 'battle' | 'levelup';

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
        title: '🃏 Welcome to NFT Card Battle!',
        body: 'Pokemon-Style Card Game',
        details: `This is a card battle game that runs **on the blockchain**. Each card is a real **[NFT](https://docs.sui.io/standards/nft)** (Non-Fungible Token) owned by your digital wallet.

But these aren't ordinary NFTs - they're **[Dynamic NFTs](https://docs.sui.io/guides/developer/nft)**! As you battle, they gain XP, level up, and become stronger.

**Concepts you'll learn:**
• 🏴 [Dynamic NFTs](https://docs.sui.io/guides/developer/nft) - Evolving NFTs
• 🏗️ [Struct](https://move-book.com/concepts/struct.html) Composition - Nested data structures
• 📚 [Vector](https://move-book.com/concepts/vector.html) - Dynamic lists (deck management)
• 📦 [Object Wrapping](https://docs.sui.io/concepts/dynamic-fields) - Wrapping objects inside others

📖 [Move Book](https://move-book.com/) | [Sui NFT Standard](https://docs.sui.io/standards/nft)`,
        icon: '🃏',
    },
    {
        key: 'struct',
        title: '🏗️ Struct Composition',
        body: 'Nested Data Structures',
        details: `In [Move](https://move-book.com/), **[Struct](https://move-book.com/concepts/struct.html) Composition** is used to create complex data structures. This means one [struct](https://move-book.com/concepts/struct.html) contains another struct.

**Why is this important?**
• Makes code more organized
• Prevents repetition (DRY principle)
• Allows independent testing

For example, our \`Card\` [struct](https://move-book.com/concepts/struct.html) contains a \`Stats\` struct. Since Stats is separate, it can be easily updated.

**[Abilities](https://move-book.com/concepts/abilities.html):**
• \`[store](https://move-book.com/concepts/abilities.html)\` → Can be stored inside other structs
• \`[copy](https://move-book.com/concepts/abilities.html)\` → Can be copied
• \`[drop](https://move-book.com/concepts/abilities.html)\` → Can be automatically deleted

📖 [Structs](https://move-book.com/concepts/struct.html) | [Abilities](https://move-book.com/concepts/abilities.html)`,
        icon: '🏗️',
        code: `// Stats is its own struct
struct Stats has store, copy, drop {
    attack: u64,
    defense: u64,
    level: u64,
    xp: u64,
}

// Card CONTAINS Stats (composition)
struct Card has key, store {
    id: UID,
    name: String,
    element: u8,
    stats: Stats,  // ← Nested struct!
}`
    },
    {
        key: 'mint',
        title: '🏴 Dynamic NFT Mint',
        body: 'Creating Evolving NFTs',
        details: `Traditional [NFTs](https://docs.sui.io/standards/nft) are **static** - created once, never change. An image, metadata, all frozen.

**[Dynamic NFTs](https://docs.sui.io/guides/developer/nft)** are different! They can **evolve** over time:
• Gain XP 📈
• Level up ⬆️
• Become stronger 💪

**Use cases:**
• Game characters
• Evolving art pieces
• Loyalty programs
• Achievement systems

Your card actually changes on the blockchain after every battle!

📖 [NFT Standard](https://docs.sui.io/standards/nft) | [Dynamic Fields](https://docs.sui.io/concepts/dynamic-fields)`,
        icon: '🏴',
        code: `public entry fun mint_starter_pack(ctx: &mut TxContext) {
    let fire_card = Card {
        id: object::new(ctx),
        name: string::utf8(b"Flame Dragon"),
        element: ELEMENT_FIRE,
        stats: Stats {
            attack: 40,
            defense: 25,
            level: 1,   // Starting level
            xp: 0,      // Starting XP
        },
        image_id: 1,
    };
    transfer::transfer(fire_card, sender);
}`
    },
    {
        key: 'deck',
        title: '📚 Vector Usage',
        body: 'Dynamic Lists (Deck Management)',
        details: `**[Vector](https://move-book.com/concepts/vector.html)** is [Move](https://move-book.com/)'s dynamic array structure. Unlike static arrays, its size can change at runtime.

**Important [Vector](https://move-book.com/concepts/vector.html) Functions:**

| Function | Description |
|----------|-------------|
| \`[vector::empty()](https://move-book.com/concepts/vector.html)\` | Create empty vector |
| \`push_back()\` | Add to end |
| \`pop_back()\` | Remove from end |
| \`length()\` | Get length |
| \`swap_remove()\` | Delete from index |

**Deck example:**
We store cards as \`[vector<Card>](https://move-book.com/concepts/vector.html)\` in the deck. You can add and remove cards!

📖 [Vector Docs](https://move-book.com/concepts/vector.html)`,
        icon: '📚',
        code: `// Creating a deck
struct Deck has key, store {
    id: UID,
    cards: vector<Card>,  // Dynamic card list
}

// Adding a card
public entry fun add_to_deck(deck: &mut Deck, card: Card) {
    vector::push_back(&mut deck.cards, card);
}

// Removing a card (O(1) performance)
public entry fun remove_from_deck(deck: &mut Deck, index: u64) {
    let card = vector::swap_remove(&mut deck.cards, index);
    transfer::transfer(card, sender);
}`
    },
    {
        key: 'wrap',
        title: '📦 Object Wrapping',
        body: 'Wrapping Objects Inside Others',
        details: `**[Object Wrapping](https://docs.sui.io/concepts/dynamic-fields)** means storing an [object](https://docs.sui.io/concepts/object-model) inside another object. This is an important security pattern.

**What happens when wrapped?**
• [Object](https://docs.sui.io/concepts/object-model) can no longer be **directly accessed**
• Only the [owner](https://docs.sui.io/concepts/object-ownership) can see it
• Cannot be [transferred](https://docs.sui.io/references/framework/sui/transfer) (must unwrap first)
• Stored securely

**Example:**
When you add a card to a deck, the card goes INSIDE the deck. You can't [transfer](https://docs.sui.io/references/framework/sui/transfer) it individually anymore - you must remove it from the deck first!

This pattern is ideal for inventory systems, escrow contracts, and secure storage.

📖 [Dynamic Fields](https://docs.sui.io/concepts/dynamic-fields) | [Object Model](https://docs.sui.io/concepts/object-model)`,
        icon: '📦',
        code: `// WRAP: Card enters the deck
public entry fun add_to_deck(deck: &mut Deck, card: Card) {
    // card parameter is CONSUMED (by value)
    // Card is now INSIDE the deck!
    vector::push_back(&mut deck.cards, card);
}

// UNWRAP: Card leaves the deck
public entry fun remove_from_deck(deck: &mut Deck, index: u64) {
    // swap_remove EXTRACTS the card from vector
    let card = vector::swap_remove(&mut deck.cards, index);
    // Card is an independent object again!
    transfer::transfer(card, sender);
}`
    },
    {
        key: 'battle',
        title: '⚔️ Battle Mechanics',
        body: 'Element Advantage & XP System',
        details: `The battle system works with **rock-paper-scissors** logic:

🔥 **Fire** → 🌿 Earth (burns it)
💧 **Water** → 🔥 Fire (extinguishes it)
🌿 **Earth** → 💧 Water (absorbs it)

**Power Calculation:**
\`\`\`
Effective Power = attack + (level × 5) + element_bonus
\`\`\`

Element advantage gives **+15 bonus**!

**XP System:**
• Winner: **25 XP**
• Loser: **12 XP** (everyone learns!)
• 100 XP = 1 Level Up

All changes happen [atomically](https://docs.sui.io/concepts/transactions) in one [transaction](https://docs.sui.io/concepts/transactions)!

📖 [Transactions](https://docs.sui.io/concepts/transactions)`,
        icon: '⚔️',
        code: `public entry fun battle(
    my_card: &mut Card,
    opponent_card: &mut Card,
) {
    // Check element advantage
    let my_bonus = if (has_element_advantage(
        my_card.element, 
        opponent_card.element
    )) { 15 } else { 0 };
    
    // Calculate power
    let my_power = my_card.stats.attack + 
                   (my_card.stats.level * 5) + 
                   my_bonus;
    
    // Award XP to winner
    if (my_power >= opponent_power) {
        add_xp(my_card, 25);      // Winner
        add_xp(opponent_card, 12); // Loser also learns
    };
}`
    },
    {
        key: 'levelup',
        title: '⬆️ Level Up',
        body: 'Dynamic NFT Update',
        details: `Level Up is the best example of **[Dynamic NFT](https://docs.sui.io/guides/developer/nft)**! Your card **truly evolves** on the blockchain.

**What changes on Level Up?**
• Level +1 ⬆️
• Attack +3 ⚔️
• Defense +3 🛡️
• XP resets (extra carries over)

**Maximum Level:** 10

This evolution is permanent on blockchain! Even if you sell your card, the new owner sees this level.

**Real world uses:**
• Game characters
• Loyalty levels
• Achievement badges

📖 [NFT Standard](https://docs.sui.io/standards/nft) | [Mutable References](https://move-book.com/concepts/references.html)`,
        icon: '⬆️',
        code: `public entry fun level_up(card: &mut Card) {
    // Enough XP?
    assert!(card.stats.xp >= 100, ENotEnoughXP);
    
    // Max level check
    assert!(card.stats.level < 10, EMaxLevelReached);
    
    // LEVEL UP!
    card.stats.level = card.stats.level + 1;
    card.stats.xp = card.stats.xp - 100;
    
    // Card gets stronger!
    card.stats.attack = card.stats.attack + 3;
    card.stats.defense = card.stats.defense + 3;
}`
    }
];

// Element utilities
const ELEMENTS = ['🔥', '💧', '🌿'];
const ELEMENT_NAMES = ['Fire', 'Water', 'Earth'];
const ELEMENT_COLORS = ['#ff6b6b', '#4ecdc4', '#95e1a3'];

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

// Card Component
const CardDisplay = ({ card, selected, onClick }: { card: Card; selected?: boolean; onClick?: () => void }) => {
    const element = parseInt(String(card.element)) || 0;
    const attack = parseInt(card.stats.attack) || 0;
    const defense = parseInt(card.stats.defense) || 0;
    const level = parseInt(card.stats.level) || 1;
    const xp = parseInt(card.stats.xp) || 0;

    return (
        <div
            onClick={onClick}
            style={{
                background: `linear-gradient(135deg, ${ELEMENT_COLORS[element]}22, #151a28)`,
                border: `2px solid ${selected ? '#4da2ff' : ELEMENT_COLORS[element]}`,
                borderRadius: '16px',
                padding: '1rem',
                width: '140px',
                cursor: onClick ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                transform: selected ? 'scale(1.05)' : 'scale(1)',
                boxShadow: selected ? `0 0 20px ${ELEMENT_COLORS[element]}44` : 'none',
            }}
        >
            <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '2.5rem' }}>{ELEMENTS[element]}</span>
            </div>
            <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>
                    {ELEMENT_NAMES[element]}
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#f8fafc' }}>
                    Lv.{level}
                </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: '#ff6b6b' }}>⚔️ {attack}</span>
                <span style={{ color: '#4ecdc4' }}>🛡️ {defense}</span>
            </div>
            <div style={{ marginTop: '0.5rem' }}>
                <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '2px' }}>
                    XP: {xp}/100
                </div>
                <div style={{
                    background: '#1e293b',
                    borderRadius: '4px',
                    height: '4px',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        background: 'linear-gradient(90deg, #a855f7, #ec4899)',
                        width: `${Math.min(xp, 100)}%`,
                        height: '100%',
                        transition: 'width 0.3s ease'
                    }} />
                </div>
            </div>
        </div>
    );
};

export default function CardBattle() {
    const account = useCurrentAccount();
    const client = useSuiClient();
    const { mutateAsync: signAndExecute, isPending } = useSignAndExecuteTransaction();

    const [cards, setCards] = useState<Card[]>([]);
    // Deck feature ready in contract but not exposed in UI yet
    // const [deck, setDeck] = useState<Deck | null>(null);
    const [selectedCard, setSelectedCard] = useState<Card | null>(null);
    const [selectedOpponent, setSelectedOpponent] = useState<Card | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [selectedTopic, setSelectedTopic] = useState<TutorialStep>('intro');

    useEffect(() => {
        if (account) {
            fetchCards();
            // fetchDeck();
        } else {
            setCards([]);
            // setDeck(null);
        }
    }, [account]);

    const fetchCards = async () => {
        if (!account) return;
        try {
            const { data } = await client.getOwnedObjects({
                owner: account.address,
                filter: { StructType: `${PACKAGE_ID}::card_battle::Card` },
                options: { showContent: true }
            });

            const fetchedCards: Card[] = [];
            for (const obj of data) {
                const content = obj.data?.content;
                if (content && content.dataType === 'moveObject') {
                    const fields = content.fields as any;
                    fetchedCards.push({
                        id: { id: obj.data?.objectId || '' },
                        name: fields.name,
                        element: fields.element,
                        stats: {
                            attack: fields.stats.fields.attack,
                            defense: fields.stats.fields.defense,
                            level: fields.stats.fields.level,
                            xp: fields.stats.fields.xp,
                        },
                        image_id: fields.image_id,
                    });
                }
            }
            setCards(fetchedCards);
        } catch (e) {
            console.error('Error fetching cards:', e);
        }
    };

    // Deck fetching ready in contract but not exposed in UI yet
    // const fetchDeck = async () => {
    //     if (!account) return;
    //     try {
    //         const { data } = await client.getOwnedObjects({
    //             owner: account.address,
    //             filter: { StructType: `${PACKAGE_ID}::card_battle::Deck` },
    //             options: { showContent: true }
    //         });
    //         if (data.length > 0) {
    //             const content = data[0].data?.content;
    //             if (content && content.dataType === 'moveObject') {
    //                 const fields = content.fields as any;
    //                 const deckCards: Card[] = (fields.cards || []).map((c: any) => ({
    //                     id: { id: c.fields?.id?.id || '' },
    //                     name: c.fields?.name || '',
    //                     element: c.fields?.element || 0,
    //                     stats: {
    //                         attack: c.fields?.stats?.fields?.attack || '0',
    //                         defense: c.fields?.stats?.fields?.defense || '0',
    //                         level: c.fields?.stats?.fields?.level || '1',
    //                         xp: c.fields?.stats?.fields?.xp || '0',
    //                     },
    //                     image_id: c.fields?.image_id || '1',
    //                 }));
    //                 setDeck({
    //                     id: { id: data[0].data?.objectId || '' },
    //                     cards: deckCards,
    //                 });
    //             }
    //         }
    //     } catch (e) {
    //         console.error('Error fetching deck:', e);
    //     }
    // };

    const handleMintStarterPack = async () => {
        if (!account) return;
        setSelectedTopic('mint');
        setError(null);
        setMessage('Minting starter pack... 🎴');
        try {
            const tx = new Transaction();
            tx.moveCall({
                target: `${PACKAGE_ID}::card_battle::mint_starter_pack`,
                arguments: [],
            });
            tx.setGasBudget(10_000_000);

            const res = await signAndExecute({ transaction: tx });
            const digest = (res as { digest?: string }).digest;
            if (digest) {
                await client.waitForTransaction({ digest });
            }
            setMessage('Starter pack minted! You got 3 cards! 🎉');
            setTimeout(() => fetchCards(), 2000);
        } catch (e: any) {
            setError(e.message || 'Mint failed');
        }
    };

    const handleMintCard = async (element: number) => {
        if (!account) return;
        setSelectedTopic('mint');
        setError(null);
        setMessage(`Minting ${ELEMENT_NAMES[element]} card...`);
        try {
            const tx = new Transaction();
            tx.moveCall({
                target: `${PACKAGE_ID}::card_battle::mint_card`,
                arguments: [tx.pure.u8(element)],
            });
            tx.setGasBudget(10_000_000);

            const res = await signAndExecute({ transaction: tx });
            const digest = (res as { digest?: string }).digest;
            if (digest) {
                await client.waitForTransaction({ digest });
            }
            setMessage(`${ELEMENT_NAMES[element]} card minted! 🎴`);
            setTimeout(() => fetchCards(), 2000);
        } catch (e: any) {
            setError(e.message || 'Mint failed');
        }
    };

    // Deck creation ready in contract but not exposed in UI yet
    // const handleCreateDeck = async () => {
    //     if (!account) return;
    //     setSelectedTopic('deck');
    //     setError(null);
    //     setMessage('Creating deck... 📚');
    //     try {
    //         const tx = new Transaction();
    //         tx.moveCall({
    //             target: `${PACKAGE_ID}::card_battle::create_deck`,
    //             arguments: [],
    //         });
    //         tx.setGasBudget(10_000_000);
    //         const res = await signAndExecute({ transaction: tx });
    //         const digest = (res as { digest?: string }).digest;
    //         if (digest) {
    //             await client.waitForTransaction({ digest });
    //         }
    //         setMessage('Deck created! 📚');
    //         setTimeout(() => fetchDeck(), 2000);
    //     } catch (e: any) {
    //         setError(e.message || 'Create deck failed');
    //     }
    // };

    const handleBattle = async () => {
        if (!selectedCard || !selectedOpponent) {
            setError('Select two cards to battle!');
            return;
        }
        setSelectedTopic('battle');
        setError(null);
        setMessage('Battle! ⚔️');
        try {
            const tx = new Transaction();
            tx.moveCall({
                target: `${PACKAGE_ID}::card_battle::battle`,
                arguments: [
                    tx.object(selectedCard.id.id),
                    tx.object(selectedOpponent.id.id),
                ],
            });
            tx.setGasBudget(10_000_000);

            const res = await signAndExecute({ transaction: tx });
            const digest = (res as { digest?: string }).digest;
            if (digest) {
                await client.waitForTransaction({ digest });
            }
            setMessage('Battle complete! Both cards gained XP! ⚔️');
            setSelectedCard(null);
            setSelectedOpponent(null);
            setTimeout(() => fetchCards(), 2000);
        } catch (e: any) {
            setError(e.message || 'Battle failed');
        }
    };

    const handleLevelUp = async (card: Card) => {
        setSelectedTopic('levelup');
        setError(null);
        setMessage('Leveling up... ⬆️');
        try {
            const tx = new Transaction();
            tx.moveCall({
                target: `${PACKAGE_ID}::card_battle::level_up`,
                arguments: [tx.object(card.id.id)],
            });
            tx.setGasBudget(10_000_000);

            const res = await signAndExecute({ transaction: tx });
            const digest = (res as { digest?: string }).digest;
            if (digest) {
                await client.waitForTransaction({ digest });
            }
            setMessage('Level up! Card is now stronger! ⬆️');
            setTimeout(() => fetchCards(), 2000);
        } catch (e: any) {
            setError(e.message || 'Level up failed');
        }
    };

    const selectForBattle = (card: Card) => {
        if (!selectedCard) {
            setSelectedCard(card);
            setMessage('Now select opponent card');
        } else if (selectedCard.id.id === card.id.id) {
            setSelectedCard(null);
            setMessage(null);
        } else {
            setSelectedOpponent(card);
        }
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
                        <span style={{ fontSize: '2rem' }}>🃏</span>
                        <h1>Card Battle</h1>
                    </div>
                    <div className="wallet-box">
                        <ConnectButton />
                    </div>
                </header>

                {error && <div className="error">{error}</div>}
                {message && <div className="info">{message}</div>}

                <div style={{ marginTop: '1rem' }}>
                    {/* Topic Buttons */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                        {tutorialSteps.map((step) => (
                            <button
                                key={step.key}
                                onClick={() => setSelectedTopic(step.key)}
                                style={{
                                    padding: '0.4rem 0.8rem',
                                    fontSize: '0.75rem',
                                    background: selectedTopic === step.key ? 'var(--sui-blue)' : 'rgba(77, 162, 255, 0.1)',
                                    border: '1px solid var(--sui-blue)',
                                    color: selectedTopic === step.key ? '#fff' : 'var(--sui-blue)',
                                    borderRadius: '20px',
                                    width: 'auto',
                                    textTransform: 'none',
                                }}
                            >
                                {step.icon} {step.key}
                            </button>
                        ))}
                    </div>

                    {/* Cards Section */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ color: '#f8fafc', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            🎴 Your Cards ({cards.length})
                            <button
                                onClick={() => setSelectedTopic('struct')}
                                style={{
                                    padding: '0.2rem 0.5rem',
                                    fontSize: '0.65rem',
                                    background: 'rgba(77, 162, 255, 0.1)',
                                    border: '1px solid var(--sui-blue)',
                                    color: 'var(--sui-blue)',
                                    borderRadius: '4px',
                                    width: 'auto',
                                }}
                            >ℹ️</button>
                        </h3>

                        {cards.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem' }}>
                                <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>You don't have any cards yet!</p>
                                <button
                                    onClick={handleMintStarterPack}
                                    disabled={isPending || !account}
                                    style={{ width: 'auto', padding: '0.75rem 1.5rem' }}
                                >
                                    🎴 Mint Starter Pack (3 cards)
                                </button>
                                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                    <button onClick={() => handleMintCard(0)} disabled={isPending} style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem' }}>🔥 Fire</button>
                                    <button onClick={() => handleMintCard(1)} disabled={isPending} style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem' }}>💧 Water</button>
                                    <button onClick={() => handleMintCard(2)} disabled={isPending} style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem' }}>🌿 Earth</button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                {cards.map((card) => (
                                    <div key={card.id.id} style={{ position: 'relative' }}>
                                        <CardDisplay
                                            card={card}
                                            selected={selectedCard?.id.id === card.id.id || selectedOpponent?.id.id === card.id.id}
                                            onClick={() => selectForBattle(card)}
                                        />
                                        {parseInt(card.stats.xp) >= 100 && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleLevelUp(card); }}
                                                disabled={isPending}
                                                style={{
                                                    position: 'absolute',
                                                    bottom: '-10px',
                                                    left: '50%',
                                                    transform: 'translateX(-50%)',
                                                    padding: '0.25rem 0.5rem',
                                                    fontSize: '0.7rem',
                                                    width: 'auto',
                                                    background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                                                    animation: 'pulse 1s infinite',
                                                }}
                                            >
                                                ⬆️ Level Up!
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Battle Arena */}
                    {cards.length >= 2 && (
                        <div style={{
                            background: 'rgba(168, 85, 247, 0.1)',
                            border: '1px solid rgba(168, 85, 247, 0.3)',
                            borderRadius: '16px',
                            padding: '1.5rem',
                            marginBottom: '1.5rem',
                        }}>
                            <h3 style={{ color: '#f8fafc', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                ⚔️ Battle Arena
                                <button
                                    onClick={() => setSelectedTopic('battle')}
                                    style={{
                                        padding: '0.2rem 0.5rem',
                                        fontSize: '0.65rem',
                                        background: 'rgba(77, 162, 255, 0.1)',
                                        border: '1px solid var(--sui-blue)',
                                        color: 'var(--sui-blue)',
                                        borderRadius: '4px',
                                        width: 'auto',
                                    }}
                                >ℹ️</button>
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem' }}>
                                <div style={{ textAlign: 'center' }}>
                                    {selectedCard ? (
                                        <CardDisplay card={selectedCard} selected />
                                    ) : (
                                        <div style={{
                                            width: '140px',
                                            height: '180px',
                                            border: '2px dashed #64748b',
                                            borderRadius: '16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#64748b',
                                        }}>
                                            Select Card
                                        </div>
                                    )}
                                    <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '0.5rem' }}>Your Card</div>
                                </div>
                                <div style={{ fontSize: '2rem' }}>⚔️</div>
                                <div style={{ textAlign: 'center' }}>
                                    {selectedOpponent ? (
                                        <CardDisplay card={selectedOpponent} selected />
                                    ) : (
                                        <div style={{
                                            width: '140px',
                                            height: '180px',
                                            border: '2px dashed #64748b',
                                            borderRadius: '16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#64748b',
                                        }}>
                                            Select Opponent
                                        </div>
                                    )}
                                    <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '0.5rem' }}>Opponent</div>
                                </div>
                            </div>
                            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                                <button
                                    onClick={handleBattle}
                                    disabled={!selectedCard || !selectedOpponent || isPending}
                                    style={{ width: 'auto', padding: '0.75rem 2rem' }}
                                >
                                    ⚔️ Start Battle!
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Mint More */}
                    {cards.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <button onClick={() => handleMintCard(0)} disabled={isPending} style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.8rem' }}>🔥 Mint Fire</button>
                            <button onClick={() => handleMintCard(1)} disabled={isPending} style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.8rem' }}>💧 Mint Water</button>
                            <button onClick={() => handleMintCard(2)} disabled={isPending} style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.8rem' }}>🌿 Mint Earth</button>
                        </div>
                    )}
                </div>
            </div>

            <TechnicalSidebar step={selectedTopic} steps={tutorialSteps} />
        </div>
    );
}

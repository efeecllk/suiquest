import GameCard from '../components/GameCard';
import './Home.css';

export default function Home() {
    return (
        <div className="home-page">
            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-background">
                    <div className="floating-orbs">
                        <div className="orb orb-1"></div>
                        <div className="orb orb-2"></div>
                        <div className="orb orb-3"></div>
                    </div>
                </div>

                <div className="hero-content">
                    <div className="hero-logo-container">
                        <img
                            src="/sui-arcade-logo.png"
                            alt="Sui Arcade"
                            className="hero-logo"
                        />
                        <div className="logo-glow"></div>
                    </div>

                    <h1 className="hero-title">
                        <span className="gradient-text">Sui Arcade</span>
                    </h1>

                    <p className="hero-subtitle">
                        Master <strong>Move on Sui</strong> through interactive, fun games.
                        Learn blockchain development while having a blast! 🎮
                    </p>

                    <div className="hero-cta">
                        <a href="#games" className="cta-button primary">
                            <span>🚀 Start Learning</span>
                        </a>
                        <a href="https://docs.sui.io" target="_blank" rel="noopener noreferrer" className="cta-button secondary">
                            <span>📚 Sui Docs</span>
                        </a>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="stats-section">
                <div className="stats-container">
                    <div className="stat-card">
                        <div className="stat-icon">🎮</div>
                        <div className="stat-value">5+</div>
                        <div className="stat-label">Interactive Games</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">📦</div>
                        <div className="stat-value">15+</div>
                        <div className="stat-label">Sui Concepts</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">⛓️</div>
                        <div className="stat-value">100%</div>
                        <div className="stat-label">On-Chain</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">🆓</div>
                        <div className="stat-value">Free</div>
                        <div className="stat-label">Open Source</div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features-section">
                <h2 className="section-title">Why Learn with Sui Arcade?</h2>
                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon">🎯</div>
                        <h3>Learn by Doing</h3>
                        <p>Each game teaches real Sui Move concepts through hands-on experience. No boring tutorials!</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">🔗</div>
                        <h3>Real Blockchain</h3>
                        <p>All games run on Sui Testnet. Your transactions, your NFTs, your learning - all on-chain.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">📖</div>
                        <h3>Built-in Explanations</h3>
                        <p>Every action comes with detailed explanations of what's happening in the smart contract.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">🏆</div>
                        <h3>Progressive Learning</h3>
                        <p>Start with basics like Objects and work your way up to advanced concepts like Randomness.</p>
                    </div>
                </div>
            </section>

            {/* Games Section */}
            <section id="games" className="games-section">
                <h2 className="section-title">Choose Your Adventure</h2>
                <p className="section-subtitle">Each game teaches different Sui Move concepts. Pick one and start learning!</p>

                <div className="games-grid">
                    <GameCard
                        title="10.00s Challenge"
                        description="Stop the counter exactly at 10.00s to win."
                        image="/logo.png"
                        path="/games/ten-second-challenge"
                        isNew={true}
                        tags={['shared-objects', 'events', 'clock']}
                    />

                    <GameCard
                        title="Sui Pet"
                        description="Raise your own on-chain pet using Move objects."
                        image="/sui-pet-top.jpg"
                        path="/games/sui-pet"
                        isNew={true}
                        tags={['objects', 'ownership', 'mutable-ref']}
                    />

                    <GameCard
                        title="Sui Bank"
                        description="Learn Coin & Balance with a DeFi simulator."
                        image="/sui-bank-logo.jpg"
                        path="/games/sui-bank"
                        isNew={true}
                        tags={['coin', 'balance', 'transfer']}
                    />

                    <GameCard
                        title="Card Battle"
                        description="Pokemon-style NFT card battle. Learn Dynamic NFT, Vector & Object Wrapping!"
                        image="/card-battle-logo.jpg"
                        path="/games/card-battle"
                        isNew={true}
                        tags={['dynamic-nft', 'vector', 'struct', 'wrapping']}
                    />

                    <GameCard
                        title="Dice Game"
                        description="On-chain dice gambling. Learn sui::random, Events & Stake/Reward!"
                        image="/dice-game-logo.jpg"
                        path="/games/dice-game"
                        isNew={true}
                        tags={['random', 'events', 'stake', 'gambling']}
                    />

                    {/* Coming Soon Cards */}
                    <div className="game-card coming-soon-card">
                        <div className="card-thumb">
                            <div className="coming-soon-badge">🔜 Coming Soon</div>
                        </div>
                        <div className="card-info">
                            <h3>Rock Paper Scissors</h3>
                            <p>PvP game on-chain with commit-reveal scheme.</p>
                            <div className="card-tags">
                                <span className="tag">commit-reveal</span>
                                <span className="tag">pvp</span>
                            </div>
                        </div>
                    </div>

                    <div className="game-card coming-soon-card">
                        <div className="card-thumb">
                            <div className="coming-soon-badge">🔜 Coming Soon</div>
                        </div>
                        <div className="card-info">
                            <h3>Tic Tac Toe</h3>
                            <p>Classic strategy game with on-chain state.</p>
                            <div className="card-tags">
                                <span className="tag">game-state</span>
                                <span className="tag">multiplayer</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Learning Path Section */}
            <section className="learning-path-section">
                <h2 className="section-title">Recommended Learning Path</h2>
                <div className="path-container">
                    <div className="path-step">
                        <div className="step-number">1</div>
                        <div className="step-content">
                            <h4>Sui Pet</h4>
                            <p>Start here! Learn about Objects, Ownership, and Mutable References.</p>
                        </div>
                    </div>
                    <div className="path-connector"></div>
                    <div className="path-step">
                        <div className="step-number">2</div>
                        <div className="step-content">
                            <h4>Sui Bank</h4>
                            <p>Understand Coin, Balance, and Token Transfers.</p>
                        </div>
                    </div>
                    <div className="path-connector"></div>
                    <div className="path-step">
                        <div className="step-number">3</div>
                        <div className="step-content">
                            <h4>Card Battle</h4>
                            <p>Master Dynamic NFTs, Vectors, and Object Wrapping.</p>
                        </div>
                    </div>
                    <div className="path-connector"></div>
                    <div className="path-step">
                        <div className="step-number">4</div>
                        <div className="step-content">
                            <h4>10.00s Challenge</h4>
                            <p>Explore Shared Objects, Events, and the Clock.</p>
                        </div>
                    </div>
                    <div className="path-connector"></div>
                    <div className="path-step">
                        <div className="step-number">5</div>
                        <div className="step-content">
                            <h4>Dice Game</h4>
                            <p>Advanced: sui::random, Staking, and Rewards.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="home-footer">
                <div className="footer-content">
                    <div className="footer-logo">
                        <img src="/sui-arcade-logo.png" alt="Sui Arcade" />
                        <span>Sui Arcade</span>
                    </div>
                    <p className="footer-tagline">Learn Move. Build on Sui. Have Fun.</p>
                    <div className="footer-links">
                        <a href="https://sui.io" target="_blank" rel="noopener noreferrer">Sui Network</a>
                        <a href="https://docs.sui.io" target="_blank" rel="noopener noreferrer">Documentation</a>
                        <a href="https://github.com/MystenLabs/sui" target="_blank" rel="noopener noreferrer">GitHub</a>
                        <a href="https://discord.gg/sui" target="_blank" rel="noopener noreferrer">Discord</a>
                    </div>
                    <p className="footer-copyright">© 2024 Sui Arcade. Built with 💙 for the Sui Community.</p>
                </div>
            </footer>
        </div>
    );
}

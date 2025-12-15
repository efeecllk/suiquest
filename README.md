# 🎮 SuiQuest - Learn Move on Sui Through Interactive Games

<p align="center">
  <img src="frontend/public/sui-arcade-logo.png" alt="SuiQuest Logo" width="200" />
</p>

<p align="center">
  🎬 <a href="https://youtu.be/Dww5MlD3-_U"><strong>SuiQuest Demo Video</strong></a>
</p>

**SuiQuest** is an educational platform that teaches Sui Move blockchain development through fun, interactive games. Each game covers different Move concepts, from basic objects to advanced randomness.

🌐 **Live Demo**: [suiquest.efeecllk.com](https://suiquest.efeecllk.com)

## 🎯 What's Inside?

| Game | Move Concepts | Description |
|------|--------------|-------------|
| **Sui Pet** 🐾 | Objects, Ownership, Mutable References | Raise your on-chain virtual pet |
| **Sui Bank** 🏦 | Coin, Balance, Transfer | DeFi simulator for token operations |
| **Card Battle** ⚔️ | Dynamic NFT, Vector, Object Wrapping | Pokemon-style NFT card battles |
| **10.00s Challenge** ⏱️ | Shared Objects, Events, Clock | Stop timer at exactly 10 seconds |

## 📁 Project Structure

```
suiquest/
├── move/                          # Sui Move smart contracts
│   └── sources/
│       ├── game.move              # 10-Second Challenge + Leaderboard
│       ├── sui_pet.move           # Virtual Pet game
│       ├── sui_bank.move          # Bank/DeFi simulator
│       └── card_battle.move       # NFT Card Battle game
│
└── frontend/                      # React + TypeScript dApp
    └── src/
        ├── pages/
        │   ├── Home.tsx           # Landing page with game cards
        │   ├── SuiPet.tsx         # Pet game UI
        │   ├── SuiBank.tsx        # Bank game UI
        │   ├── CardBattle.tsx     # Card battle UI
        │   └── TenSecondChallenge.tsx
        └── config.ts              # Package IDs & network config
```

## 🚀 Quick Start

### 1. Deploy Move Contracts

```bash
cd move
sui move build
sui move test
sui client publish --gas-budget 100000000
```

Save the package ID from the output.

### 2. Configure Frontend

Create `frontend/.env.local`:

```env
VITE_PACKAGE_ID=<your_package_id>
VITE_SUI_NETWORK=testnet
```

### 3. Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## 📚 Learning Path

We recommend following this order:

1. **Sui Pet** → Objects, Ownership, `&mut` references
2. **Sui Bank** → `Coin<SUI>` vs `Balance<SUI>`, transfers
3. **Card Battle** → Dynamic NFTs, vectors, object wrapping
4. **10.00s Challenge** → Shared objects, events, `Clock`

## ✨ Features

- 🎮 **4+ Interactive Games** - Learn by doing, not reading
- 📖 **Built-in Explanations** - Every action has a tutorial sidebar
- ⛓️ **100% On-Chain** - Real blockchain transactions on Sui Testnet
- 🎨 **Modern UI** - Cyberpunk/neon aesthetic with animations
- 💅 **Responsive Design** - Works on desktop and mobile

## 🛠️ Tech Stack

- **Blockchain**: Sui Network (Testnet)
- **Smart Contracts**: Move Language
- **Frontend**: React + TypeScript + Vite
- **Wallet**: Sui dApp Kit
- **Styling**: CSS with glassmorphism effects

## 📖 Educational Content

Each game module includes:
- **Detailed code comments** explaining Move concepts
- **Interactive tutorial sidebar** in the frontend
- **Step-by-step explanations** of blockchain operations

### Key Concepts Covered

| Concept | Game(s) |
|---------|---------|
| Object Model (`has key, store`) | Sui Pet, Card Battle |
| Ownership & Transfer | All games |
| Mutable References (`&mut`) | Sui Pet, Card Battle |
| `Coin<T>` vs `Balance<T>` | Sui Bank |
| Shared Objects | 10.00s Challenge |
| Events (`event::emit`) | 10.00s Challenge |
| Clock Object | 10.00s Challenge |
| Vectors | Card Battle |
| Dynamic NFTs | Card Battle |
| Object Wrapping | Card Battle |

## 🌐 Deployment

The frontend is deployed on Vercel:

```bash
cd frontend
npm run build
npx vercel --prod
```

## 📜 License

MIT License - feel free to use this for educational purposes!

---

<p align="center">
  Built with 💙 for the Sui Community
</p>

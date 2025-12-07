export const TARGET_MS = 10_000;

export const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID ?? '0x4134ca8bda08bbed3785b83aa1412942c233a84b4fc4130a425e16a7e4b651d7';

// Card Battle module needs to be deployed separately - update after deployment
export const CARD_BATTLE_PACKAGE_ID = import.meta.env.VITE_CARD_BATTLE_PACKAGE_ID ?? '';

export const NETWORK: 'devnet' | 'testnet' | 'mainnet' =
    (import.meta.env.VITE_SUI_NETWORK as 'devnet' | 'testnet' | 'mainnet') ?? 'testnet';

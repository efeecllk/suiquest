import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import App from './App';
import './index.css';
import '@mysten/dapp-kit/dist/index.css';
import { NETWORK } from './config';
import { ErrorBoundary } from './ErrorBoundary';

const queryClient = new QueryClient();

const { networkConfig } = createNetworkConfig({
    devnet: { url: getFullnodeUrl('devnet') },
    testnet: { url: getFullnodeUrl('testnet') },
    mainnet: { url: getFullnodeUrl('mainnet') },
});

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <SuiClientProvider networks={networkConfig} defaultNetwork={NETWORK}>
                <WalletProvider autoConnect>
                    <ErrorBoundary>
                        <App />
                    </ErrorBoundary>
                </WalletProvider>
            </SuiClientProvider>
        </QueryClientProvider>
    </StrictMode>,
);

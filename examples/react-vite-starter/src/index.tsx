import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import "@mysten/dapp-kit/dist/index.css";
import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { networkConfig } from "./config";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <WalletProvider autoConnect>
          <App />
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);


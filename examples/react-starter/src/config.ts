import { getFullnodeUrl } from '@mysten/sui/client';
import { createNetworkConfig } from "@mysten/dapp-kit";

// Config options for the networks you want to connect to
// @ts-ignore
const { networkConfig } = createNetworkConfig({
  testnet: { url: getFullnodeUrl('testnet') },
	localnet: { url: getFullnodeUrl('localnet') },
	mainnet: { url: getFullnodeUrl('mainnet') },
});

export { networkConfig };
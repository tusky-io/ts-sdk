import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromB64, toB64 } from '@mysten/sui/utils';

export default class EnokiSigner {

  keypair: Ed25519Keypair;
  address: string;
  // injectedWallet: InjectedWallet;

  constructor(config: { keypair?: any, address?: any }) {
    this.keypair = config.keypair
    this.address = config.address;
    if (!this.keypair) {
      throw new Error("Missing wallet configuration. Please provide Enoki key pair or inject the wallet.");
    }
  }

  async signingPublicKey(): Promise<string> {
    return "";
  }

  async sign(bytes: string) {
    const { signature } = await this.keypair.signTransaction(fromB64(bytes));
    return signature;
  }

  // async verify(message: string, signature: string) {
  //   const recoveredAddress = ethers.utils.verifyMessage(message, signature);
  //   const walletAddress = await this.getAddress();
  //   return recoveredAddress === walletAddress;
  // }

  async getAddress(): Promise<string> {
    return this.address;
  }
}

// export interface InjectedWallet {
//   getAddresses(): Promise<any>
//   signMessage(config?: any): Promise<any>
// }

export {
  EnokiSigner
}
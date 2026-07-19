import { ethers, Wallet, JsonRpcProvider, TransactionRequest } from 'ethers';

export type Chain = 'ethereum' | 'base' | 'polygon' | 'arbitrum';

const RPC_URLS: Record<Chain, string> = {
  ethereum: process.env.ETH_RPC_URL!,
  base: process.env.BASE_RPC_URL!,
  polygon: process.env.POLYGON_RPC_URL!,
  arbitrum: process.env.ARBITRUM_RPC_URL!,
};

export class EVMWallet {
  private wallet: Wallet;
  private static providers: Partial<Record<Chain, JsonRpcProvider>> = {};

  constructor(privateKey?: string) {
    if (privateKey) {
      this.wallet = new Wallet(privateKey);
    } else {
      this.wallet = Wallet.createRandom();
    }
  }

  private static getProvider(chain: Chain): JsonRpcProvider {
    if (!this.providers[chain]) {
      this.providers[chain] = new JsonRpcProvider(RPC_URLS[chain]);
    }
    return this.providers[chain]!;
  }

  /**
   * Generate a new EVM wallet
   */
  static createWallet(): EVMWallet {
    return new EVMWallet();
  }

  /**
   * Get balance for a specific address and chain
   */
  async getBalance(address: string, chain: Chain): Promise<bigint> {
    const provider = EVMWallet.getProvider(chain);
    return await provider.getBalance(address);
  }

  /**
   * Send native token transaction
   */
  async sendTransaction(to: string, amount: bigint, chain: Chain): Promise<string> {
    const provider = EVMWallet.getProvider(chain);
    const walletWithProvider = this.wallet.connect(provider);
    
    const tx = await walletWithProvider.sendTransaction({
      to,
      value: amount,
    });
    
    return tx.hash;
  }

  /**
   * Sign an arbitrary message
   */
  async signMessage(message: string): Promise<string> {
    return await this.wallet.signMessage(message);
  }

  /**
   * Verify a signature
   */
  static verifySignature(message: string, signature: string, address: string): boolean {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch (error) {
      return false;
    }
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(tx: TransactionRequest, chain: Chain): Promise<bigint> {
    const provider = EVMWallet.getProvider(chain);
    return await provider.estimateGas(tx);
  }

  /**
   * Watch an address for incoming transactions (Simplified Polling)
   * Returns a cleanup function to stop watching.
   */
  async watchAddress(address: string, chain: Chain, callback: (tx: any) => void): Promise<() => void> {
    const provider = EVMWallet.getProvider(chain);
    const listener = async (blockNumber: number) => {
      try {
        const block = await provider.getBlock(blockNumber, true);
        if (block && block.transactions) {
          block.transactions.forEach((txHash: string | any) => {
            // In ethers v6, getBlock(num, true) should return TransactionResponse objects
            const tx = txHash; 
            if (tx && typeof tx !== 'string' && tx.to && tx.to.toLowerCase() === address.toLowerCase()) {
              callback(tx);
            }
          });
        }
      } catch (error) {
        console.error('Error in watchAddress listener:', error);
      }
    };

    provider.on('block', listener);
    return () => {
      provider.off('block', listener);
    };
  }

  getAddress(): string {
    return this.wallet.address;
  }
}

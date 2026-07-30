import { ethers } from 'ethers';
import { Chain, EVMWallet, GasEstimation, TransactionRequest } from './types.js';

export class EVMService {
    private providers: Map<Chain, ethers.JsonRpcProvider> = new Map();

    constructor() {
        this.initializeProviders();
    }

    /**
     * Initialize RPC providers for all supported chains
     */
    private initializeProviders() {
        const chains: Chain[] = ['ethereum', 'base', 'polygon', 'arbitrum'];

        chains.forEach(chain => {
            const envVar = `${chain.toUpperCase()}_RPC_URL`;
            const url = process.env[envVar];
            if (url) {
                this.providers.set(chain, new ethers.JsonRpcProvider(url));
            }
        });
    }

    /**
     * Get provider for a specific chain
     */
    private getProvider(chain: Chain): ethers.JsonRpcProvider {
        const provider = this.providers.get(chain);
        if (!provider) {
            throw new Error(`RPC provider not configured for chain: ${chain}`);
        }
        return provider;
    }

    /**
     * Generate a new EVM-compatible wallet
     * SECURITY: Only returns the address. Private keys should be managed client-side.
     */
    async generateWallet(): Promise<EVMWallet> {
        const wallet = ethers.Wallet.createRandom();
        // SECURITY: Do NOT return privateKey or mnemonic via API
        // This is a demonstration - production systems should generate wallets client-side
        console.warn('WARNING: Wallet generation should be done client-side in production');
        return {
            address: wallet.address,
        };
    }

    /**
     * Get balance for an address on a specific chain
     */
    async getBalance(address: string, chain: Chain): Promise<string> {
        const provider = this.getProvider(chain);
        const balance = await provider.getBalance(address);
        return ethers.formatEther(balance);
    }

    /**
     * Estimate gas for a transaction
     */
    async estimateGas(tx: TransactionRequest, chain: Chain): Promise<GasEstimation> {
        const provider = this.getProvider(chain);

        const feeData = await provider.getFeeData();
        const gasLimit = await provider.estimateGas({
            to: tx.to,
            from: tx.from,
            value: tx.value ? ethers.parseEther(tx.value) : undefined,
            data: tx.data,
        });

        // Use maxFeePerGas for EIP-1559 chains (more accurate for Ethereum, Base, Polygon, Arbitrum)
        const gasPrice = feeData.gasPrice || 0n;
        const effectiveGasPrice = feeData.maxFeePerGas || gasPrice;
        const totalCost = gasLimit * effectiveGasPrice;

        return {
            gasLimit: gasLimit.toString(),
            gasPrice: ethers.formatUnits(gasPrice, 'gwei'),
            maxFeePerGas: feeData.maxFeePerGas ? ethers.formatUnits(feeData.maxFeePerGas, 'gwei') : undefined,
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei') : undefined,
            totalCostEstimate: ethers.formatEther(totalCost),
        };
    }

    /**
     * Watch an address for incoming transactions
     * Note: In a real server, this would likely be handled by a block indexer or webhook service.
     * For this MVP service, we use the provider's 'block' listener to poll for changes.
     */
    async watchAddress(address: string, chain: Chain, callback: (tx: any) => void): Promise<void> {
        const provider = this.getProvider(chain);

        console.log(`Watching address ${address} on ${chain}...`);

        // Listen for new blocks and check for transactions to the watched address
        // Using prefetchedTransactions for efficiency (recommended by gemini-code-assist)
        provider.on('block', async (blockNumber) => {
            const block = await provider.getBlock(blockNumber, true);
            if (!block?.prefetchedTransactions) return;

            // Iterate over prefetched transactions instead of re-fetching
            for (const tx of block.prefetchedTransactions) {
                if (tx.to?.toLowerCase() === address.toLowerCase()) {
                    callback(tx);
                }
            }
        });
    }
}

// Export a singleton instance
export const evmService = new EVMService();

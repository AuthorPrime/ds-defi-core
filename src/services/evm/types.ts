export type Chain = 'ethereum' | 'base' | 'polygon' | 'arbitrum';

export interface GasEstimation {
    gasLimit: string;
    gasPrice?: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
    totalCostEstimate: string;
}

export interface EVMWallet {
    address: string;
    // SECURITY: privateKey and mnemonic removed - should be managed client-side
}

export interface TransactionRequest {
    to: string;
    from?: string;
    value?: string;
    data?: string;
}

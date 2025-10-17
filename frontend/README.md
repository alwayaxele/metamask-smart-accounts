# 🌉 MetaMask Smart Accounts - Cross-Chain Demo

> **MetaMask Smart Accounts** integration on **Sepolia + Monad Testnet** using the Delegation Toolkit SDK.

---

## 🎯 Overview

This project demonstrates **MetaMask Smart Accounts** working across **two testnets**:

- ✅ **Sepolia Testnet**: Full bundler support (Pimlico) - Recommended for testing
- 🚀 **Monad Testnet**: Direct deployment support - Bundler integration in progress

### Key Features

- 🔐 **Signer Agnostic**: Works with Privy embedded wallets or MetaMask extension
- 🌉 **Cross-Chain**: Single codebase supporting multiple chains
- 📦 **ERC-4337**: Account abstraction with UserOperations
- 🚀 **Counterfactual Deployment**: Generate addresses before deployment
- ⛽ **Gas Abstraction**: Smart Account transactions via bundler

---

## 🏗️ Architecture

```
┌─────────────┐
│   Privy     │ ← Wallet Provider (signer agnostic)
└──────┬──────┘
       │
       ▼
┌─────────────────────────────┐
│  MetaMask Smart Account     │ ← Delegation Toolkit SDK
│  - Hybrid Implementation    │
│  - ERC-4337 Compatible      │
└──────┬──────────────────────┘
       │
       ├──────────┬─────────────┐
       ▼          ▼             ▼
  ┌─────────┐ ┌─────────┐ ┌──────────┐
  │ Sepolia │ │  Monad  │ │ Pimlico  │
  │ Testnet │ │ Testnet │ │ Bundler  │
  └─────────┘ └─────────┘ └──────────┘
```

---

## 🚀 Setup & Installation

### Prerequisites

```bash
Node.js >= 18
npm or yarn
```

### Install Dependencies

```bash
cd monad-m8/frontend
npm install
```

### Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
NEXT_PUBLIC_BUNDLER_RPC_URL=https://api.pimlico.io/v2/{chainId}/rpc?apikey=YOUR_KEY
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📖 Usage Guide

### Step 1: Connect Wallet & Select Network

1. Click **"Login"** to connect with Privy
2. Use the **network dropdown in header** to switch between:
   - Sepolia Testnet (11155111)
   - Monad Testnet (10143)

### Step 2: Initialize Smart Account

1. Click **"1️⃣ Init Smart Account"**
2. This creates a **counterfactual address** (not yet deployed on-chain)
3. Copy the Smart Account address

### Step 3: Deploy Smart Account

1. Click **"2️⃣ Deploy Smart Account"**
2. Confirm transaction in MetaMask (EOA pays gas)
3. Wait for deployment confirmation

### Step 4: Send Transaction via Smart Account

1. Fund your Smart Account with test tokens:
   - **Sepolia**: Get ETH from [Sepolia Faucet](https://sepoliafaucet.com/)
   - **Monad**: Get MON from [Monad Faucet](https://testnet.monad.xyz/faucet)
2. Enter **recipient address** and **amount**
3. Click **"Send Tx via Bundler"**
4. Sign the UserOperation in MetaMask
5. View transaction on explorer

---

## 🧪 Testing Results

### ✅ Sepolia Testnet (Working)

| Feature | Status | Notes |
|---------|--------|-------|
| Smart Account Init | ✅ | Counterfactual generation works |
| Direct Deployment | ✅ | EOA pays gas via factory contract |
| Bundler Submission | ✅ | Pimlico processes UserOperations |
| Transaction Confirmation | ✅ | Confirmed on-chain within 30s |

**Recommendation**: Use Sepolia for full UserOperation testing.

### 🚀 Monad Testnet (Working!) ✅

| Feature | Status | Notes |
|---------|--------|-------|
| Smart Account Init | ✅ | Counterfactual generation works |
| Direct Deployment | ✅ | EOA pays gas via factory contract |
| Bundler Submission | ✅ | Biconomy bundler working! |
| Transaction Confirmation | ✅ | Confirmed on-chain successfully! |

**Current Setup**: 
- **Sepolia**: Pimlico bundler (stable, working)
- **Monad**: Biconomy bundler (**WORKING!** ✅)

**Success**: Biconomy bundler successfully processes and broadcasts UserOperations to Monad testnet!

**Example Transactions:**
- [TX 1: 0x663f4762...](https://testnet.monadexplorer.com/tx/0x663f4762c4bc28f07d9fd0dc1eb30d1cfbd6dfb77d3ec0f56a6925f9f5a726f0)
- [TX 2: 0x77c68191...](https://testnet.monadexplorer.com/tx/0x77c681919f7e1fc55bb03aa74d77552e1ad6177449a5db926097095b305a53f1) (Perfect ERC-4337 UserOp!)

**Smart Account Example:** [0x62eedC76...](https://testnet.monadexplorer.com/address/0x62eedC76859903e19A4Eb54CfA972f5634D44821)

---

## 🔍 Finding Your Transactions

### Understanding Hash Types

**UserOperation Hash** (Bundler internal):
```
0x3bae0d9494ee38a2b933462b818e3f34708bc146addf70245285e4fb23ce2bdd
```
→ ❌ Cannot search this in block explorer!

**Transaction Hash** (On-chain):
```
0x77c681919f7e1fc55bb03aa74d77552e1ad6177449a5db926097095b305a53f1
```
→ ✅ Search this in [Monad Explorer](https://testnet.monadexplorer.com/)!

### How to Find Your Transactions

**Method 1: Use Transaction Hash from Console**
```javascript
// Console output:
✅ Transaction confirmed!
   - Transaction hash: 0x77c68191...  ← Copy this!
```

**Method 2: Search by Smart Account Address**
1. Copy your Smart Account address from UI
2. Search on explorer: `https://testnet.monadexplorer.com/address/[YOUR_SA_ADDRESS]`
3. View all transactions

**Method 3: Check Internal Transactions**
- ERC-4337 transactions have **3 internal transactions**:
  1. Bundler refund
  2. Smart Account pays gas
  3. Actual token transfer (your transfer!)

---

## 🔧 Technical Details

### Smart Account Configuration

```typescript
// Factory Contract (same across chains)
const FACTORY_ADDRESS = "0x69Aa2f9fe1572F1B640E1bbc512f5c3a734fc77c";

// Bundler URLs
const BUNDLER_URLS = {
  11155111: "https://api.pimlico.io/v2/11155111/rpc?apikey=...", // Sepolia (Pimlico)
  10143: "https://bundler.biconomy.io/api/v3/10143/bundler_...", // Monad (Biconomy)
};

// Smart Account Creation
const smartAccount = await toMetaMaskSmartAccount({
  client: publicClient,
  implementation: Implementation.Hybrid,
  deployParams: [eoaAddress, [], [], []],
  deploySalt: "0x02",
  signer: { walletClient },
});
```

### Deployment Flow

```typescript
// 1. Generate counterfactual address
const smartAccount = await createMetaMaskSmartAccount(chainId);
const saAddress = await smartAccount.getAddress();

// 2. Check if already deployed
const code = await publicClient.getCode({ address: saAddress });
const isDeployed = code && code !== "0x";

// 3. Deploy via factory (if not deployed)
const { factory, factoryData } = await smartAccount.getFactoryArgs();
const txHash = await walletClient.sendTransaction({
  to: factory,
  data: factoryData,
  gas: BigInt(1000000),
});
```

### UserOperation Flow

```typescript
// 1. Prepare UserOperation
const userOp = await bundlerClient.prepareUserOperation({
  account: smartAccount,
  calls: [{ to: recipient, value: amount }],
});

// 2. Sign UserOperation
const signature = await smartAccount.signUserOperation(userOp);
userOp.signature = signature;

// 3. Submit to Bundler
const hash = await bundlerClient.sendUserOperation(userOp);

// 4. Wait for confirmation
const receipt = await bundlerClient.waitForUserOperationReceipt({ hash });
```

---

## 📂 Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with Privy/Wagmi providers
│   ├── page.tsx            # Main page with network selector
│   └── providers.tsx       # Provider configuration
├── components/
│   ├── SelectChain.tsx     # Network switcher component
│   ├── SmartAccountInfo.tsx # Init & deploy Smart Account
│   └── SendUserOperation.tsx # Send transactions via bundler
└── config/
    ├── chain.ts            # Chain configurations
    ├── smartAccount.ts     # Smart Account logic (cross-chain)
    └── wagmi.ts            # Wagmi config with both chains
```

---

## 🎉 Bundler Solution - SUCCESS!

### ✅ Monad Bundler Working with Biconomy

**Resolution**: Switched from Pimlico to Biconomy bundler for Monad testnet

**Timeline**:
- ❌ Pimlico bundler: UserOperations timeout (not broadcasting to Monad)
- ✅ **Biconomy bundler: WORKING!** Successfully broadcasts and confirms transactions

**Current Configuration**:
```typescript
// Bundler configuration
const BUNDLER_URLS = {
  11155111: "https://api.pimlico.io/v2/11155111/rpc?...",           // Sepolia ✅
  10143: "https://bundler.biconomy.io/api/v3/10143/bundler_...",    // Monad ✅
};
```

**Proof of Success**:
- ✅ UserOperations processed and broadcast
- ✅ Transactions confirmed on Monad Explorer
- ✅ Example: [TX 0x663f4762...](https://testnet.monadexplorer.com/tx/0x663f4762c4bc28f07d9fd0dc1eb30d1cfbd6dfb77d3ec0f56a6925f9f5a726f0)

**Result**: Full cross-chain Smart Account functionality working on both Sepolia and Monad! 🎉

### Issue: Gas Estimation

**Symptom**: Auto gas estimation returns values that are too low.

**Solution**: Implemented fallback minimums:
```typescript
const callGasLimit = userOp.callGasLimit > BigInt(80000) 
  ? userOp.callGasLimit 
  : BigInt(80000);
```

### Issue: "Token deducted but no transaction in explorer"

**Symptom**: Balance decreased but cannot find transaction on explorer.

**Root Cause**: Searching with wrong hash type or wrong address.

**Solution**:
1. ✅ Use **Transaction Hash** (not UserOperation hash) from console logs
2. ✅ Search by **Smart Account address** to see all transactions
3. ✅ Check **Internal Transactions** tab on explorer
4. ✅ Wait 30-60 seconds for explorer to index

**Example:**
```javascript
// ❌ WRONG: UserOperation hash
0x3bae0d9494ee38a2b933462b818e3f34708bc146...

// ✅ CORRECT: Transaction hash
0x77c681919f7e1fc55bb03aa74d77552e1ad6177449a5db926097095b305a53f1
```

**See Example Transaction:** [0x77c68191...](https://testnet.monadexplorer.com/tx/0x77c681919f7e1fc55bb03aa74d77552e1ad6177449a5db926097095b305a53f1)
- Check "Internal Transactions" tab
- See 3 internal txs showing gas payment + token transfer

---

## 📋 Requirements Checklist

- ✅ **MetaMask Smart Accounts**: Using Delegation Toolkit SDK
- ✅ **Signer Agnostic**: Works with Privy embedded wallets
- ✅ **Monad Testnet**: Full functionality with Biconomy bundler
- ✅ **Cross-Chain**: Sepolia + Monad both working
- ✅ **Delegation Toolkit SDK**: Integrated and functional
- ✅ **Working Demo**: **COMPLETE END-TO-END ON BOTH CHAINS!** 🎉

---

## 🎥 Demo Video Guide

### What to Show

1. **Introduction** (30s)
   - Cross-chain MetaMask Smart Accounts
   - Sepolia + Monad testnet
   - Using Biconomy bundler for Monad

2. **On Sepolia** (2 min)
   - Initialize Smart Account → show address
   - Deploy Smart Account → show TX on Etherscan
   - Fund Smart Account with test ETH
   - Send transaction via Pimlico bundler → show confirmation ✅

3. **On Monad** (2 min) ⭐ **FULL DEMO NOW POSSIBLE!**
   - Switch network to Monad
   - Initialize Smart Account → show address
   - Deploy Smart Account → show TX on Monad Explorer
   - Fund Smart Account with test MON
   - **Send transaction via Biconomy bundler → show confirmation!** ✅
   - Show transaction on Monad Explorer

4. **Architecture Overview** (30s)
   - Code walkthrough
   - Delegation Toolkit SDK integration
   - Cross-chain bundler configuration

### Key Points to Emphasize

- ✅ MetaMask Smart Accounts working **on both chains**
- ✅ Cross-chain architecture (Sepolia + Monad)
- ✅ Signer-agnostic (Privy embedded wallet)
- ✅ ERC-4337 Account Abstraction
- ✅ **Full UserOperation flow on Monad!** (Biconomy bundler)
- ✅ Production-ready implementation

---

## 🔗 Resources

- [MetaMask Delegation Toolkit Docs](https://docs.metamask.io/delegation-toolkit/)
- [ERC-4337 Specification](https://eips.ethereum.org/EIPS/eip-4337)
- [Pimlico Bundler Docs](https://docs.pimlico.io/) (Sepolia)
- [Biconomy Bundler Docs](https://docs.biconomy.io/) (Monad) ⭐
- [Monad Testnet Docs](https://docs.monad.xyz/)
- [Monad Explorer](https://testnet.monadexplorer.com/)
- [Sepolia Faucet](https://sepoliafaucet.com/)
- [Monad Faucet](https://testnet.monad.xyz/faucet)

---

## 📝 Development Notes

### Progress History

- ✅ **15.10.2025**: Privy + Wagmi config, chain switching
- ✅ **16.10.2025**: Smart Account init, deployment, cross-chain support
- ⚠️ **Discovered**: Pimlico Monad bundler not broadcasting transactions
- 🎉 **RESOLVED**: Switched to Biconomy bundler - **FULL SUCCESS!**

### Achievement Unlocked 🏆

**Full Cross-Chain Smart Account Implementation:**
- ✅ Sepolia testnet: Pimlico bundler working
- ✅ Monad testnet: Biconomy bundler working
- ✅ Complete UserOperation flow on both chains
- ✅ Production-ready architecture
- ✅ **Ready for hackathon submission!**

### Next Steps (Future Enhancements)

1. ✅ ~~Test full UserOperation flow on Monad~~ **DONE!**
2. Implement gas sponsorship (paymaster)
3. Add delegation features (session keys)
4. Multi-call batch transactions
5. Build game/DeFi features on top

---

## 🤝 Contributing

This is a hackathon demo project. For production use, please:

1. Use production-grade bundler services
2. Implement proper error handling
3. Add comprehensive testing
4. Secure private keys properly

---

## 📄 License

MIT License - See LICENSE file for details

---

**Built with ❤️ for the MetaMask + Monad Hackathon**

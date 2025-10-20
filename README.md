# 🌉 MetaMask Smart Accounts - Cross-Chain Demo

> **MetaMask Smart Accounts** integration on **Sepolia + Monad Testnet** using the Delegation Toolkit SDK.

## 🎯 Overview

This project demonstrates **MetaMask Smart Accounts** working across **two testnets**:

- ✅ **Sepolia Testnet**: Full bundler support (Pimlico) - Recommended for testing
- 🚀 **Monad Testnet**: Direct deployment support - Bundler integration working (Biconomy)

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
       │          │             │
       ▼          ▼             ▼
  ┌─────────┐ ┌─────────┐ ┌──────────┐
  │Etherscan│ │ Monad   │ │ Biconomy │
  │Explorer │ │Explorer │ │ Bundler  │
  └─────────┘ └─────────┘ └──────────┘
```

---

### Prerequisites

```bash
Node.js >= 18
npm or yarn
```

### Install & Run

```bash
cd monad-boost/frontend
npm install
```

Create `.env.local`:
```env
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
NEXT_PUBLIC_BUNDLER_RPC_URL=https://api.pimlico.io/v2/{chainId}/rpc?apikey=YOUR_KEY
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📖 Usage Guide

### Step 1: Connect Wallet & Select Network
1. Click **"Login"** to connect with Privy
2. Use the **network dropdown** to switch between Sepolia (11155111) and Monad (10143)

### Step 2: Initialize Smart Account
1. Click **"1️⃣ Init Smart Account"**
2. This creates a **counterfactual address** (not yet deployed on-chain)

### Step 3: Deploy Smart Account
1. Click **"2️⃣ Deploy Smart Account"**
2. Confirm transaction in MetaMask (EOA pays gas)

### Step 4: Send Transaction via Smart Account
1. Fund your Smart Account with test tokens:
   - **Sepolia**: Get ETH from [Sepolia Faucet](https://sepoliafaucet.com/)
   - **Monad**: Get MON from [Monad Faucet](https://testnet.monad.xyz/faucet)
2. Enter **recipient address** and **amount**
3. Click **"Send Tx via Bundler"**
4. Sign the UserOperation in MetaMask

## 🧪 Testing Results

### ✅ Sepolia Testnet (Working)
- Smart Account Init: ✅ Counterfactual generation works
- Direct Deployment: ✅ EOA pays gas via factory contract
- Bundler Submission: ✅ Pimlico processes UserOperations
- Transaction Confirmation: ✅ Confirmed on-chain within 30s

### 🚀 Monad Testnet (Working!) ✅
- Smart Account Init: ✅ Counterfactual generation works
- Direct Deployment: ✅ EOA pays gas via factory contract
- Bundler Submission: ✅ Biconomy bundler working!
- Transaction Confirmation: ✅ Confirmed on-chain successfully!

**Current Setup**: 
- **Sepolia**: Pimlico bundler (stable, working)
- **Monad**: Biconomy bundler (**WORKING!** ✅)

## 📊 Envio Event Tracking

The app includes real-time event tracking powered by **Envio Indexer**:

**Envio** is a high-performance blockchain indexing platform that provides real-time GraphQL APIs for smart contract events. It automatically indexes blockchain data and makes it easily queryable through GraphQL, enabling developers to build responsive applications with live blockchain data.

### Features
- 🔍 **Real-time Monitoring**: Track AppHub contract events as they happen
- 📈 **Event Types**: Monitor faucet claims, account deployments, and token additions
- 🔄 **Auto-refresh**: Events update every 30 seconds
- 📱 **Responsive UI**: Clean, mobile-friendly event display

### Event Types Tracked
- **FaucetClaimed**: Users claiming test tokens
- **AccountDeployed**: Smart account deployments
- **FaucetTokenAdded**: New tokens added to faucet

### Access
Navigate to **"Envio Checker"** tab in the header to view live events from the AppHub contract.

### Sample Query & Response

**GraphQL Endpoint:**
```
https://indexer.dev.hyperindex.xyz/a4728f5/v1/graphql
```

**GraphQL Query:**
```graphql
query {
  AppHub_FaucetClaimed(limit: 5, order_by: { timestamp: desc }) {
    user
    token
    amount
    timestamp
  }
}
```

**Response:**
```json
{
  "data": {
    "AppHub_FaucetClaimed": [
      {
        "user": "0x7BFC35B33A01B7BBc27cc188A71ed4da1D382e64",
        "token": "0x2Ea973542a227E9ee0ad754Bef78e673d10eD93F",
        "amount": "100000000000000000000",
        "timestamp": "1760927941"
      },
      {
        "user": "0x69E7E295372cB92e32Adeeb6f8aA3130a5a74085",
        "token": "0x024Ba065Eeeb8C0ADBb9be64d4E58BF9CdfDdf61",
        "amount": "100000000000000000000",
        "timestamp": "1760805952"
      }
    ]
  }
}
```

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

**Built with ❤️ for the MetaMask + Monad Hackathon**
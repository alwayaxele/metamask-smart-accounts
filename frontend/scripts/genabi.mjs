import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Danh sách contracts cần generate
const CONTRACTS = ["AppHub"];

// Path: từ frontend/scripts lên monad-m8, vào contracts
const contractsDir = path.resolve(__dirname, "../../contracts");
const deploymentsDir = path.join(contractsDir, "deployments");

// Output: frontend/src/abi
const outdir = path.resolve(__dirname, "../src/abi");

if (!fs.existsSync(outdir)) {
  fs.mkdirSync(outdir, { recursive: true });
}

const line = "\n===================================================================\n";

if (!fs.existsSync(contractsDir)) {
  console.error(`${line}Unable to locate contracts directory at ${contractsDir}${line}`);
  process.exit(1);
}

// ===================== AppHub =====================
console.log("\n🔄 Generating AppHub...");

const appHubFile = path.join(deploymentsDir, "apphub.json");
if (!fs.existsSync(appHubFile)) {
  console.error(`${line}AppHub deployment not found at ${appHubFile}${line}`);
  process.exit(1);
}

const appHubDeployment = JSON.parse(fs.readFileSync(appHubFile, "utf-8"));

const appHubABI = `
/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const AppHubABI = ${JSON.stringify({ abi: appHubDeployment.abi }, null, 2)} as const;
`;

// Generate AppHub addresses for all chains
const appHubChains = Object.keys(appHubDeployment).filter(key => key !== 'abi');
console.log(`📦 Found ${appHubChains.length} AppHub chain(s): ${appHubChains.join(', ')}`);

const appHubAddressEntries = appHubChains.map(chainId => {
  const chainData = appHubDeployment[chainId];
  return `  "${chainId}": { address: "${chainData.address}", chainId: ${chainData.chainId}, chainName: "${chainData.chainName}" }`;
}).join(',\n');

const appHubAddress = `
/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const AppHubAddresses = { 
${appHubAddressEntries}
};
`;

fs.writeFileSync(path.join(outdir, "AppHubABI.ts"), appHubABI, "utf-8");
fs.writeFileSync(path.join(outdir, "AppHubAddresses.ts"), appHubAddress, "utf-8");

console.log(`✅ Generated AppHubABI.ts`);
console.log(`✅ Generated AppHubAddresses.ts`);

// ===================== Tokens =====================
console.log("\n🔄 Generating Tokens...");

const tokensFile = path.join(deploymentsDir, "tokens.json");
if (!fs.existsSync(tokensFile)) {
  console.error(`${line}Tokens deployment not found at ${tokensFile}${line}`);
  process.exit(1);
}

const tokensDeployment = JSON.parse(fs.readFileSync(tokensFile, "utf-8"));

// Generate MyTokenABI (chung cho tất cả tokens)
const myTokenABI = `
/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const MyTokenABI = ${JSON.stringify({ abi: tokensDeployment.abi }, null, 2)} as const;
`;

fs.writeFileSync(path.join(outdir, "MyTokenABI.ts"), myTokenABI, "utf-8");
console.log(`✅ Generated MyTokenABI.ts`);

// Generate TokenAddresses for all chains
// Expected format: { "10143": { chainId, chainName, tokens: [...] }, "11155111": {...}, abi: [...] }
const chains = Object.keys(tokensDeployment).filter(key => key !== 'abi');
console.log(`📦 Found ${chains.length} chain(s): ${chains.join(', ')}`);

const chainEntries = chains.map(chainId => {
  const chainData = tokensDeployment[chainId];
  const tokensMap = chainData.tokens.map(t => 
    `      ${t.symbol}: { name: "${t.name}", symbol: "${t.symbol}", address: "${t.address}" as const }`
  ).join(',\n');
  
  return `  "${chainId}": {
    chainId: ${chainData.chainId},
    chainName: "${chainData.chainName}",
    tokens: {
${tokensMap}
    }
  }`;
}).join(',\n');

const tokenAddresses = `
/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const TokenAddresses = {
${chainEntries}
};

// Helper to get token by symbol
export function getTokenAddress(chainId: number, symbol: string): string | undefined {
  const chain = TokenAddresses[chainId.toString() as keyof typeof TokenAddresses];
  if (!chain) return undefined;
  return chain.tokens[symbol as keyof typeof chain.tokens]?.address;
}

// Export list of all tokens on chain
export function getTokens(chainId: number) {
  const chain = TokenAddresses[chainId.toString() as keyof typeof TokenAddresses];
  if (!chain) return [];
  return Object.values(chain.tokens);
}
`;

fs.writeFileSync(path.join(outdir, "TokenAddresses.ts"), tokenAddresses, "utf-8");
console.log(`✅ Generated TokenAddresses.ts`);

// ===================== contracts.ts (tổng hợp) =====================
const contractsTs = `
/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
import { AppHubABI } from './AppHubABI';
import { AppHubAddresses } from './AppHubAddresses';
import { MyTokenABI } from './MyTokenABI';
import { TokenAddresses, getTokenAddress, getTokens } from './TokenAddresses';

// Export tất cả ABIs
export const ABIs = {
  AppHub: AppHubABI.abi,
  MyToken: MyTokenABI.abi,
};

// Export tất cả Addresses
export const Addresses = {
  AppHub: AppHubAddresses,
  Tokens: TokenAddresses,
};

// Export individual contracts
export { AppHubABI, AppHubAddresses };
export { MyTokenABI, TokenAddresses, getTokenAddress, getTokens };
`;

fs.writeFileSync(path.join(outdir, "contracts.ts"), contractsTs, "utf-8");

console.log(`\n🎉 All done! Generated files:`);
console.log(`   - AppHubABI.ts`);
console.log(`   - AppHubAddresses.ts`);
console.log(`   - MyTokenABI.ts`);
console.log(`   - TokenAddresses.ts`);
console.log(`   - contracts.ts (tổng hợp)`);

console.log(`\n📝 Usage example:`);
console.log(`   import { ABIs, Addresses, getTokens } from '@/abi/contracts';`);
console.log(`   const appHubABI = ABIs.AppHub;`);
console.log(`   const appHubAddress = Addresses.AppHub["10143"].address;`);
console.log(`   const tokens = getTokens(10143); // [{ name, symbol, address }, ...]`);


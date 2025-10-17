import hre from "hardhat";
import * as fs from "fs";
import * as path from "path";
const { ethers } = hre;

async function main() {
  console.log("🚀 Setting up faucet for AppHub...\n");

  // 1️⃣ Load deployments
  const tokensPath = path.join(__dirname, "../deployments/tokens.json");
  const apphubPath = path.join(__dirname, "../deployments/apphub.json");

  if (!fs.existsSync(tokensPath) || !fs.existsSync(apphubPath)) {
    throw new Error("❌ Missing tokens.json or apphub.json — deploy both first.");
  }

  const tokensData = JSON.parse(fs.readFileSync(tokensPath, "utf8"));
  const apphubData = JSON.parse(fs.readFileSync(apphubPath, "utf8"));

  // Get current chain ID
  const chainId = (await ethers.provider.getNetwork()).chainId.toString();
  
  if (!tokensData[chainId] || !apphubData[chainId]) {
    throw new Error(`❌ No deployment found for chain ${chainId} (${hre.network.name})`);
  }

  const appHubAddress = apphubData[chainId].address;
  console.log(`📍 AppHub address: ${appHubAddress} on chain ${chainId}\n`);

  const signer = (await ethers.getSigners())[0];
  const signerAddress = await signer.getAddress();
  console.log(`🧑‍💻 Using deployer: ${signerAddress}\n`);

  // 2️⃣ Prepare contracts
  const appHub = await ethers.getContractAt("AppHub", appHubAddress);

  // 3️⃣ Fund AppHub + register faucet tokens
  const faucetAmount = ethers.parseEther("100"); // mỗi lần claim
  const fundAmount = ethers.parseEther("100000"); // số token nạp vào faucet

  for (const tokenInfo of tokensData[chainId].tokens) {
    const tokenAddress = tokenInfo.address;
    console.log(`💧 Setting faucet for ${tokenInfo.symbol} (${tokenAddress})`);

    // Transfer token vào AppHub
    const token = await ethers.getContractAt("MyToken", tokenAddress);
    const txFund = await token.transfer(appHubAddress, fundAmount);
    const receiptFund = await txFund.wait();
    console.log(`   ✅ Funded ${ethers.formatEther(fundAmount)} ${tokenInfo.symbol}`);
    console.log(`      TX: ${receiptFund?.hash}`);

    // Add faucet token config
    const txAdd = await appHub.addFaucetToken(tokenAddress, faucetAmount);
    const receiptAdd = await txAdd.wait();
    console.log(`   🧩 Added faucet config: ${ethers.formatEther(faucetAmount)} ${tokenInfo.symbol} per claim`);
    console.log(`      TX: ${receiptAdd?.hash}\n`);
  }

  console.log("🎉 Faucet setup complete!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

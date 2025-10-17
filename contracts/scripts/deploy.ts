import hre from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  // @ts-ignore
  const ethers = hre.ethers;
  const MyToken = await ethers.getContractFactory("MyToken");
  
  // Define tokens to deploy
  const tokens = [
    { name: "USDC Token", symbol: "USDC", supply: ethers.parseEther("1000000") },      // 1M USDC
    { name: "Tether Token", symbol: "USDT", supply: ethers.parseEther("1000000") },    // 1M USDT
    { name: "Bitcoin", symbol: "BTC", supply: ethers.parseEther("1000000") },         // 1M BTC
    { name: "Ethereum", symbol: "ETH", supply: ethers.parseEther("1000000") },         // 1M ETH
  ];

  const deployments: any[] = [];

  console.log("🚀 Deploying tokens...\n");

  for (const tokenConfig of tokens) {
    console.log(`Deploying ${tokenConfig.symbol}...`);
    const token = await MyToken.deploy(
      tokenConfig.name,
      tokenConfig.symbol,
      tokenConfig.supply
    );
    await token.waitForDeployment();

    const address = await token.getAddress();
    console.log(`✅ ${tokenConfig.symbol} deployed to: ${address}`);
    console.log(`   Name: ${tokenConfig.name}`);
    console.log(`   Supply: ${ethers.formatEther(tokenConfig.supply)}\n`);

    deployments.push({
      name: tokenConfig.name,
      symbol: tokenConfig.symbol,
      address,
      supply: ethers.formatEther(tokenConfig.supply),
    });
  }

  // Save all deployments organized by network
  const outDir = path.join(__dirname, "../deployments");
  fs.mkdirSync(outDir, { recursive: true });
  
  const network = hre.network.name;
  const chainId = (await ethers.provider.getNetwork()).chainId;
  
  console.log(`📍 Network: ${network} (Chain ID: ${chainId})`);
  
  // Read existing deployments
  const tokensPath = path.join(outDir, "tokens.json");
  let existingData: any = {};
  
  if (fs.existsSync(tokensPath)) {
    try {
      existingData = JSON.parse(fs.readFileSync(tokensPath, "utf-8"));
    } catch (err) {
      console.log("⚠️ Could not read existing tokens.json, creating new file");
    }
  }
  
  // Update with new deployment for this chain
  existingData[chainId.toString()] = {
    chainId: Number(chainId),
    chainName: network,
    tokens: deployments,
  };
  
  // Save ABI separately (shared across all networks)
  existingData.abi = (await hre.artifacts.readArtifact("MyToken")).abi;
  
  fs.writeFileSync(
    tokensPath,
    JSON.stringify(existingData, null, 2)
  );

  console.log(`📝 Deployment info saved to deployments/tokens.json (Chain ID: ${chainId})`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import hre from "hardhat";
import * as fs from "fs";
import * as path from "path";
const { ethers } = hre;

async function main() {
  console.log("🚀 Deploying AppHub...\n");

  // 1️⃣ Deploy AppHub
  const AppHub = await ethers.getContractFactory("AppHub");
  const appHub = await AppHub.deploy();
  await appHub.waitForDeployment();

  const appHubAddress = await appHub.getAddress();
  console.log(`✅ AppHub deployed at: ${appHubAddress}`);

  // 2️⃣ Save deployment info organized by network
  const outDir = path.join(__dirname, "../deployments");
  fs.mkdirSync(outDir, { recursive: true });

  const network = hre.network.name;
  // @ts-ignore
  const chainId = (await ethers.provider.getNetwork()).chainId;

  console.log(`📍 Network: ${network} (Chain ID: ${chainId})`);

  // Read existing deployments
  const appHubPath = path.join(outDir, "apphub.json");
  let existingData: any = {};

  if (fs.existsSync(appHubPath)) {
    try {
      existingData = JSON.parse(fs.readFileSync(appHubPath, "utf-8"));
    } catch (err) {
      console.log("⚠️ Could not read existing apphub.json, creating new file");
    }
  }

  // Update with new deployment for this chain
  existingData[chainId.toString()] = {
    chainId: Number(chainId),
    chainName: network,
    address: appHubAddress,
  };

  // Save ABI separately (shared across all networks)
  existingData.abi = (await hre.artifacts.readArtifact("AppHub")).abi;

  fs.writeFileSync(
    appHubPath,
    JSON.stringify(existingData, null, 2)
  );

  console.log(`📝 Deployment info saved to deployments/apphub.json (Chain ID: ${chainId})`);
  console.log("🎉 Deployment complete!\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

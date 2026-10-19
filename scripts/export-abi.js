const fs = require("fs");
const path = require("path");

const CONTRACTS = ["UtilityToken", "CTFNFT"];
const ROOT = path.join(__dirname, "..");
const ARTIFACTS_DIR = path.join(ROOT, "artifacts", "contracts");
const OUT_DIR = path.join(ROOT, "abi");

function exportAbis() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const name of CONTRACTS) {
    const artifactPath = path.join(ARTIFACTS_DIR, `${name}.sol`, `${name}.json`);
    if (!fs.existsSync(artifactPath)) {
      throw new Error(
        `Artifact for ${name} not found at ${artifactPath}. Run 'npx hardhat compile' first.`
      );
    }
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const outPath = path.join(OUT_DIR, `${name}.json`);
    fs.writeFileSync(outPath, JSON.stringify(artifact.abi, null, 2) + "\n");
    console.log(`ABI exported -> abi/${name}.json`);
  }
}

module.exports = { exportAbis };

if (require.main === module) {
  exportAbis();
}

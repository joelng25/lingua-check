import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dist = join(root, "dist");
const releaseDir = join(root, "release");

if (!existsSync(dist)) {
  throw new Error("No existe la carpeta dist/. Ejecuta npm run build primero.");
}

const manifest = JSON.parse(readFileSync(join(dist, "manifest.json"), "utf8"));
const version = process.env.STORE_VERSION ?? manifest.version ?? "1.0.0";
const zipPath = join(releaseDir, `lingua-check-v${version}.zip`);

mkdirSync(releaseDir, { recursive: true });
if (existsSync(zipPath)) {
  rmSync(zipPath);
}

if (process.platform === "win32") {
  execSync(
    `powershell -NoProfile -Command "Compress-Archive -Path '${dist}\\*' -DestinationPath '${zipPath}' -Force"`,
    { stdio: "inherit" },
  );
} else {
  execSync(`zip -r "${zipPath}" .`, { stdio: "inherit", cwd: dist });
}

const sizeKb = Math.round(statSync(zipPath).size / 1024);
console.log(`\nPaquete listo: ${zipPath} (${sizeKb} KB)`);
console.log("Sube este ZIP en Chrome Web Store → Package → Upload new package");

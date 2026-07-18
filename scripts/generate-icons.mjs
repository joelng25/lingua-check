import { existsSync } from "node:fs";
import { mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const iconsDir = path.join(root, "src/icons");
const sourcePng = path.join(root, "assets/icon-source.png");

const sizes = [16, 48, 128];

await mkdir(iconsDir, { recursive: true });

if (!existsSync(sourcePng)) {
  console.error(`Missing ${sourcePng}. Place the brand icon there.`);
  process.exit(1);
}

/**
 * Resize with PowerShell + System.Drawing (available on Windows).
 * Falls back to copying the full-res source for 128 if resize fails.
 */
function resizeWithPowerShell(size, outPath) {
  const script = `
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile(${JSON.stringify(sourcePng)})
$bmp = New-Object System.Drawing.Bitmap ${size}, ${size}
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$g.Clear([System.Drawing.Color]::Transparent)
$g.DrawImage($img, 0, 0, ${size}, ${size})
$bmp.Save(${JSON.stringify(outPath)}, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose(); $img.Dispose()
`;
  const result = spawnSync("powershell", ["-NoProfile", "-Command", script], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "PowerShell resize failed");
  }
}

for (const size of sizes) {
  const outPath = path.join(iconsDir, `icon${size}.png`);
  try {
    resizeWithPowerShell(size, outPath);
  } catch (error) {
    if (size === 128) {
      await copyFile(sourcePng, outPath);
    } else {
      throw error;
    }
  }
}

// Also keep a copy referenced for store screenshots / docs if needed
const brandCopy = path.join(iconsDir, "icon-brand.png");
await copyFile(sourcePng, brandCopy);

console.log("Icons generated from assets/icon-source.png");

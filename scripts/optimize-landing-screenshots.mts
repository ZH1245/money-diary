/**
 * Converts captured PNG landing screenshots to WebP + responsive srcset variants.
 *
 * Input:  `{feature}-{viewport}-{themeSlug}.png` from `pnpm capture:landing`
 * Output: `{feature}-{viewport}-{themeSlug}.webp` (max width)
 *         `{feature}-{viewport}-{themeSlug}-{width}.webp` (smaller variants)
 *
 * Desktop: 1280×800 (base) + 768×480
 * Mobile:  390×844 (base) + 240×519
 *
 * Source PNGs are deleted after conversion. Requires `cwebp` on PATH.
 *
 * Usage: pnpm optimize:landing
 */
import { execFile } from "node:child_process";
import { readdir, rename, unlink } from "node:fs/promises";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const OUT_DIR = join(__dirname, "../public/landing");
const QUALITY = "82";

/** Keep in sync with `LANDING_SCREENSHOT_WIDTHS` in landing-screenshots.ts */
const DESKTOP_VARIANTS = [
	{ width: 1280, height: 800, suffix: "" },
	{ width: 768, height: 480, suffix: "-768" },
] as const;

const MOBILE_VARIANTS = [
	{ width: 390, height: 844, suffix: "" },
	{ width: 240, height: 519, suffix: "-240" },
] as const;

interface VariantSpec {
	width: number;
	height: number;
	suffix: string;
}

const CANONICAL_PNG =
	/^[a-z0-9-]+-(desktop|mobile)-(calm|aurora)-(light|dark)\.png$/;

function isCanonicalPng(filename: string): boolean {
	return CANONICAL_PNG.test(filename);
}

function variantsForFilename(filename: string): VariantSpec[] | null {
	if (filename.includes("-desktop-")) {
		return [...DESKTOP_VARIANTS];
	}
	if (filename.includes("-mobile-")) {
		return [...MOBILE_VARIANTS];
	}
	return null;
}

function webpOutputPath(pngPath: string, suffix: string): string {
	const base = pngPath.replace(/\.png$/, "");
	return `${base}${suffix}.webp`;
}

/** Encodes a resized WebP from a PNG source. */
async function writeVariant(
	sourcePath: string,
	targetPath: string,
	spec: VariantSpec,
) {
	const tmpPath = `${targetPath}.tmp.webp`;
	await execFileAsync("cwebp", [
		"-resize",
		String(spec.width),
		String(spec.height),
		sourcePath,
		"-o",
		tmpPath,
		"-q",
		QUALITY,
	]);
	await rename(tmpPath, targetPath);
}

async function main() {
	const pngFiles = (await readdir(OUT_DIR))
		.filter((name) => name.endsWith(".png"))
		.filter(isCanonicalPng);

	if (pngFiles.length === 0) {
		console.log("No canonical PNG screenshots found — run `pnpm capture:landing` first.");
		return;
	}

	let written = 0;

	for (const filename of pngFiles.sort()) {
		const variants = variantsForFilename(filename);
		if (!variants) {
			continue;
		}

		const sourcePath = join(OUT_DIR, filename);
		console.log(`  ${basename(filename)}`);

		for (const variant of variants) {
			const targetPath = webpOutputPath(sourcePath, variant.suffix);
			const label = variant.suffix ? variant.suffix.slice(1) : "base";
			console.log(`    → ${label} (${variant.width}×${variant.height})`);
			await writeVariant(sourcePath, targetPath, variant);
			written += 1;
		}

		await unlink(sourcePath);
		console.log("    ✓ removed PNG");
	}

	console.log(`\nWrote ${written} WebP variants in ${OUT_DIR}`);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});

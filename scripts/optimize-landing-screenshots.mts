/**
 * Resizes landing screenshots to 1× viewport dimensions for faster LCP.
 *
 * Desktop: 1280×800 · Mobile: 390×844
 * Requires `cwebp` on PATH (ships with libwebp).
 *
 * Usage: pnpm optimize:landing
 */
import { execFile } from "node:child_process";
import { readdir, rename, unlink } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const OUT_DIR = join(__dirname, "../public/landing");
const QUALITY = "82";

interface ResizeSpec {
	width: number;
	height: number;
}

function resizeForFilename(filename: string): ResizeSpec | null {
	if (filename.includes("-desktop-")) {
		return { width: 1280, height: 800 };
	}
	if (filename.includes("-mobile-")) {
		return { width: 390, height: 844 };
	}
	return null;
}

/** Re-encodes a WebP at the target pixel size via a temp file. */
async function resizeWebp(filePath: string, spec: ResizeSpec) {
	const tmpPath = `${filePath}.tmp.webp`;
	await execFileAsync("cwebp", [
		"-resize",
		String(spec.width),
		String(spec.height),
		filePath,
		"-o",
		tmpPath,
		"-q",
		QUALITY,
	]);
	await unlink(filePath);
	await rename(tmpPath, filePath);
}

async function main() {
	const files = (await readdir(OUT_DIR)).filter((name) => name.endsWith(".webp"));
	let optimized = 0;

	for (const filename of files.sort()) {
		const spec = resizeForFilename(filename);
		if (!spec) {
			continue;
		}

		const filePath = join(OUT_DIR, filename);
		console.log(`  ${filename} → ${spec.width}×${spec.height}`);
		await resizeWebp(filePath, spec);
		optimized += 1;
	}

	console.log(`\nOptimized ${optimized} landing screenshots in ${OUT_DIR}`);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});

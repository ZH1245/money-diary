import { Check } from "lucide-react";
import {
	type ThemeMode,
	type ThemePalette,
	useTheme,
} from "#/components/layout/theme-provider";

/**
 * Interactive themes showcase — each card renders a mini dashboard preview using
 * the palette's real hex values (mirrors styles.css). Clicking a card applies
 * that palette + mode live to the whole page via the ThemeProvider.
 */

interface ThemePreview {
	name: string;
	mode: string;
	palette: ThemePalette;
	themeMode: ThemeMode;
	canvas: string;
	panel: string;
	border: string;
	fg: string;
	muted: string;
	accent: string;
	accentOn: string;
	income: string;
	expense: string;
}

const THEMES: ThemePreview[] = [
	{
		name: "Calm",
		mode: "Light",
		palette: "c",
		themeMode: "light",
		canvas: "#f4f3ef",
		panel: "#fcfcfa",
		border: "#e7e7e1",
		fg: "#15201a",
		muted: "#9aa09a",
		accent: "#1f6b4a",
		accentOn: "#f0f4f1",
		income: "#1f6b4a",
		expense: "#b0473d",
	},
	{
		name: "Calm",
		mode: "Dark",
		palette: "c",
		themeMode: "dark",
		canvas: "#141714",
		panel: "#1a1e1a",
		border: "#2a2f2a",
		fg: "#eaf0ea",
		muted: "#7d847d",
		accent: "#3a9b6f",
		accentOn: "#0c130f",
		income: "#4fc18c",
		expense: "#e07a6f",
	},
	{
		name: "Aurora",
		mode: "Light",
		palette: "a",
		themeMode: "light",
		canvas: "#f5f5f7",
		panel: "#ffffff",
		border: "#ececef",
		fg: "#16161c",
		muted: "#9a9aa4",
		accent: "#4f46e5",
		accentOn: "#ffffff",
		income: "#1f9d5b",
		expense: "#d4493f",
	},
	{
		name: "Aurora",
		mode: "Dark",
		palette: "a",
		themeMode: "dark",
		canvas: "#0e0e12",
		panel: "#16161c",
		border: "#26262e",
		fg: "#f2f2f5",
		muted: "#7a7a85",
		accent: "#6c63ff",
		accentOn: "#ffffff",
		income: "#34d680",
		expense: "#f06a5d",
	},
];

const PREVIEW_BARS = [60, 85, 45, 70, 55];

function ThemeCard({
	theme,
	active,
	onSelect,
}: {
	theme: ThemePreview;
	active: boolean;
	onSelect: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onSelect}
			aria-pressed={active}
			className={`group block overflow-hidden rounded-panel border bg-card text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
				active
					? "border-primary ring-2 ring-primary/40"
					: "border-border hover:border-primary/40"
			}`}
		>
			{/* Mini preview rendered with the theme's own colors */}
			<div className="p-3" style={{ backgroundColor: theme.canvas }}>
				<div
					className="rounded-xl p-3"
					style={{
						backgroundColor: theme.panel,
						border: `1px solid ${theme.border}`,
					}}
				>
					<div className="flex items-center justify-between">
						<span
							className="text-[9px] font-semibold uppercase tracking-wide"
							style={{ color: theme.muted }}
						>
							Total balance
						</span>
						<span
							className="size-4 rounded-md"
							style={{ backgroundColor: theme.accent }}
						/>
					</div>
					<p
						className="mt-1.5 font-num text-lg font-extrabold tracking-tight"
						style={{ color: theme.fg }}
					>
						$24,858
					</p>

					{/* Mini bar chart */}
					<div className="mt-3 flex h-10 items-end gap-1.5">
						{PREVIEW_BARS.map((h, i) => (
							<div
								// biome-ignore lint/suspicious/noArrayIndexKey: static demo bars
								key={i}
								className="min-h-[2px] flex-1 rounded-t-[3px]"
								style={{ height: `${h}%`, backgroundColor: theme.accent }}
							/>
						))}
					</div>

					{/* Income / expense chips */}
					<div className="mt-3 flex items-center gap-1.5">
						<span
							className="rounded-md px-1.5 py-0.5 font-num text-[9px] font-bold"
							style={{
								color: theme.income,
								backgroundColor: `${theme.income}1f`,
							}}
						>
							+$5.4k
						</span>
						<span
							className="rounded-md px-1.5 py-0.5 font-num text-[9px] font-bold"
							style={{
								color: theme.expense,
								backgroundColor: `${theme.expense}1f`,
							}}
						>
							-$2.1k
						</span>
						<span
							className="ml-auto rounded-md px-2 py-0.5 text-[9px] font-bold"
							style={{ backgroundColor: theme.accent, color: theme.accentOn }}
						>
							Add
						</span>
					</div>
				</div>
			</div>

			{/* Label */}
			<div className="flex items-center justify-between px-3 py-2.5">
				<span className="text-sm font-semibold text-foreground">
					{theme.name}
				</span>
				{active ? (
					<span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
						<Check className="size-3" /> Active
					</span>
				) : (
					<span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors group-hover:text-foreground">
						{theme.mode} · Try it
					</span>
				)}
			</div>
		</button>
	);
}

export function ThemesShowcase() {
	const { palette, mode, setPalette, setMode } = useTheme();

	return (
		<section className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-24">
			<div className="mb-10 text-center">
				<h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
					Make it yours
				</h2>
				<p className="mx-auto mt-3 max-w-lg text-muted-foreground">
					Two hand-crafted palettes — Calm and Aurora — each in light and dark.
					<span className="font-medium text-foreground">
						{" "}
						Tap any theme to preview it live
					</span>{" "}
					across this whole page.
				</p>
			</div>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{THEMES.map((theme) => (
					<ThemeCard
						key={`${theme.name}-${theme.mode}`}
						theme={theme}
						active={palette === theme.palette && mode === theme.themeMode}
						onSelect={() => {
							setPalette(theme.palette);
							setMode(theme.themeMode);
						}}
					/>
				))}
			</div>
		</section>
	);
}

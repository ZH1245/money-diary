import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

/** Color palette: C is the calm green default, A is the indigo alternative. */
export type ThemePalette = "c" | "a";
/** Light / dark mode, applied via the `.dark` class on <html>. */
export type ThemeMode = "light" | "dark";

const PALETTE_KEY = "md-theme";
const MODE_KEY = "md-mode";

/** Canvas hex per palette × mode, used for the `theme-color` meta tag. */
const THEME_COLOR_MAP: Record<ThemePalette, Record<ThemeMode, string>> = {
	c: { light: "#f5f5f4", dark: "#1b1d1b" },
	a: { light: "#f5f5f7", dark: "#0e0e12" },
};

interface ThemeContextValue {
	palette: ThemePalette;
	mode: ThemeMode;
	isDark: boolean;
	setPalette: (palette: ThemePalette) => void;
	setMode: (mode: ThemeMode) => void;
	toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readPalette(): ThemePalette {
	if (typeof window === "undefined") return "c";
	return window.localStorage.getItem(PALETTE_KEY) === "a" ? "a" : "c";
}

function readMode(): ThemeMode {
	if (typeof window === "undefined") return "light";
	const stored = window.localStorage.getItem(MODE_KEY);
	if (stored === "dark" || stored === "light") return stored;
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

function applyToDocument(palette: ThemePalette, mode: ThemeMode) {
	const root = document.documentElement;
	root.setAttribute("data-theme", palette);
	root.classList.toggle("dark", mode === "dark");
	document
		.querySelector('meta[name="theme-color"]')
		?.setAttribute("content", THEME_COLOR_MAP[palette][mode]);
}

/**
 * Provides the two-axis theme (palette C/A + light/dark mode), persists both to
 * localStorage, and reflects them onto <html> as `data-theme` + the `.dark` class.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
	const [palette, setPaletteState] = useState<ThemePalette>(readPalette);
	const [mode, setModeState] = useState<ThemeMode>(readMode);

	useEffect(() => {
		applyToDocument(palette, mode);
		window.localStorage.setItem(PALETTE_KEY, palette);
		window.localStorage.setItem(MODE_KEY, mode);
	}, [palette, mode]);

	const setPalette = useCallback(
		(next: ThemePalette) => setPaletteState(next),
		[],
	);
	const setMode = useCallback((next: ThemeMode) => setModeState(next), []);
	const toggleMode = useCallback(
		() => setModeState((prev) => (prev === "dark" ? "light" : "dark")),
		[],
	);

	const value = useMemo<ThemeContextValue>(
		() => ({
			palette,
			mode,
			isDark: mode === "dark",
			setPalette,
			setMode,
			toggleMode,
		}),
		[palette, mode, setPalette, setMode, toggleMode],
	);

	return (
		<ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
	);
}

/** Access the active palette/mode and setters. Must be used within <ThemeProvider>. */
export function useTheme(): ThemeContextValue {
	const context = useContext(ThemeContext);
	if (!context) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}
	return context;
}

/** Inline script (runs before paint) that applies the persisted theme to avoid a flash. */
export const themeNoFlashScript = `(function(){try{var p=localStorage.getItem('${PALETTE_KEY}');var m=localStorage.getItem('${MODE_KEY}');if(!m){m=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}var r=document.documentElement;var pal=p==='a'?'a':'c';r.setAttribute('data-theme',pal);r.classList.toggle('dark',m==='dark');var colors={c:{light:'#f5f5f4',dark:'#1b1d1b'},a:{light:'#f5f5f7',dark:'#0e0e12'}};var meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute('content',colors[pal][m==='dark'?'dark':'light'])}catch(e){}})();`;

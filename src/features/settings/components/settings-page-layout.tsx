import {
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { cn } from "#/lib/utils";

export interface SettingsNavGroup {
	label: string;
	items: SettingsNavItem[];
}

export interface SettingsNavItem {
	id: string;
	label: string;
	title: string;
	description?: string;
}

interface SettingsPageLayoutProps {
	groups: SettingsNavGroup[];
	children: (item: SettingsNavItem) => ReactNode;
	/** Small caps label above the active section title. */
	pageLabel?: string;
	/** Optional context shown under the active section description. */
	pageNote?: string;
	navAriaLabel?: string;
}

const SCROLL_TOP_OFFSET = 128;

/**
 * Finds the app shell scroll container for settings section navigation.
 */
function getScrollParent(node: HTMLElement | null): HTMLElement | null {
	const marked = node?.closest("[data-app-scroll-root]");
	if (marked instanceof HTMLElement) {
		return marked;
	}

	let parent = node?.parentElement ?? null;

	while (parent) {
		const { overflowY } = window.getComputedStyle(parent);
		if (
			overflowY === "auto" ||
			overflowY === "scroll" ||
			overflowY === "overlay"
		) {
			return parent;
		}
		parent = parent.parentElement;
	}

	return null;
}

/**
 * Scrolls a section into view inside the app shell scroll container only.
 * Avoids scrollIntoView, which can scroll nested containers and cause double scrollbars.
 */
function scrollSectionIntoView(
	section: HTMLElement,
	scrollParent: HTMLElement,
	topOffset = SCROLL_TOP_OFFSET,
) {
	const sectionTop = section.getBoundingClientRect().top;
	const parentTop = scrollParent.getBoundingClientRect().top;
	const nextScrollTop =
		scrollParent.scrollTop + (sectionTop - parentTop) - topOffset;

	scrollParent.scrollTo({
		top: Math.max(0, nextScrollTop),
		behavior: "smooth",
	});
}

/**
 * Settings shell with section nav; scrolls to sections and tracks position while scrolling.
 */
export function SettingsPageLayout({
	groups,
	children,
	pageLabel = "Settings",
	pageNote,
	navAriaLabel = "Settings sections",
}: SettingsPageLayoutProps) {
	const items = groups.flatMap((group) => group.items);
	const [activeId, setActiveId] = useState(items[0]?.id ?? "");
	const contentRef = useRef<HTMLDivElement>(null);
	const scrollParentRef = useRef<HTMLElement | null>(null);
	const sectionRefs = useRef(new Map<string, HTMLElement>());
	const isJumpScrollingRef = useRef(false);

	const activeItem = items.find((item) => item.id === activeId) ?? items[0];

	const registerSection = useCallback(
		(id: string, node: HTMLElement | null) => {
			if (node) {
				sectionRefs.current.set(id, node);
				return;
			}
			sectionRefs.current.delete(id);
		},
		[],
	);

	useEffect(() => {
		scrollParentRef.current = getScrollParent(contentRef.current);
	}, []);

	useEffect(() => {
		const scrollParent = scrollParentRef.current;
		if (!scrollParent) {
			return;
		}

		const sections = items
			.map((item) => sectionRefs.current.get(item.id))
			.filter((node): node is HTMLElement => Boolean(node));

		if (sections.length === 0) {
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				if (isJumpScrollingRef.current) {
					return;
				}

				const visible = entries
					.filter((entry) => entry.isIntersecting)
					.sort(
						(left, right) => right.intersectionRatio - left.intersectionRatio,
					);

				const topMatch = visible[0];
				if (topMatch?.target.id) {
					setActiveId(topMatch.target.id);
				}
			},
			{
				root: scrollParent,
				rootMargin: `-${SCROLL_TOP_OFFSET}px 0px -55% 0px`,
				threshold: [0, 0.15, 0.35, 0.55, 0.75, 1],
			},
		);

		for (const section of sections) {
			observer.observe(section);
		}

		return () => observer.disconnect();
	}, [items]);

	function handleNavClick(item: SettingsNavItem) {
		const section = sectionRefs.current.get(item.id);
		const scrollParent = scrollParentRef.current;

		setActiveId(item.id);

		if (!section || !scrollParent) {
			return;
		}

		isJumpScrollingRef.current = true;
		scrollSectionIntoView(section, scrollParent);

		window.setTimeout(() => {
			isJumpScrollingRef.current = false;
		}, 500);
	}

	return (
		<div
			ref={contentRef}
			className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8"
		>
			<aside className="sticky top-0 z-20 -mx-4 w-[calc(100%+2rem)] shrink-0 self-start bg-canvas px-4 pt-3 lg:top-6 lg:z-auto lg:mx-0 lg:w-56 lg:bg-transparent lg:px-0 lg:pt-0">
				<nav aria-label={navAriaLabel} className="border-b border-border-faint pb-2 lg:border-0 lg:pb-0">
					<div className="flex flex-col gap-3 pb-1 lg:gap-4 lg:pb-0">
						{groups.map((group) => (
							<div key={group.label} className="min-w-0">
								<p className="px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
									{group.label}
								</p>
								<ul className="mt-1 flex flex-col gap-0.5">
									{group.items.map((item) => {
										const isActive = item.id === activeId;
										return (
											<li key={item.id}>
												<button
													type="button"
													onClick={() => handleNavClick(item)}
													aria-current={isActive ? "true" : undefined}
													className={cn(
														"w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
														isActive
															? "bg-soft-accent text-nav-active-fg font-bold"
															: "text-muted-foreground hover:bg-row-hover hover:text-foreground",
													)}
												>
													{item.label}
												</button>
											</li>
										);
									})}
								</ul>
							</div>
						))}
					</div>
				</nav>
			</aside>

			<div className="min-w-0 flex-1">
				<header className="-mx-1 border-b border-border-faint px-1 py-4 lg:sticky lg:top-0 lg:z-10 lg:bg-canvas/95 lg:backdrop-blur lg:supports-backdrop-filter:bg-canvas/85">
					<p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
						{pageLabel}
					</p>
					<h1 className="display-title mt-1 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
						{activeItem?.title}
					</h1>
					{activeItem?.description ? (
						<p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
							{activeItem.description}
						</p>
					) : null}
					{pageNote ? (
						<p className="mt-2 max-w-2xl text-xs text-muted-foreground/90">
							{pageNote}
						</p>
					) : null}
				</header>

				<div className="space-y-8 pt-6">
					{items.map((item) => (
						<section
							key={item.id}
							id={item.id}
							ref={(node) => registerSection(item.id, node)}
							className="scroll-mt-32"
							aria-label={item.title}
						>
							{children(item)}
						</section>
					))}
				</div>
			</div>
		</div>
	);
}

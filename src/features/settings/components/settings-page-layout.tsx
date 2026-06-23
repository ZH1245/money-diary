import { cn } from '#/lib/utils'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

export interface SettingsNavGroup {
  label: string
  items: SettingsNavItem[]
}

export interface SettingsNavItem {
  id: string
  label: string
  title: string
  description?: string
}

interface SettingsPageLayoutProps {
  groups: SettingsNavGroup[]
  children: (item: SettingsNavItem) => ReactNode
}

/**
 * Settings shell with section nav and a sticky title that tracks scroll position.
 */
export function SettingsPageLayout({ groups, children }: SettingsPageLayoutProps) {
  const items = groups.flatMap((group) => group.items)
  const [activeId, setActiveId] = useState(items[0]?.id ?? '')
  const sectionRefs = useRef(new Map<string, HTMLElement>())
  const isJumpScrollingRef = useRef(false)

  const activeItem = items.find((item) => item.id === activeId) ?? items[0]

  const registerSection = useCallback((id: string, node: HTMLElement | null) => {
    if (node) {
      sectionRefs.current.set(id, node)
      return
    }
    sectionRefs.current.delete(id)
  }, [])

  useEffect(() => {
    const sections = items
      .map((item) => sectionRefs.current.get(item.id))
      .filter((node): node is HTMLElement => Boolean(node))

    if (sections.length === 0) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (isJumpScrollingRef.current) {
          return
        }

        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)

        const topMatch = visible[0]
        if (topMatch?.target.id) {
          setActiveId(topMatch.target.id)
        }
      },
      {
        root: null,
        rootMargin: '-120px 0px -55% 0px',
        threshold: [0, 0.15, 0.35, 0.55, 0.75, 1],
      },
    )

    for (const section of sections) {
      observer.observe(section)
    }

    return () => observer.disconnect()
  }, [items])

  function handleNavClick(item: SettingsNavItem) {
    const section = sectionRefs.current.get(item.id)
    if (!section) {
      setActiveId(item.id)
      return
    }

    setActiveId(item.id)
    isJumpScrollingRef.current = true
    section.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.setTimeout(() => {
      isJumpScrollingRef.current = false
    }, 500)
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
      <aside className="lg:w-56 lg:shrink-0">
        <nav
          aria-label="Settings sections"
          className="lg:sticky lg:top-0 lg:max-h-[calc(100svh-5rem)] lg:overflow-y-auto lg:pr-2"
        >
          <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {groups.map((group) => (
              <div key={group.label} className="min-w-0 shrink-0 lg:shrink">
                <p className="hidden px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground lg:block">
                  {group.label}
                </p>
                <ul className="mt-1 flex gap-1 lg:mt-2 lg:flex-col lg:gap-0.5">
                  {group.items.map((item) => {
                    const isActive = item.id === activeId
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => handleNavClick(item)}
                          aria-current={isActive ? 'true' : undefined}
                          className={cn(
                            'w-full rounded-md px-3 py-2 text-left text-sm font-medium whitespace-nowrap transition-colors lg:whitespace-normal',
                            isActive
                              ? 'bg-accent text-accent-foreground'
                              : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                          )}
                        >
                          {item.label}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 -mx-1 border-b border-border/80 bg-background/95 px-1 py-4 backdrop-blur supports-backdrop-filter:bg-background/85">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Settings</p>
          <h1 className="display-title mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
            {activeItem?.title}
          </h1>
          {activeItem?.description ? (
            <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{activeItem.description}</p>
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
  )
}

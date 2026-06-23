import { Button } from '#/components/ui/button'
import { toolbarExpandableButtonClass } from '#/components/layout/toolbar-control-styles'
import { ToolbarTooltip } from '#/components/layout/toolbar-tooltip'
import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

type ThemeMode = 'light' | 'dark'

/**
 * Reads and persists light/dark theme on the root html element.
 */
export function useThemeMode() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'light'
    const stored = window.localStorage.getItem('theme')
    if (stored === 'dark' || stored === 'light') return stored
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    window.localStorage.setItem('theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme((previous) => (previous === 'dark' ? 'light' : 'dark'))
  }

  return {
    theme,
    isDark: theme === 'dark',
    toggleTheme,
  }
}

/**
 * Toggles persisted light/dark mode by updating the root html class.
 */
export function ThemeToggle() {
  const { isDark, toggleTheme } = useThemeMode()

  const tooltipLabel = isDark ? 'Switch to light mode' : 'Switch to dark mode'

  return (
    <ToolbarTooltip label={tooltipLabel}>
      <Button
        type="button"
        variant="ghost"
        className={toolbarExpandableButtonClass}
        onClick={toggleTheme}
        aria-label={tooltipLabel}
      >
        {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        <span className="hidden xl:inline">{isDark ? 'Light' : 'Dark'}</span>
      </Button>
    </ToolbarTooltip>
  )
}

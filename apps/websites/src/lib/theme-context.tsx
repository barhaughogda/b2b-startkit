"use client"

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  systemTheme: 'light' | 'dark'
  isSystemTheme: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ZentheaThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

export function ZentheaThemeProvider({ 
  children, 
  defaultTheme = 'light',
  storageKey = 'zenthea-theme'
}: ZentheaThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme)
  const [mounted, setMounted] = useState(false)
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light')

  // Detect system theme preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const updateSystemTheme = () => {
      setSystemTheme(mediaQuery.matches ? 'dark' : 'light')
    }
    
    updateSystemTheme()
    mediaQuery.addEventListener('change', updateSystemTheme)
    
    return () => mediaQuery.removeEventListener('change', updateSystemTheme)
  }, [])

  // Load theme from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(storageKey) as Theme
    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      setThemeState(stored)
    }
    setMounted(true)
  }, [storageKey])

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return

    const root = document.documentElement
    
    // Remove all theme classes and attributes
    root.classList.remove('light', 'dark')
    root.removeAttribute('data-theme')
    
    let activeTheme = theme
    
    if (theme === 'system') {
      activeTheme = systemTheme
    }
    
    root.classList.add(activeTheme)
    root.setAttribute('data-theme', activeTheme)
    
    // Store in localStorage
    localStorage.setItem(storageKey, theme)
  }, [theme, systemTheme, mounted, storageKey])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark')
    } else if (theme === 'dark') {
      setTheme('system')
    } else {
      setTheme('light')
    }
  }

  const isSystemTheme = theme === 'system'

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      setTheme, 
      toggleTheme, 
      systemTheme, 
      isSystemTheme 
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ZentheaThemeProvider')
  }
  return context
}

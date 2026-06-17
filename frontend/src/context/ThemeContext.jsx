import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const savedSettings = localStorage.getItem('userSettings')
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings)
      return parsed.theme || 'dark'
    }
    return 'dark'
  })

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme')
    } else {
      document.body.classList.remove('light-theme')
    }
  }, [theme])

  const toggleTheme = (newTheme) => {
    setTheme(newTheme)
    // Also persist in userSettings
    const savedSettings = localStorage.getItem('userSettings')
    const settings = savedSettings ? JSON.parse(savedSettings) : {}
    settings.theme = newTheme
    localStorage.setItem('userSettings', JSON.stringify(settings))
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

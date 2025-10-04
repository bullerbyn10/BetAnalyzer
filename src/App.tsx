import { useState, useEffect, Suspense, lazy } from 'react'
import { supabase } from './utils/supabaseClient'
import { Navbar } from './components/Navbar'
import { HomePage } from './components/HomePage'
import { AuthPage } from './components/AuthPage'
import { ValueScanner } from './components/ValueScanner'
import { PlayerProps } from './components/PlayerProps'
import logo from 'figma:asset/2baabe9337150f4abb4b142bfefb95f7c18beea9.png'
import favicon from 'figma:asset/d2761638ecf9ec098786f2252b32e723fa1a6ef7.png'

// Lazy load the heavy OddsAnalysis component
const OddsAnalysis = lazy(() => import('./components/OddsAnalysis').then(module => ({ default: module.OddsAnalysis })))

export default function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'analysis' | 'auth' | 'value-scanner' | 'player-props'>('home')
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Set page title and favicon
    document.title = 'BetAnalyzer'
    
    // Update favicon
    let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']")
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = favicon

    // Check for existing session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null)
        setLoading(false)
      })
      .catch((error) => {
        console.error('Error getting session:', error)
        setLoading(false)
      })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="dark">
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
          <div className="text-center">
            <img src={logo} alt="BetAnalyzer Logo" className="w-16 h-16 mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dark">
      <div className="min-h-screen bg-background text-foreground">
        <Navbar currentPage={currentPage} onNavigate={setCurrentPage} user={user} />
        
        {currentPage === 'home' && <HomePage onNavigate={setCurrentPage} />}
        {currentPage === 'auth' && <AuthPage onNavigate={setCurrentPage} />}
        {currentPage === 'analysis' && (
          <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center">
              <div className="text-center">
                <p className="text-muted-foreground">Loading Odds Analysis...</p>
              </div>
            </div>
          }>
            <OddsAnalysis />
          </Suspense>
        )}
        {currentPage === 'value-scanner' && <ValueScanner />}
        {currentPage === 'player-props' && <PlayerProps />}
      </div>
    </div>
  )
}
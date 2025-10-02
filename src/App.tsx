import { useState, useEffect } from 'react'
import { supabase } from './utils/supabaseClient'
import { Navbar } from './components/Navbar'
import { HomePage } from './components/HomePage'
import { AuthPage } from './components/AuthPage'
import { OddsAnalysis } from './components/OddsAnalysis'
import { ValueScanner } from './components/ValueScanner'
import { PlayerProps } from './components/PlayerProps'
import logo from 'figma:asset/2baabe9337150f4abb4b142bfefb95f7c18beea9.png'

export default function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'analysis' | 'auth' | 'value-scanner' | 'player-props'>('home')
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
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
        {currentPage === 'analysis' && <OddsAnalysis />}
        {currentPage === 'value-scanner' && <ValueScanner />}
        {currentPage === 'player-props' && <PlayerProps />}
      </div>
    </div>
  )
}
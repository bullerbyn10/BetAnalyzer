import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { supabase } from '../utils/supabaseClient'
import logo from 'figma:asset/2baabe9337150f4abb4b142bfefb95f7c18beea9.png'

interface NavbarProps {
  currentPage: 'home' | 'analysis' | 'auth' | 'value-scanner' | 'player-props'
  onNavigate: (page: 'home' | 'analysis' | 'auth' | 'value-scanner' | 'player-props') => void
  user: any
}

export function Navbar({ currentPage, onNavigate, user }: NavbarProps) {
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    onNavigate('home')
  }

  return (
    <header className="border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('home')}>
            <img src={logo} alt="BetAnalyzer Logo" className="w-10 h-10" />
            <div>
              <h1 className="text-lg font-semibold">BetAnalyzer</h1>
              <p className="text-xs text-muted-foreground">Advanced Betting Analysis</p>
            </div>
          </div>
          
          <nav className="flex items-center gap-1">
            <Button
              variant={currentPage === 'home' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onNavigate('home')}
            >
              Home
            </Button>
            <Button
              variant={currentPage === 'analysis' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onNavigate('analysis')}
            >
              Odds Analysis
            </Button>
            <Button
              variant={currentPage === 'value-scanner' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onNavigate('value-scanner')}
            >
              Value Scanner
            </Button>
            <Button
              variant={currentPage === 'player-props' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onNavigate('player-props')}
            >
              Player Props
            </Button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <div className="text-sm text-muted-foreground">
                {user.email}
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-green-400 border-green-400">
                  Premium Analytics
                </Badge>
              </div>
              <Button variant="outline" size="sm" onClick={() => onNavigate('auth')}>
                Login
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
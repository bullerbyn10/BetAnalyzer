import { Card } from './ui/card'
import { Construction } from 'lucide-react'

export function ValueScanner() {
  return (
    <div className="min-h-[calc(100vh-80px)] bg-background flex items-center justify-center p-6">
      <Card className="p-12 max-w-2xl text-center space-y-6">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <Construction className="w-10 h-10 text-primary" />
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-bold">Value Scanner</h1>
          <p className="text-lg text-muted-foreground">
            This feature is currently under development
          </p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            The Value Scanner will automatically identify betting opportunities where the calculated true odds 
            differ significantly from bookmaker odds, helping you find the best value bets across multiple markets.
          </p>
        </div>
        <div className="pt-4">
          <div className="inline-block px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-sm text-yellow-500">🚧 Coming Soon</p>
          </div>
        </div>
      </Card>
    </div>
  )
}

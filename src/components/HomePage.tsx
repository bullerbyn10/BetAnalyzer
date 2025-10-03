import { Card } from './ui/card'
import { BarChart3, TrendingUp, Target, Shield, Mail, FileText } from 'lucide-react'
import { Separator } from './ui/separator'

interface HomePageProps {
  onNavigate: (page: 'analysis' | 'auth') => void
}

export function HomePage({ onNavigate }: HomePageProps) {
  return (
    <div className="min-h-[calc(100vh-80px)] bg-background">
      {/* About Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-[48px]">Welcome to BetAnalyzer</h2>
            <p className="text-lg text-muted-foreground">
              Our platform is built for bettors who understand that long-term success requires more than gut feeling. 
              We provide the analytical tools and data you need to make evidence-based decisions.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6 space-y-3">
              <h3 className="font-semibold">Data-Driven Approach</h3>
              <p className="text-sm text-muted-foreground">
                Every prediction is backed by statistical models including Poisson distributions, 
                moving averages, and historical performance metrics across 30+ match samples.
              </p>
            </Card>
            
            <Card className="p-6 space-y-3">
              <h3 className="font-semibold">Professional Tools</h3>
              <p className="text-sm text-muted-foreground">
                Access the same analytical frameworks used by professional betting syndicates, 
                including true odds calculation, Hit Rate Tracking, form analysis and outlier smoothing.
              </p>
            </Card>
            
            <Card className="p-6 space-y-3">
              <h3 className="font-semibold">Multi-League Coverage</h3>
              <p className="text-sm text-muted-foreground">
                Comprehensive data from Premier League, La Liga, Bundesliga, Serie A, and Championship 
                with season-by-season historical analysis.
              </p>
            </Card>
            
            <Card className="p-6 space-y-3">
              <h3 className="font-semibold">Customizable Analysis</h3>
              <p className="text-sm text-muted-foreground">
                Fine-tune your models with adjustable parameters including sample sizes, home/away splits, 
                outlier smoothing, and custom team-specific calculations.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer Information Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <Separator className="mb-12" />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* About Section */}
            <div className="space-y-4">
              <h3 className="font-semibold">About BetAnalyzer</h3>
              <p className="text-sm text-muted-foreground">
                BetAnalyzer is a professional football analytics platform designed to provide 
                data-driven insights for informed betting decisions. We use advanced statistical 
                models and real-time data to help you identify value opportunities.
              </p>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="font-semibold">Contact Us</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <a href="mailto:Erik@betanalyser.se" className="text-muted-foreground hover:text-foreground transition-colors">
                    Erik@betanalyser.se
                  </a>
                </div>
              </div>
            </div>

            {/* Resources */}
            <div className="space-y-4">
              <h3 className="font-semibold">Resources</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Documentation
                  </a>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Privacy Policy
                  </a>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Terms of Service
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Footer */}
          <div className="mt-12 pt-8 border-t border-border">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} BetAnalyzer. All rights reserved.
              </p>
              <div className="flex gap-6 text-sm text-muted-foreground">
                <span>Made with ❤️ for bettors</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
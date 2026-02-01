import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Users, DollarSign, MessageSquare, TrendingUp, ArrowRight, Zap, Shield, Smartphone } from 'lucide-react'

const LandingPage = () => {
  const { t } = useTranslation()
  const features = [
    { icon: Users, titleKey: 'landing.feature1Title', descKey: 'landing.feature1Desc' },
    { icon: DollarSign, titleKey: 'landing.feature2Title', descKey: 'landing.feature2Desc' },
    { icon: MessageSquare, titleKey: 'landing.feature3Title', descKey: 'landing.feature3Desc' },
    { icon: TrendingUp, titleKey: 'landing.feature4Title', descKey: 'landing.feature4Desc' },
    { icon: Shield, titleKey: 'landing.feature5Title', descKey: 'landing.feature5Desc' },
    { icon: Smartphone, titleKey: 'landing.feature6Title', descKey: 'landing.feature6Desc' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/30 to-background dark:from-background dark:via-muted/20 dark:to-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/50 bg-background/80 dark:bg-background/90 backdrop-blur-md">
        <div className="container mx-auto px-4 py-4 sm:py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 shrink-0 rounded-2xl bg-primary flex items-center justify-center shadow-soft">
                <DollarSign className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
              </div>
              <span className="text-h2 font-semibold text-foreground truncate">
                {t('app.title')}
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <Link to="/login">
                <Button variant="ghost" className="rounded-2xl text-foreground hover:bg-accent">
                  {t('nav.login')}
                </Button>
              </Link>
              <Link to="/signup">
                <Button className="rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft">
                  {t('nav.signup')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 sm:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Zap className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{t('landing.heroBadge')}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-5 tracking-tight leading-read">
            {t('landing.heroTitle1')}
            <br />
            <span className="bg-gradient-to-r from-[#4CAF50] to-[#66BB6A] bg-clip-text text-transparent">{t('landing.heroTitle2')}</span>
          </h1>
          <p className="text-body text-muted-foreground mb-8 max-w-xl mx-auto leading-read">
            {t('landing.heroSubtitle')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/signup">
              <Button size="lg" className="rounded-2xl px-8 h-12 text-body font-medium">
                {t('landing.getStarted')}
                <ArrowRight className="ms-2 h-5 w-5" aria-hidden="true" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="rounded-2xl px-8 h-12 text-body font-medium">
                {t('landing.signIn')}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16 sm:py-24">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-h2 text-foreground tracking-tight mb-3">{t('landing.featuresTitle')}</h2>
          <p className="text-muted-foreground max-w-xl mx-auto leading-read text-small sm:text-body">
            {t('landing.featuresSubtitle')}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <Card key={index} className="rounded-2xl border border-border bg-card shadow-soft hover:shadow-soft-lg transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <h3 className="text-h2 text-foreground mb-2">{t(feature.titleKey)}</h3>
                <p className="text-small text-muted-foreground leading-read">{t(feature.descKey)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 sm:py-24">
        <Card className="max-w-3xl mx-auto border-0 bg-gradient-to-r from-[#4CAF50] to-[#66BB6A] text-primary-foreground shadow-soft-lg overflow-hidden">
          <CardContent className="p-8 sm:p-12 text-center">
            <h2 className="text-h2 font-semibold mb-3">{t('landing.ctaTitle')}</h2>
            <p className="text-primary-foreground/90 mb-8 max-w-lg mx-auto">
              {t('landing.ctaSubtitle')}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/signup">
                <Button size="lg" variant="secondary" className="rounded-2xl px-8 h-12 text-body font-medium text-primary hover:bg-secondary/90">
                  {t('landing.createAccount')}
                  <ArrowRight className="ms-2 h-5 w-5" aria-hidden="true" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="rounded-2xl px-8 h-12 text-body font-medium border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                  {t('landing.signIn')}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 dark:bg-muted/10">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
              </div>
              <span className="font-semibold text-foreground">{t('app.title')}</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
              <Link to="/ux-process" className="text-sm font-medium text-primary hover:underline">
                UX Process
              </Link>
              <p className="text-sm text-muted-foreground">{t('landing.footerRights')}</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage

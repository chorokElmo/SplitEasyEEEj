import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { useToast } from '../components/ui/use-toast'
import LoadingSpinner from '../components/ui/loading-spinner'

const LoginPage = () => {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await login(email, password)
      if (result.success) {
        toast({
          title: t('auth.login.title'),
          description: t('notifications.success'),
        })
        navigate('/dashboard')
      } else {
        toast({
          variant: "destructive",
          title: t('auth.login.error'),
          description: result.error,
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('auth.login.error'),
        description: t('errors.unknownError'),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 sm:p-6">
      <Card className="w-full max-w-md border border-border bg-card shadow-soft-lg">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-semibold text-foreground">{t('app.title')}</CardTitle>
          <CardDescription className="text-muted-foreground">
            {t('auth.login.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                {t('auth.login.email')}
              </label>
              <Input
                id="email"
                type="email"
                placeholder={t('auth.login.email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                {t('auth.login.password')}
              </label>
              <Input
                id="password"
                type="password"
                placeholder={t('auth.login.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full rounded-xl font-medium" disabled={loading}>
              {loading ? (
                <>
                  <LoadingSpinner size="sm" className="me-2" />
                  {t('auth.login.signingIn')}
                </>
              ) : (
                t('auth.login.signIn')
              )}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {t('auth.login.noAccount')}{' '}
              <Link to="/signup" className="text-primary hover:underline">
                {t('auth.login.signUp')}
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default LoginPage
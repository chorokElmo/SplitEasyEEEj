import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { useToast } from '../components/ui/use-toast'
import LoadingSpinner from '../components/ui/loading-spinner'
import { DollarSign, User, Mail, Lock, Phone, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react'

const SignupPage = () => {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: ''
  })
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate username (alphanumeric only, 3-30 chars)
    if (formData.username.length < 3 || formData.username.length > 30) {
      toast({
        variant: "destructive",
        title: t('errors.validationError'),
        description: t('auth.signup.username') + ' ' + t('errors.validationError'),
      })
      return
    }
    
    if (!/^[a-zA-Z0-9]+$/.test(formData.username)) {
      toast({
        variant: "destructive",
        title: t('errors.validationError'),
        description: t('errors.validationError'),
      })
      return
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      toast({
        variant: "destructive",
        title: t('errors.validationError'),
        description: t('errors.validationError'),
      })
      return
    }
    
    // Validate password length
    if (formData.password.length < 6) {
      toast({
        variant: "destructive",
        title: t('auth.signup.passwordTooShort'),
        description: t('auth.signup.passwordTooShort'),
      })
      return
    }
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        variant: "destructive",
        title: t('auth.signup.passwordMismatch'),
        description: t('auth.signup.passwordMismatch'),
      })
      return
    }

    setLoading(true)

    try {
      const result = await register({
        username: formData.username.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        firstName: formData.firstName.trim() || undefined,
        lastName: formData.lastName.trim() || undefined,
        phone: formData.phone.trim() || undefined
      })
      
      if (result.success) {
        toast({
          title: t('notifications.success'),
          description: t('auth.signup.accountCreatedSignIn'),
        })
        navigate('/login')
      } else {
        toast({
          variant: "destructive",
          title: t('auth.signup.error'),
          description: result.error,
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('auth.signup.error'),
        description: t('errors.unknownError'),
      })
    } finally {
      setLoading(false)
    }
  }

  const passwordStrength = formData.password.length >= 6 && formData.password === formData.confirmPassword

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Back to Landing */}
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          {t('auth.backToHome')}
        </Link>

        <Card className="border border-border bg-card shadow-soft-lg">
          <CardHeader className="text-center space-y-4 pb-6">
            <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center mx-auto shadow-soft">
              <DollarSign className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl font-semibold text-foreground">
                {t('auth.signup.title')}
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-2">
                {t('auth.signup.subtitle')}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label htmlFor="username" className="text-sm font-medium text-foreground flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {t('auth.signup.username')} *
                  </label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="johndoe"
                    value={formData.username}
                    onChange={handleChange}
                    className="h-12 rounded-xl"
                    pattern="[a-zA-Z0-9]+"
                    minLength={3}
                    maxLength={30}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {t('auth.signup.email')} *
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="h-12 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label htmlFor="firstName" className="text-sm font-medium text-foreground">
                    {t('auth.signup.firstName')}
                  </label>
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="lastName" className="text-sm font-medium text-foreground">
                    {t('auth.signup.lastName')}
                  </label>
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {t('auth.signup.phone')}
                </label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+1234567890"
                  value={formData.phone}
                  onChange={handleChange}
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    {t('auth.signup.password')} *
                  </label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className="h-12 rounded-xl"
                    minLength={6}
                    required
                  />
                  {formData.password && (
                    <p className={`text-xs flex items-center gap-1 ${formData.password.length >= 6 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                      {formData.password.length >= 6 ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" />
                          {t('auth.signup.min6Chars')}
                        </>
                      ) : (
                        `${t('auth.signup.passwordTooShort')} (${formData.password.length}/6)`
                      )}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    {t('auth.signup.confirmPassword')} *
                  </label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="h-12 rounded-xl"
                    required
                  />
                  {formData.confirmPassword && (
                    <p className={`text-xs flex items-center gap-1 ${passwordStrength ? 'text-green-600' : 'text-red-500'}`}>
                      {passwordStrength ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" />
                          {t('auth.signup.passwordsMatch')}
                        </>
                      ) : (
                        t('auth.signup.passwordMismatch')
                      )}
                    </p>
                  )}
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 rounded-xl font-medium" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    {t('auth.signup.creating')}
                  </>
                ) : (
                  <>
                    {t('auth.signup.createAccount')}
                    <ArrowRight className="ms-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {t('auth.signup.haveAccount')}{' '}
                <Link to="/login" className="text-primary font-medium hover:underline">
                  {t('auth.signup.signIn')}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default SignupPage

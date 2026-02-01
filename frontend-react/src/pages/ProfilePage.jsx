import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { useToast } from '../components/ui/use-toast'
import { getInitials, getAvatarColor } from '../lib/utils'
import { User, Mail, Settings, Shield, Lock } from 'lucide-react'
import api from '../lib/api'

const ProfilePage = () => {
  const { t } = useTranslation()
  const { user, updateUser } = useAuth()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const response = await api.put('/auth/me', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone
      })
      return response.data
    },
    onSuccess: (res) => {
      updateUser(res.data.user)
      setIsEditing(false)
      toast({
        title: t('notifications.success'),
        description: t('profile.changesSaved'),
      })
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: t('errors.serverError'),
        description: error.response?.data?.message || t('profile.errorSaving'),
      })
    }
  })

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      const { currentPassword, newPassword, confirmPassword } = passwordData
      if (newPassword !== confirmPassword) {
        throw new Error('Passwords do not match')
      }
      const response = await api.post('/auth/change-password', {
        currentPassword,
        newPassword
      })
      return response.data
    },
    onSuccess: () => {
      toast({ title: t('notifications.success') })
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: t('profile.passwordChangeFailed'),
        description: error.response?.data?.message || error.message
      })
    }
  })

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleCancel = () => {
    setFormData({
      username: user?.username || '',
      email: user?.email || '',
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
    })
    setIsEditing(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('profile.title')}</h1>
        <p className="text-muted-foreground">
          {t('profile.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('profile.personalInfo')}</CardTitle>
                <CardDescription>
                  {t('profile.personalInfo')}
                </CardDescription>
              </div>
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)}>
                  <Settings className="me-2 h-4 w-4" />
                  {t('common.edit')}
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button onClick={() => updateProfileMutation.mutate()} disabled={updateProfileMutation.isLoading}>{t('common.save')}</Button>
                  <Button variant="outline" onClick={handleCancel}>{t('common.cancel')}</Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-xl font-medium ${getAvatarColor(user?.username || 'User')}`}>
                {getInitials(user?.username || 'User')}
              </div>
              <div>
                <p className="font-medium">{t('profile.profilePicture')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('profile.uploadPhoto')}
                </p>
                <Button variant="outline" size="sm" className="mt-2">
                  {t('profile.uploadPhoto')}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('common.username')}</label>
                <Input
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('common.email')}</label>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('common.firstName')}</label>
                <Input
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('common.lastName')}</label>
                <Input
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">{t('common.phone')}</label>
                <Input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('profile.accountSettings')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{t('profile.memberSince')}</p>
                  <p className="text-sm text-muted-foreground">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : t('common.error')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{t('profile.emailVerified')}</p>
                  <p className="text-sm text-green-600">{t('profile.verified')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('profile.accountSettings')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  {t('profile.changePassword')}
                </label>
                <Input
                  type="password"
                  placeholder={t('profile.currentPassword')}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                />
                <Input
                  type="password"
                  placeholder={t('profile.newPassword')}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                />
                <Input
                  type="password"
                  placeholder={t('profile.confirmNewPassword')}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                />
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => changePasswordMutation.mutate()}
                  disabled={changePasswordMutation.isLoading}
                >
                  <Shield className="h-4 w-4 me-2" />
                  {t('profile.updatePassword')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
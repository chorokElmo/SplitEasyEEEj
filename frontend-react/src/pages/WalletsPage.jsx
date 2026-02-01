import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import LoadingSpinner from '../components/ui/loading-spinner'
import api from '../lib/api'
import { Wallet, CreditCard, Plus } from 'lucide-react'

const WalletsPage = () => {
  const { t } = useTranslation()

  const { data: wallets, isLoading, error } = useQuery({
    queryKey: ['wallets'],
    queryFn: async () => {
      try {
        const response = await api.get('/wallets')
        return Array.isArray(response.data) ? response.data : (response.data?.data || [])
      } catch (err) {
        console.error('Error fetching wallets:', err)
        return []
      }
    },
    retry: 1
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          {t('wallets.title', 'Wallets')}
        </h1>
        <p className="text-muted-foreground">
          {t('wallets.subtitle', 'Manage your payment methods and balances.')}
        </p>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              {t('common.error', 'Unable to load wallets.')}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                {t('wallets.myWallets', 'My Wallets')}
              </CardTitle>
              <CardDescription>
                {t('wallets.myWalletsDesc', 'Your linked payment methods and balances')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {wallets?.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {wallets.map((wallet) => (
                <Card key={wallet.id} className="border">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-muted p-3">
                        <CreditCard className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{wallet.name || wallet.type || 'Wallet'}</p>
                        <p className="text-sm text-muted-foreground">
                          {wallet.balance != null
                            ? `${typeof wallet.currency === 'string' ? wallet.currency : ''} ${Number(wallet.balance).toFixed(2)}`
                            : wallet.description || '—'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Wallet className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-2">
                {t('wallets.empty', 'No wallets yet')}
              </p>
              <p className="text-sm text-muted-foreground max-w-sm">
                {t('wallets.emptyDesc', 'Add a payment method to settle up with friends.')}
              </p>
              <Button className="mt-4" type="button">
                <Plus className="h-4 w-4 me-2" />
                {t('wallets.addWallet', 'Add wallet')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default WalletsPage

import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'

/**
 * Sets document title and meta description from current locale.
 * Rendered once in App so SEO/social shares reflect active language.
 */
const DocumentHead = () => {
  const { t } = useTranslation()
  const title = t('app.metaTitle')
  const description = t('app.metaDescription')

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
    </Helmet>
  )
}

export default DocumentHead

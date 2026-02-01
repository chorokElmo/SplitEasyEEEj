import React from 'react'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { AlertCircle } from 'lucide-react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorKey: 0 }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background transition-colors duration-theme">
          <Card className="max-w-md w-full rounded-2xl border-border/60 shadow-soft-lg">
            <CardContent className="pt-6 pb-6">
              <div
                className="text-center space-y-5"
                role="alert"
                aria-live="assertive"
                aria-atomic="true"
              >
                <div className="flex justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
                    <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
                  </div>
                </div>
                <h2 className="text-h2 text-foreground">Something went wrong</h2>
                <p className="text-small text-muted-foreground leading-read">
                  {this.state.error?.message || 'An unexpected error occurred'}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                  <Button
                    onClick={() => window.location.reload()}
                    className="rounded-2xl transition-all duration-200"
                  >
                    Reload Page
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => this.setState((s) => ({ hasError: false, error: null, errorKey: s.errorKey + 1 }))}
                    className="rounded-2xl transition-all duration-200"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return <React.Fragment key={this.state.errorKey}>{this.props.children}</React.Fragment>
  }
}

export default ErrorBoundary

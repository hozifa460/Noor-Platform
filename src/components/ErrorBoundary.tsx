'use client';

import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught unhandled error in view:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.hash = '';
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 my-6 max-w-lg mx-auto rounded-2xl bg-card border border-border shadow-sm text-center">
          <div className="size-14 rounded-full bg-destructive/10 text-destructive grid place-items-center mx-auto mb-4">
            <AlertTriangle className="size-7" />
          </div>

          <h3 className="text-xl font-bold text-foreground mb-2">
            {this.props.fallbackTitle || 'حدث خطأ غير متوقع أثناء عرض المحتوى'}
          </h3>

          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            {this.props.fallbackMessage ||
              'نعتذر عن هذا الخطأ. يمكنك إعادة المحاولة أو العودة إلى الصفحة الرئيسية.'}
          </p>

          <div className="flex items-center justify-center gap-3">
            <Button onClick={this.handleReset} variant="default" className="gap-2">
              <RefreshCw className="size-4" />
              إعادة المحاولة
            </Button>
            <Button onClick={this.handleGoHome} variant="outline" className="gap-2">
              <Home className="size-4" />
              الصفحة الرئيسية
            </Button>
          </div>

          {process.env.NODE_ENV !== 'production' && this.state.error && (
            <details className="mt-6 text-right text-xs bg-muted p-3 rounded-lg overflow-auto max-h-40">
              <summary className="cursor-pointer text-muted-foreground font-mono">تفاصيل الخطأ (Debug)</summary>
              <pre className="mt-2 text-destructive font-mono whitespace-pre-wrap">
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

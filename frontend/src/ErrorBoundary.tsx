import React from 'react';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; message?: string };

export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, message: undefined };
    }

    static getDerivedStateFromError(error: unknown): State {
        return { hasError: true, message: error instanceof Error ? error.message : String(error) };
    }

    componentDidCatch(error: unknown, info: React.ErrorInfo): void {
        console.error('UI crashed', error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '2rem', maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
                    <h2>Bir şeyler ters gitti</h2>
                    <p>{this.state.message ?? 'Beklenmeyen bir hata oluştu.'}</p>
                    <button onClick={() => window.location.reload()}>Sayfayı yenile</button>
                </div>
            );
        }
        return this.props.children;
    }
}

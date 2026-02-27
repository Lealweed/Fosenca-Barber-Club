import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Este é o nosso "Detetive" de erros
class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("Erro capturado:", error, errorInfo);
    this.setState({ errorInfo });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '30px', color: '#ff8080', backgroundColor: '#1a1a1a', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h2 style={{ color: '#ff4444', fontSize: '24px' }}>🚨 O site encontrou um erro:</h2>
          <p style={{ fontSize: '18px', marginTop: '20px', fontWeight: 'bold' }}>{this.state.error?.toString()}</p>
          <pre style={{ marginTop: '20px', padding: '15px', backgroundColor: '#000', overflowX: 'auto', color: '#aaa' }}>
            {this.state.errorInfo?.componentStack}
          </pre>
          <p style={{ marginTop: '30px', color: 'white', fontSize: '18px' }}>📸 <strong>Por favor, tire um print desta tela e me envie!</strong> Com isso eu resolvo em 1 minuto.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

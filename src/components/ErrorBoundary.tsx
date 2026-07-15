import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useTemplateStore } from '../store/useTemplateStore';
import './ErrorBoundary.css';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('DeckCardCreator crashed:', error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetTemplate = () => {
    useTemplateStore.persist.clearStorage();
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="error-boundary">
        <h1>Something went wrong</h1>
        <p>DeckCardCreator hit an unexpected error and can't continue safely.</p>
        <pre className="error-boundary__message">{error.message}</pre>
        <div className="error-boundary__actions">
          <button onClick={this.handleReload}>Reload</button>
          <button onClick={this.handleResetTemplate}>Reset template</button>
        </div>
        <p className="error-boundary__hint">
          "Reset template" clears your saved deck and starts fresh — only use it if reloading alone doesn't help.
        </p>
      </div>
    );
  }
}

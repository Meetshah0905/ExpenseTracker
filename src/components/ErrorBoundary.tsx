import { Component, type ErrorInfo, type ReactNode } from "react";
import { RotateCcw } from "lucide-react";

type Props = {
  children: ReactNode;
};

type State = {
  error?: Error;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = {};

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App render failed", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="crash-screen">
        <section className="panel">
          <h1>App error</h1>
          <p>{this.state.error.message}</p>
          <button className="primary-button" onClick={() => window.location.reload()}>
            <RotateCcw size={18} />
            Reload app
          </button>
        </section>
      </main>
    );
  }
}

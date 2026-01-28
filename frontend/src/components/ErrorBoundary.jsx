import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * Error Fallback UI shown when an error is caught
 */
function ErrorFallback({ error, resetError }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-dark)",
        padding: "2rem",
      }}
    >
      <div
        style={{
          maxWidth: "500px",
          textAlign: "center",
          padding: "3rem",
          background: "var(--bg-card)",
          borderRadius: "16px",
          border: "1px solid var(--bg-input)",
        }}
      >
        <div
          style={{
            width: "80px",
            height: "80px",
            margin: "0 auto 2rem",
            borderRadius: "50%",
            background: "rgba(239, 68, 68, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AlertTriangle size={40} color="#ef4444" />
        </div>

        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: "700",
            marginBottom: "1rem",
            color: "var(--text-primary)",
          }}
        >
          Something went wrong
        </h1>

        <p
          style={{
            color: "var(--text-secondary)",
            marginBottom: "2rem",
            lineHeight: 1.6,
          }}
        >
          The application encountered an unexpected error. This has been logged
          and we're working to fix it.
        </p>

        {error && (
          <details
            style={{
              textAlign: "left",
              marginBottom: "2rem",
              padding: "1rem",
              background: "var(--bg-input)",
              borderRadius: "8px",
              fontSize: "0.875rem",
            }}
          >
            <summary
              style={{
                cursor: "pointer",
                color: "var(--text-muted)",
                marginBottom: "0.5rem",
              }}
            >
              Error details
            </summary>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                color: "#ef4444",
                margin: 0,
              }}
            >
              {error.message}
            </pre>
          </details>
        )}

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.75rem 1.5rem",
              background: "var(--primary)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
              transition: "all 0.2s",
            }}
          >
            <RefreshCw size={18} />
            Reload Page
          </button>

          {resetError && (
            <button
              onClick={resetError}
              style={{
                padding: "0.75rem 1.5rem",
                background: "transparent",
                color: "var(--text-secondary)",
                border: "1px solid var(--bg-input)",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "500",
              }}
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Error Boundary component to catch JavaScript errors in child component tree
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console in development
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // In production, you could send this to an error tracking service
    // Example: errorTrackingService.log(error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback error={this.state.error} resetError={this.resetError} />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

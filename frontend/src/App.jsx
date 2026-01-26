import { useState } from "react";
import CredentialsModal from "./components/CredentialsModal";
import ResourceSelector from "./components/ResourceSelector";
import DeploymentList from "./components/DeploymentList";
import DeployModal from "./components/DeployModal";
import HistoryView from "./components/HistoryView";
import { DeploymentProvider, useDeployment } from "./context/DeploymentContext";

function MainContent() {
  const {
    provider,
    setProvider,
    currentView,
    setCurrentView,
    credentialStatus,
    resources,
    deployments,
    loading,
    initialLoading,
    alert,
    showAlert,
    actions,
  } = useDeployment();

  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);

  const isConnected = credentialStatus[provider]?.configured;
  const isPreconfigured = credentialStatus[provider]?.preconfigured;

  const handleResourceSelect = (resource) => {
    if (!isConnected) {
      showAlert("warning", `Please connect ${provider.toUpperCase()} first`);
      setShowCredentialsModal(true);
      return;
    }
    setSelectedResource(resource);
    setShowDeployModal(true);
  };

  const onDeploySubmit = async (options) => {
    // Clear previous errors
    setSelectedResource({ ...selectedResource, error: null });

    const response = await actions.deploy(selectedResource, options);

    if (response.success) {
      const result = response.result;
      const resourceName = selectedResource.name;
      let successMessage = `The ${resourceName} has been deployed successfully! 🚀`;

      // Handle Credential Download
      if (result.credentials) {
        const blob = new Blob([result.credentials.content], {
          type: "text/plain",
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.credentials.filename;
        a.click();
        window.URL.revokeObjectURL(url);
        successMessage += ` Credentials downloaded to ${result.credentials.filename}`;
      }

      showAlert("success", successMessage);
      setShowDeployModal(false);
      setSelectedResource(null);
    } else {
      const errorMsg =
        response.error || "Deployment failed - no error details provided";
      setSelectedResource({ ...selectedResource, error: errorMsg });
    }
  };

  const onCredentialsSubmit = async (creds) => {
    const success = await actions.saveCredentials(creds);
    if (success) {
      setShowCredentialsModal(false);
    }
  };

  // Group resources by category
  const groupedResources = (resources[provider] || []).reduce(
    (acc, resource) => {
      const category = resource.category || "Other";
      if (!acc[category]) acc[category] = [];
      acc[category].push(resource);
      return acc;
    },
    {},
  );

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">🚀</span>
            <span>Cloud Auto Deploy</span>
          </div>

          <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
            <nav className="main-nav" style={{ display: "flex", gap: "1rem" }}>
              <button
                className={`nav-btn ${currentView === "dashboard" ? "active" : ""}`}
                onClick={() => setCurrentView("dashboard")}
                style={{
                  background: "none",
                  border: "none",
                  color:
                    currentView === "dashboard"
                      ? "var(--text-primary)"
                      : "var(--text-secondary)",
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: "0.5rem",
                  borderBottom:
                    currentView === "dashboard"
                      ? "2px solid var(--text-primary)"
                      : "2px solid transparent",
                  transition: "all 0.2s",
                }}
              >
                Dashboard
              </button>
              <button
                className={`nav-btn ${currentView === "history" ? "active" : ""}`}
                onClick={() => setCurrentView("history")}
                style={{
                  background: "none",
                  border: "none",
                  color:
                    currentView === "history"
                      ? "var(--text-primary)"
                      : "var(--text-secondary)",
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: "0.5rem",
                  borderBottom:
                    currentView === "history"
                      ? "2px solid var(--text-primary)"
                      : "2px solid transparent",
                  transition: "all 0.2s",
                }}
              >
                📜 History
              </button>
            </nav>

            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              {isConnected ? (
                <>
                  <div className="credential-status connected">
                    ✓ {isPreconfigured ? "Auto-connected" : "Connected"} to{" "}
                    {provider.toUpperCase()}
                  </div>
                  {!isPreconfigured && (
                    <button
                      className="btn btn-secondary"
                      onClick={actions.disconnect}
                    >
                      Disconnect
                    </button>
                  )}
                </>
              ) : (
                <button
                  className={`btn ${provider === "aws" ? "btn-aws" : "btn-azure"}`}
                  onClick={() => setShowCredentialsModal(true)}
                >
                  🔑 Connect {provider.toUpperCase()}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="main-content">
        {alert && (
          <div className={`alert alert-${alert.type}`}>
            {alert.type === "success" && "✓ "}
            {alert.type === "error" && "✕ "}
            {alert.type === "warning" && "⚠ "}
            {alert.message}
          </div>
        )}

        {currentView === "dashboard" ? (
          <>
            <div className="provider-tabs">
              <button
                className={`tab-btn aws ${provider === "aws" ? "active" : ""}`}
                onClick={() => setProvider("aws")}
              >
                <span className="tab-icon">🟠</span>
                AWS
                <span className="service-count">
                  {resources.aws?.length || 0} services
                </span>
                {credentialStatus.aws?.configured && (
                  <span className="tab-check">✓</span>
                )}
              </button>
              <button
                className={`tab-btn azure ${provider === "azure" ? "active" : ""}`}
                onClick={() => setProvider("azure")}
              >
                <span className="tab-icon">🔵</span>
                Azure
                <span className="service-count">
                  {resources.azure?.length || 0} services
                </span>
                {credentialStatus.azure?.configured && (
                  <span className="tab-check">✓</span>
                )}
              </button>
            </div>

            <div className="section-header">
              <h2>Deploy {provider.toUpperCase()} Resources</h2>
              <p>
                {resources[provider]?.length || 0} services available • Click
                any card to deploy
              </p>
            </div>

            {initialLoading ? (
              <div className="empty-state">
                <div className="spinner" style={{ margin: "0 auto" }}></div>
                <p style={{ marginTop: "1rem" }}>Loading services...</p>
              </div>
            ) : (
              Object.entries(groupedResources).map(
                ([category, categoryResources]) => (
                  <div key={category} className="category-section">
                    <h3 className="category-title">{category}</h3>
                    <ResourceSelector
                      resources={categoryResources}
                      onSelect={handleResourceSelect}
                      provider={provider}
                    />
                  </div>
                ),
              )
            )}

            <div className="section-header" style={{ marginTop: "4rem" }}>
              <h2>Active Deployments</h2>
              <p>
                {
                  deployments.filter(
                    (d) =>
                      d.provider === provider &&
                      ["active", "failed"].includes(d.status),
                  ).length
                }{" "}
                active & failed resources
              </p>
            </div>

            <DeploymentList
              deployments={deployments.filter(
                (d) =>
                  d.provider === provider &&
                  ["active", "failed"].includes(d.status),
              )}
              onDestroy={actions.destroy}
              loading={loading}
            />
          </>
        ) : (
          <HistoryView
            deployments={deployments}
            onDestroy={actions.destroy}
            loading={loading}
          />
        )}
      </main>

      {showCredentialsModal && !isPreconfigured && (
        <CredentialsModal
          provider={provider}
          onClose={() => setShowCredentialsModal(false)}
          onSave={onCredentialsSubmit}
          loading={loading}
        />
      )}

      {showDeployModal && selectedResource && (
        <DeployModal
          provider={provider}
          resource={selectedResource}
          onClose={() => {
            setShowDeployModal(false);
            setSelectedResource(null);
          }}
          onDeploy={onDeploySubmit}
          loading={loading}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <DeploymentProvider>
      <MainContent />
    </DeploymentProvider>
  );
}

export default App;

import { useState, useEffect } from "react";
import api from "./services/api";
import CredentialsModal from "./components/CredentialsModal";
import ResourceSelector from "./components/ResourceSelector";
import DeploymentList from "./components/DeploymentList";
import DeployModal from "./components/DeployModal";
import HistoryView from "./components/HistoryView";

function App() {
  const [provider, setProvider] = useState("aws");
  const [currentView, setCurrentView] = useState("dashboard"); // 'dashboard' | 'history'
  const [credentialStatus, setCredentialStatus] = useState({
    aws: {},
    azure: {},
  });
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [deployments, setDeployments] = useState([]);
  const [resources, setResources] = useState({ aws: [], azure: [] });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [status, resourceTypes, deploymentsData] = await Promise.all([
        api.getCredentialStatus(),
        api.getResourceTypes(),
        api.getDeployments(),
      ]);
      setCredentialStatus(status);
      setResources(resourceTypes);
      setDeployments(deploymentsData.deployments || []);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setInitialLoading(false);
    }
  };

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleCredentialsSave = async (credentials) => {
    setLoading(true);
    try {
      const result =
        provider === "aws"
          ? await api.configureAWS(credentials)
          : await api.configureAzure(credentials);

      if (result.success) {
        showAlert(
          "success",
          `${provider.toUpperCase()} connected successfully!`,
        );
        setShowCredentialsModal(false);
        loadData();
      } else {
        showAlert("error", result.error || "Failed to configure credentials");
      }
    } catch (error) {
      showAlert("error", error.message);
    }
    setLoading(false);
  };

  const handleResourceSelect = (resource) => {
    if (!credentialStatus[provider]?.configured) {
      showAlert("warning", `Please connect ${provider.toUpperCase()} first`);
      setShowCredentialsModal(true);
      return;
    }
    setSelectedResource(resource);
    setShowDeployModal(true);
  };

  const handleDeploy = async (options) => {
    setLoading(true);
    // Clear previous errors
    setSelectedResource({ ...selectedResource, error: null });

    console.log("🚀 Starting deployment:", {
      provider,
      resourceType: selectedResource.id,
      options,
    });
    try {
      const result = await api.deploy(provider, selectedResource.id, options);
      console.log("📦 Deployment result:", result);

      if (result.success) {
        // Generate custom success message
        const resourceName = selectedResource.name; // e.g., "S3 Bucket", "Virtual Machine"
        const successMessage = `The ${resourceName} has been deployed successfully! 🚀`;

        showAlert("success", successMessage);
        setShowDeployModal(false);
        setSelectedResource(null);
        loadData();
      } else {
        const errorMsg =
          result.error || "Deployment failed - no error details provided";
        console.error("❌ Deployment failed:", errorMsg);
        // Show error IN the modal for better visibility
        setSelectedResource({ ...selectedResource, error: errorMsg });
      }
    } catch (error) {
      console.error("❌ Deployment exception:", error);
      setSelectedResource({
        ...selectedResource,
        error: error.message || "Unexpected error occurred",
      });
    }
    setLoading(false);
  };

  const handleDestroy = async (deploymentId) => {
    if (!confirm("Are you sure you want to destroy this resource?")) return;

    setLoading(true);
    try {
      const result = await api.destroyDeployment(deploymentId);
      if (result.success) {
        showAlert("success", "Resource destroyed");
        loadData();
      } else {
        showAlert("error", result.error);
      }
    } catch (error) {
      showAlert("error", error.message);
    }
    setLoading(false);
  };

  const handleDisconnect = async () => {
    await api.clearCredentials(provider);
    loadData();
  };

  const isConnected = credentialStatus[provider]?.configured;
  const isPreconfigured = credentialStatus[provider]?.preconfigured;

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
                      onClick={handleDisconnect}
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
              onDestroy={handleDestroy}
              loading={loading}
            />
          </>
        ) : (
          <HistoryView
            deployments={deployments}
            onDestroy={handleDestroy}
            loading={loading}
          />
        )}
      </main>

      {showCredentialsModal && !isPreconfigured && (
        <CredentialsModal
          provider={provider}
          onClose={() => setShowCredentialsModal(false)}
          onSave={handleCredentialsSave}
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
          onDeploy={handleDeploy}
          loading={loading}
        />
      )}
    </div>
  );
}

export default App;

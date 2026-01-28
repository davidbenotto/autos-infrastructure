import { useState, useEffect } from "react";
import CredentialsModal from "./components/CredentialsModal";
import ResourceSelector from "./components/ResourceSelector";
import DeploymentList from "./components/DeploymentList";
import DeployModal from "./components/DeployModal";
import HistoryView from "./components/HistoryView";
import OrgSelector from "./components/OrgSelector";
import Sidebar from "./components/layout/Sidebar";
import ErrorBoundary from "./components/ErrorBoundary";
import { DeploymentProvider, useDeployment } from "./context/DeploymentContext";
import {
  OrganizationProvider,
  useOrganization,
} from "./context/OrganizationContext";
import { Settings, ShieldCheck, Plus } from "lucide-react";
import ManageView from "./components/ManageView";
import { motion, AnimatePresence } from "framer-motion";

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
    setSelectedResource({ ...selectedResource, error: null });
    const response = await actions.deploy(selectedResource, options);

    if (response.success) {
      const result = response.result;
      let successMessage = `Deployed ${selectedResource.name} successfully! 🚀`;

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
        successMessage += ` Credentials downloaded.`;
      }

      showAlert("success", successMessage);
      setShowDeployModal(false);
      setSelectedResource(null);
    } else {
      setSelectedResource({
        ...selectedResource,
        error: response.error || "Deployment failed",
      });
    }
  };

  const onCredentialsSubmit = async (creds) => {
    const success = await actions.saveCredentials(creds);
    if (success) setShowCredentialsModal(false);
  };

  const providerColors = {
    aws: "linear-gradient(135deg, #FF990020, #FF990005)",
    azure: "linear-gradient(135deg, #0078D420, #0078D405)",
    gcp: "linear-gradient(135deg, #4285F420, #4285F405)",
  };

  return (
    <div
      className="app-container"
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "var(--bg-dark)",
      }}
    >
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        provider={provider}
        setProvider={setProvider}
        onDisconnect={actions.disconnect}
      />

      <main
        style={{
          marginLeft: "var(--sidebar-width)",
          flex: 1,
          padding: "2rem 3rem",
        }}
      >
        {/* Header Area */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "3rem",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "2rem",
                fontWeight: "700",
                marginBottom: "0.5rem",
              }}
            >
              {currentView === "dashboard" ? "Dashboard" : "Deployment History"}
            </h1>
            <p style={{ color: "var(--text-secondary)" }}>
              Manage your cloud infrastructure on{" "}
              {provider === "aws"
                ? "Amazon Web Services"
                : provider === "azure"
                  ? "Microsoft Azure"
                  : "Google Cloud"}
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <OrgSelector />
            <div
              className="glass-panel"
              style={{
                padding: "0.75rem 1.5rem",
                borderRadius: "var(--radius-md)",
                display: "flex",
                alignItems: "center",
                gap: "1rem",
              }}
            >
              {isConnected ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    color: "var(--success)",
                    cursor: "pointer",
                  }}
                  onClick={() => setShowCredentialsModal(true)}
                  title="Click to switch account"
                >
                  <ShieldCheck size={18} />
                  <span style={{ fontWeight: 600 }}>Connected</span>
                  <Settings
                    size={14}
                    style={{ marginLeft: "4px", opacity: 0.7 }}
                  />
                </div>
              ) : (
                <button
                  onClick={() => setShowCredentialsModal(true)}
                  style={{
                    background: "var(--primary)",
                    color: "white",
                    border: "none",
                    padding: "0.5rem 1rem",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Settings size={18} />
                  Connect Credentials
                </button>
              )}
            </div>
          </div>
        </header>

        {alert && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`alert alert-${alert.type}`}
            style={{
              marginBottom: "2rem",
              padding: "1rem",
              borderRadius: "var(--radius-md)",
              background:
                alert.type === "error"
                  ? "rgba(239, 68, 68, 0.2)"
                  : "rgba(16, 185, 129, 0.2)",
              border: `1px solid ${alert.type === "error" ? "var(--error)" : "var(--success)"}`,
              color: "white",
            }}
          >
            {alert.message}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {currentView === "dashboard" ? (
            <motion.div
              key={provider}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Stats / Hero Section */}
              <div
                className="glass-card"
                style={{
                  padding: "2rem",
                  borderRadius: "var(--radius-lg)",
                  marginBottom: "3rem",
                  background: providerColors[provider],
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <div style={{ display: "flex", gap: "3rem" }}>
                  <div>
                    <p
                      style={{
                        color: "var(--text-muted)",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Available Services
                    </p>
                    <h2 style={{ fontSize: "2.5rem", margin: 0 }}>
                      {resources[provider]?.length || 0}
                    </h2>
                  </div>
                  <div>
                    <p
                      style={{
                        color: "var(--text-muted)",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Active Deployments
                    </p>
                    <h2 style={{ fontSize: "2.5rem", margin: 0 }}>
                      {
                        deployments.filter(
                          (d) =>
                            d.provider === provider && d.status === "active",
                        ).length
                      }
                    </h2>
                  </div>
                </div>
              </div>

              {initialLoading ? (
                <div className="spinner"></div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: "1.5rem",
                  }}
                >
                  {(resources[provider] || []).map((resource) => (
                    <motion.div
                      whileHover={{ y: -5 }}
                      key={resource.id}
                      className="glass-card resource-card"
                      onClick={() => handleResourceSelect(resource)}
                      style={{
                        padding: "1.5rem",
                        borderRadius: "var(--radius-md)",
                        cursor: "pointer",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "2.5rem",
                          marginBottom: "1rem",
                        }}
                      >
                        {resource.icon}
                      </div>
                      <h4
                        style={{
                          fontSize: "1.1rem",
                          marginBottom: "0.5rem",
                        }}
                      >
                        {resource.name}
                      </h4>
                      <p
                        style={{
                          color: "var(--text-muted)",
                          fontSize: "0.9rem",
                          lineHeight: "1.5",
                        }}
                      >
                        {resource.description}
                      </p>

                      <div
                        style={{
                          marginTop: "1.5rem",
                          display: "flex",
                          justifyContent: "flex-end",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--primary)",
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <Plus size={14} /> Deploy
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : currentView === "manage" ? (
            <ManageView
              provider={provider}
              resources={resources[provider] || []}
              deployments={deployments}
              onDestroy={actions.destroy}
              loading={loading}
            />
          ) : (
            <HistoryView
              deployments={deployments}
              onDestroy={actions.destroy}
              loading={loading}
            />
          )}
        </AnimatePresence>
      </main>

      {showCredentialsModal && (
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
    <ErrorBoundary>
      <OrganizationProvider>
        <DeploymentProvider>
          <MainContent />
        </DeploymentProvider>
      </OrganizationProvider>
    </ErrorBoundary>
  );
}

export default App;

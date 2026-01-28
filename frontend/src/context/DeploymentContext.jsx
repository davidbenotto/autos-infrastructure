import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import api from "../services/api";
import { useOrganization } from "./OrganizationContext";

const DeploymentContext = createContext();

export function DeploymentProvider({ children }) {
  const [provider, setProvider] = useState("aws");
  const [currentView, setCurrentView] = useState("dashboard");
  const [credentialStatus, setCredentialStatus] = useState({
    aws: {},
    azure: {},
  });
  const [resources, setResources] = useState({ aws: [], azure: [] });
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  // Get organization context - deployments should reload when org changes
  const { currentOrg, isAdmin } = useOrganization();

  // Load initial data
  const loadData = useCallback(async () => {
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
      showAlert("error", "Failed to load application data");
    } finally {
      setInitialLoading(false);
    }
  }, []);

  // Reload deployments when organization changes
  useEffect(() => {
    loadData();
  }, [loadData, currentOrg?.id, isAdmin]);

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
        loadData();
        return true;
      } else {
        showAlert("error", result.error || "Failed to configure credentials");
        return false;
      }
    } catch (error) {
      showAlert("error", error.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async (resource, options) => {
    setLoading(true);
    try {
      const result = await api.deploy(provider, resource.id, options);
      if (result.success) {
        loadData();
        return { success: true, result };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const handleDestroy = async (deploymentId) => {
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
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    await api.clearCredentials(provider);
    loadData();
  };

  const value = {
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
    loadData,
    actions: {
      saveCredentials: handleCredentialsSave,
      deploy: handleDeploy,
      destroy: handleDestroy,
      disconnect: handleDisconnect,
    },
  };

  return (
    <DeploymentContext.Provider value={value}>
      {children}
    </DeploymentContext.Provider>
  );
}

export function useDeployment() {
  const context = useContext(DeploymentContext);
  if (!context) {
    throw new Error("useDeployment must be used within a DeploymentProvider");
  }
  return context;
}

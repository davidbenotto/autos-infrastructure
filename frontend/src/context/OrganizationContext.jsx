import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { setOrgHeadersGetter } from "../services/api";

// Use relative path to leverage Vite proxy in development
// In production, this can be an absolute URL if backend is hosted separately
const API_URL = import.meta.env.VITE_API_URL || "";

const OrganizationContext = createContext(undefined);

const STORAGE_KEY = "cloudportal_current_org";
const ADMIN_KEY = "cloudportal_admin_mode";

export function OrganizationProvider({ children }) {
  const [organizations, setOrganizations] = useState([]);
  const [currentOrg, setCurrentOrgState] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Refs for API header getter
  const currentOrgRef = useRef(currentOrg);
  const isAdminRef = useRef(isAdmin);

  useEffect(() => {
    currentOrgRef.current = currentOrg;
    isAdminRef.current = isAdmin;
  }, [currentOrg, isAdmin]);

  // Set up the API header getter
  useEffect(() => {
    setOrgHeadersGetter(() => {
      const headers = {};
      if (currentOrgRef.current?.id) {
        headers["x-organization-id"] = currentOrgRef.current.id;
      }
      if (isAdminRef.current) {
        headers["x-admin-mode"] = "true";
      }
      return headers;
    });
  }, []);

  const fetchOrganizations = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`${API_URL}/api/organizations`);
      if (!response.ok) throw new Error("Failed to fetch organizations");

      const data = await response.json();
      setOrganizations(data);

      // Restore saved org from localStorage
      const savedOrgId = localStorage.getItem(STORAGE_KEY);
      const savedAdmin = localStorage.getItem(ADMIN_KEY) === "true";

      if (savedAdmin) {
        setIsAdmin(true);
      } else if (savedOrgId) {
        const savedOrg = data.find((o) => o.id === savedOrgId);
        if (savedOrg) {
          setCurrentOrgState(savedOrg);
        } else if (data.length > 0) {
          setCurrentOrgState(data[0]);
        }
      } else if (data.length > 0) {
        setCurrentOrgState(data[0]);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch organizations",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const setCurrentOrg = useCallback((org) => {
    setCurrentOrgState(org);
    setIsAdmin(false);
    if (org) {
      localStorage.setItem(STORAGE_KEY, org.id);
      localStorage.removeItem(ADMIN_KEY);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const setAdminMode = useCallback(
    (admin) => {
      setIsAdmin(admin);
      if (admin) {
        setCurrentOrgState(null);
        localStorage.setItem(ADMIN_KEY, "true");
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.removeItem(ADMIN_KEY);
        if (organizations.length > 0) {
          setCurrentOrgState(organizations[0]);
          localStorage.setItem(STORAGE_KEY, organizations[0].id);
        }
      }
    },
    [organizations],
  );

  const createOrganization = useCallback(
    async ({ name, slug, description }) => {
      const response = await fetch(`${API_URL}/api/organizations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, description }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to create organization");
      }

      const newOrg = await response.json();
      setOrganizations((prev) => [...prev, newOrg]);
      return newOrg;
    },
    [],
  );

  const updateOrganization = useCallback(
    async (id, updates) => {
      const response = await fetch(`${API_URL}/api/organizations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to update organization");
      }

      const updated = await response.json();
      setOrganizations((prev) =>
        prev.map((o) => (o.id === id ? { ...o, ...updated } : o)),
      );
      if (currentOrg?.id === id) {
        setCurrentOrgState((prev) => ({ ...prev, ...updated }));
      }
      return updated;
    },
    [currentOrg],
  );

  const deleteOrganization = useCallback(
    async (id) => {
      const response = await fetch(`${API_URL}/api/organizations/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to delete organization");
      }

      setOrganizations((prev) => prev.filter((o) => o.id !== id));
      if (currentOrg?.id === id) {
        const remaining = organizations.filter((o) => o.id !== id);
        if (remaining.length > 0) {
          setCurrentOrg(remaining[0]);
        }
      }
    },
    [currentOrg, organizations, setCurrentOrg],
  );

  // Get headers for API calls
  const getOrgHeaders = useCallback(() => {
    const headers = {};
    if (currentOrg?.id) {
      headers["x-organization-id"] = currentOrg.id;
    }
    if (isAdmin) {
      headers["x-admin-mode"] = "true";
    }
    return headers;
  }, [currentOrg, isAdmin]);

  const value = useMemo(
    () => ({
      organizations,
      currentOrg,
      isAdmin,
      loading,
      error,
      setCurrentOrg,
      setAdminMode,
      createOrganization,
      updateOrganization,
      deleteOrganization,
      getOrgHeaders,
      refetch: fetchOrganizations,
    }),
    [
      organizations,
      currentOrg,
      isAdmin,
      loading,
      error,
      setCurrentOrg,
      setAdminMode,
      createOrganization,
      updateOrganization,
      deleteOrganization,
      getOrgHeaders,
      fetchOrganizations,
    ],
  );

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error(
      "useOrganization must be used within an OrganizationProvider",
    );
  }
  return context;
}

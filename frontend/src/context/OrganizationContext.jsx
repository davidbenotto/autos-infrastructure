import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { setOrgHeadersGetter } from "../services/api";

// Use relative path to leverage Vite proxy in development
// In production, this can be an absolute URL if backend is hosted separately
const API_URL = import.meta.env.VITE_API_URL || "";

const OrganizationContext = createContext(undefined);

const STORAGE_KEY = "cloudportal_current_org";
const ADMIN_KEY = "cloudportal_admin_mode";

export function OrganizationProvider({ children }) {
  const queryClient = useQueryClient();
  const [currentOrg, setCurrentOrgState] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

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

  const {
    data: organizations = [],
    isLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/organizations`);
      if (!response.ok) throw new Error("Failed to fetch organizations");
      return response.json();
    },
  });

  // Calculate derived state
  const loading = isLoading;
  const error = queryError ? queryError.message : null;

  // Restore saved org logic - runs when organizations load
  useEffect(() => {
    if (isLoading || organizations.length === 0) return;

    const savedAdmin = localStorage.getItem(ADMIN_KEY) === "true";
    const savedOrgId = localStorage.getItem(STORAGE_KEY);

    if (savedAdmin) {
      setIsAdmin(true);
    } else if (!currentOrg && savedOrgId) {
      // Restore org only if not already set
      const savedOrg = organizations.find((o) => o.id === savedOrgId);
      if (savedOrg) {
        setCurrentOrgState(savedOrg);
      } else {
        setCurrentOrgState(organizations[0]);
      }
    } else if (!currentOrg && !isAdmin) {
      setCurrentOrgState(organizations[0]);
    }
  }, [organizations, isLoading]); // Removed dependencies that cause loops

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

  const createMutation = useMutation({
    mutationFn: async ({ name, slug, description }) => {
      const response = await fetch(`${API_URL}/api/organizations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, description }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to create organization");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
    },
  });

  const createOrganization = (data) => createMutation.mutateAsync(data);

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      const response = await fetch(`${API_URL}/api/organizations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to update organization");
      }
      return response.json();
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      // Update local state if current org was updated
      if (currentOrg?.id === updated.id) {
        setCurrentOrgState((prev) => ({ ...prev, ...updated }));
      }
    },
  });

  const updateOrganization = (id, updates) =>
    updateMutation.mutateAsync({ id, updates });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await fetch(`${API_URL}/api/organizations/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to delete organization");
      }
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      if (currentOrg?.id === deletedId) {
        const remaining = organizations.filter((o) => o.id !== deletedId);
        if (remaining.length > 0) {
          setCurrentOrg(remaining[0]);
        } else {
          setCurrentOrgState(null);
        }
      }
    },
  });

  const deleteOrganization = (id) => deleteMutation.mutateAsync(id);

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
      refetch,
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
      refetch,
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

import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import {
  OrganizationProvider,
  useOrganization,
} from "../context/OrganizationContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock component to test context
const TestComponent = () => {
  const { organizations, loading, error } = useOrganization();
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  return (
    <div>
      <h1>Organizations</h1>
      <ul>
        {organizations.map((org) => (
          <li key={org.id}>{org.name}</li>
        ))}
      </ul>
    </div>
  );
};

// Setup Wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <OrganizationProvider>{children}</OrganizationProvider>
    </QueryClientProvider>
  );
};

describe("OrganizationContext", () => {
  it("renders loading state initially", async () => {
    // Mock fetch to pending
    global.fetch = vi.fn(() => new Promise(() => {}));

    render(<TestComponent />, { wrapper: createWrapper() });
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders organizations after fetch", async () => {
    const mockOrgs = [{ id: "1", name: "Test Org" }];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockOrgs,
    });

    render(<TestComponent />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Test Org")).toBeInTheDocument();
    });
  });
});

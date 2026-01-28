import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Prevent excessive refetches in dev
      retry: 1, // limited retries
      staleTime: 1000 * 60 * 5, // 5 minutes cache
    },
  },
});

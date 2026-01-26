import { useState, useMemo } from "react";

function HistoryView({ deployments, onDestroy, loading }) {
  const [filterProvider, setFilterProvider] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");

  const filteredDeployments = useMemo(() => {
    let result = [...deployments];

    // Filter by provider
    if (filterProvider !== "all") {
      result = result.filter((d) => d.provider === filterProvider);
    }

    // Sort
    result.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);

      if (sortBy === "date-desc") return dateB - dateA;
      if (sortBy === "date-asc") return dateA - dateB;
      return 0;
    });

    return result;
  }, [deployments, filterProvider, sortBy]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateStr));
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "active":
        return "✅";
      case "destroyed":
        return "🗑️";
      case "failed":
        return "❌";
      case "pending":
        return "⏳";
      default:
        return "❓";
    }
  };

  const getProviderIcon = (provider) => {
    return provider === "aws" ? "🟠" : "🔵";
  };

  return (
    <div className="history-view">
      <div className="history-header">
        <h3>Deployment Audit Log</h3>
        <div className="history-controls">
          <select
            className="history-select"
            value={filterProvider}
            onChange={(e) => setFilterProvider(e.target.value)}
          >
            <option value="all">All Providers</option>
            <option value="aws">AWS Only</option>
            <option value="azure">Azure Only</option>
          </select>

          <select
            className="history-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        <table className="history-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Resource</th>
              <th>Type</th>
              <th>Provider</th>
              <th>Created At</th>
              <th>Destroyed At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDeployments.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-cell">
                  No deployments found matching your filters.
                </td>
              </tr>
            ) : (
              filteredDeployments.map((deployment) => (
                <tr
                  key={deployment.deploymentId}
                  className={`row-${deployment.status}`}
                >
                  <td className="status-cell">
                    <span className="status-icon">
                      {getStatusIcon(deployment.status)}
                    </span>
                    <span className={`status-badge ${deployment.status}`}>
                      {deployment.status}
                    </span>
                  </td>
                  <td
                    className="resource-name"
                    title={deployment.resourceName || deployment.resourceId}
                  >
                    {deployment.resourceName ||
                      deployment.resourceId ||
                      "Unknown"}
                    <div className="resource-id-sub">
                      {deployment.deploymentId.slice(0, 8)}...
                    </div>
                  </td>
                  <td>{deployment.resourceType.toUpperCase()}</td>
                  <td>
                    <span className="provider-badge">
                      {getProviderIcon(deployment.provider)}{" "}
                      {deployment.provider.toUpperCase()}
                    </span>
                  </td>
                  <td>{formatDate(deployment.createdAt)}</td>
                  <td>{formatDate(deployment.destroyedAt)}</td>
                  <td>
                    {["active", "failed"].includes(deployment.status) && (
                      <button
                        className="btn-link btn-danger"
                        onClick={() => onDestroy(deployment.deploymentId)}
                        disabled={loading}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default HistoryView;

function DeploymentList({ deployments, onDestroy, loading }) {
  if (!deployments.length) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🏗️</div>
        <p>No deployments yet. Deploy your first resource above!</p>
      </div>
    );
  }

  const getResourceIcon = (resourceType) => {
    const icons = {
      ec2: "🖥️",
      s3: "🪣",
      vpc: "🌐",
      vm: "💻",
      storage: "📦",
      vnet: "🔗",
    };
    return icons[resourceType] || "☁️";
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const getResourceName = (deployment) => {
    if (deployment.resourceName) return deployment.resourceName;
    if (deployment.resourceId) {
      const id = deployment.resourceId;
      return id.length > 25 ? `${id.slice(0, 25)}...` : id;
    }
    return "Unknown Resource";
  };

  return (
    <div className="resource-grid">
      {deployments.map((deployment, index) => (
        <div
          key={deployment.deploymentId}
          className="resource-card"
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "1rem",
            }}
          >
            <span
              className="resource-icon"
              style={{ fontSize: "2.5rem", marginBottom: 0 }}
            >
              {getResourceIcon(deployment.resourceType)}
            </span>
            <span className={`deployment-status ${deployment.status}`}>
              {deployment.status}
            </span>
          </div>

          <h4 className="resource-name" style={{ fontSize: "1.1rem" }}>
            {getResourceName(deployment)}
          </h4>

          <div
            className="deployment-details"
            style={{ marginBottom: "1.5rem" }}
          >
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              {deployment.resourceType.toUpperCase()} •{" "}
              {formatDate(deployment.createdAt)}
            </p>
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--text-muted)",
                marginTop: "0.25rem",
                fontFamily: "monospace",
              }}
            >
              ID: {deployment.deploymentId.slice(0, 8)}...
            </p>
          </div>

          {["active", "failed"].includes(deployment.status) && (
            <button
              className="btn btn-danger"
              onClick={() => onDestroy(deployment.deploymentId)}
              disabled={loading}
              style={{ width: "100%", marginTop: "auto", padding: "0.75rem" }}
            >
              {loading ? (
                <span
                  className="spinner"
                  style={{ width: "16px", height: "16px" }}
                />
              ) : (
                <>🗑️ Destroy</>
              )}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export default DeploymentList;

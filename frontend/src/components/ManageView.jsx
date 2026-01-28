import { useState, useEffect } from "react";
import { Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function ManageView({ provider, resources, deployments, onDestroy, loading }) {
  const [selectedProvider, setSelectedProvider] = useState(provider);
  const [selectedDeploymentId, setSelectedDeploymentId] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Filter deployments for the selected provider that are active
  const activeDeployments = deployments.filter(
    (d) => d.provider === selectedProvider && d.status === "active",
  );

  const handleDestroy = async () => {
    if (!selectedDeploymentId) return;

    setFeedback(null);
    setShowConfirm(false);

    // Find deployment info for feedback
    const dept = activeDeployments.find(
      (d) => d.deploymentId === selectedDeploymentId,
    );

    await onDestroy(selectedDeploymentId);

    setFeedback({
      type: "success",
      message: `Resource ${dept?.resourceName || dept?.resourceId || "instance"} destroyed successfully`,
    });

    setSelectedDeploymentId("");

    // Clear feedback after 3s
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="manage-view animate-fade-in">
      <div
        className="glass-card"
        style={{ padding: "2rem", borderRadius: "var(--radius-lg)" }}
      >
        <h2
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: "2rem",
          }}
        >
          <Trash2 size={24} color="var(--error)" />
          Manage Resources
        </h2>

        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: "1rem",
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid var(--success)",
              borderRadius: "var(--radius-sm)",
              color: "var(--success)",
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <CheckCircle2 size={18} />
            {feedback.message}
          </motion.div>
        )}

        <div style={{ display: "grid", gap: "1.5rem", maxWidth: "500px" }}>
          <div className="form-group">
            <label className="form-label">Select Provider</label>
            <select
              className="form-select"
              value={selectedProvider}
              onChange={(e) => {
                setSelectedProvider(e.target.value);
                setSelectedDeploymentId("");
              }}
            >
              <option value="aws">AWS (Amazon Web Services)</option>
              <option value="azure">Azure (Microsoft Azure)</option>
              <option value="gcp">Google Cloud Platform</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Select Resource to Delete</label>
            <select
              className="form-select"
              value={selectedDeploymentId}
              onChange={(e) => setSelectedDeploymentId(e.target.value)}
              disabled={activeDeployments.length === 0}
            >
              <option value="">
                {activeDeployments.length === 0
                  ? "No active resources found"
                  : "-- Select a resource --"}
              </option>
              {activeDeployments.map((dept) => (
                <option key={dept.deploymentId} value={dept.deploymentId}>
                  {dept.resourceName || dept.resourceId} (
                  {dept.resourceType.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {!showConfirm ? (
            <button
              className="btn btn-danger"
              disabled={!selectedDeploymentId || loading}
              onClick={() => setShowConfirm(true)}
              style={{ padding: "1rem", marginTop: "1rem" }}
            >
              {loading ? (
                <span
                  className="spinner"
                  style={{ width: "20px", height: "20px" }}
                />
              ) : (
                <>
                  <Trash2 size={18} />
                  Delete Resource
                </>
              )}
            </button>
          ) : (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid var(--error)",
                padding: "1.5rem",
                borderRadius: "var(--radius-md)",
                marginTop: "1rem",
              }}
            >
              <h4
                style={{
                  color: "var(--error)",
                  margin: "0 0 0.5rem 0",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <AlertTriangle size={18} />
                Confirm Deletion
              </h4>
              <p
                style={{
                  fontSize: "0.9rem",
                  color: "var(--text-secondary)",
                  marginBottom: "1.5rem",
                }}
              >
                Are you sure you want to destroy this resource? This action
                cannot be undone.
              </p>
              <div style={{ display: "flex", gap: "1rem" }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowConfirm(false)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  onClick={handleDestroy}
                  disabled={loading}
                  style={{ flex: 1 }}
                >
                  {loading ? "Destroying..." : "Confirm Delete"}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ManageView;

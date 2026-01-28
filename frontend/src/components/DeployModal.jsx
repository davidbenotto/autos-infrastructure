import { useState } from "react";

function DeployModal({ provider, resource, onClose, onDeploy, loading }) {
  const [options, setOptions] = useState(() => {
    const initial = {};
    (resource.options || []).forEach((opt) => {
      initial[opt.name] = opt.default || "";
    });
    return initial;
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onDeploy(options);
  };

  const handleChange = (name, value) => {
    setOptions({ ...options, [name]: value });
  };

  const formatLabel = (name) => {
    return name
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase());
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <span style={{ fontSize: "1.5rem" }}>{resource.icon}</span>
            Deploy {resource.name}
          </h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <p
          style={{
            color: "var(--text-secondary)",
            marginBottom: "2rem",
            lineHeight: 1.6,
          }}
        >
          {resource.description} will be deployed on{" "}
          <strong>{provider.toUpperCase()}</strong>
        </p>

        {resource.error && (
          <div className="alert alert-error" style={{ marginBottom: "1.5rem" }}>
            <span style={{ fontSize: "1.25rem" }}>❌</span>
            {resource.error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {(resource.options || []).map((option) => (
            <div key={option.name} className="form-group">
              <label className="form-label">
                {formatLabel(option.name)}
                {/* Show cost for selected option if available */}
                {option.costMap && options[option.name] && (
                  <span
                    style={{
                      float: "right",
                      fontSize: "0.8rem",
                      color: "var(--primary)",
                      fontWeight: 500,
                    }}
                  >
                    {option.costMap[options[option.name]]}
                  </span>
                )}
              </label>

              {option.type === "select" ? (
                <select
                  className="form-select"
                  value={options[option.name]}
                  onChange={(e) => handleChange(option.name, e.target.value)}
                >
                  {option.choices.map((choice) => (
                    <option key={choice} value={choice}>
                      {choice}
                      {option.costMap?.[choice]
                        ? ` (${option.costMap[choice]})`
                        : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  className="form-input"
                  placeholder={option.placeholder || ""}
                  value={options[option.name]}
                  onChange={(e) => handleChange(option.name, e.target.value)}
                />
              )}
            </div>
          ))}

          {/* Cost Estimate Banner */}
          {resource.cost && (
            <div
              style={{
                marginTop: "1.5rem",
                padding: "1rem",
                background: "rgba(59, 130, 246, 0.1)",
                borderRadius: "8px",
                border: "1px solid rgba(59, 130, 246, 0.2)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <span style={{ fontSize: "1.5rem" }}>💵</span>
                <div>
                  <div
                    style={{
                      fontWeight: "600",
                      color: "var(--primary)",
                      fontSize: "1rem",
                    }}
                  >
                    Estimated Cost: {resource.cost.estimate}
                  </div>
                  {resource.cost.note && (
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-muted)",
                        marginTop: "0.25rem",
                      }}
                    >
                      {resource.cost.note}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="alert alert-warning" style={{ marginTop: "1.5rem" }}>
            <span style={{ fontSize: "1.25rem" }}>💰</span>
            This will create real cloud resources that may incur costs
          </div>

          <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`btn ${provider === "aws" ? "btn-aws" : "btn-azure"} btn-lg`}
              disabled={loading}
              style={{ flex: 2 }}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Deploying...
                </>
              ) : (
                <>
                  <span className="btn-icon">🚀</span>
                  Deploy Now
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DeployModal;

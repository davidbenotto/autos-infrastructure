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
              <label className="form-label">{formatLabel(option.name)}</label>

              {option.type === "select" ? (
                <select
                  className="form-select"
                  value={options[option.name]}
                  onChange={(e) => handleChange(option.name, e.target.value)}
                >
                  {option.choices.map((choice) => (
                    <option key={choice} value={choice}>
                      {choice}
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

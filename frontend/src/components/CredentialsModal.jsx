import { useState } from "react";

function CredentialsModal({ provider, onClose, onSave, loading }) {
  const [formData, setFormData] = useState(
    provider === "aws"
      ? { accessKeyId: "", secretAccessKey: "", region: "us-east-1" }
      : {
          tenantId: "",
          clientId: "",
          clientSecret: "",
          subscriptionId: "",
          resourceGroup: "cloud-portal-rg",
          location: "eastus",
        },
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const awsRegions = [
    "us-east-1",
    "us-east-2",
    "us-west-1",
    "us-west-2",
    "eu-west-1",
    "eu-west-2",
    "eu-central-1",
    "ap-southeast-1",
    "ap-southeast-2",
    "ap-northeast-1",
  ];

  const azureLocations = [
    "eastus",
    "eastus2",
    "westus",
    "westus2",
    "northeurope",
    "westeurope",
    "uksouth",
    "southeastasia",
    "eastasia",
    "japaneast",
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            {provider === "aws" ? "🟠 Connect to AWS" : "🔵 Connect to Azure"}
          </h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {provider === "aws" ? (
            <>
              <div className="form-group">
                <label className="form-label">Access Key ID *</label>
                <input
                  type="text"
                  name="accessKeyId"
                  className="form-input"
                  placeholder="AKIAIOSFODNN7EXAMPLE"
                  value={formData.accessKeyId}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Secret Access Key *</label>
                <input
                  type="password"
                  name="secretAccessKey"
                  className="form-input"
                  placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                  value={formData.secretAccessKey}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Region</label>
                <select
                  name="region"
                  className="form-select"
                  value={formData.region}
                  onChange={handleChange}
                >
                  {awsRegions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">Tenant ID *</label>
                <input
                  type="text"
                  name="tenantId"
                  className="form-input"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={formData.tenantId}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Client ID (App ID) *</label>
                <input
                  type="text"
                  name="clientId"
                  className="form-input"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={formData.clientId}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Client Secret *</label>
                <input
                  type="password"
                  name="clientSecret"
                  className="form-input"
                  placeholder="Your client secret"
                  value={formData.clientSecret}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Subscription ID *</label>
                <input
                  type="text"
                  name="subscriptionId"
                  className="form-input"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={formData.subscriptionId}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Resource Group</label>
                <input
                  type="text"
                  name="resourceGroup"
                  className="form-input"
                  placeholder="cloud-portal-rg"
                  value={formData.resourceGroup}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Location</label>
                <select
                  name="location"
                  className="form-select"
                  value={formData.location}
                  onChange={handleChange}
                >
                  {azureLocations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
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
              className={`btn ${provider === "aws" ? "btn-aws" : "btn-azure"}`}
              disabled={loading}
              style={{ flex: 1 }}
            >
              {loading ? <span className="spinner" /> : "Connect"}
            </button>
          </div>
        </form>

        <p
          style={{
            marginTop: "1.5rem",
            fontSize: "0.85rem",
            color: "var(--text-muted)",
            textAlign: "center",
          }}
        >
          🔒 Credentials are encrypted and stored only in your session
        </p>
      </div>
    </div>
  );
}

export default CredentialsModal;

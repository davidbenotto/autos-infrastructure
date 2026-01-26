function ResourceSelector({ resources, onSelect, provider }) {
  if (!resources.length) {
    return null;
  }

  return (
    <div className="resource-grid">
      {resources.map((resource, index) => (
        <div
          key={resource.id}
          className="resource-card"
          onClick={() => onSelect(resource)}
          style={{ animationDelay: `${index * 0.05}s` }}
        >
          <span className="resource-icon">{resource.icon}</span>
          <h4 className="resource-name">{resource.name}</h4>
          <p className="resource-description">{resource.description}</p>
          <button
            className={`btn ${provider === "aws" ? "btn-aws" : "btn-azure"}`}
            style={{ width: "100%", marginTop: "auto", padding: "0.75rem" }}
          >
            🚀 Deploy
          </button>
        </div>
      ))}
    </div>
  );
}

export default ResourceSelector;

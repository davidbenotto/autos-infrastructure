import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  History,
  Cloud,
  LogOut,
  Moon,
  Sun,
  Trash2,
} from "lucide-react";

function Sidebar({
  currentView,
  setCurrentView,
  provider,
  setProvider,
  onDisconnect,
}) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "dark";
  });

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard size={20} />,
    },
    { id: "history", label: "Deploy History", icon: <History size={20} /> },
    { id: "manage", label: "Manage Resources", icon: <Trash2 size={20} /> },
  ];

  return (
    <aside
      className="glass-panel"
      style={{
        width: "var(--sidebar-width)",
        height: "100vh",
        position: "fixed",
        left: 0,
        top: 0,
        display: "flex",
        flexDirection: "column",
        padding: "1.5rem",
        zIndex: 100,
      }}
    >
      <div
        className="logo"
        style={{
          marginBottom: "3rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
            padding: "8px",
            borderRadius: "12px",
          }}
        >
          <Cloud color="white" size={24} />
        </div>
        <span
          style={{
            fontSize: "1.25rem",
            fontWeight: "700",
            letterSpacing: "-0.5px",
          }}
        >
          CloudPortal
        </span>
      </div>

      <div style={{ marginBottom: "2rem" }}>
        <h3
          style={{
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "1px",
            color: "var(--text-muted)",
            marginBottom: "1rem",
          }}
        >
          Menu
        </h3>
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              width: "100%",
              padding: "0.75rem 1rem",
              background:
                currentView === item.id
                  ? "rgba(59, 130, 246, 0.1)"
                  : "transparent",
              border: "none",
              borderRadius: "var(--radius-sm)",
              color:
                currentView === item.id
                  ? "var(--primary)"
                  : "var(--text-secondary)",
              cursor: "pointer",
              marginBottom: "0.5rem",
              transition: "all 0.2s",
              fontWeight: 500,
            }}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: "auto" }}>
        <h3
          style={{
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "1px",
            color: "var(--text-muted)",
            marginBottom: "1rem",
          }}
        >
          Provider
        </h3>
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          {[
            { id: "aws", label: "AWS", color: "var(--accent-aws)" },
            { id: "azure", label: "Azure", color: "var(--accent-azure)" },
            { id: "gcp", label: "Google Cloud", color: "var(--accent-gcp)" },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setProvider(p.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                width: "100%",
                padding: "0.75rem 1rem",
                background:
                  provider === p.id ? `rgba(255,255,255,0.05)` : "transparent",
                border:
                  provider === p.id
                    ? `1px solid ${p.color}`
                    : "1px solid transparent",
                borderRadius: "var(--radius-sm)",
                color: "var(--text-primary)",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: p.color,
                }}
              ></div>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={toggleTheme}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "1rem",
          background: "transparent",
          border: "1px solid var(--bg-input)",
          borderRadius: "var(--radius-sm)",
          color: "var(--text-secondary)",
          cursor: "pointer",
          marginBottom: "0.5rem",
        }}
      >
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        {theme === "dark" ? "Light Mode" : "Dark Mode"}
      </button>

      <button
        onClick={onDisconnect}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "1rem",
          background: "var(--bg-input)",
          border: "none",
          borderRadius: "var(--radius-sm)",
          color: "var(--text-muted)",
          cursor: "pointer",
          marginTop: "1rem",
        }}
      >
        <LogOut size={18} />
        Disconnect
      </button>
    </aside>
  );
}

export default Sidebar;

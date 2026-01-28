import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, ChevronDown, Shield, Check, Plus, X } from "lucide-react";
import { useOrganization } from "../context/OrganizationContext";

export function OrgSelector() {
  const {
    organizations,
    currentOrg,
    isAdmin,
    setCurrentOrg,
    setAdminMode,
    createOrganization,
    loading,
  } = useOrganization();

  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgSlug, setNewOrgSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  if (loading) {
    return (
      <div
        style={{
          height: "36px",
          width: "180px",
          borderRadius: "8px",
          background: "var(--bg-input)",
          animation: "pulse 2s infinite",
        }}
      />
    );
  }

  const displayName = isAdmin
    ? "All Organizations"
    : currentOrg?.name || "Select Organization";

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    if (!newOrgName || !newOrgSlug) return;

    setCreating(true);
    setCreateError("");

    try {
      const newOrg = await createOrganization({
        name: newOrgName,
        slug: newOrgSlug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      });
      setCurrentOrg(newOrg);
      setShowCreate(false);
      setNewOrgName("");
      setNewOrgSlug("");
      setOpen(false);
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.5rem 1rem",
          borderRadius: "8px",
          border: "1px solid var(--bg-input)",
          background: open ? "rgba(59, 130, 246, 0.1)" : "var(--bg-card)",
          cursor: "pointer",
          minWidth: "200px",
          transition: "all 0.2s",
        }}
      >
        <div
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.75rem",
            fontWeight: "700",
            background: isAdmin
              ? "rgba(245, 158, 11, 0.2)"
              : "rgba(59, 130, 246, 0.1)",
            color: isAdmin ? "#f59e0b" : "var(--primary)",
          }}
        >
          {isAdmin ? <Shield size={14} /> : <Building2 size={14} />}
        </div>
        <span
          style={{
            fontSize: "0.9rem",
            fontWeight: "500",
            flex: 1,
            textAlign: "left",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: "var(--text-primary)",
          }}
        >
          {displayName}
        </span>
        <ChevronDown
          size={16}
          style={{
            color: "var(--text-muted)",
            transition: "transform 0.2s",
            transform: open ? "rotate(180deg)" : "rotate(0)",
          }}
        />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 40,
              }}
              onClick={() => {
                setOpen(false);
                setShowCreate(false);
              }}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                left: 0,
                width: "280px",
                borderRadius: "12px",
                border: "1px solid var(--bg-input)",
                background: "var(--bg-card)",
                boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
                zIndex: 50,
                overflow: "hidden",
              }}
            >
              <div style={{ padding: "0.5rem" }}>
                {/* Admin Mode Option */}
                <button
                  onClick={() => {
                    setAdminMode(true);
                    setOpen(false);
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.75rem",
                    borderRadius: "8px",
                    border: "none",
                    background: isAdmin
                      ? "rgba(245, 158, 11, 0.1)"
                      : "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 0.2s",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      background: "rgba(245, 158, 11, 0.2)",
                      color: "#f59e0b",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Shield size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <span
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: "500",
                        color: "var(--text-primary)",
                      }}
                    >
                      All Organizations
                    </span>
                    <p
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        margin: 0,
                      }}
                    >
                      Admin view
                    </p>
                  </div>
                  {isAdmin && <Check size={16} color="#f59e0b" />}
                </button>

                {organizations.length > 0 && (
                  <div
                    style={{
                      margin: "0.5rem 0",
                      borderTop: "1px solid var(--bg-input)",
                    }}
                  />
                )}

                {/* Organization List */}
                <div
                  style={{
                    maxHeight: "240px",
                    overflowY: "auto",
                  }}
                >
                  {organizations.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => {
                        setCurrentOrg(org);
                        setOpen(false);
                      }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "0.75rem",
                        borderRadius: "8px",
                        border: "none",
                        background:
                          currentOrg?.id === org.id && !isAdmin
                            ? "rgba(59, 130, 246, 0.1)"
                            : "transparent",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "background 0.2s",
                        marginBottom: "0.25rem",
                      }}
                    >
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "8px",
                          background:
                            currentOrg?.id === org.id && !isAdmin
                              ? "rgba(59, 130, 246, 0.2)"
                              : "var(--bg-input)",
                          color:
                            currentOrg?.id === org.id && !isAdmin
                              ? "var(--primary)"
                              : "var(--text-muted)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.75rem",
                          fontWeight: "700",
                        }}
                      >
                        {org.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span
                          style={{
                            fontSize: "0.9rem",
                            fontWeight: "500",
                            color: "var(--text-primary)",
                            display: "block",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {org.name}
                        </span>
                        <p
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--text-muted)",
                            margin: 0,
                          }}
                        >
                          {org.deployment_count || 0} deployment
                          {org.deployment_count !== 1 ? "s" : ""}
                        </p>
                      </div>
                      {currentOrg?.id === org.id && !isAdmin && (
                        <Check size={16} color="var(--primary)" />
                      )}
                    </button>
                  ))}
                </div>

                <div
                  style={{
                    margin: "0.5rem 0",
                    borderTop: "1px solid var(--bg-input)",
                  }}
                />

                {/* Create New Organization */}
                {!showCreate ? (
                  <button
                    onClick={() => setShowCreate(true)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: "0.75rem",
                      borderRadius: "8px",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      color: "var(--primary)",
                      fontSize: "0.9rem",
                      fontWeight: "500",
                    }}
                  >
                    <Plus size={16} />
                    Create Organization
                  </button>
                ) : (
                  <form
                    onSubmit={handleCreateOrg}
                    style={{ padding: "0.5rem" }}
                  >
                    <div style={{ marginBottom: "0.5rem" }}>
                      <input
                        type="text"
                        placeholder="Organization name"
                        value={newOrgName}
                        onChange={(e) => {
                          setNewOrgName(e.target.value);
                          setNewOrgSlug(
                            e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9]/g, "-"),
                          );
                        }}
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          borderRadius: "6px",
                          border: "1px solid var(--bg-input)",
                          background: "var(--bg-dark)",
                          color: "var(--text-primary)",
                          fontSize: "0.9rem",
                        }}
                      />
                    </div>
                    <div style={{ marginBottom: "0.5rem" }}>
                      <input
                        type="text"
                        placeholder="slug (e.g. my-org)"
                        value={newOrgSlug}
                        onChange={(e) => setNewOrgSlug(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          borderRadius: "6px",
                          border: "1px solid var(--bg-input)",
                          background: "var(--bg-dark)",
                          color: "var(--text-primary)",
                          fontSize: "0.9rem",
                        }}
                      />
                    </div>
                    {createError && (
                      <p
                        style={{
                          color: "var(--error)",
                          fontSize: "0.75rem",
                          margin: "0.5rem 0",
                        }}
                      >
                        {createError}
                      </p>
                    )}
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreate(false);
                          setNewOrgName("");
                          setNewOrgSlug("");
                          setCreateError("");
                        }}
                        style={{
                          flex: 1,
                          padding: "0.5rem",
                          borderRadius: "6px",
                          border: "1px solid var(--bg-input)",
                          background: "transparent",
                          color: "var(--text-secondary)",
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={creating || !newOrgName || !newOrgSlug}
                        style={{
                          flex: 1,
                          padding: "0.5rem",
                          borderRadius: "6px",
                          border: "none",
                          background: "var(--primary)",
                          color: "white",
                          cursor: creating ? "wait" : "pointer",
                          opacity: !newOrgName || !newOrgSlug ? 0.5 : 1,
                        }}
                      >
                        {creating ? "..." : "Create"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default OrgSelector;

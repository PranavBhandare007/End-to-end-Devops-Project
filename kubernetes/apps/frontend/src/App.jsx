import { useState, useEffect } from "react";

function App() {
  const [users, setUsers]     = useState([]);
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setFetching(true);
    try {
      const res  = await fetch("/api/users");
      const data = await res.json();
      setUsers(data.users);
    } catch {
      showMessage("Failed to fetch users", "error");
    } finally {
      setFetching(false);
    }
  };

  const createUser = async () => {
    if (!name || !email) { showMessage("Please fill in all fields", "error"); return; }
    if (!email.includes("@")) { showMessage("Please enter a valid email", "error"); return; }
    setLoading(true);
    try {
      const res  = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      showMessage("User created successfully!", "success");
      setName(""); setEmail("");
      fetchUsers();
    } catch {
      showMessage("Failed to create user", "error");
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id) => {
    setDeletingId(id);
    try {
      await fetch(`/api/users/${id}`, { method: "DELETE" });
      showMessage("User deleted successfully!", "success");
      fetchUsers();
    } catch {
      showMessage("Failed to delete user", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 3000);
  };

  const getInitials = (name) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const avatarColors = [
    "#4f46e5","#0891b2","#059669","#d97706","#dc2626","#7c3aed","#db2777"
  ];
  const getColor = (id) => avatarColors[id % avatarColors.length];

  return (
    <div style={styles.page}>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>⚙️</div>
          <div>
            <div style={styles.headerTitle}>User Management</div>
            <div style={styles.headerSub}>DevOps End-to-End Project</div>
          </div>
        </div>
        <div style={styles.badge}>{users.length} Users</div>
      </div>

      <div style={styles.body}>

        {/* Add User Card */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardIcon}>➕</span>
            <span style={styles.cardTitle}>Add New User</span>
          </div>
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Full Name</label>
              <input
                style={styles.input}
                placeholder="e.g. John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createUser()}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Email Address</label>
              <input
                style={styles.input}
                placeholder="e.g. john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createUser()}
              />
            </div>
            <button
              style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }}
              onClick={createUser}
              disabled={loading}
            >
              {loading ? "Adding..." : "Add User"}
            </button>
          </div>
          {message.text && (
            <div style={{
              ...styles.alert,
              background: message.type === "success" ? "#d1fae5" : "#fee2e2",
              color:      message.type === "success" ? "#065f46" : "#991b1b",
              border:     message.type === "success" ? "1px solid #6ee7b7" : "1px solid #fca5a5",
            }}>
              {message.type === "success" ? "✅" : "❌"} {message.text}
            </div>
          )}
        </div>

        {/* Users Table Card */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardIcon}>👥</span>
            <span style={styles.cardTitle}>All Users</span>
            <button style={styles.refreshBtn} onClick={fetchUsers}>↻ Refresh</button>
          </div>

          {fetching ? (
            <div style={styles.empty}>Loading users...</div>
          ) : users.length === 0 ? (
            <div style={styles.empty}>No users found. Add one above!</div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr style={styles.thead}>
                  <th style={styles.th}>User</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={styles.userCell}>
                        <div style={{ ...styles.avatar, background: getColor(u.id) }}>
                          {getInitials(u.name)}
                        </div>
                        <span style={styles.userName}>{u.name}</span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.emailText}>{u.email}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.idBadge}>#{u.id}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.statusBadge}>● Active</span>
                    </td>
                    <td style={styles.td}>
                      <button
                        style={{
                          ...styles.deleteBtn,
                          opacity: deletingId === u.id ? 0.5 : 1
                        }}
                        onClick={() => deleteUser(u.id)}
                        disabled={deletingId === u.id}
                      >
                        {deletingId === u.id ? "..." : "🗑 Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Stats Row */}
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <div style={styles.statNumber}>{users.length}</div>
            <div style={styles.statLabel}>Total Users</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statNumber, color: "#059669" }}>{users.length}</div>
            <div style={styles.statLabel}>Active</div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statNumber, color: "#d97706" }}>0</div>
            <div style={styles.statLabel}>Inactive</div>
          </div>
        </div>

      </div>
    </div>
  );
}

const styles = {
  page:        { minHeight: "100vh", background: "#f1f5f9", fontFamily: "Arial, sans-serif" },
  header:      { background: "#1e293b", padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  headerLeft:  { display: "flex", alignItems: "center", gap: "12px" },
  logo:        { fontSize: "28px" },
  headerTitle: { color: "#f8fafc", fontSize: "20px", fontWeight: "bold" },
  headerSub:   { color: "#94a3b8", fontSize: "12px" },
  badge:       { background: "#3b82f6", color: "white", padding: "6px 14px", borderRadius: "20px", fontSize: "13px", fontWeight: "bold" },
  body:        { maxWidth: "900px", margin: "32px auto", padding: "0 20px" },
  card:        { background: "white", borderRadius: "12px", padding: "24px", marginBottom: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  cardHeader:  { display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" },
  cardIcon:    { fontSize: "18px" },
  cardTitle:   { fontSize: "16px", fontWeight: "bold", color: "#1e293b", flex: 1 },
  formRow:     { display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" },
  formGroup:   { flex: 1, minWidth: "180px" },
  label:       { display: "block", fontSize: "13px", color: "#64748b", marginBottom: "6px", fontWeight: "500" },
  input:       { width: "100%", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box", outline: "none" },
  btn:         { background: "#3b82f6", color: "white", border: "none", padding: "10px 24px", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: "bold", whiteSpace: "nowrap" },
  deleteBtn:   { background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "500" },
  alert:       { marginTop: "14px", padding: "10px 14px", borderRadius: "8px", fontSize: "14px" },
  refreshBtn:  { background: "#f1f5f9", border: "1px solid #e2e8f0", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", color: "#64748b" },
  empty:       { textAlign: "center", color: "#94a3b8", padding: "40px", fontSize: "14px" },
  table:       { width: "100%", borderCollapse: "collapse" },
  thead:       { background: "#f8fafc" },
  th:          { padding: "12px 16px", textAlign: "left", fontSize: "12px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e2e8f0" },
  tr:          { borderBottom: "1px solid #f1f5f9" },
  td:          { padding: "14px 16px", fontSize: "14px" },
  userCell:    { display: "flex", alignItems: "center", gap: "10px" },
  avatar:      { width: "36px", height: "36px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "13px", fontWeight: "bold", flexShrink: 0 },
  userName:    { fontWeight: "500", color: "#1e293b" },
  emailText:   { color: "#64748b" },
  idBadge:     { background: "#f1f5f9", color: "#64748b", padding: "3px 8px", borderRadius: "4px", fontSize: "12px" },
  statusBadge: { color: "#059669", fontSize: "13px", fontWeight: "500" },
  statsRow:    { display: "flex", gap: "16px" },
  statCard:    { flex: 1, background: "white", borderRadius: "12px", padding: "20px", textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  statNumber:  { fontSize: "32px", fontWeight: "bold", color: "#1e293b" },
  statLabel:   { fontSize: "13px", color: "#94a3b8", marginTop: "4px" },
};

export default App;

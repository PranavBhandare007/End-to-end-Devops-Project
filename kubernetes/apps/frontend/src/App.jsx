import { useState, useEffect } from "react";

function App() {
  const [users, setUsers]     = useState([]);
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch users on page load
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setUsers(data.users);
    } catch (err) {
      setMessage("Error fetching users");
    }
  };

  const createUser = async () => {
    if (!name || !email) {
      setMessage("Please fill in both fields");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      setMessage(data.message);
      setName("");
      setEmail("");
      fetchUsers(); // refresh list
    } catch (err) {
      setMessage("Error creating user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>DevOps Project — User Manager</h1>

      {/* Create user form */}
      <div style={styles.card}>
        <h2 style={styles.subtitle}>Add User</h2>
        <input
          style={styles.input}
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          style={styles.input}
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button
          style={styles.button}
          onClick={createUser}
          disabled={loading}
        >
          {loading ? "Creating..." : "Create User"}
        </button>
        {message && <p style={styles.message}>{message}</p>}
      </div>

      {/* Users list */}
      <div style={styles.card}>
        <h2 style={styles.subtitle}>Users ({users.length})</h2>
        {users.length === 0 ? (
          <p style={styles.empty}>No users yet</p>
        ) : (
          users.map((u) => (
            <div key={u.id} style={styles.userRow}>
              <span style={styles.userId}>#{u.id}</span>
              <span style={styles.userName}>{u.name}</span>
              <span style={styles.userEmail}>{u.email}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  container:  { maxWidth: "700px", margin: "40px auto", fontFamily: "Arial, sans-serif", padding: "0 20px" },
  title:      { color: "#1a1a2e", borderBottom: "3px solid #e94560", paddingBottom: "10px" },
  card:       { background: "#fff", borderRadius: "8px", padding: "24px", marginBottom: "24px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" },
  subtitle:   { color: "#16213e", marginTop: 0 },
  input:      { display: "block", width: "100%", padding: "10px", marginBottom: "12px", borderRadius: "4px", border: "1px solid #ddd", fontSize: "14px", boxSizing: "border-box" },
  button:     { background: "#e94560", color: "#fff", border: "none", padding: "10px 24px", borderRadius: "4px", cursor: "pointer", fontSize: "14px" },
  message:    { color: "#16213e", marginTop: "10px", fontWeight: "bold" },
  empty:      { color: "#999", fontStyle: "italic" },
  userRow:    { display: "flex", gap: "16px", padding: "10px 0", borderBottom: "1px solid #f0f0f0", alignItems: "center" },
  userId:     { color: "#999", fontSize: "12px", minWidth: "30px" },
  userName:   { fontWeight: "bold", flex: 1 },
  userEmail:  { color: "#666", fontSize: "14px" },
};

export default App;
import React, { useState, useEffect } from "react";

function App() {
  const [users, setUsers]     = useState([]);
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res  = await fetch("/api/users");
      const data = await res.json();
      setUsers(data.users);
    } catch (err) {
      setMessage("Error fetching users");
    }
  };

  const createUser = async () => {
    if (!name || !email) { setMessage("Please fill in both fields"); return; }
    try {
      const res  = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      setMessage(data.message);
      setName(""); setEmail("");
      fetchUsers();
    } catch (err) {
      setMessage("Error creating user");
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>DevOps Project — User Management</h1>
      <div style={styles.form}>
        <h2>Add User</h2>
        <input style={styles.input} placeholder="Name"  value={name}  onChange={(e) => setName(e.target.value)}  />
        <input style={styles.input} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button style={styles.button} onClick={createUser}>Create User</button>
        {message && <p style={styles.message}>{message}</p>}
      </div>
      <div style={styles.list}>
        <h2>Users ({users.length})</h2>
        {users.length === 0 ? <p>No users found</p> : users.map((u) => (
          <div key={u.id} style={styles.card}>
            <strong>{u.name}</strong>
            <span style={styles.email}>{u.email}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: { maxWidth:"600px", margin:"40px auto", fontFamily:"Arial, sans-serif", padding:"0 20px" },
  title:     { textAlign:"center", color:"#333" },
  form:      { background:"#f5f5f5", padding:"20px", borderRadius:"8px", marginBottom:"30px" },
  input:     { display:"block", width:"100%", padding:"10px", marginBottom:"10px", borderRadius:"4px", border:"1px solid #ddd", boxSizing:"border-box" },
  button:    { background:"#0066cc", color:"white", padding:"10px 20px", border:"none", borderRadius:"4px", cursor:"pointer", width:"100%" },
  message:   { color:"green", marginTop:"10px" },
  list:      { background:"#fff", padding:"20px", borderRadius:"8px", border:"1px solid #ddd" },
  card:      { display:"flex", justifyContent:"space-between", padding:"10px", borderBottom:"1px solid #eee" },
  email:     { color:"#666" },
};

export default App;

import { useState, useEffect } from 'react';
import './App.css';

interface HealthStatus {
  status: string;
  timestamp: string;
  database: string;
}

function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8787';
    
    fetch(`${apiUrl}/health`)
      .then((res) => res.json())
      .then((data) => {
        setHealth(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>School Management System</h1>
        <p>Modern, cloud-native school management platform</p>
      </header>

      <main className="app-main">
        <section className="status-card">
          <h2>System Status</h2>
          {loading && <p>Checking API status...</p>}
          {error && (
            <div className="status-error">
              <p>❌ API Connection Failed</p>
              <p className="error-message">{error}</p>
            </div>
          )}
          {health && (
            <div className="status-success">
              <p>✅ API Status: {health.status}</p>
              <p>🗄️ Database: {health.database}</p>
              <p className="timestamp">Last checked: {new Date(health.timestamp).toLocaleString()}</p>
            </div>
          )}
        </section>

        <section className="info-card">
          <h2>Welcome</h2>
          <p>This is the foundation of your School Management System.</p>
          <p>Features will be added in upcoming phases.</p>
        </section>
      </main>

      <footer className="app-footer">
        <p>School Management System v1.0.0</p>
      </footer>
    </div>
  );
}

export default App;

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import useAuthStore from '../store/authStore';


const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  
const token = useAuthStore((s) => s.token);
if (token) {
    navigate('/');
    return null;
}

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      login(res.data.user, res.data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={container}>
      <div style={card}>
        <h2 style={title}>Welcome back</h2>
        <p style={subtitle}>Login to your Dalal Street account</p>

        {error && <div style={errorBox}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <input
            style={input}
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            style={input}
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <button style={btn} type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1rem', color: '#888' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: '#00d09c' }}>Register</Link>
        </p>
      </div>
    </div>
  );
};

const container = {
  minHeight: '90vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const card = {
  background: '#1a1a1a',
  padding: '2.5rem',
  borderRadius: '12px',
  width: '100%',
  maxWidth: '400px',
  border: '1px solid #2a2a2a',
};

const title = {
  fontSize: '1.5rem',
  fontWeight: 'bold',
  marginBottom: '0.5rem',
};

const subtitle = {
  color: '#888',
  marginBottom: '1.5rem',
};

const input = {
  width: '100%',
  padding: '0.8rem 1rem',
  marginBottom: '1rem',
  background: '#0f0f0f',
  border: '1px solid #2a2a2a',
  borderRadius: '8px',
  color: '#e0e0e0',
  fontSize: '0.95rem',
  display: 'block',
};

const btn = {
  width: '100%',
  padding: '0.85rem',
  background: '#00d09c',
  color: '#000',
  border: 'none',
  borderRadius: '8px',
  fontWeight: 'bold',
  fontSize: '1rem',
  cursor: 'pointer',
};

const errorBox = {
  background: '#2a1a1a',
  border: '1px solid #ff4444',
  color: '#ff4444',
  padding: '0.75rem 1rem',
  borderRadius: '8px',
  marginBottom: '1rem',
  fontSize: '0.9rem',
};

export default Login;
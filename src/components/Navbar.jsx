import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const Navbar = () => {
  const { user, token, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav style={{
      padding: '1rem 2rem',
      background: '#141414',
      borderBottom: '1px solid #2a2a2a',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <Link to="/" style={{ color: '#00d09c', fontWeight: 'bold', fontSize: '1.3rem', textDecoration: 'none' }}>
        Dalal Street
      </Link>

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        {token ? (
          <>
            <Link to="/" style={navLink}>Home</Link>
            <Link to="/portfolio" style={navLink}>Portfolio</Link>
            <Link to="/watchlist" style={navLink}>Watchlist</Link>
            <span style={{ color: '#888', fontSize: '0.9rem' }}>Hi, {user?.name || 'User'}</span>
            <button onClick={handleLogout} style={logoutBtn}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" style={navLink}>Login</Link>
            <Link to="/register" style={navLink}>Register</Link>
          </>
        )}
      </div>
    </nav>
  );
};

const navLink = {
  color: '#e0e0e0',
  textDecoration: 'none',
  fontSize: '0.95rem',
};

const logoutBtn = {
  background: 'transparent',
  border: '1px solid #444',
  color: '#e0e0e0',
  padding: '0.4rem 1rem',
  borderRadius: '6px',
  cursor: 'pointer',
};

export default Navbar;
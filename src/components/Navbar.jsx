import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const Navbar = () => {
  const { user, token, logout } = useAuthStore();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMenuOpen(false);
  };

  return (
    <nav style={{
      padding: '1rem 2rem',
      background: '#141414',
      borderBottom: '1px solid #2a2a2a',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'relative',
    }}>
      <Link to="/" style={{ color: '#00d09c', fontWeight: 'bold', fontSize: '1.3rem', textDecoration: 'none' }}>
        Dalal Street
      </Link>

      {/* Hamburger button — only visible on mobile */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        style={{
          display: 'none',
          background: 'transparent',
          border: 'none',
          color: '#e0e0e0',
          fontSize: '1.5rem',
          cursor: 'pointer',
          padding: '0.25rem',
        }}
        className="hamburger"
      >
        {menuOpen ? '✕' : '☰'}
      </button>

      {/* Desktop nav */}
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }} className="nav-desktop">
        {token ? (
          <>
            <Link to="/" style={navLink}>Home</Link>
            <Link to="/portfolio" style={navLink}>Portfolio</Link>
            <Link to="/watchlist" style={navLink}>Watchlist</Link>
            <Link to="/battles" style={navLink}>Battles</Link>
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

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: '#141414',
          borderBottom: '1px solid #2a2a2a',
          padding: '1rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          zIndex: 1000,
        }} className="nav-mobile">
          {token ? (
            <>
              <Link to="/" style={navLink} onClick={() => setMenuOpen(false)}>Home</Link>
              <Link to="/portfolio" style={navLink} onClick={() => setMenuOpen(false)}>Portfolio</Link>
              <Link to="/watchlist" style={navLink} onClick={() => setMenuOpen(false)}>Watchlist</Link>
              <Link to="/battles" style={navLink} onClick={() => setMenuOpen(false)}>Battles</Link>
              <span style={{ color: '#888', fontSize: '0.9rem' }}>Hi, {user?.name || 'User'}</span>
              <button onClick={handleLogout} style={{ ...logoutBtn, width: 'fit-content' }}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" style={navLink} onClick={() => setMenuOpen(false)}>Login</Link>
              <Link to="/register" style={navLink} onClick={() => setMenuOpen(false)}>Register</Link>
            </>
          )}
        </div>
      )}
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
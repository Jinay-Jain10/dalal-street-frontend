import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const Home = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    if (!value.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    // Debounce — wait 400ms after user stops typing
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get(`/stocks/search?q=${value}`);
        setResults(res.data.results);
        setShowDropdown(true);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 400);
  };

  const handleSelect = (stock) => {
    setShowDropdown(false);
    setQuery('');
    navigate(`/stock/${encodeURIComponent(stock.symbol)}`);
  };

  return (
    <div style={container}>
      <div style={hero}>
        <h1 style={heroTitle}>Indian Stock Market Simulator</h1>
        <p style={heroSubtitle}>
          Search NSE & BSE stocks, track live prices, read news with AI sentiment, and trade with ₹1,00,000 virtual money.
        </p>

        <div style={searchWrapper} ref={dropdownRef}>
          <div style={searchForm}>
            <input
              style={searchInput}
              type="text"
              placeholder="Search stocks... (e.g. Reliance, TCS, Infosys)"
              value={query}
              onChange={handleChange}
              onFocus={() => results.length > 0 && setShowDropdown(true)}
            />
            {loading && <span style={loadingSpinner}>⏳</span>}
          </div>

          {showDropdown && results.length > 0 && (
            <div style={dropdown}>
              {results.map((stock) => (
                <div
                  key={stock.symbol}
                  style={dropdownItem}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#222'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  onClick={() => handleSelect(stock)}
                >
                  <div>
                    <span style={stockSymbol}>{stock.symbol}</span>
                    <span style={stockName}>{stock.name}</span>
                  </div>
                  <span style={exchangeBadge}>{stock.exchange}</span>
                </div>
              ))}

              <div style={dropdownFooter}>
                Can't find your stock? Try the exact NSE symbol (e.g. MCX.NS, MAZDOCK.NS)
              </div>
            </div>
          )}

          {showDropdown && results.length === 0 && !loading && query.trim() && (
            <div style={dropdown}>
              <div style={{ padding: '1rem', color: '#888', textAlign: 'center' }}>
                No results found. Try searching by exact NSE symbol (e.g. MCX.NS)
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const container = {
  maxWidth: '800px',
  margin: '0 auto',
  padding: '2rem',
};

const hero = {
  textAlign: 'center',
  padding: '4rem 0 2rem',
};

const heroTitle = {
  fontSize: '2rem',
  fontWeight: 'bold',
  marginBottom: '1rem',
};

const heroSubtitle = {
  color: '#888',
  fontSize: '1rem',
  marginBottom: '2rem',
  lineHeight: '1.6',
};

const searchWrapper = {
  position: 'relative',
  maxWidth: '600px',
  margin: '0 auto',
};

const searchForm = {
  display: 'flex',
  alignItems: 'center',
  position: 'relative',
};

const searchInput = {
  width: '100%',
  padding: '0.85rem 1rem',
  background: '#1a1a1a',
  border: '1px solid #2a2a2a',
  borderRadius: '8px',
  color: '#e0e0e0',
  fontSize: '0.95rem',
};

const loadingSpinner = {
  position: 'absolute',
  right: '1rem',
};

const dropdown = {
  position: 'absolute',
  top: 'calc(100% + 4px)',
  left: 0,
  right: 0,
  background: '#1a1a1a',
  border: '1px solid #2a2a2a',
  borderRadius: '8px',
  zIndex: 100,
  maxHeight: '320px',
  overflowY: 'auto',
};

const dropdownItem = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.85rem 1rem',
  cursor: 'pointer',
  borderBottom: '1px solid #222',
  transition: 'background 0.15s',
};

const stockSymbol = {
  fontWeight: 'bold',
  color: '#00d09c',
  marginRight: '0.75rem',
};

const stockName = {
  color: '#888',
  fontSize: '0.9rem',
};

const exchangeBadge = {
  background: '#2a2a2a',
  color: '#aaa',
  padding: '0.25rem 0.6rem',
  borderRadius: '20px',
  fontSize: '0.75rem',
  whiteSpace: 'nowrap',
};

const dropdownFooter = {
  padding: '0.75rem 1rem',
  color: '#555',
  fontSize: '0.8rem',
  textAlign: 'center',
};

export default Home;
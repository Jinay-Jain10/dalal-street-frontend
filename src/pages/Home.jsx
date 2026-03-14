import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const Home = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [market, setMarket] = useState(null);
  const [marketLoading, setMarketLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    fetchMarketOverview();
    const interval = setInterval(() => fetchMarketOverview(true), 5 * 60 * 1000);
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => {
      clearInterval(interval);
      document.removeEventListener('mousedown', handler);
    };
  }, []);

  const fetchMarketOverview = async (silent = false) => {
    if (!silent) setMarketLoading(true);
    try {
      const res = await api.get('/stocks/market/overview');
      setMarket(res.data);
      setLastUpdated(res.data.fetchedAt); // use server timestamp
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setMarketLoading(false);
    }
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    if (!value.trim()) { setResults([]); setShowDropdown(false); return; }
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
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem' }}>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '3rem 0 2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.75rem' }}>
          Dalal Street 🏦
        </h1>
        <p style={{ color: '#888', fontSize: '1rem', marginBottom: '2rem', lineHeight: '1.6' }}>
          Trade NSE stocks with ₹1,00,000 virtual money. Track live prices, read AI-powered news sentiment, and compete with friends.
        </p>

        {/* Search */}
        <div style={{ position: 'relative', maxWidth: '600px', margin: '0 auto' }} ref={dropdownRef}>
          <div style={{ position: 'relative' }}>
            <input
              style={searchInput}
              type="text"
              placeholder="Search stocks... (e.g. Reliance, TCS, Infosys)"
              value={query}
              onChange={handleChange}
              onFocus={() => results.length > 0 && setShowDropdown(true)}
            />
            {loading && <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)' }}>⏳</span>}
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
                    <span style={{ fontWeight: 'bold', color: '#00d09c', marginRight: '0.75rem' }}>{stock.symbol}</span>
                    <span style={{ color: '#888', fontSize: '0.9rem' }}>{stock.name}</span>
                  </div>
                  <span style={{ background: '#2a2a2a', color: '#aaa', padding: '0.25rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem' }}>{stock.exchange}</span>
                </div>
              ))}
              <div style={{ padding: '0.75rem 1rem', color: '#555', fontSize: '0.8rem', textAlign: 'center' }}>
                Can't find your stock? Try the exact NSE symbol (e.g. MCX.NS)
              </div>
            </div>
          )}

          {showDropdown && results.length === 0 && !loading && query.trim() && (
            <div style={dropdown}>
              <div style={{ padding: '1rem', color: '#888', textAlign: 'center' }}>
                No results found. Try searching by exact NSE symbol.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Market Indices */}
      {marketLoading ? (
        <div style={{ textAlign: 'center', color: '#555', padding: '2rem' }}>Loading market data...</div>
      ) : market ? (
        <>
          {/* Index Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            {market.indices.map((idx) => {
              const isPos = idx.change >= 0;
              const color = isPos ? '#00d09c' : '#ff4444';
              return (
                <div key={idx.name} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '1.5rem' }}>
                  <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{idx.name}</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                    {idx.last?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ color, fontSize: '0.95rem' }}>
                    {isPos ? '▲' : '▼'} {Math.abs(idx.change)?.toFixed(2)} ({Math.abs(idx.pChange)?.toFixed(2)}%)
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem' }}>
                    <span style={{ color: '#555', fontSize: '0.8rem' }}>H: <span style={{ color: '#e0e0e0' }}>{idx.high?.toLocaleString('en-IN')}</span></span>
                    <span style={{ color: '#555', fontSize: '0.8rem' }}>L: <span style={{ color: '#e0e0e0' }}>{idx.low?.toLocaleString('en-IN')}</span></span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Gainers and Losers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>

            {/* Top Gainers */}
            <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '1rem', color: '#00d09c' }}>🚀 Top Gainers</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Stock', 'Price', 'Change'].map((h) => (
                      <th key={h} style={{ textAlign: 'left', color: '#555', fontSize: '0.75rem', paddingBottom: '0.5rem', fontWeight: 'normal' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {market.gainers.map((s) => (
                    <tr
                      key={s.symbol}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/stock/${encodeURIComponent(s.symbol + '.NS')}`)}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      <td style={td}>
                        <div style={{ color: '#00d09c', fontWeight: 'bold', fontSize: '0.85rem' }}>{s.symbol}</div>
                        <div style={{ color: '#555', fontSize: '0.75rem' }}>{s.name?.split(' ').slice(0, 2).join(' ')}</div>
                      </td>
                      <td style={td}>₹{s.price?.toFixed(2)}</td>
                      <td style={{ ...td, color: '#00d09c' }}>▲ {s.pChange?.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Top Losers */}
            <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '1rem', color: '#ff4444' }}>📉 Top Losers</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Stock', 'Price', 'Change'].map((h) => (
                      <th key={h} style={{ textAlign: 'left', color: '#555', fontSize: '0.75rem', paddingBottom: '0.5rem', fontWeight: 'normal' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {market.losers.map((s) => (
                    <tr
                      key={s.symbol}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/stock/${encodeURIComponent(s.symbol + '.NS')}`)}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      <td style={td}>
                        <div style={{ color: '#ff4444', fontWeight: 'bold', fontSize: '0.85rem' }}>{s.symbol}</div>
                        <div style={{ color: '#555', fontSize: '0.75rem' }}>{s.name?.split(' ').slice(0, 2).join(' ')}</div>
                      </td>
                      <td style={td}>₹{s.price?.toFixed(2)}</td>
                      <td style={{ ...td, color: '#ff4444' }}>▼ {Math.abs(s.pChange)?.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Market Status */}
          <div style={{ textAlign: 'center', color: '#555', fontSize: '0.8rem' }}>
  NSE data · Updates every 5 minutes during market hours (Mon–Fri, 9:15 AM – 3:30 PM IST)
  {lastUpdated && <span style={{ marginLeft: '1rem' }}>· Last updated: {lastUpdated}</span>}
</div>
        </>
      ) : null}
    </div>
  );
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
};

const td = {
  padding: '0.6rem 0.5rem',
  fontSize: '0.85rem',
  borderBottom: '1px solid #1a1a1a',
};

export default Home;
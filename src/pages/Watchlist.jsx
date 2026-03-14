import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import usePriceStore from '../store/priceStore';

const Watchlist = () => {
  const navigate = useNavigate();
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef(null);

  const { prices, subscribe, unsubscribe, lastUpdated } = usePriceStore();

  useEffect(() => {
    fetchWatchlist();
  }, []);

  useEffect(() => {
    if (watchlist.length === 0) return;
    const symbols = watchlist.map((s) => s.symbol);
    subscribe(symbols);
    return () => unsubscribe(symbols);
  }, [watchlist]);

  const fetchWatchlist = async () => {
    setLoading(true);
    try {
      const res = await api.get('/watchlist');
      setWatchlist(res.data.watchlist);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (value) => {
    setSearchQuery(value);
    if (!value.trim()) { setSearchResults([]); setShowDropdown(false); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await api.get(`/stocks/search?q=${value}`);
        setSearchResults(res.data.results);
        setShowDropdown(true);
      } catch { }
      finally { setSearchLoading(false); }
    }, 400);
  };

  const addToWatchlist = async (stock) => {
    setShowDropdown(false);
    setSearchQuery('');
    setSearchResults([]);
    try {
      await api.post('/watchlist', { symbol: stock.symbol, company_name: stock.name });
      fetchWatchlist();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add to watchlist');
    }
  };

  const removeFromWatchlist = async (symbol) => {
    try {
      await api.delete(`/watchlist/${symbol}`);
      unsubscribe([symbol]);
      setWatchlist((prev) => prev.filter((w) => w.symbol !== symbol));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div style={centered}>Loading watchlist...</div>;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h1 style={{ fontSize: 'clamp(1.4rem, 3vw, 1.8rem)', fontWeight: 'bold' }}>My Watchlist</h1>
        {lastUpdated && (
          <p style={{ color: '#555', fontSize: '0.8rem' }}>Last updated: {lastUpdated}</p>
        )}
      </div>

      {/* Search to add */}
      <div style={{ position: 'relative', maxWidth: '500px', marginBottom: '1.5rem' }}>
        <input
          style={{ width: '100%', padding: '0.85rem 1rem', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#e0e0e0', fontSize: '0.95rem', boxSizing: 'border-box' }}
          type="text"
          placeholder="Search and add stocks..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
        />
        {searchLoading && <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)' }}>⏳</span>}
        {showDropdown && searchResults.length > 0 && (
          <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', zIndex: 100, maxHeight: '280px', overflowY: 'auto' }}>
            {searchResults.map((stock) => (
              <div
                key={stock.symbol}
                style={{ padding: '0.85rem 1rem', cursor: 'pointer', borderBottom: '1px solid #222' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#222'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                onClick={() => addToWatchlist(stock)}
              >
                <span style={{ color: '#00d09c', fontWeight: 'bold', marginRight: '0.75rem' }}>{stock.symbol}</span>
                <span style={{ color: '#888', fontSize: '0.9rem' }}>{stock.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Watchlist table */}
      {watchlist.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Your watchlist is empty</p>
          <p style={{ color: '#666' }}>Search for stocks above to add them here</p>
        </div>
      ) : (
        <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
              <thead>
                <tr>
                  {['Stock', 'Price', 'Change', 'High', 'Low', 'Volume', ''].map((h) => (
                    <th key={h} style={{ padding: '0.85rem 1rem', textAlign: 'left', color: '#888', fontSize: '0.85rem', borderBottom: '1px solid #2a2a2a', fontWeight: 'normal', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {watchlist.map((item) => {
                  const q = prices[item.symbol];
                  const isPositive = q?.change >= 0;
                  const changeColor = isPositive ? '#00d09c' : '#ff4444';
                  return (
                    <tr
                      key={item.symbol}
                      style={{ transition: 'background 0.15s', cursor: 'pointer' }}
                      onClick={() => navigate(`/stock/${encodeURIComponent(item.symbol)}`)}
                    >
                      <td style={{ padding: '0.85rem 1rem', borderBottom: '1px solid #1a1a1a', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                        <div style={{ color: '#00d09c', fontWeight: 'bold' }}>{item.symbol}</div>
                        <div style={{ color: '#666', fontSize: '0.8rem' }}>{item.company_name}</div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', borderBottom: '1px solid #1a1a1a', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{q ? `₹${q.price?.toFixed(2)}` : '—'}</td>
                      <td style={{ padding: '0.85rem 1rem', borderBottom: '1px solid #1a1a1a', fontSize: '0.9rem', whiteSpace: 'nowrap', color: changeColor }}>
                        {q ? `${isPositive ? '▲' : '▼'} ${Math.abs(q.changePercent)?.toFixed(2)}%` : '—'}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', borderBottom: '1px solid #1a1a1a', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{q ? `₹${q.high?.toFixed(2)}` : '—'}</td>
                      <td style={{ padding: '0.85rem 1rem', borderBottom: '1px solid #1a1a1a', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{q ? `₹${q.low?.toFixed(2)}` : '—'}</td>
                      <td style={{ padding: '0.85rem 1rem', borderBottom: '1px solid #1a1a1a', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{q ? q.volume?.toLocaleString('en-IN') : '—'}</td>
                      <td style={{ padding: '0.85rem 1rem', borderBottom: '1px solid #1a1a1a', fontSize: '0.9rem' }} onClick={(e) => e.stopPropagation()}>
                        <button style={{ background: 'transparent', border: '1px solid #333', color: '#666', borderRadius: '4px', padding: '0.25rem 0.5rem', cursor: 'pointer', fontSize: '0.85rem' }} onClick={() => removeFromWatchlist(item.symbol)}>✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const centered = { textAlign: 'center', padding: '4rem', color: '#888' };

export default Watchlist;
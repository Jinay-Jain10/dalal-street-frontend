import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import useAuthStore from '../store/authStore';

const BattleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [leaderboard, setLeaderboard] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('leaderboard');
  const [lastUpdated, setLastUpdated] = useState(null);

  // Trade state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [tradeLoading, setTradeLoading] = useState(false);
  const [tradeMsg, setTradeMsg] = useState('');
  const [tradeType, setTradeType] = useState('buy');

  // Sell state
  const [sellSymbol, setSellSymbol] = useState('');
  const [sellQuantity, setSellQuantity] = useState(1);
  const [sellLoading, setSellLoading] = useState(false);
  const [sellMsg, setSellMsg] = useState('');

  // Countdown
  const [timeLeft, setTimeLeft] = useState('');

  const debounceRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    init();
    const interval = setInterval(() => {
      fetchLeaderboard(true);
      fetchPortfolio(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [id]);

  // Countdown timer
  useEffect(() => {
    const tick = setInterval(() => {
      if (!leaderboard?.group?.ends_at) return;
      const diff = new Date(leaderboard.group.ends_at) - new Date();
      if (diff <= 0) { setTimeLeft('Ended'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (h > 24) setTimeLeft(`${Math.floor(h / 24)}d ${h % 24}h ${m}m`);
      else setTimeLeft(`${h}h ${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(tick);
  }, [leaderboard]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const init = async () => {
    setLoading(true);
    await Promise.all([fetchLeaderboard(false), fetchPortfolio(false)]);
    setLoading(false);
  };

  const fetchLeaderboard = async (silent = false) => {
    try {
      const res = await api.get(`/battles/${id}/leaderboard`);
      setLeaderboard(res.data);
      if (!silent) setLastUpdated(new Date().toLocaleTimeString('en-IN'));
      else setLastUpdated(new Date().toLocaleTimeString('en-IN'));
    } catch (err) {
      setError('Failed to load battle');
    }
  };

  const fetchPortfolio = async (silent = false) => {
    try {
      const res = await api.get(`/battles/${id}/portfolio`);
      setPortfolio(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartBattle = async () => {
    try {
      await api.post(`/battles/${id}/start`);
      fetchLeaderboard(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to start battle');
    }
  };

  const handleSearch = (value) => {
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

  const handleSelectStock = async (stock) => {
    setShowDropdown(false);
    setSearchQuery(stock.name);
    try {
      const res = await api.get(`/stocks/${stock.symbol}`);
      setSelectedStock({ ...stock, price: res.data.data.price });
    } catch {
      setSelectedStock(stock);
    }
  };

  const handleBuy = async () => {
    if (!selectedStock) return;
    setTradeLoading(true);
    setTradeMsg('');
    try {
      const res = await api.post(`/battles/${id}/buy`, {
        symbol: selectedStock.symbol,
        company_name: selectedStock.name,
        quantity: parseInt(quantity),
      });
      setTradeMsg(res.data.message);
      setSelectedStock(null);
      setSearchQuery('');
      setQuantity(1);
      fetchPortfolio(true);
      fetchLeaderboard(true);
    } catch (err) {
      setTradeMsg(err.response?.data?.message || 'Trade failed');
    } finally {
      setTradeLoading(false);
    }
  };

  const handleSell = async () => {
    if (!sellSymbol) return;
    setSellLoading(true);
    setSellMsg('');
    try {
      const res = await api.post(`/battles/${id}/sell`, {
        symbol: sellSymbol,
        quantity: parseInt(sellQuantity),
      });
      setSellMsg(res.data.message);
      setSellSymbol('');
      setSellQuantity(1);
      fetchPortfolio(true);
      fetchLeaderboard(true);
    } catch (err) {
      setSellMsg(err.response?.data?.message || 'Sell failed');
    } finally {
      setSellLoading(false);
    }
  };

  if (loading) return <div style={centered}>Loading battle...</div>;
  if (error) return <div style={centered}>{error}</div>;
  if (!leaderboard) return null;

  const { group, rankings } = leaderboard;
  const myRank = rankings.find((r) => r.is_you);
  const isActive = group.status === 'active';
  const isWaiting = group.status === 'waiting';
  const isEnded = group.status === 'ended';

  return (
    <div style={container}>

      {/* Header */}
      <div style={header}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1 style={pageTitle}>{group.name}</h1>
            <span style={{ ...statusBadge, ...statusStyle(group.status) }}>
              {isWaiting ? '⏳ Waiting' : isActive ? '🔴 Live' : '✅ Ended'}
            </span>
          </div>
          {lastUpdated && <p style={{ color: '#555', fontSize: '0.75rem' }}>Last updated: {lastUpdated}</p>}
        </div>
        <div style={{ textAlign: 'right' }}>
          {isActive && (
            <div style={countdown}>⏱ {timeLeft}</div>
          )}
          {isWaiting && group.is_creator && (
            <button style={startBtn} onClick={handleStartBattle}>
              🚀 Start Battle
            </button>
          )}
          {isWaiting && (
            <div style={inviteCodeBox}>
              Invite Code: <span style={{ color: '#f0c040', fontWeight: 'bold', letterSpacing: '0.15em' }}>{group.invite_code}</span>
            </div>
          )}
        </div>
      </div>

      {/* My Stats Bar */}
      {myRank && (
        <div style={myStatsBar}>
          <div style={myStat}>
            <span style={myStatLabel}>Your Rank</span>
            <span style={myStatValue}>#{myRank.rank} of {rankings.length}</span>
          </div>
          <div style={myStat}>
            <span style={myStatLabel}>Battle Balance</span>
            <span style={myStatValue}>₹{parseFloat(myRank.battle_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style={myStat}>
            <span style={myStatLabel}>Portfolio Value</span>
            <span style={myStatValue}>₹{parseFloat(myRank.total_value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style={myStat}>
            <span style={myStatLabel}>P&L</span>
            <span style={{ ...myStatValue, color: parseFloat(myRank.pnl) >= 0 ? '#00d09c' : '#ff4444' }}>
              {parseFloat(myRank.pnl) >= 0 ? '▲' : '▼'} ₹{Math.abs(parseFloat(myRank.pnl)).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({myRank.pnl_percent}%)
            </span>
          </div>
        </div>
      )}

      {/* Waiting Room */}
      {isWaiting && (
        <div style={section}>
          <h2 style={sectionTitle}>Waiting Room</h2>
          <p style={{ color: '#888', marginBottom: '1rem', fontSize: '0.9rem' }}>
            {group.is_creator
              ? `Share the invite code with friends. You need at least 2 members to start.`
              : `Waiting for the creator to start the battle.`}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {rankings.map((r) => (
              <div key={r.user_id} style={memberRow}>
                <span>{r.is_you ? `${r.name} (You)` : r.name}</span>
                <span style={{ color: '#888', fontSize: '0.85rem' }}>₹{parseFloat(group.initial_balance).toLocaleString('en-IN')} starting balance</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active / Ended Battle */}
      {(isActive || isEnded) && (
        <>
          {/* Tabs */}
          <div style={tabRow}>
            {['leaderboard', 'trade', 'holdings'].map((tab) => (
              <button
                key={tab}
                style={activeTab === tab ? activeTabBtn : tabBtn}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'leaderboard' ? '🏆 Leaderboard' : tab === 'trade' ? '💹 Trade' : '📊 My Holdings'}
              </button>
            ))}
          </div>

          {/* Leaderboard Tab */}
          {activeTab === 'leaderboard' && (
            <div style={section}>
              {isEnded && (
                <div style={winnerBanner}>
                  🏆 Winner: {rankings[0]?.name} with ₹{parseFloat(rankings[0]?.total_value).toLocaleString('en-IN')}
                </div>
              )}
              <table style={table}>
                <thead>
                  <tr>
                    {['Rank', 'Player', 'Portfolio Value', 'P&L', 'P&L %'].map((h) => (
                      <th key={h} style={th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((r) => {
                    const pnl = parseFloat(r.pnl);
                    const pnlColor = pnl >= 0 ? '#00d09c' : '#ff4444';
                    return (
                      <tr key={r.user_id} style={{ ...tr, background: r.is_you ? '#1a2a1a' : 'transparent' }}>
                        <td style={td}>
                          <span style={rankBadge(r.rank)}>{r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `#${r.rank}`}</span>
                        </td>
                        <td style={td}>
                          {r.name} {r.is_you && <span style={{ color: '#888', fontSize: '0.8rem' }}>(You)</span>}
                        </td>
                        <td style={td}>₹{parseFloat(r.total_value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td style={{ ...td, color: pnlColor }}>
                          {pnl >= 0 ? '+' : ''}₹{Math.abs(pnl).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ ...td, color: pnlColor }}>
                          {pnl >= 0 ? '▲' : '▼'} {Math.abs(parseFloat(r.pnl_percent))}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Trade Tab */}
          {activeTab === 'trade' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

              {/* Buy */}
              <div style={section}>
                <h3 style={{ ...sectionTitle, marginBottom: '1rem' }}>💚 Buy Stock</h3>
                {isEnded ? (
                  <p style={{ color: '#888' }}>Battle has ended. Trading is closed.</p>
                ) : (
                  <>
                    <div style={{ position: 'relative' }} ref={dropdownRef}>
                      <input
                        style={input}
                        placeholder="Search stock to buy..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                      />
                      {showDropdown && searchResults.length > 0 && (
                        <div style={dropdown}>
                          {searchResults.map((s) => (
                            <div
                              key={s.symbol}
                              style={dropdownItem}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#222'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              onClick={() => handleSelectStock(s)}
                            >
                              <span style={{ color: '#00d09c', fontWeight: 'bold', marginRight: '0.5rem' }}>{s.symbol}</span>
                              <span style={{ color: '#888', fontSize: '0.85rem' }}>{s.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {selectedStock && (
                      <div style={selectedStockBox}>
                        <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>{selectedStock.name}</div>
                        <button
        style={viewStockBtn}
        onClick={() => window.open(`/stock/${encodeURIComponent(selectedStock.symbol)}`, '_blank')}
      >
        View Stock ↗
      </button>
                        <div style={{ color: '#00d09c', fontSize: '1.1rem', marginBottom: '0.75rem' }}>
                          ₹{selectedStock.price?.toFixed(2) || 'Loading...'}
                        </div>
                        <input
                          type="number" min="1" value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          style={{ ...input, marginBottom: '0.5rem' }}
                          placeholder="Quantity"
                        />
                        {selectedStock.price && (
                          <p style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                            Total: ₹{(selectedStock.price * quantity).toFixed(2)}
                          </p>
                        )}
                        <button style={buyBtn} onClick={handleBuy} disabled={tradeLoading}>
                          {tradeLoading ? 'Buying...' : 'Confirm Buy'}
                        </button>
                      </div>
                    )}
                    {tradeMsg && (
                      <p style={{ color: tradeMsg.includes('Successfully') ? '#00d09c' : '#ff4444', marginTop: '0.75rem', fontSize: '0.9rem' }}>
                        {tradeMsg}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Sell */}
              <div style={section}>
                <h3 style={{ ...sectionTitle, marginBottom: '1rem' }}>🔴 Sell Stock</h3>
                {isEnded ? (
                  <p style={{ color: '#888' }}>Battle has ended. Trading is closed.</p>
                ) : portfolio?.holdings?.length === 0 ? (
                  <p style={{ color: '#888' }}>You have no holdings to sell.</p>
                ) : (
                  <>
                    <select
                      style={input}
                      value={sellSymbol}
                      onChange={(e) => setSellSymbol(e.target.value)}
                    >
                      <option value="">Select a stock to sell</option>
                      {portfolio?.holdings?.map((h) => (
                        <option key={h.symbol} value={h.symbol}>
                          {h.symbol} — {h.quantity} shares @ ₹{h.current_price?.toFixed(2)}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number" min="1" value={sellQuantity}
                      onChange={(e) => setSellQuantity(e.target.value)}
                      style={input} placeholder="Quantity to sell"
                    />
                    {sellSymbol && portfolio?.holdings && (
                      <p style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                        Total: ₹{((portfolio.holdings.find(h => h.symbol === sellSymbol)?.current_price || 0) * sellQuantity).toFixed(2)}
                      </p>
                    )}
                    <button style={sellBtn} onClick={handleSell} disabled={sellLoading}>
                      {sellLoading ? 'Selling...' : 'Confirm Sell'}
                    </button>
                    {sellMsg && (
                      <p style={{ color: sellMsg.includes('Successfully') ? '#00d09c' : '#ff4444', marginTop: '0.75rem', fontSize: '0.9rem' }}>
                        {sellMsg}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Holdings Tab */}
          {activeTab === 'holdings' && (
            <div style={section}>
              <h2 style={sectionTitle}>My Battle Holdings</h2>
              {!portfolio || portfolio.holdings.length === 0 ? (
                <p style={{ color: '#888', padding: '1rem 0' }}>No holdings yet. Go to the Trade tab to buy stocks.</p>
              ) : (
                <table style={table}>
                  <thead>
                    <tr>
                      {['Stock', 'Qty', 'Avg Buy', 'Current Price', 'Value', 'P&L'].map((h) => (
                        <th key={h} style={th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.holdings.map((h) => {
                      const pnl = parseFloat(h.pnl);
                      const color = pnl >= 0 ? '#00d09c' : '#ff4444';
                      return (
                        <tr key={h.symbol} style={tr}>
                          <td style={td}>
                            <div style={{ color: '#00d09c', fontWeight: 'bold' }}>{h.symbol}</div>
                            <div style={{ color: '#666', fontSize: '0.8rem' }}>{h.company_name}</div>
                          </td>
                          <td style={td}>{h.quantity}</td>
                          <td style={td}>₹{parseFloat(h.avg_buy_price).toFixed(2)}</td>
                          <td style={td}>₹{parseFloat(h.current_price).toFixed(2)}</td>
                          <td style={td}>₹{parseFloat(h.current_value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td style={{ ...td, color }}>{pnl >= 0 ? '+' : ''}₹{Math.abs(pnl).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const statusStyle = (status) => {
  if (status === 'waiting') return { background: '#f0c04022', color: '#f0c040' };
  if (status === 'active') return { background: '#ff000022', color: '#ff4444' };
  return { background: '#88888822', color: '#888' };
};

const rankBadge = (rank) => ({
  fontSize: rank <= 3 ? '1.2rem' : '0.9rem',
});

const container = { maxWidth: '1100px', margin: '0 auto', padding: '2rem' };
const centered = { textAlign: 'center', padding: '4rem', color: '#888' };
const header = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' };
const pageTitle = { fontSize: '1.8rem', fontWeight: 'bold' };
const statusBadge = { padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' };
const countdown = { fontSize: '1.5rem', fontWeight: 'bold', color: '#f0c040', marginBottom: '0.5rem' };
const startBtn = { padding: '0.7rem 1.5rem', background: '#00d09c', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' };
const inviteCodeBox = { marginTop: '0.5rem', color: '#888', fontSize: '0.9rem' };
const myStatsBar = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' };
const myStat = { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' };
const myStatLabel = { color: '#888', fontSize: '0.8rem' };
const myStatValue = { fontWeight: 'bold', fontSize: '1rem' };
const section = { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '1.5rem', marginBottom: '1rem' };
const sectionTitle = { fontSize: '1.1rem', fontWeight: 'bold' };
const tabRow = { display: 'flex', gap: '0.5rem', marginBottom: '1rem' };
const tabBtn = { padding: '0.6rem 1.25rem', background: 'transparent', border: '1px solid #2a2a2a', color: '#888', borderRadius: '8px', cursor: 'pointer' };
const activeTabBtn = { ...tabBtn, background: '#1a1a1a', color: '#e0e0e0', borderColor: '#444' };
const winnerBanner = { background: '#1a2a1a', border: '1px solid #00d09c44', borderRadius: '8px', padding: '1rem', marginBottom: '1rem', color: '#00d09c', fontWeight: 'bold', textAlign: 'center' };
const table = { width: '100%', borderCollapse: 'collapse' };
const th = { padding: '1rem', textAlign: 'left', color: '#888', fontSize: '0.85rem', borderBottom: '1px solid #2a2a2a', fontWeight: 'normal' };
const td = { padding: '1rem', borderBottom: '1px solid #1a1a1a', fontSize: '0.95rem' };
const tr = { transition: 'background 0.15s' };
const memberRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: '#0f0f0f', borderRadius: '8px' };
const input = { width: '100%', padding: '0.8rem', background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#e0e0e0', fontSize: '0.95rem', marginBottom: '0.75rem', display: 'block' };
const dropdown = { position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', zIndex: 100, maxHeight: '200px', overflowY: 'auto' };
const dropdownItem = { padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid #222' };
const selectedStockBox = { background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '1rem', marginBottom: '0.75rem' };
const buyBtn = { padding: '0.7rem 1.5rem', background: '#00d09c', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const sellBtn = { padding: '0.7rem 1.5rem', background: 'transparent', color: '#ff4444', border: '1px solid #ff4444', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const viewStockBtn = { background: 'transparent', border: '1px solid #2a2a2a', color: '#888', padding: '0.25rem 0.6rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' };

export default BattleDetail;
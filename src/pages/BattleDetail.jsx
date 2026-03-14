import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import useAuthStore from '../store/authStore';
import usePriceStore from '../store/priceStore';

const BattleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [leaderboard, setLeaderboard] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('leaderboard');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [tradeLoading, setTradeLoading] = useState(false);
  const [tradeMsg, setTradeMsg] = useState('');

  const [sellSymbol, setSellSymbol] = useState('');
  const [sellQuantity, setSellQuantity] = useState(1);
  const [sellLoading, setSellLoading] = useState(false);
  const [sellMsg, setSellMsg] = useState('');

  const [timeLeft, setTimeLeft] = useState('');

  const debounceRef = useRef(null);
  const dropdownRef = useRef(null);

  const { prices, subscribe, unsubscribe, lastUpdated } = usePriceStore();

  useEffect(() => {
    init();
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/battles/${id}/leaderboard`);
        setLeaderboard(res.data);
      } catch (err) {
        console.error(err);
      }
    }, 30 * 60 * 1000); // 30 minutes
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    if (!portfolio || portfolio.holdings.length === 0) return;
    const symbols = portfolio.holdings.map((h) => h.symbol);
    subscribe(symbols);
    return () => unsubscribe(symbols);
  }, [portfolio]);

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
    await Promise.all([fetchLeaderboard(), fetchPortfolio()]);
    setLoading(false);
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await api.get(`/battles/${id}/leaderboard`);
      setLeaderboard(res.data);
    } catch (err) {
      setError('Failed to load battle');
    }
  };

  const fetchPortfolio = async () => {
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
      fetchLeaderboard();
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
      subscribe([stock.symbol]);
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
      await fetchPortfolio();
      await fetchLeaderboard();
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
      await fetchPortfolio();
      await fetchLeaderboard();
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

  const holdingsWithLivePrices = portfolio?.holdings?.map((h) => {
    const livePrice = prices[h.symbol]?.price || parseFloat(h.current_price);
    const currentValue = livePrice * h.quantity;
    const totalInvested = parseFloat(h.avg_buy_price) * h.quantity;
    const pnl = currentValue - totalInvested;
    return { ...h, live_price: livePrice, live_current_value: currentValue, live_pnl: pnl };
  }) || [];

  const liveSelectedPrice = selectedStock
    ? (prices[selectedStock.symbol]?.price || selectedStock.price)
    : null;

  const liveSellPrice = sellSymbol
    ? (prices[sellSymbol]?.price || portfolio?.holdings?.find(h => h.symbol === sellSymbol)?.current_price || 0)
    : 0;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 'clamp(1.3rem, 3vw, 1.8rem)', fontWeight: 'bold' }}>{group.name}</h1>
            <span style={{ ...statusBadge, ...statusStyle(group.status) }}>
              {isWaiting ? '⏳ Waiting' : isActive ? '🔴 Live' : '✅ Ended'}
            </span>
          </div>
          {lastUpdated && <p style={{ color: '#555', fontSize: '0.75rem' }}>Last updated: {lastUpdated}</p>}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {isActive && <div style={{ fontSize: 'clamp(1.1rem, 3vw, 1.5rem)', fontWeight: 'bold', color: '#f0c040', marginBottom: '0.5rem' }}>⏱ {timeLeft}</div>}
          {isWaiting && group.is_creator && (
            <button style={startBtn} onClick={handleStartBattle}>🚀 Start Battle</button>
          )}
          {isWaiting && (
            <div style={{ marginTop: '0.5rem', color: '#888', fontSize: '0.85rem' }}>
              Code: <span style={{ color: '#f0c040', fontWeight: 'bold', letterSpacing: '0.15em' }}>{group.invite_code}</span>
            </div>
          )}
        </div>
      </div>

      {/* My Stats Bar */}
      {myRank && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={myStat}>
            <span style={myStatLabel}>Your Rank</span>
            <span style={myStatValue}>#{myRank.rank} of {rankings.length}</span>
          </div>
          <div style={myStat}>
            <span style={myStatLabel}>Balance</span>
            <span style={myStatValue}>₹{parseFloat(myRank.battle_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style={myStat}>
            <span style={myStatLabel}>Portfolio</span>
            <span style={myStatValue}>₹{parseFloat(myRank.total_value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style={myStat}>
            <span style={myStatLabel}>P&L</span>
            <span style={{ ...myStatValue, color: parseFloat(myRank.pnl) >= 0 ? '#00d09c' : '#ff4444', fontSize: '0.9rem' }}>
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
              ? 'Share the invite code with friends. You need at least 2 members to start.'
              : 'Waiting for the creator to start the battle.'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {rankings.map((r) => (
              <div key={r.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: '#0f0f0f', borderRadius: '8px', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span>{r.is_you ? `${r.name} (You)` : r.name}</span>
                <span style={{ color: '#888', fontSize: '0.85rem' }}>₹{parseFloat(group.initial_balance).toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active / Ended Battle */}
      {(isActive || isEnded) && (
        <>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {['leaderboard', 'trade', 'holdings'].map((tab) => (
              <button
                key={tab}
                style={activeTab === tab ? activeTabBtn : tabBtn}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'leaderboard' ? '🏆 Leaderboard' : tab === 'trade' ? '💹 Trade' : '📊 Holdings'}
              </button>
            ))}
          </div>

          {/* Leaderboard Tab */}
          {activeTab === 'leaderboard' && (
            <div style={section}>
              {isEnded && (
                <div style={{ background: '#1a2a1a', border: '1px solid #00d09c44', borderRadius: '8px', padding: '1rem', marginBottom: '1rem', color: '#00d09c', fontWeight: 'bold', textAlign: 'center' }}>
                  🏆 Winner: {rankings[0]?.name} with ₹{parseFloat(rankings[0]?.total_value).toLocaleString('en-IN')}
                </div>
              )}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '400px' }}>
                  <thead>
                    <tr>
                      {['Rank', 'Player', 'Value', 'P&L', 'P&L %'].map((h) => (
                        <th key={h} style={th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rankings.map((r) => {
                      const pnl = parseFloat(r.pnl);
                      const pnlColor = pnl >= 0 ? '#00d09c' : '#ff4444';
                      return (
                        <tr key={r.user_id} style={{ background: r.is_you ? '#1a2a1a' : 'transparent', transition: 'background 0.15s' }}>
                          <td style={td}>
                            <span style={{ fontSize: r.rank <= 3 ? '1.2rem' : '0.9rem' }}>
                              {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `#${r.rank}`}
                            </span>
                          </td>
                          <td style={td}>{r.name} {r.is_you && <span style={{ color: '#888', fontSize: '0.8rem' }}>(You)</span>}</td>
                          <td style={td}>₹{parseFloat(r.total_value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td style={{ ...td, color: pnlColor }}>{pnl >= 0 ? '+' : ''}₹{Math.abs(pnl).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td style={{ ...td, color: pnlColor }}>{pnl >= 0 ? '▲' : '▼'} {Math.abs(parseFloat(r.pnl_percent))}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Trade Tab */}
          {activeTab === 'trade' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
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
                        <div style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', zIndex: 100, maxHeight: '200px', overflowY: 'auto' }}>
                          {searchResults.map((s) => (
                            <div
                              key={s.symbol}
                              style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid #222' }}
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
                      <div style={{ background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '1rem', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem', gap: '0.5rem' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{selectedStock.name}</div>
                          <button style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#888', padding: '0.25rem 0.6rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap' }} onClick={() => window.open(`/stock/${encodeURIComponent(selectedStock.symbol)}`, '_blank')}>
                            View ↗
                          </button>
                        </div>
                        <div style={{ color: '#00d09c', fontSize: '1.1rem', marginBottom: '0.75rem' }}>
                          ₹{liveSelectedPrice?.toFixed(2) || 'Loading...'}
                        </div>
                        <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} style={{ ...input, marginBottom: '0.5rem' }} placeholder="Quantity" />
                        {liveSelectedPrice && (
                          <p style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                            Total: ₹{(liveSelectedPrice * quantity).toFixed(2)}
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
                ) : holdingsWithLivePrices.length === 0 ? (
                  <p style={{ color: '#888' }}>No holdings to sell.</p>
                ) : (
                  <>
                    <select style={input} value={sellSymbol} onChange={(e) => setSellSymbol(e.target.value)}>
                      <option value="">Select a stock to sell</option>
                      {holdingsWithLivePrices.map((h) => (
                        <option key={h.symbol} value={h.symbol}>
                          {h.symbol} — {h.quantity} @ ₹{h.live_price?.toFixed(2)}
                        </option>
                      ))}
                    </select>
                    <input type="number" min="1" value={sellQuantity} onChange={(e) => setSellQuantity(e.target.value)} style={input} placeholder="Quantity to sell" />
                    {sellSymbol && (
                      <p style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                        Total: ₹{(liveSellPrice * sellQuantity).toFixed(2)}
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
              {holdingsWithLivePrices.length === 0 ? (
                <p style={{ color: '#888', padding: '1rem 0' }}>No holdings yet. Go to Trade tab to buy stocks.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '450px' }}>
                    <thead>
                      <tr>
                        {['Stock', 'Qty', 'Avg Buy', 'Current', 'Value', 'P&L'].map((h) => (
                          <th key={h} style={th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {holdingsWithLivePrices.map((h) => {
                        const color = h.live_pnl >= 0 ? '#00d09c' : '#ff4444';
                        return (
                          <tr key={h.symbol} style={{ transition: 'background 0.15s' }}>
                            <td style={td}>
                              <div style={{ color: '#00d09c', fontWeight: 'bold' }}>{h.symbol}</div>
                              <div style={{ color: '#666', fontSize: '0.8rem' }}>{h.company_name}</div>
                            </td>
                            <td style={td}>{h.quantity}</td>
                            <td style={td}>₹{parseFloat(h.avg_buy_price).toFixed(2)}</td>
                            <td style={td}>₹{h.live_price?.toFixed(2)}</td>
                            <td style={td}>₹{h.live_current_value?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td style={{ ...td, color }}>{h.live_pnl >= 0 ? '+' : ''}₹{Math.abs(h.live_pnl).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
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
const centered = { textAlign: 'center', padding: '4rem', color: '#888' };
const statusBadge = { padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' };
const startBtn = { padding: '0.7rem 1.5rem', background: '#00d09c', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' };
const myStatLabel = { color: '#888', fontSize: '0.8rem' };
const myStatValue = { fontWeight: 'bold', fontSize: '1rem' };
const myStat = { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' };
const section = { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem' };
const sectionTitle = { fontSize: '1.1rem', fontWeight: 'bold' };
const tabBtn = { padding: '0.6rem 1rem', background: 'transparent', border: '1px solid #2a2a2a', color: '#888', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' };
const activeTabBtn = { ...tabBtn, background: '#1a1a1a', color: '#e0e0e0', border: '1px solid #444' };
const th = { padding: '0.85rem 1rem', textAlign: 'left', color: '#888', fontSize: '0.85rem', borderBottom: '1px solid #2a2a2a', fontWeight: 'normal', whiteSpace: 'nowrap' };
const td = { padding: '0.85rem 1rem', borderBottom: '1px solid #1a1a1a', fontSize: '0.9rem', whiteSpace: 'nowrap' };
const input = { width: '100%', padding: '0.8rem', background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#e0e0e0', fontSize: '0.95rem', marginBottom: '0.75rem', display: 'block', boxSizing: 'border-box' };
const buyBtn = { padding: '0.7rem 1.5rem', background: '#00d09c', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const sellBtn = { padding: '0.7rem 1.5rem', background: 'transparent', color: '#ff4444', border: '1px solid #ff4444', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };

export default BattleDetail;
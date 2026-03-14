import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import useAuthStore from '../store/authStore';
import usePriceStore from '../store/priceStore';

const Portfolio = () => {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const [portfolio, setPortfolio] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('holdings');

  const { prices, subscribe, unsubscribe, lastUpdated } = usePriceStore();

  useEffect(() => {
    fetchPortfolio();
    fetchTransactions();
  }, []);

  useEffect(() => {
    if (!portfolio || portfolio.holdings.length === 0) return;
    const symbols = portfolio.holdings.map((h) => h.symbol);
    subscribe(symbols);
    return () => unsubscribe(symbols);
  }, [portfolio]);

  const fetchPortfolio = async () => {
    setLoading(true);
    try {
      const res = await api.get('/portfolio');
      setPortfolio(res.data);
      setUser(res.data.user);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await api.get('/portfolio/transactions');
      setTransactions(res.data.transactions);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div style={centered}>Loading portfolio...</div>;
  if (!portfolio) return <div style={centered}>Failed to load portfolio.</div>;

  const holdingsWithLivePrices = portfolio.holdings.map((h) => {
    const livePrice = prices[h.symbol]?.price || parseFloat(h.current_price);
    const currentValue = livePrice * h.quantity;
    const totalInvested = parseFloat(h.avg_buy_price) * h.quantity;
    const pnl = currentValue - totalInvested;
    const pnlPercent = (pnl / totalInvested) * 100;
    return { ...h, live_price: livePrice, live_current_value: currentValue, live_pnl: pnl, live_pnl_percent: pnlPercent };
  });

  const totalCurrentValue = holdingsWithLivePrices.reduce((sum, h) => sum + h.live_current_value, 0);
  const totalInvested = holdingsWithLivePrices.reduce((sum, h) => sum + parseFloat(h.avg_buy_price) * h.quantity, 0);
  const totalPnl = totalCurrentValue - totalInvested;
  const pnlColor = totalPnl >= 0 ? '#00d09c' : '#ff4444';

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1rem' }}>
      <h1 style={{ fontSize: 'clamp(1.4rem, 3vw, 1.8rem)', fontWeight: 'bold', marginBottom: '0.5rem' }}>My Portfolio</h1>
      {lastUpdated && (
        <p style={{ color: '#555', fontSize: '0.8rem', marginBottom: '1rem' }}>Last updated: {lastUpdated}</p>
      )}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={summaryCard}>
          <div style={summaryLabel}>Available Balance</div>
          <div style={summaryValue}>₹{parseFloat(portfolio.user.virtual_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        </div>
        <div style={summaryCard}>
          <div style={summaryLabel}>Total Invested</div>
          <div style={summaryValue}>₹{totalInvested.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        </div>
        <div style={summaryCard}>
          <div style={summaryLabel}>Current Value</div>
          <div style={summaryValue}>₹{totalCurrentValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        </div>
        <div style={{ ...summaryCard, borderColor: pnlColor + '44' }}>
          <div style={summaryLabel}>Total P&L</div>
          <div style={{ ...summaryValue, color: pnlColor }}>
            {totalPnl >= 0 ? '▲' : '▼'} ₹{Math.abs(totalPnl).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button style={activeTab === 'holdings' ? activeTabBtn : tabBtn} onClick={() => setActiveTab('holdings')}>
          Holdings {portfolio.holdings.length > 0 && `(${portfolio.holdings.length})`}
        </button>
        <button style={activeTab === 'transactions' ? activeTabBtn : tabBtn} onClick={() => setActiveTab('transactions')}>
          Transactions {transactions.length > 0 && `(${transactions.length})`}
        </button>
      </div>

      {/* Holdings Tab */}
      {activeTab === 'holdings' && (
        <div style={section}>
          {holdingsWithLivePrices.length === 0 ? (
            <div style={emptyState}>
              <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No holdings yet</p>
              <p style={{ color: '#666', marginBottom: '1.5rem' }}>Search for a stock and make your first trade</p>
              <button style={goSearchBtn} onClick={() => navigate('/')}>Search Stocks</button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                <thead>
                  <tr>
                    {['Stock', 'Qty', 'Avg Buy', 'Current', 'Value', 'P&L', 'P&L %'].map((h) => (
                      <th key={h} style={th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {holdingsWithLivePrices.map((h) => {
                    const color = h.live_pnl >= 0 ? '#00d09c' : '#ff4444';
                    return (
                      <tr key={h.symbol} style={tr} onClick={() => navigate(`/stock/${encodeURIComponent(h.symbol)}`)}>
                        <td style={td}>
                          <div style={{ color: '#00d09c', fontWeight: 'bold' }}>{h.symbol}</div>
                          <div style={{ color: '#666', fontSize: '0.8rem' }}>{h.company_name}</div>
                        </td>
                        <td style={td}>{h.quantity}</td>
                        <td style={td}>₹{parseFloat(h.avg_buy_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td style={td}>₹{h.live_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td style={td}>₹{h.live_current_value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td style={{ ...td, color }}>{h.live_pnl >= 0 ? '+' : ''}₹{h.live_pnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td style={{ ...td, color }}>{h.live_pnl >= 0 ? '▲' : '▼'} {Math.abs(h.live_pnl_percent).toFixed(2)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div style={section}>
          {transactions.length === 0 ? (
            <div style={emptyState}><p>No transactions yet.</p></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
                <thead>
                  <tr>
                    {['Stock', 'Type', 'Qty', 'Price', 'Total', 'Date'].map((h) => (
                      <th key={h} style={th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} style={tr}>
                      <td style={td}>
                        <div style={{ color: '#00d09c', fontWeight: 'bold' }}>{t.symbol}</div>
                        <div style={{ color: '#666', fontSize: '0.8rem' }}>{t.company_name}</div>
                      </td>
                      <td style={td}>
                        <span style={{
                          background: t.type === 'BUY' ? '#00d09c22' : '#ff444422',
                          color: t.type === 'BUY' ? '#00d09c' : '#ff4444',
                          padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.85rem',
                        }}>{t.type}</span>
                      </td>
                      <td style={td}>{t.quantity}</td>
                      <td style={td}>₹{parseFloat(t.price_at_transaction).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td style={td}>₹{parseFloat(t.total_value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td style={td}>{new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const centered = { textAlign: 'center', padding: '4rem', color: '#888' };
const summaryCard = { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '1rem' };
const summaryLabel = { color: '#888', fontSize: '0.85rem', marginBottom: '0.5rem' };
const summaryValue = { fontSize: 'clamp(1rem, 2.5vw, 1.3rem)', fontWeight: 'bold' };
const tabBtn = { padding: '0.6rem 1.25rem', background: 'transparent', border: '1px solid #2a2a2a', color: '#888', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' };
const activeTabBtn = { ...tabBtn, background: '#1a1a1a', color: '#e0e0e0', borderColor: '#444' };
const section = { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', overflow: 'hidden' };
const emptyState = { padding: '3rem', textAlign: 'center', color: '#888' };
const goSearchBtn = { padding: '0.7rem 1.5rem', background: '#00d09c', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const th = { padding: '0.85rem 1rem', textAlign: 'left', color: '#888', fontSize: '0.85rem', borderBottom: '1px solid #2a2a2a', fontWeight: 'normal', whiteSpace: 'nowrap' };
const td = { padding: '0.85rem 1rem', borderBottom: '1px solid #1a1a1a', fontSize: '0.9rem', cursor: 'pointer', whiteSpace: 'nowrap' };
const tr = { transition: 'background 0.15s' };

export default Portfolio;
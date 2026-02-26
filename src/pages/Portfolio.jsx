import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import useAuthStore from '../store/authStore';

const Portfolio = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const [portfolio, setPortfolio] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('holdings');
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    fetchPortfolio();
    fetchTransactions();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchPortfolio(true);
    }, 30000);
  
    return () => clearInterval(interval);
  }, []);

  const fetchPortfolio = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/portfolio');
      setPortfolio(res.data);
      setLastUpdated(new Date().toLocaleTimeString('en-IN'));
      setUser(res.data.user);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
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

  const totalPnl = parseFloat(portfolio.summary.total_pnl);
  const pnlColor = totalPnl >= 0 ? '#00d09c' : '#ff4444';

  return (
    <div style={container}>
      <h1 style={pageTitle}>My Portfolio</h1>
      {lastUpdated && (
  <p style={{ color: '#555', fontSize: '0.8rem', marginBottom: '1rem', marginTop: '-1rem' }}>
    Last updated: {lastUpdated}
  </p>
)}
      {/* Summary Cards */}
      <div style={summaryGrid}>
        <div style={summaryCard}>
          <div style={summaryLabel}>Available Balance</div>
          <div style={summaryValue}>₹{parseFloat(portfolio.user.virtual_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        </div>
        <div style={summaryCard}>
          <div style={summaryLabel}>Total Invested</div>
          <div style={summaryValue}>₹{parseFloat(portfolio.summary.total_invested).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        </div>
        <div style={summaryCard}>
          <div style={summaryLabel}>Current Value</div>
          <div style={summaryValue}>₹{parseFloat(portfolio.summary.total_current_value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        </div>
        <div style={{ ...summaryCard, borderColor: pnlColor + '44' }}>
          <div style={summaryLabel}>Total P&L</div>
          <div style={{ ...summaryValue, color: pnlColor }}>
            {totalPnl >= 0 ? '▲' : '▼'} ₹{Math.abs(totalPnl).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={tabRow}>
        <button
          style={activeTab === 'holdings' ? activeTabBtn : tabBtn}
          onClick={() => setActiveTab('holdings')}
        >
          Holdings {portfolio.holdings.length > 0 && `(${portfolio.holdings.length})`}
        </button>
        <button
          style={activeTab === 'transactions' ? activeTabBtn : tabBtn}
          onClick={() => setActiveTab('transactions')}
        >
          Transaction History {transactions.length > 0 && `(${transactions.length})`}
        </button>
      </div>

      {/* Holdings Tab */}
      {activeTab === 'holdings' && (
        <div style={section}>
          {portfolio.holdings.length === 0 ? (
            <div style={emptyState}>
              <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No holdings yet</p>
              <p style={{ color: '#666', marginBottom: '1.5rem' }}>Search for a stock and make your first trade</p>
              <button style={goSearchBtn} onClick={() => navigate('/')}>Search Stocks</button>
            </div>
          ) : (
            <table style={table}>
              <thead>
                <tr>
                  {['Stock', 'Qty', 'Avg Buy Price', 'Current Price', 'Current Value', 'P&L', 'P&L %'].map((h) => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {portfolio.holdings.map((h) => {
                  const pnl = parseFloat(h.pnl);
                  const color = pnl >= 0 ? '#00d09c' : '#ff4444';
                  return (
                    <tr
                      key={h.symbol}
                      style={tr}
                      onClick={() => navigate(`/stock/${encodeURIComponent(h.symbol)}`)}
                    >
                      <td style={td}>
                        <div style={{ color: '#00d09c', fontWeight: 'bold' }}>{h.symbol}</div>
                        <div style={{ color: '#666', fontSize: '0.8rem' }}>{h.company_name}</div>
                      </td>
                      <td style={td}>{h.quantity}</td>
                      <td style={td}>₹{parseFloat(h.avg_buy_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td style={td}>₹{parseFloat(h.current_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td style={td}>₹{parseFloat(h.current_value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td style={{ ...td, color }}>{pnl >= 0 ? '+' : ''}₹{pnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td style={{ ...td, color }}>{pnl >= 0 ? '▲' : '▼'} {Math.abs(parseFloat(h.pnl_percent))}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div style={section}>
          {transactions.length === 0 ? (
            <div style={emptyState}>
              <p>No transactions yet.</p>
            </div>
          ) : (
            <table style={table}>
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
                        padding: '0.2rem 0.6rem',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        fontSize: '0.85rem',
                      }}>
                        {t.type}
                      </span>
                    </td>
                    <td style={td}>{t.quantity}</td>
                    <td style={td}>₹{parseFloat(t.price_at_transaction).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style={td}>₹{parseFloat(t.total_value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style={td}>
                      {new Date(t.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

const container = { maxWidth: '1100px', margin: '0 auto', padding: '2rem' };
const centered = { textAlign: 'center', padding: '4rem', color: '#888' };
const pageTitle = { fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '1.5rem' };
const summaryGrid = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' };
const summaryCard = { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '1.25rem' };
const summaryLabel = { color: '#888', fontSize: '0.85rem', marginBottom: '0.5rem' };
const summaryValue = { fontSize: '1.3rem', fontWeight: 'bold' };
const tabRow = { display: 'flex', gap: '0.5rem', marginBottom: '1rem' };
const tabBtn = { padding: '0.6rem 1.5rem', background: 'transparent', border: '1px solid #2a2a2a', color: '#888', borderRadius: '8px', cursor: 'pointer', fontSize: '0.95rem' };
const activeTabBtn = { ...tabBtn, background: '#1a1a1a', color: '#e0e0e0', borderColor: '#444' };
const section = { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', overflow: 'hidden' };
const emptyState = { padding: '3rem', textAlign: 'center', color: '#888' };
const goSearchBtn = { padding: '0.7rem 1.5rem', background: '#00d09c', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const table = { width: '100%', borderCollapse: 'collapse' };
const th = { padding: '1rem', textAlign: 'left', color: '#888', fontSize: '0.85rem', borderBottom: '1px solid #2a2a2a', fontWeight: 'normal' };
const td = { padding: '1rem', borderBottom: '1px solid #1a1a1a', fontSize: '0.95rem', cursor: 'pointer' };
const tr = { transition: 'background 0.15s' };

export default Portfolio;
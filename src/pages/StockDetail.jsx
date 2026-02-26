import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
} from 'recharts';
import api from '../api/axios';
import useAuthStore from '../store/authStore';

const RANGES = ['1W', '1M', '3M', '1Y', '5Y'];

const StockDetail = () => {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);

  const [quote, setQuote] = useState(null);
  const [history, setHistory] = useState([]);
  const [news, setNews] = useState([]);
  const [range, setRange] = useState('1M');
  const [loading, setLoading] = useState(true);
  const [newsLoading, setNewsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showMoreStats, setShowMoreStats] = useState(false);
  const [showNews, setShowNews] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL');

  const [modal, setModal] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [tradeMsg, setTradeMsg] = useState('');
  const [tradeLoading, setTradeLoading] = useState(false);

  const [watchlistMsg, setWatchlistMsg] = useState('');
const [inWatchlist, setInWatchlist] = useState(false);
const [lastUpdated, setLastUpdated] = useState(null);
const [initialLoading, setInitialLoading] = useState(true);

useEffect(() => {
  const init = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/stocks/${symbol}`);
      setQuote(res.data.data);
      setLastUpdated(new Date().toLocaleTimeString('en-IN'));
      fetchNews(res.data.data);
    } catch {
      setError('Failed to load stock data. Please check the symbol.');
    } finally {
      setLoading(false);
    }
  };

  init();

  const interval = setInterval(async () => {
    try {
      const res = await api.get(`/stocks/${symbol}`);
      setQuote(res.data.data);
      setLastUpdated(new Date().toLocaleTimeString('en-IN'));
    } catch {
      console.error('Price refresh failed');
    }
  }, 30000);

  return () => clearInterval(interval);
}, [symbol]);

  useEffect(() => { fetchHistory(); }, [symbol, range]);

  // const fetchQuote = async () => {
  //   if (initialLoading) setLoading(true);
  //   setError('');
  //   try {
  //     const res = await api.get(`/stocks/${symbol}`);
  //     setQuote(res.data.data);
  //     setLastUpdated(new Date().toLocaleTimeString('en-IN'));
  //     return res.data.data;
  //   } catch {
  //     setError('Failed to load stock data. Please check the symbol.');
  //   } finally {
  //     setLoading(false);
  //     setInitialLoading(false);
  //   }
  // };

  const fetchHistory = async () => {
    try {
      const res = await api.get(`/stocks/${symbol}/history?range=${range}`);
      setHistory(res.data.data);
    } catch {
      console.error('Failed to load history');
    }
  };

  const fetchNews = async (quoteData) => {
    setNewsLoading(true);
    try {
      const name = quoteData?.name || decodeURIComponent(symbol)
        .replace('.NS', '')
        .replace('.BO', '');
      const res = await api.get(`/news/${symbol}?name=${encodeURIComponent(name)}`);
      setNews(res.data.articles);
    } catch {
      console.error('Failed to load news');
    } finally {
      setNewsLoading(false);
    }
  };

  const handleTrade = async () => {
    if (!token) return navigate('/login');
    setTradeLoading(true);
    setTradeMsg('');
    try {
      const endpoint = modal === 'buy' ? '/portfolio/buy' : '/portfolio/sell';
      const body = modal === 'buy'
        ? { symbol, company_name: quote.name, quantity: parseInt(quantity) }
        : { symbol, quantity: parseInt(quantity) };
      const res = await api.post(endpoint, body);
      const type = modal;
      setModal('success');
      setTradeMsg(res.data.message);
      // store what type of trade it was for the success screen
      setModal({ type: 'success', tradeType: type, message: res.data.message });
    } catch (err) {
      setTradeMsg(err.response?.data?.message || 'Trade failed');
    } finally {
      setTradeLoading(false);
    }
  };

  const handleWatchlist = async () => {
    if (!token) return navigate('/login');
    try {
      if (inWatchlist) {
        await api.delete(`/watchlist/${symbol}`);
        setInWatchlist(false);
        setWatchlistMsg('Removed from watchlist');
      } else {
        await api.post('/watchlist', { symbol, company_name: quote.name });
        setInWatchlist(true);
        setWatchlistMsg('Added to watchlist');
      }
      setTimeout(() => setWatchlistMsg(''), 2000);
    } catch (err) {
      setWatchlistMsg(err.response?.data?.message || 'Failed');
    }
  };

  useEffect(() => {
    if (!token) return;
    api.get('/watchlist').then((res) => {
      const found = res.data.watchlist.some((w) => w.symbol === symbol);
      setInWatchlist(found);
    }).catch(() => {});
  }, [symbol, token]);

  const isPositive = quote?.change >= 0;
  const changeColor = isPositive ? '#00d09c' : '#ff4444';

  const sentimentColor = (s) => {
    if (s === 'POSITIVE') return '#00d09c';
    if (s === 'NEGATIVE') return '#ff4444';
    return '#888';
  };

  const filteredNews = activeFilter === 'ALL'
    ? news
    : news.filter((a) => a.sentiment === activeFilter);

  const sentimentCounts = {
    POSITIVE: news.filter((a) => a.sentiment === 'POSITIVE').length,
    NEGATIVE: news.filter((a) => a.sentiment === 'NEGATIVE').length,
    NEUTRAL: news.filter((a) => a.sentiment === 'NEUTRAL').length,
  };

  if (loading) return <div style={centered}>Loading...</div>;
  if (error) return <div style={centered}>{error}</div>;
  if (!quote) return null;

  const essentialStats = [
    { label: 'Open', value: `₹${quote.open?.toFixed(2)}` },
    { label: 'Prev Close', value: `₹${quote.previousClose?.toFixed(2)}` },
    { label: "Day's High", value: `₹${quote.high?.toFixed(2)}` },
    { label: "Day's Low", value: `₹${quote.low?.toFixed(2)}` },
    { label: '52W High', value: `₹${quote.fiftyTwoWeekHigh?.toFixed(2)}` },
    { label: '52W Low', value: `₹${quote.fiftyTwoWeekLow?.toFixed(2)}` },
    { label: 'Market Cap', value: `₹${(quote.marketCap / 1e7).toFixed(0)} Cr` },
    { label: 'Volume', value: quote.volume?.toLocaleString('en-IN') },
    { label: 'P/E Ratio', value: quote.pe?.toFixed(2) || 'N/A' },
  ];

  const moreStats = [
    { label: 'EPS', value: quote.eps ? `₹${quote.eps?.toFixed(2)}` : 'N/A' },
    { label: 'P/B Ratio', value: quote.priceToBook?.toFixed(2) || 'N/A' },
    { label: 'Beta', value: quote.beta?.toFixed(2) || 'N/A' },
    { label: 'Dividend Yield', value: quote.dividendYield ? `${(quote.dividendYield * 100).toFixed(2)}%` : 'N/A' },
    { label: 'Dividend Rate', value: quote.dividendRate ? `₹${quote.dividendRate}` : 'N/A' },
    { label: 'Avg Volume', value: quote.avgVolume?.toLocaleString('en-IN') || 'N/A' },
    { label: 'Sector', value: quote.sector || 'N/A' },
    { label: 'Industry', value: quote.industry || 'N/A' },
    { label: 'Website', value: quote.website ? '🔗 Visit' : 'N/A', link: quote.website },
  ];

  return (
    <div style={container}>

      {/* Header */}
      <div style={header}>
        <div>
          <h1 style={stockTitle}>{quote.name}</h1>
          <span style={symbolTag}>{quote.symbol}</span>
          {quote.sector && <span style={sectorTag}>{quote.sector}</span>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={priceText}>₹{quote.price?.toFixed(2)}</div>
          <div style={{ color: changeColor, fontSize: '1rem' }}>
            {isPositive ? '▲' : '▼'} ₹{Math.abs(quote.change)?.toFixed(2)} ({Math.abs(quote.changePercent)?.toFixed(2)}%)
          </div>
          {lastUpdated && (
  <div style={{ color: '#555', fontSize: '0.75rem', marginTop: '0.25rem' }}>
    Last updated: {lastUpdated}
  </div>
)}
        </div>
      </div>

      {/* Buy/Sell */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'center' }}>
  {token ? (
    <>
      <button style={buyBtn} onClick={() => { setModal('buy'); setTradeMsg(''); setQuantity(1); }}>Buy</button>
      <button style={sellBtn} onClick={() => { setModal('sell'); setTradeMsg(''); setQuantity(1); }}>Sell</button>
      <button style={watchlistBtn} onClick={handleWatchlist}>
        {inWatchlist ? '★ Watchlisted' : '☆ Add to Watchlist'}
      </button>
      {watchlistMsg && <span style={{ color: '#00d09c', fontSize: '0.85rem' }}>{watchlistMsg}</span>}
    </>
  ) : (
    <button style={buyBtn} onClick={() => navigate('/login')}>Login to Trade</button>
  )}
</div>

      {/* Trade Modal */}
      {modal && (
  <div style={modalOverlay}>
    <div style={modalBox}>
      {modal.type === 'success' ? (
        // Success screen
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
            {modal.tradeType === 'buy' ? '🎉' : '✅'}
          </div>
          <h3 style={{ marginBottom: '0.75rem', color: '#00d09c' }}>
            {modal.tradeType === 'buy' ? 'Purchase Successful!' : 'Sale Successful!'}
          </h3>
          <p style={{ color: '#aaa', marginBottom: '1.5rem', lineHeight: '1.6' }}>
            {modal.message}
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button style={buyBtn} onClick={() => navigate('/portfolio')}>
              View Portfolio
            </button>
            <button style={cancelBtn} onClick={() => setModal(null)}>
              Continue Trading
            </button>
          </div>
        </div>
      ) : (
        // Trade entry screen
        <>
          <h3 style={{ marginBottom: '1rem' }}>{modal === 'buy' ? 'Buy' : 'Sell'} {quote.symbol}</h3>
          <p style={{ color: '#888', marginBottom: '1rem' }}>Current Price: ₹{quote.price?.toFixed(2)}</p>
          <input
            type="number" min="1" value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            style={modalInput} placeholder="Quantity"
          />
          <p style={{ color: '#aaa', marginBottom: '1rem' }}>
            Total: ₹{(quote.price * quantity).toFixed(2)}
          </p>
          {tradeMsg && (
            <p style={{ color: '#ff4444', marginBottom: '1rem' }}>{tradeMsg}</p>
          )}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              style={modal === 'buy' ? buyBtn : sellBtn}
              onClick={handleTrade}
              disabled={tradeLoading}
            >
              {tradeLoading ? 'Processing...' : `Confirm ${modal === 'buy' ? 'Buy' : 'Sell'}`}
            </button>
            <button style={cancelBtn} onClick={() => setModal(null)}>Cancel</button>
          </div>
        </>
      )}
    </div>
  </div>
)}

      {/* Essential Stats */}
      <div style={section}>
        <div style={statsGrid}>
          {essentialStats.map((stat) => (
            <div key={stat.label} style={statCard}>
              <div style={statLabel}>{stat.label}</div>
              <div style={statValue}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* More Details Toggle */}
        <button style={toggleBtn} onClick={() => setShowMoreStats(!showMoreStats)}>
          {showMoreStats ? '▲ Hide Details' : '▼ More Details'}
        </button>

        {showMoreStats && (
          <div style={{ ...statsGrid, marginTop: '1rem' }}>
            {moreStats.map((stat) => (
              <div key={stat.label} style={statCard}>
                <div style={statLabel}>{stat.label}</div>
                {stat.link ? (
                  <a href={stat.link} target="_blank" rel="noreferrer" style={{ color: '#00d09c', fontSize: '0.95rem' }}>
                    {stat.value}
                  </a>
                ) : (
                  <div style={statValue}>{stat.value}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chart */}
      <div style={section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={sectionTitle}>Price History</h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {RANGES.map((r) => (
              <button key={r} style={r === range ? activeRangeBtn : rangeBtn} onClick={() => setRange(r)}>
                {r}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={history}>
            <defs>
              <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00d09c" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#00d09c" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
            <YAxis tick={{ fill: '#888', fontSize: 11 }} domain={['auto', 'auto']} tickFormatter={(v) => `₹${v}`} />
            <Tooltip
              contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px' }}
              labelStyle={{ color: '#888' }}
              formatter={(v) => [`₹${v?.toFixed(2)}`, 'Close']}
            />
            <Area type="monotone" dataKey="close" stroke="#00d09c" strokeWidth={2} fill="url(#colorClose)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* News */}
      <div style={section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={sectionTitle}>Latest News</h2>
          <button style={toggleBtn} onClick={() => setShowNews(!showNews)}>
            {showNews ? '▲ Hide' : '▼ Show'}
          </button>
        </div>

        {showNews && (
          <>
            {/* Sentiment Filter */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              {['ALL', 'POSITIVE', 'NEGATIVE', 'NEUTRAL'].map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  style={{
                    padding: '0.3rem 0.9rem',
                    borderRadius: '20px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: activeFilter === f ? 'bold' : 'normal',
                    background: activeFilter === f
                      ? f === 'POSITIVE' ? '#00d09c'
                        : f === 'NEGATIVE' ? '#ff4444'
                        : f === 'NEUTRAL' ? '#888'
                        : '#00d09c'
                      : '#2a2a2a',
                    color: activeFilter === f ? '#000' : '#aaa',
                    fontSize: '0.8rem',
                  }}
                >
                  {f} {f !== 'ALL' ? `(${sentimentCounts[f]})` : `(${news.length})`}
                </button>
              ))}
            </div>

            {/* News 3 column grid */}
            {newsLoading ? (
              <p style={{ color: '#888' }}>Loading news...</p>
            ) : filteredNews.length === 0 ? (
              <p style={{ color: '#888' }}>No {activeFilter !== 'ALL' ? activeFilter.toLowerCase() : ''} news found.</p>
            ) : (
              <div style={newsGrid}>
                {filteredNews.map((article, i) => (
                  <a key={i} href={article.url} target="_blank" rel="noreferrer" style={newsCard}>
                    {article.urlToImage && (
                      <img
                        src={article.urlToImage}
                        alt=""
                        style={newsImage}
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    )}
                    <div style={{ padding: '0.75rem' }}>
                      <span style={{
                        ...sentimentBadge,
                        background: sentimentColor(article.sentiment) + '22',
                        color: sentimentColor(article.sentiment),
                        marginBottom: '0.5rem',
                        display: 'inline-block',
                      }}>
                        {article.sentiment}
                      </span>
                      <div style={newsTitle}>{article.title}</div>
                      <div style={newsMeta}>
                        {article.source} · {new Date(article.publishedAt).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const container = { maxWidth: '1000px', margin: '0 auto', padding: '2rem' };
const centered = { textAlign: 'center', padding: '4rem', color: '#888' };
const header = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' };
const stockTitle = { fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' };
const symbolTag = { background: '#2a2a2a', color: '#aaa', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem', marginRight: '0.5rem' };
const sectorTag = { background: '#1a2a2a', color: '#00d09c', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem' };
const priceText = { fontSize: '2rem', fontWeight: 'bold' };
const section = { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' };
const sectionTitle = { fontSize: '1.1rem', fontWeight: 'bold' };
const statsGrid = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' };
const statCard = { background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '0.85rem 1rem' };
const statLabel = { color: '#888', fontSize: '0.78rem', marginBottom: '0.3rem' };
const statValue = { fontWeight: 'bold', fontSize: '0.95rem' };
const toggleBtn = { marginTop: '1rem', background: 'transparent', border: '1px solid #2a2a2a', color: '#888', padding: '0.4rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' };
const rangeBtn = { background: 'transparent', border: '1px solid #2a2a2a', color: '#888', padding: '0.3rem 0.6rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' };
const activeRangeBtn = { ...rangeBtn, background: '#00d09c', color: '#000', border: '1px solid #00d09c', fontWeight: 'bold' };
const newsGrid = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' };
const newsCard = { background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: '10px', textDecoration: 'none', color: 'inherit', overflow: 'hidden', display: 'block' };
const newsImage = { width: '100%', height: '140px', objectFit: 'cover' };
const newsTitle = { fontSize: '0.85rem', lineHeight: '1.4', marginBottom: '0.5rem', color: '#e0e0e0' };
const newsMeta = { color: '#666', fontSize: '0.75rem' };
const sentimentBadge = { padding: '0.2rem 0.5rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 'bold' };
const buyBtn = { padding: '0.7rem 2rem', background: '#00d09c', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' };
const sellBtn = { padding: '0.7rem 2rem', background: 'transparent', color: '#ff4444', border: '1px solid #ff4444', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' };
const cancelBtn = { padding: '0.7rem 2rem', background: 'transparent', color: '#888', border: '1px solid #444', borderRadius: '8px', cursor: 'pointer' };
const modalOverlay = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalBox = { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '2rem', width: '100%', maxWidth: '400px' };
const modalInput = { width: '100%', padding: '0.8rem', background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#e0e0e0', fontSize: '1rem', marginBottom: '1rem', display: 'block' };
const watchlistBtn = { padding: '0.7rem 1.25rem', background: 'transparent', color: '#f0c040', border: '1px solid #f0c040', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.95rem' };

export default StockDetail;
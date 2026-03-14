# Dalal Street -- Frontend

React frontend for [Dalal Street](https://dalal-street.vercel.app/), an Indian stock market simulator where you trade NSE stocks with virtual money, track live prices, and compete with friends in Stock Battles.

**Backend Repo:** [dalal-street-server](https://github.com/Jinay-Jain10/dalal-street.git)  
**Live Demo:** [dalal-street.vercel.app](https://dalal-street.vercel.app/)

---

## The Problem We're Solving

Every stock market simulator lets you trade alone. There's no competition, no stakes, no social element- just you and a number going up or down.

**Dalal Street fixes this with Stock Battles- the only feature of its kind in any free Indian stock market simulator.**

Stock Battles lets you create a private trading competition, invite friends with a 6-character code, and compete on real NSE prices to see who builds the best portfolio. Think of it like fantasy cricket- but for the stock market. It transforms simulation from a solo learning exercise into something you actually want to show your friends and compete on.

There is no other free Indian stock market app that has this feature.

---

## Features

### Stock Battles (USP)
The core differentiator- no other free Indian stock market simulator has this.

- **Create** a private battle with a shareable 6-character invite code
- **Choose** starting balance (₹50K to ₹10L) and duration (24h, 48h, 5 days)
- **Compete** on real NSE prices- whoever builds the highest portfolio value wins
- **Live leaderboard** ranked by total portfolio value, updates with live prices
- **Trade independently** within each battle- battle balance is fully isolated from personal balance
- **Join multiple battles** simultaneously without conflicts
- **Waiting room** with auto-refresh so you see friends join in real time without refreshing
- **Battle auto-ends** when duration expires, leaderboard freezes at final prices
- **Past battles** archived separately so you can look back at results
- **Creator controls**- start battle once minimum members joined, delete waiting battles

### Stock Market
- Live Nifty 50 and Bank Nifty indices on home page
- Top 5 gainers and losers from Nifty 50, updated every 5 minutes
- Search 2100+ NSE listed stocks by name or symbol
- Live stock quotes- price, change, high, low, 52-week range, P/E, market cap, VWAP, sector, industry
- Interactive price history chart with 1W, 1M, 3M, 1Y, 5Y ranges (Recharts)

### AI-Powered News
- Latest news articles for any stock
- Each article tagged POSITIVE, NEGATIVE, or NEUTRAL by Groq's Llama 3.3 70B
- Filter news by sentiment
- Sentiment counts shown per filter

### Portfolio & Watchlist
- Trade NSE stocks with ₹1,00,000 virtual starting balance
- Real-time P&L calculated on the frontend from live prices
- Full transaction history
- Watchlist with live price, change, high, low, volume tracking

### Performance
- Global Zustand price store- single poll every 2.5 minutes shared across all pages
- No redundant API calls- all components read from the same store
- Backend in-memory cache- NSE called at most once every 5 minutes per symbol
- Responsive design- works on mobile and desktop

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + Vite |
| State Management | Zustand |
| Routing | React Router v6 |
| Charts | Recharts |
| HTTP Client | Axios |
| Hosting | Vercel |

---

## Architecture Decisions

**Global Zustand price store** — Instead of each page independently polling for live prices every 30 seconds, a single `priceStore` manages all symbol subscriptions and polls NSE every 2.5 minutes. Components subscribe to the symbols they need on mount and unsubscribe on unmount. This reduces API calls from potentially 10-15 per 30 seconds to 1 per 2.5 minutes regardless of how many pages are open.

**P&L calculated on the frontend** — Portfolio holdings structure (quantities, average buy prices) is fetched once from the backend on page load. Live P&L is then recalculated on the frontend using prices from the price store. This avoids expensive server-side recalculations on every price poll.

**Server timestamp for last updated** — The market overview endpoint returns a `fetchedAt` timestamp with every response, including cached ones. The frontend uses this instead of the local time, so "Last updated" accurately reflects when NSE was actually called- not when the page was loaded or navigated to.

**Battle leaderboard deduplication** — When calculating leaderboard rankings, the backend deduplicates all symbols held across all members before fetching prices. If 5 players all hold RELIANCE, NSE is called once not five times.

---

## Pages
```
/              — Home (market overview + stock search)
/login         — Login
/register      — Register
/stock/:symbol — Stock detail (quote, chart, news, buy/sell)
/portfolio     — Personal portfolio (holdings + transaction history)
/watchlist     — Watchlist with live prices
/battles       — Battles list (active + past)
/battles/:id   — Battle detail (leaderboard, trade, holdings)
```

---

## Local Setup

**Prerequisites:** Node.js 18+, backend server running
```bash
# Clone the repo
git clone https://github.com/Jinay-Jain10/dalal-street-frontend.git
cd dalal-street-client

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Fill in your values

# Start dev server
npm run dev
```

App runs at `http://localhost:5173`

---

## Environment Variables
```env
VITE_API_URL=http://localhost:5000/api
```

For production, set this to your Railway backend URL in Vercel dashboard:
```env
VITE_API_URL=https://your-railway-url.railway.app/api
```

---

## Deployment

- **Platform:** Vercel
- Connect GitHub repo to Vercel
- Add `VITE_API_URL` environment variable in Vercel dashboard pointing to your Railway backend
- Vercel auto-deploys on every push to `main`

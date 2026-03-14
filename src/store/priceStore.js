import { create } from 'zustand';
import api from '../api/axios';

const usePriceStore = create((set, get) => ({
  prices: {},
  subscribers: new Set(),
  intervalId: null,
  lastUpdated: null,  // add this

  subscribe: (symbols) => {
    const { subscribers, intervalId, startPolling } = get();
    symbols.forEach((s) => subscribers.add(s));
    set({ subscribers: new Set(subscribers) });
    if (!intervalId) startPolling();
  },

  unsubscribe: (symbols) => {
    const { subscribers, intervalId, stopPolling } = get();
    symbols.forEach((s) => subscribers.delete(s));
    set({ subscribers: new Set(subscribers) });
    if (subscribers.size === 0) stopPolling();
  },

  fetchPrices: async () => {
    const { subscribers } = get();
    if (subscribers.size === 0) return;

    const symbols = [...subscribers];
    try {
      const results = await Promise.all(
        symbols.map((symbol) =>
          api.get(`/stocks/${symbol}`)
            .then((res) => ({ symbol, data: res.data.data }))
            .catch(() => null)
        )
      );

      const newPrices = { ...get().prices };
      results.forEach((r) => {
        if (r) {
            newPrices[r.symbol] = {
                price: r.data.price,
                change: r.data.change,
                changePercent: r.data.changePercent,
                high: r.data.high,
                low: r.data.low,
                volume: r.data.volume,
              };
        }
      });

      set({ prices: newPrices });
    } catch (err) {
      console.error('Price fetch error:', err);
    }
  },

  startPolling: () => {
    const { fetchPrices } = get();
    fetchPrices(); // immediate first fetch
    const intervalId = setInterval(fetchPrices, 30000);
    set({ intervalId });
  },

  stopPolling: () => {
    const { intervalId } = get();
    if (intervalId) clearInterval(intervalId);
    set({ intervalId: null });
  },

  fetchPrices: async () => {
    const { subscribers } = get();
    if (subscribers.size === 0) return;

    const symbols = [...subscribers];
    try {
      const results = await Promise.all(
        symbols.map((symbol) =>
          api.get(`/stocks/${symbol}`)
            .then((res) => ({ symbol, data: res.data.data }))
            .catch(() => null)
        )
      );

      const newPrices = { ...get().prices };
      results.forEach((r) => {
        if (r) {
          newPrices[r.symbol] = {
            price: r.data.price,
            change: r.data.change,
            changePercent: r.data.changePercent,
            high: r.data.high,
            low: r.data.low,
            volume: r.data.volume,
          };
        }
      });

      set({ prices: newPrices, lastUpdated: new Date().toLocaleTimeString('en-IN') }); // update here
    } catch (err) {
      console.error('Price fetch error:', err);
    }
  },
}));

export default usePriceStore;
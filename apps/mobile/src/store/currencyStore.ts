import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Currency = 'COP' | 'Bs' | 'USD';

interface CurrencyState {
  currency: Currency;
  rates: Record<string, number>;
  setCurrency: (c: Currency) => Promise<void>;
  loadCurrency: () => Promise<void>;
  loadRates: () => Promise<void>;
  convertPrice: (priceCop: number) => number;
  formatPrice: (priceCop: number) => string;
}

const defaultRates: Record<string, number> = {
  COP: 1,
  Bs: 36.50,
  USD: 0.024,
};

export const useCurrencyStore = create<CurrencyState>((set, get) => ({
  currency: 'COP',
  rates: defaultRates,

  loadCurrency: async () => {
    try {
      const stored = await AsyncStorage.getItem('currency');
      if (stored && ['COP', 'Bs', 'USD'].includes(stored)) {
        set({ currency: stored as Currency });
      }
    } catch {}
  },

  loadRates: async () => {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/rates`);
      const data = await response.json();
      if (data.ok && data.data?.rates) {
        set({ rates: data.data.rates });
      }
    } catch {}
  },

  setCurrency: async (c: Currency) => {
    try {
      await AsyncStorage.setItem('currency', c);
    } catch {}
    set({ currency: c });
  },

  convertPrice: (priceCop: number) => {
    const { currency, rates } = get();
    const rate = rates[currency] || 1;
    return currency === 'COP' ? priceCop : priceCop / rate;
  },

  formatPrice: (priceCop: number) => {
    const { convertPrice, currency } = get();
    const converted = convertPrice(priceCop);
    if (currency === 'Bs') {
      return `Bs. ${converted.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (currency === 'USD') {
      return `USD $${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `COP $${Math.round(converted).toLocaleString('es-CO')}`;
  },
}));

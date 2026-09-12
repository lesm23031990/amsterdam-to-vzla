'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api } from '@/lib/api';

type Currency = 'COP' | 'Bs' | 'USD';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  rates: Record<string, number>;
  formatPrice: (priceCop: number) => string;
  convertPrice: (priceCop: number) => number;
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

const defaultRates: Record<string, number> = {
  COP: 1,
  Bs: 36.50,
  USD: 0.024,
};

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('COP');
  const [rates, setRates] = useState(defaultRates);

  useEffect(() => {
    const stored = localStorage.getItem('currency') as Currency;
    if (stored && ['COP', 'Bs', 'USD'].includes(stored)) {
      setCurrencyState(stored);
    }
  }, []);

  useEffect(() => {
    api.get<{ rates?: Record<string, number> }>('/rates')
      .then((res) => {
        if (res.ok && res.data?.rates) {
          setRates(res.data.rates);
        }
      })
      .catch(() => {});
  }, []);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem('currency', c);
  }, []);

  const convertPrice = useCallback(
    (priceCop: number) => {
      const rate = rates[currency] || 1;
      return currency === 'COP' ? priceCop : priceCop / rate;
    },
    [currency, rates]
  );

  const formatPrice = useCallback(
    (priceCop: number) => {
      const converted = convertPrice(priceCop);
      if (currency === 'Bs') {
        return `Bs. ${converted.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      if (currency === 'USD') {
        return `USD $${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      return `COP $${Math.round(converted).toLocaleString('es-CO')}`;
    },
    [currency, convertPrice]
  );

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, rates, formatPrice, convertPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}

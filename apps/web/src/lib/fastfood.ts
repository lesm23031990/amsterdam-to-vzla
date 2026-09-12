export interface MenuChoice {
  id: string;
  name: string;
  priceModifier: number;
}

export interface MenuOption {
  id: string;
  name: string;
  type: 'single' | 'multiple';
  required: boolean;
  choices: MenuChoice[];
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  currency: string;
  category: string | null;
  image: string | null;
  preparationTime: number;
  isAvailable: boolean;
  options: MenuOption[];
}

export interface Customization {
  optionId: string;
  choiceId: string;
}

export function formatMenuPrice(amount: number, currency: string): string {
  if (currency === 'Bs') {
    return `Bs. ${amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (currency === 'COP') {
    return `COP $${Math.round(amount).toLocaleString('es-CO')}`;
  }
  if (currency === 'USD') {
    return `USD $${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${currency} ${amount.toLocaleString('es-VE', { maximumFractionDigits: 2 })}`;
}

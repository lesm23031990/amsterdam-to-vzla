export interface PricingChoice {
  id: string;
  name: string;
  priceModifier?: number | null;
}

export interface PricingOption {
  id: string;
  name: string;
  type: 'single' | 'multiple';
  required: boolean;
  choices: PricingChoice[];
}

export interface Customization {
  optionId: string;
  choiceId: string;
}

/** Suma los modificadores de precio de las opciones seleccionadas. */
export function modifierTotal(
  options: PricingOption[],
  selected: Record<string, string[]>,
): number {
  return options.reduce((sum, option) => {
    const chosen = selected[option.id] || [];
    return (
      sum +
      option.choices
        .filter((choice) => chosen.includes(choice.id))
        .reduce((subtotal, choice) => subtotal + (choice.priceModifier || 0), 0)
    );
  }, 0);
}

/** Precio unitario = precio base + modificadores. */
export function unitPrice(
  basePrice: number,
  options: PricingOption[],
  selected: Record<string, string[]>,
): number {
  return basePrice + modifierTotal(options, selected);
}

/** Primera opción obligatoria sin elegir (o null si todo está completo). */
export function missingRequiredOption(
  options: PricingOption[],
  selected: Record<string, string[]>,
): PricingOption | null {
  return options.find((option) => option.required && (selected[option.id] || []).length === 0) ?? null;
}

/** Aplana la selección al formato que espera `POST /api/v1/cart/items`. */
export function buildCustomizations(
  options: PricingOption[],
  selected: Record<string, string[]>,
): Customization[] {
  return options.flatMap((option) =>
    (selected[option.id] || []).map((choiceId) => ({ optionId: option.id, choiceId })),
  );
}

/** Actualiza la selección respetando opciones de tipo `single`. */
export function toggleSelection(
  options: PricingOption[],
  selected: Record<string, string[]>,
  optionId: string,
  choiceId: string,
): Record<string, string[]> {
  const option = options.find((item) => item.id === optionId);
  const current = selected[optionId] || [];
  if (option?.type === 'single') {
    return { ...selected, [optionId]: current.includes(choiceId) ? [] : [choiceId] };
  }
  const next = current.includes(choiceId)
    ? current.filter((id) => id !== choiceId)
    : [...current, choiceId];
  return { ...selected, [optionId]: next };
}

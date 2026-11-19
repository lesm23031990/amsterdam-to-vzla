import { describe, it, expect } from 'vitest';
import {
  buildCustomizations,
  missingRequiredOption,
  modifierTotal,
  toggleSelection,
  unitPrice,
  type PricingOption,
} from '../src/lib/menuPricing';

const options: PricingOption[] = [
  {
    id: 'size',
    name: 'Tamaño',
    type: 'single',
    required: true,
    choices: [
      { id: 'personal', name: 'Personal', priceModifier: 0 },
      { id: 'grande', name: 'Grande', priceModifier: 2.5 },
    ],
  },
  {
    id: 'extras',
    name: 'Extras',
    type: 'multiple',
    required: false,
    choices: [
      { id: 'queso', name: 'Queso', priceModifier: 1 },
      { id: 'tocino', name: 'Tocino', priceModifier: 1.5 },
    ],
  },
];

describe('menuPricing', () => {
  it('suma los modificadores de las opciones elegidas', () => {
    expect(modifierTotal(options, { size: ['grande'], extras: ['queso', 'tocino'] })).toBe(5);
    expect(modifierTotal(options, {})).toBe(0);
  });

  it('calcula el precio unitario sobre el precio base', () => {
    expect(unitPrice(10, options, { size: ['grande'] })).toBe(12.5);
  });

  it('detecta la primera opción obligatoria sin elegir', () => {
    expect(missingRequiredOption(options, {})?.id).toBe('size');
    expect(missingRequiredOption(options, { size: ['personal'] })).toBeNull();
  });

  it('aplana la selección al formato del carrito', () => {
    expect(buildCustomizations(options, { size: ['grande'], extras: ['queso'] })).toEqual([
      { optionId: 'size', choiceId: 'grande' },
      { optionId: 'extras', choiceId: 'queso' },
    ]);
  });

  it('toggleSelection respeta single y multiple', () => {
    const single = toggleSelection(options, {}, 'size', 'grande');
    expect(single.size).toEqual(['grande']);
    expect(toggleSelection(options, single, 'size', 'personal').size).toEqual(['personal']);
    expect(toggleSelection(options, single, 'size', 'grande').size).toEqual([]);

    const multi = toggleSelection(options, {}, 'extras', 'queso');
    expect(multi.extras).toEqual(['queso']);
    expect(toggleSelection(options, multi, 'extras', 'tocino').extras).toEqual(['queso', 'tocino']);
    expect(toggleSelection(options, multi, 'extras', 'queso').extras).toEqual([]);
  });
});

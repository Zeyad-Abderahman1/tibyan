import { describe, it, expect } from 'vitest';
import { calculateEffectivePayment } from '../src/groups/payment-inheritance.js';

describe('Task 6: Pure Payment Inheritance Logic', () => {
  const defaultGroup = {
    defaultPaymentType: 'MONTHLY' as const,
    defaultPaymentAmount: 500,
  };

  it('Pure payment inheritance: no overrides (both null)', () => {
    const effective = calculateEffectivePayment(defaultGroup, {
      paymentTypeOverride: null,
      paymentAmountOverride: null,
    });

    expect(effective.paymentType).toBe('MONTHLY');
    expect(effective.amount).toBe(500);
    expect(effective.isOverridden).toBe(false);
  });

  it('Pure payment inheritance: no overrides (both undefined)', () => {
    const effective = calculateEffectivePayment(defaultGroup, {});

    expect(effective.paymentType).toBe('MONTHLY');
    expect(effective.amount).toBe(500);
    expect(effective.isOverridden).toBe(false);
  });

  it('Pure payment inheritance: type override only', () => {
    const effective = calculateEffectivePayment(defaultGroup, {
      paymentTypeOverride: 'PER_SESSION',
      paymentAmountOverride: null,
    });

    expect(effective.paymentType).toBe('PER_SESSION');
    expect(effective.amount).toBe(500); // Inherits default amount
    expect(effective.isOverridden).toBe(true);
  });

  it('Pure payment inheritance: amount override only', () => {
    const effective = calculateEffectivePayment(defaultGroup, {
      paymentTypeOverride: null,
      paymentAmountOverride: 350,
    });

    expect(effective.paymentType).toBe('MONTHLY'); // Inherits default type
    expect(effective.amount).toBe(350);
    expect(effective.isOverridden).toBe(true);
  });

  it('Pure payment inheritance: both overrides active', () => {
    const effective = calculateEffectivePayment(defaultGroup, {
      paymentTypeOverride: 'PER_SESSION',
      paymentAmountOverride: 150,
    });

    expect(effective.paymentType).toBe('PER_SESSION');
    expect(effective.amount).toBe(150);
    expect(effective.isOverridden).toBe(true);
  });

  it('Allows 0 amount override (e.g. full scholarship/waived fee)', () => {
    const effective = calculateEffectivePayment(defaultGroup, {
      paymentTypeOverride: null,
      paymentAmountOverride: 0,
    });

    expect(effective.paymentType).toBe('MONTHLY');
    expect(effective.amount).toBe(0);
    expect(effective.isOverridden).toBe(true);
  });
});

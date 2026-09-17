import type { PaymentType } from '@tibyan/contracts';

export interface GroupPaymentDefaults {
  defaultPaymentType: PaymentType;
  defaultPaymentAmount: number;
}

export interface EnrollmentPaymentOverrides {
  paymentTypeOverride?: PaymentType | null;
  paymentAmountOverride?: number | null;
}

export interface EffectivePaymentTerms {
  paymentType: PaymentType;
  amount: number;
  isOverridden: boolean;
}

/**
 * Computes effective payment terms for a student in a specific group enrollment.
 * 
 * Rules:
 * 1. Pure function with zero external or SQLite dependencies.
 * 2. Group default + null override inherits the group's default setting.
 * 3. An explicit enrollment override replaces only the corresponding inherited value.
 * 4. Payment type and amount overrides are evaluated independently.
 * 5. Returns whether any override is active.
 */
export function calculateEffectivePayment(
  group: GroupPaymentDefaults,
  enrollment: EnrollmentPaymentOverrides
): EffectivePaymentTerms {
  const hasTypeOverride =
    enrollment.paymentTypeOverride !== null &&
    enrollment.paymentTypeOverride !== undefined;

  const hasAmountOverride =
    enrollment.paymentAmountOverride !== null &&
    enrollment.paymentAmountOverride !== undefined;

  return {
    paymentType: hasTypeOverride ? enrollment.paymentTypeOverride! : group.defaultPaymentType,
    amount: hasAmountOverride ? enrollment.paymentAmountOverride! : group.defaultPaymentAmount,
    isOverridden: hasTypeOverride || hasAmountOverride,
  };
}

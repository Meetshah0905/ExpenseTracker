import { calculateEmi } from "./emi";
import type { EmiDetails, PurchaseDecision } from "../types/finance";

export type SmartBuyDraft = {
  productName: string;
  category: string;
  price: number;
  monthlyIncome: number;
  paymentType: PurchaseDecision["paymentType"];
  tenureMonths: number;
  annualInterestRatePercent: number;
  expectedResaleValue: number;
  expectedMonthlyIncome: number;
  expectedMonthlyTimeSavedHours: number;
  usageFrequency: PurchaseDecision["usageFrequency"];
  purpose: PurchaseDecision["purpose"];
  alreadyOwnSimilar: boolean;
  canDelay30Days: boolean;
  emotionalPurchase: PurchaseDecision["emotionalPurchase"];
  mainReason: string;
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export function evaluateSmartBuy(draft: SmartBuyDraft): Omit<PurchaseDecision, "id" | "createdAt" | "updatedAt"> & {
  monthlyPayment: number;
  totalPayable: number;
  totalInterest: number;
  monthlyBurdenPercent: number;
  netEffectiveCost: number;
  creatorROI?: number;
} {
  const isFinanced = draft.paymentType !== "full";
  const emi: EmiDetails | undefined = isFinanced
    ? calculateEmi({
        principal: draft.price,
        tenureMonths: draft.tenureMonths,
        annualInterestRatePercent: draft.annualInterestRatePercent,
        startDate: new Date().toISOString().slice(0, 10)
      })
    : undefined;
  const monthlyPayment = emi?.monthlyEmi ?? draft.price;
  const totalPayable = emi?.totalPayable ?? draft.price;
  const totalInterest = emi?.totalInterest ?? 0;
  const monthlyBurdenPercent = draft.monthlyIncome > 0 ? (monthlyPayment / draft.monthlyIncome) * 100 : 100;
  const netEffectiveCost = Math.max(0, totalPayable - draft.expectedResaleValue);
  const breakEvenMonths = draft.expectedMonthlyIncome > 0 ? netEffectiveCost / draft.expectedMonthlyIncome : undefined;
  const creatorROI = isFinanced && monthlyPayment > 0 ? draft.expectedMonthlyIncome / monthlyPayment : undefined;

  let affordabilityScore = 100;
  if (monthlyBurdenPercent > 20) affordabilityScore = 20;
  else if (monthlyBurdenPercent > 10) affordabilityScore = 45;
  else if (monthlyBurdenPercent > 5) affordabilityScore = 70;

  const usagePoints = { daily: 28, weekly: 20, monthly: 10, rarely: 2 }[draft.usageFrequency];
  const purposePoints = { business: 25, content_creation: 25, productivity: 18, personal: 10, luxury: 4 }[draft.purpose];
  const incomePoints = draft.expectedMonthlyIncome > 0 ? 22 : 0;
  const timePoints = Math.min(15, draft.expectedMonthlyTimeSavedHours * 2);
  const similarPenalty = draft.alreadyOwnSimilar ? 18 : 0;
  const usefulnessScore = clamp(usagePoints + purposePoints + incomePoints + timePoints - similarPenalty);

  const luxuryScore = clamp(
    (draft.usageFrequency === "rarely" ? 24 : draft.usageFrequency === "monthly" ? 16 : 4) +
      (draft.expectedMonthlyIncome <= 0 ? 18 : 0) +
      (draft.emotionalPurchase === "yes" ? 22 : draft.emotionalPurchase === "maybe" ? 12 : 0) +
      (draft.alreadyOwnSimilar ? 18 : 0) +
      (monthlyBurdenPercent > 10 ? 15 : 0) +
      (draft.canDelay30Days ? 12 : 0) +
      (draft.purpose === "luxury" ? 20 : 0)
  );

  let recommendation: PurchaseDecision["recommendation"] = "buy_carefully";
  if ((draft.purpose === "business" || draft.purpose === "content_creation") && draft.expectedMonthlyIncome > 0 && usefulnessScore >= 60) {
    recommendation = "business_investment";
  }
  if (affordabilityScore >= 70 && usefulnessScore >= 65 && luxuryScore < 45) recommendation = "strong_buy";
  if (luxuryScore >= 60 || draft.canDelay30Days) recommendation = "wait_30_days";
  if (affordabilityScore <= 25 && (draft.expectedMonthlyIncome <= 0 || usefulnessScore < 55)) recommendation = "avoid";

  const recommendationReason = buildReason({
    recommendation,
    monthlyBurdenPercent,
    breakEvenMonths,
    expectedMonthlyIncome: draft.expectedMonthlyIncome,
    creatorROI,
    usefulnessScore,
    luxuryScore
  });

  return {
    productName: draft.productName,
    category: draft.category,
    price: draft.price,
    currency: "INR",
    paymentType: draft.paymentType,
    emi,
    expectedMonthlyIncome: draft.expectedMonthlyIncome,
    expectedResaleValue: draft.expectedResaleValue,
    expectedMonthlyTimeSavedHours: draft.expectedMonthlyTimeSavedHours || undefined,
    usageFrequency: draft.usageFrequency,
    purpose: draft.purpose,
    alreadyOwnSimilar: draft.alreadyOwnSimilar,
    canDelay30Days: draft.canDelay30Days,
    emotionalPurchase: draft.emotionalPurchase,
    affordabilityScore,
    usefulnessScore,
    luxuryScore,
    breakEvenMonths,
    recommendation,
    recommendationReason,
    monthlyPayment,
    totalPayable,
    totalInterest,
    monthlyBurdenPercent,
    netEffectiveCost,
    creatorROI
  };
}

function buildReason(input: {
  recommendation: PurchaseDecision["recommendation"];
  monthlyBurdenPercent: number;
  breakEvenMonths?: number;
  expectedMonthlyIncome: number;
  creatorROI?: number;
  usefulnessScore: number;
  luxuryScore: number;
}) {
  const burden = `${input.monthlyBurdenPercent.toFixed(1)}% of monthly income`;
  const recovery = input.breakEvenMonths ? `${Math.ceil(input.breakEvenMonths)} months to recover the effective cost` : "no clear income recovery yet";
  const roi = input.creatorROI ? ` Creator ROI is ${input.creatorROI.toFixed(1)}x monthly payment.` : "";

  if (input.recommendation === "business_investment") {
    return `This can work as a business or creator investment if the income estimate is realistic. It affects about ${burden} and needs ${recovery}.${roi}`;
  }
  if (input.recommendation === "strong_buy") {
    return `The numbers look healthy: budget impact is ${burden}, usefulness is high, and it has ${recovery}. Check the real use case once more, then buy with confidence.`;
  }
  if (input.recommendation === "wait_30_days") {
    return `This may be partly desire-driven. Wait 30 days; if you still want it and it still has ${recovery}, it becomes a calmer decision.`;
  }
  if (input.recommendation === "avoid") {
    return `This puts too much pressure on the budget at ${burden}, and the earning/usefulness case is not strong enough yet. Look for renting, borrowing, or a cheaper alternative.`;
  }
  return `It could be useful, but buy carefully. Budget impact is ${burden}, usefulness score is ${input.usefulnessScore}, luxury score is ${input.luxuryScore}, and it has ${recovery}.`;
}

export function comparePaymentOptions(price: number, monthlyIncome: number) {
  return [0, 3, 6, 12, 24].flatMap((months) => {
    const rates = months === 0 ? [0] : [0, 9, 12, 16];
    return rates.map((rate) => {
      const emi = months === 0 ? undefined : calculateEmi({ principal: price, tenureMonths: months, annualInterestRatePercent: rate, startDate: new Date().toISOString().slice(0, 10) });
      const monthlyPayment = emi?.monthlyEmi ?? price;
      const burden = monthlyIncome > 0 ? (monthlyPayment / monthlyIncome) * 100 : 100;
      return {
        label: months === 0 ? "Pay full" : `${months} months at ${rate}%`,
        monthlyPayment,
        totalPayable: emi?.totalPayable ?? price,
        totalInterest: emi?.totalInterest ?? 0,
        burden,
        recommendation: burden > 20 ? "Avoid" : burden > 10 ? "Risky" : burden > 5 ? "Manageable" : "Comfortable"
      };
    });
  });
}

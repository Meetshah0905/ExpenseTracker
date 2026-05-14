import { describe, expect, it } from "vitest";
import { comparePaymentOptions, evaluateSmartBuy, type SmartBuyDraft } from "./smartBuy";

const draft: SmartBuyDraft = {
  productName: "Rayban Meta Glasses",
  category: "Gadgets",
  price: 42000,
  monthlyIncome: 100000,
  paymentType: "emi",
  tenureMonths: 12,
  annualInterestRatePercent: 16,
  expectedResaleValue: 18000,
  expectedMonthlyIncome: 5000,
  expectedMonthlyTimeSavedHours: 4,
  usageFrequency: "weekly",
  purpose: "content_creation",
  alreadyOwnSimilar: false,
  canDelay30Days: false,
  emotionalPurchase: "no",
  mainReason: "Creator work"
};

describe("smart buy", () => {
  it("calculates recommendation metrics", () => {
    const result = evaluateSmartBuy(draft);
    expect(result.totalInterest).toBeGreaterThan(0);
    expect(result.breakEvenMonths).toBeGreaterThan(0);
    expect(result.creatorROI).toBeGreaterThan(1);
    expect(result.recommendation).toMatch(/business_investment|strong_buy|buy_carefully/);
  });

  it("compares payment options", () => {
    const options = comparePaymentOptions(42000, 100000);
    expect(options.some((item) => item.label === "Pay full")).toBe(true);
    expect(options.some((item) => item.label === "12 months at 16%")).toBe(true);
  });
});

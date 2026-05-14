import { describe, expect, it } from "vitest";
import { calculateEmi } from "./emi";

describe("calculateEmi", () => {
  it("calculates 0% EMI by flat principal division", () => {
    const emi = calculateEmi({ principal: 42000, tenureMonths: 12, annualInterestRatePercent: 0, startDate: "2026-05-12" });
    expect(emi.monthlyEmi).toBe(3500);
    expect(emi.totalPayable).toBe(42000);
    expect(emi.totalInterest).toBe(0);
  });

  it("calculates reducing-balance EMI at 16% annually", () => {
    const emi = calculateEmi({ principal: 42000, tenureMonths: 12, annualInterestRatePercent: 16, startDate: "2026-05-12" });
    expect(Math.round(emi.monthlyEmi)).toBe(3811);
    expect(Math.round(emi.totalPayable)).toBe(45733);
    expect(Math.round(emi.totalInterest)).toBe(3733);
  });
});

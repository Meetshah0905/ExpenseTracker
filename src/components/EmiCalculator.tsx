import { useMemo } from "react";
import { calculateEmi } from "../lib/emi";
import { formatInr } from "../lib/currency";

export function EmiCalculator({
  principal,
  tenureMonths,
  annualInterestRatePercent,
  startDate,
  lender
}: {
  principal: number;
  tenureMonths: number;
  annualInterestRatePercent: number;
  startDate: string;
  lender?: string;
}) {
  const emi = useMemo(
    () =>
      principal > 0 && tenureMonths > 0
        ? calculateEmi({ principal, tenureMonths, annualInterestRatePercent, startDate, lender })
        : null,
    [annualInterestRatePercent, lender, principal, startDate, tenureMonths]
  );

  if (!emi) return <p className="empty">Enter loan details to preview EMI.</p>;

  return (
    <div className="emi-preview">
      <div><span>Principal</span><strong>{formatInr(emi.principal)}</strong></div>
      <div><span>Monthly EMI</span><strong>{formatInr(emi.monthlyEmi)}</strong></div>
      <div><span>Total payable</span><strong>{formatInr(emi.totalPayable)}</strong></div>
      <div><span>Total interest</span><strong>{formatInr(emi.totalInterest)}</strong></div>
      <div><span>Tenure</span><strong>{emi.tenureMonths} months</strong></div>
      <div><span>Months</span><strong>{emi.startDate.slice(0, 7)} to {emi.endDate.slice(0, 7)}</strong></div>
    </div>
  );
}

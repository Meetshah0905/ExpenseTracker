import type { EmiDetails } from "../types/finance";

const toMoney = (value: number) => Number(value.toFixed(2));

export function addMonths(dateIso: string, months: number) {
  const date = new Date(`${dateIso}T00:00:00`);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

export function calculateEmi(input: {
  principal: number;
  tenureMonths: number;
  annualInterestRatePercent: number;
  startDate: string;
  lender?: string;
}): EmiDetails {
  const { principal, tenureMonths, annualInterestRatePercent, startDate, lender } = input;
  const monthlyRate = annualInterestRatePercent / 12 / 100;
  const monthlyEmi =
    monthlyRate === 0
      ? principal / tenureMonths
      : (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
        (Math.pow(1 + monthlyRate, tenureMonths) - 1);
  const totalPayable = monthlyEmi * tenureMonths;

  return {
    principal: toMoney(principal),
    tenureMonths,
    annualInterestRatePercent,
    monthlyInterestRatePercent: Number((annualInterestRatePercent / 12).toFixed(4)),
    monthlyEmi: toMoney(monthlyEmi),
    totalPayable: toMoney(totalPayable),
    totalInterest: toMoney(totalPayable - principal),
    startDate,
    endDate: addMonths(startDate, tenureMonths - 1),
    lender: lender || undefined
  };
}

export const todayIso = () => new Date().toISOString().slice(0, 10);

export const monthKey = (dateIso: string) => dateIso.slice(0, 7);

export const currentMonthKey = () => monthKey(todayIso());

export const formatMonth = (key: string) => {
  const [year, month] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(new Date(year, month - 1));
};

export const isSameMonth = (dateIso: string, month: string) => monthKey(dateIso) === month;

export function getScheduleDayAndCategory(date: string) {
  const parts = date.split("-").map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];

  if (!year || !month || !day) {
    return { day: 0, category: "Normal" };
  }

  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const scheduleDay = weekday === 0 ? 7 : weekday;

  const twinDateStart = month;
  const twinDateEnd = month + 2;
  const isTwinDateWindow =
    day >= twinDateStart && day <= twinDateEnd;

  return {
    day: scheduleDay,
    category: isTwinDateWindow ? "Campaign" : "Normal",
  };
}

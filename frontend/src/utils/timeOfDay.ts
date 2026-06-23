export const getTimeOfDayPhrase = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'this morning';
  if (hour < 17) return 'this afternoon';
  return 'tonight';
};

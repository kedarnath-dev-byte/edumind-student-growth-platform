export const parseUtc = value => new Date(typeof value === 'string' && !/(Z|[+-]\d\d:\d\d)$/.test(value) ? `${value}Z` : value)
export const schoolDateKey = value => {
  const date = value instanceof Date ? value : parseUtc(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

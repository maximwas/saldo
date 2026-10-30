/** YYYY-MM-DD as noon UTC: formatted with timeZone «UTC» it is the same calendar day in any browser zone */
export function isoToDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number)

  return new Date(Date.UTC(year, month - 1, day, 12))
}

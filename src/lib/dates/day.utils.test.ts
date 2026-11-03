import { createFormatter, createTranslator, type DateTimeFormatOptions } from 'next-intl'
import { describe, expect, it, vi } from 'vitest'
import { useMonthLabel, useMonthOf } from '@/features/budget/hooks/month-label.hook'
import { dayText } from '@/features/credits/utils/credits.utils'
import { useDateLabel } from '@/features/subscriptions/hooks/date-label.hook'
import calendarEn from '../../../messages/en/calendar.json'
import commonEn from '../../../messages/en/common.json'
import operationsEn from '../../../messages/en/operations.json'
import calendarUk from '../../../messages/uk/calendar.json'
import commonUk from '../../../messages/uk/common.json'
import operationsUk from '../../../messages/uk/operations.json'

// next-intl formats in the provider's zone (src/i18n/request.ts DEFAULT_TIME_ZONE)
const KYIV = 'Europe/Kyiv'
const intl = vi.hoisted(() => ({ locale: 'uk' as 'uk' | 'en' }))

vi.mock('next-intl', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next-intl')>()

  return {
    ...actual,
    useFormatter: () =>
      actual.createFormatter({
        locale: intl.locale,
        timeZone: KYIV,
      }),
    useLocale: () => intl.locale,
  }
})

const LOCALES = ['uk', 'en'] as const

type Locale = (typeof LOCALES)[number]

// a Tuesday, the year edge, a leap day and both Kyiv DST days
const DAYS = ['2026-11-03', '2026-01-01', '2025-12-31', '2028-02-29', '2026-03-29', '2026-10-25']

// month formats get the YYYY-MM of the day, the rest the day itself (as their callers pass them)
const MONTH_FORMATS = new Set(['month', 'monthYear', 'monthOf'])

// ── subject: the code that shows each format (characterization of the inline copies and the feature helpers) ──
function render(format: string, value: string): string {
  const formatter = createFormatter({
    locale: intl.locale,
    timeZone: KYIV,
  })
  const inline = (options: DateTimeFormatOptions) =>
    formatter.dateTime(new Date(`${value}T12:00:00Z`), {
      ...options,
      timeZone: 'UTC',
    })
  const subjects: Record<string, () => string> = {
    short: () => dayText(value, intl.locale),
    shortYear: () => useDateLabel()(value, true),
    dayMonth: () =>
      inline({
        day: 'numeric',
        month: 'long',
      }),
    dayMonthYear: () =>
      inline({
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    dayMonthShort: () =>
      inline({
        day: 'numeric',
        month: 'short',
      }),
    dayMonthShortYear: () =>
      inline({
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    medium: () => new Intl.DateTimeFormat(intl.locale, { dateStyle: 'medium' }).format(new Date(`${value}T12:00:00`)),
    weekday: () => inline({ weekday: 'long' }),
    weekdayShort: () => inline({ weekday: 'short' }),
    weekdayDayMonth: () =>
      inline({
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }),
    month: () => useMonthLabel()(value, false),
    monthShort: () => inline({ month: 'short' }),
    monthYear: () => useMonthLabel()(value),
    monthOf: () => useMonthOf()(value),
    year: () => inline({ year: 'numeric' }),
  }

  return subjects[format]()
}
// ── end of subject ──

const EXPECTED: Record<string, Record<Locale, string[]>> = {
  short: {
    uk: ['03.11', '01.01', '31.12', '29.02', '29.03', '25.10'],
    en: ['11/03', '01/01', '12/31', '02/29', '03/29', '10/25'],
  },
  shortYear: {
    uk: ['03.11.2026', '01.01.2026', '31.12.2025', '29.02.2028', '29.03.2026', '25.10.2026'],
    en: ['11/03/2026', '01/01/2026', '12/31/2025', '02/29/2028', '03/29/2026', '10/25/2026'],
  },
  dayMonth: {
    uk: ['3 листопада', '1 січня', '31 грудня', '29 лютого', '29 березня', '25 жовтня'],
    en: ['November 3', 'January 1', 'December 31', 'February 29', 'March 29', 'October 25'],
  },
  dayMonthYear: {
    uk: [
      '3 листопада 2026 р.',
      '1 січня 2026 р.',
      '31 грудня 2025 р.',
      '29 лютого 2028 р.',
      '29 березня 2026 р.',
      '25 жовтня 2026 р.',
    ],
    en: [
      'November 3, 2026',
      'January 1, 2026',
      'December 31, 2025',
      'February 29, 2028',
      'March 29, 2026',
      'October 25, 2026',
    ],
  },
  dayMonthShort: {
    uk: ['3 лист.', '1 січ.', '31 груд.', '29 лют.', '29 бер.', '25 жовт.'],
    en: ['Nov 3', 'Jan 1', 'Dec 31', 'Feb 29', 'Mar 29', 'Oct 25'],
  },
  dayMonthShortYear: {
    uk: [
      '3 лист. 2026 р.',
      '1 січ. 2026 р.',
      '31 груд. 2025 р.',
      '29 лют. 2028 р.',
      '29 бер. 2026 р.',
      '25 жовт. 2026 р.',
    ],
    en: ['Nov 3, 2026', 'Jan 1, 2026', 'Dec 31, 2025', 'Feb 29, 2028', 'Mar 29, 2026', 'Oct 25, 2026'],
  },
  medium: {
    uk: [
      '3 лист. 2026 р.',
      '1 січ. 2026 р.',
      '31 груд. 2025 р.',
      '29 лют. 2028 р.',
      '29 бер. 2026 р.',
      '25 жовт. 2026 р.',
    ],
    en: ['Nov 3, 2026', 'Jan 1, 2026', 'Dec 31, 2025', 'Feb 29, 2028', 'Mar 29, 2026', 'Oct 25, 2026'],
  },
  weekday: {
    uk: ['вівторок', 'четвер', 'середа', 'вівторок', 'неділя', 'неділя'],
    en: ['Tuesday', 'Thursday', 'Wednesday', 'Tuesday', 'Sunday', 'Sunday'],
  },
  weekdayShort: {
    uk: ['вт', 'чт', 'ср', 'вт', 'нд', 'нд'],
    en: ['Tue', 'Thu', 'Wed', 'Tue', 'Sun', 'Sun'],
  },
  weekdayDayMonth: {
    uk: [
      'вівторок, 3 листопада',
      'четвер, 1 січня',
      'середа, 31 грудня',
      'вівторок, 29 лютого',
      'неділя, 29 березня',
      'неділя, 25 жовтня',
    ],
    en: [
      'Tuesday, November 3',
      'Thursday, January 1',
      'Wednesday, December 31',
      'Tuesday, February 29',
      'Sunday, March 29',
      'Sunday, October 25',
    ],
  },
  month: {
    uk: ['листопад', 'січень', 'грудень', 'лютий', 'березень', 'жовтень'],
    en: ['November', 'January', 'December', 'February', 'March', 'October'],
  },
  monthShort: {
    uk: ['лист.', 'січ.', 'груд.', 'лют.', 'бер.', 'жовт.'],
    en: ['Nov', 'Jan', 'Dec', 'Feb', 'Mar', 'Oct'],
  },
  monthYear: {
    uk: [
      'листопад 2026 р.',
      'січень 2026 р.',
      'грудень 2025 р.',
      'лютий 2028 р.',
      'березень 2026 р.',
      'жовтень 2026 р.',
    ],
    en: ['November 2026', 'January 2026', 'December 2025', 'February 2028', 'March 2026', 'October 2026'],
  },
  monthOf: {
    uk: ['листопада', 'січня', 'грудня', 'лютого', 'березня', 'жовтня'],
    en: ['November', 'January', 'December', 'February', 'March', 'October'],
  },
  year: {
    uk: ['2026', '2026', '2025', '2028', '2026', '2026'],
    en: ['2026', '2026', '2025', '2028', '2026', '2026'],
  },
}

const MESSAGES = {
  uk: {
    calendar: calendarUk,
    common: commonUk,
    operations: operationsUk,
  },
  en: {
    calendar: calendarEn,
    common: commonEn,
    operations: operationsEn,
  },
}

const CASES = Object.keys(EXPECTED).flatMap((format) => LOCALES.map((locale) => [format, locale] as const))

describe('calendar day as text (characterization: the visible output must not change)', () => {
  it.each(CASES)('%s in %s', (format, locale) => {
    intl.locale = locale

    const values = DAYS.map((day) => (MONTH_FORMATS.has(format) ? day.slice(0, 7) : day))

    expect(values.map((value) => render(format, value))).toEqual(EXPECTED[format][locale])
  })

  it.each([
    [
      'uk',
      'Сьогодні, вівторок 3 листопада',
      'Сьогодні, 3 листопада',
      'Сьогодні, 03.11',
      '2 лист. – 8 лист. 2026',
      '28 груд. – 3 січ. 2027',
    ],
    [
      'en',
      'Today, Tuesday November 3',
      'Today, November 3',
      'Today, 11/03',
      'Nov 2 – Nov 8 2026',
      'Dec 28 – Jan 3 2027',
    ],
  ] as const)(
    'today titles and week ranges in %s',
    (locale, calendarTitle, operationsTitle, pickerValue, week, yearEdgeWeek) => {
      intl.locale = locale

      const translate = createTranslator({
        locale,
        messages: MESSAGES[locale],
      })
      const range = (first: string, last: string) =>
        `${render('dayMonthShort', first)} – ${render('dayMonthShort', last)} ${last.slice(0, 4)}`

      expect(
        translate('calendar.day.today', {
          weekday: render('weekday', '2026-11-03'),
          date: render('dayMonth', '2026-11-03'),
        }),
      ).toBe(calendarTitle)
      expect(translate('operations.day.today', { date: render('dayMonth', '2026-11-03') })).toBe(operationsTitle)
      expect(translate('common.datePicker.todayValue', { date: render('short', '2026-11-03') })).toBe(pickerValue)
      expect(range('2026-11-02', '2026-11-08')).toBe(week)
      expect(range('2026-12-28', '2027-01-03')).toBe(yearEdgeWeek)
    },
  )
})

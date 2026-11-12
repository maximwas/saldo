/** the catch-all category private.seed_categories creates in both kinds; renamed, it sorts like any other */
const OTHER_CATEGORY = 'Інше'

/** a sort comparator: the «Other» category goes after every other category whatever its sort_order (a category added later gets
 * max + 1 and would land after it); the rest keep their order, since Array.prototype.sort is stable */
export const otherLast = (first: { name: string }, second: { name: string }) =>
  Number(first.name === OTHER_CATEGORY) - Number(second.name === OTHER_CATEGORY)

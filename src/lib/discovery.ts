import { addDays, validDate, type FestivalSummary } from "./domain";

export type SortOrder = "ending" | "starting" | "distance";
export type DurationFilter = "all" | "short" | "long";
export function validRange(start: string, end: string) {
  return (
    validDate(start) &&
    validDate(end) &&
    start <= end &&
    end <= addDays(start, 365)
  );
}
// Duration is not evidence of an event's category or daily operating schedule.
export function isLongRunning(f: FestivalSummary) {
  return f.endDate > addDays(f.startDate, 29);
}
export function discover<T extends FestivalSummary & { km: number | null }>(
  items: T[],
  options: {
    query: string;
    district: string;
    duration: DurationFilter;
    sort: SortOrder;
    date: string;
  },
): T[] {
  const query = options.query.trim().normalize("NFKC").toLocaleLowerCase("ko");
  return items
    .filter(
      (f) =>
        (!options.district || f.districtCode === options.district) &&
        (!query ||
          `${f.title} ${f.address ?? ""}`
            .normalize("NFKC")
            .toLocaleLowerCase("ko")
            .includes(query)) &&
        (options.duration === "all" ||
          isLongRunning(f) === (options.duration === "long")),
    )
    .sort((a, b) => {
      let order = 0;
      if (options.sort === "distance")
        order = (a.km ?? Infinity) - (b.km ?? Infinity);
      else if (options.sort === "ending")
        order = a.endDate.localeCompare(b.endDate);
      else {
        order =
          Number(a.startDate < options.date) -
          Number(b.startDate < options.date);
        if (!order)
          order =
            a.startDate >= options.date
              ? a.startDate.localeCompare(b.startDate)
              : b.startDate.localeCompare(a.startDate);
      }
      return (
        order ||
        a.title.localeCompare(b.title, "ko") ||
        a.contentId.localeCompare(b.contentId)
      );
    });
}

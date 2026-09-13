import { distance, type FestivalSummary } from "./domain";

export type Position = [number, number];
export function nearbyFestivals(
  items: FestivalSummary[],
  position: Position | null,
  radius: number,
) {
  return items
    .map((f) => ({
      ...f,
      km:
        position && f.latitude !== null && f.longitude !== null
          ? distance(...position, f.latitude, f.longitude)
          : null,
    }))
    .filter((f) => !position || (f.km !== null && f.km <= radius))
    .sort((a, b) =>
      position
        ? (a.km ?? Infinity) - (b.km ?? Infinity)
        : a.startDate.localeCompare(b.startDate),
    );
}

export function requestPosition(
  geo?: Pick<Geolocation, "getCurrentPosition">,
): Promise<Position> {
  return new Promise((resolve, reject) => {
    if (!geo)
      return reject(
        new Error(
          "이 브라우저에서는 위치를 사용할 수 없어요. 지역을 선택해 주세요.",
        ),
      );
    geo.getCurrentPosition(
      (p) => {
        const { latitude, longitude } = p.coords;
        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude) ||
          Math.abs(latitude) > 90 ||
          Math.abs(longitude) > 180
        ) {
          return reject(
            new Error("정확한 위치를 확인하지 못했어요. 지역을 선택해 주세요."),
          );
        }
        resolve([latitude, longitude]);
      },
      (e) =>
        reject(
          new Error(
            e.code === 1
              ? "위치 권한이 꺼져 있어요. 전국 축제를 둘러보거나 지역을 선택해 주세요."
              : e.code === 3
                ? "위치 확인 시간이 초과됐어요. 다시 시도하거나 지역을 선택해 주세요."
                : "위치를 확인하지 못했어요. 전국 축제를 둘러보거나 지역을 선택해 주세요.",
          ),
        ),
      { timeout: 10000, maximumAge: 60000 },
    );
  });
}

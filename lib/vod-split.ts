import { kstMonthDay, kstYear } from "@/lib/format";
import type { VodHubId } from "@/lib/vod-hub";

export const ALL_STAGE_ID = "all";

export type VodStageOption = {
  id: string;
  label: string;
};

const ALL: VodStageOption = { id: ALL_STAGE_ID, label: "전체" };

export function hubStageHeading(hubId: VodHubId): string {
  if (hubId === "lck" || hubId === "lpl" || hubId === "lec") return "스플릿";
  return "구간";
}

export function hubStageOptions(hubId: VodHubId, year: number): VodStageOption[] {
  if (hubId === "lck") {
    if (year <= 2024) return [ALL, { id: "spring", label: "스프링" }, { id: "summer", label: "서머" }];
    return [ALL, { id: "cup", label: "LCK컵" }, { id: "lck", label: "LCK" }];
  }
  if (hubId === "lpl") {
    if (year <= 2024) {
      return [ALL, { id: "spring", label: "스프링" }, { id: "summer", label: "서머" }, { id: "gauntlet", label: "선발전" }];
    }
    return [
      ALL,
      { id: "split1", label: "Split 1" },
      { id: "split2", label: "Split 2" },
      { id: "split3", label: "Split 3" },
      { id: "gauntlet", label: "선발전" },
    ];
  }
  if (hubId === "lec") {
    const winter: VodStageOption = year >= 2026 ? { id: "versus", label: "버서스" } : { id: "versus", label: "윈터" };
    return [ALL, winter, { id: "spring", label: "스프링" }, { id: "summer", label: "서머" }];
  }
  if (hubId === "worlds") {
    return [ALL, { id: "playin", label: "플레이인" }, { id: "swiss", label: "스위스" }, { id: "knockout", label: "녹아웃" }];
  }
  if (hubId === "msi") {
    return [ALL, { id: "playin", label: "플레이인" }, { id: "knockout", label: "녹아웃" }];
  }
  if (hubId === "first-stand") {
    return [ALL, { id: "groups", label: "그룹" }, { id: "knockout", label: "녹아웃" }];
  }
  return [ALL, { id: "groups", label: "그룹" }, { id: "knockout", label: "녹아웃" }];
}

function norm(split: string): string {
  return split.trim().toLowerCase().replace(/[-_]+/g, " ");
}

function isPlayIn(split: string): boolean {
  return /play\s*in/.test(norm(split));
}

function isGauntlet(split: string): boolean {
  const text = norm(split);
  return /regional\s*final/.test(text) || /gauntlet/.test(text) || /冒泡/.test(split) || /선발/.test(split);
}

export function matchStageId(
  hubId: VodHubId,
  split: string,
  startsAt: Date,
): string {
  const year = kstYear(startsAt);
  const md = kstMonthDay(startsAt);
  const text = norm(split);

  if (hubId === "lck") {
    if (/cup|컵/.test(text) || /lck\s*cup/.test(text)) return "cup";
    if (year <= 2024) return md <= 531 ? "spring" : "summer";
    return md <= 320 ? "cup" : "lck";
  }

  if (hubId === "lpl") {
    if (isGauntlet(split) && !isPlayIn(split)) return "gauntlet";
    if (/split\s*1|第一赛段/.test(text)) return "split1";
    if (/split\s*2|第二赛段/.test(text)) return "split2";
    if (/split\s*3|第三赛段/.test(text)) return "split3";
    if (year <= 2024) {
      if (isGauntlet(split)) return "gauntlet";
      return md <= 531 ? "spring" : "summer";
    }
    if (md >= 916) return "gauntlet";
    if (md <= 331) return "split1";
    if (md <= 630) return "split2";
    return "split3";
  }

  if (hubId === "lec") {
    if (/versus|버서스|winter|윈터/.test(text)) return "versus";
    if (/spring|스프링/.test(text)) return "spring";
    if (/summer|서머/.test(text)) return "summer";
    if (md <= 310) return "versus";
    if (md <= 615) return "spring";
    return "summer";
  }

  if (hubId === "worlds") {
    if (isPlayIn(split)) return "playin";
    if (/swiss|스위스/.test(text)) return "swiss";
    return "knockout";
  }

  if (hubId === "msi") {
    return isPlayIn(split) ? "playin" : "knockout";
  }

  if (hubId === "first-stand" || hubId === "ewc") {
    if (/semi|final|quarter|knockout|녹아웃|결승|4강|8강/.test(text)) return "knockout";
    return "groups";
  }

  return ALL_STAGE_ID;
}

export function stageLabelForMatch(hubId: VodHubId, split: string, startsAt: Date): string {
  const stageId = matchStageId(hubId, split, startsAt);
  return hubStageOptions(hubId, kstYear(startsAt)).find((option) => option.id === stageId)?.label ?? split;
}

export function filterMatchesByStage<T extends { split: string; startsAt: Date }>(
  rows: T[],
  hubId: VodHubId,
  stageId: string,
): T[] {
  if (stageId === ALL_STAGE_ID) return rows;
  return rows.filter((row) => matchStageId(hubId, row.split, row.startsAt) === stageId);
}

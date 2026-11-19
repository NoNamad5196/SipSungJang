export type OtakuSServiceId = "sipsungjang" | "otakuhub" | "gachaguard";

export interface OtakuSService {
  readonly id: OtakuSServiceId;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly color: string;
  readonly href: string | null;
  readonly current: boolean;
}

export interface OtakuSEnv {
  readonly NEXT_PUBLIC_OTAKUHUB_URL?: string;
  readonly NEXT_PUBLIC_GACHAGUARD_URL?: string;
}

export function validUrl(value?: string): string | null {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export function getOtakuSServices(
  env?: OtakuSEnv,
): readonly OtakuSService[] {
  const otakuhubUrl = env
    ? env.NEXT_PUBLIC_OTAKUHUB_URL
    : process.env.NEXT_PUBLIC_OTAKUHUB_URL;
  const gachaguardUrl = env
    ? env.NEXT_PUBLIC_GACHAGUARD_URL
    : process.env.NEXT_PUBLIC_GACHAGUARD_URL;

  return [
    {
      id: "sipsungjang",
      name: "SipSungJang",
      description: "육성 · 주간 목표 · 플레이 수첩",
      icon: "✦",
      color: "#c9a84c",
      href: "/dashboard",
      current: true,
    },
    {
      id: "otakuhub",
      name: "OtakuHub",
      description: "게임 · 서브컬처 이벤트와 일정",
      icon: "◈",
      color: "#6ab0e8",
      href: validUrl(otakuhubUrl),
      current: false,
    },
    {
      id: "gachaguard",
      name: "GachaGuard",
      description: "소비 기록 · 예산 · 과금 돌아보기",
      icon: "⊕",
      color: "#a882e8",
      href: validUrl(gachaguardUrl),
      current: false,
    },
  ];
}

// 사이트의 날짜·연도는 빌드 서버의 시간대와 상관없이 한국 시각으로 찍는다.
// Cloudflare 빌드는 UTC라 시간대를 지정하지 않으면 한국 시각 0~9시에 발행한 글이 하루 전 날짜로 나간다(2026-09-22 발견).
export const SITE_TIME_ZONE = 'Asia/Seoul';

/** `2026. 9. 22.` 형식 */
export function formatKoreanDate(date: Date): string {
  return date.toLocaleDateString('ko-KR', { timeZone: SITE_TIME_ZONE });
}

/** 한국 시각 기준 연도 */
export function koreanYear(date: Date = new Date()): number {
  return Number(new Intl.DateTimeFormat('en-CA', { timeZone: SITE_TIME_ZONE, year: 'numeric' }).format(date));
}

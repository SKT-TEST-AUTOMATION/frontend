/**
 * ms(밀리초)를 사람이 보기 쉬운 문자열로 변환.
 *
 * 예)
 *  - 953  → "0.95초"
 *  - 1200 → "1.2초"
 *  - 55000 → "55초"
 *  - 65000 → "1분 5초"
 *  - 3720000 → "1시간 2분 0초"
 */
export function formatMs(ms) {
  if (ms == null || isNaN(ms)) return "-";

  // 음수 방지
  ms = Math.max(0, Number(ms));

  const sec = ms / 1000;

  // 60초 미만 → 소수 1자리 초
  if (sec < 60) {
    if (sec < 1) {
      // 1초 미만: 밀리초 기준으로
      return `${ms}ms`;
    }
    return `${sec.toFixed(sec < 10 ? 1 : 0)}초`;
  }

  // 1분 이상
  const minutes = Math.floor(sec / 60);
  const seconds = Math.floor(sec % 60);

  // 1시간 이상
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}시간 ${mins}분 ${seconds}초`;
  }

  // 1분 이상 ~ 1시간 미만
  return `${minutes}분 ${seconds}초`;
}

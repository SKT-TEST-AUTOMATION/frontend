// src/features/testresult/utils/evidenceUtils.js
import { API_ORIGIN } from "../../../shared/config/apiConfig";

/**
 * 다양한 포맷(문자열, JSON, 배열 등)으로 들어오는 evidence 필드를
 * "경로 문자열 배열"로 정규화
 */
export function parseEvidenceList(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);

  const s = String(val).trim();
  if (!s) return [];

  // JSON 배열 or 객체
  if (
    (s.startsWith("[") && s.endsWith("]")) ||
    (s.startsWith("{") && s.endsWith("}"))
  ) {
    try {
      const j = JSON.parse(s);
      if (Array.isArray(j)) return j.filter(Boolean);
      if (j && Array.isArray(j.paths)) return j.paths.filter(Boolean);
    } catch (_) {
      // fallthrough
    }
  }

  // 공백/콤마/세미콜론 기준 split
  return s
    .split(/[\s,;]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/**
 * backend에서 내려오는 artifacts 경로를 실제 접근 가능한 URL로 변환
 */
export function toEvidenceUrl(p) {
  if (!p) return null;
  let v = String(p).trim();

  // 이미 절대 URL 또는 data URL
  if (/^(https?:)?\/\//i.test(v) || v.startsWith("data:")) return v;

  // 역슬래시 → 슬래시
  v = v.replace(/\\/g, "/");

  // /artifacts/로 시작하면 그대로 origin만 붙여줌
  if (v.startsWith("/artifacts/")) return `${API_ORIGIN}${v}`;

  // 루트 경로면 그대로 사용
  if (v.startsWith("/")) return v;

  // 중간에 artifacts/ 포함
  const idx = v.toLowerCase().indexOf("artifacts/");
  if (idx >= 0) {
    const sub = v.slice(idx + "artifacts/".length);
    return `${API_ORIGIN}/artifacts/${encodeURI(sub)}`;
  }

  // 상대 경로 → /artifacts/ 밑에 붙이기
  const cleaned = v.replace(/^(\.\/|\/)+/, "");
  return `${API_ORIGIN}/artifacts/${encodeURI(cleaned)}`;
}
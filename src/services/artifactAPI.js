// src/services/artifactAPI.js

/**
 * Evidence / Artifact URL Helper
 *
 * - 백엔드에서 /artifacts/** 로 서빙되는 정적 리소스를 위한 URL 빌더
 * - 실제 요청은 fetch/axios가 아니라 <img src="..."> 등에서 사용
 */

import { API_ORIGIN } from '../shared/config/apiConfig.js';

/**
 * evidencePath, okImg, failImg 등에서 브라우저가 접근 가능한 URL로 변환
 *
 * 규칙:
 *  - 이미 절대 URL(https://, //) 또는 data: URL이면 그대로 사용
 *  - 윈도우 경로의 경우 \ → / 로 치환
 *  - "/artifacts/..." 로 시작하면 `${API_ORIGIN}/artifacts/...`
 *  - "/" 로 시작하면 (프록시 구조 가정) 그대로 반환
 *  - 중간에 "artifacts/" 가 포함되면 그 뒤를 잘라 /artifacts/** 로 매핑
 *  - 나머지 상대경로는 "/artifacts/<cleaned>" 형태로 매핑
 */
export function toEvidenceUrl(p) {
  if (!p) return null;
  let v = String(p).trim();

  // 이미 절대 URL / data URL 이면 그대로 사용
  if (/^(https?:)?\/\//i.test(v) || v.startsWith("data:")) return v;

  // 윈도우 경로 보정
  v = v.replace(/\\/g, "/");

  // 이미 /artifacts/ 로 시작하는 경우
  if (v.startsWith("/artifacts/")) return `${API_ORIGIN}${v}`;

  // 그냥 /로 시작하면 (프록시로 넘기는 구조면) 그대로 사용
  if (v.startsWith("/")) return v;

  // 중간에 artifacts/ 가 포함된 경우
  const idx = v.toLowerCase().indexOf("artifacts/");
  if (idx >= 0) {
    const sub = v.slice(idx + "artifacts/".length);
    return `${API_ORIGIN}/artifacts/${encodeURI(sub)}`;
  }

  // 그 외: 상대 경로(screenshots/...) → /artifacts/screenshots/... 으로 매핑
  const cleaned = v.replace(/^(\.\/|\/)+/, "");
  return `${API_ORIGIN}/artifacts/${encodeURI(cleaned)}`;
}
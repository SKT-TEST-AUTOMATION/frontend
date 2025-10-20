// 브라우저에서 안전하게 파일을 다운로드하는 유틸.

/**
 * URL에서 Blob을 받아서 파일로 저장 (권장)
 * @param {string} url 다운로드 경로 (동일 출처여야 함. 교차 출처는 CORS 필요)
 * @param {string} [filename] 저장 파일명 (없으면 URL에서 추론)
 * @param {RequestInit} [fetchOptions] 인증 헤더 등 추가 가능
 */
export async function downloadFile(url, filename, fetchOptions = {}) {
  const res = await fetch(url, fetchOptions);
  if (!res.ok) throw new Error(`다운로드 실패: ${res.status}`);

  // 파일명 추출 (Content-Disposition 우선)
  const cd = res.headers.get("Content-Disposition") || "";
  const nameFromHeader = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(cd)?.[1] ||
                         /filename="?([^";]+)"?/i.exec(cd)?.[1];
  const inferred = filename || nameFromHeader || url.split("/").pop() || "download";

  const blob = await res.blob();
  if (!blob || blob.size === 0) {
    throw new Error("서버에서 빈 파일이 반환되었습니다.");
  }

  // 콘텐츠 타입 기반 확장자 보정
  const ct = (res.headers.get("Content-Type") || "").toLowerCase();
  let finalName = inferred;
  const hasExt = /\.[a-z0-9]{2,5}$/i.test(finalName);
  if (!hasExt) {
    if (ct.includes("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") || finalName === "excel") {
      finalName = `${finalName}.xlsx`;
    }
  }

  saveBlob(blob, finalName);
}

/** 임의의 Blob을 파일로 저장 */
export function saveBlob(blob, filename = "download") {
  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** data URL 문자열을 파일로 저장 */
export function downloadDataURL(dataURL, filename = "download") {
  const a = document.createElement("a");
  a.href = dataURL;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

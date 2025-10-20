// 간단하고 안전한 디바운스 훅. value가 바뀔 때마다 delay 이후에 갱신된 값을 반환합니다.
// 사용 예: const debounced = useDebounce(search, 400)

import { useEffect, useState } from "react";

export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), Math.max(0, delay || 0));
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
}
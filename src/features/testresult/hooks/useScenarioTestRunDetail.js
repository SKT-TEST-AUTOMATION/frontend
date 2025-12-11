import { useEffect, useState } from 'react';
import { getScenarioTestDetail } from '../../../services/testAPI.js';
import { toErrorMessage } from '../../../services/axios.js';

/**
 * 단일 실행(run) 상세 데이터를 가져오는 훅
 * - 백엔드에서 ScenarioTestRunDetailDto 하나가 내려온다고 가정
 *   {
 *     id,
 *     scenarioTest,
 *     runResult,
 *     deviceUdid,
 *     deviceName,
 *     deviceOs,
 *     startTime,
 *     endTime,
 *     errorMessage,
 *     resultLog,
 *     runTriggerType,
 *     testCaseResults: ScenarioTestCaseResultDto[]
 *   }
 */
export function useScenarioTestRunDetail(scenarioTestRunId) {
  const [run, setRun] = useState(null);
  const [testCases, setTestCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!scenarioTestRunId) return;

    let canceled = false;

    async function fetchDetail() {
      setLoading(true);
      setError("");

      try {
        const data = await getScenarioTestDetail(scenarioTestRunId);
        if (canceled) return;

        console.log(data);
        // DTO 전체를 run으로, testCaseResults를 testCases에 저장
        setRun(data ?? null);
        setTestCases(data?.testCaseResults ?? []);
      } catch (e) {
        if (canceled) return;
        setError(toErrorMessage(e));
      } finally {
        if (!canceled) {
          setLoading(false);
        }
      }
    }

    fetchDetail();

    return () => {
      canceled = true;
    };
  }, [scenarioTestRunId]);

  return { run, testCases, setTestCases, loading, error };
}


export const STEP_HEADERS = [
  "no",
  "name",
  "mandatory",
  "skip_on_error",
  "sleep",
  "visible_if",
  "visible_if_type",
  "action",
  "by",
  "value",
  "input_text",
  "true_jump_no",
  "false_jump_no",
  "memo"
];

export const STEP_HEADERS_LABELS = {
    "no" : "no",
    "name" : "이름",
    "mandatory" : "필수",
    "skip_on_error" : "에러 시 스킵",
    "sleep" : "실행 전 대기(초)",
    "visible_if_type" : "존재 확인 타입",
    "visible_if" : "존재 확인 대상",
    "action" : "액션",
    "by" : "액션 대상 타입",
    "value" : "액션 대상",
    "input_text" : "input text",
    "true_jump_no" : "성공 시 이동할 스텝",
    "false_jump_no" :  "실패 시 이동할 스텝",
    "memo" : "메모"
};

export const YN_OPTIONS = [
  { value: "Y", label: "Y" },
  { value: "N", label: "N" },
];

export const ACTION_OPTIONS = [
  "app_close",
  "app_start",
  "click",
  "tap",
  "input",
  "image",
  "swipe(상)",
  "swipe(하)",
  "swipe(좌)",
  "swipe(우)",
  "back"
];

export const ACTION_OPTIONS_LABELS = {
  "app_close" : "앱 종료",
  "app_start" : "앱 실행",
  "click": "요소 클릭",
  "tap": "좌표 기반 클릭",
  "input": "텍스트 입력",
  "key": "키보드 입력",
  "image": "이미지 클릭",
  "swipe(상)" : "위로 스와이프해서 찾기",
  "swipe(하)" : "아래로 스와이프해서 찾기",
  "swipe(좌)" : "왼쪽으로 스와이프해서 찾기",
  "swipe(우)" : "오른쪽으로 스와이프해서 찾기",
  "back" : "(안드로이드) 뒤로 가기"
};

export const BY_OPTIONS = [
  "XPATH",
  "ID",
  "ACCESSIBILITY_ID",
  "CLASS_NAME",
  "ANDROID_UIAUTOMATOR",
  "COORD",
  "ABS"
];

export const VERIFICATION_BY_OPTIONS = [
  "ID",
  "ACCESSIBILITY_ID",
  "CLASS_NAME",
  "ANDROID_UIAUTOMATOR",
];


export const STEP_FIELD_CONFIG = {
  no: { type: "readonly", colSpan: 1 },
  name: { type: "text", colSpan: 1 },
  mandatory: { type: "yn-toggle", options: YN_OPTIONS, colSpan: 1 },
  skip_on_error: { type: "yn-toggle", options: YN_OPTIONS, colSpan: 1 },
  sleep: { type: "number", colSpan: 1 },
  visible_if: { type: "text", colSpan: 2 },
  visible_if_type: {
    type: "select",
    options: VERIFICATION_BY_OPTIONS.map(v => ({ value: v, label: v })),
    colSpan: 1
  },
  action: {
    type: "select",
    options: ACTION_OPTIONS.map(v => ({ value: v, label: v })),
    colSpan: 1,
  },
  by: {
    type: "select",
    options: BY_OPTIONS.map(v => ({ value: v, label: v })),
    colSpan: 1,
  },
  input_text: { type: "text", colSpan: 2 },
  value: { type: "text", colSpan: 2 },
  true_jump_no: { type: "number", colSpan: 1 },
  false_jump_no: { type: "number", colSpan: 1 },
  memo: { type: "textarea", colSpan: 3 },
};
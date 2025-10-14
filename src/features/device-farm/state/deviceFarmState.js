import { atom } from "recoil";

export const deviceFarmState = atom({
  key: "deviceFarmState",
  default: {
    loading: true,
    error: null,
    lastUpdatedAt: null,
    items : [], // 장치들
  }
});
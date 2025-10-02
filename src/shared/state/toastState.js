import { atom } from "recoil";

export const toastState = atom({
  key: "toastState",
  default: null, 
  // { type: "success"|"info"|"warning"|"error", message: string, createdAt: number }
});
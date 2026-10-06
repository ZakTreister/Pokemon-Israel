import type { RequestError } from "../types/api";
export function requestError(error: unknown) {
  const value = error as RequestError;
  return (
    value?.response?.data?.message ||
    value?.message ||
    "הפעולה נכשלה. נא לנסות שוב"
  );
}

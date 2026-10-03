import { useSyncExternalStore } from "react";
import {
  ACTIVITY_OPS_KEY,
  restoreActivityOps,
  type ActivityOpsState,
} from "./activityOpsCore";

/**
 * 活动运营状态（现场核验 问题记录 工作人员 活动资料 通知已读 归档）
 * 规则见 activityOpsCore.ts，与 Vue3 工程 src/stores/activityOps.ts 一致。
 */
let state: ActivityOpsState | null = null;
const listeners = new Set<() => void>();

function load(): ActivityOpsState {
  try {
    return restoreActivityOps(window.localStorage.getItem(ACTIVITY_OPS_KEY));
  } catch {
    return restoreActivityOps(null);
  }
}
const snapshot = () => (state ??= load());

export function getActivityOps() {
  return snapshot();
}

export function commitActivityOps(next: ActivityOpsState) {
  state = next;
  try {
    window.localStorage.setItem(ACTIVITY_OPS_KEY, JSON.stringify(next));
  } catch {
    /* 忽略存储失败 */
  }
  listeners.forEach(listener => listener());
}

/** 用纯函数更新状态：updateOps(s => addIssue(s, input, actor)) */
export function updateOps(fn: (current: ActivityOpsState) => ActivityOpsState) {
  commitActivityOps(fn(snapshot()));
}

export function useActivityOps() {
  return useSyncExternalStore(
    listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    snapshot,
    snapshot
  );
}

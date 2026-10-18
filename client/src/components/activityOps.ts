import { useSyncExternalStore } from "react";
import {
  ACTIVITY_OPS_KEY,
  createEmptyActivityOps,
  restoreActivityOps,
  type ActivityOpsState,
} from "./activityOpsCore";
import { assertPrototypeWriteAllowed, isApiDataMode } from "../lib/api";
import {
  normalizeEventId,
  PRIMARY_EVENT_ID,
  storageKeyForEvent,
} from "./eventScope";

/** Activity operations frontend-store state. Scope separation is not server authorization. */
const states = new Map<string, ActivityOpsState>();
const listeners = new Set<() => void>();
const EMPTY_API_OPS = createEmptyActivityOps();

function fallback(eventId?: string) {
  if (isApiDataMode()) return EMPTY_API_OPS;
  return normalizeEventId(eventId) === PRIMARY_EVENT_ID
    ? restoreActivityOps(null)
    : createEmptyActivityOps();
}

function load(eventId?: string): ActivityOpsState {
  const scope = normalizeEventId(eventId);
  if (isApiDataMode()) return EMPTY_API_OPS;
  if (typeof window === "undefined") return fallback(scope);
  try {
    return restoreActivityOps(
      window.localStorage.getItem(storageKeyForEvent(ACTIVITY_OPS_KEY, scope)),
      scope
    );
  } catch {
    return fallback(scope);
  }
}

function snapshot(eventId?: string) {
  const scope = normalizeEventId(eventId);
  if (isApiDataMode()) return EMPTY_API_OPS;
  const existing = states.get(scope);
  if (existing) return existing;
  const loaded = load(scope);
  states.set(scope, loaded);
  return loaded;
}

export function getActivityOps(eventId?: string) {
  return snapshot(eventId);
}

export function commitActivityOps(next: ActivityOpsState, eventId?: string) {
  assertPrototypeWriteAllowed("保存活动运营状态");
  const scope = normalizeEventId(eventId);
  states.set(scope, next);
  try {
    window.localStorage.setItem(
      storageKeyForEvent(ACTIVITY_OPS_KEY, scope),
      JSON.stringify(next)
    );
  } catch {
    /* A failed local write never confirms a business operation. */
  }
  listeners.forEach(listener => listener());
}

export function updateOps(
  fn: (current: ActivityOpsState) => ActivityOpsState,
  eventId?: string
) {
  const scope = normalizeEventId(eventId);
  commitActivityOps(fn(snapshot(scope)), scope);
}

export function useActivityOps(eventId?: string) {
  const scope = normalizeEventId(eventId);
  return useSyncExternalStore(
    listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => snapshot(scope),
    () => fallback(scope)
  );
}

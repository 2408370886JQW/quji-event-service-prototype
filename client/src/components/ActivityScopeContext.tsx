import { createContext, useContext, type ReactNode } from "react";

type ActivityScope = { eventId: string };

const ActivityScopeContext = createContext<ActivityScope | null>(null);

export function ActivityScopeProvider({
  eventId,
  children,
}: ActivityScope & { children: ReactNode }) {
  return (
    <ActivityScopeContext.Provider value={{ eventId }}>
      {children}
    </ActivityScopeContext.Provider>
  );
}

/** The active event is required: legacy primary-event defaults are not UI scope. */
export function useActivityEventId(): string {
  const scope = useContext(ActivityScopeContext);
  if (!scope) throw new Error("活动范围未设置");
  return scope.eventId;
}

/**
 * Activity scope helpers for the prototype's frontend-store modules.
 * These keys provide client-side segregation only; they are not server authorization.
 */
export const PRIMARY_EVENT_ID = "EVT-2026-0628";

export function normalizeEventId(eventId?: string) {
  return eventId?.trim() || PRIMARY_EVENT_ID;
}

/**
 * The historic key remains the documented primary-event key. Every other
 * activity receives an explicit sibling key so unknown legacy data cannot be
 * reassigned to a newly selected event.
 */
export function storageKeyForEvent(baseKey: string, eventId?: string) {
  const scope = normalizeEventId(eventId);
  return scope === PRIMARY_EVENT_ID
    ? baseKey
    : `${baseKey}:event:${encodeURIComponent(scope)}`;
}

export function isRecordInEvent(
  record: { eventId?: string },
  eventId?: string,
  allowPrimaryLegacy = true
) {
  const scope = normalizeEventId(eventId);
  if (record.eventId) return record.eventId === scope;
  return allowPrimaryLegacy && scope === PRIMARY_EVENT_ID;
}

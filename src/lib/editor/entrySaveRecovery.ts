export type EntrySaveRequest = {
  url: string;
  method: "POST" | "PUT";
};

export function parseRecoveredEntryId(value: string | null): number | null {
  if (!value) return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function resolveEntrySaveRequest(
  createdId: string | number | null,
  createEndpoint: string,
  updateEndpoint: (id: string | number) => string,
): EntrySaveRequest {
  if (createdId === null) {
    return { url: createEndpoint, method: "POST" };
  }
  return { url: updateEndpoint(createdId), method: "PUT" };
}

export type UserID = number & { _tag: "user_id" }

export function userId(id: string | number) {
  return typeof id === "number" ? (id as UserID) : (parseInt(id) as UserID)
}

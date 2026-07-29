/** Mirrors `ProfileResponse` in profile-service. */
export interface Profile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  /** First and last name joined, computed server-side. */
  fullName: string;
  birthDate: string;
  /** Completed years, computed server-side on every read. */
  age: number;
  alias: string;
  bio?: string;
  avatarUrl?: string;
  createdAt: string;
}

/** Mirrors `UpsertProfileRequest`. No userId: the owner comes from the token. */
export interface UpsertProfileRequest {
  firstName: string;
  lastName: string;
  birthDate: string;
  alias: string;
  bio?: string;
}

import { Hooks } from "../core/file";
import { Membership } from "./membership"
import { Stack } from "./stack"

export type BatchStackCreateOptions = Hooks & {
  processingCountHook?: (count: number) => void,
  onStackCreated?: (item: Stack) => Promise<void>
};

export interface BatchStackCreateResponse {
  data: Array<{ stackId: string, transactionId: string, object: Stack, uri: string }>
  errors: Array<{ name?: string, message: string, error: Error }>
  cancelled: number
}

export interface BatchMembershipInviteResponse {
  data: Array<{ membershipId: string, transactionId: string, object?: Membership }>
  errors: Array<{ email: string, message: string, error: Error }>
}

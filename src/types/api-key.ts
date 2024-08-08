import { apiKeyStatus } from "../constants"

export type ApiKey = {
  key: string,
  address: string,
  expiresAt: number,
  status: apiKeyStatus
}
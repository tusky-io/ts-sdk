import { apiKeyStatus } from "../constants"

export class ApiKey {
  key: string
  address: string
  expiresAt: number
  createdAt: number
  updatedAt: number
  status: apiKeyStatus

  constructor(json: any) {
      this.key = json.key
      this.address = json.address
      this.expiresAt = json.expiresAt
      this.createdAt = json.createdAt
      this.updatedAt = json.updatedAt
      this.status = json.status
  }
}
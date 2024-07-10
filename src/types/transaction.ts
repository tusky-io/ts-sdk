import { actions, functions, objects } from "../constants"

export interface Transaction {
  id: string,
  function: functions,
  postedAt: string,
  address: string,
  publicSigningKey: string,
  vaultId: string,
  actionRef: actions,
  groupRef: string,
  objectId: string,
  type: objects,
  status: string
}
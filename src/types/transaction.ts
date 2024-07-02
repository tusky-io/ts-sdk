import { actionRefs, functions, objectType } from "../constants"

export interface Transaction {
  id: string,
  function: functions,
  postedAt: string,
  address: string,
  publicSigningKey: string,
  vaultId: string,
  actionRef: actionRefs,
  groupRef: string,
  objectId: string,
  objectType: objectType,
  status: string
}
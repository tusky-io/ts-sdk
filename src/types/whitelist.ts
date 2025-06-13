import { RoleType } from ".";

export class Whitelist {
  id: string;
  capId: string;
  tgaId: string;
  token: string;
  vaultId: string;
  memberRole: RoleType;
  capacity: number;

  constructor(json: any) {
    this.id = json.id;
    this.capId = json.capId;
    this.tgaId = json.tgaId;
    this.token = json.token;
    this.vaultId = json.vaultId;
    this.memberRole = json.memberRole;
    this.capacity = json.capacity;
  }
}

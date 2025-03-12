import { RoleType } from ".";

export class Whitelist {
  id: string;
  capId: string;
  token: string;
  memberRole: RoleType;
  capacity: number;

  constructor(json: any) {
    this.id = json.id;
    this.capId = json.capId;
    this.token = json.token;
    this.memberRole = json.memberRole;
    this.capacity = json.capacity;
  }
}

export enum SUI_COINS {
  SUI = "0x2::sui::SUI",
  USDC = "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC",
  WAL = "0x8190b041122eb492bf63cb464476bd68c6b7e570a4079645a8b28732b6197a82::wal::WAL",
}

export enum SUI_TYPE {
  COIN = "0x2::coin::Coin",
}

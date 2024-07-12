import { Encryptable, encrypted } from "@akord/crypto";
import { functions } from "../constants";
import { Membership } from "./membership";
import { Folder } from "./folder";
import { File } from "./file-version";
import { BadRequest } from "../errors/bad-request";

export interface Contract {
  state: ContractState
}

export class ContractState extends Encryptable {
  @encrypted() name: string;
  id: string;
  owner: string;
  status: string;
  createdAt: string; // number
  updatedAt: string;  // number
  public: boolean;
  admin?: string;
  data: string[];
  memberships: Array<Membership>;
  folders: Array<Folder>;
  files: Array<File>;
}

export class Tag {
  name: string;
  value: string;

  /**
   * @param name
   * @param value
   * @returns 
   */
  constructor(name: string, value: any) {
    if (!name) {
      throw new BadRequest("Missing tag name.");
    }
    if (!value) {
      throw new BadRequest("Missing tag value for: " + name);
    }
    return {
      name: name,
      value: value.toString()
    }
  }
}

export type Tags = Tag[];

export interface ContractInput {
  function: functions,
  data?: DataInput,
  parentId?: string,
  address?: string,
  role?: string // type,
  members?: MembershipInput[];
}

export type MembershipInput = {
  id: string,
  address: string,
  role: string,
  data?: string
}

export type DataInput =
  { vault: string, membership: string } // vault:init
  | { id: string, value: string }[] // membership:revoke
  | string // all other transactions
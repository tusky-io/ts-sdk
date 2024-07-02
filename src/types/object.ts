
import { NodeLike, NodeType } from "./node";
import { Vault } from "./vault";
import { Membership } from "./membership";

export type Object = NodeLike | Vault | Membership;

export type ObjectType = NodeType | "Vault" | "Membership" | "Profile";
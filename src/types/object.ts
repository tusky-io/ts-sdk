
import { Vault } from "./vault";
import { Membership } from "./membership";
import { Folder } from "./folder";
import { File } from "./file-version";

export type Object = Folder | File | Vault | Membership;

export type ObjectType = "File" | "Folder" | "Vault" | "Membership";
export class Collection {
  name: string;
  description: string;
  creator: string;
  imageUrl: string;
  thumbnailUrl: string;
  projectUrl: string;
  link: string;
  recipient: string;

  id: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  folderId?: string; // reference to folder source

  vaultId: string;
  parentId?: string;

  constructor(collection: any) {
    this.id = collection.id;
    this.owner = collection.owner;
    this.recipient = collection.recipient;
    this.createdAt = collection.createdAt;
    this.updatedAt = collection.updatedAt;
    this.name = collection.name;
    this.description = collection.description;
    this.imageUrl = collection.imageUrl;
    this.thumbnailUrl = collection.thumbnailUrl;
    this.projectUrl = collection.projectUrl;
    this.link = collection.link;
    this.creator = collection.creator;
    this.status = collection.status;
    this.vaultId = collection.vaultId;
    this.parentId = collection.parentId;
  }
}

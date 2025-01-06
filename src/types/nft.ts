export class NFT {
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
  fileId?: string; // reference to file object

  objectId: string; // NFT reference on chain - object
  txId: string; // NFT reference on chain - transaction

  vaultId: string;
  parentId?: string;

  constructor(nft: any) {
    this.id = nft.id;
    this.owner = nft.owner;
    this.recipient = nft.recipient;
    this.createdAt = nft.createdAt;
    this.updatedAt = nft.updatedAt;
    this.fileId = nft.fileId;
    this.name = nft.name;
    this.description = nft.description;
    this.imageUrl = nft.imageUrl;
    this.thumbnailUrl = nft.thumbnailUrl;
    this.projectUrl = nft.projectUrl;
    this.link = nft.link;
    this.creator = nft.creator;
    this.status = nft.status;
    this.vaultId = nft.vaultId;
    this.parentId = nft.parentId;
    this.objectId = nft.objectId;
    this.txId = nft.txId;
  }
}

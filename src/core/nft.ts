import { Service } from "./service/service";
import { ClientConfig } from "../config";
import { File, Paginated } from "../types";
import { NFT } from "../types/nft";
import { Collection } from "../types/collection";
import { paginate } from "./common";
import { ListOptions } from "../types/query-options";

class NFTModule {
  protected service: Service;

  constructor(config?: ClientConfig) {
    this.service = new Service(config);
  }

  /**
   * Mint a single NFT from file
   * @param  {NFTMetadata} metadata
   * @returns {Promise<NFT>} Promise with the minted NFT
   * @example
   * const nft = await tusky.nft.mint({
   *   fileId: "ac8a7506-5317-434a-b38d-10c5bcbc91c8",
   *   recipient: "0x17bb4b18b04b48fb9a57d1ee774ec2d6bad212c48b5264780e5eb65bb81c560b",
   *   name: "Image #1",
   *   description: "Description for the NFT",
   *   creator: "Name of the NFT creator",
   *   projectUrl: "Url for the project website",
   * });
   */
  public async mint(metadata: NFTMetadata): Promise<NFT> {
    return this.service.api.mintNft(metadata);
  }

  /**
   * Mint NFT collection from folder content
   * @param  {CollectionMetadata} metadata
   * @returns {Promise<Collection>} Promise with the minted NFT
   * @example
   * const collection = await tusky.nft.mintCollection({
   *   folderId: "ac8a7506-5317-434a-b38d-10c5bcbc91c8",
   *   recipient: "0x17bb4b18b04b48fb9a57d1ee774ec2d6bad212c48b5264780e5eb65bb81c560b",
   *   description: "Common description for all NFTs within the collection",
   *   creator: "Name of the NFT creator",
   *   projectUrl: "Url for the project website",
   *});
   */
  public async mintCollection(
    metadata: CollectionMetadata,
  ): Promise<Collection> {
    return this.service.api.mintCollection(metadata);
  }

  public async get(id: string): Promise<NFT> {
    return this.service.api.getNft(id);
  }

  public async getCollection(id: string): Promise<Collection> {
    return this.service.api.getCollection(id);
  }

  /**
   * @param {ListOptions} options
   * @returns {Promise<Array<NFT>>} Promise with paginated user nfts
   */
  public async list(options: ListOptions = {}): Promise<Paginated<NFT>> {
    return this.service.api.getNfts(options);
  }

  /**
   * @param {ListOptions} options
   * @returns {Promise<Array<NFT>>} Promise with all user nfts
   */
  public async listAll(options: ListOptions = {}): Promise<Array<NFT>> {
    const list = async (listOptions: ListOptions) => {
      return this.list(listOptions);
    };
    return paginate<NFT>(list, options);
  }

  public async listCollections(): Promise<Paginated<Collection>> {
    return this.service.api.getCollections();
  }

  /**
   * @returns {Promise<Array<Collection>>} Promise with all user nft collections
   */
  public async listAllCollections(): Promise<Array<Collection>> {
    const list = async () => {
      return this.listCollections();
    };
    return paginate<Collection>(list, {});
  }
}

export { NFTModule };

// NFT metadata follows Sui Object Display standard:
// https://docs.sui.io/standards/display
export type NFTMetadata = {
  recipient: string; // Address for the NFT owner
  name?: string; // A name for the object. The name is displayed when users view the object.
  description: string; // A description for the object. The description is displayed when users view the object.
  fileId?: string; //
  projectUrl?: string; // A link to a website associated with the object or creator.
  link?: string; //  A link to the object to use in an application.
  thumbnailUrl?: string; // A URL to a smaller image to use in wallets, explorers, and other products as a preview.
  creator?: string; // A string that indicates the object creator.
};

export type CollectionMetadata = {
  recipient: string; // Address for the nfts owner
  description: string; // A common description for all nfts
  folderId: string; // a collection will be minted with the content of the given folder
  nftMetadata?: NFTMetadata[];
  projectUrl?: string; // A link to a website associated with the object or creator
  link?: string; //  A link to the object to use in an application
  thumbnailUrl?: string; // A common thumbnail for all nfts
  thumbnail?: File;
  creator?: string; // A common creator for all nfts
};

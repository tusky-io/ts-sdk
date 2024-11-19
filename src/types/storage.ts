import { Folder } from "./folder";

export class Storage {
  owner: string;
  host: string;
  storageAvailable: number;
  storageTotal: number;
  audio: number;
  documents: number;
  other: number;
  photos: number;
  video: number;
  trash: Folder;
  createdAt: string;
  updatedAt: string;
  refreshedAt: string;

  constructor(json: any) {
    this.owner = json.owner;
    this.host = json.host;
    this.storageAvailable = json.storageAvailable;
    this.storageTotal = json.storageTotal;
    this.audio = json.audio;
    this.documents = json.documents;
    this.other = json.other;
    this.photos = json.photos;
    this.video = json.video;
    this.trash = json.trash ? new Folder(json.trash) : undefined;
    this.createdAt = json.createdAt;
    this.updatedAt = json.updatedAt;
    this.refreshedAt = json.refreshedAt;
  }
}

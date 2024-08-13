export class Storage {
  owner: string
  host: string
  storageAvailable: number
  storageTotal: number
  audio: number
  documents: number
  other: number
  photos: number
  video: number
  trash: number
  createdAt: number
  updatedAt: number
  refreshedAt: number

  constructor(json: any) {
    this.owner = json.owner
    this.host = json.host
    this.storageAvailable = json.storageAvailable
    this.storageTotal = json.storageTotal
    this.audio = json.audio
    this.documents = json.documents
    this.other = json.other
    this.photos = json.photos
    this.video = json.video
    this.trash = json.trash
    this.createdAt = json.createdAt
    this.updatedAt = json.updatedAt
    this.refreshedAt = json.refreshedAt
  }
}

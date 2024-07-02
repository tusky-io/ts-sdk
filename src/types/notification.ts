export class Notification  {
  id: string
  event: string
  channels: string[]
  objectId: string
  address: string
  createdAt: string

  constructor(proto: any) {
    this.id = proto.id
    this.event = proto.event
    this.channels = proto.channels
    this.objectId = proto.objectId
    this.address = proto.toAddress
    this.createdAt = proto.createdAt
  }
}

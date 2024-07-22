export class Storage {
    storageAvailable: number
    storageTotal: number

    constructor(json: any) {
        this.storageAvailable = json.storageAvailable
        this.storageTotal = json.storageTotal
    }
}

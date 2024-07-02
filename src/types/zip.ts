import { Hooks } from "../core/file"

export type ZipUploadOptions = Hooks & {
    parentId?: string,
    skipHidden?: boolean,
    chunkSize?: number,
    chunksConcurrency?: number,
}

export type ZipUploadApiOptions = Hooks & {
    parentId?: string,
    skipHidden?: boolean, 
    multipartToken?: string,
    partNumber?: number   
    multipartInit?: boolean   
    multipartComplete?: boolean,
}

export type ZipLog = {
    id: string,
    uploadedAt: string
}
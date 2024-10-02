import { FileModule } from "../file";
import { createWriteStream } from "fs";
import { Readable } from "stream";

class NodeFileModule extends FileModule {

    public async download(id: string, options: FileDownloadOptions = { path: '.' }): Promise<string> {
        const stream = await this.stream(id);
        return new Promise((resolve, reject) =>
        Readable.from(stream).pipe(createWriteStream(options.path))
            .on('error', error => reject(error))
            .on('finish', () => resolve(options.path))
        );
    }     
}

export type FileDownloadOptions = {
    path?: string
}
  
export { NodeFileModule as FileModule };

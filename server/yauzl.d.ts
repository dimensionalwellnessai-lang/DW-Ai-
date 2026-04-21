declare module "yauzl" {
  import { Readable } from "stream";
  export interface Entry {
    fileName: string;
    uncompressedSize: number;
  }
  export interface ZipFile {
    readEntry(): void;
    openReadStream(entry: Entry, cb: (err: Error | null, stream?: Readable) => void): void;
    on(event: "entry", cb: (entry: Entry) => void): this;
    on(event: "end" | "close", cb: () => void): this;
    on(event: "error", cb: (err: Error) => void): this;
  }
  export function fromBuffer(
    buffer: Buffer,
    options: { lazyEntries?: boolean },
    cb: (err: Error | null, zipfile?: ZipFile) => void,
  ): void;
  const _default: { fromBuffer: typeof fromBuffer };
  export default _default;
}

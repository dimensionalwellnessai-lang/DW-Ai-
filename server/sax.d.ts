declare module "sax" {
  export interface SaxParser {
    onopentag: ((node: { name: string; attributes: Record<string, string> }) => void) | null;
    onclosetag: ((tag: string) => void) | null;
    ontext: ((text: string) => void) | null;
    onerror: ((err: Error) => void) | null;
    onend: (() => void) | null;
    write(chunk: string): SaxParser;
    close(): SaxParser;
    resume(): SaxParser;
  }
  export function parser(strict?: boolean, opts?: { lowercase?: boolean; trim?: boolean }): SaxParser;
  const _default: { parser: typeof parser };
  export default _default;
}

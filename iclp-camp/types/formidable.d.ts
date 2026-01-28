declare module "formidable" {
  import { IncomingMessage } from "http";

  export type Fields = Record<string, any>;

  export interface File {
    filepath: string;
    originalFilename?: string | null;
    mimetype?: string | null;
    size?: number;
  }

  export interface Files {
    [key: string]: File | File[];
  }

  export class IncomingForm {
    constructor(opts?: any);
    parse(
      req: IncomingMessage,
      cb: (err: any, fields: Fields, files: Files) => void
    ): void;
  }

  export default function formidable(opts?: any): IncomingForm;
}

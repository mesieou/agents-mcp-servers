declare module 'dotenv' {
  export interface DotenvConfigOptions {
    path?: string;
    encoding?: string;
    debug?: boolean;
  }

  export interface DotenvConfigOutput {
    parsed?: { [key: string]: string };
    error?: Error;
  }

  export function config(options?: DotenvConfigOptions): DotenvConfigOutput;
}

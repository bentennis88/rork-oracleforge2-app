declare module '@babel/standalone' {
  interface TransformOptions {
    presets?: string[];
    plugins?: string[];
    filename?: string;
    sourceType?: 'script' | 'module' | 'unambiguous';
  }

  interface TransformResult {
    code: string | null;
    map: object | null;
    ast: object | null;
  }

  export function transform(code: string, options?: TransformOptions): TransformResult;
  export function transformFromAst(ast: object, code: string, options?: TransformOptions): TransformResult;
  export function registerPlugin(name: string, plugin: unknown): void;
  export function registerPreset(name: string, preset: unknown): void;
  export const availablePlugins: Record<string, unknown>;
  export const availablePresets: Record<string, unknown>;
}

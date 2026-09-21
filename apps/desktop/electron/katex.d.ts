declare module 'katex' {
  const katex: {
    renderToString(latex: string, options?: {
      displayMode?: boolean;
      throwOnError?: boolean;
      strict?: boolean;
      trust?: boolean;
      output?: string;
    }): string;
  };
  export default katex;
}

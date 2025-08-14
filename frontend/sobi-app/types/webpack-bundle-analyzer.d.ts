declare module 'webpack-bundle-analyzer' {
  export class BundleAnalyzerPlugin {
    constructor(options?: {
      analyzerMode?: 'server' | 'static' | 'disabled';
      analyzerHost?: string;
      analyzerPort?: number;
      reportFilename?: string;
      defaultSizes?: 'parsed' | 'gzipped' | 'stat';
      openAnalyzer?: boolean;
      generateStatsFile?: boolean;
      statsFilename?: string;
      statsOptions?: any;
      excludeAssets?: string[] | RegExp[];
      logLevel?: 'info' | 'warn' | 'error' | 'silent';
    });
  }
}

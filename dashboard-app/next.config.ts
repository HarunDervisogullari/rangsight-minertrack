// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone', // Enable standalone output for Docker
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack(config) {
    console.log('🛠️  Custom webpack config for SVGs loaded')
    // ① locate Next's "asset/resource" rule group --------------------------
    const assetRule = config.module.rules.find(
      (rule: any) => Array.isArray(rule.oneOf)
    );

    if (!assetRule) {
      console.warn('⚠️  Could not find the default oneOf rules – SVG loader not patched');
      return config;
    }

    // ② inside that group, find the loader that handles images & svg -------
    const imageRule = assetRule.oneOf.find(
      (r: any) => r.test?.test?.('.svg')
    );
    if (imageRule) {
      imageRule.exclude = /\.svg$/i;            // stop it grabbing SVGs
    }

    // ③ inject SVGR at the *front* of the same oneOf array -----------------
    assetRule.oneOf.unshift({
      test: /\.svg$/i,
      issuer: { and: [/\.[jt]sx?$/] },          // only from JS/TS files
      use: [{ loader: '@svgr/webpack', options: { titleProp: true, ref: true } }],
    });

    // ④ Konva SSR fallback --------------------------------------------------
    config.resolve.fallback = { ...config.resolve.fallback, canvas: false };

    return config;
  },

  // ⑤ dev mode (turbopack) --------------------------------------------------
  turbopack: {
    rules: { '*.svg': { loaders: ['@svgr/webpack'], as: '*.js' } },
  },
};

export default nextConfig;

const PRIVATE_STORES = ["kyc-docs"];

/**
 * Returns the public CDN URL for an asset in a public Netlify Blobs store.
 *
 * Throws for private stores (e.g. "kyc-docs") — these must be served via
 * a signed server route (/api/blobs/[store]/[key]), never as direct URLs.
 *
 * TODO: replace the placeholder CDN host with the real Netlify Blobs CDN
 * base URL after the first Netlify deploy. The real host is available in the
 * Netlify dashboard under Site → Storage → Blobs.
 */
export function getPublicAssetUrl(asset: { store: string; key: string }): string {
  if (PRIVATE_STORES.includes(asset.store)) {
    throw new Error(
      `Store "${asset.store}" is private. Serve it via /api/blobs/${asset.store}/${asset.key} instead of a direct URL.`,
    );
  }
  // TODO: replace with real CDN host after first Netlify deploy
  return `https://example-blobs.netlify.app/${asset.store}/${asset.key}`;
}

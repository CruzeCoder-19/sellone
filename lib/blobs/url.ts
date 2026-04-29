const PRIVATE_STORES = ["kyc-docs"];

/**
 * Returns the URL to serve an asset through the blob API route.
 *
 * All blobs are served via /api/blobs/{store}/{key}. Public stores get a
 * long-lived immutable Cache-Control header; private stores require auth.
 * This relative path works in both dev (/tmp/blobs fallback) and production
 * (Netlify Blobs) without any hostname configuration needed.
 */
export function getPublicAssetUrl(asset: { store: string; key: string }): string {
  if (PRIVATE_STORES.includes(asset.store)) {
    throw new Error(
      `Store "${asset.store}" is private. Use /api/blobs/${asset.store}/${asset.key} and ensure the caller is authenticated.`,
    );
  }
  return `/api/blobs/${asset.store}/${asset.key}`;
}

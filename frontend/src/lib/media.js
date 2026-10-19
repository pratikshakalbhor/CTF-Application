const IPFS_GATEWAY = import.meta.env.VITE_IPFS_GATEWAY || "https://ipfs.io/ipfs/";
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|avif|bmp)(\?.*)?$/i;

export function ipfsToHttp(uri) {
  if (!uri) return uri;
  if (uri.startsWith("ipfs://ipfs/")) return IPFS_GATEWAY + uri.slice(12);
  if (uri.startsWith("ipfs://")) return IPFS_GATEWAY + uri.slice(7);
  return uri;
}

export function placeholderImage(label = "NFT") {
  const safe = String(label).replace(/[<>&]/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320"><rect width="100%" height="100%" fill="#101a36"/><rect x="8" y="8" width="304" height="304" rx="16" fill="none" stroke="#25355e" stroke-width="2"/><text x="50%" y="50%" fill="#5c6f95" font-family="monospace" font-size="24" text-anchor="middle" dominant-baseline="middle">${safe}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

async function fetchWithTimeout(url, ms = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolve a tokenURI into { name, image, attributes }. Handles direct image
 * URLs/data URIs and JSON metadata (both on-chain-ish http and ipfs://).
 * `attributes` carries the metadata traits (used for the rarity badge).
 */
export async function resolveMetadata(uri, fallbackLabel) {
  const fallback = {
    name: null,
    image: placeholderImage(fallbackLabel),
    attributes: null,
    rawUri: uri,
    isPlaceholder: true,
  };

  if (!uri) return fallback;

  const httpUri = ipfsToHttp(uri);

  if (uri.startsWith("data:") || IMAGE_EXT.test(httpUri)) {
    return {
      name: null,
      image: httpUri,
      attributes: null,
      rawUri: uri,
      isPlaceholder: false,
    };
  }

  try {
    const response = await fetchWithTimeout(httpUri);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    const imageRaw = json.image || json.image_url || json.imageUrl;
    return {
      name: json.name || null,
      image: imageRaw ? ipfsToHttp(imageRaw) : placeholderImage(fallbackLabel),
      attributes: Array.isArray(json.attributes) ? json.attributes : null,
      rawUri: uri,
      isPlaceholder: !imageRaw,
    };
  } catch {
    return fallback;
  }
}

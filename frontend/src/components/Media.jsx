import { placeholderImage } from "../lib/media";

/** Renders the card artwork. Metadata (image/name/rarity) comes from the parent. */
export default function Media({ src, label, loading }) {
  const finalSrc = src || placeholderImage(label);

  return (
    <div className="nft-media">
      <img
        src={finalSrc}
        alt={label}
        loading="lazy"
        onError={(event) => {
          event.currentTarget.src = placeholderImage(label);
        }}
      />
      {loading && <span className="media-loading">loading…</span>}
    </div>
  );
}

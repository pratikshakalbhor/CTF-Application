import { useEffect, useState } from "react";
import { placeholderImage, resolveMetadata } from "../lib/media";

const cache = new Map();

/** Resolve a tokenURI to { image, name, attributes }, cached across mounts. */
export function useMetadata(uri, label) {
  const [state, setState] = useState(
    () =>
      cache.get(uri) || {
        loading: Boolean(uri),
        image: placeholderImage(label),
        name: null,
        attributes: null,
      }
  );

  useEffect(() => {
    let cancelled = false;

    if (!uri) {
      setState({
        loading: false,
        image: placeholderImage(label),
        name: null,
        attributes: null,
      });
      return undefined;
    }
    if (cache.has(uri)) {
      setState(cache.get(uri));
      return undefined;
    }

    setState({
      loading: true,
      image: placeholderImage(label),
      name: null,
      attributes: null,
    });
    resolveMetadata(uri, label).then((resolved) => {
      const value = { loading: false, ...resolved };
      cache.set(uri, value);
      if (!cancelled) setState(value);
    });

    return () => {
      cancelled = true;
    };
  }, [uri, label]);

  return state;
}

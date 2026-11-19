import React, { useEffect, useState } from 'react';
import { Image } from 'react-native';
import { getCachedPhotoUri } from '../../services/photoCache';

const { isLocalPhotoUri } = require('../../services/photoCacheUtils.cjs');

export default function CachedRemoteImage({
  uri,
  loadWhen = true,
  style,
  resizeMode,
  ...rest
}) {
  const [resolvedUri, setResolvedUri] = useState(() =>
    isLocalPhotoUri(uri) ? uri : null
  );

  useEffect(() => {
    let cancelled = false;
    if (!uri) {
      setResolvedUri(null);
      return undefined;
    }
    if (isLocalPhotoUri(uri)) {
      setResolvedUri(uri);
      return undefined;
    }
    if (!loadWhen) {
      setResolvedUri(null);
      return undefined;
    }
    setResolvedUri(null);
    getCachedPhotoUri(uri)
      .then((next) => {
        if (!cancelled) setResolvedUri(next);
      })
      .catch(() => {
        if (!cancelled) setResolvedUri(uri);
      });
    return () => {
      cancelled = true;
    };
  }, [uri, loadWhen]);

  if (!resolvedUri) return null;
  return <Image source={{ uri: resolvedUri }} style={style} resizeMode={resizeMode} {...rest} />;
}

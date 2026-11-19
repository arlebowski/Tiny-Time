import { Image } from 'react-native';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
const { MAX_PHOTO_SIDE, JPEG_QUALITY } = require('./photoCacheUtils.cjs');

function getImageSize(uri) {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      reject
    );
  });
}

function resizeActions(width, height) {
  const maxSide = Math.max(width, height);
  if (!width || !height || maxSide <= MAX_PHOTO_SIDE) return [];
  if (width >= height) return [{ resize: { width: MAX_PHOTO_SIDE } }];
  return [{ resize: { height: MAX_PHOTO_SIDE } }];
}

export async function compressPhoto(uri) {
  if (!uri) return uri;
  let actions = [];
  try {
    const size = await getImageSize(uri);
    actions = resizeActions(size.width, size.height);
  } catch {
    actions = [{ resize: { width: MAX_PHOTO_SIDE } }];
  }
  const result = await manipulateAsync(uri, actions, {
    compress: JPEG_QUALITY,
    format: SaveFormat.JPEG,
  });
  return result?.uri || uri;
}

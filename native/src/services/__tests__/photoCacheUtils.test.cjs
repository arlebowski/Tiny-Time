const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isLocalPhotoUri,
  hashPhotoCacheKey,
  photoCacheFileName,
  cacheFilesToDelete,
} = require('../photoCacheUtils.cjs');

test('local photo URIs skip the disk cache key', () => {
  assert.equal(isLocalPhotoUri('file:///var/photo.jpg'), true);
  assert.equal(isLocalPhotoUri('content://media/1'), true);
  assert.equal(isLocalPhotoUri('data:image/jpeg;base64,abc'), true);
  assert.equal(isLocalPhotoUri('https://zzxnkjssveypcxbguzif.supabase.co/storage/v1/object/public/photos/a.jpg'), false);
});

test('cache file names are stable for the same remote URL', () => {
  const url = 'https://example.supabase.co/storage/v1/object/public/photos/families/1.jpg';
  assert.equal(photoCacheFileName(url), photoCacheFileName(url));
  assert.equal(photoCacheFileName(url).endsWith('.jpg'), true);
  assert.notEqual(hashPhotoCacheKey(url), hashPhotoCacheKey(`${url}?v=2`));
});

test('cache eviction removes oldest files and preserves the current write', () => {
  const files = [
    { name: 'old.jpg', size: 40, modifiedAt: 1 },
    { name: 'newer.jpg', size: 40, modifiedAt: 2 },
    { name: 'current.jpg', size: 40, modifiedAt: 3 },
  ];
  assert.deepEqual(
    cacheFilesToDelete(files, 80, 'current.jpg'),
    ['old.jpg']
  );
  assert.deepEqual(
    cacheFilesToDelete(files, 40, 'current.jpg'),
    ['old.jpg', 'newer.jpg']
  );
});

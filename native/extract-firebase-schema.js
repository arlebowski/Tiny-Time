/**
 * Firebase Schema Extractor
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function resolveCredential() {
  const localKeyPath = path.join(__dirname, 'service-account-key.json');
  const envKeyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    ? path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS)
    : null;

  if (envKeyPath && fs.existsSync(envKeyPath)) {
    return admin.credential.cert(require(envKeyPath));
  }

  if (fs.existsSync(localKeyPath)) {
    return admin.credential.cert(require(localKeyPath));
  }

  throw new Error(
    'Missing Firebase Admin credentials. Set GOOGLE_APPLICATION_CREDENTIALS to a service-account JSON path, or add native/service-account-key.json'
  );
}

admin.initializeApp({
  credential: resolveCredential()
});

const db = admin.firestore();

async function extractSchema() {
  const schema = {};
  
  const collections = await db.listCollections();
  
  console.error(`Found ${collections.length} root collections`);
  
  for (const collection of collections) {
    const collectionName = collection.id;
    console.error(`\nExtracting collection: ${collectionName}`);
    
    schema[collectionName] = {
      collectionPath: collectionName,
      sampleDocuments: [],
      subcollections: {}
    };
    
    const snapshot = await collection.limit(3).get();
    
    console.error(`  Found ${snapshot.size} sample documents`);
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      const fields = {};
      for (const [key, value] of Object.entries(data)) {
        fields[key] = {
          type: getFieldType(value),
          sample: getSampleValue(value)
        };
      }
      
      schema[collectionName].sampleDocuments.push({
        id: doc.id,
        fields: fields
      });
      
      if (schema[collectionName].sampleDocuments.length === 1) {
        const subcollections = await doc.ref.listCollections();
        
        if (subcollections.length > 0) {
          console.error(`  Found ${subcollections.length} subcollections`);
        }
        
        for (const subcollection of subcollections) {
          const subCollectionName = subcollection.id;
          console.error(`    Extracting subcollection: ${subCollectionName}`);
          
          schema[collectionName].subcollections[subCollectionName] = {
            collectionPath: `${collectionName}/{docId}/${subCollectionName}`,
            sampleDocuments: []
          };
          
          const subSnapshot = await subcollection.limit(3).get();
          
          console.error(`      Found ${subSnapshot.size} sample documents`);
          
          for (const subDoc of subSnapshot.docs) {
            const subData = subDoc.data();
            
            const subFields = {};
            for (const [key, value] of Object.entries(subData)) {
              subFields[key] = {
                type: getFieldType(value),
                sample: getSampleValue(value)
              };
            }
            
            schema[collectionName].subcollections[subCollectionName].sampleDocuments.push({
              id: subDoc.id,
              fields: subFields
            });
          }
        }
      }
    }
  }
  
  return schema;
}

function getFieldType(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (value instanceof admin.firestore.Timestamp) return 'timestamp';
  if (value instanceof admin.firestore.GeoPoint) return 'geopoint';
  if (Array.isArray(value)) return `array<${value.length > 0 ? getFieldType(value[0]) : 'unknown'}>`;
  if (typeof value === 'object') return 'map';
  return 'unknown';
}

function getSampleValue(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return value.substring(0, 50);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof admin.firestore.Timestamp) return value.toDate().toISOString();
  if (value instanceof admin.firestore.GeoPoint) return { lat: value.latitude, lng: value.longitude };
  if (Array.isArray(value)) return value.slice(0, 2);
  if (typeof value === 'object') return '[Object]';
  return value;
}

extractSchema()
  .then(schema => {
    console.log(JSON.stringify(schema, null, 2));
    console.error('\n✅ Schema extraction complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

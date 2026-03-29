#!/usr/bin/env node
/**
 * Test Firebase connectivity
 */

const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set, get } = require('firebase/database');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyBhx2eHtNdylUKnSekDNhTcvL_WQnJ_sfU',
  authDomain: 'oracleforge.firebaseapp.com',
  projectId: 'oracleforge',
  storageBucket: 'oracleforge.appspot.com',
  databaseURL: 'https://oracleforge-default-rtdb.firebaseio.com',
};

async function testFirebase() {
  console.log('🔥 Testing Firebase connection...\n');
  console.log('Config:', JSON.stringify(firebaseConfig, null, 2), '\n');

  try {
    const app = initializeApp(firebaseConfig);
    console.log('✓ Firebase app initialized\n');

    // Test Realtime Database
    console.log('Testing Realtime Database...');
    const database = getDatabase(app);
    const testRef = ref(database, 'test/connection');
    
    try {
      await set(testRef, { timestamp: Date.now(), test: true });
      console.log('✓ Realtime Database WRITE successful');
      
      const snapshot = await get(testRef);
      if (snapshot.exists()) {
        console.log('✓ Realtime Database READ successful:', snapshot.val());
      } else {
        console.log('⚠ Realtime Database READ returned empty');
      }
    } catch (dbError) {
      console.log('✗ Realtime Database error:', dbError.message);
      if (dbError.message.includes('configured correctly')) {
        console.log('\n  → The database URL might be wrong.');
        console.log('  → Check Firebase Console → Realtime Database for the correct URL.');
        console.log('  → It might be: https://oracleforge-default-rtdb.firebaseio.com');
      }
      if (dbError.message.includes('Permission denied')) {
        console.log('\n  → Database rules are blocking access.');
        console.log('  → Set rules to: { "rules": { ".read": true, ".write": true } }');
      }
    }

    // Test Firestore
    console.log('\nTesting Firestore...');
    const firestore = getFirestore(app);
    
    try {
      const oraclesRef = collection(firestore, 'oracles');
      const snapshot = await getDocs(oraclesRef);
      console.log('✓ Firestore READ successful, documents:', snapshot.size);
    } catch (fsError) {
      console.log('✗ Firestore error:', fsError.message);
      if (fsError.message.includes('Missing or insufficient permissions')) {
        console.log('\n  → Firestore rules are blocking access.');
        console.log('  → Update Firestore rules to allow authenticated access.');
      }
    }

    console.log('\n✅ Firebase test complete!');
  } catch (error) {
    console.error('✗ Firebase initialization failed:', error.message);
  }
}

testFirebase();

/**
 * Firestore Migration: Add Subscription Lifecycle Fields
 * 
 * Run this script to add the new subscription fields to existing user documents.
 * 
 * Usage: node plans/subscription-lifecycle/migration-add-subscription-fields.js
 * 
 * Fields added:
 * - subscriptionId: null (will be set when user subscribes)
 * - customerId: null (will be set when user subscribes)
 * - cancelAtPeriodEnd: false
 * - currentPeriodEnd: null
 * - paymentWarning: false
 */

const { cert, getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  );
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

async function migrate() {
  console.log('🚀 Starting subscription fields migration...\n');
  
  // Get all users
  const usersSnapshot = await db.collection('users').get();
  const totalUsers = usersSnapshot.size;
  
  console.log(`Found ${totalUsers} users to check\n`);
  
  let updatedCount = 0;
  let skippedCount = 0;
  
  for (const userDoc of usersSnapshot.docs) {
    const userData = userDoc.data();
    const userId = userDoc.id;
    
    // Check if fields already exist
    const hasSubscriptionId = 'subscriptionId' in userData;
    const hasCustomerId = 'customerId' in userData;
    const hasCancelAtPeriodEnd = 'cancelAtPeriodEnd' in userData;
    const hasCurrentPeriodEnd = 'currentPeriodEnd' in userData;
    const hasPaymentWarning = 'paymentWarning' in userData;
    
    const needsUpdate = !hasSubscriptionId || !hasCustomerId || 
                       !hasCancelAtPeriodEnd || !hasCurrentPeriodEnd || 
                       !hasPaymentWarning;
    
    if (needsUpdate) {
      const updateData = {};
      
      if (!hasSubscriptionId) updateData.subscriptionId = null;
      if (!hasCustomerId) updateData.customerId = null;
      if (!hasCancelAtPeriodEnd) updateData.cancelAtPeriodEnd = false;
      if (!hasCurrentPeriodEnd) updateData.currentPeriodEnd = null;
      if (!hasPaymentWarning) updateData.paymentWarning = false;
      
      await db.collection('users').doc(userId).update(updateData);
      
      console.log(`✅ Updated user: ${userId} (${userData.email})`);
      console.log(`   Fields added: ${Object.keys(updateData).join(', ')}\n`);
      
      updatedCount++;
    } else {
      skippedCount++;
    }
  }
  
  console.log('\n📊 Migration Summary:');
  console.log(`   Total users: ${totalUsers}`);
  console.log(`   Updated: ${updatedCount}`);
  console.log(`   Skipped (already has fields): ${skippedCount}`);
  console.log('\n✅ Migration complete!');
}

// Run migration
migrate().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});


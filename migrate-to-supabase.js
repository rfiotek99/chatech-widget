require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ====================================
// MIGRATION SCRIPT: clients.json → Supabase
// ====================================

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Use service key to bypass RLS
);

async function migrate() {
  console.log('🚀 Starting migration from clients.json to Supabase...\n');

  // 1. Load clients.json
  const clientsPath = path.join(__dirname, 'clients.json');
  
  if (!fs.existsSync(clientsPath)) {
    console.error('❌ clients.json not found!');
    process.exit(1);
  }

  const clientsData = JSON.parse(fs.readFileSync(clientsPath, 'utf8'));
  console.log(`📋 Found ${Object.keys(clientsData).length} clients to migrate\n`);

  // 2. Migrate each client
  let successCount = 0;
  let errorCount = 0;

  for (const [clientId, config] of Object.entries(clientsData)) {
    try {
      console.log(`⏳ Migrating: ${clientId} (${config.name})...`);

      const clientRecord = {
        client_id: clientId,
        name: config.name,
        email: config.email || `${clientId}@temp.chatech.com`, // Temporary email if not set
        
        // Visual config
        primary_color: config.primaryColor || '#667eea',
        secondary_color: config.secondaryColor || '#764ba2',
        logo: config.logo || '💬',
        logo_type: config.logoType || 'emoji',
        
        // Chatbot config
        welcome_message: config.welcomeMessage,
        system_prompt: config.systemPrompt,
        hours: config.hours,
        shipping: config.shipping,
        returns: config.returns,
        payments: config.payments,
        
        // Default to active (adjust manually if needed)
        status: 'active',
        plan: 'professional', // Default plan, adjust as needed
        
        // Set trial end to 30 days from now
        trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('clients')
        .insert(clientRecord)
        .select()
        .single();

      if (error) {
        // Check if it's a duplicate
        if (error.code === '23505') {
          console.log(`⚠️  ${clientId} already exists, updating...`);
          
          const { error: updateError } = await supabase
            .from('clients')
            .update(clientRecord)
            .eq('client_id', clientId);
          
          if (updateError) {
            throw updateError;
          }
          console.log(`✅ Updated: ${clientId}\n`);
        } else {
          throw error;
        }
      } else {
        console.log(`✅ Migrated: ${clientId} → ${data.id}\n`);
      }

      successCount++;

    } catch (error) {
      console.error(`❌ Error migrating ${clientId}:`, error.message);
      console.error('   Details:', error);
      errorCount++;
    }
  }

  // 3. Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Successfully migrated: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  console.log(`📝 Total clients: ${Object.keys(clientsData).length}\n`);

  // 4. Verify migration
  console.log('🔍 Verifying migration...');
  const { data: allClients, error: verifyError } = await supabase
    .from('clients')
    .select('client_id, name, email, status, plan');

  if (verifyError) {
    console.error('❌ Error verifying:', verifyError);
  } else {
    console.log(`\n✅ Found ${allClients.length} clients in database:\n`);
    console.table(allClients);
  }

  console.log('\n🎉 Migration complete!');
  console.log('\n📝 Next steps:');
  console.log('   1. Review migrated data in Supabase dashboard');
  console.log('   2. Update emails manually if needed');
  console.log('   3. Test the /api/config endpoint with new DB');
  console.log('   4. Backup clients.json before deleting\n');
}

// Run migration
migrate().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});

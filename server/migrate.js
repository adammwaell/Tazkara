/**
 * Safe migration script — AdamTickets v1 → v2
 *
 * What this does:
 *   1. Reports how many users lack googleId (legacy password users)
 *   2. Reports how many events lack waves (pre-wave events)
 *   3. Optionally wraps legacy events in a Wave 1 structure (non-destructive)
 *
 * What this NEVER does:
 *   - Delete any document
 *   - Modify any Order or Ticket record
 *   - Change any price or quantity already sold
 *
 * Usage:
 *   node migrate.js --dry-run   (analyse only, no writes)
 *   node migrate.js --run       (apply wave wrapping to pre-wave events)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Event    = require('./models/Event');
const User     = require('./models/User');

const DRY_RUN = !process.argv.includes('--run');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  if (DRY_RUN) {
    console.log('🔍 DRY RUN — no writes will be made (use --run to apply)\n');
  }

  // ── 1. Audit legacy users ───────────────────────────────────────────────────
  const totalUsers   = await User.countDocuments();
  const legacyUsers  = await User.countDocuments({ googleId: { $exists: false } });
  const googleUsers  = totalUsers - legacyUsers;

  console.log('── Users ──────────────────────────────────────────');
  console.log(`  Total:          ${totalUsers}`);
  console.log(`  Google OAuth:   ${googleUsers}`);
  console.log(`  Legacy (no googleId): ${legacyUsers}`);
  if (legacyUsers > 0) {
    console.log('  ℹ️  Legacy users will be migrated automatically on first Google sign-in');
    console.log('     (googleId written to existing record when email matches)\n');
  }

  // ── 2. Audit events ─────────────────────────────────────────────────────────
  const totalEvents  = await Event.countDocuments();
  const waveEvents   = await Event.countDocuments({ 'waves.0': { $exists: true } });
  const legacyEvents = totalEvents - waveEvents;

  console.log('── Events ─────────────────────────────────────────');
  console.log(`  Total:          ${totalEvents}`);
  console.log(`  With waves:     ${waveEvents}`);
  console.log(`  Legacy (no waves): ${legacyEvents}`);

  if (legacyEvents === 0) {
    console.log('  ✅ All events already have wave structure — nothing to migrate\n');
    await mongoose.disconnect();
    return;
  }

  // ── 3. Show legacy events ───────────────────────────────────────────────────
  const legacyDocs = await Event.find({ 'waves.0': { $exists: false } })
    .select('name vipSeats vipPrice fanPitSeats fanPitPrice regularSeats regularPrice soldCount');

  console.log('\n  Legacy events to migrate:');
  legacyDocs.forEach(e => {
    console.log(`    • ${e.name} (vip:${e.vipSeats}@${e.vipPrice} fp:${e.fanPitSeats}@${e.fanPitPrice} reg:${e.regularSeats}@${e.regularPrice} sold:${e.soldCount})`);
  });

  if (DRY_RUN) {
    console.log('\n  Run with --run to wrap these events in Wave 1 structure');
    await mongoose.disconnect();
    return;
  }

  // ── 4. Migrate legacy events (--run mode) ───────────────────────────────────
  console.log('\n🔄 Migrating legacy events to wave structure...');
  let migrated = 0, skipped = 0;

  for (const ev of legacyDocs) {
    try {
      // Build Wave 1 categories from existing flat fields.
      // remainingSeats = current flat seats (already accounts for sold tickets).
      // soldSeats computed from soldCount proportionally — best-effort for display.
      const categories = [];

      if (ev.vipSeats > 0 || ev.vipPrice > 0) {
        categories.push({
          type: 'vip', label: '', price: ev.vipPrice,
          // totalSeats is unknowable precisely (soldCount is aggregate), so we use
          // remaining + a proportional estimate for sold. This is display-only.
          totalSeats:     ev.vipSeats,  // minimum known total
          remainingSeats: ev.vipSeats,
          soldSeats:      0,            // can't know per-type without ticket records
        });
      }
      if (ev.fanPitSeats > 0 || ev.fanPitPrice > 0) {
        categories.push({
          type: 'fanPit', label: '', price: ev.fanPitPrice,
          totalSeats:     ev.fanPitSeats,
          remainingSeats: ev.fanPitSeats,
          soldSeats:      0,
        });
      }
      if (ev.regularSeats > 0 || ev.regularPrice > 0) {
        categories.push({
          type: 'regular', label: '', price: ev.regularPrice,
          totalSeats:     ev.regularSeats,
          remainingSeats: ev.regularSeats,
          soldSeats:      0,
        });
      }

      if (categories.length === 0) {
        console.log(`  ⚠️  Skipped "${ev.name}" — no seat data to migrate`);
        skipped++;
        continue;
      }

      // Use $push to add Wave 1 without touching any other field
      await Event.findByIdAndUpdate(ev._id, {
        $push: {
          waves: {
            name:        'Wave 1',
            description: 'Migrated from legacy format',
            isActive:    true,
            categories,
          },
        },
      });

      console.log(`  ✅ Migrated "${ev.name}" → Wave 1 with ${categories.length} categories`);
      migrated++;
    } catch (err) {
      console.error(`  ❌ Failed "${ev.name}":`, err.message);
    }
  }

  console.log(`\n✅ Migration complete: ${migrated} events migrated, ${skipped} skipped`);
  console.log('   Existing Orders and Tickets are untouched.\n');

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});

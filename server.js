const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { URL } = require('node:url');
const { DatabaseSync } = require('node:sqlite');
const travelEngine = require('./travel-engine');

const PORT = process.env.PORT || 3000;
const AUTO_VOLUME_DIR = (() => {
  if (process.env.RAILWAY_VOLUME_MOUNT_PATH) return process.env.RAILWAY_VOLUME_MOUNT_PATH;
  if (process.env.DATA_DIR) return process.env.DATA_DIR;
  try {
    if (fs.existsSync('/data')) {
      fs.accessSync('/data', fs.constants.W_OK);
      return '/data';
    }
  } catch (e) {}
  return path.join(__dirname, 'data');
})();
const DATA_DIR = AUTO_VOLUME_DIR;
const PUBLIC_DIR = path.join(__dirname, 'public');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const dbPath = path.join(DATA_DIR, 'finance.db');
const db = new DatabaseSync(dbPath);

// Enable WAL mode and foreign keys
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS auth_sessions (
    token TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS trips (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    destination TEXT NOT NULL,
    country_code TEXT DEFAULT 'US',
    default_currency TEXT DEFAULT 'USD',
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    budget_usd REAL NOT NULL DEFAULT 5000,
    video_count INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active',
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL,
    title TEXT NOT NULL,
    vendor TEXT DEFAULT '',
    category TEXT NOT NULL,
    expense_date TEXT NOT NULL,
    amount_original REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    exchange_rate REAL NOT NULL DEFAULT 1.0,
    amount_usd REAL NOT NULL,
    payment_method TEXT DEFAULT 'Amex Business Gold',
    paid_by TEXT DEFAULT 'Channel Card',
    tax_deductible INTEGER NOT NULL DEFAULT 1,
    reimbursable INTEGER NOT NULL DEFAULT 0,
    receipt_data TEXT DEFAULT '',
    receipt_name TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    credit_usd REAL NOT NULL DEFAULT 0,
    credit_verified INTEGER NOT NULL DEFAULT 0,
    credit_note TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS revenues (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL,
    title TEXT NOT NULL,
    source_type TEXT NOT NULL,
    sponsor_name TEXT DEFAULT '',
    video_title TEXT DEFAULT '',
    amount_usd REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'paid',
    revenue_date TEXT NOT NULL,
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
  );
`);

// Safe schema migrations for existing SQLite databases
try { db.exec('ALTER TABLE expenses ADD COLUMN credit_usd REAL NOT NULL DEFAULT 0'); } catch (e) {}
try { db.exec('ALTER TABLE expenses ADD COLUMN credit_verified INTEGER NOT NULL DEFAULT 0'); } catch (e) {}
try { db.exec("ALTER TABLE expenses ADD COLUMN credit_note TEXT DEFAULT ''"); } catch (e) {}
try { db.exec("ALTER TABLE trips ADD COLUMN cover_photo TEXT DEFAULT ''"); } catch (e) {}
try { db.exec("ALTER TABLE trips ADD COLUMN legs_json TEXT DEFAULT '[]'"); } catch (e) {}
try { db.exec("ALTER TABLE expenses ADD COLUMN leg_path TEXT DEFAULT ''"); } catch (e) {}
travelEngine.initTravelSchema(db);
try { db.exec("ALTER TABLE reservations ADD COLUMN leg_path TEXT DEFAULT ''"); } catch (e) {}

const DEFAULT_RATES = {
  USD: 1.0,
  ARS: 0.00098,   // ~1,020 ARS per USD (Argentina)
  BRL: 0.175,     // ~5.70 BRL per USD (Brazil)
  JPY: 0.00658,   // ~152 JPY per USD
  EUR: 1.085,     // ~0.92 EUR per USD
  GBP: 1.295,     // ~0.77 GBP per USD
  CAD: 0.725,     // ~1.38 CAD per USD
  AUD: 0.658,     // ~1.52 AUD per USD
  CHF: 1.155,     // ~0.865 CHF per USD
  ISK: 0.00725,   // ~138 ISK per USD
  KRW: 0.00073,   // ~1370 KRW per USD
  MXN: 0.0505,    // ~19.8 MXN per USD
  THB: 0.0296     // ~33.8 THB per USD
};

function seedIfNeeded() {
  const countRow = db.prepare('SELECT COUNT(*) as count FROM trips').get();
  const modRow = db.prepare("SELECT value FROM settings WHERE key = 'user_modified'").get();
  const rewRow = db.prepare("SELECT value FROM settings WHERE key = 'rewards_data'").get();
  if ((countRow && countRow.count > 0) || (modRow && modRow.value === 'true') || (rewRow && rewRow.value)) return;

  const insertSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  insertSetting.run('channel_name', 'Wander Wallet');
  insertSetting.run('home_currency', 'USD');
  insertSetting.run('meal_deduction_rate', '100');
  insertSetting.run('exchange_rates', JSON.stringify(DEFAULT_RATES));
  insertSetting.run('user_modified', 'false');
  insertSetting.run('updated_at', '0');

  const now = new Date().toISOString();

  const trips = [
    {
      id: 'trip-japan-2026',
      name: 'Japan Shoot - Nov 2026',
      destination: 'Tokyo, Kyoto & Hokkaido',
      country_code: 'JP',
      default_currency: 'JPY',
      start_date: '2026-11-01',
      end_date: '2026-11-12',
      budget_usd: 9500,
      video_count: 3,
      status: 'active',
      notes: '3-part autumn documentary series: Tokyo 24h Sleeper Train, Kyoto Heritage Ryokan, Hokkaido Ramen Trail.',
      created_at: now
    },
    {
      id: 'trip-iceland-2026',
      name: 'Iceland Ring Road - Oct 2026',
      destination: 'Reykjavik & Vik',
      country_code: 'IS',
      default_currency: 'ISK',
      start_date: '2026-10-10',
      end_date: '2026-10-18',
      budget_usd: 7800,
      video_count: 2,
      status: 'completed',
      notes: 'Glacier campervan survival challenge + Highlands drone cinematography episode.',
      created_at: now
    },
    {
      id: 'trip-alps-2026',
      name: 'Swiss Alps Rail Series - Sep 2026',
      destination: 'Zurich, Zermatt & St. Moritz',
      country_code: 'CH',
      default_currency: 'CHF',
      start_date: '2026-09-14',
      end_date: '2026-09-21',
      budget_usd: 6800,
      video_count: 2,
      status: 'completed',
      notes: 'First-class vs. budget mountain rail comparison across the Glacier Express.',
      created_at: now
    }
  ];

  const insertTrip = db.prepare(`
    INSERT INTO trips (id, name, destination, country_code, default_currency, start_date, end_date, budget_usd, video_count, status, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const t of trips) {
    insertTrip.run(
      t.id, t.name, t.destination, t.country_code, t.default_currency,
      t.start_date, t.end_date, t.budget_usd, t.video_count, t.status, t.notes, t.created_at
    );
  }

  // Generate sample SVG receipt data URLs for realistic preview
  function makeSampleReceiptSvg(vendor, dateStr, items, totalText, currency) {
    const itemLines = items.map((it, idx) =>
      `<text x="24" y="${150 + idx * 26}" fill="#334155" font-family="monospace" font-size="12">${it.label}</text>
       <text x="296" y="${150 + idx * 26}" fill="#0f172a" font-family="monospace" font-size="12" text-anchor="end">${it.price}</text>`
    ).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
      <rect width="320" height="320" rx="12" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
      <rect x="16" y="16" width="288" height="288" rx="6" fill="#ffffff" stroke="#e2e8f0"/>
      <text x="160" y="48" fill="#0f172a" font-family="monospace" font-weight="bold" font-size="15" text-anchor="middle">${vendor}</text>
      <text x="160" y="68" fill="#64748b" font-family="monospace" font-size="11" text-anchor="middle">DATE: ${dateStr} • ${currency}</text>
      <line x1="24" y1="86" x2="296" y2="86" stroke="#cbd5e1" stroke-dasharray="4 4"/>
      <text x="24" y="114" fill="#64748b" font-family="monospace" font-size="11">ITEM DESCRIPTION</text>
      <text x="296" y="114" fill="#64748b" font-family="monospace" font-size="11" text-anchor="end">AMOUNT</text>
      <line x1="24" y1="124" x2="296" y2="124" stroke="#e2e8f0"/>
      ${itemLines}
      <line x1="24" y1="238" x2="296" y2="238" stroke="#94a3b8" stroke-width="1.5"/>
      <text x="24" y="264" fill="#0f172a" font-family="monospace" font-weight="bold" font-size="14">TOTAL PAID</text>
      <text x="296" y="264" fill="#0f172a" font-family="monospace" font-weight="bold" font-size="14" text-anchor="end">${totalText}</text>
      <text x="160" y="292" fill="#16a34a" font-family="monospace" font-size="11" text-anchor="middle">✓ VERIFIED TAX RECEIPT</text>
    </svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  const expenses = [
    // Japan Shoot - Nov 2026
    {
      id: 'exp-jp-1',
      trip_id: 'trip-japan-2026',
      title: 'ANA Roundtrip Flights (2 Crew + Media Bags)',
      vendor: 'All Nippon Airways',
      category: 'Flights & Transit',
      expense_date: '2026-11-01',
      amount_original: 2480.00,
      currency: 'USD',
      exchange_rate: 1.0,
      amount_usd: 2480.00,
      payment_method: 'Amex Business Platinum',
      paid_by: 'Channel Card',
      tax_deductible: 1,
      reimbursable: 0,
      receipt_data: makeSampleReceiptSvg('ALL NIPPON AIRWAYS', '2026-11-01', [
        { label: '2x LAX-HND RT Economy Plus', price: '$2,180.00' },
        { label: '3x Oversized Cinema Cases', price: '$300.00' }
      ], '$2,480.00', 'USD'),
      receipt_name: 'ana_flights_receipt.svg',
      notes: 'Includes extra baggage fee for Pelican cinema cases & tripod tube.'
    },
    {
      id: 'exp-jp-2',
      trip_id: 'trip-japan-2026',
      title: 'Shibuya Stream Excel Hotel (4 Nights, 2 Rooms)',
      vendor: 'Shibuya Stream Hotel',
      category: 'Hotels & Lodging',
      expense_date: '2026-11-02',
      amount_original: 242000,
      currency: 'JPY',
      exchange_rate: 0.00658,
      amount_usd: 1592.36,
      payment_method: 'Amex Business Platinum',
      paid_by: 'Channel Card',
      tax_deductible: 1,
      reimbursable: 0,
      receipt_data: makeSampleReceiptSvg('SHIBUYA STREAM HOTEL', '2026-11-02', [
        { label: 'Room 1204 (4 Nights)', price: '¥121,000' },
        { label: 'Room 1206 (4 Nights)', price: '¥121,000' }
      ], '¥242,000', 'JPY'),
      receipt_name: 'shibuya_hotel_folio.svg',
      notes: 'Basecamp for Tokyo street food & sleeper train prep.'
    },
    {
      id: 'exp-jp-3',
      trip_id: 'trip-japan-2026',
      title: '7-Day Green Car JR Passes + Shinkansen Seat Res',
      vendor: 'JR East Travel Service',
      category: 'Flights & Transit',
      expense_date: '2026-11-02',
      amount_original: 140000,
      currency: 'JPY',
      exchange_rate: 0.00658,
      amount_usd: 921.20,
      payment_method: 'Chase Ink Business',
      paid_by: 'Channel Card',
      tax_deductible: 1,
      reimbursable: 0,
      receipt_data: '',
      receipt_name: '',
      notes: 'Bullet train transit between Tokyo, Kyoto, and Aomori.'
    },
    {
      id: 'exp-jp-4',
      trip_id: 'trip-japan-2026',
      title: 'Tsukiji Outer Market Shoot — On-Camera Tasting & Crew Breakfast',
      vendor: 'Tsukiji Uogashi & Stalls',
      category: 'Meals & Craft',
      expense_date: '2026-11-03',
      amount_original: 18400,
      currency: 'JPY',
      exchange_rate: 0.00658,
      amount_usd: 121.07,
      payment_method: 'Personal Cash (Reimburse)',
      paid_by: 'Alex (Host)',
      tax_deductible: 1,
      reimbursable: 1,
      receipt_data: makeSampleReceiptSvg('TSUKIJI MARKET VENDORS', '2026-11-03', [
        { label: 'Uni & Tuna Tasting Platter', price: '¥9,800' },
        { label: 'Wagyu Skewers + Matcha (Crew)', price: '¥8,600' }
      ], '¥18,400', 'JPY'),
      receipt_name: 'tsukiji_meals.svg',
      notes: 'Featured in Episode 1 cold open.'
    },
    {
      id: 'exp-jp-5',
      trip_id: 'trip-japan-2026',
      title: 'Sony FX3 Backup Battery Pack & 256GB V90 SD Cards',
      vendor: 'Yodobashi Camera Akihabara',
      category: 'Gear & Rentals',
      expense_date: '2026-11-03',
      amount_original: 54800,
      currency: 'JPY',
      exchange_rate: 0.00658,
      amount_usd: 360.58,
      payment_method: 'Chase Ink Business',
      paid_by: 'Channel Card',
      tax_deductible: 1,
      reimbursable: 0,
      receipt_data: makeSampleReceiptSvg('YODOBASHI CAMERA AKIBA', '2026-11-03', [
        { label: '2x Sony NP-FZ100 Batteries', price: '¥21,600' },
        { label: '2x ProGrade 256GB V90 SDXC', price: '¥33,200' }
      ], '¥54,800', 'JPY'),
      receipt_name: 'yodobashi_gear.svg',
      notes: 'Tax-free passport purchase at Yodobashi.'
    },
    {
      id: 'exp-jp-6',
      trip_id: 'trip-japan-2026',
      title: 'Kyoto Arashiyama Ryokan Suite (2 Nights + Kaiseki Shoot)',
      vendor: 'Katsura River Ryokan',
      category: 'Hotels & Lodging',
      expense_date: '2026-11-05',
      amount_original: 168000,
      currency: 'JPY',
      exchange_rate: 0.00658,
      amount_usd: 1105.44,
      payment_method: 'Amex Business Platinum',
      paid_by: 'Channel Card',
      tax_deductible: 1,
      reimbursable: 0,
      receipt_data: '',
      receipt_name: '',
      notes: 'Main location for Episode 2 luxury vs traditional inn segment.'
    },
    {
      id: 'exp-jp-7',
      trip_id: 'trip-japan-2026',
      title: 'Bilingual Local Fixer & Location Translator (2 Days)',
      vendor: 'Kenji Sato Production Services',
      category: 'Crew & Talent',
      expense_date: '2026-11-05',
      amount_original: 90000,
      currency: 'JPY',
      exchange_rate: 0.00658,
      amount_usd: 592.20,
      payment_method: 'Wise Business Transfer',
      paid_by: 'Channel Card',
      tax_deductible: 1,
      reimbursable: 0,
      receipt_data: '',
      receipt_name: '',
      notes: 'Handled shrine filming permissions and chef interviews in Kyoto.'
    },
    {
      id: 'exp-jp-8',
      trip_id: 'trip-japan-2026',
      title: 'Pontocho Alley Izakaya Crew Dinner after Night Shoot',
      vendor: 'Kyo-Yasai Izakaya',
      category: 'Meals & Craft',
      expense_date: '2026-11-06',
      amount_original: 14200,
      currency: 'JPY',
      exchange_rate: 0.00658,
      amount_usd: 93.44,
      payment_method: 'Personal Card (Reimburse)',
      paid_by: 'Sam (DP)',
      tax_deductible: 1,
      reimbursable: 1,
      receipt_data: '',
      receipt_name: '',
      notes: 'Crew wrap dinner after 14-hour filming day.'
    },

    // Iceland Ring Road - Oct 2026
    {
      id: 'exp-is-1',
      trip_id: 'trip-iceland-2026',
      title: '4x4 Defender Roof-Tent & Heated Campervan Rental (8 Days)',
      vendor: 'CampEasy Iceland',
      category: 'Hotels & Lodging',
      expense_date: '2026-10-10',
      amount_original: 398000,
      currency: 'ISK',
      exchange_rate: 0.00725,
      amount_usd: 2885.50,
      payment_method: 'Amex Business Platinum',
      paid_by: 'Channel Card',
      tax_deductible: 1,
      reimbursable: 0,
      receipt_data: makeSampleReceiptSvg('CAMPEASY ICELAND KEF', '2026-10-10', [
        { label: '4x4 Expedition Camper (8d)', price: '348,000 ISK' },
        { label: 'Gravel & Sand Insurance', price: '50,000 ISK' }
      ], '398,000 ISK', 'ISK'),
      receipt_name: 'campeasy_iceland.svg',
      notes: 'Combined lodging + vehicle for the 8-day survival video.'
    },
    {
      id: 'exp-is-2',
      trip_id: 'trip-iceland-2026',
      title: 'Icelandair Roundtrip Flights + Drone Case',
      vendor: 'Icelandair',
      category: 'Flights & Transit',
      expense_date: '2026-10-10',
      amount_original: 1640.00,
      currency: 'USD',
      exchange_rate: 1.0,
      amount_usd: 1640.00,
      payment_method: 'Amex Business Platinum',
      paid_by: 'Channel Card',
      tax_deductible: 1,
      reimbursable: 0,
      receipt_data: '',
      receipt_name: '',
      notes: 'Direct flights JFK to KEF.'
    },
    {
      id: 'exp-is-3',
      trip_id: 'trip-iceland-2026',
      title: 'Vatnajökull National Park Commercial Filming & Drone Permit',
      vendor: 'Umhverfisstofnun (Environment Agency)',
      category: 'Permits & Locations',
      expense_date: '2026-10-13',
      amount_original: 65000,
      currency: 'ISK',
      exchange_rate: 0.00725,
      amount_usd: 471.25,
      payment_method: 'Chase Ink Business',
      paid_by: 'Channel Card',
      tax_deductible: 1,
      reimbursable: 0,
      receipt_data: '',
      receipt_name: '',
      notes: 'Commercial drone authorization near glacier lagoon.'
    },
    {
      id: 'exp-is-4',
      trip_id: 'trip-iceland-2026',
      title: 'Vik Black Sand Beach Hotel (2 Nights Storm Recovery)',
      vendor: 'Hotel Kría Vik',
      category: 'Hotels & Lodging',
      expense_date: '2026-10-15',
      amount_original: 118000,
      currency: 'ISK',
      exchange_rate: 0.00725,
      amount_usd: 855.50,
      payment_method: 'Amex Business Platinum',
      paid_by: 'Channel Card',
      tax_deductible: 1,
      reimbursable: 0,
      receipt_data: '',
      receipt_name: '',
      notes: 'Booked 2 nights indoor lodging to offload 1.8TB footage during gale warnings.'
    },
    {
      id: 'exp-is-5',
      trip_id: 'trip-iceland-2026',
      title: 'Bonus Grocery Provisioning & Road Meals (Full Week)',
      vendor: 'Bónus & Vik Soup Co.',
      category: 'Meals & Craft',
      expense_date: '2026-10-16',
      amount_original: 74500,
      currency: 'ISK',
      exchange_rate: 0.00725,
      amount_usd: 540.13,
      payment_method: 'Chase Ink Business',
      paid_by: 'Channel Card',
      tax_deductible: 1,
      reimbursable: 0,
      receipt_data: '',
      receipt_name: '',
      notes: 'Camp stove meals + warm soup stops while filming on South Coast.'
    },

    // Swiss Alps Rail Series - Sep 2026
    {
      id: 'exp-ch-1',
      trip_id: 'trip-alps-2026',
      title: 'Glacier Express Excellence Class & Swiss Travel Passes',
      vendor: 'Swiss Federal Railways (SBB)',
      category: 'Flights & Transit',
      expense_date: '2026-09-14',
      amount_original: 2150,
      currency: 'CHF',
      exchange_rate: 1.155,
      amount_usd: 2483.25,
      payment_method: 'Amex Business Platinum',
      paid_by: 'Channel Card',
      tax_deductible: 1,
      reimbursable: 0,
      receipt_data: '',
      receipt_name: '',
      notes: 'Hero ticket cost for the $1,000 vs $50 Swiss train video.'
    },
    {
      id: 'exp-ch-2',
      trip_id: 'trip-alps-2026',
      title: 'Zermatt Alpine Boutique Hotel (3 Nights)',
      vendor: 'Hotel Cervo Zermatt',
      category: 'Hotels & Lodging',
      expense_date: '2026-09-16',
      amount_original: 1890,
      currency: 'CHF',
      exchange_rate: 1.155,
      amount_usd: 2182.95,
      payment_method: 'Amex Business Platinum',
      paid_by: 'Channel Card',
      tax_deductible: 1,
      reimbursable: 0,
      receipt_data: '',
      receipt_name: '',
      notes: 'Matterhorn view room for timelapse & host segments.'
    },
    {
      id: 'exp-ch-3',
      trip_id: 'trip-alps-2026',
      title: 'Dining Car Course Meal & Zermatt Crew Dinners',
      vendor: 'Glacier Express RhB & Chez Vrony',
      category: 'Meals & Craft',
      expense_date: '2026-09-18',
      amount_original: 640,
      currency: 'CHF',
      exchange_rate: 1.155,
      amount_usd: 739.20,
      payment_method: 'Chase Ink Business',
      paid_by: 'Channel Card',
      tax_deductible: 1,
      reimbursable: 0,
      receipt_data: '',
      receipt_name: '',
      notes: 'On-camera train meal review + crew dinners.'
    }
  ];

  const insertExpense = db.prepare(`
    INSERT INTO expenses (
      id, trip_id, title, vendor, category, expense_date,
      amount_original, currency, exchange_rate, amount_usd,
      payment_method, paid_by, tax_deductible, reimbursable,
      receipt_data, receipt_name, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const e of expenses) {
    insertExpense.run(
      e.id, e.trip_id, e.title, e.vendor, e.category, e.expense_date,
      e.amount_original, e.currency, e.exchange_rate, e.amount_usd,
      e.payment_method, e.paid_by, e.tax_deductible, e.reimbursable,
      e.receipt_data, e.receipt_name, e.notes, now
    );
  }

  const revenues = [
    {
      id: 'rev-jp-1',
      trip_id: 'trip-japan-2026',
      title: '60s Mid-Roll Sponsor Integration (Ep 1: Sleeper Train)',
      source_type: 'Sponsor Integration',
      sponsor_name: 'Surfshark VPN',
      video_title: '24 Hours on Japan’s Last Sunrise Sleeper Train',
      amount_usd: 8500,
      status: 'invoiced',
      revenue_date: '2026-11-04',
      notes: 'Net-30 invoice sent upon rough cut approval.'
    },
    {
      id: 'rev-jp-2',
      trip_id: 'trip-japan-2026',
      title: '90s Integration (Ep 2: Kyoto Ryokan)',
      source_type: 'Sponsor Integration',
      sponsor_name: 'Peak Design',
      video_title: 'Inside a $1,100/Night 400-Year-Old Kyoto Ryokan',
      amount_usd: 6000,
      status: 'paid',
      revenue_date: '2026-11-05',
      notes: '50% upfront + 50% on deliverable.'
    },
    {
      id: 'rev-jp-3',
      trip_id: 'trip-japan-2026',
      title: 'Projected 30-Day YouTube AdSense (3-Video Series)',
      source_type: 'YouTube AdSense',
      sponsor_name: 'YouTube Partner Program',
      video_title: 'Japan Series (3 Episodes)',
      amount_usd: 4200,
      status: 'projected',
      revenue_date: '2026-11-12',
      notes: 'Estimated at $11.50 RPM across ~365k projected views.'
    },
    {
      id: 'rev-is-1',
      trip_id: 'trip-iceland-2026',
      title: 'Dedicated Gear Sponsor Integration',
      source_type: 'Sponsor Integration',
      sponsor_name: 'Jackery Power',
      video_title: 'Surviving 8 Days in an Arctic Glacier Storm',
      amount_usd: 9000,
      status: 'paid',
      revenue_date: '2026-10-22',
      notes: 'Paid via ACH.'
    },
    {
      id: 'rev-is-2',
      trip_id: 'trip-iceland-2026',
      title: 'YouTube AdSense (Oct Payout)',
      source_type: 'YouTube AdSense',
      sponsor_name: 'YouTube Partner Program',
      video_title: 'Iceland Series (2 Episodes)',
      amount_usd: 5140,
      status: 'paid',
      revenue_date: '2026-10-31',
      notes: '412k combined views.'
    },
    {
      id: 'rev-ch-1',
      trip_id: 'trip-alps-2026',
      title: 'Integrated Travel App Sponsorship',
      source_type: 'Sponsor Integration',
      sponsor_name: 'Holafly eSIM',
      video_title: '$50 vs $1,000 Swiss Alps Train across Europe',
      amount_usd: 7500,
      status: 'paid',
      revenue_date: '2026-09-25',
      notes: 'Paid in full + affiliate bonus.'
    },
    {
      id: 'rev-ch-2',
      trip_id: 'trip-alps-2026',
      title: 'YouTube AdSense (Sep Payout)',
      source_type: 'YouTube AdSense',
      sponsor_name: 'YouTube Partner Program',
      video_title: 'Swiss Alps Rail Series',
      amount_usd: 6280,
      status: 'paid',
      revenue_date: '2026-09-30',
      notes: '520k views across 2 episodes.'
    }
  ];

  const insertRevenue = db.prepare(`
    INSERT INTO revenues (
      id, trip_id, title, source_type, sponsor_name, video_title,
      amount_usd, status, revenue_date, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const r of revenues) {
    insertRevenue.run(
      r.id, r.trip_id, r.title, r.source_type, r.sponsor_name,
      r.video_title, r.amount_usd, r.status, r.revenue_date, r.notes, now
    );
  }
}

const DEFAULT_REWARDS_DATA = {
  programs: [
    {
      id: 'prog-chase-ur',
      name: 'Chase Ultimate Rewards',
      ecosystem: 'bank',
      status_tier: 'Sapphire Reserve + Ink',
      member_id: 'UR-8841-902',
      points: 342500,
      cpp: 2.0,
      qualifying_nights: 0,
      target_nights: 0,
      metric_label: '',
      expiration_policy: 'Never expires while card open',
      transfer_partners: 'World of Hyatt (1:1 Instant), United (1:1), Aeroplan (1:1), British Airways Avios (1:1), Flying Blue (1:1), Virgin Atlantic (1:1)',
      notes: 'Primary hotel transfer hub for World of Hyatt 1:1.'
    },
    {
      id: 'prog-amex-mr',
      name: 'Amex Membership Rewards',
      ecosystem: 'bank',
      status_tier: 'Biz Platinum + Gold',
      member_id: 'MR-4410-778',
      points: 418000,
      cpp: 2.0,
      qualifying_nights: 0,
      target_nights: 0,
      metric_label: '',
      expiration_policy: 'Never expires while 1 MR card open',
      transfer_partners: 'ANA (1:1 ~48h), Aeroplan (1:1 Instant), Delta (1:1), Flying Blue (1:1), Avios (1:1), Hilton (1:2)',
      notes: 'Best for international Business Class flights (ANA, Aeroplan, Flying Blue).'
    },
    {
      id: 'prog-capone',
      name: 'Capital One Miles',
      ecosystem: 'bank',
      status_tier: 'Venture X',
      member_id: 'C1-9920-314',
      points: 165000,
      cpp: 1.85,
      qualifying_nights: 0,
      target_nights: 0,
      metric_label: '',
      expiration_policy: 'Never expires while card open',
      transfer_partners: 'Aeroplan (1:1), Flying Blue (1:1), British Airways (1:1), Turkish Miles&Smiles (1:1), Wyndham (1:1)',
      notes: '2x catch-all miles + can erase miscellaneous travel purchases at 1.0¢/pt.'
    },
    {
      id: 'prog-bilt',
      name: 'Bilt Rewards',
      ecosystem: 'bank',
      status_tier: 'Gold Status',
      member_id: 'BILT-5521',
      points: 94000,
      cpp: 2.1,
      qualifying_nights: 0,
      target_nights: 0,
      metric_label: '',
      expiration_policy: 'Never expires',
      transfer_partners: 'World of Hyatt (1:1 Instant), Alaska Airlines (1:1), United (1:1), Aeroplan (1:1), Flying Blue (1:1)',
      notes: 'Valuable 1:1 transfer partner for both Alaska Airlines & World of Hyatt.'
    },
    {
      id: 'prog-hyatt',
      name: 'World of Hyatt',
      ecosystem: 'hotel',
      status_tier: 'Globalist',
      member_id: '520918442',
      points: 186000,
      cpp: 2.1,
      qualifying_nights: 48,
      target_nights: 60,
      metric_label: 'Qualifying Nights toward Globalist',
      expiration_policy: '24 months inactivity',
      transfer_partners: 'Receive 1:1 from Chase UR & Bilt Rewards',
      notes: 'Free suite upgrades, 4pm late checkout, waived resort fees & free breakfast for 2.'
    },
    {
      id: 'prog-marriott',
      name: 'Marriott Bonvoy',
      ecosystem: 'hotel',
      status_tier: 'Titanium Elite',
      member_id: '881049215',
      points: 274000,
      cpp: 0.85,
      qualifying_nights: 62,
      target_nights: 75,
      metric_label: 'Elite Nights (incl. 40 CC nights)',
      expiration_policy: '24 months inactivity',
      transfer_partners: '5th Night Free on award stays + transfers to 35+ airlines (3:1)',
      notes: 'Stacks 25 nights (Brilliant) + 15 nights (Business card) = 40 automatic Elite Nights/yr.'
    },
    {
      id: 'prog-hilton',
      name: 'Hilton Honors',
      ecosystem: 'hotel',
      status_tier: 'Diamond',
      member_id: '774190231',
      points: 310000,
      cpp: 0.5,
      qualifying_nights: 28,
      target_nights: 60,
      metric_label: 'Nights (Auto-Diamond via Aspire)',
      expiration_policy: '24 months inactivity',
      transfer_partners: 'Amex MR transfers 1:2 (often 1:2.6 with bonus) • 5th Night Free on points',
      notes: 'Automatic top-tier Diamond status via Hilton Aspire card.'
    },
    {
      id: 'prog-united',
      name: 'United MileagePlus',
      ecosystem: 'airline',
      status_tier: 'Premier Platinum',
      member_id: 'UA-994120',
      points: 142000,
      cpp: 1.35,
      qualifying_nights: 11400,
      target_nights: 15000,
      metric_label: 'PQP toward Premier 1K',
      expiration_policy: 'Miles never expire',
      transfer_partners: 'Star Alliance • Instant 1:1 from Chase UR & Bilt',
      notes: 'Excursionist Perk gives a free intra-region one-way flight on multi-city award trips.'
    },
    {
      id: 'prog-aeroplan',
      name: 'Air Canada Aeroplan',
      ecosystem: 'airline',
      status_tier: '50K Elite (Star Gold)',
      member_id: 'AC-3381904',
      points: 115000,
      cpp: 1.65,
      qualifying_nights: 38,
      target_nights: 50,
      metric_label: 'Status Qualifying Segments',
      expiration_policy: '18 months inactivity',
      transfer_partners: 'Star Alliance + Emirates/Etihad • 1:1 from Amex, Chase, CapOne, Bilt',
      notes: 'Add a multi-day stopover on any international one-way award for just 5,000 points!'
    },
    {
      id: 'prog-ana',
      name: 'ANA Mileage Club',
      ecosystem: 'airline',
      status_tier: 'Bronze',
      member_id: 'NH-4429108',
      points: 95000,
      cpp: 1.9,
      qualifying_nights: 0,
      target_nights: 0,
      metric_label: '',
      expiration_policy: 'Hard 36-month expiration from transfer',
      transfer_partners: 'Star Alliance • 1:1 from Amex MR (~48 hrs)',
      notes: 'Sweet spot: US to Tokyo roundtrip in "The Room" Business Class for 105k–110k miles.'
    }
  ],
  certificates: [
    {
      id: 'cert-hyatt-14',
      title: 'World of Hyatt Cat 1–4 Free Night Award',
      type: 'Free Night Certificate',
      program: 'World of Hyatt',
      source_card: 'Chase World of Hyatt Card',
      cap_details: 'Category 1–4 Standard Room (up to 18,000 pts peak)',
      expires_date: '2026-12-18',
      est_value_usd: 320,
      status: 'available',
      notes: 'Expiring soon! Use for Hyatt Centric or pre-flight airport hotel.'
    },
    {
      id: 'cert-hyatt-17',
      title: 'World of Hyatt Cat 1–7 Free Night Award',
      type: 'Free Night Certificate',
      program: 'World of Hyatt',
      source_card: '60-Night Globalist Milestone',
      cap_details: 'Category 1–7 Standard Room (up to 35,000 pts peak)',
      expires_date: '2027-03-15',
      est_value_usd: 780,
      status: 'available',
      notes: 'Save for Park Hyatt Kyoto or Andaz Tokyo Toranomon Hills.'
    },
    {
      id: 'cert-marriott-85k',
      title: 'Marriott Bonvoy 85,000-Pt Free Night Award',
      type: 'Free Night Certificate',
      program: 'Marriott Bonvoy',
      source_card: 'Amex Marriott Bonvoy Brilliant',
      cap_details: 'Up to 85k pts + 15k point top-off (100,000 pts max)',
      expires_date: '2027-04-30',
      est_value_usd: 680,
      status: 'available',
      notes: 'Can top off up to 100k pts for Ritz-Carlton Kyoto or Tokyo EDITION.'
    },
    {
      id: 'cert-marriott-35k',
      title: 'Marriott Bonvoy 35,000-Pt Free Night Award',
      type: 'Free Night Certificate',
      program: 'Marriott Bonvoy',
      source_card: 'Chase Marriott Boundless',
      cap_details: 'Up to 35k pts + 15k point top-off (50,000 pts max)',
      expires_date: '2027-02-10',
      est_value_usd: 260,
      status: 'available',
      notes: 'Good for 40k–50k Autograph Collection or Moxy/Courtyard shoot nights.'
    },
    {
      id: 'cert-hilton-aspire',
      title: 'Hilton Honors Uncapped Free Night Reward',
      type: 'Free Night Certificate',
      program: 'Hilton Honors',
      source_card: 'Amex Hilton Honors Aspire',
      cap_details: 'Uncapped Standard Room — Any Night of the Week',
      expires_date: '2027-06-01',
      est_value_usd: 850,
      status: 'available',
      notes: 'No point cap on Standard Room rewards! Use at Waldorf Astoria, Conrad, or Roku Kyoto LXR.'
    },
    {
      id: 'cert-hyatt-sua',
      title: 'Hyatt Suite Upgrade Award (SUA — Up to 7 Nights)',
      type: 'Suite / Flight Upgrade',
      program: 'World of Hyatt',
      source_card: '50-Night Milestone Reward',
      cap_details: 'Confirm a Standard Suite at time of booking for up to 7 nights',
      expires_date: '2027-02-28',
      est_value_usd: 900,
      status: 'available',
      notes: 'Locks in a confirmed suite months before the shoot.'
    },
    {
      id: 'cert-alaska-comp',
      title: 'Alaska Airlines Famous Companion Fare ($99 + tax)',
      type: 'Companion Pass',
      program: 'Alaska Mileage Plan',
      source_card: 'Alaska Airlines Visa Signature',
      cap_details: 'Roundtrip Economy Companion Ticket for $99 + taxes ($23 min)',
      expires_date: '2027-01-20',
      est_value_usd: 480,
      status: 'available',
      notes: 'Great for 2-person crew flights across North America or Hawaii.'
    },
    {
      id: 'cert-priority-pass',
      title: 'Priority Pass Select + Centurion & CapOne Lounges',
      type: 'Lounge & Security Perk',
      program: 'Amex Platinum / Venture X',
      source_card: 'Amex Business Platinum & Venture X',
      cap_details: '1,400+ Airport Lounges Worldwide',
      expires_date: '2027-12-31',
      est_value_usd: 469,
      status: 'available',
      notes: 'Saves $60–$100 per layover on crew airport meals and Wi-Fi.'
    },
    {
      id: 'cert-global-entry',
      title: 'Global Entry / TSA PreCheck & CLEAR Plus Membership',
      type: 'Lounge & Security Perk',
      program: 'US CBP / CLEAR',
      source_card: 'Amex Business Platinum ($199 CLEAR + $120 GE)',
      cap_details: 'Expedited US Customs & TSA PreCheck lanes with Pelican camera cases',
      expires_date: '2028-08-15',
      est_value_usd: 319,
      status: 'available',
      notes: '100% covered via annual card statement credits.'
    }
  ],
  cards: [
    {
      id: 'card-amex-biz-plat',
      name: 'Amex Business Platinum',
      issuer: 'American Express',
      ecosystem: 'Amex Membership Rewards',
      annual_fee: 695,
      renewal_date: '2027-03-01',
      multipliers: '5x Flights & Prepaid Hotels • 1.5x on $5,000+ & Camera Gear/Electronics',
      best_for: 'Flights, $5k+ Invoices, Camera/Electronics & Airport Lounges',
      ftf: 'None ($0 Foreign Tx Fee)',
      sub_active: false,
      sub_target_usd: 15000,
      sub_spent_manual_usd: 15000,
      sub_bonus_label: '150,000 Amex MR pts (Earned ✓)',
      sub_deadline: '2026-08-01',
      credits: [
        { id: 'c1', name: '$400 Dell Technologies Credit ($200 Jan–Jun / $200 Jul–Dec)', total_usd: 400, used_usd: 400 },
        { id: 'c2', name: '$200 Airline Incidental Fee Credit (Baggage / United TravelBank)', total_usd: 200, used_usd: 200 },
        { id: 'c3', name: '$199 CLEAR Plus Annual Membership Credit', total_usd: 199, used_usd: 199 },
        { id: 'c4', name: '$150 Adobe Creative Cloud / Premiere Pro Credit', total_usd: 150, used_usd: 150 },
        { id: 'c5', name: '$120 Wireless Phone Service Credit ($10/mo)', total_usd: 120, used_usd: 100 }
      ]
    },
    {
      id: 'card-chase-ink',
      name: 'Chase Ink Business Preferred',
      issuer: 'Chase',
      ecosystem: 'Chase Ultimate Rewards',
      annual_fee: 95,
      renewal_date: '2027-05-15',
      multipliers: '3x All Travel (Hotels, JR Rail, Ferries, Flights, Campers) • 3x Internet, Shipping & Ads',
      best_for: '3x Overseas Trains, Ferries, Campervans, Hotels & Tolls',
      ftf: 'None ($0 Foreign Tx Fee)',
      sub_active: true,
      sub_target_usd: 8000,
      sub_spent_manual_usd: 3400,
      sub_bonus_label: '100,000 Chase UR pts ($2,000 value)',
      sub_deadline: '2026-12-20',
      credits: [
        { id: 'c1', name: 'Cell Phone Protection ($1,000/claim for crew phones)', total_usd: 150, used_usd: 150 },
        { id: 'c2', name: 'Primary Rental Car CDW Collision Coverage', total_usd: 200, used_usd: 200 }
      ]
    },
    {
      id: 'card-venture-x',
      name: 'Capital One Venture X',
      issuer: 'Capital One',
      ecosystem: 'Capital One Miles',
      annual_fee: 395,
      renewal_date: '2027-02-01',
      multipliers: '2x Everywhere Catch-All • 10x Portal Hotels & Rental Cars • 5x Portal Flights',
      best_for: '2x Everywhere Catch-All (Permits, Local Fixers, Non-Category Spend)',
      ftf: 'None ($0 Foreign Tx Fee)',
      sub_active: false,
      sub_target_usd: 4000,
      sub_spent_manual_usd: 4000,
      sub_bonus_label: '75,000 Capital One Miles (Earned ✓)',
      sub_deadline: '2026-05-01',
      credits: [
        { id: 'c1', name: '$300 Annual Capital One Travel Portal Credit', total_usd: 300, used_usd: 300 },
        { id: 'c2', name: '10,000 Anniversary Bonus Miles ($185 value)', total_usd: 185, used_usd: 185 }
      ]
    },
    {
      id: 'card-amex-gold',
      name: 'Amex Gold Card',
      issuer: 'American Express',
      ecosystem: 'Amex Membership Rewards',
      annual_fee: 325,
      renewal_date: '2027-04-10',
      multipliers: '4x Restaurants Worldwide • 4x US Supermarkets • 3x Flights Booked Direct',
      best_for: '4x Crew Meals, Restaurants, Street Food & Groceries',
      ftf: 'None ($0 Foreign Tx Fee)',
      sub_active: true,
      sub_target_usd: 6000,
      sub_spent_manual_usd: 4250,
      sub_bonus_label: '90,000 Amex MR pts ($1,800 value)',
      sub_deadline: '2026-12-05',
      credits: [
        { id: 'c1', name: '$120 Uber Cash ($10/mo Rides or Uber Eats)', total_usd: 120, used_usd: 100 },
        { id: 'c2', name: '$120 Dining Credit ($10/mo Grubhub / Five Guys)', total_usd: 120, used_usd: 90 },
        { id: 'c3', name: '$100 Resy Restaurant Credit ($50 Jan–Jun / $50 Jul–Dec)', total_usd: 100, used_usd: 50 },
        { id: 'c4', name: '$84 Dunkin’ Credit ($7/mo)', total_usd: 84, used_usd: 63 }
      ]
    },
    {
      id: 'card-hilton-aspire',
      name: 'Amex Hilton Honors Aspire',
      issuer: 'American Express',
      ecosystem: 'Hilton Honors',
      annual_fee: 550,
      renewal_date: '2027-06-01',
      multipliers: '14x Hilton Portfolio (34x total w/ Diamond) • 7x Flights & Dining',
      best_for: 'Hilton Stays, Automatic Diamond Status, Resort & Airline Credits',
      ftf: 'None ($0 Foreign Tx Fee)',
      sub_active: false,
      sub_target_usd: 6000,
      sub_spent_manual_usd: 6000,
      sub_bonus_label: '175,000 Hilton pts (Earned ✓)',
      sub_deadline: '2026-06-01',
      credits: [
        { id: 'c1', name: '$400 Hilton Resort Credit ($200 Jan–Jun / $200 Jul–Dec)', total_usd: 400, used_usd: 200 },
        { id: 'c2', name: '$200 Flight Credit ($50 per quarter on any airline)', total_usd: 200, used_usd: 150 },
        { id: 'c3', name: 'Annual Uncapped Free Night Reward (worth ~$850)', total_usd: 850, used_usd: 850 }
      ]
    },
    {
      id: 'card-hyatt',
      name: 'Chase World of Hyatt Card',
      issuer: 'Chase',
      ecosystem: 'World of Hyatt',
      annual_fee: 95,
      renewal_date: '2026-12-18',
      multipliers: '9x Total at Hyatt (4x Card + 5x Base) • 2x Dining, Flights & Local Transit',
      best_for: 'Hyatt Stays + 5 Automatic Elite Nights + Cat 1–4 Free Night',
      ftf: 'None ($0 Foreign Tx Fee)',
      sub_active: false,
      sub_target_usd: 3000,
      sub_spent_manual_usd: 3000,
      sub_bonus_label: '60,000 Hyatt pts (Earned ✓)',
      sub_deadline: '2026-03-01',
      credits: [
        { id: 'c1', name: 'Annual Category 1–4 Free Night Certificate (~$320 value)', total_usd: 320, used_usd: 320 },
        { id: 'c2', name: '5 Tier-Qualifying Night Credits toward Globalist', total_usd: 100, used_usd: 100 }
      ]
    }
  ],
  redemptions: [
    {
      id: 'red-jp-1',
      trip_id: 'trip-japan-2026',
      date: '2026-11-07',
      title: 'Park Hyatt Kyoto — 2 Nights Standard Suite (Points + SUA)',
      program: 'World of Hyatt',
      redemption_type: 'Points + Suite Upgrade',
      points_used: 90000,
      cash_price_usd: 3400,
      taxes_fees_usd: 0,
      net_saved_usd: 3400,
      cpp: 3.78,
      notes: 'Transferred 90k Chase UR -> Hyatt 1:1 instant + applied Globalist Suite Upgrade Award.'
    },
    {
      id: 'red-jp-2',
      trip_id: 'trip-japan-2026',
      date: '2026-11-01',
      title: 'Conrad Tokyo Bay View Suite — 1 Night Arrival Stay',
      program: 'Hilton Honors',
      redemption_type: 'Free Night Certificate',
      points_used: 0,
      cash_price_usd: 920,
      taxes_fees_usd: 0,
      net_saved_usd: 920,
      cpp: 0,
      notes: 'Used Hilton Aspire Uncapped Free Night Certificate + free Diamond breakfast.'
    },
    {
      id: 'red-ch-1',
      trip_id: 'trip-alps-2026',
      date: '2026-09-14',
      title: 'SWISS Business Class JFK → Zurich (2 Crew Lie-Flat Seats)',
      program: 'Air Canada Aeroplan',
      redemption_type: 'Airline Miles',
      points_used: 140000,
      cash_price_usd: 6400,
      taxes_fees_usd: 168,
      net_saved_usd: 6232,
      cpp: 4.45,
      notes: '70k Aeroplan miles per person transferred 1:1 from Amex MR with $0 fuel surcharges.'
    },
    {
      id: 'red-is-1',
      trip_id: 'trip-iceland-2026',
      date: '2026-10-17',
      title: 'The Reykjavik EDITION — Finale Wrap Night',
      program: 'Marriott Bonvoy',
      redemption_type: 'Free Night Certificate + Top-Off',
      points_used: 12000,
      cash_price_usd: 740,
      taxes_fees_usd: 0,
      net_saved_usd: 740,
      cpp: 6.17,
      notes: '85k Marriott Brilliant Free Night Cert + 12k point top-off.'
    }
  ]
};

seedIfNeeded();

function getRewardsData() {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'rewards_data'").get();
  if (row && row.value) {
    try {
      const parsed = JSON.parse(row.value);
      if (parsed && Array.isArray(parsed.programs)) {
        return parsed;
      }
    } catch (e) {}
  }
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(
    'rewards_data',
    JSON.stringify(DEFAULT_REWARDS_DATA)
  );
  return DEFAULT_REWARDS_DATA;
}

function getSettingsMap() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const map = {
    channel_name: 'Wander Wallet',
    home_currency: 'USD',
    meal_deduction_rate: '100',
    sponsors_enabled: false,
    exchange_rates: DEFAULT_RATES,
    tax_categories: null,
    ecosystem_colors: null,
    ai_provider: 'gemini',
    ai_key_configured: Boolean(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY)
  };
  for (const r of rows) {
    if (r.key.startsWith('auth_') || r.key === 'rewards_data' || r.key.startsWith('travel_secret_')) continue;
    if (r.key === 'ai_api_key') {
      if (r.value && String(r.value).trim()) {
        map.ai_key_configured = true;
      }
      continue;
    }
    if (r.key === 'sponsors_enabled') {
      map.sponsors_enabled = r.value === 'true' || r.value === '1';
      continue;
    }
    if (r.key === 'exchange_rates') {
      try {
        map.exchange_rates = { ...DEFAULT_RATES, ...JSON.parse(r.value) };
      } catch {
        map.exchange_rates = DEFAULT_RATES;
      }
    } else if (r.key === 'tax_categories') {
      try {
        map.tax_categories = JSON.parse(r.value);
      } catch {
        map.tax_categories = null;
      }
    } else if (r.key === 'ecosystem_colors') {
      try {
        map.ecosystem_colors = JSON.parse(r.value);
      } catch {
        map.ecosystem_colors = null;
      }
    } else if (r.key === 'visited_places') {
      try {
        map.visited_places = JSON.parse(r.value);
      } catch {
        map.visited_places = { states: [], countries: [], excluded_states: [], excluded_countries: [] };
      }
    } else if (r.key === 'channel_name' && r.value === 'Nomad Frame Studios') {
      map.channel_name = 'Wander Wallet';
    } else {
      map[r.key] = r.value;
    }
  }
  return map;
}

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(String(password), String(salt), 100000, 64, 'sha512').toString('hex');
}

function getGoogleAuthConfig() {
  const clientRow = db.prepare("SELECT value FROM settings WHERE key = 'auth_google_client_id'").get();
  const emailsRow = db.prepare("SELECT value FROM settings WHERE key = 'auth_allowed_emails'").get();
  const googleClientId = (process.env.GOOGLE_CLIENT_ID || (clientRow && clientRow.value) || '').trim();
  const allowedEmailsRaw = (process.env.ALLOWED_GOOGLE_EMAILS || (emailsRow && emailsRow.value) || '').trim();
  const allowedEmails = allowedEmailsRaw
    .split(/[\s,;]+/)
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return {
    googleClientId,
    allowedEmailsRaw,
    allowedEmails
  };
}

function getAuthCredentials() {
  const googleCfg = getGoogleAuthConfig();
  const envPassword = process.env.APP_PASSWORD;
  const envUsername = process.env.APP_USERNAME || 'admin';
  if (envPassword && String(envPassword).trim().length > 0) {
    return {
      configured: true,
      envManaged: true,
      username: envUsername.trim(),
      ...googleCfg,
      verify: (inputPass) => {
        const a = Buffer.from(String(inputPass));
        const b = Buffer.from(String(envPassword));
        return a.length === b.length && crypto.timingSafeEqual(a, b);
      }
    };
  }

  const userRow = db.prepare("SELECT value FROM settings WHERE key = 'auth_username'").get();
  const hashRow = db.prepare("SELECT value FROM settings WHERE key = 'auth_password_hash'").get();
  const saltRow = db.prepare("SELECT value FROM settings WHERE key = 'auth_password_salt'").get();

  if (hashRow && saltRow && hashRow.value && saltRow.value) {
    return {
      configured: true,
      envManaged: false,
      username: (userRow && userRow.value) ? userRow.value : 'admin',
      ...googleCfg,
      verify: (inputPass) => {
        const computed = hashPassword(inputPass, saltRow.value);
        const a = Buffer.from(computed, 'hex');
        const b = Buffer.from(hashRow.value, 'hex');
        return a.length === b.length && crypto.timingSafeEqual(a, b);
      }
    };
  }

  return {
    configured: Boolean(googleCfg.googleClientId),
    envManaged: false,
    username: 'admin',
    ...googleCfg,
    verify: () => false
  };
}

// Signing secret must never be a value visible in the public repo.
// Priority: SESSION_SECRET env var -> derived from private env vars -> persisted SQLite secret.
const TOKEN_SIGNING_SECRET = (() => {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim()) return process.env.SESSION_SECRET.trim();
  const privateMaterial = [process.env.APP_PASSWORD, process.env.APP_USERNAME, process.env.GOOGLE_CLIENT_ID, process.env.ALLOWED_GOOGLE_EMAILS]
    .filter(Boolean)
    .join('|');
  if (process.env.APP_PASSWORD && privateMaterial) {
    return crypto.createHash('sha256').update('ww-session-v1|' + privateMaterial).digest('hex');
  }
  try {
    const existing = db.prepare("SELECT value FROM settings WHERE key = 'auth_signing_secret'").get();
    if (existing && existing.value) return existing.value;
    const generated = crypto.randomBytes(32).toString('hex');
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('auth_signing_secret', generated);
    return generated;
  } catch (e) {
    return crypto.randomBytes(32).toString('hex');
  }
})();

function signStatelessToken(username, expiresAt) {
  const safeUser = Buffer.from(String(username || 'admin'), 'utf8').toString('base64url');
  const payload = `${safeUser}.${expiresAt}`;
  const sig = crypto.createHmac('sha256', TOKEN_SIGNING_SECRET).update(payload).digest('base64url');
  return `ww1.${payload}.${sig}`;
}

function verifyStatelessToken(token) {
  if (!token || !token.startsWith('ww1.')) return null;
  const parts = token.split('.');
  if (parts.length !== 4) return null;
  const [, safeUser, expStr, sig] = parts;
  const expiresAt = Number(expStr);
  if (!expiresAt || expiresAt < Date.now()) return null;
  const payload = `${safeUser}.${expStr}`;
  const expectedSig = crypto.createHmac('sha256', TOKEN_SIGNING_SECRET).update(payload).digest('base64url');
  if (sig !== expectedSig) return null;
  let username = 'admin';
  try {
    username = Buffer.from(safeUser, 'base64url').toString('utf8') || 'admin';
  } catch (e) {}
  return { token, username, expires_at: expiresAt };
}

function createAuthSession(username, rememberDays = 30) {
  const durationMs = (Number(rememberDays) || 30) * 24 * 60 * 60 * 1000;
  const expiresAt = Date.now() + durationMs;
  const token = signStatelessToken(username, expiresAt);
  const now = new Date().toISOString();
  db.prepare('DELETE FROM auth_sessions WHERE expires_at < ?').run(Date.now());
  db.prepare('INSERT OR REPLACE INTO auth_sessions (token, username, expires_at, created_at) VALUES (?, ?, ?, ?)').run(
    token,
    username,
    expiresAt,
    now
  );
  return { token, expiresAt, maxAgeSeconds: Math.floor(durationMs / 1000) };
}

function parseCookies(req) {
  const raw = req.headers.cookie || '';
  const out = {};
  raw.split(';').forEach(part => {
    const idx = part.indexOf('=');
    if (idx > 0) {
      const k = part.slice(0, idx).trim();
      const v = part.slice(idx + 1).trim();
      out[k] = decodeURIComponent(v);
    }
  });
  return out;
}

function getAuthenticatedSession(req, parsedUrl) {
  let token = '';
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }
  if (!token) {
    const cookies = parseCookies(req);
    if (cookies.ww_session) token = cookies.ww_session;
  }
  if (!token && parsedUrl && parsedUrl.searchParams.get('token')) {
    token = parsedUrl.searchParams.get('token');
  }
  if (!token) return null;

  // 1. Check stateless signed token first (survives container restarts/redeploys!)
  const stateless = verifyStatelessToken(token);
  if (stateless) return stateless;

  // 2. Fallback to SQLite auth_sessions table
  const row = db.prepare('SELECT token, username, expires_at FROM auth_sessions WHERE token = ?').get(token);
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    db.prepare('DELETE FROM auth_sessions WHERE token = ?').run(token);
    return null;
  }
  return row;
}

function markServerModified(ts = Date.now()) {
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  upsert.run('user_modified', 'true');
  upsert.run('updated_at', String(ts));
}

function getEmailSyncStatus() {
  const getVal = k => {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(k);
    return row ? row.value : '';
  };
  return {
    imap_configured: Boolean(getVal('travel_imap_host') && getVal('travel_imap_user') && getVal('travel_secret_imap_pass')),
    imap_host: getVal('travel_imap_host') || '',
    imap_port: Number(getVal('travel_imap_port')) || 993,
    imap_user: getVal('travel_imap_user') || '',
    gmail_configured: Boolean(getVal('travel_gmail_client_id') && getVal('travel_secret_gmail_client_secret')),
    gmail_connected: Boolean(getVal('travel_secret_gmail_refresh_token')),
    gmail_client_id: getVal('travel_gmail_client_id') || '',
    auto_sync_minutes: getVal('travel_auto_sync_minutes') !== '' ? Number(getVal('travel_auto_sync_minutes')) : 360,
    last_sync_at: getVal('travel_last_sync_at') || '',
    last_sync_summary: getVal('travel_last_sync_summary') || ''
  };
}

function repairExistingIataReservations() {
  try {
    const allRes = db.prepare('SELECT * FROM reservations').all();
    const allInbox = db.prepare('SELECT * FROM travel_inbox').all();
    const updRes = db.prepare(`
      UPDATE reservations
      SET title = ?, start_datetime = ?, end_datetime = ?, details_json = ?
      WHERE id = ?
    `);
    for (const r of allRes) {
      const sourceText = `${r.notes || ''} ${r.title || ''}`;
      const iataMatch = sourceText.match(/\b(\d{1,2}\s*(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\s*2[4-9]|\d{1,2}\s*(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\s*202[4-9])\b/i);
      if (iataMatch && travelEngine.parseIataCompactDate) {
        const correctDate = travelEngine.parseIataCompactDate(iataMatch[1]);
        if (correctDate && (!(r.start_datetime || '').startsWith(correctDate) || (r.end_datetime && r.end_datetime < correctDate))) {
          const timePart = (r.start_datetime && r.start_datetime.includes('T')) ? r.start_datetime.split('T')[1] : '09:00';
          const nextStart = `${correctDate}T${timePart}`;
          const nextEnd = (r.end_datetime && r.end_datetime >= nextStart) ? r.end_datetime : '';
          let nextTitle = r.title;
          let det = {};
          try { det = JSON.parse(r.details_json || '{}'); } catch (e) {}
          const passMatch = sourceText.match(/Flight Receipt\s*[-–:]\s*([A-Z][A-Z\s.'-]{2,40}?)\s+\d{1,2}\s*(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)/i);
          if (passMatch && travelEngine.formatTitleCaseName) {
            const pName = travelEngine.formatTitleCaseName(passMatch[1]);
            det.passenger = pName;
            if (!nextTitle.includes(pName)) {
              nextTitle = `${nextTitle} (${pName})`;
            }
          }
          updRes.run(nextTitle, nextStart, nextEnd, JSON.stringify(det), r.id);
        }
      }
    }
    // Also repair any pending travel_inbox items whose subject has an IATA date
    const updInbox = db.prepare('UPDATE travel_inbox SET parsed_json = ? WHERE id = ?');
    for (const item of allInbox) {
      const iataMatch = (item.subject || '').match(/\b(\d{1,2}\s*(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\s*2[4-9]|\d{1,2}\s*(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\s*202[4-9])\b/i);
      if (iataMatch && travelEngine.parseIataCompactDate) {
        const correctDate = travelEngine.parseIataCompactDate(iataMatch[1]);
        if (correctDate) {
          let parsed = [];
          try { parsed = JSON.parse(item.parsed_json || '[]'); } catch (e) {}
          let changed = false;
          for (const c of parsed) {
            if (c.start_datetime && !c.start_datetime.startsWith(correctDate)) {
              const tPart = c.start_datetime.includes('T') ? c.start_datetime.split('T')[1] : '09:00';
              c.start_datetime = `${correctDate}T${tPart}`;
              changed = true;
            }
          }
          if (changed) updInbox.run(JSON.stringify(parsed), item.id);
        }
      }
    }
  } catch (e) {
    console.error('repairExistingIataReservations error:', e.message);
  }
}
repairExistingIataReservations();

let isTravelSyncRunning = false;
async function runTravelEmailSync() {
  if (isTravelSyncRunning) {
    return { skipped: true, scanned: 0, added: 0, errors: ['Sync already in progress'] };
  }
  isTravelSyncRunning = true;
  try {
    const getVal = k => ((db.prepare('SELECT value FROM settings WHERE key = ?').get(k) || {}).value || '');
    const savedKeyRow = db.prepare("SELECT value FROM settings WHERE key = 'ai_api_key'").get();
    const savedProvRow = db.prepare("SELECT value FROM settings WHERE key = 'ai_provider'").get();
    const aiKey = (savedKeyRow && savedKeyRow.value) || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || '';
    const aiProvider = (savedProvRow && savedProvRow.value) || '';

    let fetchedEmails = [];
    const errors = [];

    const imapHost = getVal('travel_imap_host');
    const imapPort = Number(getVal('travel_imap_port')) || 993;
    const imapUser = getVal('travel_imap_user');
    const imapPass = getVal('travel_secret_imap_pass');
    if (imapHost && imapUser && imapPass) {
      try {
        const imapList = await travelEngine.syncImapInbox({ host: imapHost, port: imapPort, user: imapUser, password: imapPass });
        fetchedEmails.push(...imapList);
      } catch (e) {
        errors.push(`IMAP: ${e.message}`);
      }
    }

    const gClientId = getVal('travel_gmail_client_id');
    const gSecret = getVal('travel_secret_gmail_client_secret');
    const gRefresh = getVal('travel_secret_gmail_refresh_token');
    if (gClientId && gSecret && gRefresh) {
      try {
        const refreshed = await travelEngine.refreshGmailToken({ refreshToken: gRefresh, clientId: gClientId, clientSecret: gSecret });
        const gList = await travelEngine.syncGmailInbox({ accessToken: refreshed.access_token });
        fetchedEmails.push(...gList);
      } catch (e) {
        errors.push(`Gmail: ${e.message}`);
      }
    }

    if (!imapHost && !gRefresh) {
      return { notConfigured: true, scanned: 0, added: 0, errors: [] };
    }

    let addedCount = 0;
    let updatedCount = 0;
    const insInbox = db.prepare(`
      INSERT INTO travel_inbox (id, message_uid, subject, sender, received_at, raw_snippet, parsed_json, parser_used, confidence, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `);

    for (const em of fetchedEmails) {
      const parsed = await travelEngine.parseTravelEmail({
        rawEmail: em.rawEmail || '',
        subject: em.subject || '',
        sender: em.sender || '',
        text: em.text || '',
        html: em.html || '',
        aiKey,
        aiProvider
      });
      if (!parsed.reservations || parsed.reservations.length === 0) continue;

      const exists = db.prepare('SELECT id, subject, status FROM travel_inbox WHERE message_uid = ?').get(em.uid);
      if (exists) {
        // Update existing inbox item & refresh any already-imported reservation from this email with improved parsed dates, full cost, and full email text
        db.prepare('UPDATE travel_inbox SET raw_snippet = ?, parsed_json = ?, parser_used = ?, confidence = ? WHERE id = ?').run(
          parsed.snippet || '', JSON.stringify(parsed.reservations), parsed.parser_used, parsed.confidence, exists.id
        );
        const cand = parsed.reservations[0];
        if (cand && (exists.subject || parsed.subject)) {
          const subjToMatch = exists.subject || parsed.subject;
          const rates = getSettingsMap().exchange_rates || DEFAULT_RATES;
          const matchingRes = db.prepare('SELECT * FROM reservations WHERE notes LIKE ?').all(`%${subjToMatch}%`);
          for (const mr of matchingRes) {
            const nextCur = (cand.cost_currency || mr.cost_currency || 'USD').toUpperCase();
            const nextAmt = Number(cand.cost_amount) > 0 ? Number(cand.cost_amount) : Number(mr.cost_amount) || 0;
            const nextUsd = Number((nextAmt * (Number(rates[nextCur]) || 1.0)).toFixed(2));
            let prevDet = {};
            try { prevDet = JSON.parse(mr.details_json || '{}'); } catch (e) {}
            const mergedDet = { ...prevDet, ...(cand.details || {}) };
            if (parsed.snippet && !mergedDet.full_email_text) {
              mergedDet.full_email_text = parsed.snippet;
            }
            db.prepare(`
              UPDATE reservations
              SET title = ?, vendor = ?, confirmation_code = ?, start_datetime = ?, end_datetime = ?,
                  location_from = ?, location_to = ?, cost_amount = ?, cost_currency = ?, cost_usd = ?, details_json = ?
              WHERE id = ?
            `).run(
              cand.title || mr.title,
              cand.vendor || mr.vendor,
              (cand.confirmation_code && cand.confirmation_code.length >= 6) ? cand.confirmation_code : mr.confirmation_code,
              cand.start_datetime || mr.start_datetime,
              cand.end_datetime || mr.end_datetime,
              cand.location_from || mr.location_from,
              cand.location_to || mr.location_to,
              nextAmt,
              nextCur,
              nextUsd,
              JSON.stringify(mergedDet),
              mr.id
            );
            updatedCount++;
          }
        }
        continue;
      }

      const inboxId = 'tinbox-' + Date.now() + '-' + crypto.randomBytes(3).toString('hex');
      insInbox.run(
        inboxId, em.uid, parsed.subject || 'Travel Email', parsed.sender || '',
        em.received_at || new Date().toISOString(), parsed.snippet || '',
        JSON.stringify(parsed.reservations), parsed.parser_used, parsed.confidence, new Date().toISOString()
      );
      addedCount++;
    }

    repairExistingIataReservations();
    const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    upsert.run('travel_last_sync_at', new Date().toISOString());
    upsert.run('travel_last_sync_summary', `Scanned ${fetchedEmails.length} email(s), queued ${addedCount} new, refreshed ${updatedCount} existing.${errors.length ? ' Errors: ' + errors.join('; ') : ''}`);
    markServerModified();

    return { ok: true, scanned: fetchedEmails.length, added: addedCount, updated: updatedCount, errors };
  } finally {
    isTravelSyncRunning = false;
  }
}

function getBootstrapData() {
  const settings = getSettingsMap();
  const trips = db.prepare('SELECT * FROM trips ORDER BY start_date DESC').all();
  const expenses = db.prepare('SELECT * FROM expenses ORDER BY expense_date DESC, created_at DESC').all();
  const revenues = db.prepare('SELECT * FROM revenues ORDER BY revenue_date DESC, created_at DESC').all();
  const reservations = db.prepare('SELECT * FROM reservations ORDER BY start_datetime ASC, created_at DESC').all();
  const travel_inbox = db.prepare("SELECT * FROM travel_inbox WHERE status = 'pending' ORDER BY created_at DESC").all();
  const travel_documents = db.prepare('SELECT * FROM travel_documents ORDER BY expiry_date ASC, created_at DESC').all();
  const email_sync_status = getEmailSyncStatus();
  const rewards = getRewardsData();
  const modRow = db.prepare("SELECT value FROM settings WHERE key = 'user_modified'").get();
  const updRow = db.prepare("SELECT value FROM settings WHERE key = 'updated_at'").get();

  return {
    settings,
    trips,
    expenses,
    revenues,
    reservations,
    travel_inbox,
    travel_documents,
    email_sync_status,
    rewards,
    user_modified: modRow ? modRow.value === 'true' : false,
    updated_at: updRow ? Number(updRow.value) || 0 : 0
  };
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 15 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, data, extraHeaders = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders
  });
  res.end(JSON.stringify(data));
}

function escapeCsvCell(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  try {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;
    const method = req.method.toUpperCase();

    // Railway Healthcheck Endpoint (unauthenticated for container health probes)
    if (pathname === '/api/health' && method === 'GET') {
      return sendJson(res, 200, { status: 'ok', app: 'Wander Wallet', timestamp: new Date().toISOString() });
    }

    // Auth Status Endpoint
    if (pathname === '/api/auth/status' && method === 'GET') {
      const creds = getAuthCredentials();
      const session = getAuthenticatedSession(req, parsedUrl);
      return sendJson(res, 200, {
        configured: creds.configured || Boolean(session),
        envManaged: creds.envManaged,
        authenticated: Boolean(session),
        username: session ? session.username : creds.username,
        googleClientId: creds.googleClientId || '',
        allowedEmails: session ? creds.allowedEmailsRaw : ''
      });
    }

    // Google Sign-In Verification Endpoint
    if (pathname === '/api/auth/google' && method === 'POST') {
      const creds = getAuthCredentials();
      if (!creds.googleClientId) {
        return sendJson(res, 400, { error: 'Google Client ID is not configured yet.' });
      }
      const body = await readJsonBody(req);
      const idToken = String(body.credential || '').trim();
      if (!idToken) {
        return sendJson(res, 0 + 400, { error: 'Missing Google credential token.' });
      }

      const verifyRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
      );
      if (!verifyRes.ok) {
        return sendJson(res, 401, { error: 'Invalid or expired Google Sign-In token.' });
      }
      const tokenInfo = await verifyRes.json();
      if (tokenInfo.aud !== creds.googleClientId) {
        return sendJson(res, 401, { error: 'Google token Client ID mismatch.' });
      }
      if (String(tokenInfo.email_verified) !== 'true') {
        return sendJson(res, 401, { error: 'Google email is not verified.' });
      }

      const email = String(tokenInfo.email || '').trim().toLowerCase();
      if (creds.allowedEmails.length === 0) {
        // First Google sign-in automatically whitelists the owner's Gmail
        db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('auth_allowed_emails', email);
      } else if (!creds.allowedEmails.includes(email)) {
        return sendJson(res, 403, {
          error: `Access denied: ${email} is not on the approved Google email whitelist for this account.`
        });
      }

      const sess = createAuthSession(email, 30);
      return sendJson(
        res,
        200,
        {
          authenticated: true,
          configured: true,
          username: email,
          token: sess.token,
          expiresAt: sess.expiresAt
        },
        {
          'Set-Cookie': `ww_session=${sess.token}; Path=/; Max-Age=${sess.maxAgeSeconds}; HttpOnly; SameSite=Lax`
        }
      );
    }

    // First-Time Admin Setup Endpoint
    if (pathname === '/api/auth/setup' && method === 'POST') {
      const creds = getAuthCredentials();
      if (creds.configured) {
        return sendJson(res, 400, { error: 'Account security is already configured. Please sign in.' });
      }
      const reqBody = await readJsonBody(req);
      const username = String(reqBody.username || 'admin').trim() || 'admin';
      const password = String(reqBody.password || '');
      const googleClientId = String(reqBody.google_client_id || '').trim();
      const allowedEmails = String(reqBody.allowed_emails || '').trim();

      if (password && password.length < 4) {
        return sendJson(res, 400, { error: 'Password must be at least 4 characters.' });
      }
      if (!password && !googleClientId) {
        return sendJson(res, 400, { error: 'Please create a password or enter a Google Client ID.' });
      }

      const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
      if (password) {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = hashPassword(password, salt);
        upsert.run('auth_username', username);
        upsert.run('auth_password_salt', salt);
        upsert.run('auth_password_hash', hash);
      }
      if (googleClientId) upsert.run('auth_google_client_id', googleClientId);
      if (allowedEmails) upsert.run('auth_allowed_emails', allowedEmails);

      const sess = createAuthSession(username, 30);
      return sendJson(
        res,
        200,
        {
          authenticated: true,
          configured: true,
          username,
          token: sess.token,
          expiresAt: sess.expiresAt
        },
        {
          'Set-Cookie': `ww_session=${sess.token}; Path=/; Max-Age=${sess.maxAgeSeconds}; HttpOnly; SameSite=Lax`
        }
      );
    }

    // Login Endpoint
    if (pathname === '/api/auth/login' && method === 'POST') {
      const creds = getAuthCredentials();
      if (!creds.configured) {
        return sendJson(res, 400, { error: 'Please complete first-time password setup.' });
      }
      const body = await readJsonBody(req);
      const inputUser = String(body.username || '').trim();
      const inputPass = String(body.password || '');
      const rememberDays = body.remember === false ? 1 : 30;

      const userMatch = !inputUser || inputUser.toLowerCase() === creds.username.toLowerCase();
      if (!userMatch || !creds.verify(inputPass)) {
        return sendJson(res, 401, { error: 'Invalid username or password.' });
      }

      const sess = createAuthSession(creds.username, rememberDays);
      return sendJson(
        res,
        200,
        {
          authenticated: true,
          configured: true,
          username: creds.username,
          token: sess.token,
          expiresAt: sess.expiresAt
        },
        {
          'Set-Cookie': `ww_session=${sess.token}; Path=/; Max-Age=${sess.maxAgeSeconds}; HttpOnly; SameSite=Lax`
        }
      );
    }

    // Logout Endpoint
    if (pathname === '/api/auth/logout' && method === 'POST') {
      const session = getAuthenticatedSession(req, parsedUrl);
      if (session) {
        db.prepare('DELETE FROM auth_sessions WHERE token = ?').run(session.token);
      }
      return sendJson(
        res,
        200,
        { authenticated: false },
        {
          'Set-Cookie': 'ww_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax'
        }
      );
    }

    // Change Password & Google OAuth Settings Endpoint (requires active session)
    if (pathname === '/api/auth/change-password' && method === 'POST') {
      const session = getAuthenticatedSession(req, parsedUrl);
      const creds = getAuthCredentials();
      if (!session && creds.configured) {
        return sendJson(res, 401, { error: 'Authentication required.' });
      }
      const body = await readJsonBody(req);
      const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

      if (body.google_client_id !== undefined) {
        upsert.run('auth_google_client_id', String(body.google_client_id).trim());
      }
      if (body.allowed_emails !== undefined) {
        upsert.run('auth_allowed_emails', String(body.allowed_emails).trim());
      }

      const newPass = String(body.new_password || '');
      const newUsername = String(body.new_username || creds.username).trim() || creds.username;

      if (newPass) {
        if (creds.envManaged) {
          return sendJson(res, 400, {
            error: 'Password is managed via Railway APP_PASSWORD environment variable. Google settings were saved.'
          });
        }
        const currentPass = String(body.current_password || '');
        const hashRow = db.prepare("SELECT value FROM settings WHERE key = 'auth_password_hash'").get();
        if (hashRow && hashRow.value && !creds.verify(currentPass)) {
          return sendJson(res, 401, { error: 'Current password is incorrect.' });
        }
        if (newPass.length < 4) {
          return sendJson(res, 400, { error: 'New password must be at least 4 characters.' });
        }
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = hashPassword(newPass, salt);
        upsert.run('auth_username', newUsername);
        upsert.run('auth_password_salt', salt);
        upsert.run('auth_password_hash', hash);
      }

      return sendJson(res, 200, { ok: true, username: newUsername });
    }

    // Protect /api/* routes when authentication is configured
    if (pathname.startsWith('/api/')) {
      const session = getAuthenticatedSession(req, parsedUrl);
      const creds = getAuthCredentials();
      if (!session && creds.configured) {
        return sendJson(res, 401, {
          error: 'Unauthorized',
          configured: creds.configured,
          envManaged: creds.envManaged
        });
      }
    }

    // API Routes
    if (pathname === '/api/bootstrap' && method === 'GET') {
      return sendJson(res, 200, getBootstrapData());
    }

    // Full Two-Way Sync / Auto-Heal Endpoint (restores client local backup if container restarted)
    if (pathname === '/api/sync' && method === 'POST') {
      const body = await readJsonBody(req);
      const now = new Date().toISOString();

      if (Array.isArray(body.trips) && (body.trips.length > 0 || body.user_modified)) {
        db.exec('PRAGMA foreign_keys = OFF;');
        db.exec('DELETE FROM trips;');
        const insTrip = db.prepare(`
          INSERT OR REPLACE INTO trips (id, name, destination, country_code, default_currency, start_date, end_date, budget_usd, video_count, status, notes, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const t of body.trips) {
          insTrip.run(
            t.id || ('trip-' + Date.now() + Math.random().toString(36).slice(2, 5)),
            t.name || 'Untitled Trip',
            t.destination || 'On the Road',
            t.country_code || 'US',
            t.default_currency || 'USD',
            t.start_date || now.slice(0, 10),
            t.end_date || now.slice(0, 10),
            Number(t.budget_usd) || 5000,
            Number(t.video_count) || 1,
            t.status || 'active',
            t.notes || '',
            t.created_at || now
          );
        }

        if (Array.isArray(body.expenses)) {
          db.exec('DELETE FROM expenses;');
          const insExp = db.prepare(`
            INSERT OR REPLACE INTO expenses (
              id, trip_id, title, vendor, category, expense_date,
              amount_original, currency, exchange_rate, amount_usd,
              payment_method, paid_by, tax_deductible, reimbursable,
              receipt_data, receipt_name, notes, credit_usd, credit_verified, credit_note, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const e of body.expenses) {
            insExp.run(
              e.id || ('exp-' + Date.now() + Math.random().toString(36).slice(2, 5)),
              e.trip_id,
              e.title || 'Untitled Expense',
              e.vendor || '',
              e.category || 'Dining & Meals',
              e.expense_date || now.slice(0, 10),
              Number(e.amount_original) || 0,
              e.currency || 'USD',
              Number(e.exchange_rate) || 1,
              Number(e.amount_usd) || 0,
              e.payment_method || 'Primary Card',
              e.paid_by || 'Primary Card',
              e.tax_deductible === false || e.tax_deductible === 0 ? 0 : 1,
              e.reimbursable ? 1 : 0,
              e.receipt_data || '',
              e.receipt_name || '',
              e.notes || '',
              Number(e.credit_usd) || 0,
              e.credit_verified ? 1 : 0,
              e.credit_note || '',
              e.created_at || now
            );
          }
        }

        if (Array.isArray(body.revenues)) {
          db.exec('DELETE FROM revenues;');
          const insRev = db.prepare(`
            INSERT OR REPLACE INTO revenues (
              id, trip_id, title, source_type, sponsor_name, video_title,
              amount_usd, status, revenue_date, notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const r of body.revenues) {
            insRev.run(
              r.id || ('rev-' + Date.now() + Math.random().toString(36).slice(2, 5)),
              r.trip_id,
              r.title || 'Sponsor Revenue',
              r.source_type || 'Sponsor Integration',
              r.sponsor_name || '',
              r.video_title || '',
              Number(r.amount_usd) || 0,
              r.status || 'paid',
              r.revenue_date || now.slice(0, 10),
              r.notes || '',
              r.created_at || now
            );
          }
        }
        db.exec('PRAGMA foreign_keys = ON;');
      }

      if (body.rewards && Array.isArray(body.rewards.programs)) {
        const currentRew = getRewardsData();
        const syncedRewards = {
          programs: body.rewards.programs,
          certificates: Array.isArray(body.rewards.certificates) ? body.rewards.certificates : currentRew.certificates,
          cards: Array.isArray(body.rewards.cards) ? body.rewards.cards : currentRew.cards,
          redemptions: Array.isArray(body.rewards.redemptions) ? body.rewards.redemptions : currentRew.redemptions,
          owners: Array.isArray(body.rewards.owners) ? body.rewards.owners.map(o => String(o).trim()).filter(Boolean).slice(0, 12) : (currentRew.owners || []),
          deleted_ids: Array.isArray(body.rewards.deleted_ids) ? body.rewards.deleted_ids.slice(-200) : (currentRew.deleted_ids || []),
          ecosystem_colors: body.rewards.ecosystem_colors || currentRew.ecosystem_colors || null
        };
        db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(
          'rewards_data',
          JSON.stringify(syncedRewards)
        );
      }

      if (body.settings && typeof body.settings === 'object') {
        const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
        if (body.settings.channel_name) upsert.run('channel_name', String(body.settings.channel_name));
        if (body.settings.home_currency) upsert.run('home_currency', String(body.settings.home_currency));
        if (body.settings.meal_deduction_rate) upsert.run('meal_deduction_rate', String(body.settings.meal_deduction_rate));
        if (body.settings.sponsors_enabled !== undefined) {
          upsert.run('sponsors_enabled', body.settings.sponsors_enabled === true || body.settings.sponsors_enabled === 'true' ? 'true' : 'false');
        }
        if (body.settings.exchange_rates) upsert.run('exchange_rates', JSON.stringify(body.settings.exchange_rates));
        if (body.settings.tax_categories) upsert.run('tax_categories', JSON.stringify(body.settings.tax_categories));
        if (body.settings.ecosystem_colors) upsert.run('ecosystem_colors', JSON.stringify(body.settings.ecosystem_colors));
      }

      markServerModified(Number(body.updated_at) || Date.now());
      return sendJson(res, 200, getBootstrapData());
    }

    // Trips CRUD
    if (pathname === '/api/trips' && method === 'POST') {
      const body = await readJsonBody(req);
      const id = body.id || ('trip-' + Date.now());
      const now = new Date().toISOString();
      const legsJson = Array.isArray(body.legs) ? JSON.stringify(body.legs) : (typeof body.legs_json === 'string' ? body.legs_json : '[]');
      db.prepare(`
        INSERT OR REPLACE INTO trips (id, name, destination, country_code, default_currency, start_date, end_date, budget_usd, video_count, status, notes, cover_photo, legs_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        body.name || 'Untitled Trip',
        body.destination || 'On the Road',
        body.country_code || 'US',
        body.default_currency || 'USD',
        body.start_date || new Date().toISOString().slice(0, 10),
        body.end_date || new Date().toISOString().slice(0, 10),
        Number(body.budget_usd) || 5000,
        Number(body.video_count) || 1,
        body.status || 'active',
        body.notes || '',
        body.cover_photo || '',
        legsJson,
        now
      );
      markServerModified();
      return sendJson(res, 201, getBootstrapData());
    }

    if (pathname.startsWith('/api/trips/') && (method === 'PUT' || method === 'DELETE')) {
      const rest = pathname.replace('/api/trips/', '');
      if (rest.endsWith('/legs') && method === 'PUT') {
        const tripId = decodeURIComponent(rest.slice(0, -5));
        const body = await readJsonBody(req);
        const legs = Array.isArray(body.legs) ? body.legs : [];
        db.prepare('UPDATE trips SET legs_json = ? WHERE id = ?').run(JSON.stringify(legs), tripId);
        if (body.renameFrom && body.renameTo) {
          const oldP = String(body.renameFrom);
          const newP = String(body.renameTo);
          const exps = db.prepare('SELECT id, leg_path FROM expenses WHERE trip_id = ?').all(tripId);
          const updExp = db.prepare('UPDATE expenses SET leg_path = ? WHERE id = ?');
          for (const e of exps) {
            if (e.leg_path === oldP) updExp.run(newP, e.id);
            else if (e.leg_path && e.leg_path.startsWith(oldP + ' / ')) updExp.run(newP + e.leg_path.slice(oldP.length), e.id);
          }
          const ress = db.prepare('SELECT id, leg_path FROM reservations WHERE trip_id = ?').all(tripId);
          const updRes = db.prepare('UPDATE reservations SET leg_path = ? WHERE id = ?');
          for (const r of ress) {
            if (r.leg_path === oldP) updRes.run(newP, r.id);
            else if (r.leg_path && r.leg_path.startsWith(oldP + ' / ')) updRes.run(newP + r.leg_path.slice(oldP.length), r.id);
          }
        }
        if (body.deletedPath) {
          const delP = String(body.deletedPath);
          db.prepare("UPDATE expenses SET leg_path = '' WHERE trip_id = ? AND (leg_path = ? OR leg_path LIKE ?)").run(tripId, delP, delP + ' / %');
          db.prepare("UPDATE reservations SET leg_path = '' WHERE trip_id = ? AND (leg_path = ? OR leg_path LIKE ?)").run(tripId, delP, delP + ' / %');
        }
        markServerModified();
        return sendJson(res, 200, { ok: true, bootstrap: getBootstrapData() });
      }

      const id = decodeURIComponent(rest);
      if (method === 'DELETE') {
        db.prepare('DELETE FROM trips WHERE id = ?').run(id);
        markServerModified();
        return sendJson(res, 200, getBootstrapData());
      }
      const body = await readJsonBody(req);
      const legsJson = Array.isArray(body.legs) ? JSON.stringify(body.legs) : (typeof body.legs_json === 'string' ? body.legs_json : null);
      db.prepare(`
        UPDATE trips
        SET name = ?, destination = ?, country_code = ?, default_currency = ?,
            start_date = ?, end_date = ?, budget_usd = ?, video_count = ?, status = ?, notes = ?,
            cover_photo = COALESCE(?, cover_photo),
            legs_json = COALESCE(?, legs_json)
        WHERE id = ?
      `).run(
        body.name,
        body.destination,
        body.country_code || 'US',
        body.default_currency || 'USD',
        body.start_date,
        body.end_date,
        Number(body.budget_usd) || 0,
        Number(body.video_count) || 1,
        body.status || 'active',
        body.notes || '',
        body.cover_photo !== undefined ? body.cover_photo : null,
        legsJson,
        id
      );
      markServerModified();
      return sendJson(res, 200, getBootstrapData());
    }

    // Expenses CRUD
    if (pathname === '/api/expenses' && method === 'POST') {
      const body = await readJsonBody(req);
      const id = body.id || ('exp-' + Date.now());
      const now = new Date().toISOString();
      const amountOriginal = Number(body.amount_original) || 0;
      const exchangeRate = Number(body.exchange_rate) || 1.0;
      const amountUsd = body.amount_usd !== undefined
        ? Number(body.amount_usd)
        : Number((amountOriginal * exchangeRate).toFixed(2));
      const creditUsd = Math.max(0, Number(body.credit_usd) || 0);
      const creditVerified = body.credit_verified ? 1 : 0;
      const creditNote = String(body.credit_note || '').trim();

      db.prepare(`
        INSERT OR REPLACE INTO expenses (
          id, trip_id, title, vendor, category, expense_date,
          amount_original, currency, exchange_rate, amount_usd,
          payment_method, paid_by, tax_deductible, reimbursable,
          receipt_data, receipt_name, notes, credit_usd, credit_verified, credit_note, leg_path, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        body.trip_id,
        body.title || 'Untitled Expense',
        body.vendor || '',
        body.category || 'Dining & Meals',
        body.expense_date || new Date().toISOString().slice(0, 10),
        amountOriginal,
        body.currency || 'USD',
        exchangeRate,
        amountUsd,
        body.payment_method || 'Primary Card',
        body.paid_by || 'Primary Card',
        body.tax_deductible === false || body.tax_deductible === 0 ? 0 : 1,
        body.reimbursable ? 1 : 0,
        body.receipt_data || '',
        body.receipt_name || '',
        body.notes || '',
        creditUsd,
        creditVerified,
        creditNote,
        String(body.leg_path || '').trim(),
        now
      );
      markServerModified();
      return sendJson(res, 201, getBootstrapData());
    }

    if (pathname.startsWith('/api/expenses/') && (method === 'PUT' || method === 'DELETE')) {
      const id = decodeURIComponent(pathname.replace('/api/expenses/', ''));
      if (method === 'DELETE') {
        db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
        markServerModified();
        return sendJson(res, 200, getBootstrapData());
      }
      const body = await readJsonBody(req);
      const amountOriginal = Number(body.amount_original) || 0;
      const exchangeRate = Number(body.exchange_rate) || 1.0;
      const amountUsd = body.amount_usd !== undefined
        ? Number(body.amount_usd)
        : Number((amountOriginal * exchangeRate).toFixed(2));
      const creditUsd = Math.max(0, Number(body.credit_usd) || 0);
      const creditVerified = body.credit_verified ? 1 : 0;
      const creditNote = String(body.credit_note || '').trim();

      db.prepare(`
        UPDATE expenses
        SET trip_id = ?, title = ?, vendor = ?, category = ?, expense_date = ?,
            amount_original = ?, currency = ?, exchange_rate = ?, amount_usd = ?,
            payment_method = ?, paid_by = ?, tax_deductible = ?, reimbursable = ?,
            receipt_data = ?, receipt_name = ?, notes = ?,
            credit_usd = ?, credit_verified = ?, credit_note = ?,
            leg_path = COALESCE(?, leg_path)
        WHERE id = ?
      `).run(
        body.trip_id,
        body.title,
        body.vendor || '',
        body.category,
        body.expense_date,
        amountOriginal,
        body.currency || 'USD',
        exchangeRate,
        amountUsd,
        body.payment_method || 'Primary Card',
        body.paid_by || 'Primary Card',
        body.tax_deductible === false || body.tax_deductible === 0 ? 0 : 1,
        body.reimbursable ? 1 : 0,
        body.receipt_data || '',
        body.receipt_name || '',
        body.notes || '',
        creditUsd,
        creditVerified,
        creditNote,
        body.leg_path !== undefined ? String(body.leg_path || '').trim() : null,
        id
      );
      markServerModified();
      return sendJson(res, 200, getBootstrapData());
    }

    // Revenues CRUD
    if (pathname === '/api/revenues' && method === 'POST') {
      const body = await readJsonBody(req);
      const id = body.id || ('rev-' + Date.now());
      const now = new Date().toISOString();
      db.prepare(`
        INSERT OR REPLACE INTO revenues (
          id, trip_id, title, source_type, sponsor_name, video_title,
          amount_usd, status, revenue_date, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        body.trip_id,
        body.title || 'Sponsor / AdSense Revenue',
        body.source_type || 'Sponsor Integration',
        body.sponsor_name || '',
        body.video_title || '',
        Number(body.amount_usd) || 0,
        body.status || 'paid',
        body.revenue_date || new Date().toISOString().slice(0, 10),
        body.notes || '',
        now
      );
      markServerModified();
      return sendJson(res, 201, getBootstrapData());
    }

    if (pathname.startsWith('/api/revenues/') && (method === 'PUT' || method === 'DELETE')) {
      const id = decodeURIComponent(pathname.replace('/api/revenues/', ''));
      if (method === 'DELETE') {
        db.prepare('DELETE FROM revenues WHERE id = ?').run(id);
        markServerModified();
        return sendJson(res, 200, getBootstrapData());
      }
      const body = await readJsonBody(req);
      db.prepare(`
        UPDATE revenues
        SET trip_id = ?, title = ?, source_type = ?, sponsor_name = ?, video_title = ?,
            amount_usd = ?, status = ?, revenue_date = ?, notes = ?
        WHERE id = ?
      `).run(
        body.trip_id,
        body.title,
        body.source_type,
        body.sponsor_name || '',
        body.video_title || '',
        Number(body.amount_usd) || 0,
        body.status || 'paid',
        body.revenue_date,
        body.notes || '',
        id
      );
      markServerModified();
      return sendJson(res, 200, getBootstrapData());
    }

    // Settings update
    if (pathname === '/api/settings' && method === 'PUT') {
      const body = await readJsonBody(req);
      const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
      if (body.channel_name !== undefined) upsert.run('channel_name', String(body.channel_name));
      if (body.home_currency !== undefined) upsert.run('home_currency', String(body.home_currency));
      if (body.meal_deduction_rate !== undefined) upsert.run('meal_deduction_rate', String(body.meal_deduction_rate));
      if (body.sponsors_enabled !== undefined) {
        upsert.run('sponsors_enabled', body.sponsors_enabled === true || body.sponsors_enabled === 'true' ? 'true' : 'false');
      }
      if (body.exchange_rates !== undefined) upsert.run('exchange_rates', JSON.stringify(body.exchange_rates));
      if (body.tax_categories !== undefined) upsert.run('tax_categories', JSON.stringify(body.tax_categories));
      if (body.ecosystem_colors !== undefined) upsert.run('ecosystem_colors', JSON.stringify(body.ecosystem_colors));
      if (body.visited_places !== undefined) upsert.run('visited_places', JSON.stringify(body.visited_places));
      markServerModified();
      return sendJson(res, 200, getBootstrapData());
    }

    // Visited U.S. States & World Countries Tracker
    if (pathname === '/api/visited-places' && method === 'PUT') {
      const body = await readJsonBody(req);
      const current = getSettingsMap().visited_places || { states: [], countries: [], excluded_states: [], excluded_countries: [] };
      const next = {
        states: Array.isArray(body.states) ? Array.from(new Set(body.states.map(s => String(s).trim()).filter(Boolean))) : (current.states || []),
        countries: Array.isArray(body.countries) ? Array.from(new Set(body.countries.map(c => String(c).trim()).filter(Boolean))) : (current.countries || []),
        excluded_states: Array.isArray(body.excluded_states) ? Array.from(new Set(body.excluded_states.map(s => String(s).trim()).filter(Boolean))) : (current.excluded_states || []),
        excluded_countries: Array.isArray(body.excluded_countries) ? Array.from(new Set(body.excluded_countries.map(c => String(c).trim()).filter(Boolean))) : (current.excluded_countries || [])
      };
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('visited_places', JSON.stringify(next));
      markServerModified();
      return sendJson(res, 200, { ok: true, visited_places: next, bootstrap: getBootstrapData() });
    }

    // Live FX Rates Refresh (Open Exchange Rate API -> USD base)
    if (pathname === '/api/fx/refresh' && method === 'POST') {
      const resp = await fetch('https://open.er-api.com/v6/latest/USD');
      const data = await resp.json();
      if (!resp.ok || !data || !data.rates) {
        throw new Error('Could not fetch live FX rates');
      }
      const existingRates = getSettingsMap().exchange_rates || DEFAULT_RATES;
      const updated = { ...existingRates, USD: 1.0 };
      const trackedCodes = new Set([...Object.keys(DEFAULT_RATES), ...Object.keys(existingRates), 'THB', 'SGD', 'NZD', 'COP', 'CLP', 'PEN', 'TWD', 'HKD', 'ZAR']);
      for (const code of trackedCodes) {
        if (code === 'USD') continue;
        const perUsd = Number(data.rates[code]);
        if (perUsd && perUsd > 0) {
          updated[code] = Number((1 / perUsd).toFixed(6));
        }
      }
      const nowIso = new Date().toISOString();
      const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
      upsert.run('exchange_rates', JSON.stringify(updated));
      upsert.run('fx_last_updated', nowIso);
      markServerModified();
      return sendJson(res, 200, { ok: true, exchange_rates: updated, fx_last_updated: nowIso, bootstrap: getBootstrapData() });
    }

    // Rewards & Loyalty Portfolio update
    if (pathname === '/api/rewards' && method === 'PUT') {
      const body = await readJsonBody(req);
      const current = getRewardsData();
      const nextRewards = {
        programs: Array.isArray(body.programs) ? body.programs : current.programs,
        certificates: Array.isArray(body.certificates) ? body.certificates : current.certificates,
        cards: Array.isArray(body.cards) ? body.cards : current.cards,
        redemptions: Array.isArray(body.redemptions) ? body.redemptions : current.redemptions,
        owners: Array.isArray(body.owners) ? body.owners.map(o => String(o).trim()).filter(Boolean).slice(0, 12) : (current.owners || []),
        deleted_ids: Array.isArray(body.deleted_ids) ? body.deleted_ids.slice(-200) : (current.deleted_ids || []),
        ecosystem_colors: body.ecosystem_colors || current.ecosystem_colors || null
      };
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(
        'rewards_data',
        JSON.stringify(nextRewards)
      );
      if (body.ecosystem_colors) {
        db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(
          'ecosystem_colors',
          JSON.stringify(body.ecosystem_colors)
        );
      }
      markServerModified();
      return sendJson(res, 200, getBootstrapData());
    }

    // AI Trip & Rewards Advisor Endpoint (Hybrid: supports optional Gemini / OpenAI API key + server env key)
    if (pathname === '/api/ai/trip-advisor' && method === 'POST') {
      const body = await readJsonBody(req);
      const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
      if (body.saveKey && body.clientApiKey !== undefined) {
        upsert.run('ai_api_key', String(body.clientApiKey || '').trim());
        if (body.provider) upsert.run('ai_provider', String(body.provider).trim());
        markServerModified();
      }
      if (body.onlySaveKey) {
        return sendJson(res, 200, { ok: true, bootstrap: getBootstrapData() });
      }

      const savedKeyRow = db.prepare("SELECT value FROM settings WHERE key = 'ai_api_key'").get();
      const savedProvRow = db.prepare("SELECT value FROM settings WHERE key = 'ai_provider'").get();
      const rawKey = (
        (body.clientApiKey && String(body.clientApiKey).trim()) ||
        (savedKeyRow && savedKeyRow.value && String(savedKeyRow.value).trim()) ||
        (process.env.GEMINI_API_KEY && String(process.env.GEMINI_API_KEY).trim()) ||
        (process.env.OPENAI_API_KEY && String(process.env.OPENAI_API_KEY).trim()) ||
        ''
      );

      if (!rawKey) {
        return sendJson(res, 200, {
          ok: true,
          mode: 'builtin',
          message: 'Using built-in Wander Wallet Rewards Strategy Engine.'
        });
      }

      const provider = body.provider || (savedProvRow && savedProvRow.value) || (rawKey.startsWith('sk-') ? 'openai' : 'gemini');
      const systemPrompt = [
        'You are the Wander Wallet AI Travel Rewards & Points Strategist.',
        'Analyze the user\'s exact loyalty balances, transferable bank points, free night certificates, and unused credit card statement credits.',
        'Provide concrete, actionable booking recommendations for their target trip: specific hotels (with point/night estimates & 4th/5th night free math), flights (best transfer partners vs. travel portal + remaining credits), a prioritized booking order, and lounge/card tips.',
        'Format clearly with concise bullet points and exact numbers from their portfolio.'
      ].join(' ');

      const userPrompt = [
        `Destination: ${body.destination || 'Argentina (Buenos Aires & Patagonia)'}`,
        `Nights: ${body.nights || 7} | Origin: ${body.origin || 'US Gateway'} | Style: ${body.style || 'Max Point Stretch'}`,
        body.customQuestion ? `Specific User Question: ${body.customQuestion}` : '',
        `User Rewards Portfolio Summary:\n${body.portfolioSummary || ''}`
      ].filter(Boolean).join('\n\n');

      try {
        if (provider === 'openai' || rawKey.startsWith('sk-')) {
          const resp = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${rawKey}`
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              temperature: 0.4,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
              ]
            })
          });
          const data = await resp.json();
          if (!resp.ok) {
            throw new Error((data && data.error && data.error.message) || `OpenAI HTTP ${resp.status}`);
          }
          const text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
          return sendJson(res, 200, { ok: true, mode: 'llm', provider: 'OpenAI GPT-4o-mini', analysisText: text });
        } else {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(rawKey)}`;
          const resp = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPrompt }] },
              contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
              generationConfig: { temperature: 0.4 }
            })
          });
          const data = await resp.json();
          if (!resp.ok) {
            throw new Error((data && data.error && data.error.message) || `Gemini HTTP ${resp.status}`);
          }
          const parts = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
          const text = parts.map(p => p.text || '').join('\n');
          return sendJson(res, 200, { ok: true, mode: 'llm', provider: 'Google Gemini 2.5 Flash', analysisText: text });
        }
      } catch (aiErr) {
        return sendJson(res, 200, {
          ok: false,
          mode: 'builtin_fallback',
          error: aiErr.message || 'AI API call failed — showing built-in strategy engine results.'
        });
      }
    }

    // CSV Tax Export
    if (pathname === '/api/export/csv' && method === 'GET') {
      const tripFilter = parsedUrl.searchParams.get('trip_id') || 'all';
      const data = getBootstrapData();
      const tripMap = new Map(data.trips.map(t => [t.id, t]));
      const mealRate = Number(data.settings.meal_deduction_rate || 100) / 100;

      const filtered = data.expenses.filter(e => tripFilter === 'all' || e.trip_id === tripFilter);
      const headers = [
        'Expense Date',
        'Trip',
        'Destination',
        'Category',
        'Item Description',
        'Vendor / Merchant',
        'Original Amount',
        'Original Currency',
        'FX Rate to USD',
        'Gross Amount (USD)',
        'Card Credit (USD)',
        'Credit Verified?',
        'Net Amount (USD)',
        'Tax Deductible?',
        'Deductible Amount (USD)',
        'Payment Method',
        'Paid By',
        'Reimbursable?',
        'Receipt Attached?',
        'Notes'
      ];

      const rows = [headers.map(escapeCsvCell).join(',')];
      for (const exp of filtered) {
        const trip = tripMap.get(exp.trip_id);
        const isMeal = exp.category === 'Dining & Meals' || exp.category === 'Meals & Craft';
        const dedMultiplier = exp.tax_deductible ? (isMeal ? mealRate : 1.0) : 0.0;
        const grossUsd = Number(exp.amount_usd) || 0;
        const creditUsd = Math.max(0, Number(exp.credit_usd) || 0);
        const netUsd = Math.max(0, grossUsd - creditUsd);
        const deductibleUsd = (netUsd * dedMultiplier).toFixed(2);
        const row = [
          exp.expense_date,
          trip ? trip.name : exp.trip_id,
          trip ? trip.destination : '',
          exp.category,
          exp.title,
          exp.vendor,
          exp.amount_original,
          exp.currency,
          exp.exchange_rate,
          grossUsd.toFixed(2),
          creditUsd.toFixed(2),
          creditUsd > 0 ? (exp.credit_verified ? 'Verified' : 'Unverified') : 'N/A',
          netUsd.toFixed(2),
          exp.tax_deductible ? 'Yes' : 'No',
          deductibleUsd,
          exp.payment_method,
          exp.paid_by,
          exp.reimbursable ? 'Yes' : 'No',
          exp.receipt_data ? 'Yes' : 'No',
          [exp.notes, exp.credit_note ? `[Credit: ${exp.credit_note}]` : ''].filter(Boolean).join(' ')
        ];
        rows.push(row.map(escapeCsvCell).join(','));
      }

      const filename = tripFilter === 'all'
        ? 'wander-wallet-trip-expenses-all.csv'
        : `wander-wallet-trip-expenses-${tripFilter}.csv`;

      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
      });
      return res.end(rows.join('\n'));
    }

    // -------------------------------------------------------------------------
    // Travel & Itinerary Endpoints
    // -------------------------------------------------------------------------

    if (pathname === '/api/travel/reservations' && method === 'POST') {
      const b = await readJsonBody(req);
      const id = b.id || ('res-' + Date.now() + '-' + crypto.randomBytes(3).toString('hex'));
      const now = new Date().toISOString();
      const costAmount = Number(b.cost_amount) || 0;
      const costCurrency = (b.cost_currency || 'USD').toUpperCase();
      const rates = getSettingsMap().exchange_rates || DEFAULT_RATES;
      const rate = Number(rates[costCurrency]) || 1.0;
      const costUsd = b.cost_usd !== undefined ? Number(b.cost_usd) : Number((costAmount * rate).toFixed(2));
      const detailsJson = typeof b.details === 'object' && b.details !== null
        ? JSON.stringify(b.details)
        : (typeof b.details_json === 'string' ? b.details_json : '{}');

      db.prepare(`
        INSERT INTO reservations (
          id, trip_id, leg_path, type, title, vendor, confirmation_code, status,
          start_datetime, end_datetime, timezone, location_from, location_to, address,
          details_json, cancel_deadline, is_refundable, cost_amount, cost_currency, cost_usd,
          payment_method, points_used, points_earned, loyalty_program, linked_expense_id,
          attachment_data, attachment_name, notes, source, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, b.trip_id || '', String(b.leg_path || '').trim(), b.type || 'flight', b.title || 'Reservation', b.vendor || '',
        b.confirmation_code || '', b.status || 'confirmed',
        b.start_datetime || now.slice(0, 16), b.end_datetime || '', b.timezone || '',
        b.location_from || '', b.location_to || '', b.address || '',
        detailsJson, b.cancel_deadline || '', b.is_refundable === false ? 0 : 1,
        costAmount, costCurrency, costUsd, b.payment_method || '',
        Number(b.points_used) || 0, Number(b.points_earned) || 0, b.loyalty_program || '',
        b.linked_expense_id || '', b.attachment_data || '', b.attachment_name || '',
        b.notes || '', b.source || 'manual', now
      );
      markServerModified();
      return sendJson(res, 200, { ok: true, id, bootstrap: getBootstrapData() });
    }

    if (pathname.startsWith('/api/travel/reservations/') && (method === 'PUT' || method === 'DELETE')) {
      const parts = pathname.split('/').filter(Boolean);
      const resId = parts[3];
      const action = parts[4];

      if (action === 'sync-finance' && method === 'POST') {
        const b = await readJsonBody(req);
        const r = db.prepare('SELECT * FROM reservations WHERE id = ?').get(resId);
        if (!r) return sendJson(res, 404, { error: 'Reservation not found' });

        let linkedExpenseId = r.linked_expense_id || '';
        if (b.createExpense !== false && Number(r.cost_usd) > 0 && r.trip_id) {
          const catMap = {
            flight: 'Flights & Transit',
            car: 'Flights & Transit',
            transit: 'Flights & Transit',
            hotel: 'Hotels & Lodging',
            dining: 'Dining & Meals',
            activity: 'Tours & Activities',
            cruise: 'Tours & Activities',
            other: 'Other Travel'
          };
          const expId = linkedExpenseId || ('exp-' + Date.now() + '-' + crypto.randomBytes(2).toString('hex'));
          const expDate = (r.start_datetime || new Date().toISOString()).slice(0, 10);
          const rates = getSettingsMap().exchange_rates || DEFAULT_RATES;
          const exRate = Number(rates[r.cost_currency]) || 1.0;

          if (linkedExpenseId) {
            db.prepare(`
              UPDATE expenses SET trip_id=?, leg_path=?, title=?, vendor=?, category=?, expense_date=?, amount_original=?, currency=?, exchange_rate=?, amount_usd=?, payment_method=?, notes=?
              WHERE id=?
            `).run(
              r.trip_id, r.leg_path || '', r.title, r.vendor || r.title, catMap[r.type] || 'Other Travel', expDate,
              r.cost_amount, r.cost_currency, exRate, r.cost_usd, r.payment_method || 'Amex Business Gold',
              `Confirmation: ${r.confirmation_code || 'N/A'}`, linkedExpenseId
            );
          } else {
            db.prepare(`
              INSERT INTO expenses (
                id, trip_id, leg_path, title, vendor, category, expense_date,
                amount_original, currency, exchange_rate, amount_usd,
                payment_method, paid_by, tax_deductible, reimbursable,
                receipt_data, receipt_name, notes, credit_usd, credit_verified, credit_note, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              expId, r.trip_id, r.leg_path || '', r.title, r.vendor || r.title, catMap[r.type] || 'Other Travel', expDate,
              r.cost_amount, r.cost_currency, exRate, r.cost_usd, r.payment_method || 'Amex Business Gold',
              'Channel Card', 1, 0, r.attachment_data || '', r.attachment_name || '',
              `Synced from Travel Reservation (${r.confirmation_code || r.id})`, 0, 0, '', new Date().toISOString()
            );
            linkedExpenseId = expId;
          }
          db.prepare('UPDATE reservations SET linked_expense_id = ? WHERE id = ?').run(linkedExpenseId, resId);
        }

        // Optional Rewards points balance adjustment
        if (b.syncRewards && r.loyalty_program && (Number(r.points_earned) > 0 || Number(r.points_used) > 0)) {
          const rewards = getRewardsData();
          const progs = Array.isArray(rewards.programs) ? rewards.programs : [];
          const target = progs.find(p =>
            p.name.toLowerCase().includes(r.loyalty_program.toLowerCase()) ||
            r.loyalty_program.toLowerCase().includes(p.name.toLowerCase())
          );
          if (target) {
            const netDelta = (Number(r.points_earned) || 0) - (Number(r.points_used) || 0);
            target.balance = Math.max(0, (Number(target.balance) || 0) + netDelta);
            db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('rewards_data', ?)").run(JSON.stringify(rewards));
          }
        }

        markServerModified();
        return sendJson(res, 200, { ok: true, linked_expense_id: linkedExpenseId, bootstrap: getBootstrapData() });
      }

      if (method === 'DELETE') {
        db.prepare('DELETE FROM reservations WHERE id = ?').run(resId);
        markServerModified();
        return sendJson(res, 200, { ok: true, bootstrap: getBootstrapData() });
      }

      if (method === 'PUT') {
        const b = await readJsonBody(req);
        const existing = db.prepare('SELECT * FROM reservations WHERE id = ?').get(resId);
        if (!existing) return sendJson(res, 404, { error: 'Reservation not found' });

        const costAmount = b.cost_amount !== undefined ? Number(b.cost_amount) : existing.cost_amount;
        const costCurrency = (b.cost_currency || existing.cost_currency || 'USD').toUpperCase();
        const rates = getSettingsMap().exchange_rates || DEFAULT_RATES;
        const rate = Number(rates[costCurrency]) || 1.0;
        const costUsd = b.cost_usd !== undefined ? Number(b.cost_usd) : Number((costAmount * rate).toFixed(2));
        const detailsJson = typeof b.details === 'object' && b.details !== null
          ? JSON.stringify(b.details)
          : (b.details_json !== undefined ? b.details_json : existing.details_json);

        db.prepare(`
          UPDATE reservations SET
            trip_id=?, leg_path=?, type=?, title=?, vendor=?, confirmation_code=?, status=?,
            start_datetime=?, end_datetime=?, timezone=?, location_from=?, location_to=?, address=?,
            details_json=?, cancel_deadline=?, is_refundable=?, cost_amount=?, cost_currency=?, cost_usd=?,
            payment_method=?, points_used=?, points_earned=?, loyalty_program=?,
            attachment_data=?, attachment_name=?, notes=?
          WHERE id=?
        `).run(
          b.trip_id !== undefined ? b.trip_id : existing.trip_id,
          b.leg_path !== undefined ? String(b.leg_path || '').trim() : (existing.leg_path || ''),
          b.type || existing.type,
          b.title || existing.title,
          b.vendor !== undefined ? b.vendor : existing.vendor,
          b.confirmation_code !== undefined ? b.confirmation_code : existing.confirmation_code,
          b.status || existing.status,
          b.start_datetime || existing.start_datetime,
          b.end_datetime !== undefined ? b.end_datetime : existing.end_datetime,
          b.timezone !== undefined ? b.timezone : existing.timezone,
          b.location_from !== undefined ? b.location_from : existing.location_from,
          b.location_to !== undefined ? b.location_to : existing.location_to,
          b.address !== undefined ? b.address : existing.address,
          detailsJson,
          b.cancel_deadline !== undefined ? b.cancel_deadline : existing.cancel_deadline,
          b.is_refundable !== undefined ? (b.is_refundable ? 1 : 0) : existing.is_refundable,
          costAmount, costCurrency, costUsd,
          b.payment_method !== undefined ? b.payment_method : existing.payment_method,
          b.points_used !== undefined ? Number(b.points_used) : existing.points_used,
          b.points_earned !== undefined ? Number(b.points_earned) : existing.points_earned,
          b.loyalty_program !== undefined ? b.loyalty_program : existing.loyalty_program,
          b.attachment_data !== undefined ? b.attachment_data : existing.attachment_data,
          b.attachment_name !== undefined ? b.attachment_name : existing.attachment_name,
          b.notes !== undefined ? b.notes : existing.notes,
          resId
        );
        markServerModified();
        return sendJson(res, 200, { ok: true, bootstrap: getBootstrapData() });
      }
    }

    // Quick Paste / .eml / Text Parser
    if (pathname === '/api/travel/parse' && method === 'POST') {
      const b = await readJsonBody(req);
      const savedKeyRow = db.prepare("SELECT value FROM settings WHERE key = 'ai_api_key'").get();
      const savedProvRow = db.prepare("SELECT value FROM settings WHERE key = 'ai_provider'").get();
      const aiKey = (savedKeyRow && savedKeyRow.value) || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || '';
      const aiProvider = (savedProvRow && savedProvRow.value) || '';

      const parsed = await travelEngine.parseTravelEmail({
        rawEmail: b.rawEmail || '',
        subject: b.subject || '',
        sender: b.sender || '',
        text: b.text || '',
        html: b.html || '',
        aiKey,
        aiProvider
      });

      if (b.directImport && Array.isArray(parsed.reservations) && parsed.reservations.length > 0) {
        const tripId = b.trip_id || '';
        const legPath = String(b.leg_path || '').trim();
        const rates = getSettingsMap().exchange_rates || DEFAULT_RATES;
        const now = new Date().toISOString();
        const ins = db.prepare(`
          INSERT INTO reservations (
            id, trip_id, leg_path, type, title, vendor, confirmation_code, status,
            start_datetime, end_datetime, timezone, location_from, location_to, address,
            details_json, cancel_deadline, is_refundable, cost_amount, cost_currency, cost_usd,
            payment_method, points_used, points_earned, loyalty_program, linked_expense_id,
            attachment_data, attachment_name, notes, source, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, '', ?, ?, ?, ?, ?, 1, ?, ?, ?, '', ?, ?, ?, '', '', '', ?, 'email', ?)
        `);
        for (const c of parsed.reservations) {
          const rid = 'res-' + Date.now() + '-' + crypto.randomBytes(3).toString('hex');
          const cur = (c.cost_currency || 'USD').toUpperCase();
          const amt = Number(c.cost_amount) || 0;
          const usd = Number((amt * (Number(rates[cur]) || 1.0)).toFixed(2));
          ins.run(
            rid, tripId, legPath, c.type || 'other', c.title || parsed.subject || 'Imported Reservation',
            c.vendor || '', c.confirmation_code || '',
            c.start_datetime || now.slice(0, 16), c.end_datetime || '',
            c.location_from || '', c.location_to || '', c.address || '',
            JSON.stringify(c.details || {}), c.cancel_deadline || '',
            amt, cur, usd, Number(c.points_used) || 0, Number(c.points_earned) || 0,
            c.loyalty_program || '', c.notes || `Imported from: ${parsed.subject || 'Email'}`, now
          );
        }
        markServerModified();
        return sendJson(res, 200, { ok: true, importedCount: parsed.reservations.length, parsed, bootstrap: getBootstrapData() });
      }

      if (b.queueInInbox) {
        const inboxId = 'tinbox-' + Date.now() + '-' + crypto.randomBytes(2).toString('hex');
        db.prepare(`
          INSERT INTO travel_inbox (id, message_uid, subject, sender, received_at, raw_snippet, parsed_json, parser_used, confidence, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
        `).run(
          inboxId, '', parsed.subject || 'Manual Import', parsed.sender || 'Quick Paste',
          new Date().toISOString(), parsed.snippet || '', JSON.stringify(parsed.reservations || []),
          parsed.parser_used, parsed.confidence, new Date().toISOString()
        );
        markServerModified();
        return sendJson(res, 200, { ok: true, inboxId, parsed, bootstrap: getBootstrapData() });
      }

      return sendJson(res, 200, { ok: true, parsed });
    }

    // Travel Inbox: Import or Dismiss
    if (pathname.startsWith('/api/travel/inbox/') && method === 'POST') {
      const parts = pathname.split('/').filter(Boolean);
      const inboxId = parts[3];
      const action = parts[4];
      const item = db.prepare('SELECT * FROM travel_inbox WHERE id = ?').get(inboxId);
      if (!item) return sendJson(res, 404, { error: 'Inbox item not found' });

      if (action === 'dismiss') {
        db.prepare("UPDATE travel_inbox SET status = 'dismissed' WHERE id = ?").run(inboxId);
        markServerModified();
        return sendJson(res, 200, { ok: true, bootstrap: getBootstrapData() });
      }

      if (action === 'import') {
        const b = await readJsonBody(req);
        const candidates = Array.isArray(b.reservations) ? b.reservations : JSON.parse(item.parsed_json || '[]');
        const tripId = b.trip_id || '';
        const legPath = String(b.leg_path || '').trim();
        const rates = getSettingsMap().exchange_rates || DEFAULT_RATES;
        const now = new Date().toISOString();
        const ins = db.prepare(`
          INSERT INTO reservations (
            id, trip_id, leg_path, type, title, vendor, confirmation_code, status,
            start_datetime, end_datetime, timezone, location_from, location_to, address,
            details_json, cancel_deadline, is_refundable, cost_amount, cost_currency, cost_usd,
            payment_method, points_used, points_earned, loyalty_program, linked_expense_id,
            attachment_data, attachment_name, notes, source, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, '', ?, ?, ?, ?, ?, 1, ?, ?, ?, '', ?, ?, ?, '', '', '', ?, 'email', ?)
        `);

        for (const c of candidates) {
          const rid = 'res-' + Date.now() + '-' + crypto.randomBytes(3).toString('hex');
          const cur = (c.cost_currency || 'USD').toUpperCase();
          const amt = Number(c.cost_amount) || 0;
          const usd = Number((amt * (Number(rates[cur]) || 1.0)).toFixed(2));
          ins.run(
            rid, tripId, c.leg_path !== undefined ? String(c.leg_path || '').trim() : legPath,
            c.type || 'other', c.title || item.subject || 'Imported Reservation',
            c.vendor || '', c.confirmation_code || '',
            c.start_datetime || now.slice(0, 16), c.end_datetime || '',
            c.location_from || '', c.location_to || '', c.address || '',
            JSON.stringify(c.details || {}), c.cancel_deadline || '',
            amt, cur, usd, Number(c.points_used) || 0, Number(c.points_earned) || 0,
            c.loyalty_program || '', c.notes || `Imported from: ${item.subject}`, now
          );
        }

        db.prepare("UPDATE travel_inbox SET status = 'imported' WHERE id = ?").run(inboxId);
        markServerModified();
        return sendJson(res, 200, { ok: true, importedCount: candidates.length, bootstrap: getBootstrapData() });
      }
    }

    // Travel Documents Vault CRUD
    if (pathname === '/api/travel/documents' && method === 'POST') {
      const b = await readJsonBody(req);
      const id = 'doc-' + Date.now() + '-' + crypto.randomBytes(2).toString('hex');
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO travel_documents (id, doc_type, title, holder_name, doc_number, issuing_country, issue_date, expiry_date, attachment_data, attachment_name, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, b.doc_type || 'passport', b.title || 'Travel Document', b.holder_name || '',
        b.doc_number || '', b.issuing_country || '', b.issue_date || '', b.expiry_date || '',
        b.attachment_data || '', b.attachment_name || '', b.notes || '', now
      );
      markServerModified();
      return sendJson(res, 200, { ok: true, id, bootstrap: getBootstrapData() });
    }

    if (pathname.startsWith('/api/travel/documents/') && (method === 'PUT' || method === 'DELETE')) {
      const docId = pathname.split('/').pop();
      if (method === 'DELETE') {
        db.prepare('DELETE FROM travel_documents WHERE id = ?').run(docId);
        markServerModified();
        return sendJson(res, 200, { ok: true, bootstrap: getBootstrapData() });
      }
      if (method === 'PUT') {
        const b = await readJsonBody(req);
        const ex = db.prepare('SELECT * FROM travel_documents WHERE id = ?').get(docId);
        if (!ex) return sendJson(res, 404, { error: 'Document not found' });
        db.prepare(`
          UPDATE travel_documents SET doc_type=?, title=?, holder_name=?, doc_number=?, issuing_country=?, issue_date=?, expiry_date=?, attachment_data=?, attachment_name=?, notes=?
          WHERE id=?
        `).run(
          b.doc_type || ex.doc_type, b.title || ex.title,
          b.holder_name !== undefined ? b.holder_name : ex.holder_name,
          b.doc_number !== undefined ? b.doc_number : ex.doc_number,
          b.issuing_country !== undefined ? b.issuing_country : ex.issuing_country,
          b.issue_date !== undefined ? b.issue_date : ex.issue_date,
          b.expiry_date !== undefined ? b.expiry_date : ex.expiry_date,
          b.attachment_data !== undefined ? b.attachment_data : ex.attachment_data,
          b.attachment_name !== undefined ? b.attachment_name : ex.attachment_name,
          b.notes !== undefined ? b.notes : ex.notes,
          docId
        );
        markServerModified();
        return sendJson(res, 200, { ok: true, bootstrap: getBootstrapData() });
      }
    }

    // Email Sync Configuration (IMAP + Gmail OAuth 2.0)
    if (pathname === '/api/travel/email-config' && method === 'POST') {
      const b = await readJsonBody(req);
      const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
      if (b.imap_host !== undefined) upsert.run('travel_imap_host', String(b.imap_host).trim());
      if (b.imap_port !== undefined) upsert.run('travel_imap_port', String(Number(b.imap_port) || 993));
      if (b.imap_user !== undefined) upsert.run('travel_imap_user', String(b.imap_user).trim());
      if (b.imap_password) upsert.run('travel_secret_imap_pass', String(b.imap_password));
      if (b.gmail_client_id !== undefined) upsert.run('travel_gmail_client_id', String(b.gmail_client_id).trim());
      if (b.gmail_client_secret) upsert.run('travel_secret_gmail_client_secret', String(b.gmail_client_secret).trim());
      if (b.auto_sync_minutes !== undefined) upsert.run('travel_auto_sync_minutes', String(Math.max(0, Number(b.auto_sync_minutes) || 0)));
      if (b.disconnect_gmail) {
        db.prepare("DELETE FROM settings WHERE key IN ('travel_secret_gmail_refresh_token', 'travel_secret_gmail_access_token')").run();
      }
      if (b.clear_imap) {
        db.prepare("DELETE FROM settings WHERE key IN ('travel_imap_host', 'travel_imap_port', 'travel_imap_user', 'travel_secret_imap_pass')").run();
      }
      markServerModified();
      return sendJson(res, 200, { ok: true, bootstrap: getBootstrapData() });
    }

    if (pathname === '/api/travel/gmail/auth-url' && method === 'GET') {
      const clientIdRow = db.prepare("SELECT value FROM settings WHERE key = 'travel_gmail_client_id'").get();
      if (!clientIdRow || !clientIdRow.value) {
        return sendJson(res, 400, { error: 'Please save your Gmail OAuth Client ID first in Admin.' });
      }
      const proto = req.headers['x-forwarded-proto'] || 'http';
      const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`;
      const redirectUri = `${proto}://${host}/api/travel/gmail/callback`;
      const url = travelEngine.getGmailAuthUrl({ clientId: clientIdRow.value, redirectUri, state: 'ww-gmail' });
      return sendJson(res, 200, { ok: true, url, redirectUri });
    }

    if (pathname === '/api/travel/gmail/callback' && method === 'GET') {
      const code = parsedUrl.searchParams.get('code');
      const err = parsedUrl.searchParams.get('error');
      if (err || !code) {
        res.writeHead(302, { Location: '/?gmail_error=' + encodeURIComponent(err || 'missing_code') });
        return res.end();
      }
      const clientId = (db.prepare("SELECT value FROM settings WHERE key = 'travel_gmail_client_id'").get() || {}).value || '';
      const clientSecret = (db.prepare("SELECT value FROM settings WHERE key = 'travel_secret_gmail_client_secret'").get() || {}).value || '';
      const proto = req.headers['x-forwarded-proto'] || 'http';
      const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`;
      const redirectUri = `${proto}://${host}/api/travel/gmail/callback`;

      const tokens = await travelEngine.exchangeGmailCode({ code, clientId, clientSecret, redirectUri });
      const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
      if (tokens.refresh_token) upsert.run('travel_secret_gmail_refresh_token', tokens.refresh_token);
      if (tokens.access_token) upsert.run('travel_secret_gmail_access_token', tokens.access_token);
      markServerModified();

      res.writeHead(302, { Location: '/?gmail_connected=1' });
      return res.end();
    }

    // Run Direct Inbox Sync (IMAP + Gmail OAuth)
    if (pathname === '/api/travel/email-sync' && method === 'POST') {
      const result = await runTravelEmailSync();
      if (result.notConfigured) {
        return sendJson(res, 400, { error: 'No IMAP or Gmail OAuth account configured yet. Set up Email Sync in Admin.' });
      }
      return sendJson(res, 200, {
        ok: true,
        scanned: result.scanned,
        added: result.added,
        errors: result.errors,
        bootstrap: getBootstrapData()
      });
    }

    // ICS Calendar Export
    if (pathname === '/api/travel/export/ics' && method === 'GET') {
      const tripId = parsedUrl.searchParams.get('tripId');
      const resId = parsedUrl.searchParams.get('reservationId');
      let list = [];
      let calName = 'Wander Wallet Itinerary';
      if (resId) {
        const r = db.prepare('SELECT * FROM reservations WHERE id = ?').get(resId);
        if (r) {
          list = [r];
          calName = r.title;
        }
      } else if (tripId && tripId !== 'all') {
        list = db.prepare('SELECT * FROM reservations WHERE trip_id = ? ORDER BY start_datetime ASC').all(tripId);
        const t = db.prepare('SELECT name FROM trips WHERE id = ?').get(tripId);
        if (t) calName = `Wander Wallet — ${t.name}`;
      } else {
        list = db.prepare('SELECT * FROM reservations ORDER BY start_datetime ASC').all();
      }
      const ics = travelEngine.generateIcs(list, calName);
      res.writeHead(200, {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="wander-wallet-itinerary.ics"'
      });
      return res.end(ics);
    }

    // Static Files (with no-cache headers so browser/Service Worker never serves stale JS/HTML)
    let filePath = pathname === '/' ? '/index.html' : pathname;
    const safePath = path.normalize(filePath).replace(/^(\.\.[/\\])+/, '');
    const absPath = path.join(PUBLIC_DIR, safePath);

    if (fs.existsSync(absPath) && fs.statSync(absPath).isFile()) {
      const ext = path.extname(absPath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      fs.createReadStream(absPath).pipe(res);
      return;
    }

    // SPA fallback
    const indexHtml = path.join(PUBLIC_DIR, 'index.html');
    if (fs.existsSync(indexHtml)) {
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      fs.createReadStream(indexHtml).pipe(res);
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (err) {
    console.error('Server error:', err);
    sendJson(res, 500, { error: err.message || 'Internal Server Error' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Wander Wallet Creator Finance Server listening on http://0.0.0.0:${PORT}`);
  // Trigger a background email sync on startup if Gmail/IMAP is connected so existing bookings refresh with full HTML email parsing
  setTimeout(async () => {
    try {
      const st = getEmailSyncStatus();
      if (st.imap_configured || st.gmail_connected) {
        const res = await runTravelEmailSync();
        if (res && res.ok) {
          console.log(`[Startup Travel Sync] Scanned ${res.scanned} email(s), queued ${res.added} new, refreshed ${res.updated || 0} existing.`);
        }
      }
    } catch (e) {
      console.error('[Startup Travel Sync] Error:', e.message);
    }
  }, 2500);
});

// Background Auto-Sync Scheduler for Travel Email Inbox (checks every 15 minutes)
setInterval(async () => {
  try {
    const st = getEmailSyncStatus();
    if (!st.imap_configured && !st.gmail_connected) return;
    const intervalMins = Number(st.auto_sync_minutes) || 0;
    if (intervalMins <= 0) return;
    const lastMs = st.last_sync_at ? new Date(st.last_sync_at).getTime() : 0;
    if (!lastMs || (Date.now() - lastMs) >= intervalMins * 60000) {
      const res = await runTravelEmailSync();
      if (res && res.ok) {
        console.log(`[Travel Auto-Sync] Scanned ${res.scanned} email(s), queued ${res.added} new booking(s).`);
      }
    }
  } catch (e) {
    console.error('[Travel Auto-Sync] Error:', e.message);
  }
}, 15 * 60 * 1000);

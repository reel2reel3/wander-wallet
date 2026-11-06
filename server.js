const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { URL } = require('node:url');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || process.env.DATA_DIR || path.join(__dirname, 'data');
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

const DEFAULT_RATES = {
  USD: 1.0,
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
  if (countRow && countRow.count > 0) return;

  const insertSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  insertSetting.run('channel_name', 'Nomad Frame Studios');
  insertSetting.run('home_currency', 'USD');
  insertSetting.run('meal_deduction_rate', '100');
  insertSetting.run('exchange_rates', JSON.stringify(DEFAULT_RATES));

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

seedIfNeeded();

function getSettingsMap() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const map = {
    channel_name: 'Wander Wallet',
    home_currency: 'USD',
    meal_deduction_rate: '100',
    exchange_rates: DEFAULT_RATES
  };
  for (const r of rows) {
    if (r.key.startsWith('auth_')) continue;
    if (r.key === 'exchange_rates') {
      try {
        map.exchange_rates = { ...DEFAULT_RATES, ...JSON.parse(r.value) };
      } catch {
        map.exchange_rates = DEFAULT_RATES;
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

function createAuthSession(username, rememberDays = 30) {
  const token = crypto.randomBytes(32).toString('hex');
  const durationMs = (Number(rememberDays) || 30) * 24 * 60 * 60 * 1000;
  const expiresAt = Date.now() + durationMs;
  const now = new Date().toISOString();
  db.prepare('DELETE FROM auth_sessions WHERE expires_at < ?').run(Date.now());
  db.prepare('INSERT INTO auth_sessions (token, username, expires_at, created_at) VALUES (?, ?, ?, ?)').run(
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

  const row = db.prepare('SELECT token, username, expires_at FROM auth_sessions WHERE token = ?').get(token);
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    db.prepare('DELETE FROM auth_sessions WHERE token = ?').run(token);
    return null;
  }
  return row;
}

function getBootstrapData() {
  const settings = getSettingsMap();
  const trips = db.prepare('SELECT * FROM trips ORDER BY start_date DESC').all();
  const expenses = db.prepare('SELECT * FROM expenses ORDER BY expense_date DESC, created_at DESC').all();
  const revenues = db.prepare('SELECT * FROM revenues ORDER BY revenue_date DESC, created_at DESC').all();

  return {
    settings,
    trips,
    expenses,
    revenues
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
        configured: creds.configured,
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
        return sendJson(res, 400, { error: 'Missing Google credential token.' });
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
      if (!session) {
        return sendJson(res, 401, { error: 'Authentication required.' });
      }
      const creds = getAuthCredentials();
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

    // Protect all /api/* routes with session authentication
    if (pathname.startsWith('/api/')) {
      const session = getAuthenticatedSession(req, parsedUrl);
      if (!session) {
        const creds = getAuthCredentials();
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

    // Trips CRUD
    if (pathname === '/api/trips' && method === 'POST') {
      const body = await readJsonBody(req);
      const id = body.id || ('trip-' + Date.now());
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO trips (id, name, destination, country_code, default_currency, start_date, end_date, budget_usd, video_count, status, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        now
      );
      return sendJson(res, 201, getBootstrapData());
    }

    if (pathname.startsWith('/api/trips/') && (method === 'PUT' || method === 'DELETE')) {
      const id = decodeURIComponent(pathname.replace('/api/trips/', ''));
      if (method === 'DELETE') {
        db.prepare('DELETE FROM trips WHERE id = ?').run(id);
        return sendJson(res, 200, getBootstrapData());
      }
      const body = await readJsonBody(req);
      db.prepare(`
        UPDATE trips
        SET name = ?, destination = ?, country_code = ?, default_currency = ?,
            start_date = ?, end_date = ?, budget_usd = ?, video_count = ?, status = ?, notes = ?
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
        id
      );
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

      db.prepare(`
        INSERT INTO expenses (
          id, trip_id, title, vendor, category, expense_date,
          amount_original, currency, exchange_rate, amount_usd,
          payment_method, paid_by, tax_deductible, reimbursable,
          receipt_data, receipt_name, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        body.trip_id,
        body.title || 'Untitled Expense',
        body.vendor || '',
        body.category || 'Meals & Craft',
        body.expense_date || new Date().toISOString().slice(0, 10),
        amountOriginal,
        body.currency || 'USD',
        exchangeRate,
        amountUsd,
        body.payment_method || 'Amex Business Platinum',
        body.paid_by || 'Channel Card',
        body.tax_deductible === false || body.tax_deductible === 0 ? 0 : 1,
        body.reimbursable ? 1 : 0,
        body.receipt_data || '',
        body.receipt_name || '',
        body.notes || '',
        now
      );
      return sendJson(res, 201, getBootstrapData());
    }

    if (pathname.startsWith('/api/expenses/') && (method === 'PUT' || method === 'DELETE')) {
      const id = decodeURIComponent(pathname.replace('/api/expenses/', ''));
      if (method === 'DELETE') {
        db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
        return sendJson(res, 200, getBootstrapData());
      }
      const body = await readJsonBody(req);
      const amountOriginal = Number(body.amount_original) || 0;
      const exchangeRate = Number(body.exchange_rate) || 1.0;
      const amountUsd = body.amount_usd !== undefined
        ? Number(body.amount_usd)
        : Number((amountOriginal * exchangeRate).toFixed(2));

      db.prepare(`
        UPDATE expenses
        SET trip_id = ?, title = ?, vendor = ?, category = ?, expense_date = ?,
            amount_original = ?, currency = ?, exchange_rate = ?, amount_usd = ?,
            payment_method = ?, paid_by = ?, tax_deductible = ?, reimbursable = ?,
            receipt_data = ?, receipt_name = ?, notes = ?
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
        body.payment_method || 'Amex Business Platinum',
        body.paid_by || 'Channel Card',
        body.tax_deductible === false || body.tax_deductible === 0 ? 0 : 1,
        body.reimbursable ? 1 : 0,
        body.receipt_data || '',
        body.receipt_name || '',
        body.notes || '',
        id
      );
      return sendJson(res, 200, getBootstrapData());
    }

    // Revenues CRUD
    if (pathname === '/api/revenues' && method === 'POST') {
      const body = await readJsonBody(req);
      const id = body.id || ('rev-' + Date.now());
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO revenues (
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
      return sendJson(res, 201, getBootstrapData());
    }

    if (pathname.startsWith('/api/revenues/') && (method === 'PUT' || method === 'DELETE')) {
      const id = decodeURIComponent(pathname.replace('/api/revenues/', ''));
      if (method === 'DELETE') {
        db.prepare('DELETE FROM revenues WHERE id = ?').run(id);
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
      return sendJson(res, 200, getBootstrapData());
    }

    // Settings update
    if (pathname === '/api/settings' && method === 'PUT') {
      const body = await readJsonBody(req);
      const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
      if (body.channel_name !== undefined) upsert.run('channel_name', String(body.channel_name));
      if (body.home_currency !== undefined) upsert.run('home_currency', String(body.home_currency));
      if (body.meal_deduction_rate !== undefined) upsert.run('meal_deduction_rate', String(body.meal_deduction_rate));
      if (body.exchange_rates !== undefined) upsert.run('exchange_rates', JSON.stringify(body.exchange_rates));
      return sendJson(res, 200, getBootstrapData());
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
        'Trip / Shoot',
        'Destination',
        'Category (IRS Schedule C)',
        'Item Description',
        'Vendor / Merchant',
        'Original Amount',
        'Original Currency',
        'FX Rate to USD',
        'Amount (USD)',
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
        const isMeal = exp.category === 'Meals & Craft';
        const dedMultiplier = exp.tax_deductible ? (isMeal ? mealRate : 1.0) : 0.0;
        const deductibleUsd = (exp.amount_usd * dedMultiplier).toFixed(2);
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
          Number(exp.amount_usd).toFixed(2),
          exp.tax_deductible ? 'Yes' : 'No',
          deductibleUsd,
          exp.payment_method,
          exp.paid_by,
          exp.reimbursable ? 'Yes' : 'No',
          exp.receipt_data ? 'Yes' : 'No',
          exp.notes
        ];
        rows.push(row.map(escapeCsvCell).join(','));
      }

      const filename = tripFilter === 'all'
        ? 'creator-tax-expenses-all-trips.csv'
        : `creator-tax-expenses-${tripFilter}.csv`;

      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
      });
      return res.end(rows.join('\n'));
    }

    // Static Files
    let filePath = pathname === '/' ? '/index.html' : pathname;
    const safePath = path.normalize(filePath).replace(/^(\.\.[/\\])+/, '');
    const absPath = path.join(PUBLIC_DIR, safePath);

    if (fs.existsSync(absPath) && fs.statSync(absPath).isFile()) {
      const ext = path.extname(absPath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(absPath).pipe(res);
      return;
    }

    // SPA fallback
    const indexHtml = path.join(PUBLIC_DIR, 'index.html');
    if (fs.existsSync(indexHtml)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
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
});

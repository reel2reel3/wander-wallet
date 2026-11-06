(function () {
  'use strict';

  const DEFAULT_FX_RATES = {
    USD: 1.0,
    JPY: 0.00658,
    EUR: 1.085,
    GBP: 1.295,
    CAD: 0.725,
    AUD: 0.658,
    CHF: 1.155,
    ISK: 0.00725,
    KRW: 0.00073,
    MXN: 0.0505,
    THB: 0.0296
  };

  const CURRENCY_SYMBOLS = {
    USD: '$',
    JPY: '¥',
    EUR: '€',
    GBP: '£',
    CAD: 'CA$',
    AUD: 'A$',
    CHF: 'CHF ',
    ISK: 'ISK ',
    KRW: '₩',
    MXN: 'MX$',
    THB: '฿'
  };

  const CATEGORY_META = {
    'Hotels & Lodging': { color: 'var(--cat-hotel)', icon: '🏨' },
    'Meals & Craft': { color: 'var(--cat-meal)', icon: '🍜' },
    'Flights & Transit': { color: 'var(--cat-flight)', icon: '🚄' },
    'Gear & Rentals': { color: 'var(--cat-gear)', icon: '📷' },
    'Permits & Locations': { color: 'var(--cat-permit)', icon: '🎟️' },
    'Crew & Talent': { color: 'var(--cat-crew)', icon: '🎥' }
  };

  // Safe Storage Wrapper (prevents SecurityError in sandboxed preview iframes)
  let memoryStore = null;
  let memoryTheme = 'dark';

  function safeStorageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function safeStorageSet(key, val) {
    try {
      window.localStorage.setItem(key, val);
    } catch (e) {
      // Sandboxed iframe: ignore storage error, memoryStore handles persistence
    }
  }

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

  function getInitialSeedData() {
    return {
      settings: {
        channel_name: 'Wander Wallet',
        home_currency: 'USD',
        meal_deduction_rate: '100',
        exchange_rates: { ...DEFAULT_FX_RATES }
      },
      trips: [
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
          notes: '3-part autumn documentary series: Tokyo 24h Sleeper Train, Kyoto Heritage Ryokan, Hokkaido Ramen Trail.'
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
          notes: 'Glacier campervan survival challenge + Highlands drone cinematography episode.'
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
          notes: 'First-class vs. budget mountain rail comparison across the Glacier Express.'
        }
      ],
      expenses: [
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
      ],
      revenues: [
        {
          id: 'rev-jp-1',
          trip_id: 'trip-japan-2026',
          title: '60s Mid-Roll Sponsor Integration (Ep 1: Sleeper Train)',
          source_type: 'Sponsor Integration',
          sponsor_name: 'Surfshark VPN',
          video_title: '24 Hours on Japan’s Last Sunrise Sleeper Train',
          amount_usd: 8500,
          status: 'invoiced',
          revenue_date: '2026-11-04'
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
          revenue_date: '2026-11-05'
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
          revenue_date: '2026-11-12'
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
          revenue_date: '2026-10-22'
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
          revenue_date: '2026-10-31'
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
          revenue_date: '2026-09-25'
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
          revenue_date: '2026-09-30'
        }
      ]
    };
  }

  const state = {
    settings: {
      channel_name: 'Nomad Frame Studios',
      home_currency: 'USD',
      meal_deduction_rate: '100',
      exchange_rates: { ...DEFAULT_FX_RATES }
    },
    trips: [],
    expenses: [],
    revenues: [],
    selectedTripId: 'trip-japan-2026',
    activeView: 'dashboard',
    categoryFilter: 'all',
    currencyFilter: 'all',
    specialFilter: 'all',
    searchQuery: '',
    pendingReceiptData: '',
    pendingReceiptName: '',
    serverOnline: false
  };

  function fmtUsd(val) {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  }

  function fmtUsdCompact(val) {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(num);
  }

  function fmtLocal(amount, currency) {
    const num = Number(amount) || 0;
    const sym = CURRENCY_SYMBOLS[currency] || (currency + ' ');
    const decimals = ['JPY', 'ISK', 'KRW'].includes(currency) ? 0 : 2;
    return sym + num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>✓</span><span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3200);
  }

  function computeDaysBetween(startStr, endStr) {
    if (!startStr || !endStr) return 1;
    const d1 = new Date(startStr + 'T00:00:00');
    const d2 = new Date(endStr + 'T00:00:00');
    const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diff);
  }

  function getLocalStore() {
    if (memoryStore && Array.isArray(memoryStore.trips) && memoryStore.trips.length > 0) {
      return memoryStore;
    }
    const raw = safeStorageGet('wayfarer_backup_state');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.trips) && parsed.trips.length > 0) {
          memoryStore = parsed;
          return memoryStore;
        }
      } catch (e) {}
    }
    memoryStore = getInitialSeedData();
    safeStorageSet('wayfarer_backup_state', JSON.stringify(memoryStore));
    return memoryStore;
  }

  function saveLocalStore(data) {
    memoryStore = data;
    safeStorageSet('wayfarer_backup_state', JSON.stringify(data));
  }

  function applyLocalMutation(url, method, payload) {
    const store = getLocalStore();
    if (url === '/api/expenses' && method === 'POST') {
      store.expenses.unshift({
        id: 'exp-' + Date.now(),
        ...payload
      });
    } else if (url.startsWith('/api/expenses/') && method === 'PUT') {
      const id = decodeURIComponent(url.replace('/api/expenses/', ''));
      store.expenses = store.expenses.map(e => (e.id === id ? { ...e, ...payload, id } : e));
    } else if (url.startsWith('/api/expenses/') && method === 'DELETE') {
      const id = decodeURIComponent(url.replace('/api/expenses/', ''));
      store.expenses = store.expenses.filter(e => e.id !== id);
    } else if (url === '/api/trips' && method === 'POST') {
      store.trips.unshift({
        id: 'trip-' + Date.now(),
        ...payload
      });
    } else if (url.startsWith('/api/trips/') && method === 'PUT') {
      const id = decodeURIComponent(url.replace('/api/trips/', ''));
      store.trips = store.trips.map(t => (t.id === id ? { ...t, ...payload, id } : t));
    } else if (url.startsWith('/api/trips/') && method === 'DELETE') {
      const id = decodeURIComponent(url.replace('/api/trips/', ''));
      store.trips = store.trips.filter(t => t.id !== id);
      store.expenses = store.expenses.filter(e => e.trip_id !== id);
      store.revenues = store.revenues.filter(r => r.trip_id !== id);
    } else if (url === '/api/revenues' && method === 'POST') {
      store.revenues.unshift({
        id: 'rev-' + Date.now(),
        ...payload
      });
    } else if (url.startsWith('/api/revenues/') && method === 'DELETE') {
      const id = decodeURIComponent(url.replace('/api/revenues/', ''));
      store.revenues = store.revenues.filter(r => r.id !== id);
    } else if (url === '/api/settings' && method === 'PUT') {
      store.settings = { ...store.settings, ...payload };
    }
    saveLocalStore(store);
    return store;
  }

  let memoryAuthToken = '';
  let memoryLocalCreds = null;
  let memorySessionUnlocked = false;

  function getAuthToken() {
    return safeStorageGet('wanderwallet_session_token') || memoryAuthToken || '';
  }

  function setAuthToken(token) {
    memoryAuthToken = token || '';
    safeStorageSet('wanderwallet_session_token', token || '');
  }

  function getLocalAuthCreds() {
    if (memoryLocalCreds) return memoryLocalCreds;
    const raw = safeStorageGet('wanderwallet_local_creds');
    if (raw) {
      try {
        memoryLocalCreds = JSON.parse(raw);
        return memoryLocalCreds;
      } catch (e) {}
    }
    return null;
  }

  function saveLocalAuthCreds(creds) {
    memoryLocalCreds = creds;
    safeStorageSet('wanderwallet_local_creds', JSON.stringify(creds));
  }

  function showAuthGate(mode = 'login', defaultUsername = 'admin', errorMessage = '') {
    const overlay = document.getElementById('auth-gate-overlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    document.getElementById('auth-gate-mode').value = mode;
    document.getElementById('auth-input-username').value = defaultUsername || 'admin';
    document.getElementById('auth-input-password').value = '';
    const confirmInput = document.getElementById('auth-input-confirm');
    if (confirmInput) confirmInput.value = '';

    const badge = document.getElementById('auth-gate-badge');
    const title = document.getElementById('auth-gate-title');
    const subtitle = document.getElementById('auth-gate-subtitle');
    const passLabel = document.getElementById('auth-label-password');
    const confirmGroup = document.getElementById('auth-confirm-group');
    const submitBtn = document.getElementById('btn-auth-gate-submit');
    const errEl = document.getElementById('auth-gate-error');

    if (mode === 'setup') {
      if (badge) badge.textContent = '🛡️ FIRST-TIME SECURITY SETUP';
      if (title) title.textContent = 'Create Your Admin Login';
      if (subtitle) {
        subtitle.textContent =
          'Protect your Wander Wallet URL so only you can access your trips, receipts, and financial data.';
      }
      if (passLabel) passLabel.textContent = 'Create Password (at least 4 characters)';
      if (confirmGroup) confirmGroup.style.display = 'flex';
      if (submitBtn) submitBtn.textContent = 'Save Password & Unlock Wander Wallet →';
    } else {
      if (badge) badge.textContent = '🔒 PROTECTED WORKSPACE';
      if (title) title.textContent = 'Sign In to Wander Wallet';
      if (subtitle) {
        subtitle.textContent =
          'Enter your credentials to unlock your production trips, receipts, and tax exports.';
      }
      if (passLabel) passLabel.textContent = 'Password';
      if (confirmGroup) confirmGroup.style.display = 'none';
      if (submitBtn) submitBtn.textContent = 'Unlock Wander Wallet →';
    }

    if (errEl) {
      if (errorMessage) {
        errEl.textContent = errorMessage;
        errEl.style.display = 'block';
      } else {
        errEl.style.display = 'none';
      }
    }

    setTimeout(() => {
      const passEl = document.getElementById('auth-input-password');
      if (passEl) passEl.focus();
    }, 50);
  }

  function hideAuthGate() {
    const overlay = document.getElementById('auth-gate-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  async function submitAuthGateForm() {
    const mode = document.getElementById('auth-gate-mode').value;
    const username = document.getElementById('auth-input-username').value.trim() || 'admin';
    const password = document.getElementById('auth-input-password').value;
    const confirm = document.getElementById('auth-input-confirm').value;
    const remember = document.getElementById('auth-input-remember').checked;

    if (!password || password.length < 4) {
      showAuthGate(mode, username, 'Password must be at least 4 characters.');
      return;
    }
    if (mode === 'setup' && password !== confirm) {
      showAuthGate(mode, username, 'Passwords do not match. Please try again.');
      return;
    }

    if (location.protocol.startsWith('http')) {
      try {
        const endpoint = mode === 'setup' ? '/api/auth/setup' : '/api/auth/login';
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, remember })
        });
        const data = await res.json();
        if (!res.ok) {
          showAuthGate(mode, username, data.error || 'Authentication failed.');
          return;
        }
        if (data.token) {
          setAuthToken(data.token);
        }
        state.authUsername = data.username || username;
        hideAuthGate();
        showToast(mode === 'setup' ? 'Admin password created & device signed in!' : `Welcome back, ${state.authUsername}!`);
        const boot = await apiRequest('/api/bootstrap');
        if (boot) applyBootstrapData(boot);
        return;
      } catch (err) {
        // Fallback to local auth if server is offline
      }
    }

    // Local / standalone preview mode authentication
    if (mode === 'setup') {
      saveLocalAuthCreds({ username, password });
      memorySessionUnlocked = true;
      setAuthToken('local-token-' + Date.now());
      state.authUsername = username;
      hideAuthGate();
      showToast('Admin password saved! Workspace unlocked.');
      return;
    } else {
      const localCreds = getLocalAuthCreds();
      if (
        localCreds &&
        localCreds.password === password &&
        (!username || username.toLowerCase() === (localCreds.username || 'admin').toLowerCase())
      ) {
        memorySessionUnlocked = true;
        setAuthToken('local-token-' + Date.now());
        state.authUsername = localCreds.username || 'admin';
        hideAuthGate();
        showToast(`Welcome back, ${state.authUsername}!`);
      } else {
        showAuthGate('login', username, 'Invalid username or password.');
      }
    }
  }

  async function lockAndLogout() {
    const token = getAuthToken();
    setAuthToken('');
    memorySessionUnlocked = false;
    if (location.protocol.startsWith('http')) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
      } catch (e) {}
      try {
        const stRes = await fetch('/api/auth/status');
        const st = await stRes.json();
        showAuthGate(st.configured ? 'login' : 'setup', st.username || 'admin');
        showToast('Workspace locked');
        return;
      } catch (e) {}
    }
    const localCreds = getLocalAuthCreds();
    showAuthGate(localCreds ? 'login' : 'setup', (localCreds && localCreds.username) || 'admin');
    showToast('Workspace locked');
  }

  async function openSecuritySettingsModal() {
    document.getElementById('sec-current-password').value = '';
    document.getElementById('sec-new-password').value = '';
    document.getElementById('sec-confirm-password').value = '';
    const envNotice = document.getElementById('security-env-notice');
    const curGroup = document.getElementById('sec-current-pass-group');

    if (location.protocol.startsWith('http')) {
      try {
        const res = await fetch('/api/auth/status', {
          headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}
        });
        const st = await res.json();
        document.getElementById('sec-username').value = st.username || 'admin';
        if (envNotice) envNotice.style.display = st.envManaged ? 'block' : 'none';
        if (curGroup) curGroup.style.display = st.configured ? 'flex' : 'none';
      } catch (e) {}
    } else {
      const localCreds = getLocalAuthCreds();
      document.getElementById('sec-username').value = (localCreds && localCreds.username) || 'admin';
      if (curGroup) curGroup.style.display = localCreds ? 'flex' : 'none';
    }
    openModal('modal-security');
  }

  async function saveSecurityPasswordFromModal() {
    const newUsername = document.getElementById('sec-username').value.trim() || 'admin';
    const currentPassword = document.getElementById('sec-current-password').value;
    const newPassword = document.getElementById('sec-new-password').value;
    const confirmPassword = document.getElementById('sec-confirm-password').value;

    if (!newPassword || newPassword.length < 4) {
      showToast('New password must be at least 4 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match');
      return;
    }

    if (location.protocol.startsWith('http')) {
      try {
        const stRes = await fetch('/api/auth/status');
        const st = await stRes.json();
        if (!st.configured) {
          const setupRes = await fetch('/api/auth/setup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: newUsername, password: newPassword })
          });
          const setupData = await setupRes.json();
          if (!setupRes.ok) {
            showToast(setupData.error || 'Could not set password');
            return;
          }
          if (setupData.token) setAuthToken(setupData.token);
          closeModal('modal-security');
          showToast('Account login & password enabled!');
          return;
        }

        const res = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {})
          },
          body: JSON.stringify({
            current_password: currentPassword,
            new_username: newUsername,
            new_password: newPassword
          })
        });
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || 'Failed to update password');
          return;
        }
        closeModal('modal-security');
        showToast('Password updated!');
        return;
      } catch (e) {}
    }

    // Local fallback
    const existing = getLocalAuthCreds();
    if (existing && existing.password !== currentPassword) {
      showToast('Current password is incorrect');
      return;
    }
    saveLocalAuthCreds({ username: newUsername, password: newPassword });
    memorySessionUnlocked = true;
    closeModal('modal-security');
    showToast('Password saved! Use 🔒 Lock App anytime to test your login screen.');
  }

  async function apiRequest(url, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const payload = options.body ? JSON.parse(options.body) : null;

    if (!location.protocol.startsWith('http')) {
      setSyncIndicator(false);
      if (method === 'GET') return getLocalStore();
      return applyLocalMutation(url, method, payload);
    }

    const token = getAuthToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    try {
      const res = await fetch(url, {
        ...options,
        headers
      });
      if (res.status === 401) {
        const errBody = await res.json().catch(() => ({}));
        showAuthGate(errBody.configured === false ? 'setup' : 'login', 'admin');
        return null;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      saveLocalStore(data);
      setSyncIndicator(true);
      return data;
    } catch (err) {
      setSyncIndicator(false);
      if (method === 'GET') {
        return getLocalStore();
      }
      return applyLocalMutation(url, method, payload);
    }
  }

  function setSyncIndicator(online) {
    state.serverOnline = online;
    const dot = document.getElementById('sync-status-dot');
    const txt = document.getElementById('sync-status-text');
    if (!dot || !txt) return;
    if (online) {
      dot.style.backgroundColor = 'var(--accent-primary)';
      txt.textContent = 'Cloud SQLite Synced';
    } else {
      dot.style.backgroundColor = 'var(--accent-sky)';
      txt.textContent = 'Interactive Local Mode';
    }
  }

  function applyBootstrapData(data) {
    if (!data) return;
    state.settings = data.settings || state.settings;
    state.trips = data.trips || [];
    state.expenses = data.expenses || [];
    state.revenues = data.revenues || [];

    if (
      state.selectedTripId !== 'all' &&
      !state.trips.some(t => t.id === state.selectedTripId)
    ) {
      state.selectedTripId = state.trips[0] ? state.trips[0].id : 'all';
    }
    renderAll();
  }

  let isInitialized = false;
  async function initApp() {
    if (isInitialized) return;
    isInitialized = true;

    try {
      if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
        navigator.serviceWorker.register('sw.js').catch(() => {});
      }
    } catch (e) {}

    const savedTheme = safeStorageGet('wanderwallet_theme') || memoryTheme || 'dark';
    memoryTheme = savedTheme;
    document.documentElement.setAttribute('data-theme', savedTheme);

    bindEvents();
    applyBootstrapData(getLocalStore());

    if (location.protocol.startsWith('http')) {
      try {
        const token = getAuthToken();
        const stRes = await fetch('/api/auth/status', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (stRes.ok) {
          const st = await stRes.json();
          if (!st.configured) {
            showAuthGate('setup', st.username || 'admin');
            return;
          }
          if (!st.authenticated) {
            showAuthGate('login', st.username || 'admin');
            return;
          }
        }
      } catch (e) {}
    }

    const data = await apiRequest('/api/bootstrap');
    if (data) {
      applyBootstrapData(data);
    }
  }

  function getScopedTrips() {
    if (state.selectedTripId === 'all') return state.trips;
    return state.trips.filter(t => t.id === state.selectedTripId);
  }

  function getScopedExpenses() {
    if (state.selectedTripId === 'all') return state.expenses;
    return state.expenses.filter(e => e.trip_id === state.selectedTripId);
  }

  function getScopedRevenues() {
    if (state.selectedTripId === 'all') return state.revenues;
    return state.revenues.filter(r => r.trip_id === state.selectedTripId);
  }

  function renderAll() {
    const chEl = document.getElementById('sidebar-channel-name');
    const nameVal = state.settings.channel_name;
    if (chEl) chEl.textContent = (!nameVal || nameVal === 'Nomad Frame Studios') ? 'Wander Wallet' : nameVal;

    const expBadge = document.getElementById('badge-expense-count');
    if (expBadge) expBadge.textContent = state.expenses.length;
    const tripBadge = document.getElementById('badge-trip-count');
    if (tripBadge) tripBadge.textContent = state.trips.length;
    const revBadge = document.getElementById('badge-revenue-count');
    if (revBadge) revBadge.textContent = state.revenues.length;

    renderTripSelectors();
    renderTripContextBanner();
    renderDashboardKpis();
    renderCategoryBreakdown();
    renderDailyBurnChart();
    renderLedgerCategoryChips();
    renderExpenseLedger();
    renderTripsView();
    renderRevenueView();
    renderTaxView();
  }

  function renderTripSelectors() {
    const globalSelect = document.getElementById('global-trip-select');
    if (globalSelect) {
      const currentVal = state.selectedTripId;
      globalSelect.innerHTML = `<option value="all">All Production Trips (${state.trips.length})</option>` +
        state.trips.map(t =>
          `<option value="${escapeHtml(t.id)}">${escapeHtml(t.name)} (${escapeHtml(t.default_currency)})</option>`
        ).join('');
      globalSelect.value = currentVal;
    }

    const sidebarList = document.getElementById('sidebar-trip-list');
    if (sidebarList) {
      sidebarList.innerHTML = state.trips.map(t => {
        const tripSpend = state.expenses
          .filter(e => e.trip_id === t.id)
          .reduce((sum, e) => sum + (Number(e.amount_usd) || 0), 0);
        const isSelected = state.selectedTripId === t.id;
        return `
          <li>
            <button type="button" class="nav-item-btn ${isSelected ? 'active' : ''}" data-select-trip="${escapeHtml(t.id)}">
              <span class="nav-item-left">
                <span>${t.status === 'active' ? '🟢' : '📁'}</span>
                <span class="nav-item-text">${escapeHtml(t.name)}</span>
              </span>
              <span class="nav-badge mono">${fmtUsdCompact(tripSpend)}</span>
            </button>
          </li>
        `;
      }).join('');
    }

    const expTripSelect = document.getElementById('exp-trip-id');
    const revTripSelect = document.getElementById('rev-trip-id');
    const tripOptionsHtml = state.trips.map(t =>
      `<option value="${escapeHtml(t.id)}">${escapeHtml(t.name)} — ${escapeHtml(t.destination)}</option>`
    ).join('');
    if (expTripSelect) expTripSelect.innerHTML = tripOptionsHtml;
    if (revTripSelect) revTripSelect.innerHTML = tripOptionsHtml;
  }

  function renderTripContextBanner() {
    const banner = document.getElementById('trip-context-banner');
    if (!banner) return;
    if (state.selectedTripId === 'all') {
      const totalDays = state.trips.reduce((acc, t) => acc + computeDaysBetween(t.start_date, t.end_date), 0);
      const totalVideos = state.trips.reduce((acc, t) => acc + (Number(t.video_count) || 1), 0);
      banner.innerHTML = `
        <div class="trip-context-info">
          <div class="trip-context-eyebrow">
            <span class="status-badge active">CHANNEL PORTFOLIO</span>
            <span>${state.trips.length} Production Trips</span>
            <span>•</span>
            <span>Multi-Currency Consolidated (USD)</span>
          </div>
          <h2 class="trip-context-title">All YouTube Travel Productions</h2>
          <p class="trip-context-notes">Viewing consolidated expenses, hotel folios, crew meals, and sponsor revenue across all active and wrapped shoots.</p>
        </div>
        <div class="trip-context-meta">
          <div class="meta-stat">
            <span class="meta-stat-label">Total Shoot Days</span>
            <span class="meta-stat-val tabular">${totalDays} Days</span>
          </div>
          <div class="meta-stat">
            <span class="meta-stat-label">Target Episodes</span>
            <span class="meta-stat-val tabular">${totalVideos} Videos</span>
          </div>
          <div class="meta-stat">
            <span class="meta-stat-label">Home Currency</span>
            <span class="meta-stat-val mono">${escapeHtml(state.settings.home_currency || 'USD')}</span>
          </div>
        </div>
      `;
      return;
    }

    const trip = state.trips.find(t => t.id === state.selectedTripId);
    if (!trip) return;
    const days = computeDaysBetween(trip.start_date, trip.end_date);
    const fxRate = state.settings.exchange_rates[trip.default_currency] || 1;
    banner.innerHTML = `
      <div class="trip-context-info">
        <div class="trip-context-eyebrow">
          <span class="status-badge ${escapeHtml(trip.status)}">${escapeHtml(trip.status)}</span>
          <span>📍 ${escapeHtml(trip.destination)}</span>
          <span>•</span>
          <span class="mono">${escapeHtml(trip.start_date)} → ${escapeHtml(trip.end_date)} (${days} days)</span>
        </div>
        <h2 class="trip-context-title">${escapeHtml(trip.name)}</h2>
        <p class="trip-context-notes">${escapeHtml(trip.notes || 'Production expense tracking & budget burn rate.')}</p>
      </div>
      <div class="trip-context-meta">
        <div class="meta-stat">
          <span class="meta-stat-label">Local Currency</span>
          <span class="meta-stat-val mono">${escapeHtml(trip.default_currency)} (${fxRate === 1 ? '1.00' : fxRate})</span>
        </div>
        <div class="meta-stat">
          <span class="meta-stat-label">Deliverables</span>
          <span class="meta-stat-val tabular">${trip.video_count} YouTube Episodes</span>
        </div>
        <button type="button" class="btn btn-sm" id="btn-banner-edit-trip" data-edit-trip="${escapeHtml(trip.id)}">✎ Edit Trip</button>
      </div>
    `;
  }

  function renderDashboardKpis() {
    const trips = getScopedTrips();
    const expenses = getScopedExpenses();
    const revenues = getScopedRevenues();

    const totalSpend = expenses.reduce((s, e) => s + (Number(e.amount_usd) || 0), 0);
    const deductibleSpend = expenses
      .filter(e => e.tax_deductible)
      .reduce((s, e) => s + (Number(e.amount_usd) || 0), 0);
    const taxPct = totalSpend > 0 ? Math.round((deductibleSpend / totalSpend) * 100) : 100;

    const totalVideos = Math.max(1, trips.reduce((s, t) => s + (Number(t.video_count) || 1), 0));
    const costPerVideo = totalSpend / totalVideos;

    const totalBudget = trips.reduce((s, t) => s + (Number(t.budget_usd) || 0), 0);
    const budgetRemaining = totalBudget - totalSpend;
    const budgetUsedPct = totalBudget > 0 ? Math.min(100, Math.round((totalSpend / totalBudget) * 100)) : 0;

    const totalShootDays = Math.max(1, trips.reduce((s, t) => s + computeDaysBetween(t.start_date, t.end_date), 0));
    const dailyBurn = totalSpend / totalShootDays;

    const hotelSpend = expenses
      .filter(e => e.category === 'Hotels & Lodging')
      .reduce((s, e) => s + (Number(e.amount_usd) || 0), 0);
    const mealSpend = expenses
      .filter(e => e.category === 'Meals & Craft')
      .reduce((s, e) => s + (Number(e.amount_usd) || 0), 0);

    const totalRev = revenues.reduce((s, r) => s + (Number(r.amount_usd) || 0), 0);
    const netProfit = totalRev - totalSpend;
    const roiMultiple = totalSpend > 0 ? (totalRev / totalSpend).toFixed(1) : '0.0';
    const reimbursableTotal = expenses
      .filter(e => e.reimbursable)
      .reduce((s, e) => s + (Number(e.amount_usd) || 0), 0);

    document.getElementById('kpi-total-spend').textContent = fmtUsd(totalSpend);
    document.getElementById('kpi-tax-pct-tag').textContent = `${taxPct}% Tax Deductible`;
    document.getElementById('kpi-expense-items-sub').textContent = `${expenses.length} itemized entries`;
    document.getElementById('kpi-cost-per-video').textContent = `${fmtUsdCompact(costPerVideo)} / video`;

    const remEl = document.getElementById('kpi-budget-remaining');
    const statusTag = document.getElementById('kpi-budget-status-tag');
    const barEl = document.getElementById('kpi-budget-bar');
    if (budgetRemaining >= 0) {
      remEl.textContent = `${fmtUsd(budgetRemaining)} left`;
    } else {
      remEl.textContent = `${fmtUsd(Math.abs(budgetRemaining))} over`;
    }
    barEl.style.width = `${budgetUsedPct}%`;
    barEl.className = 'progress-fill';
    statusTag.className = 'kpi-tag';
    if (totalSpend > totalBudget) {
      barEl.classList.add('danger');
      statusTag.classList.add('danger');
      statusTag.textContent = 'Over Budget';
    } else if (budgetUsedPct >= 82) {
      barEl.classList.add('warning');
      statusTag.classList.add('warning');
      statusTag.textContent = 'Near Cap';
    } else {
      statusTag.classList.add('positive');
      statusTag.textContent = 'On Track';
    }
    document.getElementById('kpi-budget-used-pct').textContent = `${budgetUsedPct}% utilized`;
    document.getElementById('kpi-budget-cap-label').textContent = `of ${fmtUsdCompact(totalBudget)} budget`;

    document.getElementById('kpi-daily-burn').innerHTML =
      `${fmtUsd(dailyBurn)}<span style="font-size: 13px; font-weight: 500; color: var(--text-muted);"> / day</span>`;
    document.getElementById('kpi-burn-days-tag').textContent = `${totalShootDays} Shoot Days`;
    document.getElementById('kpi-hotel-share').textContent = `Hotels: ${fmtUsdCompact(hotelSpend)}`;
    document.getElementById('kpi-meal-share').textContent = `Meals: ${fmtUsdCompact(mealSpend)}`;

    const netEl = document.getElementById('kpi-net-profit');
    netEl.textContent = (netProfit >= 0 ? '+' : '') + fmtUsd(netProfit);
    netEl.style.color = netProfit >= 0 ? 'var(--accent-primary)' : 'var(--accent-danger)';
    document.getElementById('kpi-roi-multiple-tag').textContent = `${roiMultiple}x ROI`;
    document.getElementById('kpi-total-revenue-sub').textContent = `Sponsor+AdSense: ${fmtUsdCompact(totalRev)}`;
    document.getElementById('kpi-reimbursable-sub').textContent = `Reimburse: ${fmtUsdCompact(reimbursableTotal)}`;
  }

  function renderCategoryBreakdown() {
    const expenses = getScopedExpenses();
    const totalSpend = expenses.reduce((s, e) => s + (Number(e.amount_usd) || 0), 0);

    const clearBtn = document.getElementById('btn-clear-cat-filter');
    if (clearBtn) clearBtn.style.display = state.categoryFilter === 'all' ? 'none' : 'inline-flex';

    const totalsByCat = {};
    for (const cat of Object.keys(CATEGORY_META)) {
      totalsByCat[cat] = 0;
    }
    for (const exp of expenses) {
      totalsByCat[exp.category] = (totalsByCat[exp.category] || 0) + (Number(exp.amount_usd) || 0);
    }

    const sortedCats = Object.entries(totalsByCat).sort((a, b) => b[1] - a[1]);
    const listEl = document.getElementById('category-breakdown-list');
    if (!listEl) return;

    listEl.innerHTML = sortedCats.map(([cat, amount]) => {
      const pct = totalSpend > 0 ? Math.round((amount / totalSpend) * 100) : 0;
      const meta = CATEGORY_META[cat] || { color: 'var(--accent-sky)', icon: '📌' };
      const isSelected = state.categoryFilter === cat;
      return `
        <div class="category-row" data-filter-cat="${escapeHtml(cat)}" style="${isSelected ? 'background-color: var(--bg-subtle);' : ''}">
          <div class="category-row-top">
            <span class="category-name-wrap">
              <span class="cat-dot" style="background-color: ${meta.color};"></span>
              <span>${meta.icon} ${escapeHtml(cat)}</span>
            </span>
            <span class="category-stats tabular">
              <span class="category-amount">${fmtUsd(amount)}</span>
              <span class="category-pct">${pct}%</span>
            </span>
          </div>
          <div class="progress-track" style="height: 6px;">
            <div class="progress-fill" style="width: ${pct}%; background-color: ${meta.color};"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderDailyBurnChart() {
    const expenses = getScopedExpenses();
    const chartEl = document.getElementById('daily-burn-chart');
    const peakTag = document.getElementById('chart-peak-day-tag');
    if (!chartEl || !peakTag) return;

    if (expenses.length === 0) {
      peakTag.textContent = 'Peak: $0';
      chartEl.innerHTML = `<div style="margin: auto; color: var(--text-muted); font-size: 13px;">No expenses logged for this trip yet.</div>`;
      return;
    }

    const mapByDate = new Map();
    for (const e of expenses) {
      const d = e.expense_date;
      mapByDate.set(d, (mapByDate.get(d) || 0) + (Number(e.amount_usd) || 0));
    }

    const sortedDates = Array.from(mapByDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-10);

    const maxVal = Math.max(...sortedDates.map(d => d[1]), 1);
    peakTag.textContent = `Peak Day: ${fmtUsdCompact(maxVal)}`;

    chartEl.innerHTML = `
      <div class="burn-bars-wrap">
        ${sortedDates.map(([dateStr, val]) => {
          const heightPct = Math.max(6, Math.round((val / maxVal) * 100));
          const shortDate = dateStr.slice(5);
          return `
            <div class="burn-bar-col" title="${dateStr}: ${fmtUsd(val)}">
              <span class="burn-bar-val mono">${fmtUsdCompact(val)}</span>
              <div class="burn-bar-fill" style="height: ${heightPct}%;"></div>
              <span class="burn-bar-date mono">${escapeHtml(shortDate)}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderLedgerCategoryChips() {
    const container = document.getElementById('ledger-category-chips');
    if (!container) return;
    const categories = ['all', ...Object.keys(CATEGORY_META)];
    container.innerHTML = categories.map(cat => {
      const active = state.categoryFilter === cat ? 'active' : '';
      const label = cat === 'all' ? 'All Categories' : `${CATEGORY_META[cat].icon} ${cat}`;
      return `<button type="button" class="chip-btn ${active}" data-chip-cat="${escapeHtml(cat)}">${escapeHtml(label)}</button>`;
    }).join('');
  }

  function renderExpenseLedger() {
    const expenses = getScopedExpenses();
    const tripMap = new Map(state.trips.map(t => [t.id, t]));
    const q = state.searchQuery.trim().toLowerCase();

    const filtered = expenses.filter(e => {
      if (state.categoryFilter !== 'all' && e.category !== state.categoryFilter) return false;
      if (state.currencyFilter !== 'all' && e.currency !== state.currencyFilter) return false;
      if (state.specialFilter === 'receipts' && !e.receipt_data) return false;
      if (state.specialFilter === 'missing_receipt' && (e.receipt_data || e.amount_usd < 75)) return false;
      if (state.specialFilter === 'reimbursable' && !e.reimbursable) return false;
      if (q) {
        const hay = `${e.title} ${e.vendor} ${e.category} ${e.notes} ${e.currency} ${e.paid_by}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const tbody = document.getElementById('ledger-table-body');
    if (!tbody) return;
    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; padding: 32px; color: var(--text-muted);">
            No matching expenses found. Click <strong>+ Add Item</strong> to log a hotel, meal, or receipt.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(e => {
      const trip = tripMap.get(e.trip_id);
      const meta = CATEGORY_META[e.category] || { color: 'var(--accent-sky)', icon: '📌' };
      const isForeign = e.currency !== 'USD';

      return `
        <tr>
          <td class="mono" style="white-space: nowrap; color: var(--text-secondary); font-size: 12.5px;">
            ${escapeHtml(e.expense_date)}
          </td>
          <td>
            <div class="expense-title-cell">
              <span class="expense-title">${escapeHtml(e.title)}</span>
              <span class="expense-vendor">
                ${escapeHtml(e.vendor || 'Direct Vendor')}
                ${e.notes ? ` • <em>${escapeHtml(e.notes)}</em>` : ''}
              </span>
            </div>
          </td>
          <td style="white-space: nowrap; font-size: 12.5px;">
            ${trip ? escapeHtml(trip.name) : escapeHtml(e.trip_id)}
          </td>
          <td>
            <span class="cat-badge">
              <span class="cat-dot" style="background-color: ${meta.color};"></span>
              <span>${escapeHtml(e.category)}</span>
            </span>
          </td>
          <td class="mono" style="white-space: nowrap;">
            ${isForeign
              ? `<span class="fx-pill" title="FX Rate: ${e.exchange_rate}">${escapeHtml(fmtLocal(e.amount_original, e.currency))} (${escapeHtml(e.currency)})</span>`
              : `<span style="color: var(--text-muted); font-size: 12px;">USD (Home)</span>`
            }
          </td>
          <td class="mono" style="text-align: right; font-weight: 700; font-size: 14px; white-space: nowrap;">
            ${fmtUsd(e.amount_usd)}
          </td>
          <td style="font-size: 12.5px; white-space: nowrap;">
            <div>${escapeHtml(e.payment_method)}</div>
            <div style="color: var(--text-muted); font-size: 11.5px;">
              ${escapeHtml(e.paid_by)}
              ${e.reimbursable ? ` • <strong style="color: var(--accent-amber);">Reimburse</strong>` : ''}
            </div>
          </td>
          <td>
            ${e.receipt_data
              ? `<button type="button" class="receipt-btn" data-view-receipt="${escapeHtml(e.id)}">🧾 View Folio</button>`
              : `<span style="color: var(--text-muted); font-size: 12px;">—</span>`
            }
          </td>
          <td>
            <div class="row-actions">
              <button type="button" class="btn btn-sm" data-edit-expense="${escapeHtml(e.id)}" title="Edit">✎</button>
              <button type="button" class="btn btn-sm btn-danger-ghost" data-delete-expense="${escapeHtml(e.id)}" title="Delete">✕</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderTripsView() {
    const grid = document.getElementById('trips-cards-grid');
    if (!grid) return;
    grid.innerHTML = state.trips.map(t => {
      const exps = state.expenses.filter(e => e.trip_id === t.id);
      const revs = state.revenues.filter(r => r.trip_id === t.id);
      const spend = exps.reduce((s, e) => s + (Number(e.amount_usd) || 0), 0);
      const rev = revs.reduce((s, r) => s + (Number(r.amount_usd) || 0), 0);
      const net = rev - spend;
      const days = computeDaysBetween(t.start_date, t.end_date);
      const pct = t.budget_usd > 0 ? Math.min(100, Math.round((spend / t.budget_usd) * 100)) : 0;

      return `
        <div class="panel-card" style="gap: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
            <div>
              <span class="status-badge ${escapeHtml(t.status)}">${escapeHtml(t.status)}</span>
              <h3 style="font-size: 16px; font-weight: 700; margin-top: 6px;">${escapeHtml(t.name)}</h3>
              <div style="font-size: 12.5px; color: var(--text-secondary);">📍 ${escapeHtml(t.destination)} (${escapeHtml(t.default_currency)})</div>
            </div>
            <div style="display: flex; gap: 6px;">
              <button type="button" class="btn btn-sm" data-edit-trip="${escapeHtml(t.id)}">✎</button>
              <button type="button" class="btn btn-sm btn-danger-ghost" data-delete-trip="${escapeHtml(t.id)}">✕</button>
            </div>
          </div>

          <div class="mono" style="font-size: 12px; color: var(--text-muted);">
            ${escapeHtml(t.start_date)} → ${escapeHtml(t.end_date)} (${days} days • ${t.video_count} videos)
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
              <span>Spend: <strong class="tabular">${fmtUsd(spend)}</strong></span>
              <span class="tabular" style="color: var(--text-muted);">Budget: ${fmtUsd(t.budget_usd)} (${pct}%)</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill ${spend > t.budget_usd ? 'danger' : pct > 82 ? 'warning' : ''}" style="width: ${pct}%;"></div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; padding-top: 8px; border-top: 1px solid var(--border-subtle); font-size: 12px;">
            <div>
              <div style="color: var(--text-muted);">Daily Burn</div>
              <div class="tabular" style="font-weight: 600;">${fmtUsdCompact(spend / days)}/d</div>
            </div>
            <div>
              <div style="color: var(--text-muted);">Sponsor + AdSense</div>
              <div class="tabular" style="font-weight: 600;">${fmtUsdCompact(rev)}</div>
            </div>
            <div>
              <div style="color: var(--text-muted);">Net Profit</div>
              <div class="tabular" style="font-weight: 700; color: ${net >= 0 ? 'var(--accent-primary)' : 'var(--accent-danger)'};">
                ${(net >= 0 ? '+' : '') + fmtUsdCompact(net)}
              </div>
            </div>
          </div>

          <button type="button" class="btn btn-sm" data-open-trip-dashboard="${escapeHtml(t.id)}" style="width: 100%;">
            Open Trip Expense Ledger →
          </button>
        </div>
      `;
    }).join('');
  }

  function renderRevenueView() {
    const revenues = getScopedRevenues();
    const tripMap = new Map(state.trips.map(t => [t.id, t]));
    const tbody = document.getElementById('revenue-table-body');
    if (!tbody) return;

    if (revenues.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 28px; color: var(--text-muted);">No revenue entries logged for this selection.</td></tr>`;
      return;
    }

    tbody.innerHTML = revenues.map(r => {
      const trip = tripMap.get(r.trip_id);
      const badgeClass = r.status === 'paid' ? 'active' : r.status === 'invoiced' ? 'completed' : 'planned';
      return `
        <tr>
          <td class="mono" style="font-size: 12.5px; color: var(--text-secondary);">${escapeHtml(r.revenue_date)}</td>
          <td>
            <div class="expense-title">${escapeHtml(r.title)}</div>
            <div class="expense-vendor">${escapeHtml(r.video_title || '')}</div>
          </td>
          <td>
            <span class="cat-badge">${escapeHtml(r.source_type)}</span>
            <span style="font-size: 12.5px; margin-left: 6px; color: var(--text-secondary);">${escapeHtml(r.sponsor_name)}</span>
          </td>
          <td style="font-size: 12.5px;">${trip ? escapeHtml(trip.name) : escapeHtml(r.trip_id)}</td>
          <td><span class="status-badge ${badgeClass}">${escapeHtml(r.status)}</span></td>
          <td class="mono" style="text-align: right; font-weight: 700; color: var(--accent-primary);">${fmtUsd(r.amount_usd)}</td>
          <td>
            <div class="row-actions">
              <button type="button" class="btn btn-sm btn-danger-ghost" data-delete-revenue="${escapeHtml(r.id)}">✕</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderTaxView() {
    const expenses = getScopedExpenses();
    const mealRate = Number(state.settings.meal_deduction_rate || 100) / 100;
    const mealSelect = document.getElementById('select-meal-deduction-rate');
    if (mealSelect) mealSelect.value = String(state.settings.meal_deduction_rate || '100');

    let grossTotal = 0;
    let deductibleTotal = 0;
    let reimbursableTotal = 0;
    let receiptsCount = 0;

    const catStats = {};
    for (const cat of Object.keys(CATEGORY_META)) {
      catStats[cat] = { count: 0, receipts: 0, gross: 0, deductible: 0 };
    }

    for (const e of expenses) {
      const amt = Number(e.amount_usd) || 0;
      const isMeal = e.category === 'Meals & Craft';
      const ded = e.tax_deductible ? amt * (isMeal ? mealRate : 1.0) : 0;

      grossTotal += amt;
      deductibleTotal += ded;
      if (e.reimbursable) reimbursableTotal += amt;
      if (e.receipt_data) receiptsCount++;

      if (!catStats[e.category]) {
        catStats[e.category] = { count: 0, receipts: 0, gross: 0, deductible: 0 };
      }
      catStats[e.category].count++;
      if (e.receipt_data) catStats[e.category].receipts++;
      catStats[e.category].gross += amt;
      catStats[e.category].deductible += ded;
    }

    const kpiContainer = document.getElementById('tax-summary-kpis');
    if (kpiContainer) {
      kpiContainer.innerHTML = `
        <div class="kpi-card">
          <span class="kpi-label">Gross Production Spend</span>
          <div class="kpi-value tabular">${fmtUsd(grossTotal)}</div>
          <span class="kpi-subtext">${expenses.length} total transactions</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Estimated Tax-Deductible Total</span>
          <div class="kpi-value tabular" style="color: var(--accent-primary);">${fmtUsd(deductibleTotal)}</div>
          <span class="kpi-subtext">Schedule C / Production Write-Off</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Pending Crew Reimbursements</span>
          <div class="kpi-value tabular" style="color: var(--accent-amber);">${fmtUsd(reimbursableTotal)}</div>
          <span class="kpi-subtext">Paid out-of-pocket by host/crew</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Verified Receipt Vault</span>
          <div class="kpi-value tabular">${receiptsCount} / ${expenses.length}</div>
          <span class="kpi-subtext">Digital folios attached</span>
        </div>
      `;
    }

    const taxTbody = document.getElementById('tax-category-table-body');
    if (taxTbody) {
      taxTbody.innerHTML = Object.entries(catStats).map(([cat, st]) => {
        const meta = CATEGORY_META[cat] || { icon: '📌' };
        return `
          <tr>
            <td style="font-weight: 600;">${meta.icon} ${escapeHtml(cat)}</td>
            <td class="tabular">${st.count} items</td>
            <td class="tabular">${st.receipts} attached</td>
            <td class="mono" style="text-align: right;">${fmtUsd(st.gross)}</td>
            <td class="mono" style="text-align: right; font-weight: 700; color: var(--accent-primary);">${fmtUsd(st.deductible)}</td>
          </tr>
        `;
      }).join('');
    }
  }

  const WALKTHROUGH_SLIDES = [
    {
      step: 1,
      title: '1. Create a Production Trip & Set Your Budget',
      subtitle: 'Organize every shoot by destination so you always know how much each trip and video episode costs.',
      ctaLabel: '+ Open New Trip Form',
      ctaAction: 'new-trip',
      html: `
        <div class="wt-demo-box">
          <div class="wt-demo-row">
            <div>
              <div style="font-weight: 700; color: var(--text-primary);">✈️ Japan Shoot - Nov 2026</div>
              <div style="font-size: 12px; color: var(--text-muted);">Tokyo, Kyoto &amp; Hokkaido • Default Currency: JPY (¥)</div>
            </div>
            <span class="kpi-tag positive">Active Shoot</span>
          </div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
            <div style="padding: 10px; background: var(--bg-elevated); border-radius: 6px; border: 1px solid var(--border-subtle);">
              <div style="font-size: 11px; color: var(--text-muted);">TARGET BUDGET</div>
              <div class="mono" style="font-size: 15px; font-weight: 700;">$9,500 USD</div>
            </div>
            <div style="padding: 10px; background: var(--bg-elevated); border-radius: 6px; border: 1px solid var(--border-subtle);">
              <div style="font-size: 11px; color: var(--text-muted);">PLANNED VIDEOS</div>
              <div class="mono" style="font-size: 15px; font-weight: 700;">3 Episodes</div>
            </div>
            <div style="padding: 10px; background: var(--bg-elevated); border-radius: 6px; border: 1px solid var(--border-subtle);">
              <div style="font-size: 11px; color: var(--text-muted);">TARGET / VIDEO</div>
              <div class="mono" style="font-size: 15px; font-weight: 700; color: var(--accent-sky);">$3,167 / ep</div>
            </div>
          </div>
        </div>
      `
    },
    {
      step: 2,
      title: '2. Snap Receipts & Auto-Convert Foreign Currencies',
      subtitle: 'Enter local prices (JPY, EUR, ISK, CHF, GBP, etc.) on the road — Wander Wallet converts to USD and compresses your camera receipt photo.',
      ctaLabel: '📸 Try Quick Add Expense',
      ctaAction: 'new-expense',
      html: `
        <div class="wt-demo-box">
          <div class="wt-demo-row">
            <div>
              <div style="font-weight: 700;">🏨 Shibuya Stream Excel Hotel (4 Nights)</div>
              <div style="font-size: 12px; color: var(--text-muted);">Paid in Local Currency: <span class="mono">¥242,000 JPY</span> (Rate: 0.00658)</div>
            </div>
            <div style="text-align: right;">
              <div class="mono" style="font-weight: 700; font-size: 15px; color: var(--accent-primary);">$1,592.36 USD</div>
              <span style="font-size: 11px; color: var(--accent-sky);">📷 Verified Folio Attached</span>
            </div>
          </div>
          <div style="font-size: 12px; color: var(--text-secondary); display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
            <span>✓ Supports 11 road currencies with live FX preview</span>
            <span>✓ Auto-compresses phone camera photos into SQLite</span>
          </div>
        </div>
      `
    },
    {
      step: 3,
      title: '3. Monitor Daily Burn Rate & Remaining Runway',
      subtitle: 'Watch your real-time Trip Budget progress bar, daily burn rate ($/day), and category breakdown while shooting.',
      ctaLabel: '📊 View Live Dashboard',
      ctaAction: 'goto-dashboard',
      html: `
        <div class="wt-demo-box">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 12.5px; font-weight: 600;">Japan Shoot Budget Runway ($5,635 of $9,500 used)</span>
            <span class="mono" style="font-size: 12.5px; font-weight: 700; color: var(--accent-primary);">$3,865.00 left (59%)</span>
          </div>
          <div class="progress-track" style="height: 10px;">
            <div class="progress-fill" style="width: 59%;"></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--text-muted);">
            <span>Daily Burn: <strong style="color: var(--text-primary);">$469.59/day</strong></span>
            <span>Cost Per Episode: <strong style="color: var(--text-primary);">$1,878 / video</strong></span>
          </div>
        </div>
      `
    },
    {
      step: 4,
      title: '4. Log Brand Sponsors & YouTube AdSense ROI',
      subtitle: 'Connect sponsor integrations and AdSense payouts to each trip to see your true Net Profit and ROI multiple.',
      ctaLabel: '🎬 Log Sponsor / AdSense',
      ctaAction: 'new-revenue',
      html: `
        <div class="wt-demo-box">
          <div class="wt-demo-row">
            <div>
              <div style="font-weight: 700;">🎬 60s Mid-Roll Sponsor + AdSense Payout</div>
              <div style="font-size: 12px; color: var(--text-muted);">Japan Shoot Revenue: $12,350.00 vs. Spend: $5,635.02</div>
            </div>
            <div style="text-align: right;">
              <div class="mono" style="font-weight: 700; font-size: 15px; color: var(--accent-primary);">+$6,714.98 Profit</div>
              <span class="kpi-tag positive">2.2x Trip ROI</span>
            </div>
          </div>
        </div>
      `
    },
    {
      step: 5,
      title: '5. One-Click Schedule C Tax CSV & Crew Reimbursements',
      subtitle: 'Toggle 100% On-Camera Food vs. 50% Travel Meals, check missing receipts >$75, and export your CPA-ready CSV.',
      ctaLabel: '⬇ Export Tax CSV Now',
      ctaAction: 'export-csv',
      html: `
        <div class="wt-demo-box">
          <div class="wt-demo-row">
            <div>
              <div style="font-weight: 700;">🧾 Accountant Schedule C Export (.CSV &amp; PDF)</div>
              <div style="font-size: 12px; color: var(--text-muted);">Includes Date, Trip, Category, Local FX, USD Total, Deductible % &amp; Reimbursements</div>
            </div>
            <span class="kpi-tag positive">CPA Ready</span>
          </div>
        </div>
      `
    }
  ];

  let currentWtStep = 0;
  let wtAutoplayTimer = null;

  function renderWalkthroughStep(stepIndex) {
    currentWtStep = (stepIndex + WALKTHROUGH_SLIDES.length) % WALKTHROUGH_SLIDES.length;
    const slide = WALKTHROUGH_SLIDES[currentWtStep];
    const pill = document.getElementById('wt-step-pill');
    if (pill) pill.textContent = `CHAPTER ${slide.step} OF ${WALKTHROUGH_SLIDES.length}`;

    const canvas = document.getElementById('wt-visual-canvas');
    if (canvas) {
      canvas.innerHTML = `
        <div class="wt-slide-header">
          <div>
            <div class="wt-slide-title">${slide.title}</div>
            <div class="wt-slide-subtitle">${slide.subtitle}</div>
          </div>
          <button type="button" class="btn btn-sm btn-primary" data-wt-cta="${slide.ctaAction}" style="white-space: nowrap;">
            ${slide.ctaLabel}
          </button>
        </div>
        ${slide.html}
      `;
    }

    document.querySelectorAll('.wt-dot').forEach((d, idx) => {
      d.classList.toggle('active', idx === currentWtStep);
    });
    document.querySelectorAll('.wt-chapter-btn').forEach((b, idx) => {
      b.classList.toggle('active', idx === currentWtStep);
    });
  }

  function toggleWtAutoplay() {
    const btn = document.getElementById('btn-wt-autoplay');
    if (wtAutoplayTimer) {
      clearInterval(wtAutoplayTimer);
      wtAutoplayTimer = null;
      if (btn) btn.textContent = '▶ Auto-Play Walkthrough';
    } else {
      if (btn) btn.textContent = '⏸ Pause Walkthrough';
      wtAutoplayTimer = setInterval(() => {
        renderWalkthroughStep(currentWtStep + 1);
      }, 4200);
    }
  }

  function toEmbedUrl(rawUrl) {
    if (!rawUrl) return '';
    const trimmed = rawUrl.trim();
    const ytMatch = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{6,})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const loomMatch = trimmed.match(/loom\.com\/(?:share|embed)\/([a-f0-9]+)/i);
    if (loomMatch) return `https://www.loom.com/embed/${loomMatch[1]}`;
    return trimmed;
  }

  // Interactive Guided Tour across the live dashboard
  const TOUR_STEPS = [
    {
      selector: '.trip-pill-selector',
      view: 'dashboard',
      title: '1. Filter by Production Trip',
      body: 'Switch between "All Production Trips" or a specific shoot (like Japan Shoot - Nov 2026) to scope all KPIs, charts, and ledger items.'
    },
    {
      selector: '#btn-topbar-quick-add',
      view: 'dashboard',
      title: '2. Quick Add Road Expenses',
      body: 'Click "+ Add Expense" anytime to log hotels, crew meals, flights, or gear in 11 currencies and attach a photo of your receipt.'
    },
    {
      selector: '.kpi-grid',
      view: 'dashboard',
      title: '3. Live Burn Rate, Runway & ROI KPIs',
      body: 'Track Total Production Spend, remaining Trip Budget Runway, Daily Road Burn Rate ($/day), and Net Trip Profit at a glance.'
    },
    {
      selector: '.filter-bar',
      view: 'dashboard',
      title: '4. Search & Audit Missing Receipts',
      body: 'Search by vendor or filter by "Missing Receipt (>$75)" and "Crew Reimbursable" before wrapping a shoot.'
    },
    {
      selector: '#btn-export-csv-top',
      view: 'dashboard',
      title: '5. One-Click Accountant Tax CSV',
      body: 'Click "⬇ Export Tax CSV" whenever you need an IRS Schedule C spreadsheet with local FX conversions and deduction totals.'
    }
  ];

  let activeTourIndex = -1;

  function clearTourHighlights() {
    document.querySelectorAll('.tour-highlight-target').forEach(el => {
      el.classList.remove('tour-highlight-target');
    });
  }

  function showTourStep(idx) {
    clearTourHighlights();
    const backdrop = document.getElementById('tour-backdrop');
    if (idx < 0 || idx >= TOUR_STEPS.length) {
      activeTourIndex = -1;
      if (backdrop) backdrop.style.display = 'none';
      return;
    }
    activeTourIndex = idx;
    const step = TOUR_STEPS[idx];
    if (state.activeView !== step.view) {
      switchView(step.view);
    }
    if (backdrop) backdrop.style.display = 'block';
    document.getElementById('tour-step-counter').textContent = `STEP ${idx + 1} OF ${TOUR_STEPS.length}`;
    document.getElementById('tour-step-title').textContent = step.title;
    document.getElementById('tour-step-body').textContent = step.body;
    document.getElementById('btn-tour-prev').style.visibility = idx === 0 ? 'hidden' : 'visible';
    document.getElementById('btn-tour-next').textContent = idx === TOUR_STEPS.length - 1 ? 'Finish Tour ✓' : 'Next →';

    const target = document.querySelector(step.selector);
    if (target) {
      target.classList.add('tour-highlight-target');
      try {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (e) {}
    }
  }

  function switchView(viewName) {
    state.activeView = viewName;
    const views = ['dashboard', 'trips', 'revenue', 'tax', 'help'];
    for (const v of views) {
      const el = document.getElementById(`view-${v}`);
      if (el) el.style.display = v === viewName ? 'block' : 'none';
    }

    document.querySelectorAll('[data-view]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-view') === viewName);
    });
    document.querySelectorAll('[data-mobile-view]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-mobile-view') === viewName);
    });

    const titles = {
      dashboard: 'Road Finance Dashboard',
      trips: 'Trips & Shoot Budgets',
      revenue: 'Sponsors & AdSense ROI',
      tax: 'Tax & Accountant Export Hub',
      help: 'Help & Getting Started Guide'
    };
    const heading = document.getElementById('main-page-heading');
    if (heading) heading.textContent = titles[viewName] || 'Road Finance Dashboard';
    if (viewName === 'help') {
      renderWalkthroughStep(currentWtStep);
    }
  }

  function openModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('open');
  }

  function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove('open');
  }

  function updateExpenseConversionPreview() {
    const amt = Number(document.getElementById('exp-amount-original').value) || 0;
    const rate = Number(document.getElementById('exp-rate').value) || 1;
    const usd = amt * rate;
    const prev = document.getElementById('exp-usd-preview');
    if (prev) prev.textContent = `${fmtUsd(usd)} USD`;
  }

  function openExpenseModal(editExpense = null) {
    const titleEl = document.getElementById('modal-expense-title');
    const idInput = document.getElementById('exp-id');
    const tripSelect = document.getElementById('exp-trip-id');
    const dateInput = document.getElementById('exp-date');
    const descInput = document.getElementById('exp-title');
    const vendorInput = document.getElementById('exp-vendor');
    const amtInput = document.getElementById('exp-amount-original');
    const currSelect = document.getElementById('exp-currency');
    const rateInput = document.getElementById('exp-rate');
    const catInput = document.getElementById('exp-category');
    const paySelect = document.getElementById('exp-payment-method');
    const paidByInput = document.getElementById('exp-paid-by');
    const taxCheck = document.getElementById('exp-tax-deductible');
    const reimbCheck = document.getElementById('exp-reimbursable');
    const notesInput = document.getElementById('exp-notes');
    const receiptStatus = document.getElementById('exp-receipt-status');

    if (editExpense) {
      titleEl.textContent = 'Edit Road Expense';
      idInput.value = editExpense.id;
      tripSelect.value = editExpense.trip_id;
      dateInput.value = editExpense.expense_date;
      descInput.value = editExpense.title;
      vendorInput.value = editExpense.vendor || '';
      amtInput.value = editExpense.amount_original;
      currSelect.value = editExpense.currency;
      rateInput.value = editExpense.exchange_rate;
      catInput.value = editExpense.category;
      paySelect.value = editExpense.payment_method;
      paidByInput.value = editExpense.paid_by;
      taxCheck.checked = Boolean(editExpense.tax_deductible);
      reimbCheck.checked = Boolean(editExpense.reimbursable);
      notesInput.value = editExpense.notes || '';
      state.pendingReceiptData = editExpense.receipt_data || '';
      state.pendingReceiptName = editExpense.receipt_name || '';
      receiptStatus.textContent = state.pendingReceiptData
        ? `✓ Receipt attached (${state.pendingReceiptName || 'image'}) — tap to replace`
        : '📸 Tap to snap receipt photo on phone or upload invoice image';
    } else {
      titleEl.textContent = 'Quick Add Road Expense';
      idInput.value = '';
      const defaultTripId = state.selectedTripId !== 'all'
        ? state.selectedTripId
        : (state.trips[0] ? state.trips[0].id : '');
      tripSelect.value = defaultTripId;
      const activeTrip = state.trips.find(t => t.id === defaultTripId);
      const defaultCurr = activeTrip ? activeTrip.default_currency : 'USD';
      const defaultRate = state.settings.exchange_rates[defaultCurr] || 1;

      dateInput.value = new Date().toISOString().slice(0, 10);
      descInput.value = '';
      vendorInput.value = '';
      amtInput.value = '';
      currSelect.value = defaultCurr;
      rateInput.value = defaultRate;
      catInput.value = 'Hotels & Lodging';
      paySelect.value = 'Amex Business Platinum';
      paidByInput.value = 'Channel Card';
      taxCheck.checked = true;
      reimbCheck.checked = false;
      notesInput.value = '';
      state.pendingReceiptData = '';
      state.pendingReceiptName = '';
      receiptStatus.textContent = '📸 Tap to snap receipt photo on phone or upload invoice image';
    }

    document.querySelectorAll('#exp-quick-cat-grid .quick-cat-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.getAttribute('data-cat') === catInput.value);
    });

    updateExpenseConversionPreview();
    openModal('modal-expense');
  }

  function openTripModal(editTrip = null) {
    const titleEl = document.getElementById('modal-trip-title');
    if (editTrip) {
      titleEl.textContent = 'Edit Production Trip';
      document.getElementById('trip-id').value = editTrip.id;
      document.getElementById('trip-name').value = editTrip.name;
      document.getElementById('trip-destination').value = editTrip.destination;
      document.getElementById('trip-start').value = editTrip.start_date;
      document.getElementById('trip-end').value = editTrip.end_date;
      document.getElementById('trip-currency').value = editTrip.default_currency;
      document.getElementById('trip-budget').value = editTrip.budget_usd;
      document.getElementById('trip-videos').value = editTrip.video_count;
      document.getElementById('trip-status').value = editTrip.status;
      document.getElementById('trip-notes').value = editTrip.notes || '';
    } else {
      titleEl.textContent = 'Create Production Trip';
      document.getElementById('trip-id').value = '';
      document.getElementById('trip-name').value = '';
      document.getElementById('trip-destination').value = '';
      const today = new Date().toISOString().slice(0, 10);
      document.getElementById('trip-start').value = today;
      document.getElementById('trip-end').value = today;
      document.getElementById('trip-currency').value = 'USD';
      document.getElementById('trip-budget').value = 7500;
      document.getElementById('trip-videos').value = 2;
      document.getElementById('trip-status').value = 'active';
      document.getElementById('trip-notes').value = '';
    }
    openModal('modal-trip');
  }

  function escapeCsvCell(val) {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  function triggerCsvExport() {
    const tripMap = new Map(state.trips.map(t => [t.id, t]));
    const mealRate = Number(state.settings.meal_deduction_rate || 100) / 100;
    const filtered = getScopedExpenses();

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

    const csvContent = rows.join('\n');
    const filename = state.selectedTripId === 'all'
      ? 'creator-tax-expenses-all-trips.csv'
      : `creator-tax-expenses-${state.selectedTripId}.csv`;

    const textarea = document.getElementById('csv-export-textarea');
    const dlBtn = document.getElementById('btn-direct-csv-download');
    if (textarea) textarea.value = csvContent;
    if (dlBtn) {
      dlBtn.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
      dlBtn.download = filename;
    }

    openModal('modal-csv-export');

    try {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {}

    showToast('Generated Accountant Tax CSV');
  }

  async function saveExpenseFromModal() {
    const titleVal = document.getElementById('exp-title').value.trim();
    const amtOrig = Number(document.getElementById('exp-amount-original').value) || 0;
    if (!titleVal) {
      showToast('Please enter an expense description');
      document.getElementById('exp-title').focus();
      return;
    }
    const id = document.getElementById('exp-id').value;
    const rate = Number(document.getElementById('exp-rate').value) || 1;
    const payload = {
      trip_id: document.getElementById('exp-trip-id').value,
      expense_date: document.getElementById('exp-date').value || new Date().toISOString().slice(0, 10),
      title: titleVal,
      vendor: document.getElementById('exp-vendor').value.trim(),
      category: document.getElementById('exp-category').value,
      amount_original: amtOrig,
      currency: document.getElementById('exp-currency').value,
      exchange_rate: rate,
      amount_usd: Number((amtOrig * rate).toFixed(2)),
      payment_method: document.getElementById('exp-payment-method').value,
      paid_by: document.getElementById('exp-paid-by').value.trim() || 'Channel Card',
      tax_deductible: document.getElementById('exp-tax-deductible').checked ? 1 : 0,
      reimbursable: document.getElementById('exp-reimbursable').checked ? 1 : 0,
      receipt_data: state.pendingReceiptData,
      receipt_name: state.pendingReceiptName,
      notes: document.getElementById('exp-notes').value.trim()
    };

    const url = id ? `/api/expenses/${encodeURIComponent(id)}` : '/api/expenses';
    const method = id ? 'PUT' : 'POST';
    const updated = await apiRequest(url, { method, body: JSON.stringify(payload) });
    if (updated) applyBootstrapData(updated);
    closeModal('modal-expense');
    showToast(id ? 'Expense updated' : `Saved ${payload.title} (${fmtUsd(payload.amount_usd)})`);
  }

  async function saveTripFromModal() {
    const nameVal = document.getElementById('trip-name').value.trim();
    if (!nameVal) {
      showToast('Please enter a Trip / Series Name');
      document.getElementById('trip-name').focus();
      return;
    }
    const id = document.getElementById('trip-id').value;
    const payload = {
      name: nameVal,
      destination: document.getElementById('trip-destination').value.trim() || 'On the Road',
      start_date: document.getElementById('trip-start').value,
      end_date: document.getElementById('trip-end').value,
      default_currency: document.getElementById('trip-currency').value,
      budget_usd: Number(document.getElementById('trip-budget').value) || 5000,
      video_count: Number(document.getElementById('trip-videos').value) || 1,
      status: document.getElementById('trip-status').value,
      notes: document.getElementById('trip-notes').value.trim()
    };
    const url = id ? `/api/trips/${encodeURIComponent(id)}` : '/api/trips';
    const method = id ? 'PUT' : 'POST';
    const updated = await apiRequest(url, { method, body: JSON.stringify(payload) });
    if (updated) {
      if (!id && updated.trips && updated.trips[0]) {
        state.selectedTripId = updated.trips[0].id;
      }
      applyBootstrapData(updated);
    }
    closeModal('modal-trip');
    showToast(id ? 'Trip updated' : `Created trip: ${payload.name}`);
  }

  async function saveRevenueFromModal() {
    const titleVal = document.getElementById('rev-title').value.trim();
    if (!titleVal) {
      showToast('Please enter a deliverable or revenue description');
      document.getElementById('rev-title').focus();
      return;
    }
    const payload = {
      trip_id: document.getElementById('rev-trip-id').value,
      source_type: document.getElementById('rev-source').value,
      title: titleVal,
      sponsor_name: document.getElementById('rev-sponsor').value.trim(),
      amount_usd: Number(document.getElementById('rev-amount').value) || 0,
      status: document.getElementById('rev-status').value,
      revenue_date: document.getElementById('rev-date').value,
      video_title: document.getElementById('rev-video').value.trim()
    };
    const updated = await apiRequest('/api/revenues', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (updated) applyBootstrapData(updated);
    closeModal('modal-revenue');
    showToast(`Logged revenue: ${fmtUsd(payload.amount_usd)}`);
  }

  function bindEvents() {
    // Global Trip Selector
    const globalSelect = document.getElementById('global-trip-select');
    if (globalSelect) {
      globalSelect.addEventListener('change', e => {
        state.selectedTripId = e.target.value;
        renderAll();
      });
    }

    // Currency & Amount live conversion inside Expense modal
    const currEl = document.getElementById('exp-currency');
    if (currEl) {
      currEl.addEventListener('change', e => {
        const curr = e.target.value;
        const rate = state.settings.exchange_rates[curr] || DEFAULT_FX_RATES[curr] || 1;
        document.getElementById('exp-rate').value = rate;
        updateExpenseConversionPreview();
      });
    }
    const amtEl = document.getElementById('exp-amount-original');
    if (amtEl) amtEl.addEventListener('input', updateExpenseConversionPreview);
    const rateEl = document.getElementById('exp-rate');
    if (rateEl) rateEl.addEventListener('input', updateExpenseConversionPreview);

    const expTripEl = document.getElementById('exp-trip-id');
    if (expTripEl) {
      expTripEl.addEventListener('change', e => {
        const t = state.trips.find(tr => tr.id === e.target.value);
        if (t && !document.getElementById('exp-id').value) {
          document.getElementById('exp-currency').value = t.default_currency;
          const rate = state.settings.exchange_rates[t.default_currency] || DEFAULT_FX_RATES[t.default_currency] || 1;
          document.getElementById('exp-rate').value = rate;
          updateExpenseConversionPreview();
        }
      });
    }

    // Receipt file / camera upload
    const receiptInput = document.getElementById('exp-receipt-input');
    if (receiptInput) {
      receiptInput.addEventListener('change', e => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        state.pendingReceiptName = file.name;
        const reader = new FileReader();
        reader.onload = ev => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxDim = 900;
            let w = img.width;
            let h = img.height;
            if (w > maxDim || h > maxDim) {
              if (w > h) {
                h = Math.round((h * maxDim) / w);
                w = maxDim;
              } else {
                w = Math.round((w * maxDim) / h);
                h = maxDim;
              }
            }
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            state.pendingReceiptData = canvas.toDataURL('image/jpeg', 0.8);
            document.getElementById('exp-receipt-status').textContent =
              `✓ Attached ${file.name} (${w}x${h}px compressed)`;
          };
          img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      });
    }

    // Form submit listeners
    const formExp = document.getElementById('form-expense');
    if (formExp) {
      formExp.addEventListener('submit', e => {
        e.preventDefault();
        saveExpenseFromModal();
      });
    }
    const formTrip = document.getElementById('form-trip');
    if (formTrip) {
      formTrip.addEventListener('submit', e => {
        e.preventDefault();
        saveTripFromModal();
      });
    }
    const formRev = document.getElementById('form-revenue');
    if (formRev) {
      formRev.addEventListener('submit', e => {
        e.preventDefault();
        saveRevenueFromModal();
      });
    }
    const formAuth = document.getElementById('form-auth-gate');
    if (formAuth) {
      formAuth.addEventListener('submit', e => {
        e.preventDefault();
        submitAuthGateForm();
      });
    }
    const formSec = document.getElementById('form-change-password');
    if (formSec) {
      formSec.addEventListener('submit', e => {
        e.preventDefault();
        saveSecurityPasswordFromModal();
      });
    }

    // Filters & Search
    const searchEl = document.getElementById('input-ledger-search');
    if (searchEl) {
      searchEl.addEventListener('input', e => {
        state.searchQuery = e.target.value;
        renderExpenseLedger();
      });
    }
    const currFilterEl = document.getElementById('select-currency-filter');
    if (currFilterEl) {
      currFilterEl.addEventListener('change', e => {
        state.currencyFilter = e.target.value;
        renderExpenseLedger();
      });
    }
    const specFilterEl = document.getElementById('select-special-filter');
    if (specFilterEl) {
      specFilterEl.addEventListener('change', e => {
        state.specialFilter = e.target.value;
        renderExpenseLedger();
      });
    }

    const mealRateEl = document.getElementById('select-meal-deduction-rate');
    if (mealRateEl) {
      mealRateEl.addEventListener('change', async e => {
        const rate = e.target.value;
        const updated = await apiRequest('/api/settings', {
          method: 'PUT',
          body: JSON.stringify({ meal_deduction_rate: rate })
        });
        if (updated) applyBootstrapData(updated);
        showToast(`Updated meal deduction rule to ${rate}%`);
      });
    }

    // Unified Delegated Click Handler for all buttons and interactive elements
    document.addEventListener('click', async e => {
      // Auth Gate & Security Modal buttons
      if (e.target.closest('#btn-auth-gate-submit')) {
        e.preventDefault();
        submitAuthGateForm();
        return;
      }
      if (e.target.closest('#btn-submit-security')) {
        e.preventDefault();
        saveSecurityPasswordFromModal();
        return;
      }
      if (e.target.closest('#btn-open-security-modal')) {
        e.preventDefault();
        openSecuritySettingsModal();
        return;
      }
      if (e.target.closest('#btn-lock-logout, #btn-topbar-lock')) {
        e.preventDefault();
        lockAndLogout();
        return;
      }

      // Modal form submit buttons (handles sandboxed iframes where form submit may be restricted)
      if (e.target.closest('#btn-submit-expense')) {
        e.preventDefault();
        saveExpenseFromModal();
        return;
      }
      if (e.target.closest('#btn-submit-trip')) {
        e.preventDefault();
        saveTripFromModal();
        return;
      }
      if (e.target.closest('#btn-submit-revenue')) {
        e.preventDefault();
        saveRevenueFromModal();
        return;
      }

      // Topbar Help button
      if (e.target.closest('#btn-topbar-help')) {
        e.preventDefault();
        switchView('help');
        return;
      }

      // Launch Interactive Guided Tour
      if (e.target.closest('#btn-launch-guided-tour')) {
        e.preventDefault();
        showTourStep(0);
        return;
      }
      if (e.target.closest('#btn-tour-next')) {
        e.preventDefault();
        showTourStep(activeTourIndex + 1);
        return;
      }
      if (e.target.closest('#btn-tour-prev')) {
        e.preventDefault();
        showTourStep(activeTourIndex - 1);
        return;
      }
      if (e.target.closest('#btn-tour-close')) {
        e.preventDefault();
        showTourStep(-1);
        return;
      }

      // Walkthrough player controls
      if (e.target.closest('#btn-wt-next')) {
        e.preventDefault();
        renderWalkthroughStep(currentWtStep + 1);
        return;
      }
      if (e.target.closest('#btn-wt-prev')) {
        e.preventDefault();
        renderWalkthroughStep(currentWtStep - 1);
        return;
      }
      if (e.target.closest('#btn-wt-autoplay')) {
        e.preventDefault();
        toggleWtAutoplay();
        return;
      }
      const wtStepBtn = e.target.closest('[data-wt-step]');
      if (wtStepBtn) {
        e.preventDefault();
        renderWalkthroughStep(Number(wtStepBtn.getAttribute('data-wt-step')) || 0);
        return;
      }
      const wtCtaBtn = e.target.closest('[data-wt-cta]');
      if (wtCtaBtn) {
        e.preventDefault();
        const act = wtCtaBtn.getAttribute('data-wt-cta');
        if (act === 'new-trip') openTripModal(null);
        else if (act === 'new-expense') openExpenseModal(null);
        else if (act === 'goto-dashboard') switchView('dashboard');
        else if (act === 'new-revenue') {
          document.getElementById('rev-date').value = new Date().toISOString().slice(0, 10);
          openModal('modal-revenue');
        } else if (act === 'export-csv') triggerCsvExport();
        return;
      }

      // Custom Video URL Embed inside Help Walkthrough
      if (e.target.closest('#btn-wt-custom-video-toggle')) {
        e.preventDefault();
        const bar = document.getElementById('wt-custom-video-bar');
        if (bar) bar.style.display = bar.style.display === 'none' ? 'flex' : 'none';
        return;
      }
      if (e.target.closest('#btn-save-custom-video')) {
        e.preventDefault();
        const raw = document.getElementById('input-custom-video-url').value;
        const embed = toEmbedUrl(raw);
        if (!embed) {
          showToast('Please paste a valid YouTube or Loom video URL');
          return;
        }
        document.getElementById('wt-custom-iframe').src = embed;
        document.getElementById('wt-custom-iframe-wrap').style.display = 'block';
        document.getElementById('wt-visual-canvas').style.display = 'none';
        showToast('Loaded custom Getting Started video!');
        return;
      }
      if (e.target.closest('#btn-clear-custom-video')) {
        e.preventDefault();
        document.getElementById('wt-custom-iframe').src = '';
        document.getElementById('wt-custom-iframe-wrap').style.display = 'none';
        document.getElementById('wt-visual-canvas').style.display = 'flex';
        document.getElementById('wt-custom-video-bar').style.display = 'none';
        return;
      }

      // Help 4-step workflow shortcut buttons
      if (e.target.closest('#btn-help-step-tax')) {
        e.preventDefault();
        switchView('tax');
        return;
      }

      // Quick Add Expense buttons
      if (e.target.closest('#btn-sidebar-quick-add, #btn-topbar-quick-add, #btn-ledger-add-expense, #btn-mobile-fab-add, #btn-help-quick-expense, #btn-help-step-expense')) {
        e.preventDefault();
        openExpenseModal(null);
        return;
      }

      // Open New Trip buttons
      if (e.target.closest('#btn-open-new-trip, #btn-trips-view-create, #btn-help-step-trip')) {
        e.preventDefault();
        openTripModal(null);
        return;
      }

      // Open New Revenue buttons
      if (e.target.closest('#btn-open-new-revenue, #btn-rev-view-create, #btn-help-step-revenue')) {
        e.preventDefault();
        document.getElementById('rev-date').value = new Date().toISOString().slice(0, 10);
        if (state.selectedTripId !== 'all') {
          document.getElementById('rev-trip-id').value = state.selectedTripId;
        }
        openModal('modal-revenue');
        return;
      }

      // Export CSV buttons
      if (e.target.closest('#btn-export-csv-top, #btn-ledger-export-csv, #btn-tax-download-csv')) {
        e.preventDefault();
        triggerCsvExport();
        return;
      }

      // Copy CSV to clipboard button
      if (e.target.closest('#btn-copy-csv-clipboard')) {
        e.preventDefault();
        const textarea = document.getElementById('csv-export-textarea');
        if (textarea) {
          textarea.select();
          try {
            await navigator.clipboard.writeText(textarea.value);
            showToast('Copied CSV to clipboard!');
          } catch (err) {
            document.execCommand('copy');
            showToast('Copied CSV to clipboard!');
          }
        }
        return;
      }

      // Print / PDF button
      if (e.target.closest('#btn-print-pdf-report')) {
        e.preventDefault();
        showToast('Opening Print / Save PDF dialog...');
        try {
          window.print();
        } catch (err) {}
        return;
      }

      // Theme toggle button
      if (e.target.closest('#btn-theme-toggle')) {
        e.preventDefault();
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        memoryTheme = next;
        document.documentElement.setAttribute('data-theme', next);
        safeStorageSet('wanderwallet_theme', next);
        showToast(`Switched to ${next} theme`);
        return;
      }

      // Clear category filter
      if (e.target.closest('#btn-clear-cat-filter')) {
        e.preventDefault();
        state.categoryFilter = 'all';
        renderCategoryBreakdown();
        renderLedgerCategoryChips();
        renderExpenseLedger();
        return;
      }

      // View switcher buttons (Sidebar & Mobile Bottom Nav)
      const viewBtn = e.target.closest('[data-view]');
      if (viewBtn) {
        e.preventDefault();
        switchView(viewBtn.getAttribute('data-view'));
        return;
      }
      const mobViewBtn = e.target.closest('[data-mobile-view]');
      if (mobViewBtn) {
        e.preventDefault();
        switchView(mobViewBtn.getAttribute('data-mobile-view'));
        return;
      }

      // Modal close buttons
      const closeBtn = e.target.closest('[data-close-modal]');
      if (closeBtn) {
        e.preventDefault();
        closeModal(closeBtn.getAttribute('data-close-modal'));
        return;
      }

      // Quick category button inside Expense Modal
      const quickCatBtn = e.target.closest('#exp-quick-cat-grid [data-cat]');
      if (quickCatBtn) {
        e.preventDefault();
        const cat = quickCatBtn.getAttribute('data-cat');
        document.getElementById('exp-category').value = cat;
        document.querySelectorAll('#exp-quick-cat-grid .quick-cat-btn').forEach(b => {
          b.classList.toggle('selected', b === quickCatBtn);
        });
        return;
      }

      // Select trip from sidebar
      const selTripBtn = e.target.closest('[data-select-trip]');
      if (selTripBtn) {
        e.preventDefault();
        state.selectedTripId = selTripBtn.getAttribute('data-select-trip');
        switchView('dashboard');
        renderAll();
        return;
      }

      // Open trip dashboard from Trips view
      const openTripBtn = e.target.closest('[data-open-trip-dashboard]');
      if (openTripBtn) {
        e.preventDefault();
        state.selectedTripId = openTripBtn.getAttribute('data-open-trip-dashboard');
        switchView('dashboard');
        renderAll();
        return;
      }

      // Filter by category row or chip
      const catRow = e.target.closest('[data-filter-cat]');
      if (catRow) {
        const cat = catRow.getAttribute('data-filter-cat');
        state.categoryFilter = state.categoryFilter === cat ? 'all' : cat;
        renderCategoryBreakdown();
        renderLedgerCategoryChips();
        renderExpenseLedger();
        return;
      }

      const catChip = e.target.closest('[data-chip-cat]');
      if (catChip) {
        state.categoryFilter = catChip.getAttribute('data-chip-cat');
        renderCategoryBreakdown();
        renderLedgerCategoryChips();
        renderExpenseLedger();
        return;
      }

      // View receipt modal
      const viewRecBtn = e.target.closest('[data-view-receipt]');
      if (viewRecBtn) {
        e.preventDefault();
        const expId = viewRecBtn.getAttribute('data-view-receipt');
        const exp = state.expenses.find(x => x.id === expId);
        if (exp && exp.receipt_data) {
          document.getElementById('receipt-preview-img').src = exp.receipt_data;
          document.getElementById('receipt-preview-caption').textContent =
            `${exp.title} • ${exp.vendor} • ${fmtLocal(exp.amount_original, exp.currency)} (${fmtUsd(exp.amount_usd)})`;
          const dl = document.getElementById('receipt-download-link');
          dl.href = exp.receipt_data;
          dl.download = exp.receipt_name || `receipt-${exp.id}.png`;
          openModal('modal-receipt-preview');
        }
        return;
      }

      // Edit Expense
      const editExpBtn = e.target.closest('[data-edit-expense]');
      if (editExpBtn) {
        e.preventDefault();
        const exp = state.expenses.find(x => x.id === editExpBtn.getAttribute('data-edit-expense'));
        if (exp) openExpenseModal(exp);
        return;
      }

      // Delete Expense
      const delExpBtn = e.target.closest('[data-delete-expense]');
      if (delExpBtn) {
        e.preventDefault();
        const expId = delExpBtn.getAttribute('data-delete-expense');
        const updated = await apiRequest(`/api/expenses/${encodeURIComponent(expId)}`, { method: 'DELETE' });
        if (updated) applyBootstrapData(updated);
        showToast('Expense entry deleted');
        return;
      }

      // Edit Trip
      const editTripBtn = e.target.closest('[data-edit-trip]');
      if (editTripBtn) {
        e.preventDefault();
        const tr = state.trips.find(x => x.id === editTripBtn.getAttribute('data-edit-trip'));
        if (tr) openTripModal(tr);
        return;
      }

      // Delete Trip
      const delTripBtn = e.target.closest('[data-delete-trip]');
      if (delTripBtn) {
        e.preventDefault();
        const tripId = delTripBtn.getAttribute('data-delete-trip');
        const updated = await apiRequest(`/api/trips/${encodeURIComponent(tripId)}`, { method: 'DELETE' });
        if (updated) applyBootstrapData(updated);
        showToast('Production trip removed');
        return;
      }

      // Delete Revenue
      const delRevBtn = e.target.closest('[data-delete-revenue]');
      if (delRevBtn) {
        e.preventDefault();
        const revId = delRevBtn.getAttribute('data-delete-revenue');
        const updated = await apiRequest(`/api/revenues/${encodeURIComponent(revId)}`, { method: 'DELETE' });
        if (updated) applyBootstrapData(updated);
        showToast('Revenue item removed');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();

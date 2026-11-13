(function () {
  'use strict';

  const DEFAULT_FX_RATES = {
    USD: 1.0,
    ARS: 0.001,
    BRL: 0.175,
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
    ARS: 'ARS $',
    BRL: 'R$',
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

  const DEFAULT_TAX_CATEGORIES = [
    { name: 'Hotels & Lodging', icon: '🏨', color: '#0ea5e9', schedule_c: 'Line 24a (Travel / Lodging)', deductible: '1', notes: 'Deductible lodging while away from tax home overnight' },
    { name: 'Meals & Craft', icon: '🍜', color: '#f59e0b', schedule_c: 'Line 24b (Deductible Meals)', deductible: 'meal', notes: 'Subject to IRS business meal percentage (50% or 100%)' },
    { name: 'Flights & Transit', icon: '🚄', color: '#10b981', schedule_c: 'Line 24a (Travel / Airfare / Transit)', deductible: '1', notes: 'Airfare, trains, ferries, taxis & rideshares' },
    { name: 'Gear & Rentals', icon: '📷', color: '#f97316', schedule_c: 'Line 20a (Equipment Rent & Leases)', deductible: '1', notes: 'Cameras, lenses, lighting, audio & grip rentals' },
    { name: 'Permits & Locations', icon: '🎟️', color: '#14b8a6', schedule_c: 'Line 27a (Other Expenses - Filming Permits)', deductible: '1', notes: 'National park, drone, and city location fees' },
    { name: 'Crew & Talent', icon: '🎥', color: '#8b5cf6', schedule_c: 'Line 11 (Contract Labor / 1099)', deductible: '1', notes: 'Camera operators, fixers, editors, guides & talent' }
  ];

  const DEFAULT_ECOSYSTEM_COLORS = {
    hotel: '#f59e0b',   // Amber Gold
    airline: '#0ea5e9', // Sky Blue
    bank: '#10b981',    // Emerald Green
    other: '#a855f7'    // Royal Purple
  };

  const ECOSYSTEM_META = {
    bank: { icon: '🏦', label: 'Bank Points', tag: 'positive' },
    hotel: { icon: '🏨', label: 'Hotel Loyalty', tag: 'amber' },
    airline: { icon: '✈️', label: 'Airline Frequent Flyer', tag: 'sky' },
    other: { icon: '🚢', label: 'Travel Rewards & Other', tag: 'sky' }
  };

  const COLOR_SWATCH_PALETTE = [
    { hex: '#f59e0b', label: 'Amber Gold' },
    { hex: '#0ea5e9', label: 'Sky Blue' },
    { hex: '#10b981', label: 'Emerald Green' },
    { hex: '#a855f7', label: 'Royal Purple' },
    { hex: '#ec4899', label: 'Rose Pink' },
    { hex: '#f97316', label: 'Sunset Orange' },
    { hex: '#14b8a6', label: 'Ocean Teal' },
    { hex: '#ef4444', label: 'Crimson Red' },
    { hex: '#6366f1', label: 'Indigo' },
    { hex: '#eab308', label: 'Citrine Yellow' },
    { hex: '#06b6d4', label: 'Cyan' },
    { hex: '#64748b', label: 'Slate Gray' }
  ];

  function resolveHexColor(colorStr, fallback = '#0ea5e9') {
    if (!colorStr || typeof colorStr !== 'string') return fallback;
    const trimmed = colorStr.trim();
    if (trimmed.startsWith('#') && (trimmed.length === 7 || trimmed.length === 4)) {
      return trimmed;
    }
    const varMap = {
      'var(--cat-hotel)': '#0ea5e9',
      'var(--cat-meal)': '#f59e0b',
      'var(--cat-flight)': '#10b981',
      'var(--cat-gear)': '#f97316',
      'var(--cat-permit)': '#14b8a6',
      'var(--cat-crew)': '#8b5cf6',
      'var(--accent-sky)': '#0ea5e9',
      'var(--accent-amber)': '#f59e0b',
      'var(--accent-primary)': '#10b981'
    };
    return varMap[trimmed] || fallback;
  }

  function hexToRgba(hexStr, alpha = 1) {
    const hex = resolveHexColor(hexStr, '#0ea5e9').replace('#', '');
    let r = 14, g = 165, b = 233;
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function getEcosystemColors() {
    const fromSettings = (state && state.settings && state.settings.ecosystem_colors && typeof state.settings.ecosystem_colors === 'object')
      ? state.settings.ecosystem_colors
      : {};
    const fromRewards = (state && state.rewards && state.rewards.ecosystem_colors && typeof state.rewards.ecosystem_colors === 'object')
      ? state.rewards.ecosystem_colors
      : {};
    return {
      ...DEFAULT_ECOSYSTEM_COLORS,
      ...fromRewards,
      ...fromSettings
    };
  }

  function getEcosystemColor(ecoKey) {
    const colors = getEcosystemColors();
    const key = ecoKey && colors[ecoKey] ? ecoKey : 'other';
    return resolveHexColor(colors[key], DEFAULT_ECOSYSTEM_COLORS[key] || '#0ea5e9');
  }

  function getProgramColor(prog) {
    if (prog && prog.custom_color) {
      return resolveHexColor(prog.custom_color, getEcosystemColor(prog.ecosystem));
    }
    return getEcosystemColor(prog ? prog.ecosystem : 'other');
  }

  function getTaxCategories() {
    if (state && state.settings && Array.isArray(state.settings.tax_categories) && state.settings.tax_categories.length > 0) {
      return state.settings.tax_categories.map(c => ({
        ...c,
        color: resolveHexColor(c.color, '#0ea5e9')
      }));
    }
    return DEFAULT_TAX_CATEGORIES;
  }

  function getCategoryMetaMap() {
    const map = {};
    for (const c of getTaxCategories()) {
      map[c.name] = { icon: c.icon || '🏷️', color: resolveHexColor(c.color, '#0ea5e9') };
    }
    return map;
  }

  // Backwards-compatible proxy so any existing CATEGORY_META[cat] lookups read dynamic categories
  const CATEGORY_META = new Proxy({}, {
    get(_, prop) {
      if (typeof prop !== 'string') return undefined;
      const cats = getTaxCategories();
      const match = cats.find(c => c.name === prop);
      if (match) return { icon: match.icon || '🏷️', color: resolveHexColor(match.color, '#0ea5e9') };
      return { icon: '🏷️', color: '#64748b' };
    },
    ownKeys() {
      return getTaxCategories().map(c => c.name);
    },
    getOwnPropertyDescriptor(_, prop) {
      return { enumerable: true, configurable: true, value: this.get(null, prop) };
    }
  });

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
      ],
      rewards: getDefaultRewardsData()
    };
  }

  function getDefaultRewardsData() {
    return {
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
  }

  const state = {
    settings: {
      channel_name: 'Wander Wallet',
      home_currency: 'USD',
      meal_deduction_rate: '100',
      exchange_rates: { ...DEFAULT_FX_RATES }
    },
    trips: [],
    expenses: [],
    revenues: [],
    rewards: getDefaultRewardsData(),
    selectedTripId: 'trip-japan-2026',
    activeView: 'dashboard',
    rewardsTab: 'programs',
    adminTab: 'categories',
    rewardsEcoFilter: 'all',
    rewardsOwnerFilter: (() => { try { return localStorage.getItem('ww_rewards_owner_filter') || 'all'; } catch (e) { return 'all'; } })(),
    rewardsCertFilter: 'all',
    matrixBankFilter: 'all',
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
    if (memoryStore && Array.isArray(memoryStore.trips)) {
      if (!memoryStore.rewards || !Array.isArray(memoryStore.rewards.programs)) {
        memoryStore.rewards = getDefaultRewardsData();
      }
      return memoryStore;
    }
    const raw = safeStorageGet('wayfarer_backup_state');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && (Array.isArray(parsed.trips) || (parsed.rewards && Array.isArray(parsed.rewards.programs)))) {
          if (!Array.isArray(parsed.trips)) parsed.trips = [];
          if (!Array.isArray(parsed.expenses)) parsed.expenses = [];
          if (!Array.isArray(parsed.revenues)) parsed.revenues = [];
          if (!parsed.rewards || !Array.isArray(parsed.rewards.programs)) {
            parsed.rewards = getDefaultRewardsData();
          }
          const rawRewBackup = safeStorageGet('wayfarer_rewards_backup');
          if (rawRewBackup) {
            try {
              const rewParsed = JSON.parse(rawRewBackup);
              if (rewParsed && Array.isArray(rewParsed.programs) && Number(rewParsed.__saved_at || 0) >= Number(parsed.updated_at || 0)) {
                parsed.rewards = rewParsed;
              }
            } catch (e2) {}
          }
          memoryStore = parsed;
          return memoryStore;
        }
      } catch (e) {}
    }
    const rawRewOnly = safeStorageGet('wayfarer_rewards_backup');
    memoryStore = getInitialSeedData();
    if (rawRewOnly) {
      try {
        const rewParsed = JSON.parse(rawRewOnly);
        if (rewParsed && Array.isArray(rewParsed.programs)) {
          memoryStore.rewards = rewParsed;
          memoryStore.user_modified = true;
          memoryStore.updated_at = Number(rewParsed.__saved_at) || Date.now();
        }
      } catch (e3) {}
    }
    saveLocalStore(memoryStore);
    return memoryStore;
  }

  function saveLocalStore(data) {
    if (!data) return;
    memoryStore = data;
    if (data.rewards && Array.isArray(data.rewards.programs)) {
      try {
        const rewCopy = { ...data.rewards, __saved_at: Number(data.updated_at) || Date.now() };
        window.localStorage.setItem('wayfarer_rewards_backup', JSON.stringify(rewCopy));
      } catch (eRew) {
        try {
          const slimCards = (data.rewards.cards || []).map(c =>
            c.image_url && c.image_url.length > 120000 ? { ...c, image_url: '' } : c
          );
          const rewSlim = { ...data.rewards, cards: slimCards, __saved_at: Number(data.updated_at) || Date.now() };
          window.localStorage.setItem('wayfarer_rewards_backup', JSON.stringify(rewSlim));
        } catch (eRew2) {}
      }
    }
    try {
      window.localStorage.setItem('wayfarer_backup_state', JSON.stringify(data));
    } catch (e) {
      // QuotaExceededError fallback: strip heavy base64 receipt images from the localStorage backup so rewards & cards always persist
      try {
        const compact = {
          ...data,
          expenses: Array.isArray(data.expenses)
            ? data.expenses.map(ex => (ex.receipt_data && ex.receipt_data.length > 2000 ? { ...ex, receipt_data: '' } : ex))
            : []
        };
        window.localStorage.setItem('wayfarer_backup_state', JSON.stringify(compact));
      } catch (e2) {
        try {
          const ultraCompact = {
            ...data,
            expenses: Array.isArray(data.expenses) ? data.expenses.map(ex => ({ ...ex, receipt_data: '' })) : [],
            rewards: data.rewards
              ? {
                  ...data.rewards,
                  cards: (data.rewards.cards || []).map(c =>
                    c.image_url && c.image_url.length > 120000 ? { ...c, image_url: '' } : c
                  )
                }
              : data.rewards
          };
          window.localStorage.setItem('wayfarer_backup_state', JSON.stringify(ultraCompact));
        } catch (e3) {}
      }
    }
  }

  function applyLocalMutation(url, method, payload) {
    const store = getLocalStore();
    if (url === '/api/expenses' && method === 'POST') {
      const id = (payload && payload.id) || ('exp-' + Date.now());
      if (payload) payload.id = id;
      store.expenses = store.expenses.filter(e => e.id !== id);
      store.expenses.unshift({
        ...payload,
        id
      });
    } else if (url.startsWith('/api/expenses/') && method === 'PUT') {
      const id = decodeURIComponent(url.replace('/api/expenses/', ''));
      store.expenses = store.expenses.map(e => (e.id === id ? { ...e, ...payload, id } : e));
    } else if (url.startsWith('/api/expenses/') && method === 'DELETE') {
      const id = decodeURIComponent(url.replace('/api/expenses/', ''));
      store.expenses = store.expenses.filter(e => e.id !== id);
    } else if (url === '/api/trips' && method === 'POST') {
      const id = (payload && payload.id) || ('trip-' + Date.now());
      if (payload) payload.id = id;
      store.trips = store.trips.filter(t => t.id !== id);
      store.trips.unshift({
        ...payload,
        id
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
      const id = (payload && payload.id) || ('rev-' + Date.now());
      if (payload) payload.id = id;
      store.revenues = store.revenues.filter(r => r.id !== id);
      store.revenues.unshift({
        ...payload,
        id
      });
    } else if (url.startsWith('/api/revenues/') && method === 'DELETE') {
      const id = decodeURIComponent(url.replace('/api/revenues/', ''));
      store.revenues = store.revenues.filter(r => r.id !== id);
    } else if (url === '/api/settings' && method === 'PUT') {
      store.settings = { ...store.settings, ...payload };
    } else if (url === '/api/rewards' && method === 'PUT') {
      const prevRew = store.rewards || {};
      store.rewards = {
        programs: Array.isArray(payload.programs) ? payload.programs : prevRew.programs,
        certificates: Array.isArray(payload.certificates) ? payload.certificates : prevRew.certificates,
        cards: Array.isArray(payload.cards) ? payload.cards : prevRew.cards,
        redemptions: Array.isArray(payload.redemptions) ? payload.redemptions : prevRew.redemptions,
        owners: Array.isArray(payload.owners) ? payload.owners : (prevRew.owners || []),
        deleted_ids: Array.isArray(payload.deleted_ids) ? payload.deleted_ids : (prevRew.deleted_ids || []),
        ecosystem_colors: payload.ecosystem_colors || prevRew.ecosystem_colors || null
      };
    }
    store.user_modified = true;
    store.updated_at = Date.now();
    saveLocalStore(store);
    return store;
  }

  const SEED_TRIP_IDS = new Set(['trip-japan-2026', 'trip-iceland-2026', 'trip-alps-2026']);
  const SEED_PROGRAM_IDS = new Set(['prog-c1', 'prog-chase', 'prog-amex', 'prog-hyatt', 'prog-hilton', 'prog-marriott', 'prog-ua', 'prog-aa']);
  const SEED_CARD_IDS = new Set(['card-vx', 'card-csr', 'card-amex-plat', 'card-hyatt', 'card-aspire']);
  const SEED_CERT_IDS = new Set(['cert-hyatt-1', 'cert-hilton-1', 'cert-marriott-1', 'cert-vx-credit', 'cert-csr-credit']);
  const SEED_REDEMPTION_IDS = new Set(['red-1', 'red-2', 'red-3']);

  function recordDeletedRewardId(id) {
    if (!id || !state.rewards) return;
    if (!Array.isArray(state.rewards.deleted_ids)) state.rewards.deleted_ids = [];
    if (!state.rewards.deleted_ids.includes(id)) {
      state.rewards.deleted_ids.push(id);
    }
  }

  function hasCustomRewardsContent(rew) {
    if (!rew || typeof rew !== 'object') return false;
    if (Array.isArray(rew.owners) && rew.owners.length > 0) return true;
    if (Array.isArray(rew.programs) && rew.programs.some(p => !SEED_PROGRAM_IDS.has(p.id) || (Array.isArray(p.custom_fields) && p.custom_fields.length > 0) || p.owner)) return true;
    if (Array.isArray(rew.cards) && rew.cards.some(c => !SEED_CARD_IDS.has(c.id) || (Array.isArray(c.custom_fields) && c.custom_fields.length > 0) || c.owner || c.card_number || c.image_url)) return true;
    if (Array.isArray(rew.certificates) && rew.certificates.some(c => !SEED_CERT_IDS.has(c.id) || (Array.isArray(c.custom_fields) && c.custom_fields.length > 0) || c.owner)) return true;
    if (Array.isArray(rew.redemptions) && rew.redemptions.some(r => !SEED_REDEMPTION_IDS.has(r.id))) return true;
    return false;
  }

  function hasLocalCustomData(store) {
    if (!store) return false;
    if (store.user_modified) return true;
    if (Array.isArray(store.trips) && store.trips.some(t => !SEED_TRIP_IDS.has(t.id))) {
      return true;
    }
    if (hasCustomRewardsContent(store.rewards)) {
      return true;
    }
    return false;
  }

  function mergeCustomFieldsArrays(primaryCf, secondaryCf) {
    const pArr = Array.isArray(primaryCf) ? primaryCf : [];
    const sArr = Array.isArray(secondaryCf) ? secondaryCf : [];
    if (pArr.length === 0) return sArr;
    if (sArr.length === 0) return pArr;
    const merged = [...pArr];
    const seenLabels = new Set(pArr.map(f => String(f.label || f.key || '').trim().toLowerCase()).filter(Boolean));
    for (const sf of sArr) {
      const lbl = String(sf.label || sf.key || '').trim().toLowerCase();
      if (lbl && !seenLabels.has(lbl)) {
        merged.push(sf);
        seenLabels.add(lbl);
      }
    }
    return merged;
  }

  function mergeRewardsPortfolios(primaryRew, secondaryRew) {
    if (!primaryRew || !Array.isArray(primaryRew.programs)) return secondaryRew || getDefaultRewardsData();
    if (!secondaryRew || !Array.isArray(secondaryRew.programs)) return primaryRew;

    const deletedSet = new Set([
      ...(Array.isArray(primaryRew.deleted_ids) ? primaryRew.deleted_ids : []),
      ...(Array.isArray(secondaryRew.deleted_ids) ? secondaryRew.deleted_ids : [])
    ]);

    const mergeCollection = (primList, secList, seedSet, keyFn) => {
      const out = (Array.isArray(primList) ? primList : [])
        .filter(item => item && !deletedSet.has(item.id))
        .map(item => ({ ...item }));
      const byId = new Map(out.map(item => [item.id, item]));
      const bySemanticKey = new Map(out.map(item => [keyFn(item), item]));

      for (const secItem of (Array.isArray(secList) ? secList : [])) {
        if (!secItem || deletedSet.has(secItem.id)) continue;
        const existing = byId.get(secItem.id) || bySemanticKey.get(keyFn(secItem));
        if (existing) {
          existing.custom_fields = mergeCustomFieldsArrays(existing.custom_fields, secItem.custom_fields);
          if (!existing.owner && secItem.owner) existing.owner = secItem.owner;
          if (!existing.image_url && secItem.image_url) existing.image_url = secItem.image_url;
          if (!existing.card_number && secItem.card_number) existing.card_number = secItem.card_number;
          if (!existing.card_expiration && secItem.card_expiration) existing.card_expiration = secItem.card_expiration;
          if (!existing.member_id && secItem.member_id) existing.member_id = secItem.member_id;
          if ((!existing.points || Number(existing.points) === 0) && Number(secItem.points) > 0) {
            existing.points = secItem.points;
          }
          if ((!existing.status_tier || existing.status_tier === 'Member') && secItem.status_tier && secItem.status_tier !== 'Member') {
            existing.status_tier = secItem.status_tier;
          }
        } else if (!seedSet.has(secItem.id)) {
          const clone = { ...secItem };
          out.push(clone);
          byId.set(clone.id, clone);
          bySemanticKey.set(keyFn(clone), clone);
        }
      }
      return out;
    };

    const normKey = (name, owner) => `${String(owner || '').trim().toLowerCase()}::${String(name || '').trim().toLowerCase()}`;
    const mergedPrograms = mergeCollection(primaryRew.programs, secondaryRew.programs, SEED_PROGRAM_IDS, p => normKey(p.name, p.owner));
    const mergedCards = mergeCollection(primaryRew.cards, secondaryRew.cards, SEED_CARD_IDS, c => normKey(c.name || c.card_name, c.owner));
    const mergedCerts = mergeCollection(primaryRew.certificates, secondaryRew.certificates, SEED_CERT_IDS, c => normKey(c.title, c.owner));
    const mergedRedemptions = mergeCollection(primaryRew.redemptions, secondaryRew.redemptions, SEED_REDEMPTION_IDS, r => normKey(r.title, r.program));

    const ownersSet = new Set([
      ...(Array.isArray(primaryRew.owners) ? primaryRew.owners : []),
      ...(Array.isArray(secondaryRew.owners) ? secondaryRew.owners : [])
    ].map(o => String(o || '').trim()).filter(Boolean));

    return {
      programs: mergedPrograms,
      cards: mergedCards,
      certificates: mergedCerts,
      redemptions: mergedRedemptions,
      owners: Array.from(ownersSet).slice(0, 12),
      deleted_ids: Array.from(deletedSet).slice(-200),
      ecosystem_colors: primaryRew.ecosystem_colors || secondaryRew.ecosystem_colors || null
    };
  }

  function hasMissingLocalRewardsOnServer(localRew, serverRew) {
    if (!localRew || !Array.isArray(localRew.programs)) return false;
    if (!serverRew || !Array.isArray(serverRew.programs)) return true;
    const deletedSet = new Set(Array.isArray(serverRew.deleted_ids) ? serverRew.deleted_ids : []);
    const normKey = (name, owner) => `${String(owner || '').trim().toLowerCase()}::${String(name || '').trim().toLowerCase()}`;

    const sProgKeys = new Set((serverRew.programs || []).map(p => normKey(p.name, p.owner)));
    for (const lp of (localRew.programs || [])) {
      if (deletedSet.has(lp.id)) continue;
      if (!SEED_PROGRAM_IDS.has(lp.id) && !sProgKeys.has(normKey(lp.name, lp.owner))) return true;
      const sp = (serverRew.programs || []).find(p => p.id === lp.id || normKey(p.name, p.owner) === normKey(lp.name, lp.owner));
      if (sp && Array.isArray(lp.custom_fields) && lp.custom_fields.length > (Array.isArray(sp.custom_fields) ? sp.custom_fields.length : 0)) {
        return true;
      }
    }

    const sCardKeys = new Set((serverRew.cards || []).map(c => normKey(c.name || c.card_name, c.owner)));
    for (const lc of (localRew.cards || [])) {
      if (deletedSet.has(lc.id)) continue;
      if (!SEED_CARD_IDS.has(lc.id) && !sCardKeys.has(normKey(lc.name || lc.card_name, lc.owner))) return true;
      const sc = (serverRew.cards || []).find(c => c.id === lc.id || normKey(c.name || c.card_name, c.owner) === normKey(lc.name || lc.card_name, lc.owner));
      if (sc && Array.isArray(lc.custom_fields) && lc.custom_fields.length > (Array.isArray(sc.custom_fields) ? sc.custom_fields.length : 0)) {
        return true;
      }
    }
    return false;
  }

  async function syncBootstrapWithLocal(serverData) {
    const localStore = getLocalStore();
    if (!serverData) return localStore;

    const localHasCustom = hasLocalCustomData(localStore);
    const serverModified = Boolean(serverData.user_modified);
    const localUpdated = Number(localStore && localStore.updated_at) || 0;
    const serverUpdated = Number(serverData.updated_at) || 0;

    // Check if local store has custom trips or custom rewards/cards/custom_fields missing on server
    const serverTripIds = new Set((serverData.trips || []).map(t => t.id));
    const missingLocalTrips = (localStore.trips || []).filter(t => !SEED_TRIP_IDS.has(t.id) && !serverTripIds.has(t.id));
    const missingLocalRewards = hasMissingLocalRewardsOnServer(localStore.rewards, serverData.rewards);

    const preferLocalAsPrimary = (localHasCustom && !serverModified) || (localHasCustom && localUpdated > serverUpdated);
    const mergedRewards = preferLocalAsPrimary
      ? mergeRewardsPortfolios(localStore.rewards, serverData.rewards)
      : mergeRewardsPortfolios(serverData.rewards, localStore.rewards);

    if (
      preferLocalAsPrimary ||
      missingLocalTrips.length > 0 ||
      missingLocalRewards
    ) {
      // Merge any unique trips, expenses, revenues so nothing is ever lost
      const primaryTrips = preferLocalAsPrimary ? (localStore.trips || []) : (serverData.trips || []);
      const secondaryTrips = preferLocalAsPrimary ? (serverData.trips || []) : (localStore.trips || []);
      const mergedTrips = [...primaryTrips];
      const seenTrips = new Set(mergedTrips.map(t => t.id));
      for (const st of secondaryTrips) {
        if (!seenTrips.has(st.id) && (!SEED_TRIP_IDS.has(st.id) || !preferLocalAsPrimary)) {
          mergedTrips.push(st);
          seenTrips.add(st.id);
        }
      }

      const primaryExp = preferLocalAsPrimary ? (localStore.expenses || []) : (serverData.expenses || []);
      const secondaryExp = preferLocalAsPrimary ? (serverData.expenses || []) : (localStore.expenses || []);
      const mergedExpenses = [...primaryExp];
      const seenExp = new Set(mergedExpenses.map(e => e.id));
      for (const se of secondaryExp) {
        if (!seenExp.has(se.id) && seenTrips.has(se.trip_id)) {
          mergedExpenses.push(se);
          seenExp.add(se.id);
        }
      }

      const primaryRev = preferLocalAsPrimary ? (localStore.revenues || []) : (serverData.revenues || []);
      const secondaryRev = preferLocalAsPrimary ? (serverData.revenues || []) : (localStore.revenues || []);
      const mergedRevenues = [...primaryRev];
      const seenRev = new Set(mergedRevenues.map(r => r.id));
      for (const sr of secondaryRev) {
        if (!seenRev.has(sr.id) && seenTrips.has(sr.trip_id)) {
          mergedRevenues.push(sr);
          seenRev.add(sr.id);
        }
      }

      const syncPayload = {
        user_modified: true,
        updated_at: Math.max(localUpdated, serverUpdated, Date.now()),
        settings: preferLocalAsPrimary ? (localStore.settings || serverData.settings) : (serverData.settings || localStore.settings),
        trips: mergedTrips,
        expenses: mergedExpenses,
        revenues: mergedRevenues,
        rewards: mergedRewards
      };

      try {
        const token = getAuthToken();
        const res = await fetch('/api/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify(syncPayload)
        });
        if (res.ok) {
          const synced = await res.json();
          synced.user_modified = true;
          synced.updated_at = Math.max(localUpdated, Number(synced.updated_at) || Date.now());
          saveLocalStore(synced);
          setSyncIndicator(true);
          return synced;
        }
      } catch (e) {}

      const fallbackMerged = {
        ...syncPayload,
        user_modified: true,
        updated_at: Date.now()
      };
      saveLocalStore(fallbackMerged);
      return fallbackMerged;
    }

    serverData.rewards = mergedRewards;
    saveLocalStore(serverData);
    return serverData;
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

  let currentGoogleClientId = '';

  function ensureGoogleScriptLoaded(clientId) {
    if (!clientId || !location.protocol.startsWith('http')) return;
    currentGoogleClientId = clientId;
    const renderBtn = () => {
      if (!window.google || !window.google.accounts || !window.google.accounts.id) return;
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCredentialResponse
        });
        const mount = document.getElementById('google-signin-btn-mount');
        if (mount) {
          mount.innerHTML = '';
          window.google.accounts.id.renderButton(mount, {
            theme: 'filled_blue',
            size: 'large',
            width: 340,
            text: 'continue_with',
            shape: 'rectangular'
          });
        }
        const wrap = document.getElementById('auth-google-signin-wrap');
        if (wrap) wrap.style.display = 'flex';
      } catch (e) {}
    };

    if (window.google && window.google.accounts && window.google.accounts.id) {
      renderBtn();
      return;
    }
    if (!document.getElementById('google-gsi-script')) {
      const s = document.createElement('script');
      s.id = 'google-gsi-script';
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.onload = renderBtn;
      document.head.appendChild(s);
    }
  }

  async function handleGoogleCredentialResponse(response) {
    if (!response || !response.credential) return;
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      });
      const data = await res.json();
      if (!res.ok) {
        showAuthGate('login', 'admin', data.error || 'Google Sign-In failed.', currentGoogleClientId);
        return;
      }
      if (data.token) setAuthToken(data.token);
      state.authUsername = data.username || 'Google User';
      hideAuthGate();
      showToast(`Signed in with Google (${state.authUsername})!`);
      const boot = await apiRequest('/api/bootstrap');
      hasCompletedServerBootstrap = true;
      if (boot) applyBootstrapData(boot);
    } catch (err) {
      showAuthGate('login', 'admin', 'Could not verify Google Sign-In with server.', currentGoogleClientId);
    }
  }

  function showAuthGate(mode = 'login', defaultUsername = 'admin', errorMessage = '', googleClientId = '') {
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
    const setupGoogleGroup = document.getElementById('auth-setup-google-group');
    const submitBtn = document.getElementById('btn-auth-gate-submit');
    const errEl = document.getElementById('auth-gate-error');
    const googleWrap = document.getElementById('auth-google-signin-wrap');

    const activeGoogleId = googleClientId || currentGoogleClientId;
    const originDisplay = document.getElementById('auth-gate-origin-display');
    if (originDisplay) {
      originDisplay.textContent = location.origin && location.origin !== 'null' ? location.origin : 'https://your-railway-domain.up.railway.app';
    }
    if (activeGoogleId) {
      ensureGoogleScriptLoaded(activeGoogleId);
    } else if (googleWrap) {
      googleWrap.style.display = 'none';
    }

    if (mode === 'setup') {
      if (badge) badge.textContent = '🛡️ FIRST-TIME SECURITY SETUP';
      if (title) title.textContent = 'Create Your Admin Login';
      if (subtitle) {
        subtitle.textContent =
          'Protect your Wander Wallet URL with a password and/or Google Sign-In so only you can access your trips and receipts.';
      }
      if (passLabel) passLabel.textContent = 'Create Password (at least 4 characters)';
      if (confirmGroup) confirmGroup.style.display = 'flex';
      if (setupGoogleGroup) setupGoogleGroup.style.display = 'flex';
      if (submitBtn) submitBtn.textContent = 'Save Security & Unlock Wander Wallet →';
    } else {
      if (badge) badge.textContent = '🔒 PROTECTED WORKSPACE';
      if (title) title.textContent = 'Sign In to Wander Wallet';
      if (subtitle) {
        subtitle.textContent =
          'Enter your credentials or use Google Sign-In to unlock your production trips, receipts, and tax exports.';
      }
      if (passLabel) passLabel.textContent = 'Password';
      if (confirmGroup) confirmGroup.style.display = 'none';
      if (setupGoogleGroup) setupGoogleGroup.style.display = 'none';
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
    const setupGoogleIdEl = document.getElementById('auth-setup-google-client-id');
    const setupEmailsEl = document.getElementById('auth-setup-allowed-emails');
    const setupGoogleId = setupGoogleIdEl ? setupGoogleIdEl.value.trim() : '';
    const setupEmails = setupEmailsEl ? setupEmailsEl.value.trim() : '';

    if (mode === 'setup') {
      if (!password && !setupGoogleId) {
        showAuthGate(mode, username, 'Please enter a password (at least 4 characters) or a Google Client ID.');
        return;
      }
      if (password && password.length < 4) {
        showAuthGate(mode, username, 'Password must be at least 4 characters.');
        return;
      }
      if (password && password !== confirm) {
        showAuthGate(mode, username, 'Passwords do not match. Please try again.');
        return;
      }
    } else if (!password || password.length < 4) {
      showAuthGate(mode, username, 'Please enter your password.');
      return;
    }

    if (location.protocol.startsWith('http')) {
      try {
        const endpoint = mode === 'setup' ? '/api/auth/setup' : '/api/auth/login';
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            password,
            remember,
            google_client_id: setupGoogleId,
            allowed_emails: setupEmails
          })
        });
        const data = await res.json();
        if (!res.ok) {
          showAuthGate(mode, username, data.error || 'Authentication failed.');
          return;
        }
        if (data.token) {
          setAuthToken(data.token);
        }
        if (setupGoogleId) currentGoogleClientId = setupGoogleId;
        state.authUsername = data.username || username;
        hideAuthGate();
        showToast(mode === 'setup' ? 'Security configured & device signed in!' : `Welcome back, ${state.authUsername}!`);
        const boot = await apiRequest('/api/bootstrap');
        hasCompletedServerBootstrap = true;
        if (boot) applyBootstrapData(boot);
        return;
      } catch (err) {
        // Fallback to local auth if server is offline
      }
    }

    // Local / standalone preview mode authentication
    hasCompletedServerBootstrap = true;
    if (mode === 'setup') {
      saveLocalAuthCreds({ username, password, googleClientId: setupGoogleId, allowedEmails: setupEmails });
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
        showAuthGate(st.configured ? 'login' : 'setup', st.username || 'admin', '', st.googleClientId || '');
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
    const gIdInput = document.getElementById('sec-google-client-id');
    const gEmailsInput = document.getElementById('sec-allowed-emails');
    const originInput = document.getElementById('sec-exact-origin-url');
    if (originInput) {
      originInput.value = location.origin && location.origin !== 'null'
        ? location.origin
        : 'https://your-railway-domain.up.railway.app';
    }

    if (location.protocol.startsWith('http')) {
      try {
        const res = await fetch('/api/auth/status', {
          headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}
        });
        const st = await res.json();
        document.getElementById('sec-username').value = st.username || 'admin';
        if (gIdInput) gIdInput.value = st.googleClientId || '';
        if (gEmailsInput) gEmailsInput.value = st.allowedEmails || '';
        if (envNotice) envNotice.style.display = st.envManaged ? 'block' : 'none';
        if (curGroup) curGroup.style.display = st.configured ? 'flex' : 'none';
      } catch (e) {}
    } else {
      const localCreds = getLocalAuthCreds();
      document.getElementById('sec-username').value = (localCreds && localCreds.username) || 'admin';
      if (gIdInput) gIdInput.value = (localCreds && localCreds.googleClientId) || '';
      if (gEmailsInput) gEmailsInput.value = (localCreds && localCreds.allowedEmails) || '';
      if (curGroup) curGroup.style.display = localCreds ? 'flex' : 'none';
    }
    openModal('modal-security');
  }

  async function saveSecurityPasswordFromModal() {
    const newUsername = document.getElementById('sec-username').value.trim() || 'admin';
    const currentPassword = document.getElementById('sec-current-password').value;
    const newPassword = document.getElementById('sec-new-password').value;
    const confirmPassword = document.getElementById('sec-confirm-password').value;
    const googleClientId = (document.getElementById('sec-google-client-id') || {}).value || '';
    const allowedEmails = (document.getElementById('sec-allowed-emails') || {}).value || '';

    if (newPassword && newPassword.length < 4) {
      showToast('New password must be at least 4 characters');
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
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
            body: JSON.stringify({
              username: newUsername,
              password: newPassword,
              google_client_id: googleClientId.trim(),
              allowed_emails: allowedEmails.trim()
            })
          });
          const setupData = await setupRes.json();
          if (!setupRes.ok) {
            showToast(setupData.error || 'Could not save security settings');
            return;
          }
          if (setupData.token) setAuthToken(setupData.token);
          if (googleClientId.trim()) ensureGoogleScriptLoaded(googleClientId.trim());
          closeModal('modal-security');
          showToast('Account security & Google Sign-In settings saved!');
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
            new_password: newPassword,
            google_client_id: googleClientId.trim(),
            allowed_emails: allowedEmails.trim()
          })
        });
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || 'Failed to update security settings');
          return;
        }
        if (googleClientId.trim()) ensureGoogleScriptLoaded(googleClientId.trim());
        closeModal('modal-security');
        showToast('Security & Google Sign-In settings saved!');
        return;
      } catch (e) {}
    }

    // Local fallback
    const existing = getLocalAuthCreds() || {};
    if (newPassword && existing.password && existing.password !== currentPassword) {
      showToast('Current password is incorrect');
      return;
    }
    saveLocalAuthCreds({
      username: newUsername,
      password: newPassword || existing.password || '',
      googleClientId: googleClientId.trim(),
      allowedEmails: allowedEmails.trim()
    });
    memorySessionUnlocked = true;
    closeModal('modal-security');
    showToast('Security settings saved! Use 🚪 Exit App anytime to sign out.');
  }

  async function apiRequest(url, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const payload = options.body ? JSON.parse(options.body) : null;

    if (!location.protocol.startsWith('http')) {
      setSyncIndicator(false);
      if (method === 'GET') return getLocalStore();
      return applyLocalMutation(url, method, payload);
    }

    // Always apply mutations to localStorage FIRST so user data is never lost even if offline or 401
    let localUpdated = null;
    if (method !== 'GET') {
      localUpdated = applyLocalMutation(url, method, payload);
      if (payload) {
        options.body = JSON.stringify(payload);
      }
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
        showAuthGate(errBody.configured === false ? 'setup' : 'login', 'admin', '', currentGoogleClientId);
        return method === 'GET' ? getLocalStore() : localUpdated;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSyncIndicator(true);
      if (url === '/api/bootstrap' && method === 'GET') {
        return await syncBootstrapWithLocal(data);
      }
      data.user_modified = true;
      data.updated_at = Math.max(Date.now(), Number(data.updated_at) || 0);
      saveLocalStore(data);
      return data;
    } catch (err) {
      setSyncIndicator(false);
      return method === 'GET' ? getLocalStore() : localUpdated;
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

  let hasCompletedServerBootstrap = false;

  const RESTORED_DELTA_AMEX_IMAGE_URL = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAUEBAQEAwUEBAQGBQUGCA0ICAcHCBALDAkNExAUExIQEhIUFx0ZFBYcFhISGiMaHB4fISEhFBkkJyQgJh0gISD/2wBDAQUGBggHCA8ICA8gFRIVICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICD/wAARCABGAHADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwCFrvUrm3vrpStxfys8gaXIV5DzliOxJ5xWYR47a0mEaWYnCN5Xzbl3KpUZOATvLK3bb5ZGPmBX0Gy8OWiKVBlwTk8j/Ct208J2cxG6SYZ9Cv8AhWpgjy9X8a/aLn7PDBFDtdbb7UyNtPlx7C4QD/lp5nTORjhcfM2+n8fRtcNpUNgInbNuly4aREWJwRJtAXc0nllduQBkNXt0PgDSmTJubwH/AH1/+JqdfAWkqMfarv8ANP8A4mkOx5FqLeLGn1Q6S8QkyBYNOV8jZtTd5gHz7s+Zgg9dnbNRn/hYHnKbdrf7Pmb5XI8xf3wERJxg5iyCoPDAtuYER17H/wAIJpQP/H1d/wDfSf8AxNSL4J0xTkXV1+DL/hRcdjykSeJjAzKkofyuAzwK27cOOMjP3juwABgbWPzV1a7QeX3e6murk8J6TBE0099cRRoMszyqFH1JHFcjc3ekC7aPT5J5Ikx+9mwN/wBBgHHufy7liaKFy2tW82q3Ml/ZRaYkSPBIztE0AXJlaRmVlwR/FwFCjIbJIZpd3rU14pk8RaPd28xtZI/s7hSYZICm9chvvzjcmScgYznNX7lYNQsXtWjSQOV4bK9CDlWUhkYYyrjlWww5FUYvD88fi1PEUl8Jp1tYrVo3XCsFeZmbHTdiVQDjICsOA5wCL2kajdxWduuq6rZ3UjW1vulhmXYzuAFdcKOJHLKvPSNcZLNi5PqNosxga4h80y+Rs80bjJs8zZjru2fNjrt56c1jXHh2J7WS2t7yWBJrqS4dtzSMmUcJ5e4kJsco6gfKCvAFZkPhgW8lpOssYmj1N9Vudittlle1eF9oYkqCzlgMnA+UUDNO/wBW062mtobq9tYJLwlbZJZlVpzxkICct1HTPUetZttrFldTefpWp280ttKAXt5FkMTg5GcdCCOhomsm+26VdSA77GOSPC3Dop3+WMkAAN9w8MCBnjnmqNvaDTtPS1Rl8pZh5MSklYE2gCNc87chiB0UNtHCigR39nb5YcVurJJaFFitjK5GcZHA7HnHvUOmQrKqSxsrowyGUgg1syWJlmRmWPYq4G9c85OcfpQUkNXUbvyXYQqCoJAKEfhnOPx6Vat753u1tZ4dkjRmRSCOQCAeATj7y9+cnpisq+1Szgtbq1WK53APHxZylM8jrtxj3zjHfvUK3ttY6z9tvZ7e2tYrWUySHCAfPEBn+X5UrFHU1z3iHxZpfh9DHK/2i9I+S1jPzdOCx/hHTr+GcGuE8RfE6a+Mtj4bRoIGBQ3jjDtz/AP4RjPJ556KRXJ2sBeVpZWaSR2LM7nJYnqSe5NCRLZvX+sap4guPM1Cfy7YEFLdOI098dzyeT6nGBxXms3iS7n1GU2x2wsxEYK4O0dO/XHX3rpPFmof2foBtY2Anvf3S+yY+c9OeMDt96uV0DTmubpeAVFMg9B8MreToJLhwc89K7HcEAzjn0OKydOhEFsq4C8dqts4A55oAllmXHA/HOaz55m7Mv48UsswwRXP6rrkFhc2lgkZn1C/LJaQBseYyjJJbBCgZBJ5OOgJ4oA0Xy53dfo1Z9+cRRZU8yD09DSLq1s6WTidlW/wICykBiV3AEjhePXH58VBNeQXkEbQTxzL5g5Vge7Ln16qwz3wcUDOT8I+N9b8MzgWtwZbcsd1rNkoQTk49D16epzXvnh/xn4d8YQLbu7Wd+BjyWlMb9cEI4IyD8vA/pXC/EL4Y6dYWlx4j0e9g09FO6S1uHCxnjpGx7k9EPUk4IwBXlccjRSDdIqshyGAwQexzS3K2PfvF3iLwj4eEtlKLnUNQIwbSK9m+XIz87bvl7ccnkcYrx661C+1i7a4vZWKn7sQdmSMc4A3EnjJ6kms6URf2nc+S2+PzW2t6jPX8cCtK2iyQKZLdy7ZQdMAV0NrD04rPs4eBS+I9TOh+Gri7jcrcOPJgwCfnboehHAy3PHy0xHC+ItQbWPFcscDFoLY+RGexwfmPBIOTnB7gCu48OaeLeBWI2t6jmuI8K6aX2yyKcdh0r060CxxgBCv4/8A1qQGspIXuffNMeQY5NQ7229ePfNQSzEcHH4D/wCvTAJZR6j8qzbyztL7yjcR72icSROvytE46MrAgqeoyOxI6GpZZBUHmsM7VX6ikAj6bYyujSWNu7R7NjNEpKbM7Mem3c2MdMnHWi5t4bazhit4Y4YhKD5cahVBOcnAHU1YhZmIJJz64pmoAeRFkn/Wj+RoGee+IPEWs+J783ms3fnMpPlRjiOAE8qg7DgD1OBknFJfKQkU42r5qB8AdMjNULq3ntL2e0uYzFPDIySIeqsDgj861JYxceGoX35eMEHDHjB4H5fzoBkqLF5sfkEFRFH3zztGa3bSHOPesPS/Kl02yMZJZY2EmfXe3/su2ursocAUIRo2kXTivPvGd4dd8XQ6PauslrYDDlPmBkbBbkHHAwPUHcK7/VNQi0Pw9d6vPHuW2j3BN23e3AVc9ssQM9s1534VtLlkfUbx3kurtjLIxUZJJzk/XrQPzOq0mz+zW6gxYGOm3/Gt6JwOAhH0xVGF2VRiLd9FFWxJ8vzRMPoaYiwzoR98/i1VZJQCQDu+hoZJG+eOOR8DPAJqo0pIJBGPY/8A1qQDmcn+A1GZYowGlmEYJCjcQOScAfmQKgLbs/OR9TTXs7e7CpcwwzqpyoljDgHBGQD7Ej6E0AaSsiqzNIoVWCEsccnGB9TkfmKW/wCLeEEgZkGMH2NY1tpC2msSQR6LpK6VLAoaWOJVdn35Klccjo3/ANfitN7C3iWGHT9PhjkmmVAsMapvPOBx7n9aBnp3i34d+H/El99uu0lt7vADTWzBWkA6bsgg/XGcYGeBXORfDDQrS2e2S6vXRmLHe6Z5AHZfaiis7s2siGy+GeiWEbxw3V4Q0hkO50PJAGPu9OK1IvCVhFjbPOcepH+FFFF2HKilr3w/0nxFZwWl7dXUcMMwmAiZBuYAgZJU8cnpimRfDzSoVCx318AOP9Yo/wDZaKKLsLInHgbTx0vr3/v4v/xNKfBFh/z/AN9/38H/AMTRRRdi5UMPgSwP/MS1AfSYf/E0xvh/prddQ1D8JV/+Joooux8qG/8ACvdM/wCglqP/AH+H/wATSj4e6aDn+09S/wC/w/8AiaKKLsXKi1F8P9PzxqmpD/tuP/ia6fw74P0zSbsXSST3VwM7ZLl95TPXbwAPr16+tFFF2OyP/9k=';

  function restoreJimDeltaCardIfNeeded() {
    if (!hasCompletedServerBootstrap || !state.rewards || state.rewards.__scoped) return false;
    if (safeStorageGet('ww_restored_jim_delta_v1') === '1') return false;

    const deletedSet = new Set(Array.isArray(state.rewards.deleted_ids) ? state.rewards.deleted_ids : []);
    if (deletedSet.has('prog-delta-jim') || deletedSet.has('card-delta-plat-jim')) {
      safeStorageSet('ww_restored_jim_delta_v1', '1');
      return false;
    }

    const customFields = [
      { id: 'cf-dl-1', label: 'Flight Companion Pass', value: 'Renews', checked: true },
      { id: 'cf-dl-2', label: '$150 Delta Stays Credit', value: '', checked: false },
      { id: 'cf-dl-3', label: 'First & Second Checked Bags Free', value: '', checked: false }
    ];

    let changed = false;
    let deltaProg = (state.rewards.programs || []).find(p =>
      String(p.name || '').toLowerCase().includes('delta skymiles')
    );
    if (!deltaProg) {
      deltaProg = {
        id: 'prog-delta-jim',
        name: 'Delta SkyMiles',
        owner: 'Jim',
        ecosystem: 'airline',
        status_tier: 'Gold Medallion',
        member_id: '',
        points: 76418,
        cpp: 1.25,
        qualifying_nights: 10000,
        target_nights: 15000,
        metric_label: 'MQDs (Medallion Dollars)',
        expiration_policy: 'Miles never expire',
        transfer_partners: 'Amex Membership Rewards (1:1)',
        notes: 'TakeOff 15 (15% off award flights with Delta Amex)',
        website_url: 'https://www.delta.com/myprofile/dashboard',
        custom_fields: JSON.parse(JSON.stringify(customFields))
      };
      state.rewards.programs.unshift(deltaProg);
      changed = true;
    } else {
      if (!deltaProg.owner) { deltaProg.owner = 'Jim'; changed = true; }
      if (!deltaProg.points || Number(deltaProg.points) === 0) { deltaProg.points = 76418; changed = true; }
      if (!deltaProg.status_tier || deltaProg.status_tier === 'Member') { deltaProg.status_tier = 'Gold Medallion'; changed = true; }
      if (!Array.isArray(deltaProg.custom_fields) || deltaProg.custom_fields.length === 0) {
        deltaProg.custom_fields = JSON.parse(JSON.stringify(customFields));
        changed = true;
      }
    }

    let deltaCard = (state.rewards.cards || []).find(c =>
      String(c.name || c.card_name || '').toLowerCase().includes('delta skymiles platinum')
    );
    if (!deltaCard) {
      const nextYear = new Date(Date.now() + 300 * 86400000).toISOString().slice(0, 10);
      deltaCard = {
        id: 'card-delta-plat-jim',
        name: 'Delta SkyMiles Platinum Amex',
        owner: 'Jim',
        issuer: 'American Express',
        ecosystem: 'Delta SkyMiles',
        linked_program_id: deltaProg.id,
        card_style: 'auto',
        image_url: RESTORED_DELTA_AMEX_IMAGE_URL,
        annual_fee: 350,
        renewal_date: nextYear,
        ftf: 'None ($0 Foreign Tx Fee)',
        multipliers: '3x Delta & Direct Hotels • 2x Dining & US Supermarkets • $2,500 MQD Headstart',
        best_for: 'Annual Companion Certificate + $2,500 MQD Headstart + $150 Delta Stays + $120 Resy',
        website_url: 'https://global.americanexpress.com/login',
        card_number: '1006',
        card_expiration: '05/27',
        sub_active: false,
        sub_bonus_label: '85,000 SkyMiles',
        sub_deadline: '',
        sub_target_usd: 4000,
        sub_spent_manual_usd: 0,
        credits: [
          { name: '$150 Delta Stays Credit (Annual)', total_usd: 150, used_usd: 0 },
          { name: '$120 Resy Dining Credit ($10/mo)', total_usd: 120, used_usd: 0 },
          { name: '$120 Rideshare Credit ($10/mo)', total_usd: 120, used_usd: 0 },
          { name: '$120 Global Entry / TSA PreCheck', total_usd: 120, used_usd: 0 }
        ],
        custom_fields: JSON.parse(JSON.stringify(customFields))
      };
      state.rewards.cards.unshift(deltaCard);
      changed = true;
    } else {
      if (!deltaCard.owner) { deltaCard.owner = 'Jim'; changed = true; }
      if (!deltaCard.card_number) { deltaCard.card_number = '1006'; changed = true; }
      if (!deltaCard.card_expiration) { deltaCard.card_expiration = '05/27'; changed = true; }
      if (!deltaCard.image_url) { deltaCard.image_url = RESTORED_DELTA_AMEX_IMAGE_URL; changed = true; }
      if (!Array.isArray(deltaCard.custom_fields) || deltaCard.custom_fields.length === 0) {
        deltaCard.custom_fields = JSON.parse(JSON.stringify(customFields));
        changed = true;
      }
    }

    const hasCompanionCert = (state.rewards.certificates || []).some(c =>
      String(c.title || '').toLowerCase().includes('delta skymiles') && String(c.title || '').toLowerCase().includes('companion')
    );
    if (!hasCompanionCert) {
      const nextYear = new Date(Date.now() + 330 * 86400000).toISOString().slice(0, 10);
      state.rewards.certificates.unshift({
        id: 'cert-delta-companion-jim',
        owner: 'Jim',
        linked_program_id: deltaProg.id,
        title: 'Delta SkyMiles Main Cabin Companion Certificate',
        type: 'Companion Pass',
        program: 'Delta SkyMiles',
        source_card: 'Delta SkyMiles Platinum Amex',
        cap_details: 'Round-trip Domestic, Caribbean, or Central America Main Cabin',
        expires_date: nextYear,
        est_value_usd: 450,
        status: 'available',
        notes: 'Pay only taxes & fees (capped at $80 domestic)'
      });
      changed = true;
    }

    registerRewardOwner('Jim');
    safeStorageSet('ww_restored_jim_delta_v1', '1');
    if (changed) {
      setTimeout(() => {
        saveRewardsState('Restored Delta SkyMiles & Delta SkyMiles Platinum Amex card');
      }, 80);
    }
    return changed;
  }

  function applyBootstrapData(data) {
    if (!data) return;
    state.settings = data.settings || state.settings;
    state.trips = data.trips || [];
    state.expenses = data.expenses || [];
    state.revenues = data.revenues || [];
    if (data.rewards && Array.isArray(data.rewards.programs)) {
      state.rewards = data.rewards;
    } else if (!state.rewards || !Array.isArray(state.rewards.programs)) {
      state.rewards = getDefaultRewardsData();
    }

    if (hasCompletedServerBootstrap) {
      restoreJimDeltaCardIfNeeded();
    }

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
          if (st.googleClientId) {
            ensureGoogleScriptLoaded(st.googleClientId);
          }
          if (!st.configured) {
            showAuthGate('setup', st.username || 'admin', '', st.googleClientId || '');
            return;
          }
          if (!st.authenticated) {
            showAuthGate('login', st.username || 'admin', '', st.googleClientId || '');
            return;
          }
        }
      } catch (e) {}
    }

    const data = await apiRequest('/api/bootstrap');
    hasCompletedServerBootstrap = true;
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
    renderRewardsDashboard();
    if (state.activeView === 'admin') renderAdminWorkspace();
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
    const rredTripSelect = document.getElementById('rred-trip-id');
    const tripOptionsHtml = state.trips.map(t =>
      `<option value="${escapeHtml(t.id)}">${escapeHtml(t.name)} — ${escapeHtml(t.destination)}</option>`
    ).join('');
    if (expTripSelect) expTripSelect.innerHTML = tripOptionsHtml;
    if (revTripSelect) revTripSelect.innerHTML = tripOptionsHtml;
    if (rredTripSelect) {
      rredTripSelect.innerHTML = `<option value="all">General Travel / Unassigned Shoot</option>` + tripOptionsHtml;
    }

    // Ensure any custom cards from Rewards wallet also appear in Expense Payment Method selector
    const paySelect = document.getElementById('exp-payment-method');
    if (paySelect && state.rewards && Array.isArray(state.rewards.cards)) {
      const existingOpts = new Set(Array.from(paySelect.options).map(o => o.value));
      for (const c of state.rewards.cards) {
        const cardLabel = c.name || c.card_name;
        if (cardLabel && !existingOpts.has(cardLabel)) {
          const opt = document.createElement('option');
          opt.value = cardLabel;
          opt.textContent = cardLabel;
          paySelect.appendChild(opt);
          existingOpts.add(cardLabel);
        }
      }
    }
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
        <button type="button" class="btn btn-sm" data-trip-ai-advisor="${escapeHtml(trip.id)}" style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.16), rgba(14, 165, 233, 0.16)); border: 1px solid rgba(139, 92, 246, 0.4); font-weight: 700; color: var(--text-primary);" title="Generate AI hotel, flight & rewards plan for this trip">✨ AI Rewards Plan</button>
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
      const meta = CATEGORY_META[cat] || { color: '#0ea5e9', icon: '📌' };
      const hexCol = resolveHexColor(meta.color, '#0ea5e9');
      const isSelected = state.categoryFilter === cat;
      return `
        <div class="category-row" data-filter-cat="${escapeHtml(cat)}" style="${isSelected ? `background-color: ${hexToRgba(hexCol, 0.12)}; border-left: 3px solid ${hexCol};` : ''}">
          <div class="category-row-top">
            <span class="category-name-wrap">
              <span class="cat-dot" style="background-color: ${hexCol};"></span>
              <span>${meta.icon} ${escapeHtml(cat)}</span>
              <button type="button" class="btn-color-edit-inline" data-quick-color-taxcat="${escapeHtml(cat)}" title="Change ${escapeHtml(cat)} color" style="padding: 1px 5px; font-size: 10px;">✏️</button>
            </span>
            <span class="category-stats tabular">
              <span class="category-amount">${fmtUsd(amount)}</span>
              <span class="category-pct">${pct}%</span>
            </span>
          </div>
          <div class="progress-track" style="height: 6px;">
            <div class="progress-fill" style="width: ${pct}%; background-color: ${hexCol};"></div>
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
      if (cat === 'all') {
        return `<button type="button" class="chip-btn ${active}" data-chip-cat="all">All Categories</button>`;
      }
      const meta = CATEGORY_META[cat] || { color: '#0ea5e9', icon: '📌' };
      const hexCol = resolveHexColor(meta.color, '#0ea5e9');
      const styleStr = active
        ? `border-color: ${hexCol}; background-color: ${hexToRgba(hexCol, 0.16)}; color: var(--text-primary);`
        : `border-color: ${hexToRgba(hexCol, 0.45)};`;
      return `<button type="button" class="chip-btn ${active}" data-chip-cat="${escapeHtml(cat)}" style="${styleStr}"><span class="cat-dot" style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${hexCol};margin-right:5px;"></span>${escapeHtml(meta.icon)} ${escapeHtml(cat)}</button>`;
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
            <span class="cat-badge" style="border-color: ${hexToRgba(meta.color, 0.55)}; background-color: ${hexToRgba(meta.color, 0.12)};">
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

          <div style="display: flex; gap: 6px; margin-top: 4px;">
            <button type="button" class="btn btn-sm" data-open-trip-dashboard="${escapeHtml(t.id)}" style="flex: 1;">
              Open Ledger →
            </button>
            <button type="button" class="btn btn-sm" data-trip-ai-advisor="${escapeHtml(t.id)}" style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.16), rgba(14, 165, 233, 0.16)); border: 1px solid rgba(139, 92, 246, 0.4); font-weight: 700; color: var(--text-primary);" title="AI Rewards Plan for this trip">
              ✨ AI Plan
            </button>
          </div>
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

    const allConfiguredCats = getTaxCategories();
    const catMap = new Map(allConfiguredCats.map(c => [c.name, c]));

    const catStats = {};
    for (const cat of allConfiguredCats) {
      catStats[cat.name] = { count: 0, receipts: 0, gross: 0, deductible: 0, config: cat };
    }

    for (const e of expenses) {
      const amt = Number(e.amount_usd) || 0;
      const catConfig = catMap.get(e.category);
      const isMeal = catConfig ? catConfig.deductible === 'meal' : (e.category === 'Meals & Craft');
      const isDeductible = e.tax_deductible && (!catConfig || catConfig.deductible !== '0');
      const ded = isDeductible ? amt * (isMeal ? mealRate : 1.0) : 0;

      grossTotal += amt;
      deductibleTotal += ded;
      if (e.reimbursable) reimbursableTotal += amt;
      if (e.receipt_data) receiptsCount++;

      if (!catStats[e.category]) {
        catStats[e.category] = { count: 0, receipts: 0, gross: 0, deductible: 0, config: catConfig };
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
    // If help requested, switch to Admin view with Help sub-pane active
    if (viewName === 'help') {
      state.adminTab = 'help';
      viewName = 'admin';
    }

    state.activeView = viewName;
    const views = ['dashboard', 'trips', 'revenue', 'rewards', 'tax', 'admin'];
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

    const topRewardsBtn = document.getElementById('btn-topbar-rewards');
    const topRewardsLabel = document.getElementById('btn-topbar-rewards-label');
    if (topRewardsBtn) {
      topRewardsBtn.classList.toggle('active-rewards-mode', viewName === 'rewards');
    }
    if (topRewardsLabel) {
      topRewardsLabel.textContent = viewName === 'rewards' ? '← Finance Ledger' : 'Rewards';
    }

    const titles = {
      dashboard: 'Road Finance Dashboard',
      trips: 'Trips',
      revenue: 'Sponsors & AdSense ROI',
      rewards: 'Rewards & Loyalty Command Center',
      tax: 'Tax & Accountant Export Hub',
      admin: 'Workspace Administration'
    };
    const heading = document.getElementById('main-page-heading');
    if (heading) heading.textContent = titles[viewName] || 'Road Finance Dashboard';
    if (viewName === 'rewards') {
      renderRewardsDashboard();
    }
    if (viewName === 'admin') {
      renderAdminWorkspace();
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

  let activeDeleteResolver = null;

  function confirmDelete({ title = 'Confirm Delete', message = 'Are you sure you want to delete this item?', extra = 'This action cannot be undone.', confirmText = 'Delete', cancelText = 'Cancel' } = {}) {
    return new Promise(resolve => {
      if (activeDeleteResolver) {
        activeDeleteResolver(false);
        activeDeleteResolver = null;
      }
      activeDeleteResolver = resolve;

      const titleEl = document.getElementById('modal-confirm-title');
      const descEl = document.getElementById('modal-confirm-desc');
      const extraEl = document.getElementById('modal-confirm-extra');
      const confirmBtn = document.getElementById('btn-confirm-delete-btn');
      const cancelBtn = document.getElementById('btn-confirm-delete-cancel');

      if (titleEl) titleEl.textContent = title;
      if (descEl) descEl.textContent = message;
      if (extraEl) extraEl.textContent = extra;
      if (confirmBtn) confirmBtn.textContent = confirmText;
      if (cancelBtn) cancelBtn.textContent = cancelText;

      openModal('modal-confirm-delete');
      if (cancelBtn) setTimeout(() => cancelBtn.focus(), 50);
    });
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

    // Dynamically populate quick category buttons from configured tax categories
    const quickCatGrid = document.getElementById('exp-quick-cat-grid');
    if (quickCatGrid) {
      const activeCats = getTaxCategories();
      quickCatGrid.innerHTML = activeCats.map(c => {
        const isSel = c.name === catInput.value ? 'selected' : '';
        return `<button type="button" class="quick-cat-btn ${isSel}" data-cat="${escapeHtml(c.name)}">${escapeHtml(c.icon || '🏷️')} ${escapeHtml(c.name)}</button>`;
      }).join('');
    }

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
    const catMap = new Map(getTaxCategories().map(c => [c.name, c]));
    for (const exp of filtered) {
      const trip = tripMap.get(exp.trip_id);
      const catConfig = catMap.get(exp.category);
      const isMeal = catConfig ? catConfig.deductible === 'meal' : (exp.category === 'Meals & Craft');
      const isDeductible = exp.tax_deductible && (!catConfig || catConfig.deductible !== '0');
      const dedMultiplier = isDeductible ? (isMeal ? mealRate : 1.0) : 0.0;
      const deductibleUsd = (exp.amount_usd * dedMultiplier).toFixed(2);
      const schedLine = catConfig && catConfig.schedule_c ? `${exp.category} [${catConfig.schedule_c}]` : exp.category;
      const row = [
        exp.expense_date,
        trip ? trip.name : exp.trip_id,
        trip ? trip.destination : '',
        schedLine,
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

  // ============================================================================
  // REWARDS & LOYALTY COMMAND CENTER
  // ============================================================================
  const TRANSFER_PARTNER_MATRIX_ROWS = [
    {
      partner: 'World of Hyatt',
      type: '🏨 Hotel (Globalist Sweet Spot)',
      chase: '1 : 1 ⚡',
      amex: '—',
      capone: '—',
      bilt: '1 : 1 ⚡',
      citi: '—',
      banks: ['chase', 'bilt'],
      sweetSpot: 'Instant • Park Hyatt / Alila / Standard rooms at 2.1¢–4.5¢/pt value + $0 resort fees'
    },
    {
      partner: 'Air Canada Aeroplan',
      type: '✈️ Star Alliance',
      chase: '1 : 1 ⚡',
      amex: '1 : 1 ⚡',
      capone: '1 : 1 ⚡',
      bilt: '1 : 1 ⚡',
      citi: '—',
      banks: ['chase', 'amex', 'capone', 'bilt'],
      sweetSpot: 'Instant • ANA / SWISS / Lufthansa / Singapore Business Class + 5,000-pt stopovers'
    },
    {
      partner: 'United MileagePlus',
      type: '✈️ Star Alliance',
      chase: '1 : 1 ⚡',
      amex: '—',
      capone: '—',
      bilt: '1 : 1 ⚡',
      citi: '—',
      banks: ['chase', 'bilt'],
      sweetSpot: 'Instant • $0 fuel surcharges + Excursionist Perk free multi-country shoot segment'
    },
    {
      partner: 'ANA Mileage Club',
      type: '✈️ Star Alliance',
      chase: '—',
      amex: '1 : 1 (48h)',
      capone: '—',
      bilt: '—',
      citi: '—',
      banks: ['amex'],
      sweetSpot: '24–48h • US to Tokyo Business Class from 105k–110k miles roundtrip'
    },
    {
      partner: 'British Airways / Qatar / Iberia Avios',
      type: '✈️ Oneworld',
      chase: '1 : 1 ⚡',
      amex: '1 : 1 ⚡',
      capone: '1 : 1 ⚡',
      bilt: '1 : 1 ⚡',
      citi: '1 : 1 ⚡',
      banks: ['chase', 'amex', 'capone', 'bilt', 'citi'],
      sweetSpot: 'Instant • Qatar Qsuites, JAL domestic hops, American short-haul & frequent 30% bonuses'
    },
    {
      partner: 'Air France / KLM Flying Blue',
      type: '✈️ SkyTeam',
      chase: '1 : 1 ⚡',
      amex: '1 : 1 ⚡',
      capone: '1 : 1 ⚡',
      bilt: '1 : 1 ⚡',
      citi: '1 : 1 ⚡',
      banks: ['chase', 'amex', 'capone', 'bilt', 'citi'],
      sweetSpot: 'Instant • 50k–60k Promo Rewards Business Class to Europe + free stopovers'
    },
    {
      partner: 'Virgin Atlantic Flying Club',
      type: '✈️ SkyTeam / Partner Sweet Spots',
      chase: '1 : 1 ⚡',
      amex: '1 : 1 ⚡',
      capone: '1 : 1 ⚡',
      bilt: '1 : 1 ⚡',
      citi: '1 : 1 ⚡',
      banks: ['chase', 'amex', 'capone', 'bilt', 'citi'],
      sweetSpot: 'Instant • ANA First/Business Class to Tokyo & 30%–40% transfer bonuses'
    },
    {
      partner: 'Alaska Airlines Atmos / Hawaiian',
      type: '✈️ Oneworld',
      chase: '—',
      amex: '—',
      capone: '—',
      bilt: '1 : 1 ⚡',
      citi: '—',
      banks: ['bilt'],
      sweetSpot: 'Instant • JAL, Cathay Pacific, Condor, Starlux & LATAM South America Business Class'
    },
    {
      partner: 'Delta SkyMiles',
      type: '✈️ SkyTeam',
      chase: '—',
      amex: '1 : 1 ⚡',
      capone: '—',
      bilt: '—',
      citi: '—',
      banks: ['amex'],
      sweetSpot: 'Instant • Flash sales to Latin America / Europe + 15% TakeOff 15 cardholder discount'
    },
    {
      partner: 'Marriott Bonvoy',
      type: '🏨 Hotel (5th Night Free)',
      chase: '1 : 1 ⚡',
      amex: '1 : 1 ⚡',
      capone: '—',
      bilt: '1 : 1 ⚡',
      citi: '—',
      banks: ['chase', 'amex', 'bilt'],
      sweetSpot: 'Instant • Top off 85k Free Night Certificates + 5th Night Free on award stays'
    },
    {
      partner: 'Hilton Honors',
      type: '🏨 Hotel (5th Night Free)',
      chase: '—',
      amex: '1 : 2 ⚡',
      capone: '—',
      bilt: '—',
      citi: '—',
      banks: ['amex'],
      sweetSpot: 'Instant • 1:2 base ratio (up to 1:2.6 with bonus) + 5th Night Free on luxury resorts'
    },
    {
      partner: 'Choice Privileges & Preferred Hotels',
      type: '🏨 Hotel (Nordic / Europe)',
      chase: '—',
      amex: '1 : 1 ⚡',
      capone: '1 : 1 ⚡',
      bilt: '—',
      citi: '1 : 2 ⚡',
      banks: ['amex', 'capone', 'citi'],
      sweetSpot: 'Instant • 1:2 from Citi TY for Scandinavia, Japan & Preferred Hotels luxury properties'
    }
  ];

  const BEST_SWIPE_CHEAT_SHEET = [
    {
      cat: '✈️ Flights & Airfare',
      winner: 'Amex Platinum (5X) or Venture X Portal (5X)',
      detail: '5X Membership Rewards booked direct with airlines (~9.25% return) or 3X Chase Sapphire Reserve + trip delay insurance.'
    },
    {
      cat: '🏨 Hotels & Lodging',
      winner: 'World of Hyatt (9X total) or Hilton Aspire (14X)',
      detail: '4X card + 5X base on Hyatt stays (~19.8% return); 14X card + 20X Diamond on Hilton resorts (~19.7% return).'
    },
    {
      cat: '🍜 Dining, Restaurants & Crew Craft',
      winner: 'Amex Gold (4X) or Chase Sapphire Reserve / Bilt (3X)',
      detail: '4X Amex MR worldwide at restaurants (~7.4% return) or 6X Bilt on Rent Day (1st of month).'
    },
    {
      cat: '🚄 Transit, Shinkansen, Ferries & Tolls',
      winner: 'Chase Sapphire Reserve (3X Travel)',
      detail: 'Counts trains, subways, ferries, parking, and tolls globally as 3X Ultimate Rewards (~6.15% return).'
    },
    {
      cat: '🎥 Camera Gear, Drones, Permits & General Spend',
      winner: 'Capital One Venture X (2X Everything)',
      detail: 'Unlimited 2X transferable miles on every non-category expense with zero foreign transaction fees.'
    },
    {
      cat: '💻 YouTube Ads, Shipping & Production Software',
      winner: 'Chase Ink Business Preferred (3X)',
      detail: '3X Ultimate Rewards on travel, shipping, internet/phone, and social media advertising up to $150k/yr.'
    }
  ];

  const POPULAR_REWARD_TEMPLATES = [
    // =========================================================================
    // CREDIT CARDS DATABASE (WITH REALISTIC CARD ART, CREDITS & BUNDLED PERKS)
    // =========================================================================
    {
      kind: 'card',
      title: 'Capital One Venture X®',
      subtitle: '$395 Fee • $300 Travel Credit + 10k Anniversary Miles + Lounge • 2X All',
      category: 'Capital One',
      data: {
        name: 'Capital One Venture X',
        issuer: 'Capital One',
        ecosystem: 'Capital One Miles',
        card_style: 'venture-x',
        annual_fee: 395,
        renewal_date: '2027-06-01',
        ftf: 'None ($0 Foreign Tx Fee)',
        multipliers: '2x Everything Everywhere • 10x Portal Hotels/Cars • 5x Portal Flights',
        best_for: '2X Catch-All Foreign Vendors, Permits, Guides & Gear Rentals',
        sub_active: false,
        sub_target_usd: 4000,
        sub_spent_manual_usd: 4000,
        sub_bonus_label: '75,000 Capital One Miles ($1,385 value)',
        sub_deadline: '2026-12-31',
        credits: [
          { id: 'c_vx_1', name: '$300 Annual Capital One Travel Portal Credit', total_usd: 300, used_usd: 0 },
          { id: 'c_vx_2', name: '10,000 Anniversary Bonus Miles ($185 value)', total_usd: 185, used_usd: 185 },
          { id: 'c_vx_3', name: '$120 Global Entry / TSA PreCheck Credit', total_usd: 120, used_usd: 120 }
        ],
        bundled_certs: [
          {
            title: 'Capital One Lounge & Priority Pass Select Membership',
            type: 'Lounge & Security Perk',
            program: 'Capital One Miles',
            source_card: 'Capital One Venture X',
            cap_details: 'Unlimited access to Capital One Lounges + 1,400+ Priority Pass Lounges',
            est_value_usd: 469,
            notes: 'Complimentary airport lounge access + 2 guests per visit.'
          }
        ]
      }
    },
    {
      kind: 'card',
      title: 'Capital One Venture Rewards®',
      subtitle: '$95 Fee • $120 Global Entry Credit • 2X Everywhere',
      category: 'Capital One',
      data: {
        name: 'Capital One Venture Rewards',
        issuer: 'Capital One',
        ecosystem: 'Capital One Miles',
        card_style: 'venture-x',
        annual_fee: 95,
        renewal_date: '2027-06-01',
        ftf: 'None ($0 Foreign Tx Fee)',
        multipliers: '2x Miles on Every Purchase • 5x Hotels, Vacation Rentals & Rental Cars in Portal',
        best_for: '2X Everyday Catch-All & 1:1 Airline/Hotel Transfers',
        sub_active: false,
        sub_target_usd: 4000,
        sub_spent_manual_usd: 0,
        sub_bonus_label: '75,000 Capital One Miles',
        sub_deadline: '2027-03-31',
        credits: [
          { id: 'c_vr_1', name: '$120 Global Entry / TSA PreCheck Credit', total_usd: 120, used_usd: 120 }
        ]
      }
    },
    {
      kind: 'card',
      title: 'Chase Sapphire Reserve®',
      subtitle: '$550 Fee • $300 Travel Credit + Sapphire Lounge • 3X Travel & Dining',
      category: 'Chase',
      data: {
        name: 'Chase Sapphire Reserve',
        issuer: 'Chase',
        ecosystem: 'Chase Ultimate Rewards',
        card_style: 'sapphire-reserve',
        annual_fee: 550,
        renewal_date: '2027-03-01',
        ftf: 'None ($0 Foreign Tx Fee)',
        multipliers: '3x Worldwide Travel & Transit • 3x Dining • 10x Portal Hotels/Cars',
        best_for: 'Overseas Trains, Shinkansen, Ferries, Taxis & Crew Dining',
        sub_active: false,
        sub_target_usd: 4000,
        sub_spent_manual_usd: 4000,
        sub_bonus_label: '75,000 Ultimate Rewards pts',
        sub_deadline: '2026-12-31',
        credits: [
          { id: 'c_csr_1', name: '$300 Annual Travel Credit (Auto-Applied to Any Travel)', total_usd: 300, used_usd: 300 },
          { id: 'c_csr_2', name: '$120 Global Entry / TSA PreCheck / NEXUS', total_usd: 120, used_usd: 120 },
          { id: 'c_csr_3', name: '$180 DoorDash / Instacart Credits', total_usd: 180, used_usd: 60 }
        ],
        bundled_certs: [
          {
            title: 'Chase Sapphire Lounge by The Club & Priority Pass Select',
            type: 'Lounge & Security Perk',
            program: 'Chase Ultimate Rewards',
            source_card: 'Chase Sapphire Reserve',
            cap_details: 'Unlimited Chase Sapphire Lounge + Priority Pass Select + 2 Guests',
            est_value_usd: 469,
            notes: 'Includes Primary Rental Car CDW & $10,000 Trip Cancellation Insurance.'
          }
        ]
      }
    },
    {
      kind: 'card',
      title: 'Chase Sapphire Preferred®',
      subtitle: '$95 Fee • $50 Hotel Credit • 3X Dining / 2X Travel • 1:1 Hyatt Transfers',
      category: 'Chase',
      data: {
        name: 'Chase Sapphire Preferred',
        issuer: 'Chase',
        ecosystem: 'Chase Ultimate Rewards',
        card_style: 'sapphire-preferred',
        annual_fee: 95,
        renewal_date: '2027-04-15',
        ftf: 'None ($0 Foreign Tx Fee)',
        multipliers: '3x Dining • 3x Streaming & Online Grocery • 2x Travel • 10% Anniversary Boost',
        best_for: 'Low-Fee 1:1 Hyatt & United Point Transfers + Primary Rental Car CDW',
        sub_active: true,
        sub_target_usd: 4000,
        sub_spent_manual_usd: 1200,
        sub_bonus_label: '75,000 Ultimate Rewards pts ($1,538 value)',
        sub_deadline: '2027-02-28',
        credits: [
          { id: 'c_csp_1', name: '$50 Annual Chase Travel Hotel Credit', total_usd: 50, used_usd: 0 },
          { id: 'c_csp_2', name: '10% Anniversary Points Bonus on Total Spend', total_usd: 50, used_usd: 50 }
        ]
      }
    },
    {
      kind: 'card',
      title: 'Chase Ink Business Preferred®',
      subtitle: '$95 Fee • 3X Travel, Shipping, Internet & Ads up to $150k/yr',
      category: 'Chase',
      data: {
        name: 'Chase Ink Business Preferred',
        issuer: 'Chase',
        ecosystem: 'Chase Ultimate Rewards',
        card_style: 'chase-ink',
        annual_fee: 95,
        renewal_date: '2027-05-15',
        ftf: 'None ($0 Foreign Tx Fee)',
        multipliers: '3x All Travel (Hotels, JR Rail, Ferries, Flights, Campers) • 3x Internet, Shipping & Ads',
        best_for: '3x Overseas Trains, Ferries, Campervans, Hotels & Tolls',
        sub_active: false,
        sub_target_usd: 8000,
        sub_spent_manual_usd: 8000,
        sub_bonus_label: '100,000 Chase UR pts ($2,000 value)',
        sub_deadline: '2026-12-20',
        credits: [
          { id: 'c_cip_1', name: 'Cell Phone Protection ($1,000/claim for crew phones)', total_usd: 150, used_usd: 150 },
          { id: 'c_cip_2', name: 'Primary Rental Car CDW Collision Coverage', total_usd: 200, used_usd: 200 }
        ]
      }
    },
    {
      kind: 'card',
      title: 'Amex Business Platinum®',
      subtitle: '$695 Fee • $400 Dell + $200 Airline + $199 CLEAR + $150 Adobe • 5X Flights',
      category: 'American Express',
      data: {
        name: 'Amex Business Platinum',
        issuer: 'American Express',
        ecosystem: 'Amex Membership Rewards',
        card_style: 'amex-platinum',
        annual_fee: 695,
        renewal_date: '2027-02-15',
        ftf: 'None ($0 Foreign Tx Fee)',
        multipliers: '5x Flights & Prepaid Hotels • 1.5x Camera Gear & Purchases >$5,000',
        best_for: 'International Airfare, High-Ticket Camera Gear & Centurion Lounge Access',
        sub_active: false,
        sub_target_usd: 15000,
        sub_spent_manual_usd: 15000,
        sub_bonus_label: '190,000 Membership Rewards pts',
        sub_deadline: '2026-12-31',
        credits: [
          { id: 'c_abp_1', name: '$400 Dell Technologies Gear Credit ($200 semi-annual)', total_usd: 400, used_usd: 200 },
          { id: 'c_abp_2', name: '$200 Airline Incidentals Credit', total_usd: 200, used_usd: 200 },
          { id: 'c_abp_3', name: '$199 CLEAR Plus Annual Credit', total_usd: 199, used_usd: 199 },
          { id: 'c_abp_4', name: '$150 Adobe Creative Cloud / Premiere Credit', total_usd: 150, used_usd: 150 },
          { id: 'c_abp_5', name: '$120 Wireless Phone Service Credit ($10/mo)', total_usd: 120, used_usd: 100 }
        ],
        bundled_certs: [
          {
            title: 'Amex Global Lounge Collection (Centurion, Delta Sky Club & Priority Pass)',
            type: 'Lounge & Security Perk',
            program: 'Amex Membership Rewards',
            source_card: 'Amex Business Platinum',
            cap_details: '1,400+ Airport Lounges incl. Centurion Lounges & Delta Sky Clubs',
            est_value_usd: 550,
            notes: 'Also grants automatic Hilton Honors Gold & Marriott Bonvoy Gold Elite status.'
          }
        ]
      }
    },
    {
      kind: 'card',
      title: 'Amex Platinum Card® (Personal)',
      subtitle: '$695 Fee • $200 FHR Hotel + $200 Airline + $200 Uber + $240 Digital • 5X Flights',
      category: 'American Express',
      data: {
        name: 'Amex Platinum Card',
        issuer: 'American Express',
        ecosystem: 'Amex Membership Rewards',
        card_style: 'amex-platinum',
        annual_fee: 695,
        renewal_date: '2027-03-15',
        ftf: 'None ($0 Foreign Tx Fee)',
        multipliers: '5x Flights Booked Direct with Airlines • 5x Fine Hotels + Resorts',
        best_for: 'Direct Airline Bookings, Fine Hotels + Resorts Perks & Centurion Lounges',
        sub_active: false,
        sub_target_usd: 8000,
        sub_spent_manual_usd: 8000,
        sub_bonus_label: '150,000 Membership Rewards pts',
        sub_deadline: '2026-12-31',
        credits: [
          { id: 'c_ap_1', name: '$200 Fine Hotels + Resorts / Hotel Collection Credit', total_usd: 200, used_usd: 200 },
          { id: 'c_ap_2', name: '$200 Airline Fee Credit', total_usd: 200, used_usd: 200 },
          { id: 'c_ap_3', name: '$200 Uber Cash ($15/mo + $20 Dec)', total_usd: 200, used_usd: 160 },
          { id: 'c_ap_4', name: '$240 Digital Entertainment Credit ($20/mo)', total_usd: 240, used_usd: 240 },
          { id: 'c_ap_5', name: '$199 CLEAR Plus Credit', total_usd: 199, used_usd: 199 },
          { id: 'c_ap_6', name: '$100 Saks Fifth Avenue Credit ($50 semi-annual)', total_usd: 100, used_usd: 50 }
        ],
        bundled_certs: [
          {
            title: 'Amex Centurion Lounge, Delta Sky Club & Priority Pass Select',
            type: 'Lounge & Security Perk',
            program: 'Amex Membership Rewards',
            source_card: 'Amex Platinum Card',
            cap_details: 'Global Lounge Collection + Hilton Gold & Marriott Gold Status',
            est_value_usd: 550,
            notes: 'FHR bookings include 4pm guaranteed late checkout, breakfast for 2 & $100 property credit.'
          }
        ]
      }
    },
    {
      kind: 'card',
      title: 'Amex Gold Card®',
      subtitle: '$325 Fee • $424 Dining/Uber/Resy/Dunkin Credits • 4X Dining & Groceries',
      category: 'American Express',
      data: {
        name: 'Amex Gold Card',
        issuer: 'American Express',
        ecosystem: 'Amex Membership Rewards',
        card_style: 'amex-gold',
        annual_fee: 325,
        renewal_date: '2027-05-01',
        ftf: 'None ($0 Foreign Tx Fee)',
        multipliers: '4x Worldwide Restaurants • 4x US Supermarkets • 3x Flights Direct',
        best_for: 'Global Restaurants, Crew Craft Meals & Food Shoots',
        sub_active: false,
        sub_target_usd: 6000,
        sub_spent_manual_usd: 6000,
        sub_bonus_label: '90,000 Membership Rewards pts',
        sub_deadline: '2026-12-31',
        credits: [
          { id: 'c_ag_1', name: '$120 Uber Cash ($10/mo Rides or Uber Eats)', total_usd: 120, used_usd: 100 },
          { id: 'c_ag_2', name: '$100 Resy Semi-Annual Dining Credit ($50 Jan-Jun / $50 Jul-Dec)', total_usd: 100, used_usd: 100 },
          { id: 'c_ag_3', name: '$120 Dining Credit ($10/mo Grubhub / Five Guys)', total_usd: 120, used_usd: 90 },
          { id: 'c_ag_4', name: '$84 Dunkin Credit ($7/mo)', total_usd: 84, used_usd: 42 }
        ]
      }
    },
    {
      kind: 'card',
      title: 'Amex Business Gold Card®',
      subtitle: '$375 Fee • $240 FedEx/Grubhub/Office Credit • 4X Top 2 Spend Categories',
      category: 'American Express',
      data: {
        name: 'Amex Business Gold Card',
        issuer: 'American Express',
        ecosystem: 'Amex Membership Rewards',
        card_style: 'amex-gold',
        annual_fee: 375,
        renewal_date: '2027-06-01',
        ftf: 'None ($0 Foreign Tx Fee)',
        multipliers: '4x on Top 2 Categories (Software/Cloud, Ads, Electronics, Dining, Gas, Transit)',
        best_for: '4X Production Software, Camera Electronics & Ad Spend',
        sub_active: false,
        sub_target_usd: 15000,
        sub_spent_manual_usd: 15000,
        sub_bonus_label: '150,000 Membership Rewards pts',
        sub_deadline: '2026-12-31',
        credits: [
          { id: 'c_abg_1', name: '$240 Flexible Business Credit ($20/mo FedEx, Grubhub, Office)', total_usd: 240, used_usd: 180 },
          { id: 'c_abg_2', name: '$155 Walmart+ Monthly Membership Credit', total_usd: 155, used_usd: 155 }
        ]
      }
    },
    {
      kind: 'card',
      title: 'Amex Hilton Honors Aspire®',
      subtitle: '$550 Fee • Automatic Diamond • $400 Resort + $200 Flight + Uncapped Free Night',
      category: 'Hotel',
      data: {
        name: 'Amex Hilton Honors Aspire',
        issuer: 'American Express',
        ecosystem: 'Hilton Honors',
        card_style: 'hilton-aspire',
        auto_status: 'Diamond',
        annual_fee: 550,
        renewal_date: '2027-07-01',
        ftf: 'None ($0 Foreign Tx Fee)',
        multipliers: '14x Hilton Resorts/Hotels (34x w/ Diamond) • 7x Flights/Cars & US Dining • 3x Other',
        best_for: 'Hilton Luxury Stays + Automatic Top-Tier Diamond + Uncapped Free Night',
        sub_active: false,
        sub_target_usd: 6000,
        sub_spent_manual_usd: 6000,
        sub_bonus_label: '175,000 Hilton Honors pts',
        sub_deadline: '2026-12-31',
        credits: [
          { id: 'c_ha_1', name: '$400 Hilton Resort Credit ($200 Jan–Jun / $200 Jul–Dec)', total_usd: 400, used_usd: 200 },
          { id: 'c_ha_2', name: '$200 Flight Credit ($50/quarter on any airline)', total_usd: 200, used_usd: 150 },
          { id: 'c_ha_3', name: '$199 CLEAR Plus Credit', total_usd: 199, used_usd: 199 }
        ],
        bundled_certs: [
          {
            title: 'Hilton Honors Uncapped Free Night Reward',
            type: 'Free Night Certificate',
            program: 'Hilton Honors',
            source_card: 'Amex Hilton Honors Aspire',
            cap_details: 'Uncapped Standard Room — Any Night of the Week Worldwide',
            est_value_usd: 850,
            notes: 'No point cap on Standard Room rewards! Use at Waldorf Astoria, Conrad, or LXR.'
          }
        ]
      }
    },
    {
      kind: 'card',
      title: 'Chase World of Hyatt Card',
      subtitle: '$95 Fee • Annual Cat 1–4 Free Night + 5 Qualifying Nights • 9X at Hyatt',
      category: 'Hotel',
      data: {
        name: 'Chase World of Hyatt Card',
        issuer: 'Chase',
        ecosystem: 'World of Hyatt',
        card_style: 'hyatt',
        auto_status: 'Discoverist',
        annual_fee: 95,
        renewal_date: '2027-04-01',
        ftf: 'None ($0 Foreign Tx Fee)',
        multipliers: '9x Total at Hyatt (4x Card + 5x Base) • 2x Dining, Flights, Transit & Gym',
        best_for: 'Hyatt Stays + 5 Automatic Elite Nights + Cat 1–4 Free Night',
        sub_active: false,
        sub_target_usd: 3000,
        sub_spent_manual_usd: 3000,
        sub_bonus_label: '60,000 World of Hyatt pts',
        sub_deadline: '2026-12-31',
        credits: [
          { id: 'c_woh_1', name: 'Annual Category 1–4 Free Night Certificate (~$320 value)', total_usd: 320, used_usd: 320 },
          { id: 'c_woh_2', name: '5 Tier-Qualifying Night Credits toward Globalist', total_usd: 100, used_usd: 100 }
        ],
        bundled_certs: [
          {
            title: 'World of Hyatt Cat 1–4 Free Night Award',
            type: 'Free Night Certificate',
            program: 'World of Hyatt',
            source_card: 'Chase World of Hyatt Card',
            cap_details: 'Category 1–4 Standard Room (up to 18,000 pts peak)',
            est_value_usd: 320,
            notes: 'Earned automatically every card anniversary year.'
          }
        ]
      }
    },
    {
      kind: 'card',
      title: 'Amex Marriott Bonvoy Brilliant®',
      subtitle: '$650 Fee • Automatic Platinum Elite + 25 Nights • $300 Dining + 85k Free Night',
      category: 'Hotel',
      data: {
        name: 'Amex Marriott Bonvoy Brilliant',
        issuer: 'American Express',
        ecosystem: 'Marriott Bonvoy',
        card_style: 'marriott-brilliant',
        auto_status: 'Platinum Elite',
        annual_fee: 650,
        renewal_date: '2027-05-01',
        ftf: 'None ($0 Foreign Tx Fee)',
        multipliers: '6x Marriott Bonvoy Hotels • 3x Worldwide Restaurants & Direct Flights • 2x All Else',
        best_for: 'Marriott Luxury Stays, Automatic Platinum Breakfast/Lounge & 85k Free Night',
        sub_active: false,
        sub_target_usd: 6000,
        sub_spent_manual_usd: 6000,
        sub_bonus_label: '185,000 Marriott Bonvoy pts',
        sub_deadline: '2026-12-31',
        credits: [
          { id: 'c_mbb_1', name: '$300 Brilliant Dining Credit ($25/mo Worldwide Restaurants)', total_usd: 300, used_usd: 225 },
          { id: 'c_mbb_2', name: '$120 Global Entry / TSA PreCheck Credit', total_usd: 120, used_usd: 120 },
          { id: 'c_mbb_3', name: '25 Automatic Elite Night Credits', total_usd: 200, used_usd: 200 }
        ],
        bundled_certs: [
          {
            title: 'Marriott Bonvoy 85,000-Pt Free Night Award',
            type: 'Free Night Certificate',
            program: 'Marriott Bonvoy',
            source_card: 'Amex Marriott Bonvoy Brilliant',
            cap_details: 'Up to 85k pts + 15k point top-off (100,000 pts max)',
            est_value_usd: 680,
            notes: 'Can top off up to 100k pts for Ritz-Carlton, St. Regis, or EDITION.'
          }
        ]
      }
    },
    {
      kind: 'card',
      title: 'Chase Marriott Bonvoy Boundless®',
      subtitle: '$95 Fee • Annual 35,000-Pt Free Night + 15 Elite Night Credits • 6X Marriott',
      category: 'Hotel',
      data: {
        name: 'Chase Marriott Bonvoy Boundless',
        issuer: 'Chase',
        ecosystem: 'Marriott Bonvoy',
        card_style: 'marriott-brilliant',
        annual_fee: 95,
        renewal_date: '2027-04-01',
        ftf: 'None ($0 Foreign Tx Fee)',
        multipliers: '6x Marriott Hotels (up to 17x total) • 3x Grocery, Gas & Dining (first $6k)',
        best_for: 'Low-Fee 35k Free Night Certificate + 15 Elite Nights',
        sub_active: false,
        sub_target_usd: 3000,
        sub_spent_manual_usd: 3000,
        sub_bonus_label: '3 Free Night Awards (50,000 pts each)',
        sub_deadline: '2026-12-31',
        credits: [
          { id: 'c_mbd_1', name: 'Annual 35,000-Pt Free Night Award (~$260 value)', total_usd: 260, used_usd: 260 }
        ],
        bundled_certs: [
          {
            title: 'Marriott Bonvoy 35,000-Pt Free Night Award',
            type: 'Free Night Certificate',
            program: 'Marriott Bonvoy',
            source_card: 'Chase Marriott Bonvoy Boundless',
            cap_details: 'Up to 35k pts + 15k point top-off (50,000 pts max)',
            est_value_usd: 260,
            notes: 'Great for Autograph Collection, Tribute Portfolio, or airport stays.'
          }
        ]
      }
    },
    {
      kind: 'card',
      title: 'Chase IHG One Rewards Premier',
      subtitle: '$99 Fee • 40k Free Night + 4th Night Free on Awards + $50 United TravelBank',
      category: 'Hotel',
      data: {
        name: 'Chase IHG One Rewards Premier',
        issuer: 'Chase',
        ecosystem: 'IHG One Rewards',
        card_style: 'hyatt',
        auto_status: 'Platinum Elite',
        annual_fee: 99,
        renewal_date: '2027-05-01',
        ftf: 'None ($0 Foreign Tx Fee)',
        multipliers: '10x IHG Hotels (up to 26x total) • 5x Travel, Dining & Gas • 3x All Else',
        best_for: 'IHG 4th Night Free on Award Bookings + Annual 40k Free Night',
        sub_active: false,
        sub_target_usd: 3000,
        sub_spent_manual_usd: 3000,
        sub_bonus_label: '140,000 IHG One Rewards pts',
        sub_deadline: '2026-12-31',
        credits: [
          { id: 'c_ihg_1', name: 'Annual 40,000-Pt Anniversary Free Night', total_usd: 250, used_usd: 250 },
          { id: 'c_ihg_2', name: '$50 United Airlines TravelBank Cash ($25 semi-annual)', total_usd: 50, used_usd: 50 },
          { id: 'c_ihg_3', name: '$120 Global Entry / TSA PreCheck Credit', total_usd: 120, used_usd: 120 }
        ],
        bundled_certs: [
          {
            title: 'IHG One Rewards 40,000-Pt Anniversary Free Night',
            type: 'Free Night Certificate',
            program: 'IHG One Rewards',
            source_card: 'Chase IHG One Rewards Premier',
            cap_details: 'Up to 40,000 pts + unlimited point top-off',
            est_value_usd: 250,
            notes: 'Can top off with IHG points for Kimpton or InterContinental stays.'
          }
        ]
      }
    },
    {
      kind: 'card',
      title: 'Bilt Mastercard®',
      subtitle: '$0 Fee • 1X Rent (No Fee) • 3X Dining • 2X Travel • 2X Rent Day Boost',
      category: 'Other',
      data: {
        name: 'Bilt Mastercard',
        issuer: 'Wells Fargo / Bilt',
        ecosystem: 'Bilt Rewards',
        card_style: 'bilt',
        annual_fee: 0,
        renewal_date: '2027-01-01',
        ftf: 'None ($0 Foreign Tx Fee)',
        multipliers: '3x Dining (6x on 1st) • 2x Travel (4x on 1st) • 1x Rent • Primary Auto CDW',
        best_for: '1st-of-the-Month Double Points (6x Dining / 4x Travel / 2x All) & Hyatt/Alaska Transfers',
        sub_active: false,
        sub_target_usd: 0,
        sub_spent_manual_usd: 0,
        sub_bonus_label: '5X for First 5 Days',
        sub_deadline: '2026-12-31',
        credits: [
          { id: 'c_bilt_1', name: 'Rent Day 2X Point Multiplier (up to 1,000 bonus pts/mo)', total_usd: 200, used_usd: 200 },
          { id: 'c_bilt_2', name: 'Primary Rental Car CDW & $800 Cell Phone Protection', total_usd: 150, used_usd: 150 }
        ]
      }
    },
    {
      kind: 'card',
      title: 'Citi Strata Premier℠',
      subtitle: '$95 Fee • $100 Hotel Benefit • 3X Air, Hotel, Dining, Groceries & Gas',
      category: 'Other',
      data: {
        name: 'Citi Strata Premier',
        issuer: 'Citi',
        ecosystem: 'Citi ThankYou Rewards',
        card_style: 'citi-strata',
        annual_fee: 95,
        renewal_date: '2027-05-01',
        ftf: 'None ($0 Foreign Tx Fee)',
        multipliers: '3x Air Travel, Hotels, Restaurants, Supermarkets, Gas & EV Charging',
        best_for: 'Broad 3X Everyday Travel/Food + 1:1 Transfers to AA, Avios, Flying Blue & Turkish',
        sub_active: false,
        sub_target_usd: 4000,
        sub_spent_manual_usd: 4000,
        sub_bonus_label: '75,000 Citi ThankYou Points',
        sub_deadline: '2026-12-31',
        credits: [
          { id: 'c_csprem_1', name: '$100 Annual Hotel Savings Benefit ($500+ stay)', total_usd: 100, used_usd: 0 }
        ]
      }
    },
    {
      kind: 'card',
      title: 'U.S. Bank Altitude® Reserve',
      subtitle: '$400 Fee • $325 Travel & Dining Credit • 3X Apple Pay / Mobile Wallet (4.5% Travel)',
      category: 'Other',
      data: {
        name: 'U.S. Bank Altitude Reserve',
        issuer: 'U.S. Bank',
        ecosystem: 'U.S. Bank Altitude Rewards',
        card_style: 'venture-x',
        annual_fee: 400,
        renewal_date: '2027-06-01',
        ftf: 'None ($0 Foreign Tx Fee)',
        multipliers: '3x Mobile Wallet (Apple Pay / Google Pay) & Travel • 1.5¢/pt Real-Time Rewards',
        best_for: '4.5% Effective Return on All Apple Pay / Contactless Tap-to-Pay Overseas',
        sub_active: false,
        sub_target_usd: 4500,
        sub_spent_manual_usd: 4500,
        sub_bonus_label: '50,000 Altitude Points ($750 travel value)',
        sub_deadline: '2026-12-31',
        credits: [
          { id: 'c_usb_1', name: '$325 Annual Travel & Dining Credit (Auto-Applied)', total_usd: 325, used_usd: 325 },
          { id: 'c_usb_2', name: '$100 Global Entry / TSA PreCheck Credit', total_usd: 100, used_usd: 100 }
        ]
      }
    },
    {
      kind: 'card',
      title: 'Chase United℠ Explorer Card',
      subtitle: '$150 Fee • Free Checked Bag + 2 United Club Passes + $100 United Hotels + $100 Rideshare',
      category: 'Airline',
      data: {
        name: 'Chase United Explorer Card',
        issuer: 'Chase',
        ecosystem: 'United MileagePlus',
        card_style: 'airline-united',
        annual_fee: 150,
        renewal_date: '2027-04-01',
        ftf: 'None ($0 Foreign Tx Fee)',
        multipliers: '2x United Purchases, Hotels (Direct) & Dining • Expanded XN Saver Award Space',
        best_for: 'United Priority Boarding (Carry-On Camera Bags), Free Checked Bags & XN Award Space',
        sub_active: false,
        sub_target_usd: 3000,
        sub_spent_manual_usd: 3000,
        sub_bonus_label: '60,000 United MileagePlus Miles',
        sub_deadline: '2026-12-31',
        credits: [
          { id: 'c_ua_1', name: '2 United Club One-Time Lounge Passes ($118 value)', total_usd: 118, used_usd: 0 },
          { id: 'c_ua_2', name: '$100 Annual United Hotels Credit ($50 x 2 prepaid stays)', total_usd: 100, used_usd: 0 },
          { id: 'c_ua_3', name: '$100 Annual Rideshare Credit ($8/mo Jan–Nov, $12 Dec)', total_usd: 100, used_usd: 0 },
          { id: 'c_ua_4', name: '$100 Annual Instacart Credit ($10/mo x 2 + 3-mo Instacart+)', total_usd: 100, used_usd: 0 },
          { id: 'c_ua_5', name: '$50 Annual JSX Flight Statement Credit', total_usd: 50, used_usd: 0 },
          { id: 'c_ua_6', name: '$120 Global Entry / TSA PreCheck / NEXUS Credit', total_usd: 120, used_usd: 120 }
        ]
      }
    },
    {
      kind: 'card',
      title: 'Chase United Quest℠ Card',
      subtitle: '$350 Fee • $200 United TravelBank Cash + 10,000-Mile Award Discount + $150 Rideshare + 2 Bags',
      category: 'Airline',
      data: {
        name: 'Chase United Quest Card',
        issuer: 'Chase',
        ecosystem: 'United MileagePlus',
        card_style: 'airline-united',
        annual_fee: 350,
        renewal_date: '2027-04-01',
        ftf: 'None ($0 Foreign Tx Fee)',
        multipliers: '3x United Purchases • 2x All Other Travel, Dining & Select Streaming',
        best_for: 'United Flights, 2 Free Checked Bags, $200 TravelBank Cash & PQP Earning',
        sub_active: false,
        sub_target_usd: 4000,
        sub_spent_manual_usd: 4000,
        sub_bonus_label: '70,000 United Miles + 500 PQP',
        sub_deadline: '2026-12-31',
        credits: [
          { id: 'c_uaq_1', name: '$200 Annual United TravelBank Cash', total_usd: 200, used_usd: 0 },
          { id: 'c_uaq_2', name: '10,000-Mile Anniversary Award Flight Discount (~$135 value)', total_usd: 135, used_usd: 0 },
          { id: 'c_uaq_3', name: '$150 Annual United Hotels Credit ($75 x 2 prepaid stays)', total_usd: 150, used_usd: 0 },
          { id: 'c_uaq_4', name: '$150 Annual Rideshare Credit ($12/mo Jan–Nov, $18 Dec)', total_usd: 150, used_usd: 0 },
          { id: 'c_uaq_5', name: '$180 Annual Instacart Credit ($15/mo)', total_usd: 180, used_usd: 0 },
          { id: 'c_uaq_6', name: '$120 Global Entry / TSA PreCheck / NEXUS Credit', total_usd: 120, used_usd: 120 }
        ]
      }
    },
    {
      kind: 'card',
      title: 'Chase United Club℠ Infinite Card',
      subtitle: '$695 Fee • Full United Club Lounge Membership + 4x United + $200 United Hotels + $150 Rideshare',
      category: 'Airline',
      data: {
        name: 'Chase United Club Infinite Card',
        issuer: 'Chase',
        ecosystem: 'United MileagePlus',
        card_style: 'airline-united',
        annual_fee: 695,
        renewal_date: '2027-04-01',
        ftf: 'None ($0 Foreign Tx Fee)',
        multipliers: '4x United Purchases • 2x All Other Travel & Dining • 1x All Else',
        best_for: 'Unlimited United Club + Star Alliance Lounges, 2 Free Checked Bags & Premier PQP',
        sub_active: false,
        sub_target_usd: 5000,
        sub_spent_manual_usd: 5000,
        sub_bonus_label: '80,000 United MileagePlus Miles',
        sub_deadline: '2026-12-31',
        credits: [
          { id: 'c_uac_1', name: 'Full United Club Membership ($750/yr value)', total_usd: 750, used_usd: 750 },
          { id: 'c_uac_2', name: '$200 Annual United Hotels Credit ($100 x 2 prepaid stays)', total_usd: 200, used_usd: 0 },
          { id: 'c_uac_3', name: '$150 Annual Rideshare Credit ($12/mo Jan–Nov, $18 Dec)', total_usd: 150, used_usd: 0 },
          { id: 'c_uac_4', name: '$240 Annual Instacart Credit ($20/mo)', total_usd: 240, used_usd: 0 },
          { id: 'c_uac_5', name: '$120 Global Entry / TSA PreCheck / NEXUS Credit', total_usd: 120, used_usd: 120 }
        ],
        bundled_certs: [
          {
            title: 'United Club Full Lounge Membership (Cardholder + 2 Guests)',
            type: 'Lounge & Security Perk',
            program: 'United MileagePlus',
            source_card: 'Chase United Club Infinite Card',
            cap_details: 'Unlimited access to 45+ United Clubs & eligible Star Alliance lounges',
            est_value_usd: 750,
            notes: 'Included automatically while United Club Infinite card is open.'
          }
        ]
      }
    },
    {
      kind: 'card',
      title: 'Delta SkyMiles® Reserve Amex',
      subtitle: '$650 Fee • Sky Club Access + First/Main Companion Certificate + $240 Resy + $200 Delta Stays',
      category: 'Airline',
      data: {
        name: 'Delta SkyMiles Reserve Amex',
        issuer: 'American Express',
        ecosystem: 'Delta SkyMiles',
        card_style: 'airline-delta',
        annual_fee: 650,
        renewal_date: '2027-05-01',
        ftf: 'None ($0 Foreign Tx Fee)',
        multipliers: '3x Delta Purchases • $2,500 MQD Headstart + 15% TakeOff 15 Award Discount',
        best_for: 'Delta Sky Club Access, $2,500 MQD Boost & First Class Companion Certificate',
        sub_active: false,
        sub_target_usd: 6000,
        sub_spent_manual_usd: 6000,
        sub_bonus_label: '90,000 Delta SkyMiles',
        sub_deadline: '2026-12-31',
        credits: [
          { id: 'c_dl_1', name: '$240 Resy Dining Credit ($20/mo)', total_usd: 240, used_usd: 160 },
          { id: 'c_dl_2', name: '$200 Delta Stays Annual Hotel Credit', total_usd: 200, used_usd: 200 },
          { id: 'c_dl_3', name: '$120 Rideshare Credit ($10/mo Uber/Lyft)', total_usd: 120, used_usd: 80 }
        ],
        bundled_certs: [
          {
            title: 'Delta SkyMiles Annual Companion Certificate (First, Comfort+ or Main)',
            type: 'Companion Pass',
            program: 'Delta SkyMiles',
            source_card: 'Delta SkyMiles Reserve Amex',
            cap_details: 'Roundtrip Companion Ticket (US, Caribbean, Central America, Hawaii, Alaska)',
            est_value_usd: 650,
            notes: 'Covers First Class, Comfort+, or Main Cabin roundtrip for taxes/fees only.'
          }
        ]
      }
    },
    {
      kind: 'card',
      title: 'Delta SkyMiles® Platinum Amex',
      subtitle: '$350 Fee • Main Cabin Companion Certificate + $150 Delta Stays + $120 Resy + $2,500 MQD Headstart',
      category: 'Airline',
      data: {
        name: 'Delta SkyMiles Platinum Amex',
        issuer: 'American Express',
        ecosystem: 'Delta SkyMiles',
        card_style: 'airline-delta',
        annual_fee: 350,
        renewal_date: '2027-05-01',
        ftf: 'None ($0 Foreign Tx Fee)',
        multipliers: '3x Delta & Direct Hotels • 2x Dining & US Supermarkets • $2,500 MQD Headstart',
        best_for: 'Annual Companion Certificate, $2,500 MQD Boost & 15% TakeOff 15 Award Discount',
        sub_active: false,
        sub_target_usd: 4000,
        sub_spent_manual_usd: 4000,
        sub_bonus_label: '85,000 Delta SkyMiles',
        sub_deadline: '2026-12-31',
        credits: [
          { id: 'c_dlp_1', name: '$150 Annual Delta Stays Hotel Credit', total_usd: 150, used_usd: 0 },
          { id: 'c_dlp_2', name: '$120 Annual Resy Dining Credit ($10/mo)', total_usd: 120, used_usd: 0 },
          { id: 'c_dlp_3', name: '$120 Annual Rideshare Credit ($10/mo Uber/Lyft)', total_usd: 120, used_usd: 0 },
          { id: 'c_dlp_4', name: '$120 Global Entry / TSA PreCheck Credit', total_usd: 120, used_usd: 120 }
        ],
        bundled_certs: [
          {
            title: 'Delta SkyMiles Main Cabin Companion Certificate',
            type: 'Companion Pass',
            program: 'Delta SkyMiles',
            source_card: 'Delta SkyMiles Platinum Amex',
            cap_details: 'Roundtrip Main Cabin Companion Ticket (US, Hawaii, Alaska, Caribbean, Central America)',
            est_value_usd: 420,
            notes: 'Earned every card renewal anniversary.'
          }
        ]
      }
    },
    {
      kind: 'card',
      title: 'Delta SkyMiles® Gold Amex',
      subtitle: '$150 Fee • $100 Delta Stays Credit + $200 Delta Flight Credit (after $10k) + Free Checked Bag',
      category: 'Airline',
      data: {
        name: 'Delta SkyMiles Gold Amex',
        issuer: 'American Express',
        ecosystem: 'Delta SkyMiles',
        card_style: 'airline-delta',
        annual_fee: 150,
        renewal_date: '2027-05-01',
        ftf: 'None ($0 Foreign Tx Fee)',
        multipliers: '2x Delta Purchases, Restaurants Worldwide & US Supermarkets • 15% TakeOff 15 Discount',
        best_for: 'Free First Checked Bag on Delta, 15% Off Award Flights & $100 Delta Stays Credit',
        sub_active: false,
        sub_target_usd: 3000,
        sub_spent_manual_usd: 3000,
        sub_bonus_label: '70,000 Delta SkyMiles',
        sub_deadline: '2026-12-31',
        credits: [
          { id: 'c_dlg_1', name: '$100 Annual Delta Stays Hotel Credit', total_usd: 100, used_usd: 0 },
          { id: 'c_dlg_2', name: '$200 Delta Flight Credit (after $10k calendar yr spend)', total_usd: 200, used_usd: 0 }
        ]
      }
    },
    {
      kind: 'card',
      title: 'Alaska Airlines Visa Signature®',
      subtitle: '$95 Fee • Famous $99 Companion Fare + Free Checked Bags • 3X Alaska',
      category: 'Airline',
      data: {
        name: 'Alaska Airlines Visa Signature',
        issuer: 'Bank of America',
        ecosystem: 'Alaska Mileage Plan',
        card_style: 'airline-alaska',
        annual_fee: 95,
        renewal_date: '2027-06-01',
        ftf: 'None ($0 Foreign Tx Fee)',
        multipliers: '3x Alaska Airlines • 2x Gas, EV Charging, Transit & Local Commuting',
        best_for: 'Alaska Flights, Free Checked Crew Gear Bags & $99 Companion Fare',
        sub_active: false,
        sub_target_usd: 3000,
        sub_spent_manual_usd: 3000,
        sub_bonus_label: '70,000 Alaska Miles + $99 Companion Fare',
        sub_deadline: '2026-12-31',
        credits: [
          { id: 'c_as_1', name: 'Annual $99 Companion Fare Certificate (~$350 value)', total_usd: 350, used_usd: 350 },
          { id: 'c_as_2', name: 'Free Checked Bag for Cardholder + up to 6 Crew Guests', total_usd: 140, used_usd: 140 }
        ],
        bundled_certs: [
          {
            title: 'Alaska Airlines Famous Companion Fare ($99 + tax)',
            type: 'Companion Pass',
            program: 'Alaska Mileage Plan',
            source_card: 'Alaska Airlines Visa Signature',
            cap_details: 'Roundtrip Economy Companion Ticket for $99 + taxes ($23 min)',
            est_value_usd: 350,
            notes: 'Great for West Coast, Hawaii, or Alaska crew flights.'
          }
        ]
      }
    },
    {
      kind: 'card',
      title: 'Citi® / AAdvantage® Platinum Select® Mastercard',
      subtitle: '$99 Fee • Free Checked Bag + Preferred Boarding + $125 AA Flight Discount • 2x AA/Dining/Gas',
      category: 'Airline',
      data: {
        name: 'Citi / AAdvantage Platinum Select',
        issuer: 'Citi',
        ecosystem: 'American Airlines AAdvantage',
        card_style: 'airline-aa',
        annual_fee: 99,
        renewal_date: '2027-06-01',
        ftf: 'None ($0 Foreign Tx Fee)',
        multipliers: '2x American Airlines, Restaurants & Gas Stations • 1 Loyalty Point per $1',
        best_for: 'American Airlines Domestic Checked Bags, Group 5 Boarding & Loyalty Points',
        sub_active: false,
        sub_target_usd: 3500,
        sub_spent_manual_usd: 3500,
        sub_bonus_label: '75,000 American Airlines AAdvantage Miles',
        sub_deadline: '2026-12-31',
        credits: [
          { id: 'c_aa_1', name: '$125 American Airlines Flight Discount (after $20k spend)', total_usd: 125, used_usd: 0 },
          { id: 'c_aa_2', name: 'Free First Checked Bag on Domestic AA Flights (up to 4 guests)', total_usd: 140, used_usd: 140 }
        ]
      }
    },
    {
      kind: 'card',
      title: 'Citi® / AAdvantage® Executive World Elite Mastercard',
      subtitle: '$595 Fee • Full Admirals Club Membership + 4x AA + $120 Avis/Budget + $120 Grubhub + $120 Lyft',
      category: 'Airline',
      data: {
        name: 'Citi / AAdvantage Executive Mastercard',
        issuer: 'Citi',
        ecosystem: 'American Airlines AAdvantage',
        card_style: 'airline-aa',
        annual_fee: 595,
        renewal_date: '2027-06-01',
        ftf: 'None ($0 Foreign Tx Fee)',
        multipliers: '4x American Airlines • 10x Portal Hotels & Rental Cars • 10k Loyalty Point Bonuses',
        best_for: 'Admirals Club Lounge Membership, 4x AA Flights & 20,000 Loyalty Point Boosts',
        sub_active: false,
        sub_target_usd: 7000,
        sub_spent_manual_usd: 7000,
        sub_bonus_label: '70,000 AAdvantage Miles',
        sub_deadline: '2026-12-31',
        credits: [
          { id: 'c_aae_1', name: 'Full Admirals Club® Airport Lounge Membership ($850 value)', total_usd: 850, used_usd: 850 },
          { id: 'c_aae_2', name: '$120 Annual Avis / Budget Car Rental Statement Credit', total_usd: 120, used_usd: 0 },
          { id: 'c_aae_3', name: '$120 Annual Grubhub Dining Statement Credit ($10/mo)', total_usd: 120, used_usd: 0 },
          { id: 'c_aae_4', name: '$120 Annual Lyft Rideshare Credit ($10/mo after 3 rides)', total_usd: 120, used_usd: 0 },
          { id: 'c_aae_5', name: '$120 Global Entry / TSA PreCheck Credit', total_usd: 120, used_usd: 120 }
        ]
      }
    },
    {
      kind: 'card',
      title: 'Southwest Rapid Rewards® Priority Card',
      subtitle: '$149 Fee • $75 Annual Southwest Credit + 7,500 Anniversary Points + 4 Upgraded Boardings',
      category: 'Airline',
      data: {
        name: 'Southwest Rapid Rewards Priority Card',
        issuer: 'Chase',
        ecosystem: 'Southwest Rapid Rewards',
        card_style: 'airline-southwest',
        annual_fee: 149,
        renewal_date: '2027-06-01',
        ftf: 'None ($0 Foreign Tx Fee)',
        multipliers: '3x Southwest Airlines • 2x Local Transit, Rideshare, Internet, Cable & Streaming',
        best_for: 'Southwest Flights, $75 Travel Credit, 7,500 Anniversary Pts & Companion Pass Boost',
        sub_active: false,
        sub_target_usd: 3000,
        sub_spent_manual_usd: 3000,
        sub_bonus_label: '50,000 Southwest Rapid Rewards Points',
        sub_deadline: '2026-12-31',
        credits: [
          { id: 'c_wn_1', name: '$75 Annual Southwest Travel Statement Credit', total_usd: 75, used_usd: 0 },
          { id: 'c_wn_2', name: '7,500 Anniversary Bonus Points (~$105 value)', total_usd: 105, used_usd: 105 },
          { id: 'c_wn_3', name: '4 Upgraded Boardings (A1–A15) per Year', total_usd: 160, used_usd: 0 }
        ]
      }
    },
    {
      kind: 'card',
      title: 'Chase Aeroplan® Card',
      subtitle: '$95 Fee • Automatic Aeroplan 25K Elite Status + 3x Grocery, Dining & Air Canada + Pay Yourself Back',
      category: 'Airline',
      data: {
        name: 'Chase Aeroplan Card',
        issuer: 'Chase',
        ecosystem: 'Air Canada Aeroplan',
        card_style: 'sapphire-preferred',
        annual_fee: 95,
        renewal_date: '2027-06-01',
        ftf: 'None ($0 Foreign Tx Fee)',
        multipliers: '3x Grocery Stores, Dining & Air Canada • 500 Bonus Pts per $2,000 Spent',
        best_for: 'Automatic Aeroplan 25K Status, 10% Transfer Bonus from Chase UR & 3x Groceries/Dining',
        sub_active: false,
        sub_target_usd: 4000,
        sub_spent_manual_usd: 4000,
        sub_bonus_label: '75,000 Aeroplan Points',
        sub_deadline: '2026-12-31',
        auto_status: '25K Elite',
        credits: [
          { id: 'c_ac_1', name: '$120 Global Entry / TSA PreCheck / NEXUS Credit', total_usd: 120, used_usd: 120 },
          { id: 'c_ac_2', name: 'Automatic Aeroplan 25K Elite Status + Free Checked Bag', total_usd: 200, used_usd: 200 }
        ]
      }
    },
    {
      kind: 'card',
      title: 'Amex Hilton Honors Surpass® Card',
      subtitle: '$150 Fee • $200 Annual Hilton Credit ($50/Quarter) + Automatic Gold Status + 12x Hilton',
      category: 'Hotel',
      data: {
        name: 'Amex Hilton Honors Surpass',
        issuer: 'American Express',
        ecosystem: 'Hilton Honors',
        card_style: 'hilton-aspire',
        annual_fee: 150,
        renewal_date: '2027-06-01',
        ftf: 'None ($0 Foreign Tx Fee)',
        multipliers: '12x Hilton Hotels • 6x US Restaurants, US Supermarkets & US Gas • 4x US Online Retail',
        best_for: '$50/Quarter Hilton Property Credit, Automatic Hilton Gold Breakfast & $15k Free Night',
        sub_active: false,
        sub_target_usd: 3000,
        sub_spent_manual_usd: 3000,
        sub_bonus_label: '150,000 Hilton Honors Points',
        sub_deadline: '2026-12-31',
        auto_status: 'Gold',
        credits: [
          { id: 'c_hs_1', name: '$200 Annual Hilton Credit ($50/quarter at any Hilton property)', total_usd: 200, used_usd: 0 },
          { id: 'c_hs_2', name: 'Complimentary Hilton Honors Gold Status (Daily Breakfast / F&B Credit)', total_usd: 250, used_usd: 250 }
        ]
      }
    },
    {
      kind: 'card',
      title: 'Wells Fargo Autograph Journey℠',
      subtitle: '$95 Fee • 5X Hotels + 4X Airlines + 3X Travel & Dining + $50 Annual Airfare Credit',
      category: 'Other',
      data: {
        name: 'Wells Fargo Autograph Journey',
        issuer: 'Wells Fargo',
        ecosystem: 'Choice Privileges',
        card_style: 'citi-strata',
        annual_fee: 95,
        renewal_date: '2027-06-01',
        ftf: 'None ($0 Foreign Tx Fee)',
        multipliers: '5x Hotels (Direct) • 4x Airlines (Direct) • 3x Other Travel & Restaurants',
        best_for: '5x Direct Boutique/Chain Hotels & 4x Direct Flights with $50 Airfare Credit',
        sub_active: false,
        sub_target_usd: 4000,
        sub_spent_manual_usd: 4000,
        sub_bonus_label: '60,000 Autograph Rewards Points',
        sub_deadline: '2026-12-31',
        credits: [
          { id: 'c_wf_1', name: '$50 Annual Airfare Purchase Statement Credit', total_usd: 50, used_usd: 0 }
        ]
      }
    },

    // =========================================================================
    // CRUISE LINE CREDIT CARDS (NCL, ROYAL CARIBBEAN, CELEBRITY, CARNIVAL, PRINCESS, HAL, DISNEY)
    // =========================================================================
    {
      kind: 'card',
      title: 'Norwegian Cruise Line® World Mastercard® (NCL)',
      subtitle: '$0 Fee • 3X NCL Cruises & Onboard Spend • 2X Air & Hotel • WorldPoints Stateroom Credits & Upgrades',
      category: 'Cruise',
      data: {
        name: 'Norwegian Cruise Line World Mastercard',
        issuer: 'Bank of America',
        ecosystem: 'Norwegian Cruise Line (NCL) Latitudes Rewards',
        card_style: 'cruise-ncl',
        annual_fee: 0,
        renewal_date: '2027-06-01',
        ftf: 'None ($0 Foreign Tx Fee)',
        multipliers: '3x Norwegian Cruise Line Purchases • 2x Airfare & Hotels • 1x All Other Purchases',
        best_for: '3x NCL Cruise Fares, Free At Sea Upgrades, Shore Excursions & Onboard Spend',
        sub_active: false,
        sub_target_usd: 1000,
        sub_spent_manual_usd: 1000,
        sub_bonus_label: '20,000 WorldPoints ($200 NCL Onboard Credit / Discount)',
        sub_deadline: '2026-12-31',
        credits: [
          { id: 'c_ncl_1', name: '$100–$300 NCL Onboard Stateroom Credit (WorldPoints Redemption)', total_usd: 200, used_usd: 0 },
          { id: 'c_ncl_2', name: 'NCL Stateroom Upgrade & Specialty Dining Perks', total_usd: 100, used_usd: 0 }
        ]
      }
    },
    {
      kind: 'card',
      title: 'Royal Caribbean® Visa Signature® Card',
      subtitle: '$0 Fee • 2X Royal Caribbean, Celebrity & Silversea • MyCruise Points Onboard Credits & Upgrades',
      category: 'Cruise',
      data: {
        name: 'Royal Caribbean Visa Signature',
        issuer: 'Bank of America',
        ecosystem: 'Royal Caribbean Crown & Anchor Society',
        card_style: 'cruise-royal',
        annual_fee: 0,
        renewal_date: '2027-06-01',
        ftf: 'None ($0 Foreign Tx Fee)',
        multipliers: '2x Royal Caribbean, Celebrity Cruises & Silversea • 1x All Other Purchases',
        best_for: '2x Royal Caribbean Cruise Fares, CocoCay Excursions & Onboard SeaPass Spend',
        sub_active: false,
        sub_target_usd: 1000,
        sub_spent_manual_usd: 1000,
        sub_bonus_label: '10,000–25,000 MyCruise Points ($100–$250 Onboard Credit)',
        sub_deadline: '2026-12-31',
        credits: [
          { id: 'c_rccl_1', name: '$50–$250 Royal Caribbean Onboard Stateroom Credit (MyCruise Points)', total_usd: 150, used_usd: 0 }
        ]
      }
    },
    {
      kind: 'card',
      title: 'Celebrity Cruises® Visa Signature® Card',
      subtitle: '$0 Fee • 2X Celebrity Cruises, Royal Caribbean & Silversea • MyCruise Onboard Credits',
      category: 'Cruise',
      data: {
        name: 'Celebrity Cruises Visa Signature',
        issuer: 'Bank of America',
        ecosystem: "Celebrity Cruises Captain's Club",
        card_style: 'cruise-royal',
        annual_fee: 0,
        renewal_date: '2027-06-01',
        ftf: 'None ($0 Foreign Tx Fee)',
        multipliers: '2x Celebrity Cruises, Royal Caribbean & Silversea • 1x All Other Purchases',
        best_for: '2x Celebrity Cruises, Retreat/AquaClass Bookings & Onboard Spend',
        sub_active: false,
        sub_target_usd: 1000,
        sub_spent_manual_usd: 1000,
        sub_bonus_label: '10,000–25,000 MyCruise Points ($100–$250 Onboard Credit)',
        sub_deadline: '2026-12-31',
        credits: [
          { id: 'c_cel_1', name: '$50–$250 Celebrity Onboard Stateroom Credit (MyCruise Points)', total_usd: 150, used_usd: 0 }
        ]
      }
    },
    {
      kind: 'card',
      title: 'Carnival® World Mastercard®',
      subtitle: '$0 Fee • 2X Carnival & World’s Leading Cruise Lines • 10% Off Shore Excursions',
      category: 'Cruise',
      data: {
        name: 'Carnival World Mastercard',
        issuer: 'Barclays',
        ecosystem: 'Carnival VIFP Club',
        card_style: 'cruise-carnival',
        annual_fee: 0,
        renewal_date: '2027-06-01',
        ftf: 'None ($0 Foreign Tx Fee)',
        multipliers: "2x Carnival, Princess, Holland America, Seabourn & Cunard • 1x All Other Purchases",
        best_for: '2x Carnival Cruise Line Spend + 10% Statement Credit on Pre-Booked Shore Excursions',
        sub_active: false,
        sub_target_usd: 1000,
        sub_spent_manual_usd: 1000,
        sub_bonus_label: '20,000 FunPoints ($200 Cruise Statement Credit)',
        sub_deadline: '2026-12-31',
        credits: [
          { id: 'c_ccl_1', name: '10% Off Pre-Booked Carnival Shore Excursions Statement Credit', total_usd: 75, used_usd: 0 },
          { id: 'c_ccl_2', name: '$100–$200 Onboard Cruise Statement Credit (FunPoints)', total_usd: 150, used_usd: 0 }
        ]
      }
    },
    {
      kind: 'card',
      title: 'Princess Cruises® Rewards Visa® Card',
      subtitle: '$0 Fee • 2X Princess Cruises & World’s Leading Cruise Lines • Onboard Credits & Excursions',
      category: 'Cruise',
      data: {
        name: 'Princess Cruises Rewards Visa',
        issuer: 'Barclays',
        ecosystem: "Princess Captain's Circle",
        card_style: 'cruise-royal',
        annual_fee: 0,
        renewal_date: '2027-06-01',
        ftf: 'None ($0 Foreign Tx Fee)',
        multipliers: "2x Princess Cruises & World's Leading Cruise Lines • 1x All Other Purchases",
        best_for: '2x Princess Cruises, MedallionPay Onboard Purchases & Alaska/World Cruises',
        sub_active: false,
        sub_target_usd: 1000,
        sub_spent_manual_usd: 1000,
        sub_bonus_label: '10,000–20,000 Princess Rewards Points ($100–$200 Value)',
        sub_deadline: '2026-12-31',
        credits: [
          { id: 'c_prn_1', name: '$100–$200 Princess Onboard Stateroom Credit / Cruise Statement Credit', total_usd: 150, used_usd: 0 }
        ]
      }
    },
    {
      kind: 'card',
      title: 'Holland America Line® Rewards Visa® Card',
      subtitle: '$0 Fee • 2X Holland America & World’s Leading Cruise Lines • Onboard Credits',
      category: 'Cruise',
      data: {
        name: 'Holland America Line Rewards Visa',
        issuer: 'Barclays',
        ecosystem: 'Holland America Mariner Society',
        card_style: 'cruise-ncl',
        annual_fee: 0,
        renewal_date: '2027-06-01',
        ftf: 'None ($0 Foreign Tx Fee)',
        multipliers: "2x Holland America Line & World's Leading Cruise Lines • 1x All Other Purchases",
        best_for: '2x Holland America Cruises, Alaska Glacier Sailings & Onboard Spend',
        sub_active: false,
        sub_target_usd: 1000,
        sub_spent_manual_usd: 1000,
        sub_bonus_label: '10,000–20,000 Holland America Rewards Points',
        sub_deadline: '2026-12-31',
        credits: [
          { id: 'c_hal_1', name: '$50–$200 Holland America Onboard Stateroom Credit', total_usd: 100, used_usd: 0 }
        ]
      }
    },
    {
      kind: 'card',
      title: 'Disney® Premier Visa® Card',
      subtitle: '$49 Fee • 5X Disney+/Hulu/ESPN+ • 2X Disney Cruise/Parks, Gas, Grocery & Dining • 10% Onboard Perks',
      category: 'Cruise',
      data: {
        name: 'Disney Premier Visa Card',
        issuer: 'Chase',
        ecosystem: 'Disney Cruise Line Castaway Club',
        card_style: 'sapphire-preferred',
        annual_fee: 49,
        renewal_date: '2027-06-01',
        ftf: '3% Foreign Tx Fee',
        multipliers: '5x Disney+/Hulu/ESPN+ • 2x US Gas, Grocery, Restaurants & Disney Locations • 1x All Else',
        best_for: 'Disney Cruise Line 10% Onboard Merchandise/Castaway Perks & 0% APR 6-Mo Disney Vacation Promo',
        sub_active: false,
        sub_target_usd: 1000,
        sub_spent_manual_usd: 1000,
        sub_bonus_label: '$300 Statement Credit + Disney Rewards Dollars',
        sub_deadline: '2026-12-31',
        credits: [
          { id: 'c_dis_1', name: '10% Off Disney Cruise Line Onboard Merchandise & Select Castaway Cay Packages', total_usd: 75, used_usd: 0 }
        ]
      }
    },

    // =========================================================================
    // LOYALTY PROGRAMS DATABASE (BANK, HOTEL, AIRLINE, CRUISE & RAIL)
    // =========================================================================
    {
      kind: 'program',
      title: 'Capital One Miles',
      subtitle: 'Transferable Bank Points • 1:1 Aeroplan, Flying Blue, Avios, Turkish & Wyndham',
      category: 'Capital One',
      data: {
        name: 'Capital One Miles',
        ecosystem: 'bank',
        status_tier: 'Venture X',
        member_id: '',
        points: 100000,
        cpp: 1.85,
        qualifying_nights: 0,
        target_nights: 0,
        metric_label: '',
        expiration_policy: 'Never expires while card open',
        transfer_partners: 'Aeroplan (1:1), Flying Blue (1:1), British Airways Avios (1:1), Turkish Miles&Smiles (1:1), Singapore KrisFlyer (1:1), Wyndham (1:1)',
        notes: 'Earn 2x everywhere with Venture X + $300 Annual Travel Credit + 10k Anniversary Bonus Miles.'
      }
    },
    {
      kind: 'program',
      title: 'Chase Ultimate Rewards',
      subtitle: 'Transferable Bank Points • 1:1 Instant to World of Hyatt, United, Aeroplan, Avios & Southwest',
      category: 'Chase',
      data: {
        name: 'Chase Ultimate Rewards',
        ecosystem: 'bank',
        status_tier: 'Sapphire Reserve / Preferred',
        member_id: '',
        points: 150000,
        cpp: 2.05,
        qualifying_nights: 0,
        target_nights: 0,
        metric_label: '',
        expiration_policy: 'Never expires while account open',
        transfer_partners: 'World of Hyatt (1:1 Instant), United (1:1), Air Canada Aeroplan (1:1), British Airways Avios (1:1), Flying Blue (1:1), Virgin Atlantic (1:1), Southwest (1:1)',
        notes: 'Top bank currency for 1:1 World of Hyatt luxury hotel redemptions and Star Alliance flights.'
      }
    },
    {
      kind: 'program',
      title: 'Amex Membership Rewards',
      subtitle: 'Transferable Bank Points • 1:1 ANA, Aeroplan, Delta, Flying Blue, Avios & Hilton (1:2)',
      category: 'American Express',
      data: {
        name: 'Amex Membership Rewards',
        ecosystem: 'bank',
        status_tier: 'Platinum / Gold',
        member_id: '',
        points: 150000,
        cpp: 2.0,
        qualifying_nights: 0,
        target_nights: 0,
        metric_label: '',
        expiration_policy: 'Never expires while 1 MR card open',
        transfer_partners: 'ANA (1:1 ~48h), Aeroplan (1:1 Instant), Delta (1:1), Flying Blue (1:1), Avios (1:1), Virgin Atlantic (1:1), Hilton Honors (1:2)',
        notes: 'Premier currency for International Business Class awards (ANA, Aeroplan, Flying Blue, Qatar Avios).'
      }
    },
    {
      kind: 'program',
      title: 'Bilt Rewards',
      subtitle: '1:1 Transfers to World of Hyatt, Alaska Airlines, Aeroplan, United & Avios',
      category: 'Other',
      data: {
        name: 'Bilt Rewards',
        ecosystem: 'bank',
        status_tier: 'Platinum',
        member_id: '',
        points: 85000,
        cpp: 2.1,
        qualifying_nights: 1,
        target_nights: 1,
        metric_label: 'Rent Day 2x Multiplier Active',
        expiration_policy: 'Never expires while account is open',
        transfer_partners: 'World of Hyatt 1:1, Alaska Airlines 1:1, Aeroplan 1:1, United 1:1, Flying Blue 1:1, Avios 1:1',
        notes: 'Earn points on rent + double points on the 1st of every month.'
      }
    },
    {
      kind: 'program',
      title: 'Citi ThankYou Rewards',
      subtitle: '1:1 Transfers to American Airlines, Turkish, Qatar Avios, Flying Blue & Leading Hotels (1:0.2)',
      category: 'Other',
      data: {
        name: 'Citi ThankYou Rewards',
        ecosystem: 'bank',
        status_tier: 'Strata Premier',
        member_id: '',
        points: 90000,
        cpp: 1.85,
        qualifying_nights: 0,
        target_nights: 0,
        metric_label: '',
        expiration_policy: 'Never expires while card open',
        transfer_partners: 'Turkish Miles&Smiles (1:1), Qatar/BA Avios (1:1), EVA Air (1:1), Flying Blue (1:1), Choice Privileges (1:2), Wyndham (1:1)',
        notes: 'Unique 1:2 transfer to Choice Privileges (great for Nordic & Japanese hotels) + Turkish & Avios.'
      }
    },
    {
      kind: 'program',
      title: 'U.S. Bank Altitude Rewards',
      subtitle: '1.5¢/pt Real-Time Rewards on Any Airline, Hotel, Car Rental or Uber',
      category: 'Other',
      data: {
        name: 'U.S. Bank Altitude Rewards',
        ecosystem: 'bank',
        status_tier: 'Altitude Reserve',
        member_id: '',
        points: 60000,
        cpp: 1.5,
        qualifying_nights: 0,
        target_nights: 0,
        metric_label: '',
        expiration_policy: 'Never expires',
        transfer_partners: '1.5¢/pt instant SMS text redemption on any travel purchase',
        notes: 'Book direct with any airline or boutique hotel and reply REDEEM via text for 1.5¢/pt.'
      }
    },
    {
      kind: 'program',
      title: 'World of Hyatt',
      subtitle: 'Hotel Loyalty • Highest Point Valuation (2.1¢+) • Globalist Suite Upgrades & Free Breakfast',
      category: 'Hotel',
      data: {
        name: 'World of Hyatt',
        ecosystem: 'hotel',
        status_tier: 'Globalist',
        member_id: '',
        points: 120000,
        cpp: 2.1,
        qualifying_nights: 35,
        target_nights: 60,
        metric_label: 'Qualifying Nights toward Globalist',
        expiration_policy: '24 months inactivity',
        transfer_partners: 'Receive 1:1 Instant from Chase Ultimate Rewards & Bilt Rewards',
        notes: 'Waived resort fees on all award stays, 4pm late checkout, free Globalist breakfast & Suite Upgrade Awards.'
      }
    },
    {
      kind: 'program',
      title: 'Hilton Honors',
      subtitle: 'Hotel Loyalty • 5th Night Free on Award Stays • Waldorf Astoria, Conrad & LXR',
      category: 'Hotel',
      data: {
        name: 'Hilton Honors',
        ecosystem: 'hotel',
        status_tier: 'Diamond',
        member_id: '',
        points: 220000,
        cpp: 0.55,
        qualifying_nights: 28,
        target_nights: 60,
        metric_label: 'Nights (Auto-Diamond via Aspire)',
        expiration_policy: '24 months inactivity',
        transfer_partners: 'Amex MR transfers 1:2 (up to 1:2.6 with bonus) • 5th Night Free on points',
        notes: 'Automatic top-tier Diamond status + $400 Resort Credit + Uncapped Free Night via Hilton Aspire card.'
      }
    },
    {
      kind: 'program',
      title: 'Marriott Bonvoy',
      subtitle: 'Hotel Loyalty • 8,500+ Hotels Worldwide • 5th Night Free on Award Stays',
      category: 'Hotel',
      data: {
        name: 'Marriott Bonvoy',
        ecosystem: 'hotel',
        status_tier: 'Platinum Elite',
        member_id: '',
        points: 180000,
        cpp: 0.85,
        qualifying_nights: 40,
        target_nights: 50,
        metric_label: 'Elite Nights',
        expiration_policy: '24 months inactivity',
        transfer_partners: 'Chase UR 1:1, Amex MR 1:1, Bilt 1:1 • Transfers 3:1 to 35+ airlines',
        notes: 'Stacks 25 nights (Brilliant) + 15 nights (Business card) = 40 automatic Elite Nights/yr.'
      }
    },
    {
      kind: 'program',
      title: 'IHG One Rewards',
      subtitle: 'Hotel Loyalty • 4th Night Free on Award Stays • Kimpton & InterContinental',
      category: 'Hotel',
      data: {
        name: 'IHG One Rewards',
        ecosystem: 'hotel',
        status_tier: 'Diamond Elite',
        member_id: '',
        points: 165000,
        cpp: 0.65,
        qualifying_nights: 44,
        target_nights: 70,
        metric_label: 'Qualifying Nights',
        expiration_policy: 'Never expires with Elite status',
        transfer_partners: 'Chase Ultimate Rewards 1:1, Bilt 1:1 (Best bought on 100% bonus sales)',
        notes: '4th Night Free on all point redemptions with IHG One Rewards Premier card.'
      }
    },
    {
      kind: 'program',
      title: 'United MileagePlus',
      subtitle: 'Star Alliance • Instant 1:1 from Chase UR & Bilt • Excursionist Perk',
      category: 'Airline',
      data: {
        name: 'United MileagePlus',
        ecosystem: 'airline',
        status_tier: 'Premier Gold',
        member_id: '',
        points: 110000,
        cpp: 1.35,
        qualifying_nights: 8000,
        target_nights: 10000,
        metric_label: 'PQP toward Next Premier Tier',
        expiration_policy: 'Miles never expire',
        transfer_partners: 'Star Alliance • Instant 1:1 from Chase UR & Bilt',
        notes: 'No change/cancellation fees on award flights + Excursionist Perk free one-way flight.'
      }
    },
    {
      kind: 'program',
      title: 'Air Canada Aeroplan',
      subtitle: 'Star Alliance + Emirates/Etihad/Oman Air • 5,000-Pt International Stopovers',
      category: 'Airline',
      data: {
        name: 'Air Canada Aeroplan',
        ecosystem: 'airline',
        status_tier: '50K Elite (Star Gold)',
        member_id: '',
        points: 115000,
        cpp: 1.65,
        qualifying_nights: 25,
        target_nights: 50,
        metric_label: 'Status Qualifying Segments',
        expiration_policy: '18 months inactivity',
        transfer_partners: '1:1 Instant from Amex MR, Chase UR, Capital One Miles & Bilt',
        notes: 'Add a multi-day stopover on any international one-way award for just 5,000 points!'
      }
    },
    {
      kind: 'program',
      title: 'Delta SkyMiles',
      subtitle: 'SkyTeam Alliance • 1:1 Instant from Amex MR • 15% Off Awards with Delta Amex',
      category: 'Airline',
      data: {
        name: 'Delta SkyMiles',
        ecosystem: 'airline',
        status_tier: 'Gold Medallion',
        member_id: '',
        points: 95000,
        cpp: 1.25,
        qualifying_nights: 7500,
        target_nights: 10000,
        metric_label: 'MQDs (Medallion Qualification Dollars)',
        expiration_policy: 'Miles never expire',
        transfer_partners: 'SkyTeam • 1:1 Instant from Amex Membership Rewards',
        notes: 'TakeOff 15 gives 15% discount on all Delta-operated award flights when holding a Delta Amex.'
      }
    },
    {
      kind: 'program',
      title: 'Alaska Mileage Plan',
      subtitle: 'Oneworld Alliance • 1:1 from Bilt + Hawaiian Airlines Merger • Free Stopovers',
      category: 'Airline',
      data: {
        name: 'Alaska Mileage Plan',
        ecosystem: 'airline',
        status_tier: 'MVP Gold (Oneworld Sapphire)',
        member_id: '',
        points: 85000,
        cpp: 1.75,
        qualifying_nights: 28000,
        target_nights: 40000,
        metric_label: 'Elite Qualifying Miles (EQMs)',
        expiration_policy: 'Miles never expire (active account)',
        transfer_partners: 'Oneworld + Starlux • 1:1 from Bilt Rewards & HawaiianMiles',
        notes: 'Sweet spots on Japan Airlines (JAL), Cathay Pacific, Starlux, and American Airlines.'
      }
    },
    {
      kind: 'program',
      title: 'American Airlines AAdvantage',
      subtitle: 'Oneworld Alliance • 60k–70k Business Class to Japan/Europe/Middle East',
      category: 'Airline',
      data: {
        name: 'American Airlines AAdvantage',
        ecosystem: 'airline',
        status_tier: 'Platinum Pro (Oneworld Emerald)',
        member_id: '',
        points: 105000,
        cpp: 1.7,
        qualifying_nights: 90000,
        target_nights: 125000,
        metric_label: 'Loyalty Points',
        expiration_policy: '24 months inactivity (no expiry with AA credit card)',
        transfer_partners: 'Oneworld • Earn via AA Cards, SimplyMiles & AAdvantage Hotels',
        notes: '60k JAL Business / 80k JAL First Class to Tokyo & 70k Qatar Qsuites to Doha.'
      }
    },
    {
      kind: 'program',
      title: 'British Airways / Qatar Avios',
      subtitle: 'Oneworld Alliance • Qatar Qsuites & JAL Domestic Sweet Spots',
      category: 'Airline',
      data: {
        name: 'British Airways / Qatar Avios',
        ecosystem: 'airline',
        status_tier: 'Oneworld Emerald',
        member_id: '',
        points: 120000,
        cpp: 1.5,
        qualifying_nights: 600,
        target_nights: 600,
        metric_label: 'Tier Points',
        expiration_policy: '36 months without activity',
        transfer_partners: '1:1 from Chase UR, Amex MR, Capital One, Bilt & Citi ThankYou',
        notes: 'Link BA, Qatar, Iberia, and Finnair accounts for instant 1:1 Avios movement.'
      }
    },
    {
      kind: 'program',
      title: 'Air France / KLM Flying Blue',
      subtitle: 'SkyTeam Alliance • Monthly 25%–50% Promo Rewards to Europe',
      category: 'Airline',
      data: {
        name: 'Air France / KLM Flying Blue',
        ecosystem: 'airline',
        status_tier: 'Gold (SkyTeam Elite Plus)',
        member_id: '',
        points: 95000,
        cpp: 1.45,
        qualifying_nights: 180,
        target_nights: 180,
        metric_label: 'XP (Experience Points)',
        expiration_policy: '24 months without eligible activity',
        transfer_partners: '1:1 from Chase, Amex, Capital One, Bilt & Citi',
        notes: 'Free stopovers on award tickets + 50,000-pt Business Class Promo Rewards.'
      }
    },
    {
      kind: 'program',
      title: 'ANA Mileage Club',
      subtitle: 'Star Alliance • 105k–110k Roundtrip Business Class ("The Room") to Tokyo',
      category: 'Airline',
      data: {
        name: 'ANA Mileage Club',
        ecosystem: 'airline',
        status_tier: 'Bronze',
        member_id: '',
        points: 95000,
        cpp: 1.9,
        qualifying_nights: 0,
        target_nights: 0,
        metric_label: '',
        expiration_policy: 'Hard 36-month expiration from transfer',
        transfer_partners: 'Star Alliance • 1:1 from Amex MR (~48 hrs)',
        notes: 'Sweet spot: US to Tokyo roundtrip in "The Room" Business Class for 105k–110k miles.'
      }
    },
    {
      kind: 'program',
      title: 'Southwest Rapid Rewards',
      subtitle: 'Airline Loyalty • Companion Pass (135k pts) + 2 Free Checked Bags • 1:1 from Chase UR & Bilt',
      category: 'Airline',
      data: {
        name: 'Southwest Rapid Rewards',
        ecosystem: 'airline',
        status_tier: 'A-List / Companion Pass',
        member_id: '',
        points: 85000,
        cpp: 1.4,
        qualifying_nights: 75000,
        target_nights: 135000,
        metric_label: 'Companion Pass Qualifying Points',
        expiration_policy: 'Points never expire',
        transfer_partners: '1:1 Instant from Chase Ultimate Rewards & Bilt Rewards',
        notes: 'Earn 135,000 qualifying points in a calendar year to unlock the Southwest Companion Pass for up to 2 years!'
      }
    },
    {
      kind: 'program',
      title: 'JetBlue TrueBlue',
      subtitle: 'Airline Loyalty • Mint Business Class Suites + Mosaic Perks • 1:1 from Chase UR',
      category: 'Airline',
      data: {
        name: 'JetBlue TrueBlue',
        ecosystem: 'airline',
        status_tier: 'Mosaic 1',
        member_id: '',
        points: 60000,
        cpp: 1.35,
        qualifying_nights: 25,
        target_nights: 50,
        metric_label: 'Mosaic Tiles',
        expiration_policy: 'Points never expire',
        transfer_partners: '1:1 from Chase Ultimate Rewards • 2.5:2 from Amex MR & Citi',
        notes: 'Points pooling with family + Mint lie-flat suites to Europe and cross-country.'
      }
    },
    {
      kind: 'program',
      title: 'Singapore Airlines KrisFlyer',
      subtitle: 'Star Alliance • Suites & Long-Haul Business Class • 1:1 from Chase, Amex, CapOne & Citi',
      category: 'Airline',
      data: {
        name: 'Singapore Airlines KrisFlyer',
        ecosystem: 'airline',
        status_tier: 'KrisFlyer Elite Gold',
        member_id: '',
        points: 110000,
        cpp: 1.65,
        qualifying_nights: 0,
        target_nights: 50000,
        metric_label: 'Elite Miles',
        expiration_policy: 'Hard 36-month expiration from earning/transfer',
        transfer_partners: 'Star Alliance • 1:1 from Chase UR, Amex MR, Capital One Miles & Citi ThankYou',
        notes: 'Best access to Singapore Airlines Business Class & First Suites + monthly Spontaneous Escapes 30% off.'
      }
    },
    {
      kind: 'program',
      title: 'Virgin Atlantic Flying Club',
      subtitle: 'SkyTeam • ANA First/Business Sweet Spots + 30%–40% Bank Transfer Bonuses',
      category: 'Airline',
      data: {
        name: 'Virgin Atlantic Flying Club',
        ecosystem: 'airline',
        status_tier: 'Red / Silver',
        member_id: '',
        points: 90000,
        cpp: 1.75,
        qualifying_nights: 0,
        target_nights: 400,
        metric_label: 'Tier Points',
        expiration_policy: 'Points never expire',
        transfer_partners: 'SkyTeam + ANA • 1:1 from Chase UR, Amex MR, Capital One, Bilt & Citi',
        notes: 'Frequent 30%–40% transfer bonuses from Chase, Amex, Capital One & Citi.'
      }
    },
    {
      kind: 'program',
      title: 'Wyndham Rewards',
      subtitle: 'Hotel & Vacation Rental Loyalty • 9,000+ Hotels + Vacasa Rentals • 1:1 from Capital One & Citi',
      category: 'Hotel',
      data: {
        name: 'Wyndham Rewards',
        ecosystem: 'hotel',
        status_tier: 'Diamond',
        member_id: '',
        points: 75000,
        cpp: 1.1,
        qualifying_nights: 20,
        target_nights: 40,
        metric_label: 'Qualifying Nights',
        expiration_policy: '18 months inactivity (4-yr hard expiry)',
        transfer_partners: '1:1 from Capital One Miles & Citi ThankYou Rewards',
        notes: '7,500 / 15,000 / 30,000 flat award chart + 10% Go Free discount with Wyndham Earner card.'
      }
    },
    {
      kind: 'program',
      title: 'Choice Privileges',
      subtitle: 'Hotel Loyalty • 1:2 Transfer Ratio from Citi ThankYou • Preferred Hotels & Nordic Sweet Spots',
      category: 'Hotel',
      data: {
        name: 'Choice Privileges',
        ecosystem: 'hotel',
        status_tier: 'Diamond',
        member_id: '',
        points: 80000,
        cpp: 0.85,
        qualifying_nights: 20,
        target_nights: 40,
        metric_label: 'Qualifying Nights',
        expiration_policy: '18 months inactivity',
        transfer_partners: '1:2 from Citi ThankYou & Wells Fargo • 1:1 from Amex MR & Capital One',
        notes: 'Huge value in Scandinavia (Clarion/Nordic Choice), Japan, and Preferred Hotels & Resorts.'
      }
    },

    // =========================================================================
    // CRUISE LINE & RAIL LOYALTY PROGRAMS (NCL, ROYAL, CELEBRITY, CARNIVAL, PRINCESS, HAL, DISNEY, VIRGIN, MSC, AMTRAK)
    // =========================================================================
    {
      kind: 'program',
      title: 'Norwegian Cruise Line (NCL) Latitudes Rewards',
      subtitle: 'Cruise Loyalty • 7 Tiers (Bronze → Platinum → Sapphire → Diamond → Ambassador) • Specialty Dining & Laundry',
      category: 'Cruise',
      data: {
        name: 'Norwegian Cruise Line (NCL) Latitudes Rewards',
        ecosystem: 'other',
        status_tier: 'Platinum',
        member_id: '',
        points: 75,
        cpp: 1.0,
        qualifying_nights: 75,
        target_nights: 150,
        metric_label: 'Latitudes Points (1 pt/night + bonus suite/insider pts)',
        expiration_policy: 'Latitudes Points never expire',
        transfer_partners: 'Pairs with NCL Norwegian Cruise Line World Mastercard (3x NCL)',
        notes: 'Platinum (75+ pts): 2 Free Specialty Dinners for 2 (with bottle of wine), Free Bag of Laundry, Priority Embarkation & 10% Shore Excursion Discount.'
      }
    },
    {
      kind: 'program',
      title: 'Royal Caribbean Crown & Anchor Society',
      subtitle: 'Cruise Loyalty • Gold → Platinum → Emerald → Diamond → Diamond Plus → Pinnacle • 4–6 Free Daily Drinks',
      category: 'Cruise',
      data: {
        name: 'Royal Caribbean Crown & Anchor Society',
        ecosystem: 'other',
        status_tier: 'Diamond',
        member_id: '',
        points: 80,
        cpp: 1.0,
        qualifying_nights: 80,
        target_nights: 175,
        metric_label: 'Cruise Points (1 pt/night, 2 pts/suite or solo)',
        expiration_policy: 'Cruise Points never expire',
        transfer_partners: 'Status Match 1:1 across Royal Caribbean, Celebrity Cruises & Silversea!',
        notes: 'Diamond (80+ pts): 4 Free Daily Alcoholic/Specialty Drink Vouchers ($60/day value), Crown Lounge Access, Free Photo & Wi-Fi Discount.'
      }
    },
    {
      kind: 'program',
      title: "Celebrity Cruises Captain's Club",
      subtitle: 'Cruise Loyalty • Classic → Select → Elite → Elite Plus → Zenith • Reciprocal Status Match w/ Royal Caribbean',
      category: 'Cruise',
      data: {
        name: "Celebrity Cruises Captain's Club",
        ecosystem: 'other',
        status_tier: 'Elite',
        member_id: '',
        points: 300,
        cpp: 1.0,
        qualifying_nights: 300,
        target_nights: 750,
        metric_label: 'Club Points (2–18 pts/night by stateroom)',
        expiration_policy: 'Club Points never expire',
        transfer_partners: 'Reciprocal tier status match with Royal Caribbean Crown & Anchor & Silversea Venetian Society',
        notes: 'Elite (300+ pts): Daily Elite Happy Hour (5–7pm complimentary cocktails), Free Laundry Bag, Priority Tender & Wi-Fi/Spa Discounts.'
      }
    },
    {
      kind: 'program',
      title: 'Carnival VIFP Club (Very Important Fun Person)',
      subtitle: 'Cruise Loyalty • Red → Gold → Platinum (75 days) → Diamond (200 days) • Priority Boarding & Laundry',
      category: 'Cruise',
      data: {
        name: 'Carnival VIFP Club',
        ecosystem: 'other',
        status_tier: 'Platinum',
        member_id: '',
        points: 75,
        cpp: 1.0,
        qualifying_nights: 75,
        target_nights: 200,
        metric_label: 'VIFP Points (1 pt per cruise day sailed)',
        expiration_policy: 'VIFP Points never expire',
        transfer_partners: 'Pairs with Carnival World Mastercard (2x Carnival + 10% off Shore Excursions)',
        notes: 'Platinum (75+ days): Priority Check-In & Boarding, Complimentary Wash & Fold Laundry, Priority Main Dining & VIFP Party.'
      }
    },
    {
      kind: 'program',
      title: "Princess Captain's Circle",
      subtitle: 'Cruise Loyalty • Gold → Ruby → Platinum (5 cruises/50 days) → Elite (15 cruises/150 days)',
      category: 'Cruise',
      data: {
        name: "Princess Captain's Circle",
        ecosystem: 'other',
        status_tier: 'Platinum',
        member_id: '',
        points: 50,
        cpp: 1.0,
        qualifying_nights: 50,
        target_nights: 150,
        metric_label: 'Cruise Days (or 15 Cruise Credits toward Elite)',
        expiration_policy: 'Cruise Days never expire',
        transfer_partners: 'Pairs with Princess Cruises Rewards Visa Card (2x Princess)',
        notes: 'Platinum: 50% off MedallionNet Wi-Fi packages. Elite: Complimentary Mini-Bar setup, Free Laundry & 10% off Shore Excursions.'
      }
    },
    {
      kind: 'program',
      title: 'Holland America Mariner Society',
      subtitle: 'Cruise Loyalty • 1-Star → 2-Star → 3-Star → 4-Star → 5-Star Mariner • Specialty Dining & Wine Discounts',
      category: 'Cruise',
      data: {
        name: 'Holland America Mariner Society',
        ecosystem: 'other',
        status_tier: '4-Star Mariner',
        member_id: '',
        points: 200,
        cpp: 1.0,
        qualifying_nights: 200,
        target_nights: 500,
        metric_label: 'Cruise Day Credits (1 per day + onboard spend bonus)',
        expiration_policy: 'Credits never expire',
        transfer_partners: 'Pairs with Holland America Line Rewards Visa Card',
        notes: '4-Star Mariner: Complimentary Laundry & Pressing, Priority Boarding/Tendering, 50% off Specialty Restaurants & Wine Packages.'
      }
    },
    {
      kind: 'program',
      title: 'Disney Cruise Line Castaway Club',
      subtitle: 'Cruise Loyalty • Silver (1+) → Gold (5+) → Platinum (10+) → Pearl (25+ Sailings) • Palo Dinner & Early Booking',
      category: 'Cruise',
      data: {
        name: 'Disney Cruise Line Castaway Club',
        ecosystem: 'other',
        status_tier: 'Gold Castaway',
        member_id: '',
        points: 5,
        cpp: 1.0,
        qualifying_nights: 5,
        target_nights: 10,
        metric_label: 'Completed Disney Cruises (10 for Platinum)',
        expiration_policy: 'Status valid for 5 years from last sailing',
        transfer_partners: 'Pairs with Chase Disney Premier Visa Card (10% onboard perks)',
        notes: 'Early itinerary & excursion booking window, Welcome Back stateroom gift, 10% merchandise discount, and complimentary Palo dining at Platinum/Pearl.'
      }
    },
    {
      kind: 'program',
      title: 'Virgin Voyages Sailing Club',
      subtitle: 'Cruise Loyalty • Sailor → Sea-Blazer → Sea-Rover (Blue Extras / Deep Blue Extras: $100 Bar Tab & Premium Wi-Fi)',
      category: 'Cruise',
      data: {
        name: 'Virgin Voyages Sailing Club',
        ecosystem: 'other',
        status_tier: 'Sea-Rover (Deep Blue Extras)',
        member_id: '',
        points: 4,
        cpp: 1.0,
        qualifying_nights: 4,
        target_nights: 5,
        metric_label: 'Qualifying Voyages',
        expiration_policy: 'Valid for 2–3 years from qualifying voyage',
        transfer_partners: 'Bookable with Virgin Red / Virgin Atlantic Points during cruise promos',
        notes: 'Deep Blue Extras: $100 Bonus Bar Tab, Unlimited Premium Wi-Fi, $10/day Specialty Coffee Credit, Free Laundry & Expedited Boarding.'
      }
    },
    {
      kind: 'program',
      title: 'MSC Voyagers Club',
      subtitle: 'Cruise Loyalty • Silver → Gold → Diamond → Blue Diamond • Famous Hotel/Cruise Status Match!',
      category: 'Cruise',
      data: {
        name: 'MSC Voyagers Club',
        ecosystem: 'other',
        status_tier: 'Diamond',
        member_id: '',
        points: 10000,
        cpp: 1.0,
        qualifying_nights: 10000,
        target_nights: 25000,
        metric_label: 'Voyagers Club Points',
        expiration_policy: '5 years inactivity',
        transfer_partners: 'Status Match from Hilton Diamond, Hyatt Globalist, Marriott Platinum, NCL & Royal Caribbean',
        notes: '5% + 5% Voyagers Exclusives cruise fare discount, Priority Embarkation, Specialty Restaurant Tasting Menu & Thermal Area Spa session.'
      }
    },
    {
      kind: 'program',
      title: 'Amtrak Guest Rewards',
      subtitle: 'Rail Loyalty • Select → Select Plus → Select Executive • High-Value ~2.5¢/pt Acela & Sleeper Roomettes',
      category: 'Other',
      data: {
        name: 'Amtrak Guest Rewards',
        ecosystem: 'other',
        status_tier: 'Select Plus',
        member_id: '',
        points: 35000,
        cpp: 2.5,
        qualifying_nights: 5000,
        target_nights: 10000,
        metric_label: 'Tier Qualifying Points (TQPs)',
        expiration_policy: '24 months inactivity',
        transfer_partners: 'Amtrak Guest Rewards Preferred Mastercard',
        notes: 'Fixed-value ~2.5¢–2.67¢/pt redemptions on Northeast Corridor Acela, First Class Upgrades, and Cross-Country Sleeper Roomettes + Metropolitan Lounge access.'
      }
    }
  ];

  // =========================================================================
  // CERTIFICATES & PERKS DATABASE (FOR INSTANT LOOKUP IN CERT MODAL)
  // =========================================================================
  const POPULAR_CERT_TEMPLATES = [
    {
      title: 'World of Hyatt Cat 1–4 Free Night Award',
      type: 'Free Night Certificate',
      program: 'World of Hyatt',
      source_card: 'Chase World of Hyatt Card',
      cap_details: 'Category 1–4 Standard Room (up to 18,000 pts peak)',
      est_value_usd: 320,
      notes: 'Annual cardholder free night certificate.'
    },
    {
      title: 'World of Hyatt Cat 1–7 Free Night Award',
      type: 'Free Night Certificate',
      program: 'World of Hyatt',
      source_card: '60-Night Globalist Milestone',
      cap_details: 'Category 1–7 Standard Room (up to 35,000 pts peak)',
      est_value_usd: 780,
      notes: 'Save for Park Hyatt Kyoto, Andaz Tokyo, or Alila Ventana Big Sur.'
    },
    {
      title: 'Hyatt Suite Upgrade Award (SUA — Up to 7 Nights)',
      type: 'Suite / Flight Upgrade',
      program: 'World of Hyatt',
      source_card: '50/60-Night Milestone Reward',
      cap_details: 'Confirm a Standard Suite at time of booking for up to 7 nights',
      est_value_usd: 900,
      notes: 'Locks in a confirmed suite months before the shoot.'
    },
    {
      title: 'Hilton Honors Uncapped Free Night Reward',
      type: 'Free Night Certificate',
      program: 'Hilton Honors',
      source_card: 'Amex Hilton Honors Aspire',
      cap_details: 'Uncapped Standard Room — Any Night of the Week Worldwide',
      est_value_usd: 850,
      notes: 'No point cap on Standard Room rewards! Use at Waldorf Astoria, Conrad, or Roku Kyoto LXR.'
    },
    {
      title: 'Marriott Bonvoy 85,000-Pt Free Night Award',
      type: 'Free Night Certificate',
      program: 'Marriott Bonvoy',
      source_card: 'Amex Marriott Bonvoy Brilliant',
      cap_details: 'Up to 85k pts + 15k point top-off (100,000 pts max)',
      est_value_usd: 680,
      notes: 'Can top off up to 100k pts for Ritz-Carlton or EDITION.'
    },
    {
      title: 'Marriott Bonvoy 35,000-Pt Free Night Award',
      type: 'Free Night Certificate',
      program: 'Marriott Bonvoy',
      source_card: 'Chase Marriott Boundless / Amex Business',
      cap_details: 'Up to 35k pts + 15k point top-off (50,000 pts max)',
      est_value_usd: 260,
      notes: 'Good for 40k–50k Autograph Collection or airport stays.'
    },
    {
      title: 'IHG One Rewards 40,000-Pt Anniversary Free Night',
      type: 'Free Night Certificate',
      program: 'IHG One Rewards',
      source_card: 'Chase IHG One Rewards Premier',
      cap_details: 'Up to 40,000 pts + unlimited point top-off',
      est_value_usd: 250,
      notes: 'Can top off with IHG points for Kimpton or InterContinental stays.'
    },
    {
      title: 'Alaska Airlines Famous Companion Fare ($99 + tax)',
      type: 'Companion Pass',
      program: 'Alaska Mileage Plan',
      source_card: 'Alaska Airlines Visa Signature',
      cap_details: 'Roundtrip Economy Companion Ticket for $99 + taxes ($23 min)',
      est_value_usd: 350,
      notes: 'Great for West Coast, Hawaii, or Alaska crew flights.'
    },
    {
      title: 'Delta SkyMiles Annual Companion Certificate',
      type: 'Companion Pass',
      program: 'Delta SkyMiles',
      source_card: 'Delta SkyMiles Reserve / Platinum Amex',
      cap_details: 'Roundtrip Companion Ticket (US, Caribbean, Central America, Hawaii)',
      est_value_usd: 650,
      notes: 'Pay only taxes & fees ($80 max) for second passenger.'
    },
    {
      title: 'Southwest Companion Pass (Unlimited BOGO Flights)',
      type: 'Companion Pass',
      program: 'Southwest Rapid Rewards',
      source_card: '135,000 Companion Pass Qualifying Points',
      cap_details: 'Companion flies free (+ $5.60 tax) on unlimited cash or point flights',
      est_value_usd: 1500,
      notes: 'Valid for the remainder of the year earned + the entire following calendar year!'
    },
    {
      title: '2 United Club One-Time Lounge Passes',
      type: 'Lounge & Security Perk',
      program: 'United MileagePlus',
      source_card: 'Chase United Explorer Card',
      cap_details: '2 One-Time United Club Passes deposited each card anniversary year',
      est_value_usd: 118,
      notes: 'Valid at United Club locations when flying United or Star Alliance.'
    },
    {
      title: 'NCL Latitudes Platinum — 2 Complimentary Specialty Dinners for 2 + Free Laundry',
      type: 'Suite / Flight Upgrade',
      program: 'Norwegian Cruise Line (NCL) Latitudes Rewards',
      source_card: 'NCL Latitudes Platinum / Sapphire / Diamond Status',
      cap_details: '2 Specialty Dinners for 2 (1 w/ Bottle of Wine) + 1 Free Laundry Bag per 7-day sailing',
      est_value_usd: 280,
      notes: 'Automatically loaded to your NCL keycard on every 5+ night sailing.'
    },
    {
      title: 'Royal Caribbean Diamond — 4 Free Daily Drink Vouchers per Person',
      type: 'Suite / Flight Upgrade',
      program: 'Royal Caribbean Crown & Anchor Society',
      source_card: 'Crown & Anchor Diamond / Diamond Plus Status',
      cap_details: '4 complimentary drinks (up to $14 each) every single day of the cruise',
      est_value_usd: 420,
      notes: 'Worth ~$56/day ($392 on a 7-night cruise) per Diamond member.'
    },
    {
      title: 'Capital One Lounge & Priority Pass Select Membership',
      type: 'Lounge & Security Perk',
      program: 'Capital One Miles',
      source_card: 'Capital One Venture X',
      cap_details: 'Unlimited access to Capital One Lounges + 1,400+ Priority Pass Lounges',
      est_value_usd: 469,
      notes: 'Complimentary airport lounge access + 2 guests per visit.'
    },
    {
      title: 'Global Entry / TSA PreCheck & CLEAR Plus Membership',
      type: 'Lounge & Security Perk',
      program: 'Amex Membership Rewards',
      source_card: 'Amex Business Platinum / Venture X / Sapphire Reserve',
      cap_details: 'Expedited US Customs & TSA PreCheck lanes with Pelican camera cases',
      est_value_usd: 319,
      notes: '100% covered via annual card statement credits.'
    }
  ];

  // =========================================================================
  // REALISTIC CREDIT CARD SVG GRAPHIC GENERATOR & CUSTOM IMAGE HELPER
  // =========================================================================
  function detectCardArtPreset(card) {
    if (!card) return 'venture-x';
    if (card.card_style) return card.card_style;
    const raw = `${card.name || ''} ${card.issuer || ''} ${card.ecosystem || ''}`.toLowerCase();
    if (raw.includes('norwegian') || raw.includes('ncl') || raw.includes('holland america')) return 'cruise-ncl';
    if (raw.includes('royal caribbean') || raw.includes('celebrity') || raw.includes('princess')) return 'cruise-royal';
    if (raw.includes('carnival') || raw.includes('virgin voyages') || raw.includes('msc')) return 'cruise-carnival';
    if (raw.includes('aadvantage') || raw.includes('american airlines')) return 'airline-aa';
    if (raw.includes('southwest') || raw.includes('rapid rewards')) return 'airline-southwest';
    if (raw.includes('venture')) return 'venture-x';
    if (raw.includes('sapphire reserve')) return 'sapphire-reserve';
    if (raw.includes('sapphire preferred')) return 'sapphire-preferred';
    if (raw.includes('ink')) return 'chase-ink';
    if (raw.includes('platinum')) return 'amex-platinum';
    if (raw.includes('gold')) return 'amex-gold';
    if (raw.includes('hilton') || raw.includes('aspire') || raw.includes('surpass')) return 'hilton-aspire';
    if (raw.includes('hyatt')) return 'hyatt';
    if (raw.includes('marriott') || raw.includes('bonvoy') || raw.includes('brilliant') || raw.includes('boundless')) return 'marriott-brilliant';
    if (raw.includes('bilt')) return 'bilt';
    if (raw.includes('citi') || raw.includes('strata')) return 'citi-strata';
    if (raw.includes('united')) return 'airline-united';
    if (raw.includes('delta')) return 'airline-delta';
    if (raw.includes('alaska')) return 'airline-alaska';
    if (raw.includes('chase')) return 'sapphire-reserve';
    if (raw.includes('amex') || raw.includes('american express')) return 'amex-platinum';
    if (raw.includes('capital one')) return 'venture-x';
    return 'venture-x';
  }

  const CARD_ART_THEMES = {
    'venture-x': {
      bg1: '#071124', bg2: '#162f59', bg3: '#0b1a36',
      accent: '#dc2626', accent2: '#38bdf8',
      textColor: '#f8fafc', subColor: '#94a3b8', chipColor: '#cbd5e1',
      issuerText: 'CAPITAL ONE', brandLine: 'VENTURE X', network: 'VISA INFINITE'
    },
    'sapphire-reserve': {
      bg1: '#05152e', bg2: '#0f3b7a', bg3: '#07224d',
      accent: '#38bdf8', accent2: '#60a5fa',
      textColor: '#f8fafc', subColor: '#bae6fd', chipColor: '#e2e8f0',
      issuerText: 'CHASE SAPPHIRE', brandLine: 'RESERVE®', network: 'VISA INFINITE'
    },
    'sapphire-preferred': {
      bg1: '#0b254d', bg2: '#1d4ed8', bg3: '#0f3166',
      accent: '#60a5fa', accent2: '#93c5fd',
      textColor: '#f8fafc', subColor: '#bfdbfe', chipColor: '#e2e8f0',
      issuerText: 'CHASE SAPPHIRE', brandLine: 'PREFERRED®', network: 'VISA SIGNATURE'
    },
    'chase-ink': {
      bg1: '#0f172a', bg2: '#1e293b', bg3: '#334155',
      accent: '#38bdf8', accent2: '#0284c7',
      textColor: '#f8fafc', subColor: '#94a3b8', chipColor: '#cbd5e1',
      issuerText: 'CHASE for BUSINESS', brandLine: 'INK PREFERRED℠', network: 'VISA'
    },
    'amex-platinum': {
      bg1: '#d1d5db', bg2: '#f3f4f6', bg3: '#9ca3af',
      accent: '#374151', accent2: '#111827',
      textColor: '#111827', subColor: '#374151', chipColor: '#eab308',
      issuerText: 'AMERICAN EXPRESS', brandLine: 'PLATINUM', network: 'AMEX'
    },
    'amex-gold': {
      bg1: '#a16207', bg2: '#eab308', bg3: '#854d0e',
      accent: '#422006', accent2: '#fef08a',
      textColor: '#1c1917', subColor: '#422006', chipColor: '#fef08a',
      issuerText: 'AMERICAN EXPRESS', brandLine: 'GOLD CARD', network: 'AMEX'
    },
    'hilton-aspire': {
      bg1: '#14102e', bg2: '#31256e', bg3: '#1b143d',
      accent: '#f59e0b', accent2: '#a855f7',
      textColor: '#f8fafc', subColor: '#ddd6fe', chipColor: '#facc15',
      issuerText: 'HILTON HONORS', brandLine: 'ASPIRE', network: 'AMEX'
    },
    'hyatt': {
      bg1: '#06262d', bg2: '#0e525e', bg3: '#083640',
      accent: '#10b981', accent2: '#2dd4bf',
      textColor: '#f8fafc', subColor: '#99f6e4', chipColor: '#e2e8f0',
      issuerText: 'WORLD OF HYATT', brandLine: 'HYATT', network: 'VISA SIGNATURE'
    },
    'marriott-brilliant': {
      bg1: '#121318', bg2: '#272932', bg3: '#181920',
      accent: '#f97316', accent2: '#fdba74',
      textColor: '#f8fafc', subColor: '#fed7aa', chipColor: '#fbbf24',
      issuerText: 'MARRIOTT BONVOY', brandLine: 'BRILLIANT™', network: 'AMEX'
    },
    'bilt': {
      bg1: '#09090b', bg2: '#27272a', bg3: '#18181b',
      accent: '#f4f4f5', accent2: '#ef4444',
      textColor: '#fafafa', subColor: '#a1a1aa', chipColor: '#d4d4d8',
      issuerText: 'BILT REWARDS', brandLine: 'BILT', network: 'WORLD ELITE'
    },
    'citi-strata': {
      bg1: '#071b36', bg2: '#0d3b75', bg3: '#09274d',
      accent: '#ef4444', accent2: '#38bdf8',
      textColor: '#f8fafc', subColor: '#bae6fd', chipColor: '#e2e8f0',
      issuerText: 'CITI THANKYOU', brandLine: 'STRATA PREMIER', network: 'WORLD ELITE'
    },
    'airline-united': {
      bg1: '#061a40', bg2: '#0353a4', bg3: '#003559',
      accent: '#38bdf8', accent2: '#f59e0b',
      textColor: '#f8fafc', subColor: '#bae6fd', chipColor: '#fbbf24',
      issuerText: 'UNITED MILEAGEPLUS', brandLine: 'EXPLORER', network: 'VISA'
    },
    'airline-delta': {
      bg1: '#2a0818', bg2: '#5c1233', bg3: '#1f102e',
      accent: '#e11d48', accent2: '#c084fc',
      textColor: '#f8fafc', subColor: '#fecdd3', chipColor: '#e2e8f0',
      issuerText: 'DELTA SKYMILES', brandLine: 'RESERVE', network: 'AMEX'
    },
    'airline-alaska': {
      bg1: '#042a2b', bg2: '#0b5351', bg3: '#09383a',
      accent: '#4ade80', accent2: '#38bdf8',
      textColor: '#f8fafc', subColor: '#a7f3d0', chipColor: '#fbbf24',
      issuerText: 'ALASKA AIRLINES', brandLine: 'MILEAGE PLAN', network: 'VISA SIGNATURE'
    },
    'airline-aa': {
      bg1: '#1e293b', bg2: '#334155', bg3: '#0f172a',
      accent: '#ef4444', accent2: '#38bdf8',
      textColor: '#f8fafc', subColor: '#cbd5e1', chipColor: '#e2e8f0',
      issuerText: 'CITI AADVANTAGE', brandLine: 'AADVANTAGE®', network: 'WORLD ELITE'
    },
    'airline-southwest': {
      bg1: '#172554', bg2: '#1d4ed8', bg3: '#1e3a8a',
      accent: '#f59e0b', accent2: '#ef4444',
      textColor: '#f8fafc', subColor: '#bfdbfe', chipColor: '#fbbf24',
      issuerText: 'SOUTHWEST RAPID REWARDS', brandLine: 'PRIORITY', network: 'VISA'
    },
    'cruise-ncl': {
      bg1: '#042f4b', bg2: '#0284c7', bg3: '#0c4a6e',
      accent: '#2dd4bf', accent2: '#38bdf8',
      textColor: '#f8fafc', subColor: '#bae6fd', chipColor: '#fbbf24',
      issuerText: 'NORWEGIAN CRUISE LINE', brandLine: 'NCL WORLD', network: 'WORLD MASTERCARD'
    },
    'cruise-royal': {
      bg1: '#09193a', bg2: '#1e3a8a', bg3: '#0f2557',
      accent: '#f59e0b', accent2: '#60a5fa',
      textColor: '#f8fafc', subColor: '#fde68a', chipColor: '#facc15',
      issuerText: 'ROYAL CARIBBEAN', brandLine: 'CROWN & ANCHOR', network: 'VISA SIGNATURE'
    },
    'cruise-carnival': {
      bg1: '#172554', bg2: '#991b1b', bg3: '#1e1b4b',
      accent: '#ef4444', accent2: '#38bdf8',
      textColor: '#f8fafc', subColor: '#fecaca', chipColor: '#e2e8f0',
      issuerText: 'CARNIVAL CRUISE LINE', brandLine: 'FUNPOINTS®', network: 'WORLD MASTERCARD'
    }
  };

  function getCardArtDataUri(card) {
    if (card && card.image_url && String(card.image_url).trim()) {
      return String(card.image_url).trim();
    }
    const presetKey = detectCardArtPreset(card);
    const theme = CARD_ART_THEMES[presetKey] || CARD_ART_THEMES['venture-x'];
    const rawName = (card && (card.name || card.title)) ? String(card.name || card.title) : '';
    const rawIssuer = (card && card.issuer) ? String(card.issuer).toUpperCase() : theme.issuerText;

    let displayMain = theme.brandLine;
    if (rawName) {
      const upper = rawName.toUpperCase();
      if (upper.includes('NORWEGIAN') || upper.includes('NCL')) displayMain = 'NCL MASTERCARD';
      else if (upper.includes('ROYAL CARIBBEAN')) displayMain = 'ROYAL CARIBBEAN';
      else if (upper.includes('CELEBRITY')) displayMain = 'CELEBRITY CRUISES';
      else if (upper.includes('CARNIVAL')) displayMain = 'CARNIVAL WORLD';
      else if (upper.includes('PRINCESS')) displayMain = 'PRINCESS CRUISES';
      else if (upper.includes('HOLLAND AMERICA')) displayMain = 'HOLLAND AMERICA';
      else if (upper.includes('DISNEY')) displayMain = 'DISNEY PREMIER';
      else if (upper.includes('UNITED QUEST')) displayMain = 'UNITED QUEST';
      else if (upper.includes('UNITED CLUB')) displayMain = 'UNITED CLUB';
      else if (upper.includes('UNITED') && upper.includes('EXPLORER')) displayMain = 'UNITED EXPLORER';
      else if (upper.includes('AADVANTAGE') && upper.includes('EXECUTIVE')) displayMain = 'AA EXECUTIVE';
      else if (upper.includes('AADVANTAGE')) displayMain = 'AADVANTAGE PLATINUM';
      else if (upper.includes('SOUTHWEST')) displayMain = 'SOUTHWEST PRIORITY';
      else if (upper.includes('AEROPLAN')) displayMain = 'CHASE AEROPLAN';
      else if (upper.includes('VENTURE X')) displayMain = 'VENTURE X';
      else if (upper.includes('VENTURE')) displayMain = 'VENTURE';
      else if (upper.includes('SAPPHIRE RESERVE')) displayMain = 'SAPPHIRE RESERVE';
      else if (upper.includes('SAPPHIRE PREFERRED')) displayMain = 'SAPPHIRE PREFERRED';
      else if (upper.includes('INK')) displayMain = 'INK PREFERRED';
      else if (upper.includes('BUSINESS PLATINUM')) displayMain = 'BUSINESS PLATINUM';
      else if (upper.includes('DELTA') && upper.includes('PLATINUM')) displayMain = 'DELTA PLATINUM';
      else if (upper.includes('DELTA') && upper.includes('GOLD')) displayMain = 'DELTA GOLD';
      else if (upper.includes('DELTA') && upper.includes('RESERVE')) displayMain = 'DELTA RESERVE';
      else if (upper.includes('PLATINUM')) displayMain = 'PLATINUM';
      else if (upper.includes('BUSINESS GOLD')) displayMain = 'BUSINESS GOLD';
      else if (upper.includes('GOLD')) displayMain = 'GOLD CARD';
      else if (upper.includes('ASPIRE')) displayMain = 'HILTON ASPIRE';
      else if (upper.includes('SURPASS')) displayMain = 'HILTON SURPASS';
      else if (upper.includes('HYATT')) displayMain = 'WORLD OF HYATT';
      else if (upper.includes('BRILLIANT')) displayMain = 'BONVOY BRILLIANT';
      else if (upper.includes('BOUNDLESS')) displayMain = 'BONVOY BOUNDLESS';
      else if (upper.includes('IHG')) displayMain = 'IHG ONE PREMIER';
      else if (upper.includes('BILT')) displayMain = 'BILT MASTERCARD';
      else displayMain = upper.slice(0, 20);
    }

    const safeIssuer = rawIssuer.replace(/[&<>'"]/g, '').slice(0, 22);
    const safeMain = displayMain.replace(/[&<>'"]/g, '');
    const safeNet = theme.network.replace(/[&<>'"]/g, '');
    const rawDigits = card && card.card_number ? String(card.card_number).replace(/\D/g, '') : '';
    const last4 = rawDigits.length >= 4
      ? rawDigits.slice(-4)
      : (card && card.card_number && String(card.card_number).trim().slice(-4).replace(/[&<>'"]/g, '')) || '9042';
    const expTxt = card && card.card_expiration
      ? `EXP ${String(card.card_expiration).trim().replace(/[&<>'"]/g, '').slice(0, 8)}`
      : 'WORLD TRAVEL CARD';

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 202" width="320" height="202">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${theme.bg1}"/>
          <stop offset="52%" stop-color="${theme.bg2}"/>
          <stop offset="100%" stop-color="${theme.bg3}"/>
        </linearGradient>
        <linearGradient id="sheen" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0"/>
          <stop offset="45%" stop-color="#ffffff" stop-opacity="0.13"/>
          <stop offset="55%" stop-color="#ffffff" stop-opacity="0.04"/>
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect width="320" height="202" rx="16" fill="url(#bg)"/>
      <path d="M-20 160 L190 -20 L265 -20 L55 190 Z" fill="url(#sheen)"/>
      <circle cx="285" cy="36" r="88" fill="${theme.accent2}" fill-opacity="0.09"/>
      <circle cx="265" cy="175" r="70" fill="${theme.accent}" fill-opacity="0.12"/>
      <rect x="8" y="8" width="304" height="186" rx="12" fill="none" stroke="${theme.textColor}" stroke-opacity="0.16" stroke-width="1"/>
      <!-- Top Issuer Header -->
      <text x="22" y="34" font-family="Inter, system-ui, sans-serif" font-size="11" font-weight="800" letter-spacing="1.6" fill="${theme.subColor}">${safeIssuer}</text>
      <path d="M22 41 L92 41" stroke="${theme.accent}" stroke-width="2.2" stroke-linecap="round"/>
      <!-- Metallic EMV Chip -->
      <rect x="24" y="64" width="42" height="31" rx="6" fill="${theme.chipColor}" fill-opacity="0.92" stroke="#475569" stroke-width="0.8"/>
      <path d="M24 74 H66 M24 84 H66 M38 64 V95 M52 64 V95" stroke="#334155" stroke-width="0.7" opacity="0.55"/>
      <!-- Contactless Wave -->
      <path d="M76 74 Q81 79 76 85 M81 71 Q88 79 81 88 M86 68 Q95 79 86 91" fill="none" stroke="${theme.subColor}" stroke-width="1.5" stroke-linecap="round" opacity="0.75"/>
      <!-- Center / Hero Card Name -->
      <text x="22" y="134" font-family="Inter, system-ui, sans-serif" font-size="18.5" font-weight="900" letter-spacing="1.5" fill="${theme.textColor}">${safeMain}</text>
      <!-- Masked Card Digits -->
      <text x="22" y="156" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="600" letter-spacing="2" fill="${theme.subColor}" opacity="0.85">•••• •••• •••• ${last4}</text>
      <!-- Bottom Left Ecosystem & Bottom Right Network -->
      <text x="22" y="180" font-family="Inter, system-ui, sans-serif" font-size="9.5" font-weight="700" letter-spacing="0.8" fill="${theme.subColor}" opacity="0.9">${expTxt}</text>
      <text x="296" y="180" text-anchor="end" font-family="Inter, system-ui, sans-serif" font-size="10.5" font-weight="900" letter-spacing="1.2" fill="${theme.textColor}">${safeNet}</text>
    </svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  function renderCardCredentialsStripHtml(card, showAddHint = false) {
    if (!card) return '';
    const num = String(card.card_number || '').trim();
    const exp = String(card.card_expiration || '').trim();

    if (!num && !exp) {
      if (!showAddHint) return '';
      return `
        <div class="cc-credentials-bar">
          <button type="button" class="cc-cred-chip" data-edit-rcard="${escapeHtml(card.id)}" title="Add Last 4 Digits &amp; Expiration Date">
            ➕ Add Last 4 / Exp
          </button>
        </div>
      `;
    }

    const digitsOnly = num.replace(/\D/g, '');
    const displayLast4 = digitsOnly.length >= 4 ? digitsOnly.slice(-4) : (num.slice(-4) || num);

    return `
      <div class="cc-credentials-bar">
        ${displayLast4 ? `
          <button type="button" class="cc-cred-chip mono" data-copy-secret="${escapeHtml(displayLast4)}" data-secret-label="Last 4 Digits" title="Click to copy Last 4 Digits">
            💳 •••• ${escapeHtml(displayLast4)} 📋
          </button>
        ` : ''}
        ${exp ? `
          <button type="button" class="cc-cred-chip mono" data-copy-secret="${escapeHtml(exp)}" data-secret-label="Expiration Date" title="Click to copy Expiration Date">
            📅 Exp: ${escapeHtml(exp)} 📋
          </button>
        ` : ''}
      </div>
    `;
  }

  function renderCreditCardArtHtml(card, sizeClass = 'cc-art-sm') {
    const src = getCardArtDataUri(card);
    const label = (card && (card.name || card.title)) || 'Credit Card';
    return `
      <div class="cc-art-wrap ${sizeClass}" title="${escapeHtml(label)}">
        <img src="${escapeHtml(src)}" alt="${escapeHtml(label)}" class="cc-art-img" loading="lazy" />
      </div>
    `;
  }

  // =========================================================================
  // UNIFIED ECOSYSTEM LINKING HELPERS (CARDS <-> PROGRAMS <-> CERTIFICATES)
  // =========================================================================
  function normalizeEcoStr(str) {
    return String(str || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // =========================================================================
  // HOUSEHOLD OWNERS (e.g. "Jim" / "Karen") — separate accounts per person
  // =========================================================================
  const DEFAULT_REWARD_OWNERS = ['Jim', 'Karen'];

  function normOwner(o) {
    return String(o || '').trim().toLowerCase();
  }

  function getRewardOwners() {
    const set = [];
    const push = (o) => {
      const t = String(o || '').trim();
      if (t && !set.some(x => normOwner(x) === normOwner(t))) set.push(t);
    };
    const saved = state.rewards && Array.isArray(state.rewards.owners) ? state.rewards.owners : null;
    (saved && saved.length ? saved : DEFAULT_REWARD_OWNERS).forEach(push);
    if (state.rewards) {
      ['programs', 'cards', 'certificates'].forEach(k => (state.rewards[k] || []).forEach(it => push(it.owner)));
    }
    return set;
  }

  function registerRewardOwner(name) {
    const t = String(name || '').trim();
    if (!t) return;
    const owners = getRewardOwners();
    if (!owners.some(o => normOwner(o) === normOwner(t))) owners.push(t);
    state.rewards.owners = owners;
  }

  // Strict match used for auto-linking: owners must be identical (both blank counts as identical)
  function sameOwner(a, b) {
    return normOwner(a && a.owner) === normOwner(b && b.owner);
  }

  // Loose match used for display: only block when BOTH have owners and they differ
  function ownersCompatible(a, b) {
    const oa = normOwner(a && a.owner);
    const ob = normOwner(b && b.owner);
    return !oa || !ob || oa === ob;
  }

  function itemMatchesOwnerFilter(item) {
    const f = state.rewardsOwnerFilter || 'all';
    if (f === 'all') return true;
    if (f === '__unassigned') return !normOwner(item && item.owner);
    return normOwner(item && item.owner) === normOwner(f);
  }

  function ownerBadgeHtml(item, size = 'sm') {
    const o = item && String(item.owner || '').trim();
    if (!o) return '';
    const fs = size === 'xs' ? '9.5px' : '10.5px';
    return `<span class="owner-badge" style="font-size: ${fs};" title="Account holder: ${escapeHtml(o)}">👤 ${escapeHtml(o)}'s</span>`;
  }

  // Runs a render function with state.rewards temporarily scoped to the active owner filter.
  // Arrays contain the same object references, so any in-place edits persist to the full dataset.
  function withOwnerScopedRewards(fn) {
    const f = state.rewardsOwnerFilter || 'all';
    if (f === 'all' || !state.rewards || state.rewards.__scoped) return fn();
    const full = state.rewards;
    state.rewards = {
      ...full,
      __scoped: true,
      __full: full,
      programs: (full.programs || []).filter(itemMatchesOwnerFilter),
      cards: (full.cards || []).filter(itemMatchesOwnerFilter),
      certificates: (full.certificates || []).filter(itemMatchesOwnerFilter),
      redemptions: full.redemptions || []
    };
    try {
      return fn();
    } finally {
      state.rewards = full;
    }
  }

  function renderOwnerFilterBars() {
    const owners = getRewardOwners();
    const all = state.rewards || {};
    const countFor = (pred) => ['programs', 'cards', 'certificates'].reduce((s, k) => s + (all[k] || []).filter(pred).length, 0);
    const unassigned = countFor(it => !normOwner(it.owner));
    const cur = state.rewardsOwnerFilter || 'all';
    const chip = (key, label, n) => `
      <button type="button" class="chip-btn owner-chip ${cur === key ? 'active' : ''}" data-owner-filter="${escapeHtml(key)}">
        ${label} <span class="owner-chip-count">${n}</span>
      </button>`;
    const html = `
      <span class="owner-bar-label">👥 Viewing:</span>
      ${chip('all', '🏠 Everyone', countFor(() => true))}
      ${owners.map(o => chip(o, `👤 ${escapeHtml(o)}'s`, countFor(it => normOwner(it.owner) === normOwner(o)))).join('')}
      ${unassigned > 0 ? chip('__unassigned', '❔ Unassigned', unassigned) : ''}
      <button type="button" class="btn btn-sm owner-manage-btn" data-owner-add title="Add another household member">+ Person</button>
      ${unassigned > 0 && owners.length > 0 ? `<button type="button" class="btn btn-sm owner-manage-btn" data-owner-assign-unassigned title="Assign all unassigned cards, programs & perks to one person">Assign ${unassigned} Unassigned…</button>` : ''}
    `;
    document.querySelectorAll('.owner-filter-bar').forEach(el => { el.innerHTML = html; });
  }

  function populateOwnerDatalist() {
    const dl = document.getElementById('reward-owner-datalist');
    if (dl) dl.innerHTML = getRewardOwners().map(o => `<option value="${escapeHtml(o)}"></option>`).join('');
  }

  function defaultOwnerForNewItem() {
    const f = state.rewardsOwnerFilter || 'all';
    return (f !== 'all' && f !== '__unassigned') ? f : '';
  }

  function doesCardMatchProgram(card, prog) {
    if (!card || !prog) return false;
    if (card.linked_program_id && card.linked_program_id === prog.id) return true;
    if (!ownersCompatible(card, prog)) return false;
    // If the card is explicitly linked to a different program, don't double-show it
    if (card.linked_program_id && ((state.rewards.__full || state.rewards).programs || []).some(p => p.id === card.linked_program_id)) return false;
    const pName = normalizeEcoStr(prog.name);
    const cEco = normalizeEcoStr(card.ecosystem || card.points_program);
    const cName = normalizeEcoStr(card.name);
    if (!pName) return false;
    if (cEco && (cEco === pName || cEco.includes(pName) || pName.includes(cEco))) return true;
    // Brand token matching (e.g. "Capital One", "Hyatt", "Hilton", "Marriott", "Bilt", "United", "Delta", "Alaska", "Norwegian", "Royal Caribbean", "Carnival")
    const brandTokens = [
      'capital one', 'chase ultimate', 'amex membership', 'hilton', 'hyatt', 'marriott', 'ihg', 'wyndham', 'choice',
      'bilt', 'citi thankyou', 'united', 'delta', 'alaska', 'aeroplan', 'american airlines', 'aadvantage', 'southwest',
      'jetblue', 'singapore', 'virgin', 'avios', 'flying blue', 'ana',
      'norwegian', 'ncl', 'latitudes', 'royal caribbean', 'crown anchor', 'celebrity', 'carnival', 'vifp',
      'princess', 'holland america', 'disney', 'msc', 'amtrak'
    ];
    for (const token of brandTokens) {
      if (pName.includes(token) && (cEco.includes(token) || cName.includes(token))) return true;
    }
    return false;
  }

  function getLinkedCardsForProgram(prog) {
    ensureRewardsStructure();
    return (state.rewards.cards || []).filter(c => doesCardMatchProgram(c, prog));
  }

  function getLinkedCertsForProgram(prog, linkedCards = []) {
    ensureRewardsStructure();
    const pName = normalizeEcoStr(prog.name);
    const cardNames = linkedCards.map(c => normalizeEcoStr(c.name)).filter(Boolean);
    return (state.rewards.certificates || []).filter(cert => {
      if (cert.linked_program_id && cert.linked_program_id === prog.id) return true;
      if (!ownersCompatible(cert, prog)) return false;
      const cProg = normalizeEcoStr(cert.program);
      const cSource = normalizeEcoStr(cert.source_card);
      if (pName && cProg && (cProg.includes(pName) || pName.includes(cProg))) return true;
      for (const cn of cardNames) {
        if (cn && ((cSource && (cSource.includes(cn) || cn.includes(cSource))) || (cProg && cProg.includes(cn)))) {
          return true;
        }
      }
      // Check brand tokens
      const brandTokens = [
        'capital one', 'venture x', 'hyatt', 'hilton', 'marriott', 'ihg', 'wyndham', 'choice',
        'bilt', 'united', 'delta', 'alaska', 'aeroplan', 'american airlines', 'aadvantage', 'southwest',
        'norwegian', 'ncl', 'royal caribbean', 'celebrity', 'carnival', 'princess', 'holland america', 'disney', 'virgin', 'msc'
      ];
      for (const token of brandTokens) {
        if (pName.includes(token) && (cProg.includes(token) || cSource.includes(token))) return true;
      }
      return false;
    });
  }

  function integrateCardIntoEcosystem(cardItem, opts = { autoLinkProg: true, autoAddCerts: true }) {
    ensureRewardsStructure();
    const addedItems = [];
    const catTplEntry = POPULAR_REWARD_TEMPLATES.find(
      t => t.kind === 'card' && normalizeEcoStr(t.data.name) === normalizeEcoStr(cardItem.name)
    );
    const tplData = catTplEntry ? catTplEntry.data : null;

    // 1. Auto-link or create matching Loyalty Program
    if (opts.autoLinkProg) {
      // Only auto-link to a program belonging to the SAME person (Jim's card -> Jim's Hyatt, Karen's card -> Karen's Hyatt)
      let matchProg = (state.rewards.programs || []).find(p => sameOwner(cardItem, p) && doesCardMatchProgram(cardItem, p));
      if (!matchProg && cardItem.ecosystem) {
        // Look up program template in database
        const progTplEntry = POPULAR_REWARD_TEMPLATES.find(
          t => t.kind === 'program' && (
            normalizeEcoStr(t.data.name) === normalizeEcoStr(cardItem.ecosystem) ||
            normalizeEcoStr(t.data.name).includes(normalizeEcoStr(cardItem.ecosystem)) ||
            normalizeEcoStr(cardItem.ecosystem).includes(normalizeEcoStr(t.data.name))
          )
        );
        const ecoRaw = normalizeEcoStr(cardItem.ecosystem + ' ' + cardItem.name);
        const inferredEco = progTplEntry
          ? progTplEntry.data.ecosystem
          : (ecoRaw.includes('cruise') || ecoRaw.includes('norwegian') || ecoRaw.includes('ncl') || ecoRaw.includes('latitudes') || ecoRaw.includes('royal caribbean') || ecoRaw.includes('celebrity') || ecoRaw.includes('carnival') || ecoRaw.includes('princess') || ecoRaw.includes('holland america') || ecoRaw.includes('disney') || ecoRaw.includes('amtrak'))
          ? 'other'
          : (ecoRaw.includes('hilton') || ecoRaw.includes('hyatt') || ecoRaw.includes('marriott') || ecoRaw.includes('ihg') || ecoRaw.includes('wyndham') || ecoRaw.includes('choice'))
          ? 'hotel'
          : (ecoRaw.includes('united') || ecoRaw.includes('delta') || ecoRaw.includes('alaska') || ecoRaw.includes('southwest') || ecoRaw.includes('aadvantage') || ecoRaw.includes('jetblue') || ecoRaw.includes('air') || ecoRaw.includes('miles') && !ecoRaw.includes('capital one'))
          ? 'airline'
          : 'bank';

        const newProg = progTplEntry
          ? {
              ...JSON.parse(JSON.stringify(progTplEntry.data)),
              id: 'prog-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)
            }
          : {
              id: 'prog-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
              name: cardItem.ecosystem,
              ecosystem: inferredEco,
              status_tier: (tplData && tplData.auto_status) || cardItem.name || 'Member',
              member_id: '',
              points: 0,
              cpp: inferredEco === 'hotel' ? 1.2 : 1.75,
              qualifying_nights: 0,
              target_nights: inferredEco === 'hotel' ? 60 : 0,
              metric_label: inferredEco === 'hotel' ? 'Qualifying Nights' : '',
              expiration_policy: 'Never expires while card open',
              transfer_partners: '',
              notes: `Linked to ${cardItem.name}`
            };
        if (tplData && tplData.auto_status) {
          newProg.status_tier = tplData.auto_status;
        }
        newProg.owner = cardItem.owner || '';
        newProg.member_id = '';
        newProg.points = Number(newProg.points || 0);
        state.rewards.programs.unshift(newProg);
        matchProg = newProg;
        addedItems.push(`${newProg.owner ? newProg.owner + "'s " : ''}Program "${newProg.name}"`);
      } else if (matchProg && tplData && tplData.auto_status && (!matchProg.status_tier || matchProg.status_tier === 'Member')) {
        matchProg.status_tier = tplData.auto_status;
      }
      if (matchProg) {
        cardItem.linked_program_id = matchProg.id;
      }
    }

    // 2. Auto-add bundled Free Night Certificates / Lounge Perks
    if (opts.autoAddCerts && tplData && Array.isArray(tplData.bundled_certs)) {
      const nextYear = new Date(Date.now() + 330 * 86400000).toISOString().slice(0, 10);
      for (const bCert of tplData.bundled_certs) {
        const alreadyExists = (state.rewards.certificates || []).some(
          c => normalizeEcoStr(c.title) === normalizeEcoStr(bCert.title) && sameOwner(c, cardItem)
        );
        if (!alreadyExists) {
          state.rewards.certificates.unshift({
            id: 'cert-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
            owner: cardItem.owner || '',
            linked_program_id: cardItem.linked_program_id || '',
            title: bCert.title,
            type: bCert.type || 'Free Night Certificate',
            program: bCert.program || cardItem.ecosystem || 'Loyalty Program',
            source_card: bCert.source_card || cardItem.name,
            cap_details: bCert.cap_details || '',
            expires_date: nextYear,
            est_value_usd: Number(bCert.est_value_usd || 350),
            status: 'available',
            notes: bCert.notes || ''
          });
          addedItems.push(`Perk "${bCert.title}"`);
        }
      }
    }
    return addedItems;
  }

  let hasAutoMigratedCardFees = false;
  function ensureRewardsStructure() {
    if (!state.rewards || typeof state.rewards !== 'object') {
      state.rewards = getDefaultRewardsData();
    }
    if (!Array.isArray(state.rewards.programs)) state.rewards.programs = [];
    if (!Array.isArray(state.rewards.certificates)) state.rewards.certificates = [];
    if (!Array.isArray(state.rewards.cards)) state.rewards.cards = [];
    if (!Array.isArray(state.rewards.redemptions)) state.rewards.redemptions = [];

    // Auto-migrate existing Chase United Explorer cards from legacy $95/$99 fee to current $150 fee
    if (!state.rewards.__scoped && Array.isArray(state.rewards.cards)) {
      let migrated = false;
      const uaExplorerTpl = POPULAR_REWARD_TEMPLATES.find(
        t => t.kind === 'card' && String(t.data.name || '').toLowerCase().includes('united explorer')
      );
      for (const card of state.rewards.cards) {
        const cName = String(card.name || '').toLowerCase();
        if (cName.includes('united') && cName.includes('explorer')) {
          if (Number(card.annual_fee) === 95 || Number(card.annual_fee) === 99) {
            card.annual_fee = 150;
            migrated = true;
          }
          // If this United Explorer card previously got mismatched IHG/Hyatt credits or outdated credits, sync its authentic United Explorer credits
          const hasWrongCredits = Array.isArray(card.credits) && card.credits.some(cr => /ihg|hyatt|40,000-pt/i.test(cr.name || ''));
          if (uaExplorerTpl && (hasWrongCredits || !Array.isArray(card.credits))) {
            card.credits = JSON.parse(JSON.stringify(uaExplorerTpl.data.credits));
            card.multipliers = uaExplorerTpl.data.multipliers;
            card.best_for = uaExplorerTpl.data.best_for;
            card.ecosystem = uaExplorerTpl.data.ecosystem;
            migrated = true;
          }
        }

        // Ensure every credit card with a known loyalty ecosystem is connected both ways to a Loyalty Program in the Loyalty Hub
        if (card.ecosystem && Array.isArray(state.rewards.programs)) {
          const hasMatchingProg = state.rewards.programs.some(
            p => sameOwner(card, p) && doesCardMatchProgram(card, p)
          );
          if (!hasMatchingProg) {
            const progTplEntry = POPULAR_REWARD_TEMPLATES.find(
              t => t.kind === 'program' && (
                normalizeEcoStr(t.data.name) === normalizeEcoStr(card.ecosystem) ||
                normalizeEcoStr(t.data.name).includes(normalizeEcoStr(card.ecosystem)) ||
                normalizeEcoStr(card.ecosystem).includes(normalizeEcoStr(t.data.name))
              )
            );
            const ecoRaw = normalizeEcoStr(card.ecosystem + ' ' + card.name);
            const inferredEco = progTplEntry
              ? progTplEntry.data.ecosystem
              : (ecoRaw.includes('cruise') || ecoRaw.includes('norwegian') || ecoRaw.includes('ncl') || ecoRaw.includes('latitudes') || ecoRaw.includes('royal caribbean') || ecoRaw.includes('celebrity') || ecoRaw.includes('carnival') || ecoRaw.includes('princess') || ecoRaw.includes('holland america') || ecoRaw.includes('disney') || ecoRaw.includes('amtrak'))
              ? 'other'
              : (ecoRaw.includes('hilton') || ecoRaw.includes('hyatt') || ecoRaw.includes('marriott') || ecoRaw.includes('ihg') || ecoRaw.includes('wyndham') || ecoRaw.includes('choice'))
              ? 'hotel'
              : (ecoRaw.includes('united') || ecoRaw.includes('delta') || ecoRaw.includes('alaska') || ecoRaw.includes('southwest') || ecoRaw.includes('aadvantage') || ecoRaw.includes('jetblue') || ecoRaw.includes('air') || (ecoRaw.includes('miles') && !ecoRaw.includes('capital one')))
              ? 'airline'
              : 'bank';

            const newProg = progTplEntry
              ? {
                  ...JSON.parse(JSON.stringify(progTplEntry.data)),
                  id: 'prog-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)
                }
              : {
                  id: 'prog-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
                  name: card.ecosystem,
                  ecosystem: inferredEco,
                  status_tier: card.name || 'Member',
                  member_id: '',
                  points: 0,
                  cpp: inferredEco === 'hotel' ? 1.2 : 1.5,
                  qualifying_nights: 0,
                  target_nights: 0,
                  metric_label: '',
                  expiration_policy: 'Never expires while card open',
                  transfer_partners: '',
                  notes: `Linked to ${card.name}`
                };
            newProg.owner = card.owner || '';
            newProg.member_id = '';
            newProg.points = 0;
            state.rewards.programs.push(newProg);
            card.linked_program_id = newProg.id;
            migrated = true;
          }
        }
      }
      if (migrated && hasCompletedServerBootstrap && !hasAutoMigratedCardFees) {
        hasAutoMigratedCardFees = true;
        setTimeout(() => {
          apiRequest('/api/rewards', { method: 'PUT', body: JSON.stringify(state.rewards) }).catch(() => {});
        }, 300);
      }
    }
  }

  function daysUntilDate(dateStr) {
    if (!dateStr) return 999;
    const target = new Date(dateStr + 'T00:00:00');
    if (isNaN(target.getTime())) return 999;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((target - today) / (1000 * 60 * 60 * 24));
  }

  function flushPendingInlineCustomFields() {
    const inputs = document.querySelectorAll('[data-cf-new-label]');
    inputs.forEach(lblEl => {
      const label = (lblEl.value || '').trim();
      if (!label) return;
      const ownerKey = lblEl.getAttribute('data-cf-new-label');
      const valEl = document.querySelector(`[data-cf-new-val="${CSS.escape(ownerKey)}"]`);
      const value = valEl ? valEl.value.trim() : '';
      const { prog, card, fields } = resolveCustomFieldsTarget(ownerKey);
      if (prog || card) {
        fields.push({ id: 'cf-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5), label, value, checked: false });
        syncCustomFieldsToItems(prog, card, fields);
      }
      lblEl.value = '';
      if (valEl) valEl.value = '';
    });
  }

  async function saveRewardsState(toastMsg) {
    flushPendingInlineCustomFields();
    ensureRewardsStructure();
    const updated = await apiRequest('/api/rewards', {
      method: 'PUT',
      body: JSON.stringify(state.rewards)
    });
    if (updated) {
      applyBootstrapData(updated);
    } else {
      renderAll();
    }
    if (toastMsg) showToast(toastMsg);
  }

  function computeRewardsMetrics() {
    ensureRewardsStructure();
    let totalPoints = 0;
    let totalPointsValueUsd = 0;
    let bankPointsValueUsd = 0;

    for (const p of state.rewards.programs) {
      const pts = Number(p.points ?? p.balance ?? 0);
      const cpp = Number(p.cpp ?? p.cpp_valuation ?? 1.5);
      const val = (pts * cpp) / 100;
      totalPoints += pts;
      totalPointsValueUsd += val;
      if (p.ecosystem === 'bank') bankPointsValueUsd += val;
    }

    let availableCertsCount = 0;
    let expiringSoonCertsCount = 0;
    let availableCertsValueUsd = 0;
    for (const c of state.rewards.certificates) {
      if (c.status !== 'redeemed') {
        availableCertsCount++;
        availableCertsValueUsd += Number(c.est_value_usd ?? c.estimated_value_usd ?? 0);
        const days = daysUntilDate(c.expires_date || c.expiration_date);
        if (days <= 60) expiringSoonCertsCount++;
      }
    }

    let totalAnnualFees = 0;
    let totalCreditsAvailable = 0;
    let totalCreditsUsed = 0;
    for (const card of state.rewards.cards) {
      totalAnnualFees += Number(card.annual_fee || 0);
      if (Array.isArray(card.credits)) {
        for (const cr of card.credits) {
          const tot = Number(cr.total_usd ?? cr.amount ?? 0);
          const used = cr.used_usd !== undefined ? Number(cr.used_usd) : (cr.used ? tot : 0);
          totalCreditsAvailable += tot;
          totalCreditsUsed += used;
        }
      }
    }

    let totalRedemptionSavedUsd = 0;
    let totalPointsRedeemed = 0;
    let totalRedemptionCashValue = 0;
    for (const r of state.rewards.redemptions) {
      const cash = Number(r.cash_price_usd || 0);
      const fees = Number(r.taxes_fees_usd || 0);
      const saved = Number(r.net_saved_usd ?? Math.max(0, cash - fees));
      const pts = Number(r.points_used || 0);
      totalRedemptionSavedUsd += saved;
      if (pts > 0) {
        totalPointsRedeemed += pts;
        totalRedemptionCashValue += saved;
      }
    }
    const avgRedemptionCpp = totalPointsRedeemed > 0
      ? (totalRedemptionCashValue * 100) / totalPointsRedeemed
      : 2.4;

    return {
      totalPoints,
      totalPointsValueUsd,
      bankPointsValueUsd,
      availableCertsCount,
      expiringSoonCertsCount,
      availableCertsValueUsd,
      totalPortfolioValueUsd: totalPointsValueUsd + availableCertsValueUsd,
      totalAnnualFees,
      totalCreditsAvailable,
      totalCreditsUsed,
      netCardKeeperValue: totalCreditsUsed + availableCertsValueUsd - totalAnnualFees,
      totalRedemptionSavedUsd,
      avgRedemptionCpp
    };
  }

  // =========================================================================
  // STATEMENT CREDIT AUTO-CALCULATION, RESET DATES & REMINDERS ENGINE
  // =========================================================================
  let activeRemindersFilter = 'all';

  function getDefaultCreditResetMonth(card, cr) {
    if (cr && cr.reset_date && String(cr.reset_date).trim()) {
      return String(cr.reset_date).trim().slice(0, 7);
    }
    const nameLower = String((cr && (cr.name || cr.label)) || '').toLowerCase();
    const cycleLower = String((cr && cr.reset_cycle) || '').toLowerCase();
    const now = new Date();
    const nextYr = now.getFullYear() + 1;
    if (cycleLower.includes('calendar') || nameLower.includes('calendar') || nameLower.includes('jan-jun')) {
      return `${nextYr}-01`;
    }
    if (card && card.renewal_date && String(card.renewal_date).length >= 7) {
      return String(card.renewal_date).slice(0, 7);
    }
    return `${nextYr}-03`;
  }

  function getDefaultCreditResetCycle(cr) {
    if (cr && cr.reset_cycle) return cr.reset_cycle;
    const nameLower = String((cr && (cr.name || cr.label)) || '').toLowerCase();
    if (nameLower.includes('4 yr') || nameLower.includes('global entry') || nameLower.includes('precheck')) {
      return 'Every 4 Years';
    }
    if (nameLower.includes('semi-annual') || nameLower.includes('jan-jun') || nameLower.includes('jul-dec')) {
      return 'Semi-Annually';
    }
    if (nameLower.includes('monthly') || nameLower.includes('/mo')) {
      return 'Monthly';
    }
    if (nameLower.includes('quarterly') || nameLower.includes('/qtr')) {
      return 'Quarterly';
    }
    return 'Annually';
  }

  function formatResetMonthDisplay(ymStr, cycleStr = 'Annually') {
    if (!ymStr) return `Next Renewal (${cycleStr})`;
    const clean = String(ymStr).slice(0, 7);
    const parts = clean.split('-');
    if (parts.length < 2) return `${ymStr} (${cycleStr})`;
    const yr = Number(parts[0]);
    const mo = Number(parts[1]) - 1;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const moName = months[mo] || parts[1];
    return `${moName} ${yr} (${cycleStr})`;
  }

  function daysUntilResetMonth(ymStr) {
    if (!ymStr) return 365;
    const clean = String(ymStr).slice(0, 7);
    const parts = clean.split('-');
    if (parts.length < 2) return daysUntilDate(ymStr);
    const yr = Number(parts[0]);
    const mo = Number(parts[1]) - 1;
    if (isNaN(yr) || isNaN(mo)) return 365;
    // Target first day of the reset month
    const target = new Date(yr, mo, 1);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((target - today) / (1000 * 60 * 60 * 24));
  }

  function advanceResetMonthByCycle(ymStr, cycleStr = 'Annually') {
    const clean = String(ymStr || '2027-03').slice(0, 7);
    const parts = clean.split('-');
    let yr = Number(parts[0]) || new Date().getFullYear();
    let mo = (Number(parts[1]) || 3) - 1;
    const cyc = String(cycleStr || 'Annually').toLowerCase();
    let addMonths = 12;
    if (cyc.includes('4 year')) addMonths = 48;
    else if (cyc.includes('semi')) addMonths = 6;
    else if (cyc.includes('quarter')) addMonths = 3;
    else if (cyc.includes('month')) addMonths = 1;

    const now = new Date();
    const curYm = now.getFullYear() * 12 + now.getMonth();
    let nextTotalMonths = yr * 12 + mo + addMonths;
    while (nextTotalMonths <= curYm) {
      nextTotalMonths += addMonths;
    }
    const nextYr = Math.floor(nextTotalMonths / 12);
    const nextMo = (nextTotalMonths % 12) + 1;
    return `${nextYr}-${String(nextMo).padStart(2, '0')}`;
  }

  function checkAndAutoResetExpiredCredits() {
    ensureRewardsStructure();
    const now = new Date();
    const curYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const resetNotices = [];

    for (const card of state.rewards.cards || []) {
      if (!Array.isArray(card.credits)) continue;
      for (const cr of card.credits) {
        if (!cr.reset_date) {
          cr.reset_date = getDefaultCreditResetMonth(card, cr);
        }
        if (!cr.reset_cycle) {
          cr.reset_cycle = getDefaultCreditResetCycle(cr);
        }
        const ym = String(cr.reset_date).slice(0, 7);
        const tot = Math.max(0, Number(cr.total_usd ?? cr.amount ?? 0));
        const used = Number(cr.used_usd ?? (cr.used ? tot : 0));
        // If current YYYY-MM is >= the credit's reset YYYY-MM, auto-reset back to full available amount
        if (ym && ym.length === 7 && curYm >= ym) {
          const nextYm = advanceResetMonthByCycle(ym, cr.reset_cycle);
          cr.reset_date = nextYm;
          if (used > 0 || cr.used) {
            cr.used_usd = 0;
            cr.used = false;
            resetNotices.push(`${cr.name || 'Credit'} (${fmtUsd(tot)} available again)`);
          }
        }
      }
    }

    if (resetNotices.length > 0 && hasCompletedServerBootstrap) {
      setTimeout(() => {
        saveRewardsState(`🔄 Auto-Reset on Schedule: ${resetNotices.join(', ')}!`);
      }, 60);
    }
  }

  function collectAllRewardsReminders() {
    ensureRewardsStructure();
    const reminders = [];
    let totalUnusedCreditsUsd = 0;

    // 1. Collect all Statement Credits with Available > $0 (or upcoming reset)
    for (const card of state.rewards.cards || []) {
      const credits = Array.isArray(card.credits) ? card.credits : [];
      credits.forEach((cr, idx) => {
        const tot = Math.max(0, Number(cr.total_usd ?? cr.amount ?? 0));
        const used = Math.min(tot, Math.max(0, cr.used_usd !== undefined ? Number(cr.used_usd) : (cr.used ? tot : 0)));
        const avail = Math.max(0, Number((tot - used).toFixed(2)));
        const resetDate = getDefaultCreditResetMonth(card, cr);
        const resetCycle = getDefaultCreditResetCycle(cr);
        const daysLeft = daysUntilResetMonth(resetDate);

        if (avail > 0) {
          totalUnusedCreditsUsd += avail;
          reminders.push({
            kind: 'credit',
            urgent: daysLeft <= 90,
            daysLeft,
            cardId: card.id,
            creditIdx: idx,
            cardName: card.name || 'Credit Card',
            title: cr.name || cr.label || 'Statement Credit',
            availUsd: avail,
            usedUsd: used,
            totalUsd: tot,
            dateDisplay: formatResetMonthDisplay(resetDate, resetCycle),
            subline: `Used ${fmtUsd(used)} of ${fmtUsd(tot)} • Resets ${formatResetMonthDisplay(resetDate, resetCycle)} back to ${fmtUsd(tot)}`
          });
        }
      });
    }

    // 2. Collect all Available Free Night Certificates & Perks
    for (const cert of state.rewards.certificates || []) {
      if (cert.status === 'redeemed') continue;
      const expDate = cert.expires_date || cert.expiration_date || '';
      const daysLeft = daysUntilDate(expDate);
      const valUsd = Number(cert.est_value_usd ?? cert.estimated_value_usd ?? 0);
      reminders.push({
        kind: 'cert',
        urgent: daysLeft <= 90,
        daysLeft,
        certId: cert.id,
        cardName: cert.program || cert.source_card || 'Loyalty Perk',
        title: cert.title || 'Free Night / Perk',
        availUsd: valUsd,
        usedUsd: 0,
        totalUsd: valUsd,
        dateDisplay: expDate ? `Use by ${expDate}` : 'Active Perk',
        subline: `${cert.cap_details ? cert.cap_details + ' • ' : ''}Est. Value ${fmtUsd(valUsd)}`
      });
    }

    // 3. Collect Active Sign-Up Bonus (SUB) Deadlines
    for (const card of state.rewards.cards || []) {
      if (!card.sub_active) continue;
      const cardName = card.name || 'Credit Card';
      const roadSpend = (state.expenses || [])
        .filter(e => (e.payment_method || '').toLowerCase() === cardName.toLowerCase())
        .reduce((s, e) => s + (Number(e.amount_usd) || 0), 0);
      const baseSpend = Number(card.sub_spent_manual_usd ?? card.sub_base_spend ?? 0);
      const totalSpent = baseSpend + roadSpend;
      const target = Math.max(1, Number(card.sub_target_usd ?? card.sub_spend_target ?? 4000));
      const remSpend = Math.max(0, target - totalSpent);
      if (remSpend > 0) {
        const daysLeft = daysUntilDate(card.sub_deadline);
        reminders.push({
          kind: 'sub',
          urgent: daysLeft <= 60,
          daysLeft,
          cardId: card.id,
          cardName,
          title: `SUB: ${card.sub_bonus_label || 'Welcome Bonus'}`,
          availUsd: remSpend,
          usedUsd: totalSpent,
          totalUsd: target,
          dateDisplay: card.sub_deadline ? `Spend by ${card.sub_deadline}` : 'In Progress',
          subline: `${fmtUsd(remSpend)} more spend needed (${fmtUsd(totalSpent)} / ${fmtUsd(target)})`
        });
      }
    }

    reminders.sort((a, b) => a.daysLeft - b.daysLeft);
    return { reminders, totalUnusedCreditsUsd };
  }

  function updateSidebarQuickRewardsWidget() {
    return withOwnerScopedRewards(updateSidebarQuickRewardsWidgetInner);
  }

  function updateSidebarQuickRewardsWidgetInner() {
    ensureRewardsStructure();
    const metrics = computeRewardsMetrics();
    const { reminders, totalUnusedCreditsUsd } = collectAllRewardsReminders();

    // 1. Sidebar Nav Badge ("$83 Left" or "$2.6k")
    const navBadge = document.getElementById('badge-quick-rewards-avail');
    if (navBadge) {
      if (totalUnusedCreditsUsd > 0) {
        navBadge.textContent = `${fmtUsdCompact(totalUnusedCreditsUsd)} Left`;
      } else {
        navBadge.textContent = `${metrics.availableCertsCount} Perks`;
      }
    }

    // 2. Points & Miles row
    const ptsEl = document.getElementById('sq-points-val');
    if (ptsEl) {
      const kPts = metrics.totalPoints >= 1000 ? `${Math.round(metrics.totalPoints / 1000).toLocaleString('en-US')}k pts` : `${metrics.totalPoints} pts`;
      ptsEl.textContent = `${fmtUsdCompact(metrics.totalPointsValueUsd)} (${kPts})`;
    }

    // 3. Reward Available (Statement Credits) row
    const credEl = document.getElementById('sq-credits-avail');
    if (credEl) {
      credEl.textContent = `${fmtUsd(totalUnusedCreditsUsd)} Avail`;
      credEl.className = `sq-val mono ${totalUnusedCreditsUsd > 0 ? 'highlight-green' : ''}`;
    }

    // 4. Free Nights & Perks row
    const certsEl = document.getElementById('sq-certs-avail');
    if (certsEl) {
      certsEl.textContent = `${metrics.availableCertsCount} Avail (${fmtUsdCompact(metrics.availableCertsValueUsd)})`;
    }

    // 5. Next Reset / Use-By Reminder row
    const remEl = document.getElementById('sq-next-reminder');
    if (remEl) {
      const nextRem = reminders[0];
      if (nextRem) {
        const shortDate = String(nextRem.dateDisplay || '').replace(/\s*\(.*?\)/g, '');
        const dText = nextRem.daysLeft < 900 ? ` • ${nextRem.daysLeft}d` : '';
        remEl.textContent = `${shortDate}${dText}`;
      } else {
        remEl.textContent = 'All Caught Up ✓';
        remEl.className = 'sq-val mono highlight-green';
      }
    }
  }

  function renderQuickRewardsModalContent() {
    return withOwnerScopedRewards(renderQuickRewardsModalContentInner);
  }

  function renderQuickRewardsModalContentInner() {
    ensureRewardsStructure();
    checkAndAutoResetExpiredCredits();
    const body = document.getElementById('qr-modal-body');
    if (!body) return;

    const metrics = computeRewardsMetrics();
    const { reminders, totalUnusedCreditsUsd } = collectAllRewardsReminders();
    const totalAllBankroll = metrics.totalPointsValueUsd + metrics.availableCertsValueUsd + totalUnusedCreditsUsd;

    const hdrBadge = document.getElementById('qr-modal-header-badge');
    if (hdrBadge) {
      hdrBadge.textContent = `${fmtUsd(totalUnusedCreditsUsd)} Reward Available • ${fmtUsdCompact(totalAllBankroll)} Total Value`;
    }

    // 1. Top 5 Executive Snapshot Tiles
    const kpiStripHtml = `
      <div class="qr-kpi-strip">
        <div class="qr-kpi-tile" style="border-color: rgba(16, 185, 129, 0.4); background: rgba(16, 185, 129, 0.06);">
          <span class="qr-kpi-label">💚 Reward Available (Credits)</span>
          <span class="qr-kpi-val mono" style="color: var(--accent-primary);">${fmtUsd(totalUnusedCreditsUsd)}</span>
          <span class="qr-kpi-sub">Used ${fmtUsd(metrics.totalCreditsUsed)} of ${fmtUsd(metrics.totalCreditsAvailable)} total</span>
        </div>
        <div class="qr-kpi-tile">
          <span class="qr-kpi-label">💎 Points &amp; Miles Value</span>
          <span class="qr-kpi-val mono" style="color: var(--accent-sky);">${fmtUsdCompact(metrics.totalPointsValueUsd)}</span>
          <span class="qr-kpi-sub">${metrics.totalPoints.toLocaleString('en-US')} pts across ${state.rewards.programs.length} programs</span>
        </div>
        <div class="qr-kpi-tile">
          <span class="qr-kpi-label">🎟️ Free Nights &amp; Perks</span>
          <span class="qr-kpi-val mono" style="color: var(--accent-purple);">${metrics.availableCertsCount} Avail (${fmtUsdCompact(metrics.availableCertsValueUsd)})</span>
          <span class="qr-kpi-sub">${metrics.expiringSoonCertsCount > 0 ? `⚠️ ${metrics.expiringSoonCertsCount} expiring <60d` : 'Hotel certs &amp; companion passes'}</span>
        </div>
        <div class="qr-kpi-tile">
          <span class="qr-kpi-label">🏦 Total Travel Bankroll</span>
          <span class="qr-kpi-val mono" style="color: var(--accent-amber);">${fmtUsdCompact(totalAllBankroll)}</span>
          <span class="qr-kpi-sub">Points + Free Nights + Unused Credits</span>
        </div>
        <div class="qr-kpi-tile">
          <span class="qr-kpi-label">📊 Net Annual Fee ROI</span>
          <span class="qr-kpi-val mono" style="color: ${metrics.netCardKeeperValue >= 0 ? 'var(--accent-primary)' : 'var(--accent-amber)'};">
            ${metrics.netCardKeeperValue >= 0 ? '+' : ''}${fmtUsdCompact(metrics.netCardKeeperValue)}
          </span>
          <span class="qr-kpi-sub">${fmtUsdCompact(metrics.totalAnnualFees)}/yr total card fees</span>
        </div>
      </div>
    `;

    // 2. Action Required: "Reward Available" Statement Credits, Reset Dates & Use-By Reminders
    const remindersRowsHtml = reminders.length === 0
      ? `<div style="padding: 14px; text-align: center; color: var(--text-muted); font-size: 12.5px;">🎉 You have 0 unused statement credits or expiring perks right now!</div>`
      : reminders.map(r => {
          const daysBadge = r.daysLeft < 0
            ? `⚠️ Past Date`
            : r.daysLeft <= 60
            ? `🔴 ${r.daysLeft}d left`
            : r.daysLeft <= 120
            ? `🟡 ${r.daysLeft}d left`
            : `🟢 ${r.daysLeft < 900 ? `${r.daysLeft}d left` : 'Active'}`;

          return `
            <div class="qr-compact-row" style="${r.urgent ? 'border-color: rgba(245, 158, 11, 0.45); background: rgba(245, 158, 11, 0.05);' : ''}">
              <div style="min-width: 0; flex: 1;">
                <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                  <span style="font-size: 10.5px; font-weight: 800; text-transform: uppercase; color: var(--text-muted);">
                    ${r.kind === 'credit' ? '💳 ' : r.kind === 'cert' ? '🎟️ ' : '🎯 '}${escapeHtml(r.cardName)}
                  </span>
                  <span class="kpi-tag ${r.urgent ? 'warning' : 'sky'}" style="font-size: 10px; padding: 1px 6px;">
                    🔄 ${escapeHtml(r.dateDisplay)} • ${daysBadge}
                  </span>
                </div>
                <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin-top: 2px;">${escapeHtml(r.title)}</div>
                <div style="font-size: 11px; color: var(--text-secondary); margin-top: 1px;">${escapeHtml(r.subline)}</div>
              </div>
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span class="credit-avail-pill">
                  ${r.kind === 'sub' ? `${fmtUsd(r.availUsd)} To Go` : `Reward Available: ${fmtUsd(r.availUsd)}`}
                </span>
                ${r.kind === 'credit' ? `
                  <button type="button" class="btn btn-sm" style="padding: 3px 8px; font-size: 11px;" data-qr-edit-card="${escapeHtml(r.cardId)}">✎ Update Credit</button>
                ` : r.kind === 'cert' ? `
                  <button type="button" class="btn btn-sm btn-primary" style="padding: 3px 8px; font-size: 11px;" data-toggle-rcert="${escapeHtml(r.certId)}">✓ Mark Used</button>
                ` : `
                  <button type="button" class="btn btn-sm" style="padding: 3px 8px; font-size: 11px;" data-qr-edit-card="${escapeHtml(r.cardId)}">✎ Update SUB</button>
                `}
              </div>
            </div>
          `;
        }).join('');

    const remindersSectionHtml = `
      <div class="qr-section-box" style="border-color: rgba(245, 158, 11, 0.35);">
        <div class="qr-section-header" style="background: linear-gradient(90deg, rgba(245, 158, 11, 0.12), rgba(16, 185, 129, 0.06));">
          <h4>⏰ Unused Credits ("Reward Available"), Reset Dates &amp; Use-By Reminders</h4>
          <span class="kpi-tag ${totalUnusedCreditsUsd > 0 ? 'warning' : 'positive'}" style="font-size: 11px;">
            ${fmtUsd(totalUnusedCreditsUsd)} Reward Available Across Cards
          </span>
        </div>
        <div class="qr-compact-list">
          ${remindersRowsHtml}
        </div>
      </div>
    `;

    // 3. Two-Column Grid: Loyalty Balances & Miles (Left) + Credit Cards & Best Card to Swipe (Right)
    const progs = state.rewards.programs || [];
    const progRowsHtml = progs.length === 0
      ? `<div style="padding: 12px; color: var(--text-muted); font-size: 12px;">No loyalty programs added yet.</div>`
      : progs.map(p => {
          const meta = ECOSYSTEM_META[p.ecosystem] || ECOSYSTEM_META.other;
          const pts = Number(p.points ?? p.balance ?? 0);
          const cpp = Number(p.cpp ?? p.cpp_valuation ?? 1.5);
          const valUsd = (pts * cpp) / 100;
          const qCur = Number(p.qualifying_nights ?? p.qualifying_current ?? 0);
          const qTgt = Number(p.target_nights ?? p.qualifying_target ?? 0);
          return `
            <div class="qr-compact-row">
              <div style="min-width: 0; flex: 1;">
                <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                  <span style="font-size: 13px; font-weight: 700; color: var(--text-primary);">${meta.icon} ${escapeHtml(p.name)}</span>
                  ${ownerBadgeHtml(p, 'xs')}
                  ${p.status_tier ? `<span class="kpi-tag sky" style="font-size: 10px; padding: 1px 6px;">★ ${escapeHtml(p.status_tier)}</span>` : ''}
                </div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                  ${p.member_id ? `ID: <span class="mono">${escapeHtml(p.member_id)}</span> • ` : ''}
                  ${qTgt > 0 ? `Progress: ${qCur}/${qTgt} nights • ` : ''}
                  Valued @ ${cpp.toFixed(2)}¢/pt
                </div>
              </div>
              <div style="text-align: right; display: flex; align-items: center; gap: 10px;">
                <div>
                  <div class="mono" style="font-size: 13.5px; font-weight: 800; color: var(--accent-primary);">
                    ${pts.toLocaleString('en-US')} <span style="font-size: 10.5px; font-weight: 600; color: var(--text-muted);">pts</span>
                  </div>
                  <div class="mono" style="font-size: 11px; color: var(--text-secondary);">≈ ${fmtUsd(valUsd)}</div>
                </div>
                <button type="button" class="btn btn-sm" style="padding: 2px 7px; font-size: 10.5px;" data-qr-edit-prog="${escapeHtml(p.id)}" title="Edit Program">✎</button>
              </div>
            </div>
          `;
        }).join('');

    const cards = state.rewards.cards || [];
    const cardRowsHtml = cards.length === 0
      ? `<div style="padding: 12px; color: var(--text-muted); font-size: 12px;">No credit cards added yet.</div>`
      : cards.map(c => {
          const credits = Array.isArray(c.credits) ? c.credits : [];
          let cTot = 0;
          let cUsed = 0;
          credits.forEach(cr => {
            const t = Math.max(0, Number(cr.total_usd ?? cr.amount ?? 0));
            const u = Math.min(t, Math.max(0, cr.used_usd !== undefined ? Number(cr.used_usd) : (cr.used ? t : 0)));
            cTot += t;
            cUsed += u;
          });
          const cAvail = Math.max(0, Number((cTot - cUsed).toFixed(2)));
          return `
            <div class="qr-compact-row">
              <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;">
                ${renderCreditCardArtHtml(c, 'cc-art-xs')}
                <div style="min-width: 0; flex: 1;">
                  <div style="font-size: 13px; font-weight: 700; color: var(--text-primary);">${escapeHtml(c.name)} ${ownerBadgeHtml(c, 'xs')}</div>
                  <div style="font-size: 11px; color: var(--text-secondary); margin-top: 1px;">
                    ${escapeHtml(c.multipliers || c.best_for || 'Travel Rewards')}
                  </div>
                  <div style="font-size: 10.5px; color: var(--text-muted); margin-top: 2px;">
                    Fee: ${fmtUsd(c.annual_fee || 0)}/yr ${c.renewal_date ? `• Renews ${escapeHtml(c.renewal_date)}` : ''}
                  </div>
                </div>
              </div>
              <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                ${cTot > 0 ? `
                  <span class="credit-avail-pill ${cAvail === 0 ? 'zero' : ''}" style="font-size: 10.5px; padding: 2px 7px;">
                    ${cAvail > 0 ? `${fmtUsd(cAvail)} Avail` : `✓ ${fmtUsd(cTot)} Used`}
                  </span>
                ` : ''}
                <button type="button" class="btn btn-sm" style="padding: 2px 7px; font-size: 10.5px;" data-qr-edit-card="${escapeHtml(c.id)}">✎ Edit</button>
              </div>
            </div>
          `;
        }).join('');

    const twoColHtml = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: 14px;">
        <div class="qr-section-box">
          <div class="qr-section-header">
            <h4>💎 Loyalty Balances, Miles &amp; Elite Status (${progs.length})</h4>
            <span class="mono" style="font-size: 11.5px; font-weight: 700; color: var(--accent-primary);">${fmtUsd(metrics.totalPointsValueUsd)} Total</span>
          </div>
          <div class="qr-compact-list">
            ${progRowsHtml}
          </div>
        </div>

        <div class="qr-section-box">
          <div class="qr-section-header">
            <h4>💳 Travel Credit Cards &amp; Statement Credits (${cards.length})</h4>
            <span class="mono" style="font-size: 11.5px; font-weight: 700; color: var(--accent-amber);">${fmtUsd(totalUnusedCreditsUsd)} Unused</span>
          </div>
          <div class="qr-compact-list">
            ${cardRowsHtml}
          </div>
        </div>
      </div>
    `;

    // 4. Best Card to Swipe Cheat Sheet
    const swipeHtml = `
      <div class="qr-section-box">
        <div class="qr-section-header">
          <h4>🎯 Quick Cheat Sheet — Best Card to Swipe by Spend Category</h4>
          <span style="font-size: 11px; color: var(--text-muted);">Maximize points on every shoot</span>
        </div>
        <div style="padding: 12px; display: grid; grid-template-columns: repeat(auto-fit, minmax(175px, 1fr)); gap: 8px;">
          <div style="padding: 8px 10px; border-radius: var(--radius-sm); background: var(--bg-elevated); border: 1px solid var(--border-subtle);">
            <div style="font-size: 10.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">✈️ Flights &amp; Portals</div>
            <div style="font-size: 12px; font-weight: 700; color: var(--text-primary); margin-top: 2px;">Venture X (5x) / Amex Plat (5x) / CSR (4x)</div>
          </div>
          <div style="padding: 8px 10px; border-radius: var(--radius-sm); background: var(--bg-elevated); border: 1px solid var(--border-subtle);">
            <div style="font-size: 10.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">🏨 Hotels &amp; Lodging</div>
            <div style="font-size: 12px; font-weight: 700; color: var(--text-primary); margin-top: 2px;">Venture X (10x Portal) / Hilton Aspire (14x)</div>
          </div>
          <div style="padding: 8px 10px; border-radius: var(--radius-sm); background: var(--bg-elevated); border: 1px solid var(--border-subtle);">
            <div style="font-size: 10.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">🍽️ Crew Dining &amp; Restaurants</div>
            <div style="font-size: 12px; font-weight: 700; color: var(--text-primary); margin-top: 2px;">Amex Gold (4x) / Bilt (3x) / CSR (3x)</div>
          </div>
          <div style="padding: 8px 10px; border-radius: var(--radius-sm); background: var(--bg-elevated); border: 1px solid var(--border-subtle);">
            <div style="font-size: 10.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">🎥 Gear, Permits &amp; Catch-All</div>
            <div style="font-size: 12px; font-weight: 700; color: var(--text-primary); margin-top: 2px;">Capital One Venture X (2x Everywhere)</div>
          </div>
        </div>
      </div>
    `;

    body.innerHTML = kpiStripHtml + remindersSectionHtml + twoColHtml + swipeHtml;
  }

  function openQuickRewardsModal() {
    renderOwnerFilterBars();
    renderQuickRewardsModalContent();
    openModal('modal-quick-rewards');
  }

  function renderRewardsRemindersHub() {
    const grid = document.getElementById('rewards-reminders-grid');
    const summaryBadge = document.getElementById('reminders-avail-summary-badge');
    if (!grid) return;

    document.querySelectorAll('#rewards-reminders-filter-chips [data-rem-filter]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-rem-filter') === activeRemindersFilter);
    });

    const { reminders, totalUnusedCreditsUsd } = collectAllRewardsReminders();

    if (summaryBadge) {
      summaryBadge.textContent = `${fmtUsd(totalUnusedCreditsUsd)} in Unused Statement Credits Available`;
      summaryBadge.className = `kpi-tag ${totalUnusedCreditsUsd > 0 ? 'warning' : 'positive'}`;
    }

    const filtered = reminders.filter(r => {
      if (activeRemindersFilter === 'credits') return r.kind === 'credit';
      if (activeRemindersFilter === 'certs') return r.kind === 'cert';
      if (activeRemindersFilter === 'urgent') return r.urgent;
      return true;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 12px; font-size: 12.5px; color: var(--text-muted); text-align: center;">
          🎉 All statement credits and perks in this filter are 100% captured or up to date!
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(r => {
      const daysBadge = r.daysLeft < 0
        ? `⚠️ Past Date`
        : r.daysLeft <= 60
        ? `🔴 ${r.daysLeft}d left`
        : r.daysLeft <= 120
        ? `🟡 ${r.daysLeft}d left`
        : `🟢 ${r.daysLeft < 900 ? `${r.daysLeft}d left` : 'Active'}`;

      return `
        <div class="reminder-card ${r.urgent ? 'urgent' : ''}">
          <div style="min-width: 0; flex: 1;">
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 3px;">
              <span style="font-size: 10.5px; font-weight: 700; text-transform: uppercase; color: var(--text-muted);">
                ${r.kind === 'credit' ? '💳 ' : r.kind === 'cert' ? '🎟️ ' : '🎯 '}${escapeHtml(r.cardName)}
              </span>
              <span class="kpi-tag ${r.urgent ? 'danger' : 'sky'}" style="font-size: 10px; padding: 1px 6px;">
                🔄 ${escapeHtml(r.dateDisplay)} • ${daysBadge}
              </span>
            </div>
            <div style="font-size: 13px; font-weight: 700; color: var(--text-primary);">${escapeHtml(r.title)}</div>
            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">${escapeHtml(r.subline)}</div>
          </div>
          <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 5px;">
            <span class="credit-avail-pill">
              ${r.kind === 'sub' ? `${fmtUsd(r.availUsd)} To Go` : `Reward Available: ${fmtUsd(r.availUsd)}`}
            </span>
            <div style="display: flex; gap: 4px;">
              ${r.kind === 'credit' ? `
                <button type="button" class="btn btn-sm" style="padding: 2px 7px; font-size: 10.5px;" data-edit-rcard="${escapeHtml(r.cardId)}" title="Edit Credit or Reset Date">✎ Edit</button>
              ` : r.kind === 'cert' ? `
                <button type="button" class="btn btn-sm btn-primary" style="padding: 2px 7px; font-size: 10.5px;" data-toggle-rcert="${escapeHtml(r.certId)}">✓ Mark Used</button>
              ` : `
                <button type="button" class="btn btn-sm" style="padding: 2px 7px; font-size: 10.5px;" data-edit-rcard="${escapeHtml(r.cardId)}">✎ Update</button>
              `}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderRewardsDashboard() {
    ensureRewardsStructure();
    checkAndAutoResetExpiredCredits();
    renderOwnerFilterBars();
    return withOwnerScopedRewards(renderRewardsDashboardInner);
  }

  function renderRewardsDashboardInner() {
    const metrics = computeRewardsMetrics();

    // Update sidebar badge
    const sideBadge = document.getElementById('badge-rewards-value');
    if (sideBadge) {
      sideBadge.textContent = fmtUsdCompact(metrics.totalPortfolioValueUsd);
    }

    // Update sub-tab count badges
    const bProg = document.getElementById('r-badge-programs');
    if (bProg) bProg.textContent = state.rewards.programs.length;
    const bCerts = document.getElementById('r-badge-certs');
    if (bCerts) bCerts.textContent = `${metrics.availableCertsCount} avail`;
    const bCards = document.getElementById('r-badge-cards');
    if (bCards) bCards.textContent = state.rewards.cards.length;
    const bRed = document.getElementById('r-badge-redemptions');
    if (bRed) bRed.textContent = state.rewards.redemptions.length;

    const totalUnusedCredits = Math.max(0, metrics.totalCreditsAvailable - metrics.totalCreditsUsed);

    // Render 5 Portfolio Summary KPIs into #rewards-kpi-grid
    const kpiGrid = document.getElementById('rewards-kpi-grid');
    if (kpiGrid) {
      kpiGrid.innerHTML = `
        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Points &amp; Miles Value</span>
            <span class="kpi-tag positive">${fmtUsdCompact(metrics.bankPointsValueUsd)} Transferable</span>
          </div>
          <div class="kpi-value tabular" style="color: var(--accent-primary);">${fmtUsdCompact(metrics.totalPointsValueUsd)}</div>
          <span class="kpi-subtext">${metrics.totalPoints.toLocaleString('en-US')} total pts across ${state.rewards.programs.length} programs</span>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Free Nights &amp; Perks Vault</span>
            <span class="kpi-tag ${metrics.expiringSoonCertsCount > 0 ? 'warning' : 'sky'}">
              ${metrics.expiringSoonCertsCount > 0 ? `${metrics.expiringSoonCertsCount} Expiring <60d` : 'All Current'}
            </span>
          </div>
          <div class="kpi-value tabular">${metrics.availableCertsCount} Avail <span style="font-size: 14px; color: var(--text-secondary);">(${fmtUsdCompact(metrics.availableCertsValueUsd)})</span></div>
          <span class="kpi-subtext">Hotel Free Nights, Companion &amp; Suite Upgrades</span>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Total Travel Bankroll</span>
            <span class="kpi-tag positive">Points + Certs</span>
          </div>
          <div class="kpi-value tabular" style="color: var(--accent-amber);">${fmtUsdCompact(metrics.totalPortfolioValueUsd)}</div>
          <span class="kpi-subtext">Purchasing power ready for upcoming shoots</span>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Statement Credits &amp; Available</span>
            <span class="kpi-tag ${totalUnusedCredits > 0 ? 'warning' : 'positive'}">
              ${fmtUsd(totalUnusedCredits)} Reward Available
            </span>
          </div>
          <div class="kpi-value tabular">${fmtUsd(metrics.totalCreditsUsed)} <span style="font-size: 14px; color: var(--text-muted);">/ ${fmtUsdCompact(metrics.totalCreditsAvailable)} Used</span></div>
          <span class="kpi-subtext"><strong style="color: var(--accent-primary);">${fmtUsd(totalUnusedCredits)} available</strong> to use before reset dates</span>
        </div>

        <div class="kpi-card">
          <div class="kpi-header">
            <span class="kpi-label">Cash Saved on Trips</span>
            <span class="kpi-tag positive">${metrics.avgRedemptionCpp.toFixed(2)}¢ / pt avg</span>
          </div>
          <div class="kpi-value tabular" style="color: var(--accent-primary);">${fmtUsdCompact(metrics.totalRedemptionSavedUsd)}</div>
          <span class="kpi-subtext">${state.rewards.redemptions.length} award bookings logged on shoots</span>
        </div>
      `;
    }

    // Toggle active sub-tab & pane
    const tabs = ['programs', 'certs', 'cards', 'matrix', 'redemptions', 'advisor'];
    document.querySelectorAll('.rewards-subnav [data-rewards-tab]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-rewards-tab') === state.rewardsTab);
    });
    for (const t of tabs) {
      const pane = document.getElementById(`rewards-pane-${t}`);
      if (pane) pane.style.display = t === state.rewardsTab ? 'block' : 'none';
    }

    updateSidebarQuickRewardsWidget();
    renderRewardsRemindersHub();
    renderRewardsProgramsTab();
    renderRewardsCertsTab();
    renderRewardsCardsTab();
    renderRewardsMatrixTab();
    renderRewardsRedemptionsTab();
    renderAiTripAdvisorTab();

    const qrModal = document.getElementById('modal-quick-rewards');
    if (qrModal && qrModal.classList.contains('open')) {
      renderQuickRewardsModalContent();
    }
    const mdModal = document.getElementById('modal-reward-mini-dashboard');
    if (mdModal && mdModal.classList.contains('open') && activeMiniDashboardState.id) {
      renderRewardMiniDashboard();
    }
  }

  // Track active inline mini-tabs per card and active Mini-Dashboard modal state
  const activeProgramCardMiniTabs = {};
  const activeCreditCardMiniTabs = {};
  const expandedCreditDrawers = {};
  const activeCustomFieldsDrawers = {};
  let activeEditingCustomFieldKey = null;
  let activeMiniDashboardState = { kind: 'program', id: '', tab: 'overview' };
  let activeQuickBalanceProgId = null;

  function getSyncedCustomFields(prog, card) {
    const pFields = prog && Array.isArray(prog.custom_fields) ? prog.custom_fields : [];
    const cFields = card && Array.isArray(card.custom_fields) ? card.custom_fields : [];
    const raw = mergeCustomFieldsArrays(pFields, cFields);
    return raw.map((f, idx) => ({
      id: f.id || `cf-${idx}`,
      label: String(f.label || f.key || 'Custom Field').trim(),
      value: String(f.value || '').trim(),
      checked: Boolean(f.checked)
    }));
  }

  function syncCustomFieldsToItems(prog, card, nextFields) {
    const cleaned = (Array.isArray(nextFields) ? nextFields : []).map((f, idx) => ({
      id: f.id || `cf-${Date.now()}-${idx}`,
      label: String(f.label || 'Custom Field').trim(),
      value: String(f.value || '').trim(),
      checked: Boolean(f.checked)
    }));
    if (prog) prog.custom_fields = JSON.parse(JSON.stringify(cleaned));
    if (card) card.custom_fields = JSON.parse(JSON.stringify(cleaned));
  }

  function resolveCustomFieldsTarget(ownerKey) {
    const raw = String(ownerKey || '');
    const colonIdx = raw.indexOf(':');
    if (colonIdx === -1) return { kind: 'program', id: raw, prog: null, card: null, fields: [] };
    const kind = raw.slice(0, colonIdx);
    const id = raw.slice(colonIdx + 1);
    const fullRewards = (state.rewards && state.rewards.__full) || state.rewards || {};
    let prog = null;
    let card = null;
    if (kind === 'program') {
      prog = (fullRewards.programs || []).find(p => p.id === id) || null;
      if (prog) {
        const linked = (fullRewards.cards || []).filter(c => sameOwner(c, prog) && doesCardMatchProgram(c, prog));
        card = linked[0] || null;
      }
    } else {
      card = (fullRewards.cards || []).find(c => c.id === id) || null;
      if (card) {
        prog = (fullRewards.programs || []).find(p => sameOwner(card, p) && doesCardMatchProgram(card, p)) || null;
      }
    }
    const fields = getSyncedCustomFields(prog, card);
    return { kind, id, prog, card, fields };
  }

  function renderCardCustomChecklistHtml(kind, id, prog, card) {
    const ownerKey = `${kind}:${id}`;
    const fields = getSyncedCustomFields(prog, card);
    const isDrawerOpen = Boolean(activeCustomFieldsDrawers[ownerKey]);
    if (fields.length === 0 && !isDrawerOpen) return '';

    const cardCredits = card && Array.isArray(card.credits) ? card.credits : [];

    return `
      <div class="reward-custom-checklist" data-cf-list-owner="${escapeHtml(ownerKey)}">
        ${fields.map((f, idx) => {
          const editKey = `${ownerKey}:${idx}`;
          const isEditingRow = activeEditingCustomFieldKey === editKey;
          if (isEditingRow) {
            return `
              <div
                class="reward-custom-check-row is-editing"
                data-cf-edit-row="${escapeHtml(editKey)}"
                style="flex-wrap: wrap; gap: 5px;"
              >
                <input
                  type="text"
                  class="form-input form-input-sm"
                  style="flex: 1 1 130px; min-width: 110px; height: 24px; font-size: 11px; padding: 0 7px;"
                  placeholder="Benefit / Field name"
                  value="${escapeHtml(f.label)}"
                  data-cf-edit-label="${escapeHtml(editKey)}"
                />
                <input
                  type="text"
                  class="form-input form-input-sm"
                  style="flex: 0 1 85px; min-width: 70px; height: 24px; font-size: 11px; padding: 0 7px;"
                  placeholder="Val / Note"
                  value="${escapeHtml(f.value)}"
                  data-cf-edit-val="${escapeHtml(editKey)}"
                />
                <button
                  type="button"
                  class="btn btn-primary btn-sm"
                  style="height: 24px; padding: 0 8px; font-size: 11px;"
                  data-save-cf-edit="${escapeHtml(ownerKey)}"
                  data-cf-idx="${idx}"
                  title="Save changes"
                >✓</button>
                <button
                  type="button"
                  class="btn btn-sm"
                  style="height: 24px; padding: 0 6px; font-size: 11px;"
                  data-cancel-cf-edit="1"
                  title="Cancel"
                >✕</button>
              </div>
            `;
          }
          return `
            <div
              class="reward-custom-check-row ${f.checked ? 'is-checked' : ''}"
              draggable="true"
              data-drag-cf-owner="${escapeHtml(ownerKey)}"
              data-drag-cf-idx="${idx}"
            >
              <span
                class="reward-cf-drag-handle"
                data-move-cf-top="${escapeHtml(ownerKey)}"
                data-move-cf-idx="${idx}"
                title="Drag to reorder custom field (or double-click to move to top/bottom)"
              >⠿</span>
              <label class="reward-cf-check-label">
                <input
                  type="checkbox"
                  class="reward-cf-checkbox"
                  data-toggle-cf-check="${escapeHtml(ownerKey)}"
                  data-cf-idx="${idx}"
                  ${f.checked ? 'checked' : ''}
                />
                <span class="reward-cf-text">${escapeHtml(f.label)}</span>
              </label>
              ${f.value ? `<span class="reward-cf-val mono">${escapeHtml(f.value)}</span>` : ''}
              <button
                type="button"
                class="reward-cf-edit-btn"
                data-edit-cf-item="${escapeHtml(ownerKey)}"
                data-cf-idx="${idx}"
                title="Edit custom field"
              >✏️</button>
              <button
                type="button"
                class="reward-cf-del-btn"
                data-del-cf-item="${escapeHtml(ownerKey)}"
                data-cf-idx="${idx}"
                title="Remove custom field"
              >✕</button>
            </div>
          `;
        }).join('')}

        ${isDrawerOpen ? `
          <div class="reward-cf-inline-adder" data-cf-adder-box="${escapeHtml(ownerKey)}">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; flex-wrap: wrap;">
              <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: var(--accent-primary);">
                ☑️ Add Custom Checkbox Field
              </span>
              <div style="display: inline-flex; align-items: center; gap: 4px;">
                ${cardCredits.length > 0 ? `
                  <button
                    type="button"
                    class="btn btn-sm"
                    style="padding: 1px 6px; font-size: 10px;"
                    data-import-credits-to-cf="${escapeHtml(ownerKey)}"
                    title="Auto-import this card's statement credits as custom checkboxes"
                  >
                    ⚡ Import Card Credits
                  </button>
                ` : ''}
                <button
                  type="button"
                  class="btn btn-sm"
                  style="padding: 0 5px; font-size: 10px;"
                  data-toggle-cf-drawer="${escapeHtml(ownerKey)}"
                  title="Close"
                >✕</button>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 5px; flex-wrap: wrap;">
              <input
                type="text"
                class="form-input form-input-sm"
                style="flex: 1; min-width: 135px; font-size: 11.5px; padding: 4px 7px;"
                placeholder="e.g., $150 Delta Stays Credit or Companion Pass"
                data-cf-new-label="${escapeHtml(ownerKey)}"
              />
              <input
                type="text"
                class="form-input form-input-sm mono"
                style="width: 76px; font-size: 11.5px; padding: 4px 7px;"
                placeholder="$ / Note"
                data-cf-new-val="${escapeHtml(ownerKey)}"
              />
              <button
                type="button"
                class="btn btn-sm btn-primary"
                style="padding: 4px 9px; font-size: 11px;"
                data-add-cf-submit="${escapeHtml(ownerKey)}"
              >
                + Add
              </button>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  function renderQuickPointsBlockHtml(prog, alignRight = false, cfTarget = null) {
    if (!prog) return '';
    const pts = Number(prog.points ?? prog.balance ?? 0);
    const isEditing = activeQuickBalanceProgId === prog.id;

    if (isEditing) {
      return `
        <div class="quick-points-editor-box" data-qp-box="${escapeHtml(prog.id)}">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 10.5px; font-weight: 800; color: var(--accent-primary); text-transform: uppercase;">
            <span>⚡ Quick Update Points / Miles (${pts.toLocaleString('en-US')} current)</span>
            <button type="button" class="btn btn-sm" style="padding: 0 5px; font-size: 10px; line-height: 1.4;" data-qp-cancel="1" title="Cancel (Esc)">✕</button>
          </div>
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <input
              type="number"
              step="1"
              class="quick-points-input mono"
              data-qp-input="${escapeHtml(prog.id)}"
              value="${pts}"
              placeholder="Enter points..."
            />
            <button
              type="button"
              class="btn btn-sm btn-primary"
              style="padding: 5px 10px; font-size: 11px;"
              data-qp-save-set="${escapeHtml(prog.id)}"
              title="Set total balance to this exact number (or press Enter)"
            >
              ✓ Set Balance
            </button>
            <button
              type="button"
              class="btn btn-sm"
              style="padding: 5px 9px; font-size: 11px;"
              data-qp-save-add="${escapeHtml(prog.id)}"
              title="Add this number onto your current ${pts.toLocaleString('en-US')} pts"
            >
              + Add to Current
            </button>
          </div>
          <div style="font-size: 10px; color: var(--text-muted);">
            Tip: Type new total &amp; press <strong>Enter</strong> (or click <strong>+ Add to Current</strong> to add miles earned).
          </div>
        </div>
      `;
    }

    let cfBtnHtml = '';
    if (cfTarget && !alignRight) {
      const ownerKey = `${cfTarget.kind}:${cfTarget.id}`;
      const fields = getSyncedCustomFields(cfTarget.prog || prog, cfTarget.card || null);
      const checkedCount = fields.filter(f => f.checked).length;
      const isDrawerOpen = Boolean(activeCustomFieldsDrawers[ownerKey]);
      cfBtnHtml = `
        <button
          type="button"
          class="qp-custom-fields-btn ${isDrawerOpen ? 'active' : ''}"
          data-toggle-cf-drawer="${escapeHtml(ownerKey)}"
          title="Add or manage custom checkbox fields above the Details area"
        >
          ☑️ Custom Fields${fields.length > 0 ? ` (${checkedCount}/${fields.length})` : ''}
        </button>
      `;
    }

    return `
      <div
        class="quick-points-trigger"
        style="${alignRight ? 'align-items: flex-end; text-align: right;' : 'width: 100%;'}"
      >
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%;" data-quick-points-open="${escapeHtml(prog.id)}" title="Click to quickly update or add points/miles without opening Edit">
          <span style="font-size: 10.5px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700;">
            Points / Miles Available
          </span>
          <span class="qp-edit-hint">⚡ Quick Edit</span>
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; margin-top: 2px;">
          <div class="mono tabular" style="font-size: 22px; font-weight: 800; color: var(--text-primary); line-height: 1.2;" data-quick-points-open="${escapeHtml(prog.id)}" title="Click to quickly update points/miles">
            ${pts.toLocaleString('en-US')} <span style="font-size: 12px; font-weight: 500; color: var(--text-muted);">pts</span>
          </div>
          ${cfBtnHtml}
        </div>
      </div>
    `;
  }

  function resolveRewardWebsiteUrl(item, isCard = false) {
    if (!item) return 'https://www.google.com';
    const customUrl = String(item.website_url || '').trim();
    if (customUrl && /^https?:\/\//i.test(customUrl)) {
      return customUrl;
    }
    const hay = `${item.name || ''} ${item.card_name || ''} ${item.issuer || ''} ${item.ecosystem || ''} ${item.points_program || ''}`.toLowerCase();

    // If this is a Credit Card, prioritize the Bank / Card Issuer Login Portal first
    if (isCard) {
      if (hay.includes('chase')) return 'https://secure.chase.com';
      if (hay.includes('amex') || hay.includes('american express')) return 'https://global.americanexpress.com/login';
      if (hay.includes('capital one') || hay.includes('venture')) return 'https://myaccounts.capitalone.com';
      if (hay.includes('citi') || hay.includes('strata')) return 'https://online.citi.com';
      if (hay.includes('bilt')) return 'https://www.biltrewards.com/account';
      if (hay.includes('bank of america') || hay.includes('bofa')) return 'https://www.bankofamerica.com';
      if (hay.includes('wells fargo') || hay.includes('autograph')) return 'https://connect.secure.wellsfargo.com/auth/login/present';
      if (hay.includes('us bank') || hay.includes('u.s. bank') || hay.includes('altitude')) return 'https://onlinebanking.usbank.com/auth/login';
      if (hay.includes('barclay')) return 'https://www.barclaycardus.com';
    }

    // Hotel Loyalty Programs
    if (hay.includes('ihg')) return 'https://www.ihg.com/rewardsclub/us/en/account-mgmt/home';
    if (hay.includes('hyatt')) return 'https://world.hyatt.com';
    if (hay.includes('marriott') || hay.includes('bonvoy')) return 'https://www.marriott.com/loyalty/myAccount/default.mi';
    if (hay.includes('hilton')) return 'https://www.hilton.com/en/hilton-honors/guest/my-account/';
    if (hay.includes('wyndham')) return 'https://www.wyndhamhotels.com/wyndham-rewards/login';
    if (hay.includes('choice')) return 'https://www.choicehotels.com/choice-privileges';
    if (hay.includes('accor')) return 'https://all.accor.com';

    // Airline Loyalty Programs
    if (hay.includes('delta') || hay.includes('skymiles')) return 'https://www.delta.com/myprofile/dashboard';
    if (hay.includes('united') || hay.includes('mileageplus')) return 'https://www.united.com/en/us/myunited';
    if (hay.includes('american') && !hay.includes('express') || hay.includes('aadvantage')) return 'https://www.aa.com/loyalty/profile/summary';
    if (hay.includes('southwest') || hay.includes('rapid rewards')) return 'https://www.southwest.com/loyalty/myaccount';
    if (hay.includes('alaska') || hay.includes('atmos') || hay.includes('mileage plan')) return 'https://www.alaskaair.com/account/overview';
    if (hay.includes('aeroplan') || hay.includes('air canada')) return 'https://www.aircanada.com/aeroplan';
    if (hay.includes('flying blue') || hay.includes('air france') || hay.includes('klm')) return 'https://www.flyingblue.us';
    if (hay.includes('british airways') || hay.includes('avios')) return 'https://www.britishairways.com/travel/echome/public/en_us';
    if (hay.includes('virgin voyages')) return 'https://www.virginvoyages.com/sailing-club';
    if (hay.includes('virgin')) return 'https://www.virginatlantic.com/flying-club';
    if (hay.includes('jetblue') || hay.includes('trueblue')) return 'https://www.jetblue.com/trueblue';
    if (hay.includes('ana') || hay.includes('all nippon')) return 'https://www.ana.co.jp/en/us/amc/';
    if (hay.includes('singapore') || hay.includes('krisflyer')) return 'https://www.singaporeair.com/en_UK/us/ppsclub-krisflyer/';

    // Cruise Line & Rail Loyalty Programs
    if (hay.includes('norwegian') || hay.includes('ncl') || hay.includes('latitudes')) return 'https://www.ncl.com/latitudes-rewards-program';
    if (hay.includes('royal caribbean') || hay.includes('crown & anchor') || hay.includes('crown and anchor')) return 'https://www.royalcaribbean.com/account';
    if (hay.includes('celebrity') || hay.includes("captain's club")) return 'https://www.celebritycruises.com/account';
    if (hay.includes('carnival') || hay.includes('vifp')) return 'https://www.carnival.com/profilemanagement';
    if (hay.includes('princess') || hay.includes("captain's circle")) return 'https://www.princess.com/myprincess';
    if (hay.includes('holland america') || hay.includes('mariner society')) return 'https://www.hollandamerica.com/en/us/my-account';
    if (hay.includes('disney cruise') || hay.includes('castaway club')) return 'https://disneycruise.disney.go.com/why-cruise-disney/castaway-club/';
    if (hay.includes('msc')) return 'https://www.msccruisesusa.com/manage-booking';
    if (hay.includes('amtrak')) return 'https://www.amtrak.com/guestrewards';

    // Transferable Bank Currencies
    if (hay.includes('chase') || hay.includes('ultimate rewards') || hay.includes('sapphire')) return 'https://secure.chase.com';
    if (hay.includes('amex') || hay.includes('american express') || hay.includes('membership rewards')) return 'https://global.americanexpress.com/login';
    if (hay.includes('capital one') || hay.includes('venture')) return 'https://myaccounts.capitalone.com';
    if (hay.includes('citi') || hay.includes('thankyou') || hay.includes('strata')) return 'https://online.citi.com';
    if (hay.includes('bilt')) return 'https://www.biltrewards.com/account';
    if (hay.includes('wells fargo')) return 'https://connect.secure.wellsfargo.com/auth/login/present';
    if (hay.includes('us bank') || hay.includes('u.s. bank')) return 'https://onlinebanking.usbank.com/auth/login';

    const q = encodeURIComponent(`${item.name || item.card_name || 'Rewards'} account login`);
    return `https://www.google.com/search?q=${q}`;
  }

  function renderInteractiveCreditRowHtml(card, cr, idx, compact = false) {
    const label = cr.name || cr.label || 'Statement Credit';
    const tot = Math.max(0, Number(cr.total_usd ?? cr.amount ?? 0));
    const used = Math.min(tot, Math.max(0, cr.used_usd !== undefined ? Number(cr.used_usd) : (cr.used ? tot : 0)));
    const avail = Math.max(0, Number((tot - used).toFixed(2)));
    const isDone = tot > 0 && used >= tot;
    const pct = tot > 0 ? Math.min(100, Math.round((used / tot) * 100)) : 0;
    const resetDate = getDefaultCreditResetMonth(card, cr);
    const resetCycle = getDefaultCreditResetCycle(cr);
    const resetLabel = formatResetMonthDisplay(resetDate, resetCycle);
    const daysLeft = daysUntilResetMonth(resetDate);
    const cycleOptions = ['Annually', 'Calendar Year (Jan 1)', 'Semi-Annually', 'Quarterly', 'Monthly', 'Every 4 Years'];
    const drawerKey = `${card.id}_${idx}`;
    const isExpanded = Boolean(expandedCreditDrawers[drawerKey]);

    // Condensed mode for main grid cards: sleek 2-line summary with expandable slider/reset drawer
    if (compact) {
      return `
        <div class="credit-condensed-item ${isDone ? 'completed' : ''} ${isExpanded ? 'expanded' : ''}" data-credit-drawer-key="${escapeHtml(drawerKey)}">
          <div class="credit-condensed-top">
            <label class="interactive-credit-label" style="font-size: 12px;">
              <input type="checkbox" data-toggle-card-credit="${escapeHtml(card.id)}" data-credit-idx="${idx}" ${isDone ? 'checked' : ''} />
              <span class="credit-title-txt" style="${isDone ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">${escapeHtml(label)}</span>
            </label>
            <button
              type="button"
              class="btn btn-sm"
              style="padding: 2px 7px; font-size: 10px; flex-shrink: 0;"
              data-toggle-credit-drawer="${escapeHtml(drawerKey)}"
              title="Toggle partial usage slider & reset date settings"
            >
              ${isExpanded ? '▴ Hide' : '⚙️ Adjust'}
            </button>
          </div>
          <div class="credit-condensed-sub">
            <span class="credit-avail-pill ${avail === 0 ? 'zero' : ''}" style="font-size: 10.5px; padding: 1px 7px;" data-live-avail-pill>
              ${avail > 0 ? `Reward Available: ${fmtUsd(avail)}` : `✓ $0.00 Left (${fmtUsd(tot)} Used)`}
            </span>
            <span class="mono" data-live-used-tot style="font-size: 10.5px; color: var(--text-secondary); font-weight: 600;">
              Used: ${fmtUsd(used)} / ${fmtUsd(tot)} • 🔄 ${escapeHtml(resetLabel)}
            </span>
          </div>
          ${tot > 0 ? `
            <div class="credit-condensed-drawer">
              <div class="interactive-credit-controls" style="margin-top: 0;">
                <input
                  type="range"
                  class="credit-range-slider"
                  min="0"
                  max="${tot}"
                  step="1"
                  value="${used}"
                  data-slider-card-credit="${escapeHtml(card.id)}"
                  data-credit-idx="${idx}"
                  title="Slide to record partial or full credit usage (${pct}%)"
                />
                <div style="display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0;">
                  <span style="font-size: 11px; color: var(--text-muted); font-weight: 600;">Used $</span>
                  <input
                    type="number"
                    min="0"
                    max="${tot}"
                    step="0.01"
                    class="credit-used-input mono"
                    value="${used}"
                    data-input-card-credit="${escapeHtml(card.id)}"
                    data-credit-idx="${idx}"
                  />
                </div>
                ${used > 0 ? `
                  <button
                    type="button"
                    class="btn btn-sm"
                    style="padding: 2px 6px; font-size: 10px;"
                    data-reset-now-card-credit="${escapeHtml(card.id)}"
                    data-credit-idx="${idx}"
                  >
                    ↺ Reset
                  </button>
                ` : ''}
              </div>
              <div class="credit-reset-meta-bar">
                <div class="credit-reset-inline-group">
                  <span style="font-weight: 600; color: var(--text-muted);">🔄 Resets:</span>
                  <input
                    type="month"
                    class="credit-inline-month-input mono"
                    value="${escapeHtml(resetDate)}"
                    data-reset-date-card-credit="${escapeHtml(card.id)}"
                    data-credit-idx="${idx}"
                  />
                  <select
                    class="credit-inline-cycle-select"
                    data-reset-cycle-card-credit="${escapeHtml(card.id)}"
                    data-credit-idx="${idx}"
                  >
                    ${cycleOptions.map(opt => `<option value="${escapeHtml(opt)}" ${opt === resetCycle ? 'selected' : ''}>${escapeHtml(opt)}</option>`).join('')}
                  </select>
                </div>
              </div>
            </div>
          ` : ''}
        </div>
      `;
    }

    return `
      <div class="interactive-credit-row ${isDone ? 'completed' : ''}">
        <!-- Row 1: Full-width Credit Title + Optional Reset Button -->
        <div class="interactive-credit-main">
          <label class="interactive-credit-label">
            <input type="checkbox" data-toggle-card-credit="${escapeHtml(card.id)}" data-credit-idx="${idx}" ${isDone ? 'checked' : ''} />
            <span class="credit-title-txt" style="${isDone ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">${escapeHtml(label)}</span>
          </label>
          ${tot > 0 && used > 0 ? `
            <button
              type="button"
              class="btn btn-sm"
              style="padding: 2px 7px; font-size: 10.5px; flex-shrink: 0;"
              data-reset-now-card-credit="${escapeHtml(card.id)}"
              data-credit-idx="${idx}"
              title="Reset used amount back to $0 so full ${fmtUsd(tot)} is available again"
            >
              ↺ Reset to ${fmtUsdCompact(tot)}
            </button>
          ` : ''}
        </div>

        <!-- Row 2: Dedicated Reward Available Pill & Used / Total Readout (Never overlaps title) -->
        <div class="interactive-credit-amounts-bar">
          <span class="credit-avail-pill ${avail === 0 ? 'zero' : ''}" data-live-avail-pill>
            ${avail > 0 ? `Reward Available: ${fmtUsd(avail)}` : `✓ $0.00 Left (All ${fmtUsd(tot)} Used)`}
          </span>
          <span class="mono" data-live-used-tot style="font-size: 11.5px; font-weight: 700; color: ${isDone ? 'var(--accent-primary)' : 'var(--accent-sky)'}; white-space: nowrap;">
            Used: ${fmtUsd(used)} / ${fmtUsd(tot)}
          </span>
        </div>

        ${tot > 0 ? `
          <!-- Row 3: Slider + Used $ Input -->
          <div class="interactive-credit-controls">
            <input
              type="range"
              class="credit-range-slider"
              min="0"
              max="${tot}"
              step="1"
              value="${used}"
              data-slider-card-credit="${escapeHtml(card.id)}"
              data-credit-idx="${idx}"
              title="Slide to record partial or full credit usage (${pct}%)"
            />
            <div style="display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0;">
              <span style="font-size: 11px; color: var(--text-muted); font-weight: 600;">Used $</span>
              <input
                type="number"
                min="0"
                max="${tot}"
                step="0.01"
                class="credit-used-input mono"
                value="${used}"
                data-input-card-credit="${escapeHtml(card.id)}"
                data-credit-idx="${idx}"
                title="Enter dollar amount used (auto-calculates Reward Available)"
              />
            </div>
          </div>

          <!-- Row 4: Reset Date & Cycle Footer -->
          <div class="credit-reset-meta-bar">
            <div class="credit-reset-inline-group">
              <span style="font-weight: 600; color: var(--text-muted);">🔄 Resets:</span>
              <input
                type="month"
                class="credit-inline-month-input mono"
                value="${escapeHtml(resetDate)}"
                data-reset-date-card-credit="${escapeHtml(card.id)}"
                data-credit-idx="${idx}"
                title="Select month & year this credit resets back to ${fmtUsd(tot)}"
              />
              <select
                class="credit-inline-cycle-select"
                data-reset-cycle-card-credit="${escapeHtml(card.id)}"
                data-credit-idx="${idx}"
                title="How often this credit resets"
              >
                ${cycleOptions.map(opt => `<option value="${escapeHtml(opt)}" ${opt === resetCycle ? 'selected' : ''}>${escapeHtml(opt)}</option>`).join('')}
              </select>
            </div>
            <span style="font-size: 10.5px; color: ${daysLeft <= 60 ? 'var(--accent-amber)' : 'var(--text-muted)'}; font-weight: 600;">
              📅 ${escapeHtml(resetLabel)}${daysLeft >= 0 && daysLeft < 730 ? ` • ${daysLeft}d left` : ''}
            </span>
          </div>
        ` : ''}
      </div>
    `;
  }

  function renderRewardsProgramsTab() {
    document.querySelectorAll('#rewards-ecosystem-chips [data-eco-filter]').forEach(btn => {
      const fKey = btn.getAttribute('data-eco-filter');
      const isAct = fKey === state.rewardsEcoFilter;
      btn.classList.toggle('active', isAct);
      if (fKey && fKey !== 'all') {
        const cHex = getEcosystemColor(fKey);
        btn.style.borderColor = isAct ? cHex : hexToRgba(cHex, 0.5);
        btn.style.backgroundColor = isAct ? hexToRgba(cHex, 0.16) : '';
        btn.style.color = isAct ? 'var(--text-primary)' : '';
        if (!btn.querySelector('.eco-chip-dot')) {
          const dot = document.createElement('span');
          dot.className = 'eco-chip-dot';
          dot.style.cssText = `display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;background:${cHex};`;
          btn.prepend(dot);
        } else {
          btn.querySelector('.eco-chip-dot').style.background = cHex;
        }
      }
    });

    const grid = document.getElementById('rewards-programs-grid');
    if (!grid) return;

    const filtered = state.rewards.programs.filter(p =>
      state.rewardsEcoFilter === 'all' ? true : p.ecosystem === state.rewardsEcoFilter
    );

    if (filtered.length === 0 && (state.rewards.cards || []).length === 0) {
      grid.innerHTML = `
        <div class="panel-card" style="grid-column: 1 / -1; text-align: center; padding: 32px;">
          <div style="font-size: 15px; font-weight: 700; margin-bottom: 6px;">No loyalty programs or cards in this category yet</div>
          <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 14px;">
            Add a credit card (e.g. Capital One Venture X, Chase Sapphire Reserve, Hilton Aspire, World of Hyatt) or loyalty program from the database to auto-populate its card art, statement credits, and free night perks!
          </div>
          <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
            <button type="button" class="btn btn-sm btn-primary" id="btn-empty-prog-tpl">⚡ Smart Add from Database</button>
            <button type="button" class="btn btn-sm" id="btn-empty-card-add">+ Add Credit Card</button>
            <button type="button" class="btn btn-sm" id="btn-empty-prog-add">+ Add Loyalty Program</button>
          </div>
        </div>
      `;
      return;
    }

    const progCardsHtml = filtered.map(p => {
      const meta = ECOSYSTEM_META[p.ecosystem] || ECOSYSTEM_META.other;
      const cardColor = getProgramColor(p);
      const pts = Number(p.points ?? p.balance ?? 0);
      const cpp = Number(p.cpp ?? p.cpp_valuation ?? 1.5);
      const valUsd = (pts * cpp) / 100;
      const qCur = Number(p.qualifying_nights ?? p.qualifying_current ?? 0);
      const qTgt = Number(p.target_nights ?? p.qualifying_target ?? 0);
      const qPct = qTgt > 0 ? Math.min(100, Math.round((qCur / qTgt) * 100)) : 100;
      const metricLabel = p.metric_label || p.qualifying_label || 'Qualifying Nights';
      const partners = p.transfer_partners || p.transfer_sources || '';
      const expPolicy = p.expiration_policy || 'Active';

      // Unified Ecosystem: Linked Credit Cards & Linked Certificates/Perks
      const linkedCards = getLinkedCardsForProgram(p);
      const linkedCerts = getLinkedCertsForProgram(p, linkedCards);
      const primaryCard = linkedCards[0] || null;

      // Aggregate credits & fees across all linked cards for this program
      let progCredTotal = 0;
      let progCredUsed = 0;
      let progAnnualFees = 0;
      let totalCreditsCount = 0;
      for (const lc of linkedCards) {
        progAnnualFees += Number(lc.annual_fee || 0);
        const crs = Array.isArray(lc.credits) ? lc.credits : [];
        totalCreditsCount += crs.length;
        for (const cr of crs) {
          const t = Math.max(0, Number(cr.total_usd ?? cr.amount ?? 0));
          const u = Math.min(t, Math.max(0, cr.used_usd !== undefined ? Number(cr.used_usd) : (cr.used ? t : 0)));
          progCredTotal += t;
          progCredUsed += u;
        }
      }
      const progCredAvail = Math.max(0, Number((progCredTotal - progCredUsed).toFixed(2)));
      const availCerts = linkedCerts.filter(c => c.status !== 'redeemed');
      const availCertsVal = availCerts.reduce((s, c) => s + Number(c.est_value_usd ?? c.estimated_value_usd ?? 0), 0);

      const curMiniTab = activeProgramCardMiniTabs[p.id] || 'overview';

      return `
        <div class="reward-item-card color-coded" draggable="true" data-drag-reward-kind="program" data-drag-reward-id="${escapeHtml(p.id)}" style="background-image: linear-gradient(180deg, ${hexToRgba(cardColor, 0.16)} 0%, transparent 105px);">
          <div class="reward-card-banner" style="background: ${cardColor};"></div>

          <!-- 1. Clean Header: Grab Handle + Category + Program Name + Status Tier -->
          <div class="reward-card-top">
            <div style="min-width: 0; flex: 1;">
              <div style="display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <span class="reward-drag-handle" data-move-reward-top="program" data-move-reward-id="${escapeHtml(p.id)}" title="Drag to reorder program (or double-click to move to top)">⠿</span>
                <span class="reward-ecosystem-pill" style="background-color: ${hexToRgba(cardColor, 0.15)}; border-color: ${hexToRgba(cardColor, 0.65)}; color: var(--text-primary);">
                  <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${cardColor};"></span>
                  ${meta.icon} ${escapeHtml(meta.label)}
                </span>
                <button type="button" class="btn-color-edit-inline" data-quick-color-prog="${escapeHtml(p.id)}" title="Change category or card color">
                  ✏️
                </button>
              </div>
              <h4 style="font-size: 16.5px; font-weight: 800; margin-top: 5px; color: var(--text-primary); display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span>${escapeHtml(p.name)}</span>
                ${ownerBadgeHtml(p)}
              </h4>
            </div>
            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 5px;">
              <span class="kpi-tag" style="background-color: ${hexToRgba(cardColor, 0.14)}; border: 1px solid ${hexToRgba(cardColor, 0.45)}; color: var(--text-primary);">
                ★ ${escapeHtml(p.status_tier || 'Member')}
              </span>
              ${p.member_id ? `
                <button type="button" class="btn btn-sm" style="padding: 1px 7px; font-size: 10.5px;" data-copy-member="${escapeHtml(p.member_id)}" title="Click to copy Member ID">
                  📋 <span class="mono">${escapeHtml(p.member_id)}</span>
                </button>
              ` : ''}
            </div>
          </div>

          <!-- 2. Condensed Hero Showcase: Points Available + Primary Credit Card Art & Annual Fee -->
          <div class="reward-condensed-showcase">
            <div class="reward-condensed-primary-row">
              ${renderQuickPointsBlockHtml(p, false, { kind: 'program', id: p.id, prog: p, card: primaryCard })}
            </div>

            <!-- Primary Linked Card Image, Name, Credentials & Annual Fee Strip -->
            ${primaryCard ? `
              <div class="reward-condensed-card-strip" data-open-prog-md="${escapeHtml(p.id)}" data-md-tab="credits" title="Click to open full Card & Perks Mini-Dashboard">
                ${renderCreditCardArtHtml(primaryCard, 'cc-art-sm')}
                <div style="min-width: 0; flex: 1;">
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; flex-wrap: wrap;">
                    <span style="font-size: 13px; font-weight: 700; color: var(--text-primary);">
                      ${escapeHtml(primaryCard.name || primaryCard.card_name)}
                      ${linkedCards.length > 1 ? `<span style="font-size: 10.5px; color: var(--accent-sky);">+${linkedCards.length - 1} more</span>` : ''}
                    </span>
                    <span class="mono" style="font-size: 11px; font-weight: 700; color: var(--text-secondary);">
                      Fee: ${fmtUsdCompact(progAnnualFees)}/yr
                    </span>
                  </div>
                  ${renderCardCredentialsStripHtml(primaryCard, false)}
                  <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ⚡ ${escapeHtml(primaryCard.multipliers || primaryCard.best_for || 'Linked Travel Card')}
                  </div>
                </div>
              </div>
            ` : `
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 9px; background: var(--bg-surface); border: 1px dashed var(--border-subtle); border-radius: 7px; font-size: 11.5px; color: var(--text-muted);">
                <span>💳 No credit card linked yet</span>
                <button type="button" class="btn btn-sm" style="padding: 2px 8px; font-size: 10.5px;" data-add-card-for-prog="${escapeHtml(p.name)}">+ Link Card</button>
              </div>
            `}

            <!-- Custom Checkbox Fields (Annual Fee Basics Tracker) above Details / Free Nights / Website -->
            ${renderCardCustomChecklistHtml('program', p.id, p, primaryCard)}

            <!-- 3 Interactive Action Buttons: (1) Details (2) Free Nights (3) Website -->
            <div class="reward-quick-stat-pills">
              <button
                type="button"
                class="reward-quick-stat-box reward-quick-stat-btn"
                data-open-prog-md="${escapeHtml(p.id)}"
                data-md-tab="overview"
                title="Open Mini-Dashboard with all card &amp; loyalty details"
                style="${progCredAvail > 0 ? 'border-color: rgba(16, 185, 129, 0.45); background: rgba(16, 185, 129, 0.06);' : ''}"
              >
                <span class="reward-quick-stat-label">Details</span>
                <span class="reward-quick-stat-val" style="color: var(--accent-primary);">
                  🔍 View Info
                </span>
              </button>
              <button
                type="button"
                class="reward-quick-stat-box reward-quick-stat-btn"
                data-open-prog-md="${escapeHtml(p.id)}"
                data-md-tab="perks"
                title="Open Free Nights &amp; Perks in Mini-Dashboard"
              >
                <span class="reward-quick-stat-label">Free Nights</span>
                <span class="reward-quick-stat-val mono" style="color: ${availCerts.length > 0 ? 'var(--accent-sky)' : 'var(--text-secondary)'};">
                  ${availCerts.length} Avail
                </span>
              </button>
              <a
                href="${escapeHtml(resolveRewardWebsiteUrl(p, false))}"
                target="_blank"
                rel="noopener noreferrer"
                class="reward-quick-stat-box reward-quick-stat-btn"
                data-open-reward-website="${escapeHtml(resolveRewardWebsiteUrl(p, false))}"
                data-copy-member-on-open="${escapeHtml(p.member_id || '')}"
                data-reward-label="${escapeHtml(p.name)}"
                title="Open ${escapeHtml(p.name)} login website in a new tab${p.member_id ? ` (auto-copies Member ID ${escapeHtml(p.member_id)})` : ''}"
                style="text-decoration: none;"
              >
                <span class="reward-quick-stat-label">Website</span>
                <span class="reward-quick-stat-val" style="color: var(--text-primary);">
                  🌐 Login ↗
                </span>
              </a>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Check for any standalone credit cards not yet linked to a program in state.rewards.programs
    const unlinkedCards = (state.rewards.cards || []).filter(
      c => !(state.rewards.programs || []).some(p => doesCardMatchProgram(c, p))
    );
    let unlinkedHtml = '';
    if (unlinkedCards.length > 0 && state.rewardsEcoFilter === 'all') {
      unlinkedHtml = unlinkedCards.map(c => {
        const cName = c.name || c.card_name || 'Travel Card';
        const cFee = Number(c.annual_fee || 0);
        const cCredits = Array.isArray(c.credits) ? c.credits : [];
        return `
          <div class="reward-item-card" style="border-style: dashed;">
            <div class="reward-card-top">
              <div style="display: flex; gap: 12px; align-items: center;">
                ${renderCreditCardArtHtml(c, 'cc-art-sm')}
                <div>
                  <span class="reward-ecosystem-pill">💳 ${escapeHtml(c.issuer || 'Bank')} • ${escapeHtml(c.ecosystem || 'Unlinked Card')}</span>
                  <h4 style="font-size: 15.5px; font-weight: 700; margin-top: 5px; color: var(--text-primary);">${escapeHtml(cName)}</h4>
                  <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">${fmtUsdCompact(cFee)}/yr • ${escapeHtml(c.multipliers || '')}</div>
                </div>
              </div>
              <button type="button" class="btn btn-sm btn-primary" data-auto-integrate-card="${escapeHtml(c.id)}" title="Automatically create & link its Loyalty Program and Free Night Perks">
                🔗 Auto-Link Program
              </button>
            </div>
            ${cCredits.length > 0 ? `
              <div class="unified-eco-section">
                <div class="unified-eco-title">Statement Credits</div>
                ${cCredits.map((cr, idx) => renderInteractiveCreditRowHtml(c, cr, idx, true)).join('')}
              </div>
            ` : ''}
            <div style="display: flex; justify-content: flex-end; gap: 6px; margin-top: auto; padding-top: 8px; border-top: 1px solid var(--border-subtle);">
              <button type="button" class="btn btn-sm" data-edit-rcard="${escapeHtml(c.id)}">Edit Card</button>
              <button type="button" class="btn btn-sm btn-danger-ghost" data-del-rcard="${escapeHtml(c.id)}">✕</button>
            </div>
          </div>
        `;
      }).join('');
    }

    grid.innerHTML = progCardsHtml + unlinkedHtml;
  }

  function renderRewardsCertsTab() {
    document.querySelectorAll('#rewards-cert-chips [data-cert-filter]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-cert-filter') === state.rewardsCertFilter);
    });

    const grid = document.getElementById('rewards-certs-grid');
    if (!grid) return;

    const filter = state.rewardsCertFilter;
    const filtered = state.rewards.certificates.filter(c => {
      const days = daysUntilDate(c.expires_date || c.expiration_date);
      if (filter === 'all') return true;
      if (filter === 'available') return c.status !== 'redeemed';
      if (filter === 'redeemed') return c.status === 'redeemed';
      if (filter === 'expiring') return c.status !== 'redeemed' && days <= 60;
      if (filter === 'Companion Pass') {
        return c.type === 'Companion Pass' || c.type === 'Suite / Flight Upgrade';
      }
      return c.type === filter;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="panel-card" style="grid-column: 1 / -1; text-align: center; padding: 32px;">
          <div style="font-size: 15px; font-weight: 700; margin-bottom: 6px;">No certificates or perks match this filter</div>
          <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 14px;">
            Track hotel Free Night Certificates (Hyatt Cat 1-4/1-7, Marriott 85k, Hilton Aspire), Airline Companion Passes, Suite Upgrades, and Priority Pass / Global Entry.
          </div>
          <button type="button" class="btn btn-sm btn-primary" id="btn-empty-cert-add">+ Add Free Night / Certificate / Perk</button>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(c => {
      const expDate = c.expires_date || c.expiration_date || '';
      const days = daysUntilDate(expDate);
      const isRedeemed = c.status === 'redeemed';
      const valUsd = Number(c.est_value_usd ?? c.estimated_value_usd ?? 0);
      const capText = c.cap_details || c.points_cap || '';

      let urgencyBadge = '';
      if (isRedeemed) {
        urgencyBadge = `<span class="kpi-tag positive">✅ Redeemed</span>`;
      } else if (days < 0) {
        urgencyBadge = `<span class="kpi-tag danger">⚠️ Expired (${Math.abs(days)}d ago)</span>`;
      } else if (days <= 60) {
        urgencyBadge = `<span class="kpi-tag danger">🔴 Expires in ${days}d (${escapeHtml(expDate)})</span>`;
      } else if (days <= 120) {
        urgencyBadge = `<span class="kpi-tag warning">🟡 ${days}d left (${escapeHtml(expDate)})</span>`;
      } else {
        urgencyBadge = `<span class="kpi-tag sky">🟢 Valid thru ${escapeHtml(expDate)}</span>`;
      }

      const certEcoKey = c.type === 'Free Night Certificate'
        ? 'hotel'
        : (c.type === 'Companion Pass' || c.type === 'Suite / Flight Upgrade')
        ? 'airline'
        : 'other';
      const certColor = getEcosystemColor(certEcoKey);

      return `
        <div class="reward-item-card color-coded" draggable="true" data-drag-reward-kind="cert" data-drag-reward-id="${escapeHtml(c.id)}" style="${isRedeemed ? 'opacity: 0.72;' : ''} background-image: linear-gradient(180deg, ${hexToRgba(certColor, 0.16)} 0%, transparent 105px);">
          <div class="reward-card-banner" style="background: ${certColor};"></div>
          <div class="reward-card-top">
            <div>
              <div style="display: inline-flex; align-items: center; gap: 6px;">
                <span class="reward-drag-handle" data-move-reward-top="cert" data-move-reward-id="${escapeHtml(c.id)}" title="Drag to reorder certificate/perk (or double-click to move to top)">⠿</span>
                <span class="reward-ecosystem-pill" style="background-color: ${hexToRgba(certColor, 0.15)}; border-color: ${hexToRgba(certColor, 0.65)}; color: var(--text-primary);">
                  <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${certColor};"></span>
                  🎟️ ${escapeHtml(c.type || 'Free Night Certificate')}
                </span>
                <button type="button" class="btn-color-edit-inline" data-quick-color-eco="${certEcoKey}" title="Change category color">✏️</button>
              </div>
              <h4 style="font-size: 15.5px; font-weight: 700; margin-top: 6px; color: var(--text-primary);">${escapeHtml(c.title)} ${ownerBadgeHtml(c, 'xs')}</h4>
            </div>
            ${urgencyBadge}
          </div>

          <div class="reward-balance-box">
            <div>
              <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Program &amp; Source Card</div>
              <div style="font-size: 13.5px; font-weight: 700; color: var(--text-primary);">${escapeHtml(c.program || 'Loyalty Perk')}</div>
              <div style="font-size: 12px; color: var(--text-muted);">${escapeHtml(c.source_card || '')}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Est. Value</div>
              <div class="mono tabular" style="font-size: 18px; font-weight: 700; color: var(--accent-primary);">${fmtUsd(valUsd)}</div>
            </div>
          </div>

          <div style="font-size: 12px; color: var(--text-secondary); display: flex; flex-direction: column; gap: 4px;">
            ${capText ? `<div>📌 <strong>Rules / Cap:</strong> ${escapeHtml(capText)}</div>` : ''}
            ${c.notes ? `<div style="color: var(--text-muted);">💡 ${escapeHtml(c.notes)}</div>` : ''}
          </div>

          ${Array.isArray(c.custom_fields) && c.custom_fields.length > 0 ? `
            <div class="custom-fields-wrap">
              ${c.custom_fields.map(f => `
                <span class="custom-field-chip" title="${escapeHtml(f.label)}: ${escapeHtml(f.value)}">
                  <strong>${escapeHtml(f.label)}:</strong> ${escapeHtml(f.value)}
                </span>
              `).join('')}
            </div>
          ` : ''}

          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid var(--border-subtle); margin-top: auto;">
            <button type="button" class="btn btn-sm ${isRedeemed ? '' : 'btn-primary'}" data-toggle-rcert="${escapeHtml(c.id)}">
              ${isRedeemed ? '↺ Mark Available' : '✓ Mark Redeemed'}
            </button>
            <div style="display: flex; gap: 6px;">
              <button type="button" class="btn btn-sm" data-edit-rcert="${escapeHtml(c.id)}">Edit</button>
              <button type="button" class="btn btn-sm btn-danger-ghost" data-del-rcert="${escapeHtml(c.id)}">✕</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderRewardsCardsTab() {
    // 1. Render Active Welcome Bonus (SUB) Minimum Spend Tracker
    const subList = document.getElementById('rewards-sub-list');
    if (subList) {
      const subCards = state.rewards.cards.filter(c => c.sub_active);
      if (subCards.length === 0) {
        subList.innerHTML = `
          <div style="grid-column: 1 / -1; padding: 14px; background: var(--bg-elevated); border-radius: 8px; border: 1px solid var(--border-subtle); font-size: 13px; color: var(--text-secondary);">
            No active Sign-Up Bonus minimum spend challenges right now. Click <strong>Edit</strong> on any card below and check <em>"Track Active Welcome Bonus (SUB)"</em> when opening a new card!
          </div>
        `;
      } else {
        subList.innerHTML = subCards.map(c => {
          const cardName = c.name || c.card_name || '';
          const roadSpend = state.expenses
            .filter(e => (e.payment_method || '').toLowerCase() === cardName.toLowerCase())
            .reduce((s, e) => s + (Number(e.amount_usd) || 0), 0);
          const baseSpend = Number(c.sub_spent_manual_usd ?? c.sub_base_spend ?? 0);
          const totalSpent = baseSpend + roadSpend;
          const target = Math.max(1, Number(c.sub_target_usd ?? c.sub_spend_target ?? 4000));
          const pct = Math.min(100, Math.round((totalSpent / target) * 100));
          const remaining = Math.max(0, target - totalSpent);
          const days = daysUntilDate(c.sub_deadline);
          const bonusLabel = c.sub_bonus_label || c.sub_bonus_text || 'Welcome Bonus';

          return `
            <div class="reward-item-card" style="padding: 15px;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  ${renderCreditCardArtHtml(c, 'cc-art-sm')}
                  <div>
                    <div style="font-weight: 700; font-size: 15px; color: var(--text-primary);">🎯 ${escapeHtml(cardName)}</div>
                    <div style="font-size: 12px; color: var(--accent-primary); font-weight: 600;">Reward: ${escapeHtml(bonusLabel)}</div>
                  </div>
                </div>
                <span class="kpi-tag ${remaining === 0 ? 'positive' : (days <= 30 ? 'danger' : 'sky')}">
                  ${remaining === 0 ? '🎉 Bonus Unlocked!' : (days < 900 ? `${days}d left (${escapeHtml(c.sub_deadline)})` : 'In Progress')}
                </span>
              </div>
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 5px;">
                  <span>Spent: <strong class="mono">${fmtUsdCompact(totalSpent)}</strong> of <strong class="mono">${fmtUsdCompact(target)}</strong></span>
                  <span class="mono" style="font-weight: 700; color: ${remaining === 0 ? 'var(--accent-primary)' : 'var(--accent-amber)'};">
                    ${remaining === 0 ? '100% Complete' : `${fmtUsdCompact(remaining)} to go`}
                  </span>
                </div>
                <div class="progress-track">
                  <div class="progress-fill" style="width: ${pct}%; background-color: ${remaining === 0 ? 'var(--accent-primary)' : 'var(--accent-sky)'};"></div>
                </div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 5px;">
                  Includes <strong>${fmtUsdCompact(roadSpend)}</strong> auto-synced from road expenses paid on <em>${escapeHtml(cardName)}</em> + <strong>${fmtUsdCompact(baseSpend)}</strong> base spend.
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // 2. Render Best Card to Swipe Cheat Sheet
    const cheatGrid = document.getElementById('best-card-cheat-grid');
    if (cheatGrid) {
      cheatGrid.innerHTML = BEST_SWIPE_CHEAT_SHEET.map(item => `
        <div class="best-card-tile">
          <div style="font-size: 12px; font-weight: 700; color: var(--accent-amber);">${escapeHtml(item.cat)}</div>
          <div style="font-size: 13.5px; font-weight: 700; color: var(--text-primary);">${escapeHtml(item.winner)}</div>
          <div style="font-size: 11.5px; color: var(--text-secondary); line-height: 1.45;">${escapeHtml(item.detail)}</div>
        </div>
      `).join('');
    }

    // 3. Render Credit Cards & Statement Credits Checklist
    const cardsGrid = document.getElementById('rewards-cards-grid');
    if (!cardsGrid) return;

    if (state.rewards.cards.length === 0) {
      cardsGrid.innerHTML = `
        <div class="panel-card" style="grid-column: 1 / -1; text-align: center; padding: 32px;">
          <div style="font-size: 15px; font-weight: 700; margin-bottom: 6px;">No travel credit cards added yet</div>
          <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 14px;">
            Add your cards from the database to automatically bring in their realistic card image, annual fee, statement credits ($300 travel credit, Uber cash, airline credits), and linked free night perks.
          </div>
          <div style="display: flex; gap: 8px; justify-content: center;">
            <button type="button" class="btn btn-sm" id="btn-empty-card-tpl">⚡ Smart Add from Database</button>
            <button type="button" class="btn btn-sm btn-primary" id="btn-empty-card-add">+ Add Credit Card</button>
          </div>
        </div>
      `;
      return;
    }

    cardsGrid.innerHTML = state.rewards.cards.map(c => {
      const cardName = c.name || c.card_name || 'Travel Card';
      const fee = Number(c.annual_fee || 0);
      const credits = Array.isArray(c.credits) ? c.credits : [];
      let credTotal = 0;
      let credUsed = 0;
      for (const cr of credits) {
        const tot = Math.max(0, Number(cr.total_usd ?? cr.amount ?? 0));
        const used = Math.min(tot, Math.max(0, cr.used_usd !== undefined ? Number(cr.used_usd) : (cr.used ? tot : 0)));
        credTotal += tot;
        credUsed += used;
      }
      const credAvail = Math.max(0, Number((credTotal - credUsed).toFixed(2)));
      const netOffset = credUsed - fee;
      const linkedProg = (state.rewards.programs || []).find(p => doesCardMatchProgram(c, p));
      const progPts = linkedProg ? Number(linkedProg.points ?? linkedProg.balance ?? 0) : 0;
      const cardCerts = linkedProg
        ? getLinkedCertsForProgram(linkedProg, [c])
        : (state.rewards.certificates || []).filter(cert =>
            (cert.source_card || '').toLowerCase() === (cardName || '').toLowerCase()
          );
      const availCardCerts = cardCerts.filter(cert => cert.status !== 'redeemed');
      const cardBannerColor = linkedProg
        ? (linkedProg.custom_color || getEcosystemColor(linkedProg.ecosystem))
        : getEcosystemColor('bank');

      return `
        <div class="reward-item-card color-coded" draggable="true" data-drag-reward-kind="card" data-drag-reward-id="${escapeHtml(c.id)}" style="background-image: linear-gradient(180deg, ${hexToRgba(cardBannerColor, 0.16)} 0%, transparent 105px);">
          <div class="reward-card-banner" style="background: ${cardBannerColor};"></div>

          <!-- 1. Clean Full-Width Header: Grab Handle + Issuer Pill + Full-Width Card Name + Keeper/Fee Badge -->
          <div class="reward-card-top">
            <div style="min-width: 0; flex: 1;">
              <div style="display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <span class="reward-drag-handle" data-move-reward-top="card" data-move-reward-id="${escapeHtml(c.id)}" title="Drag to reorder credit card (or double-click to move to top)">⠿</span>
                <span class="reward-ecosystem-pill" style="background-color: ${hexToRgba(cardBannerColor, 0.15)}; border-color: ${hexToRgba(cardBannerColor, 0.65)}; color: var(--text-primary);">
                  <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${cardBannerColor};"></span>
                  💳 ${escapeHtml(c.issuer || 'Bank')} • ${escapeHtml(c.ecosystem || c.points_program || 'Rewards')}
                </span>
              </div>
              <h4 style="font-size: 16.5px; font-weight: 800; margin-top: 5px; color: var(--text-primary); display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span>${escapeHtml(cardName)}</span>
                ${ownerBadgeHtml(c)}
              </h4>
            </div>
            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 5px; flex-shrink: 0;">
              <span class="kpi-tag ${netOffset >= 0 ? 'positive' : 'sky'}">
                ${netOffset >= 0 ? `✓ +${fmtUsdCompact(netOffset)} Net Keeper` : `${fmtUsdCompact(fee)}/yr Fee`}
              </span>
              <div style="display: inline-flex; align-items: center; gap: 4px;">
                <button type="button" class="btn btn-sm" style="padding: 1px 8px; font-size: 10.5px;" data-edit-rcard="${escapeHtml(c.id)}" title="Edit card details, card #, expiration, PIN &amp; credits">
                  ✎ Edit
                </button>
                ${!linkedProg ? `
                  <button type="button" class="btn btn-sm" style="padding: 1px 7px; font-size: 10.5px;" data-auto-integrate-card="${escapeHtml(c.id)}" title="Link Loyalty Program">
                    🔗 Link
                  </button>
                ` : ''}
              </div>
            </div>
          </div>

          <!-- 2. Condensed Showcase: Points Available + Sleek Horizontal Card Art & Credentials Strip + 3 Action Buttons -->
          <div class="reward-condensed-showcase">
            ${linkedProg ? `
              <div class="reward-condensed-primary-row">
                ${renderQuickPointsBlockHtml(linkedProg, false, { kind: 'card', id: c.id, prog: linkedProg, card: c })}
              </div>
            ` : `
              <div style="display: flex; justify-content: flex-end;">
                <button
                  type="button"
                  class="qp-custom-fields-btn ${activeCustomFieldsDrawers['card:' + c.id] ? 'active' : ''}"
                  data-toggle-cf-drawer="card:${escapeHtml(c.id)}"
                  title="Add or manage custom checkbox fields above the Details area"
                >
                  ☑️ Custom Fields${getSyncedCustomFields(null, c).length > 0 ? ` (${getSyncedCustomFields(null, c).filter(f => f.checked).length}/${getSyncedCustomFields(null, c).length})` : ''}
                </button>
              </div>
            `}

            <div class="reward-condensed-card-strip" data-open-card-md="${escapeHtml(c.id)}" data-md-tab="overview" title="Click to open Card Mini-Dashboard">
              ${renderCreditCardArtHtml(c, 'cc-art-sm')}
              <div style="min-width: 0; flex: 1;">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; flex-wrap: wrap;">
                  <span style="font-size: 12.5px; font-weight: 700; color: ${linkedProg ? 'var(--accent-primary)' : 'var(--text-primary)'};">
                    ${linkedProg ? `🔗 ${escapeHtml(linkedProg.name)}` : `💳 ${escapeHtml(c.issuer || 'Travel Card')}`}
                  </span>
                  <span class="mono" style="font-size: 11px; font-weight: 700; color: var(--text-secondary);">
                    Fee: ${fmtUsdCompact(fee)}/yr
                  </span>
                </div>
                ${renderCardCredentialsStripHtml(c, true)}
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ⚡ ${escapeHtml(c.multipliers || c.best_for || '1x–5x Travel Rewards')}
                </div>
              </div>
            </div>

            <!-- Custom Checkbox Fields (Annual Fee Basics Tracker) above Details / Free Nights / Website -->
            ${renderCardCustomChecklistHtml('card', c.id, linkedProg, c)}

            <!-- 3 Interactive Action Buttons: (1) Details (2) Free Nights (3) Website -->
            <div class="reward-quick-stat-pills">
              <button
                type="button"
                class="reward-quick-stat-box reward-quick-stat-btn"
                data-open-card-md="${escapeHtml(c.id)}"
                data-md-tab="overview"
                title="Open Mini-Dashboard with all card &amp; loyalty details"
                style="${credAvail > 0 ? 'border-color: rgba(16, 185, 129, 0.45); background: rgba(16, 185, 129, 0.06);' : ''}"
              >
                <span class="reward-quick-stat-label">Details</span>
                <span class="reward-quick-stat-val" style="color: var(--accent-primary);">
                  🔍 View Info
                </span>
              </button>
              <button
                type="button"
                class="reward-quick-stat-box reward-quick-stat-btn"
                data-open-card-md="${escapeHtml(c.id)}"
                data-md-tab="perks"
                title="Open Free Nights &amp; Perks in Mini-Dashboard"
              >
                <span class="reward-quick-stat-label">Free Nights</span>
                <span class="reward-quick-stat-val mono" style="color: ${availCardCerts.length > 0 ? 'var(--accent-sky)' : 'var(--text-secondary)'};">
                  ${availCardCerts.length} Avail
                </span>
              </button>
              <a
                href="${escapeHtml(resolveRewardWebsiteUrl(c, true))}"
                target="_blank"
                rel="noopener noreferrer"
                class="reward-quick-stat-box reward-quick-stat-btn"
                data-open-reward-website="${escapeHtml(resolveRewardWebsiteUrl(c, true))}"
                data-reward-label="${escapeHtml(cardName)}"
                title="Open ${escapeHtml(cardName)} login portal in a new tab"
                style="text-decoration: none;"
              >
                <span class="reward-quick-stat-label">Website</span>
                <span class="reward-quick-stat-val" style="color: var(--text-primary);">
                  🌐 Login ↗
                </span>
              </a>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // =========================================================================
  // PROGRAM & CREDIT CARD MINI-DASHBOARD FLYOUT ENGINE
  // =========================================================================
  function openRewardMiniDashboard(kind, id, initialTab = 'overview') {
    activeMiniDashboardState = {
      kind: kind || 'program',
      id: id || '',
      tab: initialTab || 'overview'
    };
    renderRewardMiniDashboard();
    openModal('modal-reward-mini-dashboard');
  }

  function renderRewardMiniDashboard() {
    ensureRewardsStructure();
    const { kind, id, tab } = activeMiniDashboardState;
    const body = document.getElementById('md-modal-body');
    const footer = document.getElementById('md-modal-footer');
    const titleEl = document.getElementById('md-modal-title');
    const subEl = document.getElementById('md-modal-subtitle');
    const iconEl = document.getElementById('md-modal-icon');
    if (!body) return;

    // Resolve Program + Linked Cards + Linked Certs (whether opened from a Program or a Card)
    let prog = null;
    let linkedCards = [];
    let primaryCard = null;

    if (kind === 'program') {
      prog = (state.rewards.programs || []).find(p => p.id === id) || null;
      if (!prog) {
        closeModal('modal-reward-mini-dashboard');
        return;
      }
      linkedCards = getLinkedCardsForProgram(prog);
      primaryCard = linkedCards[0] || null;
    } else {
      primaryCard = (state.rewards.cards || []).find(c => c.id === id) || null;
      if (!primaryCard) {
        closeModal('modal-reward-mini-dashboard');
        return;
      }
      prog = (state.rewards.programs || []).find(p => doesCardMatchProgram(primaryCard, p)) || null;
      linkedCards = prog ? getLinkedCardsForProgram(prog) : [primaryCard];
    }

    const linkedCerts = prog
      ? getLinkedCertsForProgram(prog, linkedCards)
      : (state.rewards.certificates || []).filter(cert =>
          (cert.source_card || '').toLowerCase() === (primaryCard.name || '').toLowerCase()
        );

    const meta = prog ? (ECOSYSTEM_META[prog.ecosystem] || ECOSYSTEM_META.other) : ECOSYSTEM_META.bank;
    const pts = prog ? Number(prog.points ?? prog.balance ?? 0) : 0;
    const cpp = prog ? Number(prog.cpp ?? prog.cpp_valuation ?? 1.5) : 1.5;
    const valUsd = (pts * cpp) / 100;
    const qCur = prog ? Number(prog.qualifying_nights ?? prog.qualifying_current ?? 0) : 0;
    const qTgt = prog ? Number(prog.target_nights ?? prog.qualifying_target ?? 0) : 0;
    const qPct = qTgt > 0 ? Math.min(100, Math.round((qCur / qTgt) * 100)) : 100;
    const metricLabel = prog ? (prog.metric_label || prog.qualifying_label || 'Qualifying Nights') : 'Qualifying Nights';

    let totalFees = 0;
    let totalCredUsd = 0;
    let totalUsedUsd = 0;
    let totalCreditsCount = 0;
    for (const lc of linkedCards) {
      totalFees += Number(lc.annual_fee || 0);
      const crs = Array.isArray(lc.credits) ? lc.credits : [];
      totalCreditsCount += crs.length;
      for (const cr of crs) {
        const t = Math.max(0, Number(cr.total_usd ?? cr.amount ?? 0));
        const u = Math.min(t, Math.max(0, cr.used_usd !== undefined ? Number(cr.used_usd) : (cr.used ? t : 0)));
        totalCredUsd += t;
        totalUsedUsd += u;
      }
    }
    const totalAvailUsd = Math.max(0, Number((totalCredUsd - totalUsedUsd).toFixed(2)));
    const availCerts = linkedCerts.filter(c => c.status !== 'redeemed');
    const availCertsVal = availCerts.reduce((s, c) => s + Number(c.est_value_usd ?? c.estimated_value_usd ?? 0), 0);
    const netKeeper = totalUsedUsd + availCertsVal - totalFees;

    if (iconEl) iconEl.textContent = prog ? meta.icon : '💳';
    if (titleEl) {
      const targetItem = prog || primaryCard;
      titleEl.innerHTML = `
        <span>${escapeHtml(prog ? prog.name : primaryCard.name)} — Mini-Dashboard</span>
        ${ownerBadgeHtml(targetItem, 'xs')}
        ${prog && prog.status_tier ? `<span class="kpi-tag sky" style="font-size: 11px;">★ ${escapeHtml(prog.status_tier)}</span>` : ''}
      `;
    }
    if (subEl) {
      subEl.textContent = prog
        ? `Unified Ecosystem View: ${linkedCards.length} Linked Card(s) • ${totalCreditsCount} Statement Credit(s) • ${linkedCerts.length} Free Night / Travel Perk(s)`
        : `${primaryCard.issuer || 'Bank'} • Annual Fee: ${fmtUsd(primaryCard.annual_fee || 0)}/yr • ${totalCreditsCount} Statement Credit(s)`;
    }

    // 1. Hero Banner with Card Art + Key Metrics
    const heroHtml = `
      <div class="md-hero-banner">
        <div style="display: flex; align-items: center; gap: 14px; min-width: 0; flex: 1;">
          ${primaryCard ? renderCreditCardArtHtml(primaryCard, 'cc-art-md') : ''}
          <div style="min-width: 0; flex: 1;">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-muted);">
              ${prog ? `${meta.icon} ${escapeHtml(meta.label)}` : `💳 ${escapeHtml(primaryCard.issuer || 'Travel Card')}`}
              ${prog && prog.member_id ? ` • ID: <span class="mono">${escapeHtml(prog.member_id)}</span>` : ''}
            </div>
            <div style="font-size: 18px; font-weight: 800; color: var(--text-primary); margin-top: 2px;">
              ${escapeHtml(prog ? prog.name : primaryCard.name)}
            </div>
            ${primaryCard ? `
              <div style="font-size: 12px; color: var(--text-secondary); margin-top: 3px;">
                💳 <strong>${escapeHtml(primaryCard.name)}</strong> • Fee: <strong>${fmtUsd(totalFees)}/yr</strong> • ⚡ ${escapeHtml(primaryCard.multipliers || 'Travel Rewards')}
              </div>
              ${renderCardCredentialsStripHtml(primaryCard, true)}
            ` : ''}
          </div>
        </div>
        ${prog ? `
          <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
            ${renderQuickPointsBlockHtml(prog, true)}
            <div style="font-size: 12px; font-weight: 700; color: var(--text-secondary);">
              Est. Value: ${fmtUsd(valUsd)} (@ ${cpp.toFixed(2)}¢/pt)
            </div>
          </div>
        ` : ''}
      </div>
    `;

    // 2. 4 KPI Strip Tiles inside Mini-Dashboard
    const kpisHtml = `
      <div class="qr-kpi-strip" style="margin-bottom: 0;">
        <div class="qr-kpi-tile" style="${totalAvailUsd > 0 ? 'border-color: rgba(16, 185, 129, 0.4); background: rgba(16, 185, 129, 0.06);' : ''}">
          <span class="qr-kpi-label">💚 Reward Available (Credits)</span>
          <span class="qr-kpi-val mono" style="color: var(--accent-primary);">${fmtUsd(totalAvailUsd)}</span>
          <span class="qr-kpi-sub">Used ${fmtUsd(totalUsedUsd)} of ${fmtUsd(totalCredUsd)} total</span>
        </div>
        <div class="qr-kpi-tile">
          <span class="qr-kpi-label">🎟️ Free Nights &amp; Perks</span>
          <span class="qr-kpi-val mono" style="color: var(--accent-sky);">${availCerts.length} Avail (${fmtUsd(availCertsVal)})</span>
          <span class="qr-kpi-sub">${linkedCerts.length} total perk(s) linked</span>
        </div>
        <div class="qr-kpi-tile">
          <span class="qr-kpi-label">💳 Annual Fee vs. Value</span>
          <span class="qr-kpi-val mono" style="color: ${netKeeper >= 0 ? 'var(--accent-primary)' : 'var(--accent-amber)'};">
            ${netKeeper >= 0 ? '+' : ''}${fmtUsd(netKeeper)} Net
          </span>
          <span class="qr-kpi-sub">${fmtUsd(totalFees)}/yr total annual fee</span>
        </div>
        <div class="qr-kpi-tile">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
            <span class="qr-kpi-label">🎯 ${escapeHtml(metricLabel)}</span>
            ${prog && qTgt > 0 && qTgt <= 365 ? `
              <div style="display: inline-flex; align-items: center; gap: 4px;">
                <button type="button" class="btn-stepper" data-step-rnights="${escapeHtml(prog.id)}" data-delta="-1" title="-1 Night">-</button>
                <button type="button" class="btn-stepper" data-step-rnights="${escapeHtml(prog.id)}" data-delta="1" title="+1 Night">+1</button>
              </div>
            ` : ''}
          </div>
          <span class="qr-kpi-val mono">${qTgt > 0 ? `${qCur} / ${qTgt} (${qPct}%)` : (prog && prog.status_tier ? escapeHtml(prog.status_tier) : 'Active')}</span>
          ${prog && qTgt > 0 ? `
            <div class="progress-track" style="height: 5px; margin-top: 2px;">
              <div class="progress-fill" style="width: ${qPct}%; background-color: var(--accent-primary);"></div>
            </div>
          ` : `
            <span class="qr-kpi-sub">${prog ? escapeHtml(prog.expiration_policy || 'Active') : escapeHtml(primaryCard.ftf || '$0 FX Fee')}</span>
          `}
        </div>
      </div>
    `;

    // 3. Sub-Dashboard Navigation Bar
    const subnavHtml = `
      <div class="md-subnav-bar">
        <button type="button" class="md-subnav-btn ${tab === 'overview' ? 'active' : ''}" data-md-switch-tab="overview">
          📊 All-In-One Overview
        </button>
        <button type="button" class="md-subnav-btn ${tab === 'credits' ? 'active' : ''}" data-md-switch-tab="credits">
          💳 Statement Credits &amp; Reset Dates (${totalCreditsCount})
        </button>
        <button type="button" class="md-subnav-btn ${tab === 'perks' ? 'active' : ''}" data-md-switch-tab="perks">
          🎟️ Free Nights &amp; Perks (${linkedCerts.length})
        </button>
        <button type="button" class="md-subnav-btn ${tab === 'rules' ? 'active' : ''}" data-md-switch-tab="rules">
          ℹ️ Multipliers, Partners &amp; Rules
        </button>
      </div>
    `;

    // Build sections based on active tab (or show all neatly organized in Overview)
    const creditsBlockHtml = `
      <div class="qr-section-box" style="margin-bottom: 0;">
        <div class="qr-section-header">
          <h4>💳 Interactive Statement Credits, "Reward Available" &amp; Reset Schedule</h4>
          ${prog ? `<button type="button" class="btn btn-sm" data-add-card-for-prog="${escapeHtml(prog.name)}">+ Add / Link Card</button>` : ''}
        </div>
        ${linkedCards.length === 0 ? `
          <div style="padding: 12px; color: var(--text-muted); font-size: 12.5px;">No credit card linked yet.</div>
        ` : linkedCards.map(c => {
          const crs = Array.isArray(c.credits) ? c.credits : [];
          return `
            <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px;">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 10px; background: var(--bg-surface); border-radius: 7px; border: 1px solid var(--border-subtle);">
                <div style="display: flex; align-items: center; gap: 10px;">
                  ${renderCreditCardArtHtml(c, 'cc-art-xs')}
                  <div>
                    <div style="font-size: 13px; font-weight: 700; color: var(--text-primary);">${escapeHtml(c.name)} ${ownerBadgeHtml(c, 'xs')}</div>
                    <div style="font-size: 11px; color: var(--text-muted);">Annual Fee: ${fmtUsd(c.annual_fee || 0)}/yr • Renews: ${escapeHtml(c.renewal_date || 'Annual')}</div>
                    ${renderCardCredentialsStripHtml(c, true)}
                  </div>
                </div>
                <button type="button" class="btn btn-sm" data-md-edit-card="${escapeHtml(c.id)}">✎ Edit Card &amp; Credits</button>
              </div>
              ${crs.length === 0
                ? `<div style="font-size: 12px; color: var(--text-muted); padding: 4px 8px;">No statement credits configured on this card.</div>`
                : crs.map((cr, idx) => renderInteractiveCreditRowHtml(c, cr, idx, false)).join('')}
            </div>
          `;
        }).join('')}
      </div>
    `;

    const perksBlockHtml = `
      <div class="qr-section-box" style="margin-bottom: 0;">
        <div class="qr-section-header">
          <h4>🎟️ Free Night Certificates, Companion Passes &amp; Lounge Perks (${linkedCerts.length})</h4>
          ${prog ? `<button type="button" class="btn btn-sm" data-add-cert-for-prog="${escapeHtml(prog.name)}">+ Add Perk</button>` : ''}
        </div>
        <div class="qr-compact-list">
          ${linkedCerts.length === 0 ? `
            <div style="padding: 12px; color: var(--text-muted); font-size: 12.5px;">No certificates or perks linked yet.</div>
          ` : linkedCerts.map(cert => {
            const isRed = cert.status === 'redeemed';
            const expD = cert.expires_date || cert.expiration_date || '';
            const daysLeft = daysUntilDate(expD);
            const cVal = Number(cert.est_value_usd ?? cert.estimated_value_usd ?? 0);
            return `
              <div class="qr-compact-row" style="${isRed ? 'opacity: 0.68;' : ''}">
                <div style="min-width: 0; flex: 1;">
                  <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <span style="${isRed ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">🎟️ ${escapeHtml(cert.title)}</span>
                    <span class="credit-avail-pill" style="font-size: 10.5px;">Est. Value: ${fmtUsd(cVal)}</span>
                  </div>
                  <div style="font-size: 11.5px; color: var(--text-secondary); margin-top: 2px;">
                    ${cert.cap_details ? `${escapeHtml(cert.cap_details)} • ` : ''}
                    ${isRed ? '✅ Redeemed' : (daysLeft <= 60 && daysLeft >= 0 ? `🔴 Use by ${escapeHtml(expD)} (${daysLeft}d left)` : `Use by ${escapeHtml(expD)}`)}
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <button type="button" class="btn btn-sm ${isRed ? '' : 'btn-primary'}" data-toggle-rcert="${escapeHtml(cert.id)}">
                    ${isRed ? '↺ Restore Available' : '✓ Mark Used'}
                  </button>
                  <button type="button" class="btn btn-sm" data-md-edit-cert="${escapeHtml(cert.id)}">✎ Edit</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    const rulesBlockHtml = `
      <div class="qr-section-box" style="margin-bottom: 0;">
        <div class="qr-section-header">
          <h4>ℹ️ Earning Multipliers, Transfer Partners &amp; Strategy Notes</h4>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px; font-size: 12.5px; color: var(--text-secondary);">
          ${prog ? `
            <div>💰 <strong>Estimated Value:</strong> <span class="mono" style="color: var(--accent-primary); font-weight: 700;">${fmtUsd(valUsd)}</span> (@ ${cpp.toFixed(2)}¢/pt valuation)</div>
          ` : ''}
          ${primaryCard ? `
            <div>⚡ <strong>Card Earning Multipliers:</strong> ${escapeHtml(primaryCard.multipliers || 'Travel Rewards')}</div>
            <div>🎯 <strong>Best Card Swipe For:</strong> ${escapeHtml(primaryCard.best_for || 'General Travel')}</div>
            <div>🌍 <strong>Foreign Transaction Fee:</strong> ${escapeHtml(primaryCard.ftf || '$0 Foreign Transaction Fee')}</div>
          ` : ''}
          ${prog ? `
            ${prog.transfer_partners ? `<div>🔄 <strong>Transfer Partners:</strong> ${escapeHtml(prog.transfer_partners)}</div>` : ''}
            <div>⏳ <strong>Point Expiration Policy:</strong> ${escapeHtml(prog.expiration_policy || 'Active')}</div>
            ${prog.notes ? `<div>💡 <strong>Strategy Notes:</strong> ${escapeHtml(prog.notes)}</div>` : ''}
          ` : ''}
        </div>
        ${prog && Array.isArray(prog.custom_fields) && prog.custom_fields.length > 0 ? `
          <div class="custom-fields-wrap" style="margin-top: 8px;">
            ${prog.custom_fields.map(f => `
              <span class="custom-field-chip" title="${escapeHtml(f.label)}: ${escapeHtml(f.value)}">
                <strong>${escapeHtml(f.label)}:</strong> ${escapeHtml(f.value)}
              </span>
            `).join('')}
          </div>
        ` : ''}
        ${primaryCard && Array.isArray(primaryCard.custom_fields) && primaryCard.custom_fields.length > 0 ? `
          <div class="custom-fields-wrap" style="margin-top: 8px;">
            ${primaryCard.custom_fields.map(f => `
              <span class="custom-field-chip" title="${escapeHtml(f.label)}: ${escapeHtml(f.value)}">
                <strong>${escapeHtml(f.label)}:</strong> ${escapeHtml(f.value)}
              </span>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;

    let tabBodyHtml = '';
    if (tab === 'credits') {
      tabBodyHtml = creditsBlockHtml;
    } else if (tab === 'perks') {
      tabBodyHtml = perksBlockHtml;
    } else if (tab === 'rules') {
      tabBodyHtml = rulesBlockHtml;
    } else {
      tabBodyHtml = creditsBlockHtml + perksBlockHtml + rulesBlockHtml;
    }

    body.innerHTML = heroHtml + kpisHtml + subnavHtml + tabBodyHtml;

    if (footer) {
      const targetWebItem = prog || primaryCard;
      const webUrl = resolveRewardWebsiteUrl(targetWebItem, !prog);
      footer.innerHTML = `
        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
          ${prog ? `<button type="button" class="btn btn-sm" data-quick-redeem-prog="${escapeHtml(prog.name)}">✈️ Redeem</button>` : ''}
          <a
            href="${escapeHtml(webUrl)}"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-sm"
            data-open-reward-website="${escapeHtml(webUrl)}"
            data-copy-member-on-open="${escapeHtml((prog && prog.member_id) || '')}"
            data-reward-label="${escapeHtml(targetWebItem ? targetWebItem.name : 'Account')}"
            style="text-decoration: none;"
          >
            🌐 Website
          </a>
          ${prog ? `<button type="button" class="btn btn-sm" data-update-rprog="${escapeHtml(prog.id)}" title="Check & update latest program perks, valuations and rules">🔄 Update</button>` : ''}
          ${!prog && primaryCard ? `<button type="button" class="btn btn-sm" data-update-rcard="${escapeHtml(primaryCard.id)}" title="Check & update latest statement credits, annual fee, and multipliers">🔄 Update</button>` : ''}
          ${prog ? `<button type="button" class="btn btn-sm" data-md-edit-prog="${escapeHtml(prog.id)}">✎ Edit Program</button>` : ''}
          ${primaryCard ? `<button type="button" class="btn btn-sm" data-md-edit-card="${escapeHtml(primaryCard.id)}">💳 Edit Card</button>` : ''}
          ${prog ? `<button type="button" class="btn btn-sm" data-add-cert-for-prog="${escapeHtml(prog.name)}">🎟️ + Add Perk</button>` : ''}
          ${prog ? `<button type="button" class="btn btn-sm btn-danger-ghost" data-del-rprog="${escapeHtml(prog.id)}" title="Delete Loyalty Program">🗑️ Delete</button>` : ''}
          ${!prog && primaryCard ? `<button type="button" class="btn btn-sm btn-danger-ghost" data-del-rcard="${escapeHtml(primaryCard.id)}" title="Delete Credit Card">🗑️ Delete</button>` : ''}
        </div>
        <button type="button" class="btn btn-primary" data-close-modal="modal-reward-mini-dashboard">Done</button>
      `;
    }
  }

  function renderRewardsMatrixTab() {
    // Populate #calc-program dropdown if needed
    const progSelect = document.getElementById('calc-program');
    if (progSelect) {
      const prevVal = progSelect.value;
      const progOpts = state.rewards.programs.map(p => {
        const cpp = Number(p.cpp ?? p.cpp_valuation ?? 1.5);
        return `<option value="${escapeHtml(p.name)}" data-cpp="${cpp}">${escapeHtml(p.name)} (Target: ${cpp.toFixed(2)}¢/pt)</option>`;
      });
      if (progOpts.length === 0) {
        progOpts.push(`<option value="World of Hyatt" data-cpp="2.2">World of Hyatt (Target: 2.20¢/pt)</option>`);
      }
      progSelect.innerHTML = progOpts.join('');
      if (prevVal && Array.from(progSelect.options).some(o => o.value === prevVal)) {
        progSelect.value = prevVal;
      }
    }

    updateCppCalculator();

    // Update filter chips
    document.querySelectorAll('#matrix-bank-filter-chips [data-matrix-filter]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-matrix-filter') === state.matrixBankFilter);
    });

    const tbody = document.getElementById('transfer-matrix-tbody');
    if (!tbody) return;

    const filter = state.matrixBankFilter || 'all';
    const rows = TRANSFER_PARTNER_MATRIX_ROWS.filter(r =>
      filter === 'all' ? true : r.banks.includes(filter)
    );

    tbody.innerHTML = rows.map(r => `
      <tr>
        <td style="font-weight: 700; color: var(--text-primary);">${escapeHtml(r.partner)}</td>
        <td><span class="kpi-tag sky">${escapeHtml(r.type)}</span></td>
        <td class="mono" style="font-weight: 600; color: ${r.chase !== '—' ? 'var(--accent-primary)' : 'var(--text-muted)'};">${escapeHtml(r.chase)}</td>
        <td class="mono" style="font-weight: 600; color: ${r.amex !== '—' ? 'var(--accent-primary)' : 'var(--text-muted)'};">${escapeHtml(r.amex)}</td>
        <td class="mono" style="font-weight: 600; color: ${r.capone !== '—' ? 'var(--accent-primary)' : 'var(--text-muted)'};">${escapeHtml(r.capone)}</td>
        <td class="mono" style="font-weight: 600; color: ${r.bilt !== '—' ? 'var(--accent-primary)' : 'var(--text-muted)'};">${escapeHtml(r.bilt)}</td>
        <td class="mono" style="font-weight: 600; color: ${r.citi !== '—' ? 'var(--accent-primary)' : 'var(--text-muted)'};">${escapeHtml(r.citi)}</td>
        <td style="font-size: 12px; color: var(--text-secondary);">${escapeHtml(r.sweetSpot)}</td>
      </tr>
    `).join('');
  }

  function updateCppCalculator() {
    const progSelect = document.getElementById('calc-program');
    const ptsEl = document.getElementById('calc-points');
    const cashEl = document.getElementById('calc-cash');
    const feesEl = document.getElementById('calc-fees');
    const box = document.getElementById('calc-result-box');
    if (!ptsEl || !cashEl || !feesEl || !box) return;

    const pts = Math.max(1, Number(ptsEl.value) || 0);
    const cash = Math.max(0, Number(cashEl.value) || 0);
    const fees = Math.max(0, Number(feesEl.value) || 0);
    const netSaved = Math.max(0, cash - fees);
    const cpp = (netSaved * 100) / pts;

    let benchmarkCpp = 1.6;
    let progName = 'Selected Program';
    if (progSelect && progSelect.selectedOptions[0]) {
      progName = progSelect.value;
      benchmarkCpp = Number(progSelect.selectedOptions[0].getAttribute('data-cpp')) || 1.6;
    }

    const isGreat = cpp >= benchmarkCpp;
    const verdict = cpp >= benchmarkCpp * 1.35
      ? '🔥 OUTSTANDING SWEET SPOT — Book with Points!'
      : isGreat
      ? '✅ ABOVE BENCHMARK — Solid Point Redemption'
      : '⚠️ BELOW BENCHMARK — Consider Paying Cash & Saving Points';

    box.style.borderLeftColor = isGreat ? 'var(--accent-primary)' : 'var(--accent-amber)';
    box.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
        <div>
          <div style="font-size: 11.5px; font-weight: 700; color: ${isGreat ? 'var(--accent-primary)' : 'var(--accent-amber)'};">
            ${verdict}
          </div>
          <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
            Net Cash Saved: <strong class="mono">${fmtUsd(netSaved)}</strong> vs. ${escapeHtml(progName)} target of <strong class="mono">${benchmarkCpp.toFixed(2)}¢/pt</strong>
          </div>
        </div>
        <div class="mono tabular" style="font-size: 22px; font-weight: 700; color: ${isGreat ? 'var(--accent-primary)' : 'var(--accent-amber)'};">
          ${cpp.toFixed(2)}¢ / pt
        </div>
      </div>
    `;
  }

  function renderRewardsRedemptionsTab() {
    const tbody = document.getElementById('rewards-redemptions-tbody');
    if (!tbody) return;

    const tripMap = new Map(state.trips.map(t => [t.id, t]));
    if (state.rewards.redemptions.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; padding: 28px; color: var(--text-muted);">
            No point or certificate redemptions logged yet. Click <strong>+ Log Point / Cert Redemption</strong> to track how much cash your miles and free nights save on each trip!
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = state.rewards.redemptions.map(r => {
      const trip = tripMap.get(r.trip_id);
      const tripLabel = trip ? trip.name : 'General Travel';
      const pts = Number(r.points_used || 0);
      const cash = Number(r.cash_price_usd || 0);
      const fees = Number(r.taxes_fees_usd || 0);
      const saved = Number(r.net_saved_usd ?? Math.max(0, cash - fees));
      const cpp = Number(r.cpp ?? r.cpp_achieved ?? (pts > 0 ? (saved * 100) / pts : 0));

      return `
        <tr>
          <td class="mono" style="white-space: nowrap;">${escapeHtml(r.date || r.redemption_date || '')}</td>
          <td>
            <div style="font-weight: 700; color: var(--text-primary);">${escapeHtml(r.title || r.item_title || '')}</div>
            ${r.notes ? `<div style="font-size: 11.5px; color: var(--text-muted);">${escapeHtml(r.notes)}</div>` : ''}
          </td>
          <td><span class="kpi-tag sky">${escapeHtml(tripLabel)}</span></td>
          <td>
            <div style="font-weight: 600;">${escapeHtml(r.program || '')}</div>
            <div style="font-size: 11.5px; color: var(--text-muted);">${escapeHtml(r.redemption_type || 'Points')}</div>
          </td>
          <td class="mono tabular" style="text-align: right; font-weight: 600;">${pts > 0 ? `${pts.toLocaleString('en-US')} pts` : 'Cert (0 pts)'}</td>
          <td class="mono tabular" style="text-align: right;">${fmtUsd(cash)}</td>
          <td class="mono tabular" style="text-align: right; color: var(--text-muted);">${fmtUsd(fees)}</td>
          <td class="mono tabular" style="text-align: right; font-weight: 700; color: var(--accent-primary);">${fmtUsd(saved)}</td>
          <td class="mono tabular" style="text-align: right;">
            <span class="kpi-tag positive">${pts > 0 ? `${cpp.toFixed(2)}¢/pt` : 'Free Night'}</span>
          </td>
          <td style="text-align: right;">
            <div class="row-actions" style="justify-content: flex-end;">
              <button type="button" class="btn btn-sm" data-edit-rred="${escapeHtml(r.id)}">Edit</button>
              <button type="button" class="btn btn-sm btn-danger-ghost" data-del-rred="${escapeHtml(r.id)}">✕</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  const PRESET_ADVISOR_DESTINATIONS = {
    argentina: {
      dest: 'Buenos Aires & Patagonia, Argentina (EZE / AEP / BRC)',
      nights: 8,
      origin: 'US Gateway (MIA / JFK / DFW / IAH)',
      style: 'stretch'
    },
    brazil: {
      dest: 'São Paulo & Rio de Janeiro, Brazil (GRU / GIG / SDU)',
      nights: 7,
      origin: 'US Gateway (MIA / JFK / ATL / ORD)',
      style: 'stretch'
    },
    japan: {
      dest: 'Tokyo & Kyoto, Japan (HND / NRT / KIX)',
      nights: 10,
      origin: 'US West/Central (LAX / SFO / ORD / JFK)',
      style: 'luxury'
    },
    europe: {
      dest: 'London, Paris & Rome, Europe (LHR / CDG / FCO)',
      nights: 9,
      origin: 'US East Coast (JFK / BOS / IAD / ORD)',
      style: 'stretch'
    },
    mexico: {
      dest: 'Mexico City & Riviera Maya, Mexico (MEX / CUN)',
      nights: 5,
      origin: 'US Hub (DFW / IAH / MIA / LAX)',
      style: 'zero_cash'
    },
    domestic: {
      dest: 'Domestic Production Shoot (LAX / JFK / LAS / MIA)',
      nights: 4,
      origin: 'Home Base',
      style: 'zero_cash'
    }
  };

  let lastAiAnalysisResponse = null;

  function renderAiTripAdvisorTab() {
    const pane = document.getElementById('rewards-pane-advisor');
    if (!pane) return;

    // 1. Populate trip dropdown
    const tripSelect = document.getElementById('advisor-trip-select');
    if (tripSelect && tripSelect.options.length <= 1) {
      tripSelect.innerHTML = `
        <option value="custom">🌍 Custom Destination / Manual Entry</option>
        ${state.trips.map(t => `
          <option value="${escapeHtml(t.id)}" ${t.id === state.selectedTripId ? 'selected' : ''}>
            ${escapeHtml(t.name)} (${escapeHtml(t.destination || 'Shoot')})
          </option>
        `).join('')}
      `;
    }

    // 2. Engine status badge
    const badge = document.getElementById('ai-engine-status-badge');
    if (badge) {
      if (state.settings && state.settings.ai_key_configured) {
        badge.className = 'kpi-tag sky';
        badge.innerHTML = '✨ Hybrid AI Ready: Instant Strategy Engine + Live AI Model';
      } else {
        badge.className = 'kpi-tag';
        badge.innerHTML = '⚡ Instant Built-In Strategy Engine Active (Zero Setup Required)';
      }
    }

    // 3. Container
    const container = document.getElementById('ai-trip-advisor-results');
    if (!container) return;

    const destInput = document.getElementById('advisor-destination-input');
    const dest = (destInput ? destInput.value : 'Argentina').trim() || 'Argentina';
    const nightsInput = document.getElementById('advisor-nights-input');
    const nights = Math.max(1, Number(nightsInput ? nightsInput.value : 8) || 8);
    const styleSel = document.getElementById('advisor-style-select');
    const style = styleSel ? styleSel.value : 'stretch';

    const progs = state.rewards.programs || [];
    const cards = state.rewards.cards || [];
    const certs = (state.rewards.certificates || []).filter(c => c.status !== 'redeemed');

    const findProg = (kw) => progs.find(p => (p.name || '').toLowerCase().includes(kw));
    const hyattProg = findProg('hyatt');
    const ihgProg = findProg('ihg');
    const caponeProg = findProg('capital one') || findProg('capone') || findProg('venture');
    const chaseProg = findProg('chase') || findProg('ultimate rewards');
    const amexProg = findProg('amex') || findProg('membership');
    const biltProg = findProg('bilt');
    const marriottProg = findProg('marriott');
    const hiltonProg = findProg('hilton');

    const hyattPts = hyattProg ? Number(hyattProg.points || 0) : 0;
    const ihgPts = ihgProg ? Number(ihgProg.points || 0) : 0;
    const caponePts = caponeProg ? Number(caponeProg.points || 0) : 0;
    const chasePts = chaseProg ? Number(chaseProg.points || 0) : 0;
    const amexPts = amexProg ? Number(amexProg.points || 0) : 0;

    const hasIhgPremier = cards.some(c => (c.name || '').toLowerCase().includes('ihg'));

    let ventureXCredLeft = 0;
    cards.forEach(c => {
      if ((c.name || '').toLowerCase().includes('venture x')) {
        (c.credits || []).forEach(cr => {
          if ((cr.name || '').toLowerCase().includes('travel') || (cr.name || '').toLowerCase().includes('portal')) {
            const tot = Number(cr.total_usd ?? cr.amount ?? 300);
            const used = Number(cr.used_usd ?? (cr.used ? tot : 0));
            ventureXCredLeft += Math.max(0, tot - used);
          }
        });
      }
    });

    const isArgentina = /argentina|buenos\s*aires|patagonia|bariloche|mendoza|eze|aep/i.test(dest);
    const isJapan = /japan|tokyo|kyoto|osaka|hnd|nrt/i.test(dest);
    const isEurope = /europe|london|paris|rome|italy|france|spain|madrid|barcelona/i.test(dest);

    let hotelCardsHtml = '';
    let flightCardsHtml = '';
    let perksCardsHtml = '';
    let playbookHtml = '';
    let estCashSaved = 0;

    if (isArgentina) {
      estCashSaved = 3450;
      const phNightsPossible = Math.floor(hyattPts / 25000);
      hotelCardsHtml += `
        <div class="ai-rec-card ready-match">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
            <div>
              <span class="ai-rec-tag gold">🌟 Top Luxury Redemption</span>
              <h4 style="font-size: 15.5px; font-weight: 800; margin-top: 4px; color: var(--text-primary);">Park Hyatt Buenos Aires – Palacio Duhau</h4>
              <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">Recoleta, Buenos Aires • World of Hyatt Category 6</div>
            </div>
            <div style="text-align: right;">
              <span class="mono" style="font-size: 16px; font-weight: 800; color: var(--accent-primary);">25,000 pts/nt</span>
              <div style="font-size: 11px; color: var(--text-muted);">vs. $680/nt cash (~2.7¢/pt)</div>
            </div>
          </div>
          <p style="font-size: 12.5px; color: var(--text-secondary); margin: 8px 0; line-height: 1.45;">
            One of the world's premier urban palaces, blending a 1934 neoclassical mansion with contemporary luxury and private underground art gallery.
          </p>
          <div class="ai-math-box" style="margin-top: auto;">
            <div style="font-size: 11.5px; font-weight: 700; color: var(--text-primary); margin-bottom: 2px;">
              📊 Your Hyatt Balance: ${hyattPts.toLocaleString('en-US')} pts
            </div>
            <div style="font-size: 11px; color: var(--text-secondary); line-height: 1.4;">
              ${phNightsPossible >= 2
                ? `✓ Covers <strong>${Math.min(nights, phNightsPossible)} night(s) completely free</strong>! Saves <strong style="color: var(--accent-primary);">$${(Math.min(nights, phNightsPossible) * 680).toLocaleString('en-US')}</strong> cash out-of-pocket.`
                : `Use for your arrival or departure luxury stay (25k pts).`}
            </div>
          </div>
        </div>
      `;

      const ihgNightRate = 32000;
      const ihg4NightCost = hasIhgPremier ? (ihgNightRate * 3) : (ihgNightRate * 4);
      hotelCardsHtml += `
        <div class="ai-rec-card ready-match">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
            <div>
              <span class="ai-rec-tag green">⚡ 4th Night Free Super-Stretch</span>
              <h4 style="font-size: 15.5px; font-weight: 800; margin-top: 4px; color: var(--text-primary);">InterContinental Buenos Aires &amp; Patagonia</h4>
              <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">Historic Montserrat/San Telmo • IHG One Rewards</div>
            </div>
            <div style="text-align: right;">
              <span class="mono" style="font-size: 16px; font-weight: 800; color: var(--accent-primary);">~28k–34k pts/nt</span>
              <div style="font-size: 11px; color: var(--accent-amber); font-weight: 700;">4th Night FREE Active</div>
            </div>
          </div>
          <p style="font-size: 12.5px; color: var(--text-secondary); margin: 8px 0; line-height: 1.45;">
            Classic luxury hotel close to tango halls, San Telmo market, and Plaza de Mayo with indoor heated pool and executive club lounge.
          </p>
          <div class="ai-math-box" style="margin-top: auto;">
            <div style="font-size: 11.5px; font-weight: 700; color: var(--text-primary); margin-bottom: 2px;">
              📊 Your IHG Balance: ${ihgPts.toLocaleString('en-US')} pts ${hasIhgPremier ? '• Chase IHG Premier Linked' : ''}
            </div>
            <div style="font-size: 11px; color: var(--text-secondary); line-height: 1.4;">
              ${hasIhgPremier
                ? `Book 4 nights for only <strong>~${ihg4NightCost.toLocaleString('en-US')} pts total</strong> (saving ~${ihgNightRate.toLocaleString('en-US')} pts on the free 4th night)! With ${ihgPts.toLocaleString('en-US')} pts, you can cover your entire stay.`
                : `With ${ihgPts.toLocaleString('en-US')} pts, you have plenty of points to cover multiple weeks of hotel stays with zero room charges.`}
            </div>
          </div>
        </div>
      `;

      flightCardsHtml += `
        <div class="ai-rec-card transfer-match">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
            <div>
              <span class="ai-rec-tag sky">✈️ Transfer Partner Sweet Spot</span>
              <h4 style="font-size: 15.5px; font-weight: 800; margin-top: 4px; color: var(--text-primary);">Avianca LifeMiles / Air Canada Aeroplan</h4>
              <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">1:1 Instant Transfer from Capital One Miles • Star Alliance</div>
            </div>
            <div style="text-align: right;">
              <span class="mono" style="font-size: 16px; font-weight: 800; color: var(--accent-sky);">30k–35k mi/way</span>
              <div style="font-size: 11px; color: var(--text-muted);">Economy (60k Biz)</div>
            </div>
          </div>
          <p style="font-size: 12.5px; color: var(--text-secondary); margin: 8px 0; line-height: 1.45;">
            Transfer Capital One miles 1:1 to Avianca LifeMiles or Aeroplan to book United / Avianca flights to Buenos Aires (EZE) with zero fuel surcharges.
          </p>
          <div class="ai-math-box" style="margin-top: auto;">
            <div style="font-size: 11.5px; font-weight: 700; color: var(--text-primary); margin-bottom: 2px;">
              📊 Your Balance: ${caponePts.toLocaleString('en-US')} Capital One Miles
            </div>
            <div style="font-size: 11px; color: var(--text-secondary); line-height: 1.4;">
              ${caponePts >= 60000
                ? `✓ Covers a roundtrip flight (or one-way Business class) to Argentina! Saves ~$900–$1,400 in cash airfare.`
                : `Covers a one-way award ticket (~30k–35k miles). Top off or pair with portal credit.`}
            </div>
          </div>
        </div>
      `;

      flightCardsHtml += `
        <div class="ai-rec-card credit-match">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
            <div>
              <span class="ai-rec-tag amber">💳 Remaining Travel Credit Play</span>
              <h4 style="font-size: 15.5px; font-weight: 800; margin-top: 4px; color: var(--text-primary);">Domestic Argentina Flights (AEP ⇄ BRC / IGR)</h4>
              <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">Capital One Travel Portal • Aerolíneas Argentinas / Flybondi</div>
            </div>
            <div style="text-align: right;">
              <span class="mono" style="font-size: 16px; font-weight: 800; color: var(--accent-amber);">$${ventureXCredLeft > 0 ? ventureXCredLeft.toFixed(0) : '300'} Credit</span>
              <div style="font-size: 11px; color: var(--text-muted);">$0 out-of-pocket</div>
            </div>
          </div>
          <p style="font-size: 12.5px; color: var(--text-secondary); margin: 8px 0; line-height: 1.45;">
            Domestic flights inside Argentina (e.g. Buenos Aires Aeroparque AEP to Bariloche or Iguazu Falls) usually cost $75–$140 each. Burn your remaining Venture X travel credit to wipe these out completely!
          </p>
          <div class="ai-math-box" style="margin-top: auto;">
            <div style="font-size: 11.5px; font-weight: 700; color: var(--text-primary); margin-bottom: 2px;">
              📊 Statement Credit Status: ${ventureXCredLeft > 0 ? `$${ventureXCredLeft.toFixed(2)} remaining` : 'Use annual $300 reset'}
            </div>
            <div style="font-size: 11px; color: var(--text-secondary); line-height: 1.4;">
              Book through Capital One Travel portal to trigger the statement credit automatically before your card anniversary reset date.
            </div>
          </div>
        </div>
      `;

      perksCardsHtml += `
        <div class="ai-rec-card">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
            <div>
              <span class="ai-rec-tag green">💵 Argentina Secret: Dólar Tarjeta / MEP</span>
              <h4 style="font-size: 15.5px; font-weight: 800; margin-top: 4px; color: var(--text-primary);">Credit Card FX &amp; MEP Exchange Rate</h4>
              <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">US Visa &amp; Mastercard automatically get the preferential tourist rate</div>
            </div>
          </div>
          <p style="font-size: 12.5px; color: var(--text-secondary); margin: 8px 0; line-height: 1.45;">
            When paying with a foreign credit card in Argentina, foreign transaction fees must be $0. The Argentine government automatically applies the MEP tourist rate (saving ~40% vs official rate) directly onto your statement!
          </p>
          <div style="display: flex; flex-direction: column; gap: 4px; font-size: 11.5px; margin-top: auto; padding-top: 6px;">
            <div>⚡ <strong>Best Catch-All:</strong> Capital One Venture X (2x miles on all non-category spend, $0 FTF).</div>
            <div>🍷 <strong>Best Dining / Steakhouses:</strong> Chase Sapphire Reserve (3x) or Amex Gold (4x on dining, $0 FTF).</div>
          </div>
        </div>

        <div class="ai-rec-card">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
            <div>
              <span class="ai-rec-tag sky">🛋️ Airport Lounge Access</span>
              <h4 style="font-size: 15.5px; font-weight: 800; margin-top: 4px; color: var(--text-primary);">Priority Pass Select at EZE &amp; Gateways</h4>
              <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">Venture X / Amex Platinum Priority Pass Included</div>
            </div>
          </div>
          <p style="font-size: 12.5px; color: var(--text-secondary); margin: 8px 0; line-height: 1.45;">
            Enjoy complimentary food, Malbec wine, hot showers, and Wi-Fi at Buenos Aires Ezeiza (EZE) Star Alliance Lounge &amp; Aeropuertos VIP Club, plus layovers at MIA, DFW, or JFK.
          </p>
          <div class="ai-math-box" style="margin-top: auto;">
            <div style="font-size: 11px; color: var(--accent-primary); font-weight: 700;">
              ✓ Saves ~$80–$160 in airport meals per person across roundtrip journey.
            </div>
          </div>
        </div>
      `;

      playbookHtml = `
        <div class="ai-playbook-step">
          <div class="ai-step-num">1</div>
          <div style="flex: 1;">
            <div style="font-size: 13.5px; font-weight: 700; color: var(--text-primary);">Transfer Capital One Miles to Avianca LifeMiles or Aeroplan</div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
              Search award seats first on LifeMiles/Aeroplan. Transfer 60k–70k miles 1:1 once seats are confirmed. (Capital One miles: ${caponePts.toLocaleString('en-US')}).
            </div>
          </div>
        </div>
        <div class="ai-playbook-step">
          <div class="ai-step-num">2</div>
          <div style="flex: 1;">
            <div style="font-size: 13.5px; font-weight: 700; color: var(--text-primary);">Book 4 Nights at InterContinental Buenos Aires to Trigger 4th Night Free</div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
              Use ~96k of your ${ihgPts.toLocaleString('en-US')} IHG points. The 4th consecutive night is completely free with your IHG Premier card.
            </div>
          </div>
        </div>
        <div class="ai-playbook-step">
          <div class="ai-step-num">3</div>
          <div style="flex: 1;">
            <div style="font-size: 13.5px; font-weight: 700; color: var(--text-primary);">Book 2–3 Nights at Park Hyatt Buenos Aires (Palacio Duhau)</div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
              Redeem 50k–75k of your ${hyattPts.toLocaleString('en-US')} Hyatt points for an unforgettable luxury palace stay in Recoleta (saves ~$1,400–$2,100 cash).
            </div>
          </div>
        </div>
        <div class="ai-playbook-step">
          <div class="ai-step-num">4</div>
          <div style="flex: 1;">
            <div style="font-size: 13.5px; font-weight: 700; color: var(--text-primary);">Burn Remaining Venture X Travel Credit on Domestic Flights</div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
              Book Aerolíneas Argentinas or Flybondi flights (e.g. to Bariloche or Iguazu) through the Capital One portal to use remaining credits ($${ventureXCredLeft > 0 ? ventureXCredLeft.toFixed(0) : '300'}).
            </div>
          </div>
        </div>
        <div class="ai-playbook-step">
          <div class="ai-step-num">5</div>
          <div style="flex: 1;">
            <div style="font-size: 13.5px; font-weight: 700; color: var(--text-primary);">Swipe $0 Foreign Transaction Fee Cards Everywhere in Argentina</div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
              Venture X (2x) for general spend, Sapphire/Amex Gold (3x-4x) for restaurants. Never pay in USD cash when credit card gets the official MEP tourist exchange rate!
            </div>
          </div>
        </div>
      `;
    } else {
      estCashSaved = 2150;
      hotelCardsHtml = `
        <div class="ai-rec-card ready-match">
          <h4 style="font-size: 15.5px; font-weight: 800; color: var(--text-primary);">World of Hyatt Award Stays (${hyattPts.toLocaleString('en-US')} pts)</h4>
          <p style="font-size: 12.5px; color: var(--text-secondary); margin: 6px 0;">
            Target Category 1–4 properties (8k–15k pts) or luxury Category 6–7 (25k–30k pts) in ${escapeHtml(dest)}. Hyatt points consistently yield 2.0¢–2.8¢/point in value.
          </p>
        </div>
        <div class="ai-rec-card ready-match">
          <h4 style="font-size: 15.5px; font-weight: 800; color: var(--text-primary);">IHG One Rewards (${ihgPts.toLocaleString('en-US')} pts)</h4>
          <p style="font-size: 12.5px; color: var(--text-secondary); margin: 6px 0;">
            Book in 4-night increments to trigger the automatic 4th Night Free perk with your IHG Premier card.
          </p>
        </div>
      `;
      flightCardsHtml = `
        <div class="ai-rec-card transfer-match">
          <h4 style="font-size: 15.5px; font-weight: 800; color: var(--text-primary);">Capital One Miles (${caponePts.toLocaleString('en-US')} pts)</h4>
          <p style="font-size: 12.5px; color: var(--text-secondary); margin: 6px 0;">
            Transfer 1:1 to Star Alliance (Aeroplan, Avianca), SkyTeam (Flying Blue), or Oneworld (British Airways) partners for peak redemption value to ${escapeHtml(dest)}.
          </p>
        </div>
      `;
      perksCardsHtml = `
        <div class="ai-rec-card">
          <h4 style="font-size: 15.5px; font-weight: 800; color: var(--text-primary);">Priority Pass &amp; $0 FTF Protection</h4>
          <p style="font-size: 12.5px; color: var(--text-secondary); margin: 6px 0;">
            Activate Priority Pass on Venture X / Platinum before departing. Use cards with $0 foreign transaction fees for all international transactions.
          </p>
        </div>
      `;
      playbookHtml = `
        <div class="ai-playbook-step">
          <div class="ai-step-num">1</div>
          <div style="flex: 1;">Book long-haul flight awards via transferable bank miles before availability vanishes.</div>
        </div>
        <div class="ai-playbook-step">
          <div class="ai-step-num">2</div>
          <div style="flex: 1;">Reserve hotel award nights utilizing 4th night free or Hyatt fixed award chart.</div>
        </div>
      `;
    }

    let llmBoxHtml = '';
    if (lastAiAnalysisResponse && lastAiAnalysisResponse.analysisText) {
      llmBoxHtml = `
        <div class="ai-llm-response-box" style="margin-bottom: 20px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px;">
            <span style="font-size: 12px; font-weight: 800; color: #8b5cf6; text-transform: uppercase; letter-spacing: 0.06em;">
              🤖 Live AI Model Analysis (${escapeHtml(lastAiAnalysisResponse.provider || 'AI')})
            </span>
            <span class="mono" style="font-size: 11px; color: var(--text-muted);">${new Date().toLocaleTimeString()}</span>
          </div>
          <div style="font-size: 13.5px; line-height: 1.6; color: var(--text-primary); white-space: pre-wrap;">${escapeHtml(lastAiAnalysisResponse.analysisText)}</div>
        </div>
      `;
    }

    container.innerHTML = `
      ${llmBoxHtml}

      <div style="display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 14px 18px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(16, 185, 129, 0.1)); border-radius: 10px; border: 1px solid rgba(139, 92, 246, 0.3); margin-bottom: 20px; flex-wrap: wrap;">
        <div>
          <div style="font-size: 11.5px; font-weight: 800; color: #8b5cf6; text-transform: uppercase; letter-spacing: 0.06em;">
            ✨ Tailored Plan for: ${escapeHtml(dest)} (${nights} Nights)
          </div>
          <div style="font-size: 16px; font-weight: 800; color: var(--text-primary); margin-top: 2px;">
            Estimated Out-of-Pocket Cash Saved: <span class="tabular mono" style="color: var(--accent-primary);">$${estCashSaved.toLocaleString('en-US')} USD</span>
          </div>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
          <span class="kpi-tag green">✓ ${hyattPts.toLocaleString('en-US')} Hyatt Pts</span>
          <span class="kpi-tag green">✓ ${ihgPts.toLocaleString('en-US')} IHG Pts</span>
          <span class="kpi-tag sky">✓ ${caponePts.toLocaleString('en-US')} CapOne Miles</span>
          ${certs.length > 0 ? `<span class="kpi-tag amber">✓ ${certs.length} Free Night Certs</span>` : ''}
        </div>
      </div>

      <div style="margin-bottom: 24px;">
        <h4 style="font-size: 15px; font-weight: 800; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
          <span>🏨 1. Hotel &amp; Award Stay Recommendations</span>
        </h4>
        <div class="ai-rec-grid">
          ${hotelCardsHtml}
        </div>
      </div>

      <div style="margin-bottom: 24px;">
        <h4 style="font-size: 15px; font-weight: 800; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
          <span>✈️ 2. Flights, Airlines &amp; Portal Credit Play</span>
        </h4>
        <div class="ai-rec-grid">
          ${flightCardsHtml}
        </div>
      </div>

      <div style="margin-bottom: 24px;">
        <h4 style="font-size: 15px; font-weight: 800; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
          <span>💵 3. In-Country Card Swipes &amp; Airport Perks</span>
        </h4>
        <div class="ai-rec-grid">
          ${perksCardsHtml}
        </div>
      </div>

      <div style="margin-bottom: 16px;">
        <h4 style="font-size: 15px; font-weight: 800; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
          <span>📋 4. Prioritized Step-by-Step Booking Playbook</span>
        </h4>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${playbookHtml}
        </div>
      </div>
    `;
  }

  async function runAiTripAnalysis() {
    const btn = document.getElementById('btn-run-ai-trip-analysis');
    const oldText = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '⏳ Analyzing Balances & Strategy...';
    }

    try {
      const destInput = document.getElementById('advisor-destination-input');
      const dest = (destInput ? destInput.value : 'Argentina').trim() || 'Argentina';
      const nightsInput = document.getElementById('advisor-nights-input');
      const nights = Math.max(1, Number(nightsInput ? nightsInput.value : 8) || 8);
      const styleSel = document.getElementById('advisor-style-select');
      const style = styleSel ? styleSel.value : 'stretch';
      const originInput = document.getElementById('advisor-origin-input');
      const origin = (originInput ? originInput.value : 'US Gateway').trim();

      const res = await apiRequest('/api/ai/trip-advisor', {
        method: 'POST',
        body: JSON.stringify({
          destination: dest,
          nights,
          origin,
          style,
          trip_id: (document.getElementById('advisor-trip-select') || {}).value || 'custom',
          rewards: state.rewards
        })
      });

      if (res && res.analysisText) {
        lastAiAnalysisResponse = res;
      }
      renderAiTripAdvisorTab();
      showToast(`✨ Generated customized redemption plan for ${dest}!`);
    } catch (err) {
      console.error('AI trip analysis error:', err);
      renderAiTripAdvisorTab();
      showToast('⚡ Strategy generated with built-in rewards engine!');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = oldText;
      }
    }
  }

  async function saveAiApiKeyFromDrawer() {
    const provider = (document.getElementById('ai-provider-select') || {}).value || 'gemini';
    const key = ((document.getElementById('ai-api-key-input') || {}).value || '').trim();
    if (!key) {
      showToast('Please enter an API key');
      return;
    }
    const res = await apiRequest('/api/ai/trip-advisor', {
      method: 'POST',
      body: JSON.stringify({
        saveKey: true,
        clientApiKey: key,
        provider,
        onlySaveKey: true
      })
    });
    if (res && res.ok) {
      if (state.settings) state.settings.ai_key_configured = true;
      showToast(`✓ ${provider === 'gemini' ? 'Google Gemini' : 'OpenAI'} API Key configured!`);
      const drawer = document.getElementById('ai-key-config-drawer');
      if (drawer) drawer.style.display = 'none';
      renderAiTripAdvisorTab();
    } else {
      showToast('Could not save API key');
    }
  }

  function syncRprogColorPickerUi(hexColor) {
    const cleanHex = resolveHexColor(hexColor, '#f59e0b');
    const colInput = document.getElementById('rprog-color-input');
    const hexLabel = document.getElementById('rprog-color-hex-label');
    const swatchContainer = document.getElementById('rprog-color-swatches');
    if (colInput) colInput.value = cleanHex;
    if (hexLabel) hexLabel.textContent = cleanHex;
    if (swatchContainer) {
      swatchContainer.innerHTML = COLOR_SWATCH_PALETTE.map(s => `
        <button type="button" class="color-swatch-btn ${s.hex.toLowerCase() === cleanHex.toLowerCase() ? 'active' : ''}" data-rprog-swatch="${s.hex}" style="background-color: ${s.hex};" title="${escapeHtml(s.label)} (${s.hex})"></button>
      `).join('');
    }
  }

  // Custom Fields Repeater Helpers
  function renderCustomFieldsEditor(containerId, fields = []) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    const arr = Array.isArray(fields) ? fields : [];
    arr.forEach(f => {
      addCustomFieldRow(containerId, f.label || f.key || '', f.value || '', Boolean(f.checked));
    });
  }

  function addCustomFieldRow(containerId, label = '', value = '', checked = false) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'custom-field-row';
    row.innerHTML = `
      <input type="checkbox" class="cfield-checked" style="width: 15px; height: 15px; accent-color: var(--accent-primary); cursor: pointer;" title="Checked / Used" ${checked ? 'checked' : ''} />
      <input type="text" class="form-input form-input-sm cfield-label" placeholder="Field / Perk name (e.g. $150 Delta Stays Credit)" value="${escapeHtml(label)}" />
      <input type="text" class="form-input form-input-sm cfield-value" placeholder="Value / Note (e.g. $150)" value="${escapeHtml(value)}" />
      <button type="button" class="btn btn-sm btn-danger-ghost cfield-del-btn" title="Remove custom field">✕</button>
    `;
    container.appendChild(row);
  }

  function readCustomFields(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return [];
    const rows = container.querySelectorAll('.custom-field-row');
    const fields = [];
    rows.forEach((r, idx) => {
      const lbl = (r.querySelector('.cfield-label') || {}).value || '';
      const val = (r.querySelector('.cfield-value') || {}).value || '';
      const checked = Boolean((r.querySelector('.cfield-checked') || {}).checked);
      const trimmedLbl = lbl.trim();
      const trimmedVal = val.trim();
      if (trimmedLbl || trimmedVal) {
        fields.push({ id: `cf-${Date.now()}-${idx}`, label: trimmedLbl || 'Detail', value: trimmedVal, checked });
      }
    });
    return fields;
  }

  // =========================================================================
  // VISUAL CREDITS EDITOR, CARD ART PREVIEW & DATABASE AUTO-FILL HELPERS
  // =========================================================================
  function renderRcardCreditsVisualEditor(credits = []) {
    const container = document.getElementById('rcard-credits-visual-list');
    if (!container) return;
    container.innerHTML = '';
    const arr = Array.isArray(credits) ? credits : [];
    const renewalVal = ((document.getElementById('rcard-renewal') || {}).value || '').slice(0, 7);
    arr.forEach(cr => {
      const nm = cr.name || cr.label || 'Statement Credit';
      const tot = Number(cr.total_usd ?? cr.amount ?? 0);
      const used = cr.used_usd !== undefined ? Number(cr.used_usd) : (cr.used ? tot : 0);
      const resetDate = cr.reset_date || renewalVal || getDefaultCreditResetMonth(null, cr);
      const resetCycle = cr.reset_cycle || getDefaultCreditResetCycle(cr);
      addRcardCreditVisualRow(nm, tot, used, resetDate, resetCycle);
    });
  }

  function addRcardCreditVisualRow(name = '', total = 100, used = 0, resetDate = '', resetCycle = '') {
    const container = document.getElementById('rcard-credits-visual-list');
    if (!container) return;
    const totNum = Math.max(0, Number(total) || 0);
    const usedNum = Math.min(totNum, Math.max(0, Number(used) || 0));
    const availNum = Math.max(0, Number((totNum - usedNum).toFixed(2)));
    const defaultYm = resetDate || getDefaultCreditResetMonth({ renewal_date: (document.getElementById('rcard-renewal') || {}).value }, { name });
    const defaultCycle = resetCycle || getDefaultCreditResetCycle({ name });
    const cycleOpts = ['Annually', 'Calendar Year (Jan 1)', 'Semi-Annually', 'Quarterly', 'Monthly', 'Every 4 Years'];

    const row = document.createElement('div');
    row.className = 'visual-credit-editor-row';
    row.innerHTML = `
      <input type="text" class="form-input form-input-sm vcred-name" placeholder="Credit / Perk Name (e.g. $300 Annual Travel Credit)" value="${escapeHtml(name)}" />
      <input type="number" min="0" step="0.01" class="form-input form-input-sm mono vcred-total" value="${totNum}" title="Total Credit Amount ($)" />
      <input type="number" min="0" step="0.01" class="form-input form-input-sm mono vcred-used" value="${usedNum}" title="Amount Used So Far ($)" />
      <div class="credit-avail-pill vcred-avail-badge ${availNum === 0 ? 'zero' : ''}" style="justify-content: center; font-size: 11px;">
        ${fmtUsd(availNum)} Avail
      </div>
      <input type="month" class="form-input form-input-sm mono vcred-reset-date" value="${escapeHtml(String(defaultYm).slice(0, 7))}" title="Month & Year this credit resets back to full amount" />
      <select class="form-select form-input-sm vcred-reset-cycle" style="padding: 2px 6px; font-size: 11px;">
        ${cycleOpts.map(opt => `<option value="${escapeHtml(opt)}" ${opt === defaultCycle ? 'selected' : ''}>${escapeHtml(opt)}</option>`).join('')}
      </select>
      <div style="display: flex; gap: 3px;">
        <button type="button" class="btn btn-sm vcred-max-btn" style="padding: 3px 5px; font-size: 10px;" title="Mark 100% Used">✓ Max</button>
        <button type="button" class="btn btn-sm vcred-zero-btn" style="padding: 3px 5px; font-size: 10px;" title="Reset Used to $0 (100% Available)">↺ $0</button>
        <button type="button" class="btn btn-sm btn-danger-ghost vcred-del-btn" style="padding: 3px 5px; font-size: 10px;" title="Remove credit row">✕</button>
      </div>
    `;
    container.appendChild(row);
  }

  function readRcardCreditsFromVisualEditor() {
    const container = document.getElementById('rcard-credits-visual-list');
    if (!container) return [];
    const rows = container.querySelectorAll('.visual-credit-editor-row');
    const credits = [];
    rows.forEach((r, idx) => {
      const name = ((r.querySelector('.vcred-name') || {}).value || '').trim();
      const tot = Math.max(0, Number((r.querySelector('.vcred-total') || {}).value) || 0);
      const used = Math.max(0, Number((r.querySelector('.vcred-used') || {}).value) || 0);
      const resetDate = ((r.querySelector('.vcred-reset-date') || {}).value || '').trim();
      const resetCycle = ((r.querySelector('.vcred-reset-cycle') || {}).value || 'Annually').trim();
      if (name || tot > 0) {
        credits.push({
          id: `cred-${Date.now()}-${idx}`,
          name: name || `Statement Credit ${idx + 1}`,
          total_usd: tot,
          used_usd: Math.min(tot, used),
          reset_date: resetDate || '2027-03',
          reset_cycle: resetCycle || 'Annually'
        });
      }
    });
    return credits;
  }

  function updateRcardArtPreview() {
    const previewBox = document.getElementById('rcard-art-preview-box');
    if (!previewBox) return;
    const tempCard = {
      name: (document.getElementById('rcard-name') || {}).value || 'Travel Rewards Card',
      issuer: (document.getElementById('rcard-issuer') || {}).value || 'Bank',
      card_style: (document.getElementById('rcard-style-preset') || {}).value || 'auto',
      image_url: (document.getElementById('rcard-image-url') || {}).value || '',
      card_number: (document.getElementById('rcard-number') || {}).value || '',
      card_expiration: (document.getElementById('rcard-exp') || {}).value || ''
    };
    previewBox.innerHTML = renderCreditCardArtHtml(tempCard, 'cc-art-lg');
  }

  let activeRcardDbIssuer = 'all';
  let activeRprogDbCat = 'all';
  let activeTplModalFilter = 'all';

  function renderRcardDbResults(query = '', issuerFilter = activeRcardDbIssuer) {
    activeRcardDbIssuer = issuerFilter || 'all';
    const resultsEl = document.getElementById('rcard-db-results');
    if (!resultsEl) return;
    const q = normalizeEcoStr(query);
    const iss = normalizeEcoStr(activeRcardDbIssuer);

    const matches = POPULAR_REWARD_TEMPLATES
      .map((tpl, idx) => ({ tpl, idx }))
      .filter(x => x.tpl.kind === 'card')
      .filter(({ tpl }) => {
        const hay = normalizeEcoStr(`${tpl.title} ${tpl.subtitle} ${tpl.category} ${tpl.data.issuer} ${tpl.data.ecosystem} ${tpl.data.best_for}`);
        if (iss !== 'all' && !hay.includes(iss)) return false;
        if (q && !hay.includes(q)) return false;
        return true;
      });

    if (matches.length === 0) {
      resultsEl.innerHTML = `<div style="padding: 10px; font-size: 12px; color: var(--text-muted); text-align: center;">No matching credit cards in database. You can enter any custom card below!</div>`;
      return;
    }

    resultsEl.innerHTML = matches.map(({ tpl, idx }) => {
      const creditsCount = Array.isArray(tpl.data.credits) ? tpl.data.credits.length : 0;
      const certsCount = Array.isArray(tpl.data.bundled_certs) ? tpl.data.bundled_certs.length : 0;
      return `
        <div class="db-lookup-item" data-pick-rcard-db="${idx}">
          <div class="db-lookup-item-left">
            ${renderCreditCardArtHtml(tpl.data, 'cc-art-xs')}
            <div style="min-width: 0;">
              <div class="db-lookup-item-title">${escapeHtml(tpl.data.name)}</div>
              <div class="db-lookup-item-sub">
                ${escapeHtml(tpl.data.issuer)} → <strong>${escapeHtml(tpl.data.ecosystem)}</strong> • ${fmtUsdCompact(tpl.data.annual_fee)}/yr • ${creditsCount} credits${certsCount > 0 ? ` + ${certsCount} free night/perk` : ''}
              </div>
            </div>
          </div>
          <button type="button" class="btn btn-sm btn-primary" style="padding: 4px 10px; font-size: 11px; white-space: nowrap;">
            ⚡ Auto-Fill Card &amp; Perks
          </button>
        </div>
      `;
    }).join('');
  }

  function applyCardDbTemplateToModal(tplData) {
    if (!tplData) return;
    document.getElementById('rcard-name').value = tplData.name || '';
    document.getElementById('rcard-issuer').value = tplData.issuer || '';
    document.getElementById('rcard-ecosystem').value = tplData.ecosystem || '';
    document.getElementById('rcard-fee').value = Number(tplData.annual_fee || 0);
    document.getElementById('rcard-ftf').value = tplData.ftf || 'None ($0 Foreign Tx Fee)';
    document.getElementById('rcard-multipliers').value = tplData.multipliers || '';
    document.getElementById('rcard-best-for').value = tplData.best_for || '';
    const styleEl = document.getElementById('rcard-style-preset');
    if (styleEl) styleEl.value = tplData.card_style || 'auto';
    const imgUrlEl = document.getElementById('rcard-image-url');
    if (imgUrlEl) imgUrlEl.value = tplData.image_url || '';
    const webEl = document.getElementById('rcard-website');
    if (webEl) webEl.value = resolveRewardWebsiteUrl(tplData, true);

    renderRcardCreditsVisualEditor(tplData.credits || []);
    updateRcardArtPreview();
    showToast(`⚡ Auto-filled ${tplData.name} (${(tplData.credits || []).length} credits + card art ready)!`);
  }

  function renderRprogDbResults(query = '', catFilter = activeRprogDbCat) {
    activeRprogDbCat = catFilter || 'all';
    const resultsEl = document.getElementById('rprog-db-results');
    if (!resultsEl) return;
    const q = normalizeEcoStr(query);

    const matches = POPULAR_REWARD_TEMPLATES
      .map((tpl, idx) => ({ tpl, idx }))
      .filter(x => x.tpl.kind === 'program')
      .filter(({ tpl }) => {
        if (activeRprogDbCat !== 'all' && tpl.data.ecosystem !== activeRprogDbCat) return false;
        const hay = normalizeEcoStr(`${tpl.title} ${tpl.subtitle} ${tpl.data.name} ${tpl.data.transfer_partners}`);
        if (q && !hay.includes(q)) return false;
        return true;
      });

    if (matches.length === 0) {
      resultsEl.innerHTML = `<div style="padding: 10px; font-size: 12px; color: var(--text-muted); text-align: center;">No matching loyalty programs found. Enter custom details below!</div>`;
      return;
    }

    resultsEl.innerHTML = matches.map(({ tpl, idx }) => {
      const meta = ECOSYSTEM_META[tpl.data.ecosystem] || ECOSYSTEM_META.other;
      return `
        <div class="db-lookup-item" data-pick-rprog-db="${idx}">
          <div class="db-lookup-item-left">
            <span style="font-size: 20px;">${meta.icon}</span>
            <div style="min-width: 0;">
              <div class="db-lookup-item-title">${escapeHtml(tpl.data.name)}</div>
              <div class="db-lookup-item-sub">${escapeHtml(tpl.subtitle)} • Target: ${Number(tpl.data.cpp || 1.5).toFixed(2)}¢/pt</div>
            </div>
          </div>
          <button type="button" class="btn btn-sm btn-primary" style="padding: 4px 10px; font-size: 11px; white-space: nowrap;">
            ⚡ Auto-Fill
          </button>
        </div>
      `;
    }).join('');
  }

  function applyProgDbTemplateToModal(tplData) {
    if (!tplData) return;
    document.getElementById('rprog-name').value = tplData.name || '';
    document.getElementById('rprog-ecosystem').value = tplData.ecosystem || 'bank';
    document.getElementById('rprog-cpp').value = Number(tplData.cpp || 1.8);
    document.getElementById('rprog-status').value = tplData.status_tier || 'Member';
    document.getElementById('rprog-target-nights').value = Number(tplData.target_nights ?? 0);
    document.getElementById('rprog-metric-label').value = tplData.metric_label || 'Qualifying Nights';
    document.getElementById('rprog-expiration').value = tplData.expiration_policy || 'Active';
    document.getElementById('rprog-partners').value = tplData.transfer_partners || '';
    document.getElementById('rprog-notes').value = tplData.notes || '';
    const webEl = document.getElementById('rprog-website');
    if (webEl) webEl.value = resolveRewardWebsiteUrl(tplData, false);
    syncRprogColorPickerUi(getEcosystemColor(tplData.ecosystem || 'bank'));
    showToast(`⚡ Auto-filled ${tplData.name} from Loyalty Database!`);
  }

  function renderRcertDbResults(query = '') {
    const resultsEl = document.getElementById('rcert-db-results');
    if (!resultsEl) return;
    const q = normalizeEcoStr(query);
    const matches = POPULAR_CERT_TEMPLATES
      .map((tpl, idx) => ({ tpl, idx }))
      .filter(({ tpl }) => {
        const hay = normalizeEcoStr(`${tpl.title} ${tpl.program} ${tpl.source_card} ${tpl.type} ${tpl.cap_details}`);
        return !q || hay.includes(q);
      });

    if (matches.length === 0) {
      resultsEl.innerHTML = `<div style="padding: 10px; font-size: 12px; color: var(--text-muted); text-align: center;">No matching certificates in database. Enter custom perk details below!</div>`;
      return;
    }

    resultsEl.innerHTML = matches.map(({ tpl, idx }) => `
      <div class="db-lookup-item" data-pick-rcert-db="${idx}">
        <div class="db-lookup-item-left">
          <span style="font-size: 18px;">🎟️</span>
          <div style="min-width: 0;">
            <div class="db-lookup-item-title">${escapeHtml(tpl.title)}</div>
            <div class="db-lookup-item-sub">${escapeHtml(tpl.program)} (${escapeHtml(tpl.source_card)}) • Est. ${fmtUsdCompact(tpl.est_value_usd)}</div>
          </div>
        </div>
        <button type="button" class="btn btn-sm btn-primary" style="padding: 4px 10px; font-size: 11px; white-space: nowrap;">
          ⚡ Auto-Fill
        </button>
      </div>
    `).join('');
  }

  function applyCertDbTemplateToModal(tplData) {
    if (!tplData) return;
    document.getElementById('rcert-title').value = tplData.title || '';
    document.getElementById('rcert-type').value = tplData.type || 'Free Night Certificate';
    document.getElementById('rcert-program').value = tplData.program || '';
    document.getElementById('rcert-card').value = tplData.source_card || '';
    document.getElementById('rcert-value').value = Number(tplData.est_value_usd || 350);
    document.getElementById('rcert-cap').value = tplData.cap_details || '';
    document.getElementById('rcert-notes').value = tplData.notes || '';
    showToast(`⚡ Auto-filled "${tplData.title}"!`);
  }

  // Modal Open & Save Handlers for Rewards
  function openRewardProgramModal(editProg = null) {
    populateOwnerDatalist();
    const titleEl = document.getElementById('modal-reward-program-title');
    const scopeEcoRadio = document.getElementById('rprog-color-scope-eco');
    const scopeCardRadio = document.getElementById('rprog-color-scope-card');
    const searchInput = document.getElementById('rprog-db-search');
    const progOwnerEl = document.getElementById('rprog-owner');
    if (searchInput) searchInput.value = '';
    activeRprogDbCat = 'all';
    document.querySelectorAll('#rprog-db-filter-pills [data-rprog-db-cat]').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-rprog-db-cat') === 'all');
    });
    renderRprogDbResults('', 'all');
    const progDbRes = document.getElementById('rprog-db-results');
    if (progDbRes) progDbRes.style.display = editProg ? 'none' : 'flex';

    if (editProg) {
      if (titleEl) titleEl.textContent = 'Edit Loyalty Program';
      document.getElementById('rprog-id').value = editProg.id;
      document.getElementById('rprog-name').value = editProg.name || '';
      if (progOwnerEl) progOwnerEl.value = editProg.owner || '';
      document.getElementById('rprog-ecosystem').value = editProg.ecosystem || 'bank';
      document.getElementById('rprog-points').value = Number(editProg.points ?? editProg.balance ?? 0);
      document.getElementById('rprog-cpp').value = Number(editProg.cpp ?? editProg.cpp_valuation ?? 1.8);
      document.getElementById('rprog-status').value = editProg.status_tier || '';
      document.getElementById('rprog-member-id').value = editProg.member_id || '';
      document.getElementById('rprog-qual-nights').value = Number(editProg.qualifying_nights ?? editProg.qualifying_current ?? 0);
      document.getElementById('rprog-target-nights').value = Number(editProg.target_nights ?? editProg.qualifying_target ?? 60);
      document.getElementById('rprog-metric-label').value = editProg.metric_label || editProg.qualifying_label || 'Qualifying Nights';
      document.getElementById('rprog-expiration').value = editProg.expiration_policy || '';
      document.getElementById('rprog-partners').value = editProg.transfer_partners || editProg.transfer_sources || '';
      document.getElementById('rprog-notes').value = editProg.notes || '';
      const rprogWebEl = document.getElementById('rprog-website');
      if (rprogWebEl) rprogWebEl.value = editProg.website_url || resolveRewardWebsiteUrl(editProg, false);
      if (editProg.custom_color) {
        if (scopeCardRadio) scopeCardRadio.checked = true;
        syncRprogColorPickerUi(editProg.custom_color);
      } else {
        if (scopeEcoRadio) scopeEcoRadio.checked = true;
        syncRprogColorPickerUi(getEcosystemColor(editProg.ecosystem || 'bank'));
      }
      const linkedCardsForProg = getLinkedCardsForProgram(editProg);
      renderCustomFieldsEditor('rprog-custom-fields-container', getSyncedCustomFields(editProg, linkedCardsForProg[0] || null));
    } else {
      if (titleEl) titleEl.textContent = 'Add Loyalty Program';
      document.getElementById('rprog-id').value = '';
      document.getElementById('rprog-name').value = '';
      if (progOwnerEl) progOwnerEl.value = defaultOwnerForNewItem();
      document.getElementById('rprog-ecosystem').value = 'bank';
      document.getElementById('rprog-points').value = '';
      document.getElementById('rprog-cpp').value = '1.8';
      document.getElementById('rprog-status').value = '';
      document.getElementById('rprog-member-id').value = '';
      document.getElementById('rprog-qual-nights').value = '0';
      document.getElementById('rprog-target-nights').value = '60';
      document.getElementById('rprog-metric-label').value = 'Qualifying Nights';
      document.getElementById('rprog-expiration').value = 'No expiration while active';
      document.getElementById('rprog-partners').value = '';
      document.getElementById('rprog-notes').value = '';
      const rprogWebEl = document.getElementById('rprog-website');
      if (rprogWebEl) rprogWebEl.value = '';
      if (scopeEcoRadio) scopeEcoRadio.checked = true;
      syncRprogColorPickerUi(getEcosystemColor('bank'));
      renderCustomFieldsEditor('rprog-custom-fields-container', []);
    }
    openModal('modal-reward-program');
  }

  async function saveRewardProgramFromModal() {
    const name = document.getElementById('rprog-name').value.trim();
    if (!name) {
      showToast('Please enter a loyalty program name');
      return;
    }
    const id = document.getElementById('rprog-id').value;
    const eco = document.getElementById('rprog-ecosystem').value;
    const owner = ((document.getElementById('rprog-owner') || {}).value || '').trim();
    const pickedColor = resolveHexColor(
      (document.getElementById('rprog-color-input') || {}).value,
      getEcosystemColor(eco)
    );
    const scopeCard = (document.getElementById('rprog-color-scope-card') || {}).checked;

    const item = {
      id: id || ('prog-' + Date.now()),
      name,
      owner,
      ecosystem: eco,
      points: Number(document.getElementById('rprog-points').value) || 0,
      cpp: Number(document.getElementById('rprog-cpp').value) || 1.5,
      status_tier: document.getElementById('rprog-status').value.trim() || 'Member',
      member_id: document.getElementById('rprog-member-id').value.trim(),
      qualifying_nights: Number(document.getElementById('rprog-qual-nights').value) || 0,
      target_nights: Number(document.getElementById('rprog-target-nights').value) || 0,
      metric_label: document.getElementById('rprog-metric-label').value.trim() || 'Qualifying Nights',
      expiration_policy: document.getElementById('rprog-expiration').value.trim() || 'Active',
      transfer_partners: document.getElementById('rprog-partners').value.trim(),
      notes: document.getElementById('rprog-notes').value.trim(),
      website_url: ((document.getElementById('rprog-website') || {}).value || '').trim(),
      custom_color: scopeCard ? pickedColor : '',
      custom_fields: readCustomFields('rprog-custom-fields-container')
    };

    if (!scopeCard) {
      const nextEcoColors = { ...getEcosystemColors(), [eco]: pickedColor };
      state.settings.ecosystem_colors = nextEcoColors;
      state.rewards.ecosystem_colors = nextEcoColors;
    }

    if (id) {
      state.rewards.programs = state.rewards.programs.map(p => (p.id === id ? item : p));
    } else {
      state.rewards.programs.unshift(item);
    }
    const linkedCardsForSavedProg = getLinkedCardsForProgram(item);
    if (linkedCardsForSavedProg[0]) {
      syncCustomFieldsToItems(item, linkedCardsForSavedProg[0], item.custom_fields);
    }
    if (owner) registerRewardOwner(owner);
    closeModal('modal-reward-program');
    state.rewardsTab = 'programs';
    await saveRewardsState(id ? `Updated ${name}` : `Added ${name} to Loyalty Programs!`);
  }

  function openRewardCertModal(editCert = null, prefillProgram = '') {
    populateOwnerDatalist();
    const titleEl = document.getElementById('modal-reward-cert-title');
    const searchEl = document.getElementById('rcert-db-search');
    const certOwnerEl = document.getElementById('rcert-owner');
    if (searchEl) searchEl.value = prefillProgram || '';
    renderRcertDbResults(prefillProgram || '');
    const certDbRes = document.getElementById('rcert-db-results');
    if (certDbRes) certDbRes.style.display = editCert ? 'none' : 'flex';

    if (editCert) {
      if (titleEl) titleEl.textContent = 'Edit Certificate / Travel Perk';
      document.getElementById('rcert-id').value = editCert.id;
      document.getElementById('rcert-title').value = editCert.title || '';
      if (certOwnerEl) certOwnerEl.value = editCert.owner || '';
      document.getElementById('rcert-type').value = editCert.type || 'Free Night Certificate';
      document.getElementById('rcert-program').value = editCert.program || '';
      document.getElementById('rcert-card').value = editCert.source_card || '';
      document.getElementById('rcert-expires').value = editCert.expires_date || editCert.expiration_date || '';
      document.getElementById('rcert-value').value = Number(editCert.est_value_usd ?? editCert.estimated_value_usd ?? 350);
      document.getElementById('rcert-status').value = editCert.status || 'available';
      document.getElementById('rcert-cap').value = editCert.cap_details || editCert.points_cap || '';
      document.getElementById('rcert-notes').value = editCert.notes || '';
      renderCustomFieldsEditor('rcert-custom-fields-container', editCert.custom_fields);
    } else {
      if (titleEl) titleEl.textContent = 'Add Free Night Certificate / Travel Perk';
      document.getElementById('rcert-id').value = '';
      document.getElementById('rcert-title').value = '';
      if (certOwnerEl) certOwnerEl.value = defaultOwnerForNewItem();
      document.getElementById('rcert-type').value = 'Free Night Certificate';
      document.getElementById('rcert-program').value = prefillProgram || '';
      document.getElementById('rcert-card').value = '';
      const nextYear = new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10);
      document.getElementById('rcert-expires').value = nextYear;
      document.getElementById('rcert-value').value = '400';
      document.getElementById('rcert-status').value = 'available';
      document.getElementById('rcert-cap').value = '';
      document.getElementById('rcert-notes').value = '';
      renderCustomFieldsEditor('rcert-custom-fields-container', []);
    }
    openModal('modal-reward-cert');
  }

  async function saveRewardCertFromModal() {
    const title = document.getElementById('rcert-title').value.trim();
    if (!title) {
      showToast('Please enter a certificate or perk name');
      return;
    }
    const id = document.getElementById('rcert-id').value;
    const owner = ((document.getElementById('rcert-owner') || {}).value || '').trim();
    const item = {
      id: id || ('cert-' + Date.now()),
      title,
      owner,
      type: document.getElementById('rcert-type').value,
      program: document.getElementById('rcert-program').value.trim() || 'Loyalty Program',
      source_card: document.getElementById('rcert-card').value.trim(),
      expires_date: document.getElementById('rcert-expires').value,
      est_value_usd: Number(document.getElementById('rcert-value').value) || 0,
      status: document.getElementById('rcert-status').value,
      cap_details: document.getElementById('rcert-cap').value.trim(),
      notes: document.getElementById('rcert-notes').value.trim(),
      custom_fields: readCustomFields('rcert-custom-fields-container')
    };

    if (id) {
      state.rewards.certificates = state.rewards.certificates.map(c => (c.id === id ? item : c));
    } else {
      state.rewards.certificates.unshift(item);
    }
    if (owner) registerRewardOwner(owner);
    closeModal('modal-reward-cert');
    await saveRewardsState(id ? `Updated "${title}"` : `Added "${title}" to Loyalty & Perks!`);
  }

  function openRewardCardModal(editCard = null, prefillEcosystem = '') {
    populateOwnerDatalist();
    const titleEl = document.getElementById('modal-reward-card-title');
    const cardOwnerEl = document.getElementById('rcard-owner');
    // Populate ecosystem datalist with existing loyalty programs
    const dl = document.getElementById('rcard-ecosystem-datalist');
    if (dl) {
      const names = new Set((state.rewards.programs || []).map(p => p.name).filter(Boolean));
      ['Capital One Miles', 'Chase Ultimate Rewards', 'Amex Membership Rewards', 'Bilt Rewards', 'World of Hyatt', 'Hilton Honors', 'Marriott Bonvoy', 'IHG One Rewards', 'United MileagePlus', 'Delta SkyMiles', 'Alaska Airlines Atmos Rewards'].forEach(n => names.add(n));
      dl.innerHTML = Array.from(names).map(n => `<option value="${escapeHtml(n)}"></option>`).join('');
    }

    const searchEl = document.getElementById('rcard-db-search');
    if (searchEl) searchEl.value = prefillEcosystem || '';
    activeRcardDbIssuer = 'all';
    document.querySelectorAll('#rcard-db-filter-pills [data-rcard-db-issuer]').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-rcard-db-issuer') === 'all');
    });
    renderRcardDbResults(prefillEcosystem || '', 'all');
    const cardDbRes = document.getElementById('rcard-db-results');
    if (cardDbRes) cardDbRes.style.display = editCard ? 'none' : 'flex';

    const styleEl = document.getElementById('rcard-style-preset');
    const imgUrlEl = document.getElementById('rcard-image-url');
    const autoLinkEl = document.getElementById('rcard-auto-link-prog');
    const autoCertEl = document.getElementById('rcard-auto-add-certs');
    if (autoLinkEl) autoLinkEl.checked = true;
    if (autoCertEl) autoCertEl.checked = true;

    if (editCard) {
      if (titleEl) titleEl.textContent = 'Edit Travel Credit Card, Art & Statement Credits';
      document.getElementById('rcard-id').value = editCard.id;
      document.getElementById('rcard-name').value = editCard.name || editCard.card_name || '';
      if (cardOwnerEl) cardOwnerEl.value = editCard.owner || '';
      document.getElementById('rcard-issuer').value = editCard.issuer || '';
      document.getElementById('rcard-ecosystem').value = editCard.ecosystem || editCard.points_program || '';
      document.getElementById('rcard-fee').value = Number(editCard.annual_fee || 0);
      document.getElementById('rcard-renewal').value = editCard.renewal_date || '';
      document.getElementById('rcard-ftf').value = editCard.ftf || 'None ($0 Foreign Tx Fee)';
      document.getElementById('rcard-multipliers').value = editCard.multipliers || '';
      document.getElementById('rcard-best-for').value = editCard.best_for || editCard.perks || '';
      const rcardWebEl = document.getElementById('rcard-website');
      if (rcardWebEl) rcardWebEl.value = editCard.website_url || resolveRewardWebsiteUrl(editCard, true);
      const rcardNumEl = document.getElementById('rcard-number');
      const rcardExpEl = document.getElementById('rcard-exp');
      if (rcardNumEl) rcardNumEl.value = editCard.card_number ? String(editCard.card_number).slice(-4) : '';
      if (rcardExpEl) rcardExpEl.value = editCard.card_expiration || '';
      document.getElementById('rcard-sub-active').checked = Boolean(editCard.sub_active);
      document.getElementById('rcard-sub-bonus').value = editCard.sub_bonus_label || editCard.sub_bonus_text || '';
      document.getElementById('rcard-sub-deadline').value = editCard.sub_deadline || '';
      document.getElementById('rcard-sub-target').value = Number(editCard.sub_target_usd ?? editCard.sub_spend_target ?? 4000);
      document.getElementById('rcard-sub-spent').value = Number(editCard.sub_spent_manual_usd ?? editCard.sub_base_spend ?? 0);
      if (styleEl) styleEl.value = editCard.card_style || 'auto';
      if (imgUrlEl) imgUrlEl.value = editCard.image_url || '';

      renderRcardCreditsVisualEditor(editCard.credits || []);
      const linkedProgForEditCard = (state.rewards.programs || []).find(p => sameOwner(editCard, p) && doesCardMatchProgram(editCard, p)) || null;
      renderCustomFieldsEditor('rcard-custom-fields-container', getSyncedCustomFields(linkedProgForEditCard, editCard));
    } else {
      if (titleEl) titleEl.textContent = 'Add Travel Credit Card & Auto-Import Perks';
      document.getElementById('rcard-id').value = '';
      document.getElementById('rcard-name').value = '';
      if (cardOwnerEl) cardOwnerEl.value = defaultOwnerForNewItem();
      document.getElementById('rcard-issuer').value = '';
      document.getElementById('rcard-ecosystem').value = prefillEcosystem || '';
      document.getElementById('rcard-fee').value = '395';
      document.getElementById('rcard-renewal').value = new Date(Date.now() + 300 * 86400000).toISOString().slice(0, 10);
      document.getElementById('rcard-ftf').value = 'None ($0 Foreign Tx Fee)';
      document.getElementById('rcard-multipliers').value = '';
      document.getElementById('rcard-best-for').value = '';
      const rcardWebEl = document.getElementById('rcard-website');
      if (rcardWebEl) rcardWebEl.value = '';
      const rcardNumEl = document.getElementById('rcard-number');
      const rcardExpEl = document.getElementById('rcard-exp');
      if (rcardNumEl) rcardNumEl.value = '';
      if (rcardExpEl) rcardExpEl.value = '';
      document.getElementById('rcard-sub-active').checked = false;
      document.getElementById('rcard-sub-bonus').value = '';
      document.getElementById('rcard-sub-deadline').value = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
      document.getElementById('rcard-sub-target').value = '4000';
      document.getElementById('rcard-sub-spent').value = '0';
      if (styleEl) styleEl.value = 'auto';
      if (imgUrlEl) imgUrlEl.value = '';

      renderRcardCreditsVisualEditor([
        { name: '$300 Annual Travel Credit', total_usd: 300, used_usd: 0 },
        { name: '$120 Global Entry / TSA PreCheck', total_usd: 120, used_usd: 0 }
      ]);
      renderCustomFieldsEditor('rcard-custom-fields-container', []);
    }
    updateRcardArtPreview();
    openModal('modal-reward-card');
  }

  async function saveRewardCardFromModal() {
    const name = document.getElementById('rcard-name').value.trim();
    if (!name) {
      showToast('Please select a card from the database above or enter a card name');
      return;
    }
    const id = document.getElementById('rcard-id').value;
    const owner = ((document.getElementById('rcard-owner') || {}).value || '').trim();
    const parsedCredits = readRcardCreditsFromVisualEditor();
    const stylePreset = (document.getElementById('rcard-style-preset') || {}).value || 'auto';
    const imageUrl = ((document.getElementById('rcard-image-url') || {}).value || '').trim();

    const item = {
      id: id || ('card-' + Date.now()),
      name,
      owner,
      issuer: document.getElementById('rcard-issuer').value.trim() || 'Bank',
      ecosystem: document.getElementById('rcard-ecosystem').value.trim() || 'Travel Rewards',
      card_style: stylePreset,
      image_url: imageUrl,
      annual_fee: Number(document.getElementById('rcard-fee').value) || 0,
      renewal_date: document.getElementById('rcard-renewal').value,
      ftf: document.getElementById('rcard-ftf').value.trim() || 'None ($0 Foreign Tx Fee)',
      multipliers: document.getElementById('rcard-multipliers').value.trim(),
      best_for: document.getElementById('rcard-best-for').value.trim(),
      website_url: ((document.getElementById('rcard-website') || {}).value || '').trim(),
      card_number: (((document.getElementById('rcard-number') || {}).value || '').replace(/\D/g, '')).slice(-4),
      card_expiration: ((document.getElementById('rcard-exp') || {}).value || '').trim(),
      sub_active: document.getElementById('rcard-sub-active').checked,
      sub_bonus_label: document.getElementById('rcard-sub-bonus').value.trim(),
      sub_deadline: document.getElementById('rcard-sub-deadline').value,
      sub_target_usd: Number(document.getElementById('rcard-sub-target').value) || 0,
      sub_spent_manual_usd: Number(document.getElementById('rcard-sub-spent').value) || 0,
      credits: parsedCredits,
      custom_fields: readCustomFields('rcard-custom-fields-container')
    };

    const autoLinkProg = Boolean((document.getElementById('rcard-auto-link-prog') || {}).checked);
    const autoAddCerts = Boolean((document.getElementById('rcard-auto-add-certs') || {}).checked);
    const syncedExtras = integrateCardIntoEcosystem(item, { autoLinkProg, autoAddCerts });

    if (id) {
      state.rewards.cards = state.rewards.cards.map(c => (c.id === id ? item : c));
    } else {
      state.rewards.cards.unshift(item);
    }
    const linkedProgForSavedCard = (state.rewards.programs || []).find(p => sameOwner(item, p) && doesCardMatchProgram(item, p)) || null;
    if (linkedProgForSavedCard) {
      const mergedCf = item.custom_fields && item.custom_fields.length > 0
        ? item.custom_fields
        : getSyncedCustomFields(linkedProgForSavedCard, item);
      syncCustomFieldsToItems(linkedProgForSavedCard, item, mergedCf);
    }
    if (owner) registerRewardOwner(owner);
    closeModal('modal-reward-card');
    const extraMsg = syncedExtras.length > 0 ? ` + Linked ${syncedExtras.join(' & ')}` : '';
    await saveRewardsState(id ? `Updated ${name}${extraMsg}!` : `Added ${name}${extraMsg}!`);
  }

  function openRewardRedemptionModal(editRed = null, prefillProgram = '', prefillCalc = false) {
    renderTripSelectors();
    const titleEl = document.getElementById('modal-reward-redemption-title');
    if (editRed) {
      if (titleEl) titleEl.textContent = 'Edit Point / Free Night Redemption';
      document.getElementById('rred-id').value = editRed.id;
      document.getElementById('rred-cert-id').value = editRed.cert_id || '';
      document.getElementById('rred-trip-id').value = editRed.trip_id || 'all';
      document.getElementById('rred-date').value = editRed.date || editRed.redemption_date || new Date().toISOString().slice(0, 10);
      document.getElementById('rred-title').value = editRed.title || editRed.item_title || '';
      document.getElementById('rred-program').value = editRed.program || '';
      document.getElementById('rred-type').value = editRed.redemption_type || 'Hotel Points';
      document.getElementById('rred-points').value = Number(editRed.points_used || 0);
      document.getElementById('rred-cash').value = Number(editRed.cash_price_usd || 0);
      document.getElementById('rred-fees').value = Number(editRed.taxes_fees_usd || 0);
      document.getElementById('rred-deduct-balance').checked = false;
      document.getElementById('rred-notes').value = editRed.notes || '';
    } else {
      if (titleEl) titleEl.textContent = 'Log Point / Free Night Redemption';
      document.getElementById('rred-id').value = '';
      document.getElementById('rred-cert-id').value = '';
      document.getElementById('rred-trip-id').value = state.selectedTripId !== 'all' ? state.selectedTripId : (state.trips[0] ? state.trips[0].id : 'all');
      document.getElementById('rred-date').value = new Date().toISOString().slice(0, 10);
      document.getElementById('rred-title').value = '';
      document.getElementById('rred-program').value = prefillProgram || (state.rewards.programs[0] ? state.rewards.programs[0].name : 'World of Hyatt');
      document.getElementById('rred-type').value = 'Hotel Points';
      if (prefillCalc) {
        document.getElementById('rred-program').value = (document.getElementById('calc-program') || {}).value || 'World of Hyatt';
        document.getElementById('rred-points').value = (document.getElementById('calc-points') || {}).value || '45000';
        document.getElementById('rred-cash').value = (document.getElementById('calc-cash') || {}).value || '1150';
        document.getElementById('rred-fees').value = (document.getElementById('calc-fees') || {}).value || '0';
      } else {
        document.getElementById('rred-points').value = '45000';
        document.getElementById('rred-cash').value = '1200';
        document.getElementById('rred-fees').value = '0';
      }
      document.getElementById('rred-deduct-balance').checked = true;
      document.getElementById('rred-notes').value = '';
    }
    openModal('modal-reward-redemption');
  }

  async function saveRewardRedemptionFromModal() {
    const title = document.getElementById('rred-title').value.trim();
    if (!title) {
      showToast('Please enter the hotel stay or flight booked');
      return;
    }
    const id = document.getElementById('rred-id').value;
    const pointsUsed = Number(document.getElementById('rred-points').value) || 0;
    const cashPrice = Number(document.getElementById('rred-cash').value) || 0;
    const taxesFees = Number(document.getElementById('rred-fees').value) || 0;
    const netSaved = Math.max(0, cashPrice - taxesFees);
    const cpp = pointsUsed > 0 ? Number(((netSaved * 100) / pointsUsed).toFixed(2)) : 0;
    const progName = document.getElementById('rred-program').value.trim();
    const deduct = document.getElementById('rred-deduct-balance').checked;

    const item = {
      id: id || ('red-' + Date.now()),
      trip_id: document.getElementById('rred-trip-id').value || 'all',
      date: document.getElementById('rred-date').value,
      title,
      program: progName,
      redemption_type: document.getElementById('rred-type').value,
      points_used: pointsUsed,
      cash_price_usd: cashPrice,
      taxes_fees_usd: taxesFees,
      net_saved_usd: netSaved,
      cpp,
      notes: document.getElementById('rred-notes').value.trim()
    };

    if (!id && deduct && pointsUsed > 0) {
      const matchProg = state.rewards.programs.find(
        p => (p.name || '').toLowerCase() === progName.toLowerCase()
      );
      if (matchProg) {
        const curPts = Number(matchProg.points ?? matchProg.balance ?? 0);
        matchProg.points = Math.max(0, curPts - pointsUsed);
      }
    }

    if (id) {
      state.rewards.redemptions = state.rewards.redemptions.map(r => (r.id === id ? item : r));
    } else {
      state.rewards.redemptions.unshift(item);
    }

    closeModal('modal-reward-redemption');
    state.rewardsTab = 'redemptions';
    await saveRewardsState(`Logged redemption: Saved ${fmtUsd(netSaved)} (${cpp > 0 ? `${cpp}¢/pt` : 'Free Night'})!`);
  }

  function renderRewardTemplatesModalContent(searchQuery = '', filterCat = activeTplModalFilter) {
    activeTplModalFilter = filterCat || 'all';
    const cardsList = document.getElementById('template-cards-list');
    const progsList = document.getElementById('template-programs-list');
    const q = normalizeEcoStr(searchQuery);
    const fNorm = normalizeEcoStr(activeTplModalFilter);

    if (cardsList) {
      const cardMatches = POPULAR_REWARD_TEMPLATES
        .map((tpl, idx) => ({ tpl, idx }))
        .filter(x => x.tpl.kind === 'card')
        .filter(({ tpl }) => {
          if (activeTplModalFilter === 'program') return false;
          const hay = normalizeEcoStr(`${tpl.title} ${tpl.subtitle} ${tpl.category} ${tpl.data.issuer} ${tpl.data.ecosystem} ${tpl.data.best_for}`);
          if (fNorm && fNorm !== 'all' && fNorm !== 'card' && !hay.includes(fNorm)) return false;
          return !q || hay.includes(q);
        });

      cardsList.innerHTML = cardMatches.length > 0
        ? cardMatches.map(({ tpl, idx }) => `
          <div class="template-picker-card">
            <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
              ${renderCreditCardArtHtml(tpl.data, 'cc-art-xs')}
              <div style="min-width: 0;">
                <div style="font-weight: 700; font-size: 13.5px; color: var(--text-primary);">${escapeHtml(tpl.title)}</div>
                <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">${escapeHtml(tpl.subtitle)}</div>
              </div>
            </div>
            <button type="button" class="btn btn-sm btn-primary" style="white-space: nowrap;" data-add-reward-tpl="${idx}">⚡ + Add Card &amp; Perks</button>
          </div>
        `).join('')
        : `<div style="padding: 12px; color: var(--text-muted); font-size: 12px;">No matching cards for "${escapeHtml(searchQuery || activeTplModalFilter)}".</div>`;
    }

    if (progsList) {
      const progMatches = POPULAR_REWARD_TEMPLATES
        .map((tpl, idx) => ({ tpl, idx }))
        .filter(x => x.tpl.kind === 'program')
        .filter(({ tpl }) => {
          if (activeTplModalFilter === 'card') return false;
          if (['hotel', 'airline', 'bank'].includes(activeTplModalFilter) && tpl.data.ecosystem !== activeTplModalFilter) return false;
          const hay = normalizeEcoStr(`${tpl.title} ${tpl.subtitle} ${tpl.category} ${tpl.data.name} ${tpl.data.transfer_partners}`);
          if (fNorm && fNorm !== 'all' && fNorm !== 'program' && !['hotel', 'airline', 'bank'].includes(activeTplModalFilter) && !hay.includes(fNorm)) return false;
          return !q || hay.includes(q);
        });

      progsList.innerHTML = progMatches.length > 0
        ? progMatches.map(({ tpl, idx }) => {
          const meta = ECOSYSTEM_META[tpl.data.ecosystem] || ECOSYSTEM_META.other;
          return `
            <div class="template-picker-card">
              <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
                <span style="font-size: 20px;">${meta.icon}</span>
                <div style="min-width: 0;">
                  <div style="font-weight: 700; font-size: 13.5px; color: var(--text-primary);">${escapeHtml(tpl.title)}</div>
                  <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">${escapeHtml(tpl.subtitle)}</div>
                </div>
              </div>
              <button type="button" class="btn btn-sm btn-primary" style="white-space: nowrap;" data-add-reward-tpl="${idx}">+ Add Program</button>
            </div>
          `;
        }).join('')
        : `<div style="padding: 12px; color: var(--text-muted); font-size: 12px;">No matching programs for "${escapeHtml(searchQuery || activeTplModalFilter)}".</div>`;
    }
  }

  function openRewardTemplatesModal() {
    const searchEl = document.getElementById('tpl-modal-search');
    if (searchEl) searchEl.value = '';
    activeTplModalFilter = 'all';
    document.querySelectorAll('#tpl-modal-filter-pills [data-tpl-filter]').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-tpl-filter') === 'all');
    });
    renderRewardTemplatesModalContent('', 'all');
    openModal('modal-reward-templates');
  }

  function triggerRewardsCsvExport() {
    ensureRewardsStructure();
    const headers = [
      'Section',
      'Name / Title',
      'Program / Ecosystem',
      'Points / Balance / Cap',
      'CPP Valuation',
      'Estimated / Saved Value (USD)',
      'Status / Expiration',
      'Notes'
    ];
    const rows = [headers.map(escapeCsvCell).join(',')];

    for (const p of state.rewards.programs) {
      const pts = Number(p.points ?? p.balance ?? 0);
      const cpp = Number(p.cpp ?? p.cpp_valuation ?? 1.5);
      const val = ((pts * cpp) / 100).toFixed(2);
      rows.push([
        'Loyalty Program',
        p.name,
        p.ecosystem,
        pts,
        cpp,
        val,
        p.status_tier,
        p.notes
      ].map(escapeCsvCell).join(','));
    }

    for (const c of state.rewards.certificates) {
      rows.push([
        'Certificate / Perk',
        c.title,
        c.program,
        c.cap_details || c.points_cap || '',
        '',
        Number(c.est_value_usd ?? c.estimated_value_usd ?? 0).toFixed(2),
        `${c.status} (${c.expires_date || c.expiration_date || ''})`,
        c.notes
      ].map(escapeCsvCell).join(','));
    }

    for (const r of state.rewards.redemptions) {
      const saved = Number(r.net_saved_usd ?? Math.max(0, (Number(r.cash_price_usd) || 0) - (Number(r.taxes_fees_usd) || 0))).toFixed(2);
      rows.push([
        'Trip Redemption',
        r.title || r.item_title || '',
        r.program,
        r.points_used,
        r.cpp ?? r.cpp_achieved ?? '',
        saved,
        r.date || r.redemption_date || '',
        r.notes
      ].map(escapeCsvCell).join(','));
    }

    const csvContent = rows.join('\n');
    const filename = 'wander-wallet-rewards-portfolio.csv';
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
    showToast('Exported Rewards & Loyalty CSV!');
  }

  /* ==========================================================================
     REWARDS & LOYALTY UPDATE ENGINE (INDIVIDUAL & BULK)
     ========================================================================== */

  function findCatalogMatch(name, kind = 'card') {
    if (!name) return null;
    const clean = normalizeEcoStr(name);
    if (!clean) return null;

    const STOP_WORDS = new Set([
      'card', 'credit', 'chase', 'amex', 'american', 'express', 'citi', 'capital', 'bank', 'wells', 'fargo', 'barclays',
      'visa', 'mastercard', 'signature', 'infinite', 'world', 'elite', 'rewards', 'reward', 'loyalty', 'program',
      'club', 'miles', 'points', 'plus', 'one', 'the', 'for', 'and', 'with'
    ]);

    const candidates = [];
    for (const t of POPULAR_REWARD_TEMPLATES) {
      if (t.kind !== kind) continue;
      candidates.push({
        data: t.data,
        dName: normalizeEcoStr(t.data.name || ''),
        tTitle: normalizeEcoStr(t.title || '')
      });
    }
    const seed = getDefaultRewardsData();
    const seedList = kind === 'card' ? seed.cards : seed.programs;
    for (const s of seedList) {
      candidates.push({
        data: s,
        dName: normalizeEcoStr(s.name || ''),
        tTitle: normalizeEcoStr(s.name || '')
      });
    }

    // 1. Exact or full substring match on data.name
    for (const c of candidates) {
      if (c.dName && (clean === c.dName || clean.includes(c.dName) || c.dName.includes(clean))) {
        return c.data;
      }
    }

    // 2. Score by distinctive non-stopword tokens
    const cleanTokens = clean.split(' ').filter(w => w.length >= 3 && !STOP_WORDS.has(w));
    let bestData = null;
    let bestScore = 0;

    for (const c of candidates) {
      const targetStr = `${c.dName} ${c.tTitle}`;
      const targetTokens = Array.from(new Set(targetStr.split(' ').filter(w => w.length >= 3 && !STOP_WORDS.has(w))));
      if (targetTokens.length === 0) continue;

      let matched = 0;
      for (const w of cleanTokens) {
        if (targetTokens.includes(w)) matched += 2;
        else if (targetStr.includes(w)) matched += 1;
      }
      // Require at least 1 distinctive brand/card word match, and penalize unmatched target tokens
      const coverage = matched / Math.max(1, targetTokens.length);
      const score = matched * 10 + coverage;
      if (matched >= 2 && score > bestScore) {
        bestScore = score;
        bestData = c.data;
      }
    }

    return bestData;
  }

  function openUpdateRewardModal(id, kind = 'card') {
    const titleEl = document.getElementById('modal-update-reward-title');
    const diffContainer = document.getElementById('urew-diff-container');
    const idInput = document.getElementById('urew-id');
    const typeInput = document.getElementById('urew-type');

    if (idInput) idInput.value = id;
    if (typeInput) typeInput.value = kind;

    const item = kind === 'card'
      ? (state.rewards.cards || []).find(c => c.id === id)
      : (state.rewards.programs || []).find(p => p.id === id);

    if (!item) {
      showToast('Could not find selected reward');
      return;
    }

    const catMatch = findCatalogMatch(item.name, kind);

    if (titleEl) {
      titleEl.innerHTML = `🔄 Update Perks: <strong>${escapeHtml(item.name)}</strong>`;
    }

    if (!diffContainer) return;

    if (!catMatch) {
      diffContainer.innerHTML = `
        <div class="update-diff-card">
          <div style="font-weight: 700; color: var(--accent-amber);">
            ℹ️ Custom or Unlisted Reward
          </div>
          <div style="font-size: 12.5px; color: var(--text-secondary); line-height: 1.45;">
            "<strong>${escapeHtml(item.name)}</strong>" is a custom entry. You can edit its perks, credits, and multipliers anytime by clicking <strong>Edit</strong> on the card, or add custom fields to track specific benefits.
          </div>
        </div>
      `;
      openModal('modal-update-reward');
      return;
    }

    let diffHtml = '';

    if (kind === 'card') {
      const oldFee = Number(item.annual_fee || 0);
      const newFee = Number(catMatch.annual_fee || 0);
      const oldMult = item.multipliers || 'Standard multipliers';
      const newMult = catMatch.multipliers || oldMult;
      const oldBest = item.best_for || 'General travel';
      const newBest = catMatch.best_for || oldBest;

      const oldCredits = Array.isArray(item.credits) ? item.credits : [];
      const newCredits = Array.isArray(catMatch.credits) ? catMatch.credits : [];

      diffHtml = `
        <div class="update-diff-card">
          <div style="font-size: 13.5px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">
            Matched Official Catalog: ${escapeHtml(catMatch.name || item.name)}
          </div>

          <div class="update-diff-grid">
            <span class="update-diff-label">Annual Fee:</span>
            <span class="update-diff-old">${fmtUsdCompact(oldFee)}/yr</span>
            <span class="update-diff-new">${fmtUsdCompact(newFee)}/yr ${oldFee !== newFee ? '⚡ Updated' : '(Current)'}</span>
          </div>

          <div class="update-diff-grid">
            <span class="update-diff-label">Earning Multipliers:</span>
            <span class="update-diff-old" style="font-size: 11.5px;">${escapeHtml(oldMult)}</span>
            <span class="update-diff-new" style="font-size: 11.5px;">${escapeHtml(newMult)}</span>
          </div>

          <div class="update-diff-grid">
            <span class="update-diff-label">Best Swipe Category:</span>
            <span class="update-diff-old" style="font-size: 11.5px;">${escapeHtml(oldBest)}</span>
            <span class="update-diff-new" style="font-size: 11.5px;">${escapeHtml(newBest)}</span>
          </div>
        </div>

        <div class="update-diff-card">
          <div style="font-size: 13px; font-weight: 700; color: var(--accent-amber); margin-bottom: 6px;">
            Statement Credits Checklist (${newCredits.length} Catalog Credits Available)
          </div>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            ${newCredits.map((cr, idx) => {
              const matchingOld = oldCredits.find(o => (o.name || '').toLowerCase() === (cr.name || '').toLowerCase());
              const used = matchingOld ? (matchingOld.used_usd || 0) : 0;
              const isNewCredit = !matchingOld;
              return `
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; padding: 4px 6px; background: var(--bg-elevated); border-radius: 4px;">
                  <span>
                    ${isNewCredit ? '<span style="color: var(--accent-primary); font-weight: 700; margin-right: 4px;">[NEW]</span>' : ''}
                    ${escapeHtml(cr.name)}
                  </span>
                  <span class="mono" style="font-weight: 700; color: var(--accent-primary);">
                    ${fmtUsdCompact(cr.total_usd ?? cr.amount ?? 0)}
                    ${matchingOld ? `<span style="font-size: 11px; color: var(--text-muted); font-weight: 400;">(${fmtUsdCompact(used)} already used preserved)</span>` : ''}
                  </span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    } else {
      const oldCpp = Number(item.cpp ?? 1.5);
      const newCpp = Number(catMatch.cpp ?? oldCpp);
      const oldPartners = item.transfer_partners || '—';
      const newPartners = catMatch.transfer_partners || oldPartners;
      const oldExp = item.expiration_policy || 'Active';
      const newExp = catMatch.expiration_policy || oldExp;

      diffHtml = `
        <div class="update-diff-card">
          <div style="font-size: 13.5px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">
            Matched Program Guide: ${escapeHtml(catMatch.name || item.name)}
          </div>

          <div class="update-diff-grid">
            <span class="update-diff-label">Benchmark Valuation:</span>
            <span class="update-diff-old">${oldCpp.toFixed(2)}¢ / pt</span>
            <span class="update-diff-new">${newCpp.toFixed(2)}¢ / pt ${oldCpp !== newCpp ? '⚡ Updated' : '(Current)'}</span>
          </div>

          <div class="update-diff-grid">
            <span class="update-diff-label">Transfer Partners:</span>
            <span class="update-diff-old" style="font-size: 11.5px;">${escapeHtml(oldPartners)}</span>
            <span class="update-diff-new" style="font-size: 11.5px;">${escapeHtml(newPartners)}</span>
          </div>

          <div class="update-diff-grid">
            <span class="update-diff-label">Expiration Policy:</span>
            <span class="update-diff-old" style="font-size: 11.5px;">${escapeHtml(oldExp)}</span>
            <span class="update-diff-new" style="font-size: 11.5px;">${escapeHtml(newExp)}</span>
          </div>
        </div>
      `;
    }

    diffContainer.innerHTML = diffHtml;
    openModal('modal-update-reward');
  }

  async function applyRewardUpdate(id, kind = 'card') {
    const item = kind === 'card'
      ? (state.rewards.cards || []).find(c => c.id === id)
      : (state.rewards.programs || []).find(p => p.id === id);

    if (!item) return;

    const catMatch = findCatalogMatch(item.name, kind);
    if (!catMatch) {
      closeModal('modal-update-reward');
      showToast(`No catalog template found for "${item.name}".`);
      return;
    }

    if (kind === 'card') {
      item.annual_fee = Number(catMatch.annual_fee ?? item.annual_fee);
      if (catMatch.multipliers) item.multipliers = catMatch.multipliers;
      if (catMatch.best_for) item.best_for = catMatch.best_for;
      if (catMatch.ftf) item.ftf = catMatch.ftf;

      // Merge credits: preserve already-used amounts from existing credits, append new credits
      if (Array.isArray(catMatch.credits)) {
        const oldCredits = Array.isArray(item.credits) ? item.credits : [];
        const mergedCredits = catMatch.credits.map((newCr, idx) => {
          const matchOld = oldCredits.find(o => (o.name || '').toLowerCase() === (newCr.name || '').toLowerCase());
          const tot = Number(newCr.total_usd ?? newCr.amount ?? 0);
          const used = matchOld ? (matchOld.used_usd !== undefined ? Number(matchOld.used_usd) : (matchOld.used ? tot : 0)) : 0;
          return {
            id: matchOld ? matchOld.id : `cred-${Date.now()}-${idx}`,
            name: newCr.name,
            total_usd: tot,
            used_usd: Math.min(tot, used)
          };
        });
        item.credits = mergedCredits;
      }
    } else {
      if (catMatch.cpp) item.cpp = Number(catMatch.cpp);
      if (catMatch.transfer_partners) item.transfer_partners = catMatch.transfer_partners;
      if (catMatch.expiration_policy) item.expiration_policy = catMatch.expiration_policy;
    }

    closeModal('modal-update-reward');
    await saveRewardsState(`✓ Updated perks for "${item.name}"!`);
  }

  function openUpdateAllRewardsModal() {
    // Show perks pane by default
    const perksTabBtn = document.getElementById('btn-uall-tab-perks');
    const balTabBtn = document.getElementById('btn-uall-tab-balances');
    const perksPane = document.getElementById('uall-pane-perks');
    const balPane = document.getElementById('uall-pane-balances');

    if (perksTabBtn && balTabBtn && perksPane && balPane) {
      perksTabBtn.classList.add('active');
      balTabBtn.classList.remove('active');
      perksPane.style.display = 'block';
      balPane.style.display = 'none';
    }

    // Populate Perks List
    const perksList = document.getElementById('uall-perks-list');
    if (perksList) {
      const cards = state.rewards.cards || [];
      const progs = state.rewards.programs || [];

      const cardRows = cards.map(c => {
        const match = findCatalogMatch(c.name, 'card');
        const numCredits = match && Array.isArray(match.credits) ? match.credits.length : (Array.isArray(c.credits) ? c.credits.length : 0);
        return `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); font-size: 12.5px;">
            <div>
              <strong>💳 ${escapeHtml(c.name)}</strong>
              <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">
                ${match ? `✓ Matched: ${escapeHtml(match.name)} (${numCredits} credits • ${fmtUsdCompact(match.annual_fee)}/yr fee)` : 'Custom card (keeps custom settings)'}
              </div>
            </div>
            <span class="status-badge ${match ? 'active' : 'planned'}" style="font-size: 11px;">
              ${match ? 'Catalog Ready' : 'Custom'}
            </span>
          </div>
        `;
      });

      const progRows = progs.map(p => {
        const match = findCatalogMatch(p.name, 'program');
        return `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); font-size: 12.5px;">
            <div>
              <strong>💎 ${escapeHtml(p.name)}</strong>
              <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">
                ${match ? `✓ Matched: ${escapeHtml(match.name)} (${Number(match.cpp || 1.8).toFixed(2)}¢/pt valuation)` : 'Custom program'}
              </div>
            </div>
            <span class="status-badge ${match ? 'active' : 'planned'}" style="font-size: 11px;">
              ${match ? 'Catalog Ready' : 'Custom'}
            </span>
          </div>
        `;
      });

      perksList.innerHTML = [...cardRows, ...progRows].join('') || '<div style="color: var(--text-muted); padding: 12px;">No rewards added yet.</div>';
    }

    // Populate Balances Table
    const balTbody = document.getElementById('uall-balances-tbody');
    if (balTbody) {
      const progs = state.rewards.programs || [];
      if (progs.length === 0) {
        balTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">No loyalty programs added yet.</td></tr>`;
      } else {
        balTbody.innerHTML = progs.map(p => {
          const meta = ECOSYSTEM_META[p.ecosystem] || ECOSYSTEM_META.other;
          const pts = Number(p.points ?? p.balance ?? 0);
          const cpp = Number(p.cpp ?? p.cpp_valuation ?? 1.5);
          const qCur = Number(p.qualifying_nights ?? p.qualifying_current ?? 0);
          const qTgt = Number(p.target_nights ?? p.qualifying_target ?? 0);
          return `
            <tr data-uall-prog-id="${escapeHtml(p.id)}">
              <td><strong>${escapeHtml(p.name)}</strong></td>
              <td><span class="status-badge" style="font-size: 11px;">${meta.icon} ${escapeHtml(meta.label)}</span></td>
              <td>
                <input type="number" step="100" min="0" class="form-input form-input-sm mono uall-pts-input" value="${pts}" style="font-weight: 700;" />
              </td>
              <td>
                <input type="number" step="0.05" min="0.1" class="form-input form-input-sm mono uall-cpp-input" value="${cpp.toFixed(2)}" />
              </td>
              <td>
                <div style="display: flex; align-items: center; gap: 4px;">
                  <input type="number" step="1" min="0" class="form-input form-input-sm mono uall-qcur-input" value="${qCur}" style="width: 65px;" />
                  <span style="color: var(--text-muted);">/</span>
                  <input type="number" step="1" min="0" class="form-input form-input-sm mono uall-qtgt-input" value="${qTgt}" style="width: 65px;" />
                </div>
              </td>
              <td>
                <input type="text" class="form-input form-input-sm mono uall-memid-input" value="${escapeHtml(p.member_id || '')}" placeholder="Account #" />
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    openModal('modal-update-all-rewards');
  }

  async function applyBulkPerksUpdate() {
    let updatedCount = 0;

    // 1. Update Cards
    (state.rewards.cards || []).forEach(c => {
      const match = findCatalogMatch(c.name, 'card');
      if (match) {
        c.annual_fee = Number(match.annual_fee ?? c.annual_fee);
        if (match.multipliers) c.multipliers = match.multipliers;
        if (match.best_for) c.best_for = match.best_for;
        if (match.ftf) c.ftf = match.ftf;

        if (Array.isArray(match.credits)) {
          const oldCredits = Array.isArray(c.credits) ? c.credits : [];
          c.credits = match.credits.map((newCr, idx) => {
            const matchOld = oldCredits.find(o => (o.name || '').toLowerCase() === (newCr.name || '').toLowerCase());
            const tot = Number(newCr.total_usd ?? newCr.amount ?? 0);
            const used = matchOld ? (matchOld.used_usd !== undefined ? Number(matchOld.used_usd) : (matchOld.used ? tot : 0)) : 0;
            return {
              id: matchOld ? matchOld.id : `cred-${Date.now()}-${idx}`,
              name: newCr.name,
              total_usd: tot,
              used_usd: Math.min(tot, used)
            };
          });
        }
        updatedCount++;
      }
    });

    // 2. Update Programs
    (state.rewards.programs || []).forEach(p => {
      const match = findCatalogMatch(p.name, 'program');
      if (match) {
        if (match.cpp) p.cpp = Number(match.cpp);
        if (match.transfer_partners) p.transfer_partners = match.transfer_partners;
        if (match.expiration_policy) p.expiration_policy = match.expiration_policy;
        updatedCount++;
      }
    });

    closeModal('modal-update-all-rewards');
    await saveRewardsState(`✓ Refreshed official perks & credits across ${updatedCount} reward entries!`);
  }

  async function saveBulkBalancesCheckin() {
    const rows = document.querySelectorAll('#uall-balances-tbody tr[data-uall-prog-id]');
    let count = 0;
    rows.forEach(r => {
      const progId = r.getAttribute('data-uall-prog-id');
      const prog = (state.rewards.programs || []).find(p => p.id === progId);
      if (prog) {
        const pts = Number((r.querySelector('.uall-pts-input') || {}).value);
        const cpp = Number((r.querySelector('.uall-cpp-input') || {}).value);
        const qCur = Number((r.querySelector('.uall-qcur-input') || {}).value);
        const qTgt = Number((r.querySelector('.uall-qtgt-input') || {}).value);
        const memId = (r.querySelector('.uall-memid-input') || {}).value || '';

        if (!isNaN(pts)) prog.points = pts;
        if (!isNaN(cpp) && cpp > 0) prog.cpp = cpp;
        if (!isNaN(qCur)) prog.qualifying_nights = qCur;
        if (!isNaN(qTgt)) prog.target_nights = qTgt;
        prog.member_id = memId.trim();
        count++;
      }
    });

    closeModal('modal-update-all-rewards');
    await saveRewardsState(`✓ Saved updated balances for ${count} loyalty programs!`);
  }


  /* ==========================================================================
     ADMIN WORKSPACE & TAX CATEGORIES MANAGEMENT
     ========================================================================== */

  function renderAdminWorkspace() {
    const cats = getTaxCategories();
    const expenses = state.expenses || [];
    const mealRate = Number(state.settings.meal_deduction_rate || 100);

    // Compute category usage counts
    const usageMap = {};
    for (const exp of expenses) {
      usageMap[exp.category] = (usageMap[exp.category] || 0) + 1;
    }

    // Update KPIs
    const totalEl = document.getElementById('admin-kpi-total-cats');
    const fullDedEl = document.getElementById('admin-kpi-full-ded-cats');
    const specialEl = document.getElementById('admin-kpi-special-cats');
    const mappedEl = document.getElementById('admin-kpi-mapped-expenses');
    const mealSubtext = document.getElementById('admin-kpi-meal-subtext');

    if (totalEl) totalEl.textContent = cats.length;
    if (fullDedEl) fullDedEl.textContent = cats.filter(c => c.deductible === '1').length;
    if (specialEl) specialEl.textContent = cats.filter(c => c.deductible === 'meal').length;
    if (mappedEl) mappedEl.textContent = expenses.length;
    if (mealSubtext) mealSubtext.textContent = `Governed by current ${mealRate}% meal write-off rule`;

    // Populate channel and meal rate inputs
    const chanInput = document.getElementById('admin-setting-channel-name');
    if (chanInput) chanInput.value = state.settings.channel_name || 'Wander Wallet';
    const mealInput = document.getElementById('admin-setting-meal-rate');
    if (mealInput) mealInput.value = String(state.settings.meal_deduction_rate || '100');

    // Populate Loyalty & Rewards Category Color Coding Grid in Admin
    const ecoGrid = document.getElementById('admin-eco-colors-grid');
    if (ecoGrid) {
      const ecoColors = getEcosystemColors();
      const progCounts = {};
      (state.rewards.programs || []).forEach(p => {
        const k = p.ecosystem || 'other';
        progCounts[k] = (progCounts[k] || 0) + 1;
      });
      ecoGrid.innerHTML = ['hotel', 'airline', 'bank', 'other'].map(ecoKey => {
        const meta = ECOSYSTEM_META[ecoKey] || ECOSYSTEM_META.other;
        const hex = resolveHexColor(ecoColors[ecoKey] || DEFAULT_ECOSYSTEM_COLORS[ecoKey]);
        const count = progCounts[ecoKey] || 0;
        return `
          <div class="eco-color-admin-card" style="--card-accent: ${hex}; --card-accent-bg: ${hexToRgba(hex, 0.14)}; --card-accent-border: ${hexToRgba(hex, 0.35)};">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
              <span class="reward-eco-tag" style="background: ${hexToRgba(hex, 0.15)}; color: ${hex}; border: 1px solid ${hexToRgba(hex, 0.38)};">
                ${meta.icon} ${escapeHtml(meta.label)}
              </span>
              <button type="button" class="btn btn-sm" data-quick-color-eco="${ecoKey}" title="Change ${escapeHtml(meta.label)} banner & outline color" style="padding: 3px 8px; font-size: 11px;">
                ✏️ Color
              </button>
            </div>
            <div style="font-size: 11.5px; color: var(--text-secondary); line-height: 1.35;">
              ${escapeHtml(meta.desc)}
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: auto; padding-top: 6px; border-top: 1px solid var(--border-subtle); font-size: 11px;">
              <span class="mono" style="display: inline-flex; align-items: center; gap: 6px; color: var(--text-secondary);">
                <span style="width: 12px; height: 12px; border-radius: 3px; background: ${hex}; display: inline-block; border: 1px solid rgba(0,0,0,0.15);"></span>
                ${escapeHtml(hex.toUpperCase())}
              </span>
              <span style="color: var(--text-muted);">${count} card${count === 1 ? '' : 's'}</span>
            </div>
          </div>
        `;
      }).join('');
    }

    // Populate categories table
    const tbody = document.getElementById('admin-categories-tbody');
    if (tbody) {
      tbody.innerHTML = cats.map(c => {
        const count = usageMap[c.name] || 0;
        const hex = resolveHexColor(c.color || '#38bdf8');
        let dedLabel = '<span style="color: var(--accent-primary); font-weight: 600;">100% Deductible</span>';
        if (c.deductible === 'meal') {
          dedLabel = `<span style="color: var(--accent-amber); font-weight: 600;">🍜 Meal Rule (${mealRate}%)</span>`;
        } else if (c.deductible === '0') {
          dedLabel = '<span style="color: var(--text-muted); font-weight: 600;">Non-Deductible</span>';
        }

        return `
          <tr>
            <td style="font-size: 20px; text-align: center;">${escapeHtml(c.icon || '🏷️')}</td>
            <td>
              <div style="display: flex; align-items: center; gap: 8px;">
                <button type="button" data-quick-color-taxcat="${escapeHtml(c.name)}" title="Click to change category color (${escapeHtml(hex)})" style="background: none; border: none; padding: 2px; cursor: pointer; display: inline-flex; align-items: center;">
                  <span class="color-dot" style="display: inline-block; width: 14px; height: 14px; border-radius: 4px; background-color: ${escapeHtml(hex)}; box-shadow: 0 0 0 2px ${hexToRgba(hex, 0.25)};"></span>
                </button>
                <strong>${escapeHtml(c.name)}</strong>
                <span class="mono" style="font-size: 10.5px; color: var(--text-muted);">${escapeHtml(hex.toUpperCase())}</span>
              </div>
              ${c.notes ? `<div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">${escapeHtml(c.notes)}</div>` : ''}
            </td>
            <td>
              <span class="mono" style="font-size: 12px; color: var(--text-secondary);">${escapeHtml(c.schedule_c || 'Line 27a (Other)')}</span>
            </td>
            <td style="text-align: center;">${dedLabel}</td>
            <td class="tabular" style="text-align: right;">
              ${count > 0 ? `<span class="status-badge active" style="font-size: 11px;">${count} expense${count === 1 ? '' : 's'}</span>` : '<span style="color: var(--text-muted); font-size: 11px;">0 used</span>'}
            </td>
            <td style="text-align: right;">
              <div class="row-actions" style="justify-content: flex-end;">
                <button type="button" class="btn btn-sm" data-quick-color-taxcat="${escapeHtml(c.name)}" title="Customize Color">🎨</button>
                <button type="button" class="btn btn-sm" data-admin-edit-taxcat="${escapeHtml(c.name)}" title="Edit Category">✎</button>
                <button type="button" class="btn btn-sm btn-danger-ghost" data-admin-delete-taxcat="${escapeHtml(c.name)}" title="Delete Category">✕</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    // Switch active sub-pane tab and contents
    const activeTab = state.adminTab || 'categories';
    document.querySelectorAll('#admin-subnav [data-admin-tab]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-admin-tab') === activeTab);
    });

    ['categories', 'rules', 'help'].forEach(tab => {
      const pane = document.getElementById(`admin-subpane-${tab}`);
      if (pane) pane.style.display = tab === activeTab ? 'block' : 'none';
    });

    if (activeTab === 'help') {
      renderWalkthroughStep(currentWtStep);
    }
  }

  function openAdminTaxCategoryModal(editCategory = null) {
    const titleEl = document.getElementById('modal-admin-tax-category-title');
    const origInput = document.getElementById('taxcat-original-name');
    const nameInput = document.getElementById('taxcat-name');
    const iconInput = document.getElementById('taxcat-icon');
    const schedInput = document.getElementById('taxcat-schedule-c');
    const dedSelect = document.getElementById('taxcat-deductible');
    const colSelect = document.getElementById('taxcat-color');
    const colCustom = document.getElementById('taxcat-color-custom');
    const notesInput = document.getElementById('taxcat-notes');

    if (editCategory) {
      const hex = resolveHexColor(editCategory.color || '#38bdf8');
      if (titleEl) titleEl.textContent = `Edit Tax Category: ${editCategory.name}`;
      if (origInput) origInput.value = editCategory.name;
      if (nameInput) nameInput.value = editCategory.name;
      if (iconInput) iconInput.value = editCategory.icon || '🏷️';
      if (schedInput) schedInput.value = editCategory.schedule_c || 'Line 27a (Other Expenses)';
      if (dedSelect) dedSelect.value = editCategory.deductible || '1';
      if (colSelect) colSelect.value = hex;
      if (colCustom) colCustom.value = hex;
      if (notesInput) notesInput.value = editCategory.notes || '';
    } else {
      if (titleEl) titleEl.textContent = 'Add Tax Category';
      if (origInput) origInput.value = '';
      if (nameInput) nameInput.value = '';
      if (iconInput) iconInput.value = '🏷️';
      if (schedInput) schedInput.value = 'Line 27a (Other Expenses)';
      if (dedSelect) dedSelect.value = '1';
      if (colSelect) colSelect.value = '#38bdf8';
      if (colCustom) colCustom.value = '#38bdf8';
      if (notesInput) notesInput.value = '';
    }
    openModal('modal-admin-tax-category');
    if (nameInput) setTimeout(() => nameInput.focus(), 60);
  }

  async function saveTaxCategoriesList(newList, toastMsg = 'Tax categories updated') {
    state.settings.tax_categories = newList;
    // Persist immediately in local storage backup
    const backup = getLocalStore();
    backup.settings = backup.settings || {};
    backup.settings.tax_categories = newList;
    backup.user_modified = true;
    backup.updated_at = Date.now();
    saveLocalStore(backup);

    // Persist to server SQLite settings table
    const updated = await apiRequest('/api/settings', {
      method: 'PUT',
      body: JSON.stringify({ tax_categories: newList })
    });
    if (updated) applyBootstrapData(updated);

    // Re-render UI components that display categories
    renderAdminWorkspace();
    renderCategoryBreakdown();
    renderLedgerCategoryChips();
    renderExpenseLedger();
    renderTaxView();
    showToast(toastMsg);
  }

  async function saveEcosystemColors(newEcoColors, toastMsg = 'Category colors updated') {
    const merged = { ...DEFAULT_ECOSYSTEM_COLORS, ...newEcoColors };
    state.settings.ecosystem_colors = merged;
    const backup = getLocalStore();
    backup.settings = backup.settings || {};
    backup.settings.ecosystem_colors = merged;
    backup.user_modified = true;
    backup.updated_at = Date.now();
    saveLocalStore(backup);

    const updated = await apiRequest('/api/settings', {
      method: 'PUT',
      body: JSON.stringify({ ecosystem_colors: merged })
    });
    if (updated) applyBootstrapData(updated);

    renderRewardsDashboard();
    renderAdminWorkspace();
    showToast(toastMsg);
  }

  function updateColorCustomizerPreview(hexColor) {
    const hex = resolveHexColor(hexColor);
    const colInput = document.getElementById('ccust-color-input');
    const hexLabel = document.getElementById('ccust-hex-label');
    if (colInput && colInput.value.toLowerCase() !== hex.toLowerCase()) colInput.value = hex;
    if (hexLabel) hexLabel.textContent = hex.toUpperCase();

    const swatchGrid = document.getElementById('ccust-swatch-grid');
    if (swatchGrid) {
      swatchGrid.innerHTML = COLOR_SWATCH_PALETTE.map(s => {
        const isSel = s.hex.toLowerCase() === hex.toLowerCase();
        return `<button type="button" class="color-swatch-btn ${isSel ? 'selected' : ''}" data-ccust-swatch="${s.hex}" style="background: ${s.hex};" title="${escapeHtml(s.label)} (${s.hex})"></button>`;
      }).join('');
    }

    const previewCard = document.getElementById('ccust-preview-card');
    const previewBanner = document.getElementById('ccust-preview-banner');
    const previewBadge = document.getElementById('ccust-preview-badge');
    const previewHexPill = document.getElementById('ccust-preview-hex-pill');
    if (previewCard) {
      previewCard.style.borderColor = hexToRgba(hex, 0.55);
      previewCard.style.boxShadow = `0 4px 16px -4px ${hexToRgba(hex, 0.25)}`;
    }
    if (previewBanner) previewBanner.style.background = hex;
    if (previewBadge) {
      previewBadge.style.background = hexToRgba(hex, 0.16);
      previewBadge.style.color = hex;
      previewBadge.style.border = `1px solid ${hexToRgba(hex, 0.4)}`;
    }
    if (previewHexPill) previewHexPill.textContent = hex.toUpperCase();
  }

  function openColorCustomizerModal({ type = 'eco', id = 'hotel', progId = '' } = {}) {
    const typeEl = document.getElementById('ccust-target-type');
    const idEl = document.getElementById('ccust-target-id');
    const progIdEl = document.getElementById('ccust-prog-id');
    const scopeRow = document.getElementById('ccust-scope-row');
    const scopeEcoRadio = document.getElementById('ccust-scope-eco');
    const scopeCardRadio = document.getElementById('ccust-scope-card');
    const scopeEcoLabel = document.getElementById('ccust-scope-eco-label');
    const previewBadge = document.getElementById('ccust-preview-badge');
    const previewTitle = document.getElementById('ccust-preview-title');
    const titleEl = document.getElementById('modal-color-customizer-title');

    let initialHex = '#10b981';

    if (type === 'prog') {
      const prog = (state.rewards.programs || []).find(p => p.id === (progId || id));
      const ecoKey = prog ? (prog.ecosystem || 'hotel') : 'hotel';
      const meta = ECOSYSTEM_META[ecoKey] || ECOSYSTEM_META.other;
      initialHex = prog ? getProgramColor(prog) : getEcosystemColor(ecoKey);
      if (typeEl) typeEl.value = 'prog';
      if (idEl) idEl.value = ecoKey;
      if (progIdEl) progIdEl.value = prog ? prog.id : '';
      if (scopeRow) scopeRow.style.display = 'block';
      const hasCardOverride = Boolean(prog && prog.custom_color && String(prog.custom_color).trim());
      if (scopeEcoRadio) scopeEcoRadio.checked = !hasCardOverride;
      if (scopeCardRadio) scopeCardRadio.checked = hasCardOverride;
      if (scopeEcoLabel) scopeEcoLabel.textContent = `All ${meta.label} cards`;
      if (previewBadge) previewBadge.textContent = `${meta.icon} ${meta.label}`;
      if (previewTitle) previewTitle.textContent = prog ? prog.name : meta.desc;
      if (titleEl) titleEl.textContent = `🎨 Customize Color: ${prog ? prog.name : meta.label}`;
    } else if (type === 'taxcat') {
      const cat = getTaxCategories().find(c => c.name === id) || getTaxCategories()[0];
      const catName = cat ? cat.name : id;
      initialHex = resolveHexColor(cat ? cat.color : '#38bdf8');
      if (typeEl) typeEl.value = 'taxcat';
      if (idEl) idEl.value = catName;
      if (progIdEl) progIdEl.value = '';
      if (scopeRow) scopeRow.style.display = 'none';
      if (previewBadge) previewBadge.textContent = `${cat ? (cat.icon || '🏷️') : '🏷️'} EXPENSE CATEGORY`;
      if (previewTitle) previewTitle.textContent = catName;
      if (titleEl) titleEl.textContent = `🎨 Category Color: ${catName}`;
    } else {
      const ecoKey = ECOSYSTEM_META[id] ? id : 'hotel';
      const meta = ECOSYSTEM_META[ecoKey];
      initialHex = getEcosystemColor(ecoKey);
      if (typeEl) typeEl.value = 'eco';
      if (idEl) idEl.value = ecoKey;
      if (progIdEl) progIdEl.value = '';
      if (scopeRow) scopeRow.style.display = 'none';
      if (previewBadge) previewBadge.textContent = `${meta.icon} ${meta.label}`;
      if (previewTitle) previewTitle.textContent = meta.desc;
      if (titleEl) titleEl.textContent = `🎨 Loyalty Category Color: ${meta.label}`;
    }

    updateColorCustomizerPreview(initialHex);

    // Render quick switcher for all categories at the bottom of the modal
    const allList = document.getElementById('ccust-all-categories-list');
    if (allList) {
      const ecoColors = getEcosystemColors();
      const ecoBtns = ['hotel', 'airline', 'bank', 'other'].map(k => {
        const m = ECOSYSTEM_META[k];
        const c = resolveHexColor(ecoColors[k]);
        const active = (type === 'eco' && id === k) || (type === 'prog' && idEl && idEl.value === k);
        return `
          <button type="button" class="btn btn-sm" data-ccust-select-target="eco:${k}" style="justify-content: flex-start; gap: 7px; border-color: ${active ? c : 'var(--border-subtle)'}; background: ${active ? hexToRgba(c, 0.12) : 'var(--bg-elevated)'};">
            <span style="width: 10px; height: 10px; border-radius: 50%; background: ${c}; flex-shrink: 0;"></span>
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${m.icon} ${escapeHtml(m.label)}</span>
          </button>
        `;
      });
      const taxBtns = getTaxCategories().map(tc => {
        const c = resolveHexColor(tc.color || '#38bdf8');
        const active = type === 'taxcat' && id === tc.name;
        return `
          <button type="button" class="btn btn-sm" data-ccust-select-target="taxcat:${escapeHtml(tc.name)}" style="justify-content: flex-start; gap: 7px; border-color: ${active ? c : 'var(--border-subtle)'}; background: ${active ? hexToRgba(c, 0.12) : 'var(--bg-elevated)'};">
            <span style="width: 10px; height: 10px; border-radius: 50%; background: ${c}; flex-shrink: 0;"></span>
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(tc.icon || '🏷️')} ${escapeHtml(tc.name)}</span>
          </button>
        `;
      });
      allList.innerHTML = [...ecoBtns, ...taxBtns].join('');
    }

    openModal('modal-color-customizer');
  }

  async function saveColorCustomizerFromModal() {
    const type = (document.getElementById('ccust-target-type') || {}).value || 'eco';
    const id = (document.getElementById('ccust-target-id') || {}).value || 'hotel';
    const progId = (document.getElementById('ccust-prog-id') || {}).value || '';
    const pickedHex = resolveHexColor((document.getElementById('ccust-color-input') || {}).value || '#10b981');
    const scopeCardRadio = document.getElementById('ccust-scope-card');
    const applyToCardOnly = type === 'prog' && scopeCardRadio && scopeCardRadio.checked;

    closeModal('modal-color-customizer');

    if (type === 'taxcat') {
      const nextList = getTaxCategories().map(c => (c.name === id ? { ...c, color: pickedHex } : c));
      await saveTaxCategoriesList(nextList, `Updated "${id}" color to ${pickedHex.toUpperCase()}`);
      return;
    }

    if (applyToCardOnly && progId) {
      const prog = (state.rewards.programs || []).find(p => p.id === progId);
      if (prog) {
        prog.custom_color = pickedHex;
        await saveRewardsState(`Updated card color for ${prog.name}`);
      }
      return;
    }

    // Apply to entire Loyalty Ecosystem category (and clear custom_color on the edited card if it was switched back to category scope)
    const ecoKey = ECOSYSTEM_META[id] ? id : 'hotel';
    if (progId) {
      const prog = (state.rewards.programs || []).find(p => p.id === progId);
      if (prog && prog.custom_color) {
        prog.custom_color = '';
        await saveRewardsState(`Synced ${prog.name} with ${ECOSYSTEM_META[ecoKey].label} color`);
      }
    }
    const nextEco = { ...getEcosystemColors(), [ecoKey]: pickedHex };
    await saveEcosystemColors(nextEco, `Updated ${ECOSYSTEM_META[ecoKey].label} color to ${pickedHex.toUpperCase()}`);
  }

  async function saveAdminTaxCategoryFromModal() {
    const origName = document.getElementById('taxcat-original-name').value.trim();
    const newName = document.getElementById('taxcat-name').value.trim();
    if (!newName) {
      showToast('Please enter a category name');
      return;
    }

    const currentList = [...getTaxCategories()];
    const isRename = origName && origName !== newName;

    // Check for duplicate names
    const exists = currentList.some(c => c.name.toLowerCase() === newName.toLowerCase() && c.name.toLowerCase() !== origName.toLowerCase());
    if (exists) {
      showToast(`Category "${newName}" already exists!`);
      return;
    }

    const customColEl = document.getElementById('taxcat-color-custom');
    const selectColEl = document.getElementById('taxcat-color');
    const chosenColor = resolveHexColor((customColEl && customColEl.value) || (selectColEl && selectColEl.value) || '#38bdf8');

    const item = {
      name: newName,
      icon: document.getElementById('taxcat-icon').value.trim() || '🏷️',
      schedule_c: document.getElementById('taxcat-schedule-c').value.trim() || 'Line 27a (Other Expenses)',
      deductible: document.getElementById('taxcat-deductible').value,
      color: chosenColor,
      notes: document.getElementById('taxcat-notes').value.trim()
    };

    let nextList;
    if (origName) {
      nextList = currentList.map(c => (c.name === origName ? item : c));
      // If renamed, update existing expenses using the old name
      if (isRename) {
        state.expenses.forEach(e => {
          if (e.category === origName) e.category = newName;
        });
      }
    } else {
      nextList = [...currentList, item];
    }

    closeModal('modal-admin-tax-category');
    await saveTaxCategoriesList(nextList, origName ? `Updated category "${newName}"` : `Added tax category "${newName}"!`);
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
    const formRprog = document.getElementById('form-reward-program');
    if (formRprog) {
      formRprog.addEventListener('submit', e => {
        e.preventDefault();
        saveRewardProgramFromModal();
      });
    }
    const formRcert = document.getElementById('form-reward-cert');
    if (formRcert) {
      formRcert.addEventListener('submit', e => {
        e.preventDefault();
        saveRewardCertFromModal();
      });
    }
    const formRcard = document.getElementById('form-reward-card');
    if (formRcard) {
      formRcard.addEventListener('submit', e => {
        e.preventDefault();
        saveRewardCardFromModal();
      });
    }
    const formRred = document.getElementById('form-reward-redemption');
    if (formRred) {
      formRred.addEventListener('submit', e => {
        e.preventDefault();
        saveRewardRedemptionFromModal();
      });
    }
    const formAdminCat = document.getElementById('form-admin-tax-category');
    if (formAdminCat) {
      formAdminCat.addEventListener('submit', e => {
        e.preventDefault();
        saveAdminTaxCategoryFromModal();
      });
    }
    const formColorCust = document.getElementById('form-color-customizer');
    if (formColorCust) {
      formColorCust.addEventListener('submit', e => {
        e.preventDefault();
        saveColorCustomizerFromModal();
      });
    }
    const formUpdateRew = document.getElementById('form-update-reward');
    if (formUpdateRew) {
      formUpdateRew.addEventListener('submit', e => {
        e.preventDefault();
        const id = (document.getElementById('urew-id') || {}).value;
        const kind = (document.getElementById('urew-type') || {}).value || 'card';
        applyRewardUpdate(id, kind);
      });
    }

    // Color picker input sync listeners
    const rprogColorInput = document.getElementById('rprog-color-input');
    if (rprogColorInput) {
      rprogColorInput.addEventListener('input', e => {
        const ecoEl = document.getElementById('rprog-ecosystem');
        syncRprogColorPickerUi(e.target.value, ecoEl ? ecoEl.value : 'hotel');
      });
    }
    const rprogEcoSelect = document.getElementById('rprog-ecosystem');
    if (rprogEcoSelect) {
      rprogEcoSelect.addEventListener('change', e => {
        const ecoKey = e.target.value || 'hotel';
        const scopeEcoRadio = document.getElementById('rprog-color-scope-eco');
        const nextHex = (scopeEcoRadio && scopeEcoRadio.checked)
          ? getEcosystemColor(ecoKey)
          : ((document.getElementById('rprog-color-input') || {}).value || getEcosystemColor(ecoKey));
        syncRprogColorPickerUi(nextHex, ecoKey);
      });
    }
    const ccustColorInput = document.getElementById('ccust-color-input');
    if (ccustColorInput) {
      ccustColorInput.addEventListener('input', e => {
        updateColorCustomizerPreview(e.target.value);
      });
    }
    const taxcatColorSelect = document.getElementById('taxcat-color');
    const taxcatColorCustom = document.getElementById('taxcat-color-custom');
    if (taxcatColorSelect && taxcatColorCustom) {
      taxcatColorSelect.addEventListener('change', e => {
        taxcatColorCustom.value = resolveHexColor(e.target.value);
      });
      taxcatColorCustom.addEventListener('input', e => {
        const hex = resolveHexColor(e.target.value);
        if (Array.from(taxcatColorSelect.options).some(o => o.value.toLowerCase() === hex.toLowerCase())) {
          taxcatColorSelect.value = hex;
        }
      });
    }

    // Live CPP Calculator inputs
    ['calc-program', 'calc-points', 'calc-cash', 'calc-fees'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', updateCppCalculator);
        el.addEventListener('change', updateCppCalculator);
      }
    });

    // Statement Credit Checkbox, Slider & Numeric Input + Card Image Upload delegation
    document.addEventListener('change', async e => {
      if (e.target && e.target.id === 'advisor-trip-select') {
        const tId = e.target.value;
        if (tId && tId !== 'custom') {
          const trip = state.trips.find(t => t.id === tId);
          if (trip) {
            document.querySelectorAll('#advisor-preset-chips [data-advisor-preset]').forEach(b => b.classList.remove('active'));
            const destEl = document.getElementById('advisor-destination-input');
            if (destEl) destEl.value = `${trip.destination || trip.name} (${trip.name})`;
            const nightEl = document.getElementById('advisor-nights-input');
            if (nightEl && trip.start_date && trip.end_date) {
              const diff = Math.max(1, Math.round((new Date(trip.end_date) - new Date(trip.start_date)) / (1000 * 60 * 60 * 24)));
              nightEl.value = diff;
            }
            renderAiTripAdvisorTab();
          }
        }
        return;
      }
      if (e.target && (e.target.id === 'advisor-destination-input' || e.target.id === 'advisor-nights-input' || e.target.id === 'advisor-style-select')) {
        renderAiTripAdvisorTab();
        return;
      }

      const credCheck = e.target.closest('[data-toggle-card-credit]');
      if (credCheck) {
        const cardId = credCheck.getAttribute('data-toggle-card-credit');
        const idx = Number(credCheck.getAttribute('data-credit-idx'));
        const card = state.rewards.cards.find(c => c.id === cardId);
        if (card && Array.isArray(card.credits) && card.credits[idx]) {
          const cr = card.credits[idx];
          const tot = Number(cr.total_usd ?? cr.amount ?? 0);
          cr.used_usd = credCheck.checked ? tot : 0;
          cr.used = Boolean(credCheck.checked);
          const label = cr.name || cr.label || 'Credit';
          await saveRewardsState(
            credCheck.checked
              ? `✓ Marked "${label}" (${fmtUsdCompact(tot)}) used`
              : `Unchecked "${label}"`
          );
        }
        return;
      }

      const cfCheck = e.target.closest('[data-toggle-cf-check]');
      if (cfCheck) {
        const ownerKey = cfCheck.getAttribute('data-toggle-cf-check');
        const idx = Number(cfCheck.getAttribute('data-cf-idx'));
        const { prog, card, fields } = resolveCustomFieldsTarget(ownerKey);
        if (fields[idx]) {
          fields[idx].checked = Boolean(cfCheck.checked);
          syncCustomFieldsToItems(prog, card, fields);
          const lbl = fields[idx].label || 'Custom Field';
          await saveRewardsState(
            cfCheck.checked
              ? `✓ Checked "${lbl}"`
              : `Unchecked "${lbl}"`
          );
        }
        return;
      }

      const credSlider = e.target.closest('[data-slider-card-credit]');
      if (credSlider) {
        const cardId = credSlider.getAttribute('data-slider-card-credit');
        const idx = Number(credSlider.getAttribute('data-credit-idx'));
        const card = state.rewards.cards.find(c => c.id === cardId);
        if (card && Array.isArray(card.credits) && card.credits[idx]) {
          const cr = card.credits[idx];
          const tot = Number(cr.total_usd ?? cr.amount ?? 0);
          const val = Math.min(tot, Math.max(0, Number(credSlider.value) || 0));
          const avail = Math.max(0, Number((tot - val).toFixed(2)));
          cr.used_usd = val;
          cr.used = tot > 0 && val >= tot;
          const label = cr.name || cr.label || 'Credit';
          await saveRewardsState(`Updated "${label}": Used ${fmtUsd(val)} → Reward Available: ${fmtUsd(avail)}`);
        }
        return;
      }

      const credInput = e.target.closest('[data-input-card-credit]');
      if (credInput) {
        const cardId = credInput.getAttribute('data-input-card-credit');
        const idx = Number(credInput.getAttribute('data-credit-idx'));
        const card = state.rewards.cards.find(c => c.id === cardId);
        if (card && Array.isArray(card.credits) && card.credits[idx]) {
          const cr = card.credits[idx];
          const tot = Number(cr.total_usd ?? cr.amount ?? 0);
          const val = Math.min(tot, Math.max(0, Number(credInput.value) || 0));
          const avail = Math.max(0, Number((tot - val).toFixed(2)));
          cr.used_usd = val;
          cr.used = tot > 0 && val >= tot;
          const label = cr.name || cr.label || 'Credit';
          await saveRewardsState(`Updated "${label}": Used ${fmtUsd(val)} → Reward Available: ${fmtUsd(avail)}`);
        }
        return;
      }

      const credResetDate = e.target.closest('[data-reset-date-card-credit]');
      if (credResetDate) {
        const cardId = credResetDate.getAttribute('data-reset-date-card-credit');
        const idx = Number(credResetDate.getAttribute('data-credit-idx'));
        const card = state.rewards.cards.find(c => c.id === cardId);
        if (card && Array.isArray(card.credits) && card.credits[idx]) {
          const cr = card.credits[idx];
          cr.reset_date = credResetDate.value || '2027-03';
          cr.reset_cycle = getDefaultCreditResetCycle(cr);
          const label = cr.name || cr.label || 'Credit';
          await saveRewardsState(`Set "${label}" reset date to ${formatResetMonthDisplay(cr.reset_date, cr.reset_cycle)}`);
        }
        return;
      }

      const credResetCycle = e.target.closest('[data-reset-cycle-card-credit]');
      if (credResetCycle) {
        const cardId = credResetCycle.getAttribute('data-reset-cycle-card-credit');
        const idx = Number(credResetCycle.getAttribute('data-credit-idx'));
        const card = state.rewards.cards.find(c => c.id === cardId);
        if (card && Array.isArray(card.credits) && card.credits[idx]) {
          const cr = card.credits[idx];
          cr.reset_cycle = credResetCycle.value || 'Annually';
          cr.reset_date = getDefaultCreditResetMonth(card, cr);
          const label = cr.name || cr.label || 'Credit';
          await saveRewardsState(`Set "${label}" reset cycle to ${formatResetMonthDisplay(cr.reset_date, cr.reset_cycle)}`);
        }
        return;
      }

      if (e.target && e.target.id === 'rcard-style-preset') {
        updateRcardArtPreview();
        return;
      }

      if (e.target && e.target.id === 'rcard-image-file') {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxW = 480;
            const scale = Math.min(1, maxW / Math.max(1, img.width));
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
            const urlInput = document.getElementById('rcard-image-url');
            if (urlInput) urlInput.value = dataUrl;
            updateRcardArtPreview();
            showToast('Uploaded custom card image!');
          };
          img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
        e.target.value = '';
      }
    });

    // Live Database Search, Live Reward Available Auto-Calc & Card Art Preview input delegation
    document.addEventListener('input', e => {
      const t = e.target;
      if (!t) return;
      if (t.id === 'rcard-db-search') {
        const res = document.getElementById('rcard-db-results');
        if (res) res.style.display = 'flex';
        renderRcardDbResults(t.value, activeRcardDbIssuer);
      } else if (t.id === 'rprog-db-search') {
        const res = document.getElementById('rprog-db-results');
        if (res) res.style.display = 'flex';
        renderRprogDbResults(t.value, activeRprogDbCat);
      } else if (t.id === 'rcert-db-search') {
        const res = document.getElementById('rcert-db-results');
        if (res) res.style.display = 'flex';
        renderRcertDbResults(t.value);
      } else if (t.id === 'tpl-modal-search') {
        renderRewardTemplatesModalContent(t.value, activeTplModalFilter);
      } else if (t.id === 'rcard-name' || t.id === 'rcard-issuer' || t.id === 'rcard-image-url' || t.id === 'rcard-number' || t.id === 'rcard-exp') {
        updateRcardArtPreview();
      } else if (t.hasAttribute && (t.hasAttribute('data-slider-card-credit') || t.hasAttribute('data-input-card-credit'))) {
        // Live sync accompanying number input / slider and auto-calculate "Reward Available: $XX.XX"
        const row = t.closest('.interactive-credit-row') || t.closest('.credit-condensed-item');
        if (row) {
          const slider = row.querySelector('[data-slider-card-credit]');
          const numInput = row.querySelector('[data-input-card-credit]');
          const tot = slider ? Number(slider.max) || 0 : 0;
          const used = Math.min(tot, Math.max(0, Number(t.value) || 0));
          const avail = Math.max(0, Number((tot - used).toFixed(2)));
          if (t.hasAttribute('data-slider-card-credit') && numInput) numInput.value = used;
          if (t.hasAttribute('data-input-card-credit') && slider) slider.value = used;
          const availPill = row.querySelector('[data-live-avail-pill]');
          if (availPill) {
            availPill.textContent = avail > 0 ? `Reward Available: ${fmtUsd(avail)}` : `✓ $0.00 Left (All ${fmtUsd(tot)} Used)`;
            availPill.classList.toggle('zero', avail === 0);
          }
          const usedTotEl = row.querySelector('[data-live-used-tot]');
          if (usedTotEl) {
            usedTotEl.textContent = `Used: ${fmtUsd(used)} / ${fmtUsd(tot)}`;
          }
        }
      } else if (t.classList && (t.classList.contains('vcred-total') || t.classList.contains('vcred-used'))) {
        const row = t.closest('.visual-credit-editor-row');
        if (row) {
          const tot = Math.max(0, Number((row.querySelector('.vcred-total') || {}).value) || 0);
          const used = Math.min(tot, Math.max(0, Number((row.querySelector('.vcred-used') || {}).value) || 0));
          const avail = Math.max(0, Number((tot - used).toFixed(2)));
          const badge = row.querySelector('.vcred-avail-badge');
          if (badge) {
            badge.textContent = `${fmtUsd(avail)} Avail`;
            badge.classList.toggle('zero', avail === 0);
          }
        }
      }
    });

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
      if (e.target.closest('#btn-copy-origin-url, #btn-auth-copy-origin')) {
        e.preventDefault();
        const originUrl = window.location.origin || '';
        try {
          await navigator.clipboard.writeText(originUrl);
        } catch (err) {}
        showToast(`Copied "${originUrl}" — paste into Google Cloud Authorized JavaScript origins!`);
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
      if (e.target.closest('#btn-submit-reward-program')) {
        e.preventDefault();
        saveRewardProgramFromModal();
        return;
      }
      if (e.target.closest('#btn-submit-reward-cert')) {
        e.preventDefault();
        saveRewardCertFromModal();
        return;
      }
      if (e.target.closest('#btn-submit-reward-card')) {
        e.preventDefault();
        saveRewardCardFromModal();
        return;
      }
      if (e.target.closest('#btn-submit-reward-redemption')) {
        e.preventDefault();
        saveRewardRedemptionFromModal();
        return;
      }
      if (e.target.closest('#btn-submit-admin-tax-category')) {
        e.preventDefault();
        saveAdminTaxCategoryFromModal();
        return;
      }
      if (e.target.closest('#btn-submit-color-customizer')) {
        e.preventDefault();
        saveColorCustomizerFromModal();
        return;
      }
      if (e.target.closest('#btn-submit-update-reward')) {
        e.preventDefault();
        const id = (document.getElementById('urew-id') || {}).value;
        const kind = (document.getElementById('urew-type') || {}).value || 'card';
        applyRewardUpdate(id, kind);
        return;
      }

      // Master "Update All Rewards" Launcher & Actions
      if (e.target.closest('#btn-update-all-rewards')) {
        e.preventDefault();
        openUpdateAllRewardsModal();
        return;
      }
      if (e.target.closest('#btn-uall-tab-perks')) {
        e.preventDefault();
        document.getElementById('btn-uall-tab-perks').classList.add('active');
        document.getElementById('btn-uall-tab-balances').classList.remove('active');
        document.getElementById('uall-pane-perks').style.display = 'block';
        document.getElementById('uall-pane-balances').style.display = 'none';
        return;
      }
      if (e.target.closest('#btn-uall-tab-balances')) {
        e.preventDefault();
        document.getElementById('btn-uall-tab-balances').classList.add('active');
        document.getElementById('btn-uall-tab-perks').classList.remove('active');
        document.getElementById('uall-pane-balances').style.display = 'block';
        document.getElementById('uall-pane-perks').style.display = 'none';
        return;
      }
      if (e.target.closest('#btn-apply-bulk-perks')) {
        e.preventDefault();
        applyBulkPerksUpdate();
        return;
      }
      if (e.target.closest('#btn-save-bulk-balances')) {
        e.preventDefault();
        saveBulkBalancesCheckin();
        return;
      }

      // Individual Card / Program Update Buttons
      const updateProgBtn = e.target.closest('[data-update-rprog]');
      if (updateProgBtn) {
        e.preventDefault();
        closeModal('modal-reward-mini-dashboard');
        openUpdateRewardModal(updateProgBtn.getAttribute('data-update-rprog'), 'program');
        return;
      }
      const updateCardBtn = e.target.closest('[data-update-rcard]');
      if (updateCardBtn) {
        e.preventDefault();
        closeModal('modal-reward-mini-dashboard');
        openUpdateRewardModal(updateCardBtn.getAttribute('data-update-rcard'), 'card');
        return;
      }

      // Custom Field Actions (Add & Delete)
      if (e.target.closest('#btn-rprog-add-custom-field')) {
        e.preventDefault();
        addCustomFieldRow('rprog-custom-fields-container', '', '');
        return;
      }
      if (e.target.closest('#btn-rcard-add-custom-field')) {
        e.preventDefault();
        addCustomFieldRow('rcard-custom-fields-container', '', '');
        return;
      }
      if (e.target.closest('#btn-rcert-add-custom-field')) {
        e.preventDefault();
        addCustomFieldRow('rcert-custom-fields-container', '', '');
        return;
      }
      const cdelBtn = e.target.closest('.cfield-del-btn');
      if (cdelBtn) {
        e.preventDefault();
        const row = cdelBtn.closest('.custom-field-row');
        if (row) row.remove();
        return;
      }

      // Color Swatch clicks inside Edit Loyalty Program modal
      const rprogSwatch = e.target.closest('[data-rprog-swatch]');
      if (rprogSwatch) {
        e.preventDefault();
        const hex = rprogSwatch.getAttribute('data-rprog-swatch');
        const ecoEl = document.getElementById('rprog-ecosystem');
        syncRprogColorPickerUi(hex, ecoEl ? ecoEl.value : 'hotel');
        return;
      }

      // Color Swatch clicks inside Quick Color Customizer modal
      const ccustSwatch = e.target.closest('[data-ccust-swatch]');
      if (ccustSwatch) {
        e.preventDefault();
        updateColorCustomizerPreview(ccustSwatch.getAttribute('data-ccust-swatch'));
        return;
      }

      // Switch target category inside Quick Color Customizer modal
      const ccustTargetBtn = e.target.closest('[data-ccust-select-target]');
      if (ccustTargetBtn) {
        e.preventDefault();
        const raw = ccustTargetBtn.getAttribute('data-ccust-select-target') || '';
        const colonIdx = raw.indexOf(':');
        if (colonIdx > 0) {
          const tType = raw.slice(0, colonIdx);
          const tId = raw.slice(colonIdx + 1);
          openColorCustomizerModal({ type: tType, id: tId });
        }
        return;
      }

      // Open Quick Color Customizer from Loyalty Program card pencil icon
      const quickColorProgBtn = e.target.closest('[data-quick-color-prog]');
      if (quickColorProgBtn) {
        e.preventDefault();
        e.stopPropagation();
        const progId = quickColorProgBtn.getAttribute('data-quick-color-prog');
        openColorCustomizerModal({ type: 'prog', id: progId, progId });
        return;
      }

      // Open Quick Color Customizer for a Loyalty Ecosystem category
      const quickColorEcoBtn = e.target.closest('[data-quick-color-eco]');
      if (quickColorEcoBtn) {
        e.preventDefault();
        e.stopPropagation();
        const ecoKey = quickColorEcoBtn.getAttribute('data-quick-color-eco');
        openColorCustomizerModal({ type: 'eco', id: ecoKey });
        return;
      }

      // Open Quick Color Customizer from "🎨 Category Colors" button in Rewards
      if (e.target.closest('#btn-open-eco-colors')) {
        e.preventDefault();
        const activeEco = (state.rewardsEcoFilter && state.rewardsEcoFilter !== 'all') ? state.rewardsEcoFilter : 'hotel';
        openColorCustomizerModal({ type: 'eco', id: activeEco });
        return;
      }

      // Open Quick Color Customizer for an Expense / Tax Category
      const quickColorTaxBtn = e.target.closest('[data-quick-color-taxcat]');
      if (quickColorTaxBtn) {
        e.preventDefault();
        e.stopPropagation();
        const catName = quickColorTaxBtn.getAttribute('data-quick-color-taxcat');
        openColorCustomizerModal({ type: 'taxcat', id: catName });
        return;
      }

      // Reset to default inside Quick Color Customizer modal
      if (e.target.closest('#btn-ccust-reset-default')) {
        e.preventDefault();
        const type = (document.getElementById('ccust-target-type') || {}).value || 'eco';
        const id = (document.getElementById('ccust-target-id') || {}).value || 'hotel';
        if (type === 'taxcat') {
          const defCat = DEFAULT_TAX_CATEGORIES.find(d => d.name === id);
          updateColorCustomizerPreview(defCat ? defCat.color : '#38bdf8');
        } else {
          const ecoKey = ECOSYSTEM_META[id] ? id : 'hotel';
          const scopeEcoRadio = document.getElementById('ccust-scope-eco');
          if (scopeEcoRadio) scopeEcoRadio.checked = true;
          updateColorCustomizerPreview(DEFAULT_ECOSYSTEM_COLORS[ecoKey] || '#10b981');
        }
        return;
      }

      // Reset all Loyalty Ecosystem colors in Admin
      if (e.target.closest('#btn-admin-reset-eco-colors')) {
        e.preventDefault();
        (state.rewards.programs || []).forEach(p => {
          if (p.custom_color) delete p.custom_color;
        });
        await saveRewardsState('Cleared custom card color overrides');
        await saveEcosystemColors(DEFAULT_ECOSYSTEM_COLORS, 'Restored default Loyalty category colors');
        return;
      }

      // Close "+ Add ▾" dropdown menu when clicking outside or on a menu item
      const addDropdownMenu = document.getElementById('rewards-add-dropdown-menu');
      if (addDropdownMenu && addDropdownMenu.style.display !== 'none') {
        if (!e.target.closest('#btn-rewards-add-menu-toggle')) {
          addDropdownMenu.style.display = 'none';
        }
      }
      if (e.target.closest('#btn-rewards-add-menu-toggle')) {
        e.preventDefault();
        e.stopPropagation();
        if (addDropdownMenu) {
          addDropdownMenu.style.display = addDropdownMenu.style.display === 'none' ? 'flex' : 'none';
        }
        return;
      }

      // Open Rewards Portfolio Summary (5 KPIs Popup)
      if (e.target.closest('#btn-open-rewards-summary')) {
        e.preventDefault();
        renderRewardsDashboard();
        openModal('modal-rewards-summary');
        return;
      }

      // Topbar Rewards Command Center launcher / toggle & Back button
      if (e.target.closest('#btn-topbar-rewards')) {
        e.preventDefault();
        switchView(state.activeView === 'rewards' ? 'dashboard' : 'rewards');
        return;
      }
      if (e.target.closest('#btn-rewards-back-finance')) {
        e.preventDefault();
        switchView('dashboard');
        return;
      }

      // Rewards Sub-navigation Tabs
      const rtabBtn = e.target.closest('.rewards-subnav [data-rewards-tab]');
      if (rtabBtn) {
        e.preventDefault();
        state.rewardsTab = rtabBtn.getAttribute('data-rewards-tab');
        renderRewardsDashboard();
        return;
      }

      // Rewards Ecosystem Filter Chips
      const recoChip = e.target.closest('#rewards-ecosystem-chips [data-eco-filter]');
      if (recoChip) {
        e.preventDefault();
        state.rewardsEcoFilter = recoChip.getAttribute('data-eco-filter');
        renderRewardsDashboard();
        return;
      }

      // Rewards Cert Filter Chips
      const rcertChip = e.target.closest('#rewards-cert-chips [data-cert-filter]');
      if (rcertChip) {
        e.preventDefault();
        state.rewardsCertFilter = rcertChip.getAttribute('data-cert-filter');
        renderRewardsDashboard();
        return;
      }

      // Transfer Matrix Bank Filter Chips
      const mbankChip = e.target.closest('#matrix-bank-filter-chips [data-matrix-filter]');
      if (mbankChip) {
        e.preventDefault();
        state.matrixBankFilter = mbankChip.getAttribute('data-matrix-filter');
        renderRewardsMatrixTab();
        return;
      }

      // Copy Member ID pill
      const copyMemBtn = e.target.closest('[data-copy-member]');
      if (copyMemBtn) {
        e.preventDefault();
        const memId = copyMemBtn.getAttribute('data-copy-member');
        try {
          await navigator.clipboard.writeText(memId);
        } catch (err) {}
        showToast(`Copied Member ID: ${memId}`);
        return;
      }

      // Toggle Card Number / PIN reveal
      const toggleSecretBtn = e.target.closest('[data-toggle-card-secret]');
      if (toggleSecretBtn) {
        e.preventDefault();
        e.stopPropagation();
        const cardId = toggleSecretBtn.getAttribute('data-toggle-card-secret');
        if (cardId) {
          revealedCardSecrets[cardId] = !revealedCardSecrets[cardId];
          renderRewardsDashboard();
        }
        return;
      }

      // Copy Card Number, Expiration Date, or PIN to clipboard
      const copySecretBtn = e.target.closest('[data-copy-secret]');
      if (copySecretBtn) {
        e.preventDefault();
        e.stopPropagation();
        const secretVal = copySecretBtn.getAttribute('data-copy-secret') || '';
        const secretLabel = copySecretBtn.getAttribute('data-copy-label') || 'Card Info';
        if (secretVal) {
          try {
            await navigator.clipboard.writeText(secretVal);
          } catch (err) {}
          showToast(`📋 Copied ${secretLabel} to clipboard!`);
        }
        return;
      }

      // Open Reward / Card Website Login button (auto-copies Member ID if present)
      const openWebBtn = e.target.closest('[data-open-reward-website]');
      if (openWebBtn) {
        const memId = (openWebBtn.getAttribute('data-copy-member-on-open') || '').trim();
        const label = openWebBtn.getAttribute('data-reward-label') || 'Account';
        if (memId) {
          try {
            await navigator.clipboard.writeText(memId);
          } catch (err) {}
          showToast(`📋 Copied Member ID (${memId}) — opening ${label} login!`);
        } else {
          showToast(`🌐 Opening ${label} login portal...`);
        }
        return;
      }

      // Click-to-Update Points / Miles Available ("Quick Add / Set Balance")
      const toggleCfDrawerBtn = e.target.closest('[data-toggle-cf-drawer]');
      if (toggleCfDrawerBtn) {
        e.preventDefault();
        e.stopPropagation();
        const ownerKey = toggleCfDrawerBtn.getAttribute('data-toggle-cf-drawer');
        if (ownerKey) {
          activeCustomFieldsDrawers[ownerKey] = !activeCustomFieldsDrawers[ownerKey];
          renderRewardsDashboard();
          if (activeCustomFieldsDrawers[ownerKey]) {
            setTimeout(() => {
              const inp = document.querySelector(`[data-cf-new-label="${ownerKey}"]`);
              if (inp) inp.focus();
            }, 25);
          }
        }
        return;
      }

      const addCfSubmitBtn = e.target.closest('[data-add-cf-submit]');
      if (addCfSubmitBtn) {
        e.preventDefault();
        e.stopPropagation();
        const ownerKey = addCfSubmitBtn.getAttribute('data-add-cf-submit');
        const box = addCfSubmitBtn.closest('[data-cf-adder-box]');
        const lblEl = box ? box.querySelector('[data-cf-new-label]') : document.querySelector(`[data-cf-new-label="${ownerKey}"]`);
        const valEl = box ? box.querySelector('[data-cf-new-val]') : document.querySelector(`[data-cf-new-val="${ownerKey}"]`);
        const lbl = ((lblEl && lblEl.value) || '').trim();
        const val = ((valEl && valEl.value) || '').trim();
        if (!lbl) {
          showToast('Please enter a custom field label (e.g. $150 Delta Stays Credit)');
          if (lblEl) lblEl.focus();
          return;
        }
        const { prog, card, fields } = resolveCustomFieldsTarget(ownerKey);
        fields.push({
          id: `cf-${Date.now()}`,
          label: lbl,
          value: val,
          checked: false
        });
        syncCustomFieldsToItems(prog, card, fields);
        await saveRewardsState(`✓ Added custom checkbox "${lbl}"!`);
        setTimeout(() => {
          const nextInp = document.querySelector(`[data-cf-new-label="${ownerKey}"]`);
          if (nextInp) nextInp.focus();
        }, 25);
        return;
      }

      const importCreditsCfBtn = e.target.closest('[data-import-credits-to-cf]');
      if (importCreditsCfBtn) {
        e.preventDefault();
        e.stopPropagation();
        const ownerKey = importCreditsCfBtn.getAttribute('data-import-credits-to-cf');
        const { prog, card, fields } = resolveCustomFieldsTarget(ownerKey);
        const crs = card && Array.isArray(card.credits) ? card.credits : [];
        let addedCount = 0;
        for (const cr of crs) {
          const nm = String(cr.name || cr.label || '').trim();
          if (!nm) continue;
          const exists = fields.some(f => f.label.toLowerCase() === nm.toLowerCase());
          if (!exists) {
            const tot = Number(cr.total_usd ?? cr.amount ?? 0);
            const used = cr.used_usd !== undefined ? Number(cr.used_usd) : (cr.used ? tot : 0);
            fields.push({
              id: `cf-${Date.now()}-${addedCount}`,
              label: nm,
              value: tot > 0 ? fmtUsdCompact(tot) : '',
              checked: tot > 0 && used >= tot
            });
            addedCount++;
          }
        }
        if (addedCount > 0) {
          syncCustomFieldsToItems(prog, card, fields);
          await saveRewardsState(`⚡ Imported ${addedCount} statement credit(s) as custom checkboxes!`);
        } else {
          showToast('All statement credits for this card are already in your custom fields!');
        }
        return;
      }

      const editCfItemBtn = e.target.closest('[data-edit-cf-item]');
      if (editCfItemBtn) {
        e.preventDefault();
        e.stopPropagation();
        const ownerKey = editCfItemBtn.getAttribute('data-edit-cf-item');
        const idx = Number(editCfItemBtn.getAttribute('data-cf-idx'));
        activeEditingCustomFieldKey = `${ownerKey}:${idx}`;
        renderRewardsDashboard();
        setTimeout(() => {
          const inp = document.querySelector(`[data-cf-edit-label="${activeEditingCustomFieldKey}"]`);
          if (inp) {
            inp.focus();
            inp.select();
          }
        }, 20);
        return;
      }

      if (e.target.closest('[data-cancel-cf-edit]')) {
        e.preventDefault();
        e.stopPropagation();
        activeEditingCustomFieldKey = null;
        renderRewardsDashboard();
        return;
      }

      const saveCfEditBtn = e.target.closest('[data-save-cf-edit]');
      if (saveCfEditBtn) {
        e.preventDefault();
        e.stopPropagation();
        const ownerKey = saveCfEditBtn.getAttribute('data-save-cf-edit');
        const idx = Number(saveCfEditBtn.getAttribute('data-cf-idx'));
        const editKey = `${ownerKey}:${idx}`;
        const row = saveCfEditBtn.closest('[data-cf-edit-row]');
        const labelInp = row ? row.querySelector('[data-cf-edit-label]') : document.querySelector(`[data-cf-edit-label="${editKey}"]`);
        const valInp = row ? row.querySelector('[data-cf-edit-val]') : document.querySelector(`[data-cf-edit-val="${editKey}"]`);
        const nextLabel = labelInp ? labelInp.value.trim() : '';
        const nextVal = valInp ? valInp.value.trim() : '';
        if (!nextLabel) {
          showToast('Please enter a label for this custom field');
          if (labelInp) labelInp.focus();
          return;
        }
        const { prog, card, fields } = resolveCustomFieldsTarget(ownerKey);
        if (fields[idx]) {
          fields[idx].label = nextLabel;
          fields[idx].value = nextVal;
          syncCustomFieldsToItems(prog, card, fields);
          activeEditingCustomFieldKey = null;
          await saveRewardsState(`✓ Updated "${nextLabel}"!`);
        }
        return;
      }

      const delCfItemBtn = e.target.closest('[data-del-cf-item]');
      if (delCfItemBtn) {
        e.preventDefault();
        e.stopPropagation();
        const ownerKey = delCfItemBtn.getAttribute('data-del-cf-item');
        const idx = Number(delCfItemBtn.getAttribute('data-cf-idx'));
        const { prog, card, fields } = resolveCustomFieldsTarget(ownerKey);
        if (fields[idx]) {
          const [removed] = fields.splice(idx, 1);
          syncCustomFieldsToItems(prog, card, fields);
          await saveRewardsState(`Removed "${removed.label}"`);
        }
        return;
      }

      const qpOpenBtn = e.target.closest('[data-quick-points-open]');
      if (qpOpenBtn) {
        e.preventDefault();
        e.stopPropagation();
        activeQuickBalanceProgId = qpOpenBtn.getAttribute('data-quick-points-open');
        renderRewardsDashboard();
        setTimeout(() => {
          const inp = document.querySelector(`[data-qp-input="${activeQuickBalanceProgId}"]`);
          if (inp) {
            inp.focus();
            inp.select();
          }
        }, 20);
        return;
      }
      if (e.target.closest('[data-qp-cancel]')) {
        e.preventDefault();
        e.stopPropagation();
        activeQuickBalanceProgId = null;
        renderRewardsDashboard();
        return;
      }
      const qpSaveSetBtn = e.target.closest('[data-qp-save-set]');
      if (qpSaveSetBtn) {
        e.preventDefault();
        e.stopPropagation();
        const progId = qpSaveSetBtn.getAttribute('data-qp-save-set');
        const box = qpSaveSetBtn.closest('[data-qp-box]');
        const inp = box ? box.querySelector('[data-qp-input]') : document.querySelector(`[data-qp-input="${progId}"]`);
        const prog = (state.rewards.programs || []).find(p => p.id === progId);
        if (prog && inp) {
          const val = Math.max(0, Math.round(Number(inp.value) || 0));
          prog.points = val;
          activeQuickBalanceProgId = null;
          await saveRewardsState(`✓ Updated ${prog.name} balance to ${val.toLocaleString('en-US')} pts!`);
        }
        return;
      }
      const qpSaveAddBtn = e.target.closest('[data-qp-save-add]');
      if (qpSaveAddBtn) {
        e.preventDefault();
        e.stopPropagation();
        const progId = qpSaveAddBtn.getAttribute('data-qp-save-add');
        const box = qpSaveAddBtn.closest('[data-qp-box]');
        const inp = box ? box.querySelector('[data-qp-input]') : document.querySelector(`[data-qp-input="${progId}"]`);
        const prog = (state.rewards.programs || []).find(p => p.id === progId);
        if (prog && inp) {
          const cur = Number(prog.points ?? prog.balance ?? 0);
          const delta = Math.round(Number(inp.value) || 0);
          const nextPts = Math.max(0, cur + delta);
          prog.points = nextPts;
          activeQuickBalanceProgId = null;
          await saveRewardsState(`⚡ Added ${delta.toLocaleString('en-US')} pts → ${prog.name}: ${nextPts.toLocaleString('en-US')} pts!`);
        }
        return;
      }

      // Quick +/- Elite Nights stepper on Program Card
      const stepNightsBtn = e.target.closest('[data-step-rnights]');
      if (stepNightsBtn) {
        e.preventDefault();
        e.stopPropagation();
        const progId = stepNightsBtn.getAttribute('data-step-rnights');
        const delta = Number(stepNightsBtn.getAttribute('data-delta')) || 0;
        const prog = state.rewards.programs.find(p => p.id === progId);
        if (prog) {
          const cur = Number(prog.qualifying_nights ?? prog.qualifying_current ?? 0);
          const tgt = Number(prog.target_nights ?? prog.qualifying_target ?? 60);
          prog.qualifying_nights = Math.max(0, cur + delta);
          await saveRewardsState(`${prog.name}: ${prog.qualifying_nights} / ${tgt} ${prog.metric_label || 'Nights'}`);
        }
        return;
      }

      // Household Owner Filter Chips & Actions
      const ownerFilterBtn = e.target.closest('[data-owner-filter]');
      if (ownerFilterBtn) {
        e.preventDefault();
        state.rewardsOwnerFilter = ownerFilterBtn.getAttribute('data-owner-filter') || 'all';
        try { localStorage.setItem('ww_rewards_owner_filter', state.rewardsOwnerFilter); } catch (err) {}
        renderRewardsDashboard();
        return;
      }
      const ownerAddBtn = e.target.closest('[data-owner-add]');
      if (ownerAddBtn) {
        e.preventDefault();
        const person = prompt('Add cardholder / account owner name (e.g. Jim, Karen, Alex):');
        if (person && person.trim()) {
          registerRewardOwner(person.trim());
          state.rewardsOwnerFilter = person.trim();
          try { localStorage.setItem('ww_rewards_owner_filter', state.rewardsOwnerFilter); } catch (err) {}
          await saveRewardsState(`Added cardholder: ${person.trim()}`);
        }
        return;
      }
      const ownerAssignBtn = e.target.closest('[data-owner-assign-unassigned]');
      if (ownerAssignBtn) {
        e.preventDefault();
        const owners = getRewardOwners();
        const target = prompt(`Assign all unassigned cards & programs to which person?\n\nAvailable: ${owners.join(', ')}`, owners[0] || 'Jim');
        if (target && target.trim()) {
          registerRewardOwner(target.trim());
          let count = 0;
          ['programs', 'cards', 'certificates'].forEach(k => {
            (state.rewards[k] || []).forEach(item => {
              if (!item.owner || !item.owner.trim()) {
                item.owner = target.trim();
                count++;
              }
            });
          });
          await saveRewardsState(`Assigned ${count} items to ${target.trim()}`);
        }
        return;
      }

      // AI Trip & Rewards Advisor Controls
      const tripAiBtn = e.target.closest('[data-trip-ai-advisor]');
      if (tripAiBtn) {
        e.preventDefault();
        const tripId = tripAiBtn.getAttribute('data-trip-ai-advisor');
        state.selectedTripId = tripId;
        state.rewardsTab = 'advisor';
        switchView('rewards');
        renderAll();
        setTimeout(() => {
          const tripSel = document.getElementById('advisor-trip-select');
          if (tripSel) {
            tripSel.value = tripId;
            tripSel.dispatchEvent(new Event('change'));
          }
        }, 40);
        return;
      }
      if (e.target.closest('#btn-run-ai-trip-analysis')) {
        e.preventDefault();
        runAiTripAnalysis();
        return;
      }
      if (e.target.closest('#btn-toggle-ai-key-drawer')) {
        e.preventDefault();
        const drawer = document.getElementById('ai-key-config-drawer');
        if (drawer) {
          drawer.style.display = drawer.style.display === 'none' ? 'block' : 'none';
        }
        return;
      }
      if (e.target.closest('#btn-save-ai-api-key')) {
        e.preventDefault();
        saveAiApiKeyFromDrawer();
        return;
      }
      if (e.target.closest('#btn-qr-open-ai-advisor')) {
        e.preventDefault();
        closeModal('modal-quick-rewards');
        state.rewardsTab = 'advisor';
        switchView('rewards');
        renderAll();
        setTimeout(() => runAiTripAnalysis(), 50);
        return;
      }
      const presetBtn = e.target.closest('#advisor-preset-chips [data-advisor-preset]');
      if (presetBtn) {
        e.preventDefault();
        const key = presetBtn.getAttribute('data-advisor-preset');
        const pData = PRESET_ADVISOR_DESTINATIONS[key];
        if (pData) {
          document.querySelectorAll('#advisor-preset-chips [data-advisor-preset]').forEach(b => b.classList.remove('active'));
          presetBtn.classList.add('active');
          const destEl = document.getElementById('advisor-destination-input');
          if (destEl) destEl.value = pData.dest;
          const nightEl = document.getElementById('advisor-nights-input');
          if (nightEl) nightEl.value = pData.nights;
          const origEl = document.getElementById('advisor-origin-input');
          if (origEl) origEl.value = pData.origin;
          const styleEl = document.getElementById('advisor-style-select');
          if (styleEl) styleEl.value = pData.style;
          const tripSel = document.getElementById('advisor-trip-select');
          if (tripSel) tripSel.value = 'custom';
          renderAiTripAdvisorTab();
        }
        return;
      }

      // Open Rewards Modals (Add / Edit / Delete)
      if (e.target.closest('#btn-open-add-program, #btn-prog-add-custom, #btn-empty-prog-add')) {
        e.preventDefault();
        openRewardProgramModal(null);
        return;
      }
      const editRprogBtn = e.target.closest('[data-edit-rprog]');
      if (editRprogBtn) {
        e.preventDefault();
        const prog = state.rewards.programs.find(p => p.id === editRprogBtn.getAttribute('data-edit-rprog'));
        if (prog) openRewardProgramModal(prog);
        return;
      }
      const delRprogBtn = e.target.closest('[data-del-rprog]');
      if (delRprogBtn) {
        e.preventDefault();
        const id = delRprogBtn.getAttribute('data-del-rprog');
        const prog = state.rewards.programs.find(p => p.id === id);
        const name = prog ? prog.name : 'this loyalty program';
        const ok = await confirmDelete({
          title: 'Delete Loyalty Program',
          message: `Are you sure you want to delete "${name}"?`,
          extra: 'Any saved point balances and tier targets for this program will be removed.'
        });
        if (!ok) return;
        recordDeletedRewardId(id);
        state.rewards.programs = state.rewards.programs.filter(p => p.id !== id);
        await saveRewardsState(`Deleted ${name}`);
        return;
      }

      if (e.target.closest('#btn-open-add-cert, #btn-cert-add-new, #btn-empty-cert-add')) {
        e.preventDefault();
        openRewardCertModal(null);
        return;
      }
      const editRcertBtn = e.target.closest('[data-edit-rcert]');
      if (editRcertBtn) {
        e.preventDefault();
        const cert = state.rewards.certificates.find(c => c.id === editRcertBtn.getAttribute('data-edit-rcert'));
        if (cert) openRewardCertModal(cert);
        return;
      }
      const delRcertBtn = e.target.closest('[data-del-rcert]');
      if (delRcertBtn) {
        e.preventDefault();
        const id = delRcertBtn.getAttribute('data-del-rcert');
        const cert = state.rewards.certificates.find(c => c.id === id);
        const title = cert ? cert.title : 'this certificate';
        const ok = await confirmDelete({
          title: 'Delete Certificate / Travel Perk',
          message: `Are you sure you want to delete "${title}"?`,
          extra: 'This certificate will be removed from your perks tracker.'
        });
        if (!ok) return;
        recordDeletedRewardId(id);
        state.rewards.certificates = state.rewards.certificates.filter(c => c.id !== id);
        await saveRewardsState(`Deleted ${title}`);
        return;
      }
      const toggleRcertBtn = e.target.closest('[data-toggle-rcert]');
      if (toggleRcertBtn) {
        e.preventDefault();
        const cert = state.rewards.certificates.find(c => c.id === toggleRcertBtn.getAttribute('data-toggle-rcert'));
        if (cert) {
          cert.status = cert.status === 'redeemed' ? 'available' : 'redeemed';
          await saveRewardsState(cert.status === 'redeemed' ? `🎉 Marked "${cert.title}" Redeemed!` : `Restored "${cert.title}" to Available`);
        }
        return;
      }

      // Inline Mini-Tabs inside Loyalty Program Cards & Credit Cards
      const progMiniTabBtn = e.target.closest('[data-prog-minitab]');
      if (progMiniTabBtn) {
        e.preventDefault();
        const progId = progMiniTabBtn.getAttribute('data-prog-minitab');
        const nextTab = progMiniTabBtn.getAttribute('data-tab') || 'overview';
        activeProgramCardMiniTabs[progId] = nextTab;
        renderRewardsProgramsTab();
        return;
      }
      const cardMiniTabBtn = e.target.closest('[data-card-minitab]');
      if (cardMiniTabBtn) {
        e.preventDefault();
        const cardId = cardMiniTabBtn.getAttribute('data-card-minitab');
        const nextTab = cardMiniTabBtn.getAttribute('data-tab') || 'overview';
        activeCreditCardMiniTabs[cardId] = nextTab;
        renderRewardsCardsTab();
        return;
      }

      // Toggle Condensed Credit Row Slider/Reset Drawer
      const toggleDrawerBtn = e.target.closest('[data-toggle-credit-drawer]');
      if (toggleDrawerBtn) {
        e.preventDefault();
        const key = toggleDrawerBtn.getAttribute('data-toggle-credit-drawer');
        if (key) {
          expandedCreditDrawers[key] = !expandedCreditDrawers[key];
          const itemEl = toggleDrawerBtn.closest('.credit-condensed-item');
          if (itemEl) {
            itemEl.classList.toggle('expanded', Boolean(expandedCreditDrawers[key]));
            toggleDrawerBtn.textContent = expandedCreditDrawers[key] ? '▴ Hide' : '⚙️ Adjust';
          }
        }
        return;
      }

      // Open Program / Card Mini-Dashboard Flyout Modal
      const openProgMdBtn = e.target.closest('[data-open-prog-md]');
      if (openProgMdBtn) {
        e.preventDefault();
        const progId = openProgMdBtn.getAttribute('data-open-prog-md');
        const mdTab = openProgMdBtn.getAttribute('data-md-tab') || 'overview';
        openRewardMiniDashboard('program', progId, mdTab);
        return;
      }
      const openCardMdBtn = e.target.closest('[data-open-card-md]');
      if (openCardMdBtn) {
        e.preventDefault();
        const cardId = openCardMdBtn.getAttribute('data-open-card-md');
        const mdTab = openCardMdBtn.getAttribute('data-md-tab') || 'overview';
        openRewardMiniDashboard('card', cardId, mdTab);
        return;
      }
      const mdSwitchTabBtn = e.target.closest('[data-md-switch-tab]');
      if (mdSwitchTabBtn) {
        e.preventDefault();
        activeMiniDashboardState.tab = mdSwitchTabBtn.getAttribute('data-md-switch-tab') || 'overview';
        renderRewardMiniDashboard();
        return;
      }
      const mdEditProgBtn = e.target.closest('[data-md-edit-prog]');
      if (mdEditProgBtn) {
        e.preventDefault();
        const prog = state.rewards.programs.find(p => p.id === mdEditProgBtn.getAttribute('data-md-edit-prog'));
        if (prog) {
          closeModal('modal-reward-mini-dashboard');
          openRewardProgramModal(prog);
        }
        return;
      }
      const mdEditCardBtn = e.target.closest('[data-md-edit-card]');
      if (mdEditCardBtn) {
        e.preventDefault();
        const card = state.rewards.cards.find(c => c.id === mdEditCardBtn.getAttribute('data-md-edit-card'));
        if (card) {
          closeModal('modal-reward-mini-dashboard');
          openRewardCardModal(card);
        }
        return;
      }
      const mdEditCertBtn = e.target.closest('[data-md-edit-cert]');
      if (mdEditCertBtn) {
        e.preventDefault();
        const cert = state.rewards.certificates.find(c => c.id === mdEditCertBtn.getAttribute('data-md-edit-cert'));
        if (cert) {
          closeModal('modal-reward-mini-dashboard');
          openRewardCertModal(cert);
        }
        return;
      }

      // Quick "+ Add / Link Card" or "+ Add Perk" directly from a Loyalty Program card or Mini-Dashboard
      const addCardForProgBtn = e.target.closest('[data-add-card-for-prog]');
      if (addCardForProgBtn) {
        e.preventDefault();
        closeModal('modal-reward-mini-dashboard');
        openRewardCardModal(null, addCardForProgBtn.getAttribute('data-add-card-for-prog'));
        return;
      }
      const addCertForProgBtn = e.target.closest('[data-add-cert-for-prog]');
      if (addCertForProgBtn) {
        e.preventDefault();
        closeModal('modal-reward-mini-dashboard');
        openRewardCertModal(null, addCertForProgBtn.getAttribute('data-add-cert-for-prog'));
        return;
      }
      const autoIntCardBtn = e.target.closest('[data-auto-integrate-card]');
      if (autoIntCardBtn) {
        e.preventDefault();
        const cId = autoIntCardBtn.getAttribute('data-auto-integrate-card');
        const card = (state.rewards.cards || []).find(c => c.id === cId);
        if (card) {
          const added = integrateCardIntoEcosystem(card, { autoLinkProg: true, autoAddCerts: true });
          await saveRewardsState(
            added.length > 0
              ? `🔗 Synced ${card.name}: Created & linked ${added.join(' & ')}!`
              : `🔗 Linked ${card.name} to Loyalty Hub!`
          );
        }
        return;
      }

      // Database Auto-Fill Pickers & Filter Pills inside Modals
      const pickRcardDb = e.target.closest('[data-pick-rcard-db]');
      if (pickRcardDb) {
        e.preventDefault();
        const tpl = POPULAR_REWARD_TEMPLATES[Number(pickRcardDb.getAttribute('data-pick-rcard-db'))];
        if (tpl && tpl.data) applyCardDbTemplateToModal(tpl.data);
        return;
      }
      const pickRprogDb = e.target.closest('[data-pick-rprog-db]');
      if (pickRprogDb) {
        e.preventDefault();
        const tpl = POPULAR_REWARD_TEMPLATES[Number(pickRprogDb.getAttribute('data-pick-rprog-db'))];
        if (tpl && tpl.data) applyProgDbTemplateToModal(tpl.data);
        return;
      }
      const pickRcertDb = e.target.closest('[data-pick-rcert-db]');
      if (pickRcertDb) {
        e.preventDefault();
        const tpl = POPULAR_CERT_TEMPLATES[Number(pickRcertDb.getAttribute('data-pick-rcert-db'))];
        if (tpl) applyCertDbTemplateToModal(tpl);
        return;
      }

      const rcardIssBtn = e.target.closest('[data-rcard-db-issuer]');
      if (rcardIssBtn) {
        e.preventDefault();
        const iss = rcardIssBtn.getAttribute('data-rcard-db-issuer');
        document.querySelectorAll('#rcard-db-filter-pills [data-rcard-db-issuer]').forEach(b => {
          b.classList.toggle('active', b === rcardIssBtn);
        });
        const res = document.getElementById('rcard-db-results');
        if (res) res.style.display = 'flex';
        renderRcardDbResults((document.getElementById('rcard-db-search') || {}).value || '', iss);
        return;
      }

      const rprogCatBtn = e.target.closest('[data-rprog-db-cat]');
      if (rprogCatBtn) {
        e.preventDefault();
        const cat = rprogCatBtn.getAttribute('data-rprog-db-cat');
        document.querySelectorAll('#rprog-db-filter-pills [data-rprog-db-cat]').forEach(b => {
          b.classList.toggle('active', b === rprogCatBtn);
        });
        const res = document.getElementById('rprog-db-results');
        if (res) res.style.display = 'flex';
        renderRprogDbResults((document.getElementById('rprog-db-search') || {}).value || '', cat);
        return;
      }

      const tplFilterBtn = e.target.closest('[data-tpl-filter]');
      if (tplFilterBtn) {
        e.preventDefault();
        const f = tplFilterBtn.getAttribute('data-tpl-filter');
        document.querySelectorAll('#tpl-modal-filter-pills [data-tpl-filter]').forEach(b => {
          b.classList.toggle('active', b === tplFilterBtn);
        });
        renderRewardTemplatesModalContent((document.getElementById('tpl-modal-search') || {}).value || '', f);
        return;
      }

      if (e.target.closest('#btn-toggle-rcard-db-list')) {
        e.preventDefault();
        const res = document.getElementById('rcard-db-results');
        if (res) res.style.display = res.style.display === 'none' ? 'flex' : 'none';
        return;
      }
      if (e.target.closest('#btn-toggle-rprog-db-list')) {
        e.preventDefault();
        const res = document.getElementById('rprog-db-results');
        if (res) res.style.display = res.style.display === 'none' ? 'flex' : 'none';
        return;
      }
      if (e.target.closest('#btn-toggle-rcert-db-list')) {
        e.preventDefault();
        const res = document.getElementById('rcert-db-results');
        if (res) res.style.display = res.style.display === 'none' ? 'flex' : 'none';
        return;
      }

      // Clear custom card image button
      if (e.target.closest('#btn-rcard-clear-image')) {
        e.preventDefault();
        const urlEl = document.getElementById('rcard-image-url');
        if (urlEl) urlEl.value = '';
        updateRcardArtPreview();
        showToast('Restored built-in card graphic');
        return;
      }

      // Quick Rewards Sidebar Button & Glance Widget
      if (e.target.closest('#nav-btn-quick-rewards, #sidebar-quick-rewards-widget, #sidebar-qr-open-link')) {
        e.preventDefault();
        openQuickRewardsModal();
        return;
      }
      if (e.target.closest('#btn-open-ai-trip-advisor')) {
        e.preventDefault();
        state.rewardsTab = 'advisor';
        switchView('rewards');
        renderAll();
        setTimeout(() => runAiTripAnalysis(), 50);
        return;
      }
      if (e.target.closest('#btn-qr-open-full-hub')) {
        e.preventDefault();
        closeModal('modal-quick-rewards');
        switchView('rewards');
        return;
      }
      if (e.target.closest('#btn-qr-add-card')) {
        e.preventDefault();
        closeModal('modal-quick-rewards');
        openRewardCardModal(null);
        return;
      }
      if (e.target.closest('#btn-qr-add-prog')) {
        e.preventDefault();
        closeModal('modal-quick-rewards');
        openRewardProgramModal(null);
        return;
      }
      if (e.target.closest('#btn-qr-add-cert')) {
        e.preventDefault();
        closeModal('modal-quick-rewards');
        openRewardCertModal(null);
        return;
      }
      if (e.target.closest('#btn-qr-update-all')) {
        e.preventDefault();
        closeModal('modal-quick-rewards');
        openUpdateAllRewardsModal();
        return;
      }
      const qrEditCardBtn = e.target.closest('[data-qr-edit-card]');
      if (qrEditCardBtn) {
        e.preventDefault();
        const card = state.rewards.cards.find(c => c.id === qrEditCardBtn.getAttribute('data-qr-edit-card'));
        if (card) {
          closeModal('modal-quick-rewards');
          openRewardCardModal(card);
        }
        return;
      }
      const qrEditProgBtn = e.target.closest('[data-qr-edit-prog]');
      if (qrEditProgBtn) {
        e.preventDefault();
        const prog = state.rewards.programs.find(p => p.id === qrEditProgBtn.getAttribute('data-qr-edit-prog'));
        if (prog) {
          closeModal('modal-quick-rewards');
          openRewardProgramModal(prog);
        }
        return;
      }

      // Reminders Hub Filter Chips & Collapse Toggle
      const remFilterBtn = e.target.closest('[data-rem-filter]');
      if (remFilterBtn) {
        e.preventDefault();
        activeRemindersFilter = remFilterBtn.getAttribute('data-rem-filter') || 'all';
        renderRewardsRemindersHub();
        return;
      }
      if (e.target.closest('#btn-toggle-reminders-body')) {
        e.preventDefault();
        const body = document.getElementById('rewards-reminders-body');
        if (body) body.style.display = body.style.display === 'none' ? 'block' : 'none';
        return;
      }

      // 1-Click Manual Reset Credit Back to Full Amount ("↺ Reset to $300")
      const resetNowBtn = e.target.closest('[data-reset-now-card-credit]');
      if (resetNowBtn) {
        e.preventDefault();
        const cardId = resetNowBtn.getAttribute('data-reset-now-card-credit');
        const idx = Number(resetNowBtn.getAttribute('data-credit-idx'));
        const card = state.rewards.cards.find(c => c.id === cardId);
        if (card && Array.isArray(card.credits) && card.credits[idx]) {
          const cr = card.credits[idx];
          const tot = Number(cr.total_usd ?? cr.amount ?? 0);
          cr.used_usd = 0;
          cr.used = false;
          const label = cr.name || cr.label || 'Credit';
          await saveRewardsState(`↺ Reset "${label}" — Full ${fmtUsd(tot)} Reward Available again!`);
        }
        return;
      }

      // Visual Credits Repeater Buttons inside Add/Edit Credit Card Modal
      if (e.target.closest('#btn-rcard-add-credit-row')) {
        e.preventDefault();
        addRcardCreditVisualRow('', 100, 0);
        return;
      }
      const vcredDelBtn = e.target.closest('.vcred-del-btn');
      if (vcredDelBtn) {
        e.preventDefault();
        const row = vcredDelBtn.closest('.visual-credit-editor-row');
        if (row) row.remove();
        return;
      }
      const vcredMaxBtn = e.target.closest('.vcred-max-btn');
      if (vcredMaxBtn) {
        e.preventDefault();
        const row = vcredMaxBtn.closest('.visual-credit-editor-row');
        if (row) {
          const totEl = row.querySelector('.vcred-total');
          const usedEl = row.querySelector('.vcred-used');
          const badge = row.querySelector('.vcred-avail-badge');
          if (totEl && usedEl) usedEl.value = totEl.value;
          if (badge) {
            badge.textContent = '$0.00 Avail';
            badge.classList.add('zero');
          }
        }
        return;
      }
      const vcredZeroBtn = e.target.closest('.vcred-zero-btn');
      if (vcredZeroBtn) {
        e.preventDefault();
        const row = vcredZeroBtn.closest('.visual-credit-editor-row');
        if (row) {
          const totEl = row.querySelector('.vcred-total');
          const usedEl = row.querySelector('.vcred-used');
          const badge = row.querySelector('.vcred-avail-badge');
          if (usedEl) usedEl.value = 0;
          if (badge && totEl) {
            badge.textContent = `${fmtUsd(Number(totEl.value) || 0)} Avail`;
            badge.classList.remove('zero');
          }
        }
        return;
      }

      if (e.target.closest('#btn-open-add-card, #btn-card-add-new-top, #btn-card-add-new, #btn-empty-card-add')) {
        e.preventDefault();
        openRewardCardModal(null);
        return;
      }
      const editRcardBtn = e.target.closest('[data-edit-rcard]');
      if (editRcardBtn) {
        e.preventDefault();
        const card = state.rewards.cards.find(c => c.id === editRcardBtn.getAttribute('data-edit-rcard'));
        if (card) openRewardCardModal(card);
        return;
      }
      const delRcardBtn = e.target.closest('[data-del-rcard]');
      if (delRcardBtn) {
        e.preventDefault();
        const id = delRcardBtn.getAttribute('data-del-rcard');
        const card = state.rewards.cards.find(c => c.id === id);
        const name = card ? card.name : 'this credit card';
        const ok = await confirmDelete({
          title: 'Delete Travel Credit Card',
          message: `Are you sure you want to remove "${name}" from your wallet?`,
          extra: 'Its annual fee, sign-up bonus tracker, and statement credits will be removed.'
        });
        if (!ok) return;
        recordDeletedRewardId(id);
        state.rewards.cards = state.rewards.cards.filter(c => c.id !== id);
        await saveRewardsState(`Removed ${name} from wallet`);
        return;
      }

      if (e.target.closest('#btn-open-add-redemption, #btn-redemption-pane-add')) {
        e.preventDefault();
        openRewardRedemptionModal(null);
        return;
      }
      if (e.target.closest('#btn-calc-log-redemption')) {
        e.preventDefault();
        openRewardRedemptionModal(null, '', true);
        return;
      }
      const quickRedeemBtn = e.target.closest('[data-quick-redeem-prog]');
      if (quickRedeemBtn) {
        e.preventDefault();
        closeModal('modal-reward-mini-dashboard');
        openRewardRedemptionModal(null, quickRedeemBtn.getAttribute('data-quick-redeem-prog'));
        return;
      }
      const editRredBtn = e.target.closest('[data-edit-rred]');
      if (editRredBtn) {
        e.preventDefault();
        const red = state.rewards.redemptions.find(r => r.id === editRredBtn.getAttribute('data-edit-rred'));
        if (red) openRewardRedemptionModal(red);
        return;
      }
      const delRredBtn = e.target.closest('[data-del-rred]');
      if (delRredBtn) {
        e.preventDefault();
        const id = delRredBtn.getAttribute('data-del-rred');
        const red = state.rewards.redemptions.find(r => r.id === id);
        const title = red ? red.title : 'this redemption';
        const ok = await confirmDelete({
          title: 'Delete Redemption Record',
          message: `Are you sure you want to delete "${title}"?`,
          extra: 'The calculated cents-per-point ROI value for this redemption will be removed.'
        });
        if (!ok) return;
        state.rewards.redemptions = state.rewards.redemptions.filter(r => r.id !== id);
        await saveRewardsState(`Deleted redemption "${title}"`);
        return;
      }

      // Rewards Templates & Export buttons
      if (e.target.closest('#btn-open-reward-templates, #btn-prog-open-templates, #btn-cards-open-templates, #btn-empty-prog-tpl, #btn-empty-card-tpl')) {
        e.preventDefault();
        openRewardTemplatesModal();
        return;
      }
      const addTplBtn = e.target.closest('[data-add-reward-tpl]');
      if (addTplBtn) {
        e.preventDefault();
        const tpl = POPULAR_REWARD_TEMPLATES[Number(addTplBtn.getAttribute('data-add-reward-tpl'))];
        if (tpl) {
          const clone = JSON.parse(JSON.stringify(tpl.data));
          clone.id = 'tpl_' + Math.random().toString(36).slice(2, 9);
          let extraMsg = '';
          if (tpl.kind === 'card') {
            const synced = integrateCardIntoEcosystem(clone, { autoLinkProg: true, autoAddCerts: true });
            state.rewards.cards.unshift(clone);
            state.rewardsTab = 'programs';
            if (synced.length > 0) extraMsg = ` + Auto-linked ${synced.join(' & ')}`;
          } else if (tpl.kind === 'program') {
            state.rewards.programs.unshift(clone);
            state.rewardsTab = 'programs';
          } else if (tpl.kind === 'cert') {
            state.rewards.certificates.unshift(clone);
            state.rewardsTab = 'programs';
          }
          closeModal('modal-reward-templates');
          await saveRewardsState(`⚡ Added ${tpl.title}${extraMsg} to your Unified Loyalty Hub!`);
        }
        return;
      }
      if (e.target.closest('#btn-rewards-reset-defaults')) {
        e.preventDefault();
        const ok = await confirmDelete({
          title: 'Restore Sample Rewards Lineup',
          message: 'Restore the pre-built sample loyalty programs, cards, certificates, and redemptions?',
          extra: 'Your current reward entries will be replaced with the default creator lineup.',
          confirmText: 'Restore Defaults'
        });
        if (!ok) return;
        state.rewards = getDefaultRewardsData();
        closeModal('modal-reward-templates');
        await saveRewardsState('Restored full sample Rewards & Loyalty lineup');
        return;
      }
      if (e.target.closest('#btn-rewards-clear-all')) {
        e.preventDefault();
        const ok = await confirmDelete({
          title: 'Clear All Reward Entries',
          message: 'Are you sure you want to clear all loyalty programs, cards, certificates, and redemptions?',
          extra: 'This will leave your Rewards Command Center completely empty so you can start from scratch.',
          confirmText: 'Clear All'
        });
        if (!ok) return;
        state.rewards = { programs: [], certificates: [], cards: [], redemptions: [] };
        closeModal('modal-reward-templates');
        await saveRewardsState('Cleared sample rewards — ready for your custom entries!');
        return;
      }
      if (e.target.closest('#btn-export-rewards-csv')) {
        e.preventDefault();
        triggerRewardsCsvExport();
        return;
      }

      // Topbar Help button
      if (e.target.closest('#btn-topbar-help')) {
        e.preventDefault();
        switchView('help');
        return;
      }

      // Admin Sub-Navigation Tabs
      const adminTabBtn = e.target.closest('#admin-subnav [data-admin-tab]');
      if (adminTabBtn) {
        e.preventDefault();
        state.adminTab = adminTabBtn.getAttribute('data-admin-tab');
        renderAdminWorkspace();
        return;
      }

      // Admin Workspace buttons
      if (e.target.closest('#btn-admin-add-category')) {
        e.preventDefault();
        openAdminTaxCategoryModal(null);
        return;
      }

      const editTaxCatBtn = e.target.closest('[data-admin-edit-taxcat]');
      if (editTaxCatBtn) {
        e.preventDefault();
        const catName = editTaxCatBtn.getAttribute('data-admin-edit-taxcat');
        const cat = getTaxCategories().find(c => c.name === catName);
        if (cat) openAdminTaxCategoryModal(cat);
        return;
      }

      const delTaxCatBtn = e.target.closest('[data-admin-delete-taxcat]');
      if (delTaxCatBtn) {
        e.preventDefault();
        const catName = delTaxCatBtn.getAttribute('data-admin-delete-taxcat');
        const cats = getTaxCategories();
        if (cats.length <= 1) {
          showToast('You must keep at least 1 active tax category');
          return;
        }
        const usageCount = (state.expenses || []).filter(exp => exp.category === catName).length;
        const extraMsg = usageCount > 0
          ? `⚠️ ${usageCount} existing expense(s) currently use this category. Their logged category text will remain preserved.`
          : 'This category will be removed from the + Add Expense modal and filter chips.';

        const ok = await confirmDelete({
          title: 'Delete Tax Category',
          message: `Are you sure you want to remove the "${catName}" tax category?`,
          extra: extraMsg,
          confirmText: 'Delete Category'
        });
        if (!ok) return;

        const nextList = cats.filter(c => c.name !== catName);
        await saveTaxCategoriesList(nextList, `Deleted tax category "${catName}"`);
        return;
      }

      if (e.target.closest('#btn-admin-reset-categories')) {
        e.preventDefault();
        const ok = await confirmDelete({
          title: 'Restore Default Tax Categories',
          message: 'Reset your tax categories back to the 6 default creator production categories?',
          extra: 'Hotels, Meals, Flights, Gear Rentals, Permits, and Crew categories will be restored.',
          confirmText: 'Restore Defaults'
        });
        if (!ok) return;
        await saveTaxCategoriesList(DEFAULT_TAX_CATEGORIES, 'Restored default tax categories lineup');
        return;
      }

      if (e.target.closest('#btn-admin-save-general-settings')) {
        e.preventDefault();
        const newChan = (document.getElementById('admin-setting-channel-name') || {}).value || 'Wander Wallet';
        const newMeal = (document.getElementById('admin-setting-meal-rate') || {}).value || '100';
        state.settings.channel_name = newChan;
        state.settings.meal_deduction_rate = newMeal;

        const updated = await apiRequest('/api/settings', {
          method: 'PUT',
          body: JSON.stringify({
            channel_name: newChan,
            meal_deduction_rate: newMeal
          })
        });
        if (updated) applyBootstrapData(updated);
        renderTaxView();
        renderAdminWorkspace();
        showToast('Saved workspace administration rules!');
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
        const targetModal = closeBtn.getAttribute('data-close-modal');
        if (targetModal === 'modal-confirm-delete' && activeDeleteResolver) {
          activeDeleteResolver(false);
          activeDeleteResolver = null;
        }
        closeModal(targetModal);
        return;
      }

      // Delete confirmation action buttons
      if (e.target.closest('#btn-confirm-delete-btn')) {
        e.preventDefault();
        if (activeDeleteResolver) {
          activeDeleteResolver(true);
          activeDeleteResolver = null;
        }
        closeModal('modal-confirm-delete');
        return;
      }
      if (e.target.closest('#btn-confirm-delete-cancel')) {
        e.preventDefault();
        if (activeDeleteResolver) {
          activeDeleteResolver(false);
          activeDeleteResolver = null;
        }
        closeModal('modal-confirm-delete');
        return;
      }

      // Dismiss confirmation modal on backdrop click
      if (e.target.classList && e.target.classList.contains('modal-backdrop') && e.target.id === 'modal-confirm-delete') {
        if (activeDeleteResolver) {
          activeDeleteResolver(false);
          activeDeleteResolver = null;
        }
        closeModal('modal-confirm-delete');
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
        const exp = state.expenses.find(x => x.id === expId);
        const title = exp ? `${exp.title} (${fmtUsd(exp.amount_usd)})` : 'this expense entry';
        const ok = await confirmDelete({
          title: 'Delete Road Expense',
          message: `Are you sure you want to delete "${title}"?`,
          extra: 'Its amount will be removed from trip spending, category analytics, and Schedule C tax deductions.'
        });
        if (!ok) return;
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
        const tr = state.trips.find(x => x.id === tripId);
        const name = tr ? tr.name : 'this production trip';
        const linkedExps = state.expenses.filter(x => x.trip_id === tripId).length;
        const linkedRevs = state.revenues.filter(x => x.trip_id === tripId).length;
        const extraNote = (linkedExps > 0 || linkedRevs > 0)
          ? `⚠️ Deleting this trip will also remove its ${linkedExps} logged expense(s) and ${linkedRevs} revenue item(s).`
          : 'This action cannot be undone.';
        const ok = await confirmDelete({
          title: 'Delete Production Trip',
          message: `Are you sure you want to delete "${name}"?`,
          extra: extraNote
        });
        if (!ok) return;
        const updated = await apiRequest(`/api/trips/${encodeURIComponent(tripId)}`, { method: 'DELETE' });
        if (updated) applyBootstrapData(updated);
        showToast(`Deleted trip "${name}"`);
        return;
      }

      // Delete Revenue
      const delRevBtn = e.target.closest('[data-delete-revenue]');
      if (delRevBtn) {
        e.preventDefault();
        const revId = delRevBtn.getAttribute('data-delete-revenue');
        const rev = state.revenues.find(x => x.id === revId);
        const title = rev ? `${rev.title} (${fmtUsd(rev.amount_usd)})` : 'this revenue entry';
        const ok = await confirmDelete({
          title: 'Delete Revenue Record',
          message: `Are you sure you want to delete "${title}"?`,
          extra: 'Its amount will be removed from your gross creator revenue and trip ROI calculation.'
        });
        if (!ok) return;
        const updated = await apiRequest(`/api/revenues/${encodeURIComponent(revId)}`, { method: 'DELETE' });
        if (updated) applyBootstrapData(updated);
        showToast('Revenue item removed');
      }
    });

    // Close confirmation dialog on Escape key & handle Enter/Escape inside Quick Points Input
    document.addEventListener('keydown', async e => {
      const t = e.target;
      if (t && t.hasAttribute && t.hasAttribute('data-qp-input')) {
        if (e.key === 'Enter') {
          e.preventDefault();
          const progId = t.getAttribute('data-qp-input');
          const prog = (state.rewards.programs || []).find(p => p.id === progId);
          if (prog) {
            const val = Math.max(0, Math.round(Number(t.value) || 0));
            prog.points = val;
            activeQuickBalanceProgId = null;
            await saveRewardsState(`✓ Updated ${prog.name} balance to ${val.toLocaleString('en-US')} pts!`);
          }
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          activeQuickBalanceProgId = null;
          renderRewardsDashboard();
          return;
        }
      }

      if (t && t.hasAttribute && (t.hasAttribute('data-cf-edit-label') || t.hasAttribute('data-cf-edit-val'))) {
        if (e.key === 'Enter') {
          e.preventDefault();
          const row = t.closest('[data-cf-edit-row]');
          const saveBtn = row ? row.querySelector('[data-save-cf-edit]') : null;
          if (saveBtn) saveBtn.click();
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          activeEditingCustomFieldKey = null;
          renderRewardsDashboard();
          return;
        }
      }

      if (t && t.hasAttribute && (t.hasAttribute('data-cf-new-label') || t.hasAttribute('data-cf-new-val'))) {
        const ownerKey = t.getAttribute('data-cf-new-label') || t.getAttribute('data-cf-new-val');
        if (e.key === 'Enter') {
          e.preventDefault();
          const box = t.closest('[data-cf-adder-box]');
          const submitBtn = box ? box.querySelector('[data-add-cf-submit]') : document.querySelector(`[data-add-cf-submit="${ownerKey}"]`);
          if (submitBtn) submitBtn.click();
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          if (ownerKey) activeCustomFieldsDrawers[ownerKey] = false;
          renderRewardsDashboard();
          return;
        }
      }

      if (e.key === 'Escape') {
        const confirmModal = document.getElementById('modal-confirm-delete');
        if (confirmModal && confirmModal.classList.contains('open')) {
          e.preventDefault();
          if (activeDeleteResolver) {
            activeDeleteResolver(false);
            activeDeleteResolver = null;
          }
          closeModal('modal-confirm-delete');
        }
      }
    });

    // Double-click grab handle (⠿) to instantly pin any card/loyalty/perk or custom field to the top
    document.addEventListener('dblclick', async e => {
      const cfHandle = e.target.closest('[data-move-cf-top]');
      if (cfHandle) {
        e.preventDefault();
        e.stopPropagation();
        const ownerKey = cfHandle.getAttribute('data-move-cf-top');
        const idx = Number(cfHandle.getAttribute('data-move-cf-idx'));
        const { prog, card, fields } = resolveCustomFieldsTarget(ownerKey);
        if (fields.length > 1 && fields[idx]) {
          const [moved] = fields.splice(idx, 1);
          if (idx === 0) {
            fields.push(moved);
            syncCustomFieldsToItems(prog, card, fields);
            await saveRewardsState(`⬇ Moved "${moved.label}" to bottom`);
          } else {
            fields.unshift(moved);
            syncCustomFieldsToItems(prog, card, fields);
            await saveRewardsState(`⬆ Moved "${moved.label}" to top`);
          }
        }
        return;
      }

      const handle = e.target.closest('[data-move-reward-top]');
      if (!handle) return;
      e.preventDefault();
      e.stopPropagation();
      const kind = handle.getAttribute('data-move-reward-top');
      const id = handle.getAttribute('data-move-reward-id');
      if (!kind || !id) return;
      const listKey = kind === 'program' ? 'programs' : (kind === 'card' ? 'cards' : 'certificates');
      const arr = Array.isArray(state.rewards[listKey]) ? state.rewards[listKey] : [];
      const idx = arr.findIndex(x => x.id === id);
      if (idx > 0) {
        const [moved] = arr.splice(idx, 1);
        arr.unshift(moved);
        const label = moved.name || moved.title || 'Card';
        await saveRewardsState(`⬆ Pinned "${label}" to the top!`);
      } else if (idx === 0) {
        showToast('Already at the top of the list!');
      }
    });

    // Drag-and-Drop Reordering for Custom Checkbox Fields & Credit Cards, Loyalty Programs, Certificates/Perks
    let activeDraggedReward = null;
    let activeDraggedCustomField = null;

    document.addEventListener('dragstart', e => {
      // Do not start drag if user is dragging a slider or text input
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) {
        e.preventDefault();
        return;
      }
      // 1. Check if dragging an individual Custom Checkbox Field row inside a card
      const cfRow = e.target.closest('.reward-custom-check-row[data-drag-cf-owner]');
      if (cfRow) {
        e.stopPropagation();
        const ownerKey = cfRow.getAttribute('data-drag-cf-owner');
        const idx = Number(cfRow.getAttribute('data-drag-cf-idx'));
        activeDraggedCustomField = { ownerKey, idx };
        activeDraggedReward = null;
        cfRow.classList.add('dragging');
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
          try {
            e.dataTransfer.setData('text/plain', `cf:${ownerKey}:${idx}`);
          } catch (err) {}
        }
        return;
      }

      // 2. Otherwise check if dragging an entire Loyalty / Credit Card / Certificate tile
      const cardEl = e.target.closest('.reward-item-card[data-drag-reward-kind]');
      if (!cardEl) return;
      const kind = cardEl.getAttribute('data-drag-reward-kind');
      const id = cardEl.getAttribute('data-drag-reward-id');
      if (!kind || !id) return;
      activeDraggedReward = { kind, id };
      activeDraggedCustomField = null;
      cardEl.classList.add('dragging');
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        try {
          e.dataTransfer.setData('text/plain', `${kind}:${id}`);
        } catch (err) {}
      }
    });

    document.addEventListener('dragover', e => {
      if (activeDraggedCustomField) {
        const overCf = e.target.closest('.reward-custom-check-row[data-drag-cf-owner]');
        if (!overCf) return;
        const overOwner = overCf.getAttribute('data-drag-cf-owner');
        const overIdx = Number(overCf.getAttribute('data-drag-cf-idx'));
        if (overOwner !== activeDraggedCustomField.ownerKey || overIdx === activeDraggedCustomField.idx) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
        document.querySelectorAll('.reward-custom-check-row.drag-over').forEach(el => {
          if (el !== overCf) el.classList.remove('drag-over');
        });
        overCf.classList.add('drag-over');
        return;
      }

      if (!activeDraggedReward) return;
      const overCard = e.target.closest('.reward-item-card[data-drag-reward-kind]');
      if (!overCard) return;
      const overKind = overCard.getAttribute('data-drag-reward-kind');
      const overId = overCard.getAttribute('data-drag-reward-id');
      if (overKind !== activeDraggedReward.kind || overId === activeDraggedReward.id) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      document.querySelectorAll('.reward-item-card.drag-over').forEach(el => {
        if (el !== overCard) el.classList.remove('drag-over');
      });
      overCard.classList.add('drag-over');
    });

    document.addEventListener('dragleave', e => {
      if (activeDraggedCustomField) {
        const overCf = e.target.closest('.reward-custom-check-row[data-drag-cf-owner]');
        if (overCf && !overCf.contains(e.relatedTarget)) {
          overCf.classList.remove('drag-over');
        }
        return;
      }
      const overCard = e.target.closest('.reward-item-card[data-drag-reward-kind]');
      if (overCard && !overCard.contains(e.relatedTarget)) {
        overCard.classList.remove('drag-over');
      }
    });

    document.addEventListener('drop', async e => {
      if (activeDraggedCustomField) {
        const targetCf = e.target.closest('.reward-custom-check-row[data-drag-cf-owner]');
        document.querySelectorAll('.reward-custom-check-row.drag-over, .reward-custom-check-row.dragging').forEach(el => {
          el.classList.remove('drag-over', 'dragging');
        });
        const { ownerKey, idx } = activeDraggedCustomField;
        activeDraggedCustomField = null;
        if (!targetCf) return;
        const targetOwner = targetCf.getAttribute('data-drag-cf-owner');
        const targetIdx = Number(targetCf.getAttribute('data-drag-cf-idx'));
        if (targetOwner !== ownerKey || targetIdx === idx) return;
        e.preventDefault();
        e.stopPropagation();

        const { prog, card, fields } = resolveCustomFieldsTarget(ownerKey);
        if (!fields[idx] || !fields[targetIdx]) return;
        const [moved] = fields.splice(idx, 1);
        fields.splice(targetIdx, 0, moved);
        syncCustomFieldsToItems(prog, card, fields);
        await saveRewardsState(`✓ Moved "${moved.label}" to row #${targetIdx + 1}`);
        return;
      }

      if (!activeDraggedReward) return;
      const targetCard = e.target.closest('.reward-item-card[data-drag-reward-kind]');
      document.querySelectorAll('.reward-item-card.drag-over, .reward-item-card.dragging').forEach(el => {
        el.classList.remove('drag-over', 'dragging');
      });
      if (!targetCard) {
        activeDraggedReward = null;
        return;
      }
      const targetKind = targetCard.getAttribute('data-drag-reward-kind');
      const targetId = targetCard.getAttribute('data-drag-reward-id');
      const { kind, id } = activeDraggedReward;
      activeDraggedReward = null;
      if (targetKind !== kind || targetId === id) return;
      e.preventDefault();

      const listKey = kind === 'program' ? 'programs' : (kind === 'card' ? 'cards' : 'certificates');
      const arr = Array.isArray(state.rewards[listKey]) ? state.rewards[listKey] : [];
      const fromIdx = arr.findIndex(x => x.id === id);
      const toIdx = arr.findIndex(x => x.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return;

      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      const label = moved.name || moved.title || 'Card';
      await saveRewardsState(`✓ Moved "${label}" to position #${toIdx + 1}`);
    });

    document.addEventListener('dragend', () => {
      activeDraggedReward = null;
      activeDraggedCustomField = null;
      document.querySelectorAll('.reward-item-card.drag-over, .reward-item-card.dragging, .reward-custom-check-row.drag-over, .reward-custom-check-row.dragging').forEach(el => {
        el.classList.remove('drag-over', 'dragging');
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();

/* ---------- Show / hide password (eye toggle) ---------- */
(function initPasswordToggles() {
  const EYE = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  const EYE_OFF = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

  function enhance(input) {
    if (input.dataset.pwToggle) return;
    input.dataset.pwToggle = '1';
    const wrap = document.createElement('div');
    wrap.className = 'pw-toggle-wrap';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pw-toggle-btn';
    btn.setAttribute('aria-label', 'Show password');
    btn.title = 'Show password';
    btn.innerHTML = EYE;
    btn.addEventListener('click', e => {
      e.preventDefault();
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.innerHTML = show ? EYE_OFF : EYE;
      const label = show ? 'Hide password' : 'Show password';
      btn.setAttribute('aria-label', label);
      btn.title = label;
      btn.classList.toggle('active', show);
      input.focus();
    });
    wrap.appendChild(btn);
  }

  function run() {
    document.querySelectorAll('input[type="password"]').forEach(enhance);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
  // Re-hide passwords whenever a form is submitted, so they are never left visible
  document.addEventListener('submit', () => {
    document.querySelectorAll('.pw-toggle-wrap input').forEach(i => { i.type = 'password'; });
    document.querySelectorAll('.pw-toggle-btn').forEach(b => { b.classList.remove('active'); b.innerHTML = EYE; b.setAttribute('aria-label', 'Show password'); b.title = 'Show password'; });
  }, true);
})();

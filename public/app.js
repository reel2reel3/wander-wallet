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
    bank: { icon: '🏦', label: 'Transferable Bank Points', tag: 'positive' },
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
    if (memoryStore && Array.isArray(memoryStore.trips) && memoryStore.trips.length > 0) {
      if (!memoryStore.rewards || !Array.isArray(memoryStore.rewards.programs)) {
        memoryStore.rewards = getDefaultRewardsData();
      }
      return memoryStore;
    }
    const raw = safeStorageGet('wayfarer_backup_state');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.trips) && parsed.trips.length > 0) {
          if (!parsed.rewards || !Array.isArray(parsed.rewards.programs)) {
            parsed.rewards = getDefaultRewardsData();
          }
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
    if (!data) return;
    memoryStore = data;
    safeStorageSet('wayfarer_backup_state', JSON.stringify(data));
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
      store.rewards = {
        programs: Array.isArray(payload.programs) ? payload.programs : store.rewards.programs,
        certificates: Array.isArray(payload.certificates) ? payload.certificates : store.rewards.certificates,
        cards: Array.isArray(payload.cards) ? payload.cards : store.rewards.cards,
        redemptions: Array.isArray(payload.redemptions) ? payload.redemptions : store.rewards.redemptions
      };
    }
    store.user_modified = true;
    store.updated_at = Date.now();
    saveLocalStore(store);
    return store;
  }

  const SEED_TRIP_IDS = new Set(['trip-japan-2026', 'trip-iceland-2026', 'trip-alps-2026']);

  function hasLocalCustomData(store) {
    if (!store) return false;
    if (store.user_modified) return true;
    if (Array.isArray(store.trips) && store.trips.some(t => !SEED_TRIP_IDS.has(t.id))) {
      return true;
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

    // Check if local store has custom trips/items that were lost on server (e.g., Railway container redeploy)
    // or if local store was modified more recently than server
    const serverTripIds = new Set((serverData.trips || []).map(t => t.id));
    const missingLocalTrips = (localStore.trips || []).filter(t => !SEED_TRIP_IDS.has(t.id) && !serverTripIds.has(t.id));

    if (
      (localHasCustom && !serverModified) ||
      (localHasCustom && localUpdated > serverUpdated) ||
      missingLocalTrips.length > 0
    ) {
      // Merge any unique trips, expenses, revenues so nothing is ever lost
      const mergedTrips = [...(localStore.trips || [])];
      const seenTrips = new Set(mergedTrips.map(t => t.id));
      for (const st of (serverData.trips || [])) {
        if (!seenTrips.has(st.id)) {
          mergedTrips.push(st);
          seenTrips.add(st.id);
        }
      }

      const mergedExpenses = [...(localStore.expenses || [])];
      const seenExp = new Set(mergedExpenses.map(e => e.id));
      for (const se of (serverData.expenses || [])) {
        if (!seenExp.has(se.id) && seenTrips.has(se.trip_id)) {
          mergedExpenses.push(se);
          seenExp.add(se.id);
        }
      }

      const mergedRevenues = [...(localStore.revenues || [])];
      const seenRev = new Set(mergedRevenues.map(r => r.id));
      for (const sr of (serverData.revenues || [])) {
        if (!seenRev.has(sr.id) && seenTrips.has(sr.trip_id)) {
          mergedRevenues.push(sr);
          seenRev.add(sr.id);
        }
      }

      const syncPayload = {
        settings: localStore.settings || serverData.settings,
        trips: mergedTrips,
        expenses: mergedExpenses,
        revenues: mergedRevenues,
        rewards: (localStore.rewards && Array.isArray(localStore.rewards.programs))
          ? localStore.rewards
          : serverData.rewards
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
        if (boot) applyBootstrapData(boot);
        return;
      } catch (err) {
        // Fallback to local auth if server is offline
      }
    }

    // Local / standalone preview mode authentication
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
    {
      kind: 'card',
      title: 'Chase Sapphire Reserve®',
      subtitle: '$550 Fee • $300 Travel Credit • 3X Travel & Dining',
      data: {
        name: 'Chase Sapphire Reserve',
        issuer: 'Chase',
        ecosystem: 'Chase Ultimate Rewards',
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
          { id: 'c_csr_1', name: '$300 Annual Travel Credit', total_usd: 300, used_usd: 300 },
          { id: 'c_csr_2', name: '$120 Global Entry / TSA PreCheck', total_usd: 120, used_usd: 120 },
          { id: 'c_csr_3', name: '$180 DoorDash / Instacart Credits', total_usd: 180, used_usd: 60 }
        ]
      }
    },
    {
      kind: 'card',
      title: 'Chase Sapphire Preferred®',
      subtitle: '$95 Fee • $50 Hotel Credit • 3X Dining / 2X Travel',
      data: {
        name: 'Chase Sapphire Preferred',
        issuer: 'Chase',
        ecosystem: 'Chase Ultimate Rewards',
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
          { id: 'c_csp_1', name: '$50 Annual Chase Travel Hotel Credit', total_usd: 50, used_usd: 0 }
        ]
      }
    },
    {
      kind: 'card',
      title: 'Amex Business Platinum®',
      subtitle: '$695 Fee • $200 Airline + $400 Dell + $199 CLEAR • 5X Flights',
      data: {
        name: 'Amex Business Platinum',
        issuer: 'American Express',
        ecosystem: 'Amex Membership Rewards',
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
          { id: 'c_abp_1', name: '$200 Airline Incidentals Credit', total_usd: 200, used_usd: 200 },
          { id: 'c_abp_2', name: '$400 Dell Technologies Gear Credit', total_usd: 400, used_usd: 200 },
          { id: 'c_abp_3', name: '$199 CLEAR Plus Credit', total_usd: 199, used_usd: 199 },
          { id: 'c_abp_4', name: '$150 Adobe Creative Cloud Credit', total_usd: 150, used_usd: 150 }
        ]
      }
    },
    {
      kind: 'card',
      title: 'Amex Gold Card®',
      subtitle: '$325 Fee • $424 Dining/Uber/Resy Credits • 4X Dining',
      data: {
        name: 'Amex Gold Card',
        issuer: 'American Express',
        ecosystem: 'Amex Membership Rewards',
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
          { id: 'c_ag_1', name: '$120 Uber Cash ($10/mo)', total_usd: 120, used_usd: 100 },
          { id: 'c_ag_2', name: '$100 Resy Semi-Annual Dining Credit', total_usd: 100, used_usd: 100 },
          { id: 'c_ag_3', name: '$120 Dining Credit ($10/mo)', total_usd: 120, used_usd: 90 },
          { id: 'c_ag_4', name: '$84 Dunkin Credit ($7/mo)', total_usd: 84, used_usd: 42 }
        ]
      }
    },
    {
      kind: 'card',
      title: 'Capital One Venture X®',
      subtitle: '$395 Fee • $300 Travel Credit + 10k Anniversary Miles • 2X All',
      data: {
        name: 'Capital One Venture X',
        issuer: 'Capital One',
        ecosystem: 'Capital One Miles',
        annual_fee: 395,
        renewal_date: '2027-06-01',
        ftf: 'None ($0 Foreign Tx Fee)',
        multipliers: '2x Everything Everywhere • 10x Portal Hotels/Cars • 5x Portal Flights',
        best_for: '2X Catch-All Foreign Vendors, Permits, Guides & Gear Rentals',
        sub_active: false,
        sub_target_usd: 4000,
        sub_spent_manual_usd: 4000,
        sub_bonus_label: '75,000 Capital One Miles',
        sub_deadline: '2026-12-31',
        credits: [
          { id: 'c_vx_1', name: '$300 Annual Travel Credit', total_usd: 300, used_usd: 300 },
          { id: 'c_vx_2', name: '10,000 Anniversary Bonus Miles ($175 val)', total_usd: 175, used_usd: 175 }
        ]
      }
    },
    {
      kind: 'card',
      title: 'Amex Hilton Honors Aspire®',
      subtitle: '$550 Fee • Automatic Diamond • $400 Resort + $200 Flight + Free Night',
      data: {
        name: 'Amex Hilton Honors Aspire',
        issuer: 'American Express',
        ecosystem: 'Hilton Honors',
        annual_fee: 550,
        renewal_date: '2027-07-01',
        ftf: 'None ($0 Foreign Tx Fee)',
        multipliers: '14x Hilton Resorts/Hotels • 7x Flights/Car Rentals & US Dining • 3x Other',
        best_for: 'Hilton Luxury Stays + Automatic Top-Tier Diamond + Uncapped Free Night',
        sub_active: false,
        sub_target_usd: 6000,
        sub_spent_manual_usd: 6000,
        sub_bonus_label: '175,000 Hilton Honors pts',
        sub_deadline: '2026-12-31',
        credits: [
          { id: 'c_ha_1', name: '$400 Hilton Resort Credit ($200 semi-annual)', total_usd: 400, used_usd: 200 },
          { id: 'c_ha_2', name: '$200 Flight Credit ($50/quarter)', total_usd: 200, used_usd: 150 },
          { id: 'c_ha_3', name: '$199 CLEAR Plus Credit', total_usd: 199, used_usd: 199 }
        ]
      }
    },
    {
      kind: 'program',
      title: 'Bilt Rewards',
      subtitle: '1:1 Transfers to Hyatt, Alaska, Aeroplan, United & Avios',
      data: {
        name: 'Bilt Rewards',
        ecosystem: 'bank',
        status_tier: 'Platinum',
        member_id: 'BLT-7741',
        points: 85000,
        cpp: 2.1,
        qualifying_nights: 1,
        target_nights: 1,
        metric_label: 'Rent Day 2x Multiplier Active',
        expiration_policy: 'Never expires while account is open',
        transfer_partners: 'Hyatt 1:1, Alaska Airlines 1:1, Aeroplan 1:1, United 1:1, Flying Blue 1:1',
        notes: 'Earn points on rent + double points on the 1st of every month.'
      }
    },
    {
      kind: 'program',
      title: 'British Airways / Qatar Avios',
      subtitle: 'Oneworld Alliance • Qatar Qsuites & JAL Domestic Sweet Spots',
      data: {
        name: 'British Airways / Qatar Avios',
        ecosystem: 'airline',
        status_tier: 'Oneworld Emerald',
        member_id: 'AV-4410982',
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
      data: {
        name: 'Air France / KLM Flying Blue',
        ecosystem: 'airline',
        status_tier: 'Gold (SkyTeam Elite Plus)',
        member_id: 'FB-20948112',
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
      title: 'IHG One Rewards',
      subtitle: '4th Night Free on Award Stays • Kimpton & InterContinental',
      data: {
        name: 'IHG One Rewards',
        ecosystem: 'hotel',
        status_tier: 'Diamond Elite',
        member_id: 'IHG-6619042',
        points: 165000,
        cpp: 0.65,
        qualifying_nights: 44,
        target_nights: 70,
        metric_label: 'Qualifying Nights',
        expiration_policy: 'Never expires with Elite status',
        transfer_partners: 'Chase Ultimate Rewards 1:1, Bilt 1:1 (Best bought on 100% bonus sales)',
        notes: '4th Night Free on all point redemptions with IHG One Rewards Premier card.'
      }
    }
  ];

  function ensureRewardsStructure() {
    if (!state.rewards || typeof state.rewards !== 'object') {
      state.rewards = getDefaultRewardsData();
    }
    if (!Array.isArray(state.rewards.programs)) state.rewards.programs = [];
    if (!Array.isArray(state.rewards.certificates)) state.rewards.certificates = [];
    if (!Array.isArray(state.rewards.cards)) state.rewards.cards = [];
    if (!Array.isArray(state.rewards.redemptions)) state.rewards.redemptions = [];
  }

  function daysUntilDate(dateStr) {
    if (!dateStr) return 999;
    const target = new Date(dateStr + 'T00:00:00');
    if (isNaN(target.getTime())) return 999;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((target - today) / (1000 * 60 * 60 * 24));
  }

  async function saveRewardsState(toastMsg) {
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

  function renderRewardsDashboard() {
    ensureRewardsStructure();
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
            <span class="kpi-label">Statement Credits Used</span>
            <span class="kpi-tag ${metrics.totalCreditsUsed >= metrics.totalAnnualFees ? 'positive' : 'sky'}">
              vs ${fmtUsdCompact(metrics.totalAnnualFees)} Fees
            </span>
          </div>
          <div class="kpi-value tabular">${fmtUsdCompact(metrics.totalCreditsUsed)} <span style="font-size: 14px; color: var(--text-muted);">/ ${fmtUsdCompact(metrics.totalCreditsAvailable)}</span></div>
          <span class="kpi-subtext">${fmtUsdCompact(Math.max(0, metrics.totalCreditsAvailable - metrics.totalCreditsUsed))} in unused card credits left</span>
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
    const tabs = ['programs', 'certs', 'cards', 'matrix', 'redemptions'];
    document.querySelectorAll('.rewards-subnav [data-rewards-tab]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-rewards-tab') === state.rewardsTab);
    });
    for (const t of tabs) {
      const pane = document.getElementById(`rewards-pane-${t}`);
      if (pane) pane.style.display = t === state.rewardsTab ? 'block' : 'none';
    }

    renderRewardsProgramsTab();
    renderRewardsCertsTab();
    renderRewardsCardsTab();
    renderRewardsMatrixTab();
    renderRewardsRedemptionsTab();
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

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="panel-card" style="grid-column: 1 / -1; text-align: center; padding: 32px;">
          <div style="font-size: 15px; font-weight: 700; margin-bottom: 6px;">No loyalty programs in this category yet</div>
          <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 14px;">
            Add your transferable bank points (Chase, Amex, Capital One, Bilt), hotel programs (Hyatt, Marriott, Hilton), or airline miles.
          </div>
          <div style="display: flex; gap: 8px; justify-content: center;">
            <button type="button" class="btn btn-sm" id="btn-empty-prog-tpl">⚡ Add from Templates</button>
            <button type="button" class="btn btn-sm btn-primary" id="btn-empty-prog-add">+ Add Loyalty Program</button>
          </div>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(p => {
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

      return `
        <div class="reward-item-card color-coded" style="border-color: ${hexToRgba(cardColor, 0.65)}; background-image: linear-gradient(180deg, ${hexToRgba(cardColor, 0.09)} 0%, transparent 90px);">
          <div class="reward-card-banner" style="background: ${cardColor};"></div>
          <div class="reward-card-top">
            <div>
              <div style="display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <span class="reward-ecosystem-pill" style="background-color: ${hexToRgba(cardColor, 0.15)}; border-color: ${hexToRgba(cardColor, 0.65)}; color: var(--text-primary);">
                  <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${cardColor};"></span>
                  ${meta.icon} ${escapeHtml(meta.label)}
                </span>
                <button type="button" class="btn-color-edit-inline" data-quick-color-prog="${escapeHtml(p.id)}" title="Change category or card color">
                  ✏️
                </button>
              </div>
              <h4 style="font-size: 16px; font-weight: 700; margin-top: 6px; color: var(--text-primary);">${escapeHtml(p.name)}</h4>
            </div>
            <span class="kpi-tag" style="background-color: ${hexToRgba(cardColor, 0.14)}; border: 1px solid ${hexToRgba(cardColor, 0.45)}; color: var(--text-primary);">${escapeHtml(p.status_tier || 'Member')}</span>
          </div>

          <div class="reward-balance-box">
            <div>
              <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Point / Mile Balance</div>
              <div class="mono tabular" style="font-size: 22px; font-weight: 700; color: var(--text-primary);">
                ${pts.toLocaleString('en-US')} <span style="font-size: 12px; font-weight: 500; color: var(--text-muted);">pts</span>
              </div>
              <div style="font-size: 12px; color: var(--accent-primary); font-weight: 600;">
                Est. Value: ${fmtUsd(valUsd)} <span style="color: var(--text-muted); font-weight: 400;">(@ ${cpp.toFixed(2)}¢/pt)</span>
              </div>
            </div>
            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
              <div class="stepper-group">
                <button type="button" class="btn-stepper" data-step-rprog="${escapeHtml(p.id)}" data-delta="-5000" title="Subtract 5,000 pts">-5k</button>
                <button type="button" class="btn-stepper" data-step-rprog="${escapeHtml(p.id)}" data-delta="-1000" title="Subtract 1,000 pts">-1k</button>
                <button type="button" class="btn-stepper" data-step-rprog="${escapeHtml(p.id)}" data-delta="1000" title="Add 1,000 pts">+1k</button>
                <button type="button" class="btn-stepper" data-step-rprog="${escapeHtml(p.id)}" data-delta="5000" title="Add 5,000 pts">+5k</button>
              </div>
              ${p.member_id ? `
                <button type="button" class="btn btn-sm" style="padding: 2px 8px; font-size: 11px;" data-copy-member="${escapeHtml(p.member_id)}" title="Click to copy Member ID">
                  📋 ID: <span class="mono">${escapeHtml(p.member_id)}</span>
                </button>
              ` : ''}
            </div>
          </div>

          ${qTgt > 0 ? `
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; margin-bottom: 5px;">
                <span style="color: var(--text-secondary); font-weight: 600;">🎯 ${escapeHtml(metricLabel)}</span>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span class="mono" style="font-weight: 700;">${qCur.toLocaleString('en-US')} / ${qTgt.toLocaleString('en-US')} (${qPct}%)</span>
                  ${qTgt <= 365 ? `
                    <button type="button" class="btn-stepper" data-step-rnights="${escapeHtml(p.id)}" data-delta="-1" title="-1 Night">-</button>
                    <button type="button" class="btn-stepper" data-step-rnights="${escapeHtml(p.id)}" data-delta="1" title="+1 Night">+1</button>
                  ` : ''}
                </div>
              </div>
              <div class="progress-track">
                <div class="progress-fill" style="width: ${qPct}%; background-color: ${qPct >= 100 ? 'var(--accent-primary)' : cardColor};"></div>
              </div>
            </div>
          ` : ''}

          <div style="font-size: 12px; color: var(--text-secondary); display: flex; flex-direction: column; gap: 4px;">
            ${partners ? `<div>🔄 <strong>Partners:</strong> ${escapeHtml(partners)}</div>` : ''}
            <div>⏳ <strong>Expiration:</strong> ${escapeHtml(expPolicy)}</div>
            ${p.notes ? `<div style="color: var(--text-muted);">💡 ${escapeHtml(p.notes)}</div>` : ''}
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid var(--border-subtle); margin-top: auto;">
            <button type="button" class="btn btn-sm" data-quick-redeem-prog="${escapeHtml(p.name)}">✈️ Log Redemption</button>
            <div style="display: flex; gap: 6px;">
              <button type="button" class="btn btn-sm" data-edit-rprog="${escapeHtml(p.id)}">Edit</button>
              <button type="button" class="btn btn-sm btn-danger-ghost" data-del-rprog="${escapeHtml(p.id)}">✕</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
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
        <div class="reward-item-card color-coded" style="${isRedeemed ? 'opacity: 0.72;' : ''} border-color: ${hexToRgba(certColor, 0.65)}; background-image: linear-gradient(180deg, ${hexToRgba(certColor, 0.09)} 0%, transparent 90px);">
          <div class="reward-card-banner" style="background: ${certColor};"></div>
          <div class="reward-card-top">
            <div>
              <div style="display: inline-flex; align-items: center; gap: 6px;">
                <span class="reward-ecosystem-pill" style="background-color: ${hexToRgba(certColor, 0.15)}; border-color: ${hexToRgba(certColor, 0.65)}; color: var(--text-primary);">
                  <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${certColor};"></span>
                  🎟️ ${escapeHtml(c.type || 'Free Night Certificate')}
                </span>
                <button type="button" class="btn-color-edit-inline" data-quick-color-eco="${certEcoKey}" title="Change category color">✏️</button>
              </div>
              <h4 style="font-size: 15.5px; font-weight: 700; margin-top: 6px; color: var(--text-primary);">${escapeHtml(c.title)}</h4>
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
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                <div>
                  <div style="font-weight: 700; font-size: 15px; color: var(--text-primary);">🎯 ${escapeHtml(cardName)}</div>
                  <div style="font-size: 12px; color: var(--accent-primary); font-weight: 600;">Reward: ${escapeHtml(bonusLabel)}</div>
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
            Add your cards to track annual fees, statement credits ($300 travel credit, Uber cash, airline credits, Dell credits), and earning multipliers.
          </div>
          <div style="display: flex; gap: 8px; justify-content: center;">
            <button type="button" class="btn btn-sm" id="btn-empty-card-tpl">⚡ Add Card from Template</button>
            <button type="button" class="btn btn-sm btn-primary" id="btn-empty-card-add">+ Custom Credit Card</button>
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
        const tot = Number(cr.total_usd ?? cr.amount ?? 0);
        const used = cr.used_usd !== undefined ? Number(cr.used_usd) : (cr.used ? tot : 0);
        credTotal += tot;
        credUsed += used;
      }
      const netOffset = credUsed - fee;

      return `
        <div class="reward-item-card">
          <div class="reward-card-top">
            <div>
              <span class="reward-ecosystem-pill">💳 ${escapeHtml(c.issuer || 'Bank')} • ${escapeHtml(c.ecosystem || c.points_program || 'Rewards')}</span>
              <h4 style="font-size: 16px; font-weight: 700; margin-top: 6px; color: var(--text-primary);">${escapeHtml(cardName)}</h4>
            </div>
            <span class="kpi-tag ${netOffset >= 0 ? 'positive' : 'sky'}">
              ${netOffset >= 0 ? `✓ +${fmtUsdCompact(netOffset)} Net Keeper` : `${fmtUsdCompact(fee)}/yr Fee`}
            </span>
          </div>

          <div class="reward-balance-box">
            <div>
              <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Annual Fee &amp; Renewal</div>
              <div class="mono" style="font-size: 15px; font-weight: 700;">${fmtUsdCompact(fee)} / yr</div>
              <div style="font-size: 11.5px; color: var(--text-muted);">Renews: ${escapeHtml(c.renewal_date || c.renewal_month || 'Annual')} • ${escapeHtml(c.ftf || '$0 FX Fee')}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Credits Captured</div>
              <div class="mono" style="font-size: 16px; font-weight: 700; color: var(--accent-primary);">
                ${fmtUsdCompact(credUsed)} <span style="font-size: 12px; color: var(--text-muted);">/ ${fmtUsdCompact(credTotal)}</span>
              </div>
            </div>
          </div>

          <div style="font-size: 12px; color: var(--text-secondary); display: flex; flex-direction: column; gap: 4px;">
            <div>⚡ <strong>Multipliers:</strong> ${escapeHtml(c.multipliers || '1x–5x Travel')}</div>
            <div>🎯 <strong>Best Swipe For:</strong> ${escapeHtml(c.best_for || c.perks || 'General Travel')}</div>
          </div>

          ${credits.length > 0 ? `
            <div class="credit-checklist">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-muted);">
                Annual Statement Credits Checklist (Tap to Toggle Used)
              </div>
              ${credits.map((cr, idx) => {
                const label = cr.name || cr.label || 'Statement Credit';
                const tot = Number(cr.total_usd ?? cr.amount ?? 0);
                const used = cr.used_usd !== undefined ? Number(cr.used_usd) : (cr.used ? tot : 0);
                const isDone = tot > 0 && used >= tot;
                return `
                  <label class="credit-check-row ${isDone ? 'completed' : ''}" style="cursor: pointer;">
                    <span style="display: flex; align-items: center; gap: 8px;">
                      <input type="checkbox" data-toggle-card-credit="${escapeHtml(c.id)}" data-credit-idx="${idx}" ${isDone ? 'checked' : ''} />
                      <span style="${isDone ? 'text-decoration: line-through; color: var(--text-muted);' : 'font-weight: 600;'}">${escapeHtml(label)}</span>
                    </span>
                    <span class="mono" style="font-weight: 700; color: ${isDone ? 'var(--accent-primary)' : 'var(--accent-amber)'};">
                      ${fmtUsdCompact(used)} / ${fmtUsdCompact(tot)}
                    </span>
                  </label>
                `;
              }).join('')}
            </div>
          ` : ''}

          <div style="display: flex; justify-content: flex-end; gap: 6px; padding-top: 8px; border-top: 1px solid var(--border-subtle); margin-top: auto;">
            <button type="button" class="btn btn-sm" data-edit-rcard="${escapeHtml(c.id)}">Edit Card &amp; Credits</button>
            <button type="button" class="btn btn-sm btn-danger-ghost" data-del-rcard="${escapeHtml(c.id)}">✕</button>
          </div>
        </div>
      `;
    }).join('');
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

  // Modal Open & Save Handlers for Rewards
  function openRewardProgramModal(editProg = null) {
    const titleEl = document.getElementById('modal-reward-program-title');
    const scopeEcoRadio = document.getElementById('rprog-color-scope-eco');
    const scopeCardRadio = document.getElementById('rprog-color-scope-card');
    if (editProg) {
      if (titleEl) titleEl.textContent = 'Edit Loyalty Program';
      document.getElementById('rprog-id').value = editProg.id;
      document.getElementById('rprog-name').value = editProg.name || '';
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
      if (editProg.custom_color) {
        if (scopeCardRadio) scopeCardRadio.checked = true;
        syncRprogColorPickerUi(editProg.custom_color);
      } else {
        if (scopeEcoRadio) scopeEcoRadio.checked = true;
        syncRprogColorPickerUi(getEcosystemColor(editProg.ecosystem || 'bank'));
      }
    } else {
      if (titleEl) titleEl.textContent = 'Add Loyalty Program';
      document.getElementById('rprog-id').value = '';
      document.getElementById('rprog-name').value = '';
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
      if (scopeEcoRadio) scopeEcoRadio.checked = true;
      syncRprogColorPickerUi(getEcosystemColor('bank'));
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
    const pickedColor = resolveHexColor(
      (document.getElementById('rprog-color-input') || {}).value,
      getEcosystemColor(eco)
    );
    const scopeCard = (document.getElementById('rprog-color-scope-card') || {}).checked;

    const item = {
      id: id || ('prog-' + Date.now()),
      name,
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
      custom_color: scopeCard ? pickedColor : ''
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
    closeModal('modal-reward-program');
    state.rewardsTab = 'programs';
    await saveRewardsState(id ? `Updated ${name}` : `Added ${name} to Loyalty Programs!`);
  }

  function openRewardCertModal(editCert = null) {
    const titleEl = document.getElementById('modal-reward-cert-title');
    if (editCert) {
      if (titleEl) titleEl.textContent = 'Edit Certificate / Travel Perk';
      document.getElementById('rcert-id').value = editCert.id;
      document.getElementById('rcert-title').value = editCert.title || '';
      document.getElementById('rcert-type').value = editCert.type || 'Free Night Certificate';
      document.getElementById('rcert-program').value = editCert.program || '';
      document.getElementById('rcert-card').value = editCert.source_card || '';
      document.getElementById('rcert-expires').value = editCert.expires_date || editCert.expiration_date || '';
      document.getElementById('rcert-value').value = Number(editCert.est_value_usd ?? editCert.estimated_value_usd ?? 350);
      document.getElementById('rcert-status').value = editCert.status || 'available';
      document.getElementById('rcert-cap').value = editCert.cap_details || editCert.points_cap || '';
      document.getElementById('rcert-notes').value = editCert.notes || '';
    } else {
      if (titleEl) titleEl.textContent = 'Add Free Night Certificate / Travel Perk';
      document.getElementById('rcert-id').value = '';
      document.getElementById('rcert-title').value = '';
      document.getElementById('rcert-type').value = 'Free Night Certificate';
      document.getElementById('rcert-program').value = '';
      document.getElementById('rcert-card').value = '';
      const nextYear = new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10);
      document.getElementById('rcert-expires').value = nextYear;
      document.getElementById('rcert-value').value = '400';
      document.getElementById('rcert-status').value = 'available';
      document.getElementById('rcert-cap').value = '';
      document.getElementById('rcert-notes').value = '';
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
    const item = {
      id: id || ('cert-' + Date.now()),
      title,
      type: document.getElementById('rcert-type').value,
      program: document.getElementById('rcert-program').value.trim() || 'Loyalty Program',
      source_card: document.getElementById('rcert-card').value.trim(),
      expires_date: document.getElementById('rcert-expires').value,
      est_value_usd: Number(document.getElementById('rcert-value').value) || 0,
      status: document.getElementById('rcert-status').value,
      cap_details: document.getElementById('rcert-cap').value.trim(),
      notes: document.getElementById('rcert-notes').value.trim()
    };

    if (id) {
      state.rewards.certificates = state.rewards.certificates.map(c => (c.id === id ? item : c));
    } else {
      state.rewards.certificates.unshift(item);
    }
    closeModal('modal-reward-cert');
    state.rewardsTab = 'certs';
    await saveRewardsState(id ? `Updated "${title}"` : `Added "${title}" to Certificates Vault!`);
  }

  function openRewardCardModal(editCard = null) {
    const titleEl = document.getElementById('modal-reward-card-title');
    if (editCard) {
      if (titleEl) titleEl.textContent = 'Edit Travel Credit Card & Perks';
      document.getElementById('rcard-id').value = editCard.id;
      document.getElementById('rcard-name').value = editCard.name || editCard.card_name || '';
      document.getElementById('rcard-issuer').value = editCard.issuer || '';
      document.getElementById('rcard-ecosystem').value = editCard.ecosystem || editCard.points_program || '';
      document.getElementById('rcard-fee').value = Number(editCard.annual_fee || 0);
      document.getElementById('rcard-renewal').value = editCard.renewal_date || '';
      document.getElementById('rcard-ftf').value = editCard.ftf || 'None ($0 Foreign Tx Fee)';
      document.getElementById('rcard-multipliers').value = editCard.multipliers || '';
      document.getElementById('rcard-best-for').value = editCard.best_for || editCard.perks || '';
      document.getElementById('rcard-sub-active').checked = Boolean(editCard.sub_active);
      document.getElementById('rcard-sub-bonus').value = editCard.sub_bonus_label || editCard.sub_bonus_text || '';
      document.getElementById('rcard-sub-deadline').value = editCard.sub_deadline || '';
      document.getElementById('rcard-sub-target').value = Number(editCard.sub_target_usd ?? editCard.sub_spend_target ?? 4000);
      document.getElementById('rcard-sub-spent').value = Number(editCard.sub_spent_manual_usd ?? editCard.sub_base_spend ?? 0);

      const creditsLines = (Array.isArray(editCard.credits) ? editCard.credits : []).map(cr => {
        const nm = cr.name || cr.label || 'Credit';
        const tot = Number(cr.total_usd ?? cr.amount ?? 0);
        const used = cr.used_usd !== undefined ? Number(cr.used_usd) : (cr.used ? tot : 0);
        return `${nm} | ${tot} | ${used}`;
      });
      document.getElementById('rcard-credits-text').value = creditsLines.join('\n');
    } else {
      if (titleEl) titleEl.textContent = 'Add Travel Credit Card & Perks';
      document.getElementById('rcard-id').value = '';
      document.getElementById('rcard-name').value = '';
      document.getElementById('rcard-issuer').value = '';
      document.getElementById('rcard-ecosystem').value = '';
      document.getElementById('rcard-fee').value = '95';
      document.getElementById('rcard-renewal').value = new Date(Date.now() + 300 * 86400000).toISOString().slice(0, 10);
      document.getElementById('rcard-ftf').value = 'None ($0 Foreign Tx Fee)';
      document.getElementById('rcard-multipliers').value = '';
      document.getElementById('rcard-best-for').value = '';
      document.getElementById('rcard-sub-active').checked = false;
      document.getElementById('rcard-sub-bonus').value = '';
      document.getElementById('rcard-sub-deadline').value = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
      document.getElementById('rcard-sub-target').value = '4000';
      document.getElementById('rcard-sub-spent').value = '0';
      document.getElementById('rcard-credits-text').value = '$300 Annual Travel Credit | 300 | 0\n$100 Global Entry / TSA PreCheck | 100 | 100';
    }
    openModal('modal-reward-card');
  }

  async function saveRewardCardFromModal() {
    const name = document.getElementById('rcard-name').value.trim();
    if (!name) {
      showToast('Please enter a credit card name');
      return;
    }
    const id = document.getElementById('rcard-id').value;
    const rawCredits = document.getElementById('rcard-credits-text').value
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);

    const parsedCredits = rawCredits.map((line, idx) => {
      const parts = line.split('|').map(s => s.trim());
      const cName = parts[0] || `Perk ${idx + 1}`;
      const tot = Number((parts[1] || '0').replace(/[^0-9.]/g, '')) || 0;
      const used = parts[2] !== undefined
        ? (Number(parts[2].replace(/[^0-9.]/g, '')) || 0)
        : 0;
      return {
        id: `cred-${Date.now()}-${idx}`,
        name: cName,
        total_usd: tot,
        used_usd: Math.min(tot, used)
      };
    });

    const item = {
      id: id || ('card-' + Date.now()),
      name,
      issuer: document.getElementById('rcard-issuer').value.trim() || 'Bank',
      ecosystem: document.getElementById('rcard-ecosystem').value.trim() || 'Travel Rewards',
      annual_fee: Number(document.getElementById('rcard-fee').value) || 0,
      renewal_date: document.getElementById('rcard-renewal').value,
      ftf: document.getElementById('rcard-ftf').value.trim() || 'None ($0 Foreign Tx Fee)',
      multipliers: document.getElementById('rcard-multipliers').value.trim(),
      best_for: document.getElementById('rcard-best-for').value.trim(),
      sub_active: document.getElementById('rcard-sub-active').checked,
      sub_bonus_label: document.getElementById('rcard-sub-bonus').value.trim(),
      sub_deadline: document.getElementById('rcard-sub-deadline').value,
      sub_target_usd: Number(document.getElementById('rcard-sub-target').value) || 0,
      sub_spent_manual_usd: Number(document.getElementById('rcard-sub-spent').value) || 0,
      credits: parsedCredits
    };

    if (id) {
      state.rewards.cards = state.rewards.cards.map(c => (c.id === id ? item : c));
    } else {
      state.rewards.cards.unshift(item);
    }
    closeModal('modal-reward-card');
    state.rewardsTab = 'cards';
    await saveRewardsState(id ? `Updated ${name}` : `Added ${name} to Credit Card Wallet!`);
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

  function openRewardTemplatesModal() {
    const cardsList = document.getElementById('template-cards-list');
    const progsList = document.getElementById('template-programs-list');

    if (cardsList) {
      cardsList.innerHTML = POPULAR_REWARD_TEMPLATES
        .map((tpl, idx) => ({ tpl, idx }))
        .filter(x => x.tpl.kind === 'card')
        .map(({ tpl, idx }) => `
          <div class="template-picker-card">
            <div>
              <div style="font-weight: 700; font-size: 13.5px; color: var(--text-primary);">${escapeHtml(tpl.title)}</div>
              <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">${escapeHtml(tpl.subtitle)}</div>
            </div>
            <button type="button" class="btn btn-sm btn-primary" data-add-reward-tpl="${idx}">+ Add Card to Wallet</button>
          </div>
        `).join('');
    }

    if (progsList) {
      progsList.innerHTML = POPULAR_REWARD_TEMPLATES
        .map((tpl, idx) => ({ tpl, idx }))
        .filter(x => x.tpl.kind === 'program')
        .map(({ tpl, idx }) => `
          <div class="template-picker-card">
            <div>
              <div style="font-weight: 700; font-size: 13.5px; color: var(--text-primary);">${escapeHtml(tpl.title)}</div>
              <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">${escapeHtml(tpl.subtitle)}</div>
            </div>
            <button type="button" class="btn btn-sm btn-primary" data-add-reward-tpl="${idx}">+ Add Program</button>
          </div>
        `).join('');
    }

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

    // Statement Credit Checkbox delegation
    document.addEventListener('change', async e => {
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

      // Quick +/- points stepper on Program Card
      const stepProgBtn = e.target.closest('[data-step-rprog]');
      if (stepProgBtn) {
        e.preventDefault();
        const progId = stepProgBtn.getAttribute('data-step-rprog');
        const delta = Number(stepProgBtn.getAttribute('data-delta')) || 0;
        const prog = state.rewards.programs.find(p => p.id === progId);
        if (prog) {
          const cur = Number(prog.points ?? prog.balance ?? 0);
          prog.points = Math.max(0, cur + delta);
          await saveRewardsState(`${prog.name}: ${prog.points.toLocaleString('en-US')} pts`);
        }
        return;
      }

      // Quick +/- Elite Nights stepper on Program Card
      const stepNightsBtn = e.target.closest('[data-step-rnights]');
      if (stepNightsBtn) {
        e.preventDefault();
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
          if (tpl.kind === 'card') {
            state.rewards.cards.unshift(clone);
            state.rewardsTab = 'cards';
          } else if (tpl.kind === 'program') {
            state.rewards.programs.unshift(clone);
            state.rewardsTab = 'programs';
          } else if (tpl.kind === 'cert') {
            state.rewards.certificates.unshift(clone);
            state.rewardsTab = 'certs';
          }
          closeModal('modal-reward-templates');
          await saveRewardsState(`Added ${tpl.title} to your Rewards Command Center!`);
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

    // Close confirmation dialog on Escape key
    document.addEventListener('keydown', e => {
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

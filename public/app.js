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
    } else if (url === '/api/rewards' && method === 'PUT') {
      store.rewards = {
        programs: Array.isArray(payload.programs) ? payload.programs : store.rewards.programs,
        certificates: Array.isArray(payload.certificates) ? payload.certificates : store.rewards.certificates,
        cards: Array.isArray(payload.cards) ? payload.cards : store.rewards.cards,
        redemptions: Array.isArray(payload.redemptions) ? payload.redemptions : store.rewards.redemptions
      };
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
    showToast('Security settings saved! Use 🔒 Lock App anytime to test your login screen.');
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
        showAuthGate(errBody.configured === false ? 'setup' : 'login', 'admin', '', currentGoogleClientId);
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
        if (c.card_name && !existingOpts.has(c.card_name)) {
          const opt = document.createElement('option');
          opt.value = c.card_name;
          opt.textContent = c.card_name;
          paySelect.appendChild(opt);
          existingOpts.add(c.card_name);
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
    const views = ['dashboard', 'trips', 'revenue', 'rewards', 'tax', 'help'];
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
      trips: 'Trips & Shoot Budgets',
      revenue: 'Sponsors & AdSense ROI',
      rewards: 'Rewards & Loyalty Command Center',
      tax: 'Tax & Accountant Export Hub',
      help: 'Help & Getting Started Guide'
    };
    const heading = document.getElementById('main-page-heading');
    if (heading) heading.textContent = titles[viewName] || 'Road Finance Dashboard';
    if (viewName === 'help') {
      renderWalkthroughStep(currentWtStep);
    }
    if (viewName === 'rewards') {
      renderRewardsDashboard();
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

  // ============================================================================
  // REWARDS & LOYALTY COMMAND CENTER
  // ============================================================================
  const TRANSFER_PARTNER_MATRIX = [
    {
      bank: 'Chase Ultimate Rewards',
      partner: 'World of Hyatt',
      type: 'Hotel',
      ratio: '1 : 1',
      speed: 'Instant',
      sweetSpot: 'Park Hyatt / Alila / Category 1-7 rooms at 2.1¢–4.0¢/pt value',
      tag: 'positive'
    },
    {
      bank: 'Chase Ultimate Rewards',
      partner: 'Air Canada Aeroplan',
      type: 'Airline (Star Alliance)',
      ratio: '1 : 1',
      speed: 'Instant',
      sweetSpot: 'ANA / Lufthansa / Swiss Business Class + 5,000-pt stopovers',
      tag: 'positive'
    },
    {
      bank: 'Chase Ultimate Rewards',
      partner: 'United MileagePlus',
      type: 'Airline (Star Alliance)',
      ratio: '1 : 1',
      speed: 'Instant',
      sweetSpot: 'No fuel surcharges + Excursionist Perk multi-city shoots',
      tag: 'sky'
    },
    {
      bank: 'Chase Ultimate Rewards',
      partner: 'Virgin Atlantic / British Airways / Iberia',
      type: 'Airline (SkyTeam / Oneworld)',
      ratio: '1 : 1',
      speed: 'Instant',
      sweetSpot: 'ANA First/Business via Virgin; frequent 30% transfer bonuses',
      tag: 'sky'
    },
    {
      bank: 'Amex Membership Rewards',
      partner: 'ANA Mileage Club',
      type: 'Airline (Star Alliance)',
      ratio: '1 : 1',
      speed: '24–48 Hours',
      sweetSpot: 'US to Tokyo Roundtrip Business Class from 105k–110k miles',
      tag: 'positive'
    },
    {
      bank: 'Amex Membership Rewards',
      partner: 'Air Canada Aeroplan',
      type: 'Airline (Star Alliance)',
      ratio: '1 : 1',
      speed: 'Instant',
      sweetSpot: '75k–87.5k one-way Transpacific or Transatlantic Business Class',
      tag: 'positive'
    },
    {
      bank: 'Amex Membership Rewards',
      partner: 'Air France / KLM Flying Blue',
      type: 'Airline (SkyTeam)',
      ratio: '1 : 1',
      speed: 'Instant',
      sweetSpot: '50k–60k Promo Rewards Business Class to Europe',
      tag: 'sky'
    },
    {
      bank: 'Amex Membership Rewards',
      partner: 'Hilton Honors',
      type: 'Hotel',
      ratio: '1 : 2',
      speed: 'Instant',
      sweetSpot: '1:2 base ratio (1:2.6 with bonus) + 5th Night Free on luxury resorts',
      tag: 'warning'
    },
    {
      bank: 'Amex Membership Rewards',
      partner: 'Delta SkyMiles',
      type: 'Airline (SkyTeam)',
      ratio: '1 : 1',
      speed: 'Instant',
      sweetSpot: 'Domestic flash sales + 15% TakeOff 15 cardholder discount',
      tag: 'sky'
    },
    {
      bank: 'Capital One Miles',
      partner: 'Air Canada Aeroplan / British Airways / Flying Blue',
      type: 'Airline',
      ratio: '1 : 1',
      speed: 'Instant',
      sweetSpot: 'Stack with Venture X 2X catch-all spend for Star Alliance & SkyTeam',
      tag: 'positive'
    },
    {
      bank: 'Capital One Miles',
      partner: 'Turkish Airlines Miles&Smiles / Wyndham',
      type: 'Airline / Hotel',
      ratio: '1 : 1',
      speed: 'Instant',
      sweetSpot: 'Star Alliance awards & Vacasa vacation rental properties',
      tag: 'sky'
    },
    {
      bank: 'Bilt Rewards',
      partner: 'World of Hyatt & Alaska Airlines Atmos',
      type: 'Hotel & Oneworld Airline',
      ratio: '1 : 1',
      speed: 'Instant',
      sweetSpot: '1:1 transfers to Hyatt & Alaska (JAL / Cathay / American redemptions)',
      tag: 'positive'
    },
    {
      bank: 'Citi ThankYou',
      partner: 'American Airlines / Qatar Avios / Choice Privileges (1:2)',
      type: 'Airline & Hotel',
      ratio: '1 : 1 / 1 : 2',
      speed: 'Instant',
      sweetSpot: 'Qatar Qsuites via Avios & Preferred Hotels / Nordic Choice properties',
      tag: 'sky'
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
      title: 'Chase Sapphire Preferred®',
      subtitle: '$95 Fee • $50 Hotel Credit • 3X Dining / 2X Travel',
      badge: 'Credit Card',
      data: {
        card_name: 'Chase Sapphire Preferred',
        issuer: 'Chase',
        annual_fee: 95,
        renewal_month: '2027-04',
        points_program: 'Chase Ultimate Rewards',
        multipliers: '3X Dining • 3X Online Grocery • 2X Travel • 10% Anniversary Boost',
        perks: 'Primary Rental Car CDW, 1:1 Point Transfers to Hyatt & United, $0 FX Fees',
        credits: [{ id: 'c_csp_1', label: '$50 Annual Chase Travel Hotel Credit', amount: 50, frequency: 'Annual', used: false }],
        sub_active: true,
        sub_bonus_text: '75,000 Ultimate Rewards pts',
        sub_spend_target: 4000,
        sub_base_spend: 0,
        sub_deadline: '2027-03-01'
      }
    },
    {
      kind: 'card',
      title: 'Amex Gold Card®',
      subtitle: '$325 Fee • $424 Dining/Uber/Resy/Dunkin Credits • 4X Dining',
      badge: 'Credit Card',
      data: {
        card_name: 'Amex Gold Card',
        issuer: 'American Express',
        annual_fee: 325,
        renewal_month: '2027-05',
        points_program: 'Amex Membership Rewards',
        multipliers: '4X Worldwide Restaurants • 4X US Supermarkets • 3X Flights Direct',
        perks: '$120 Uber Cash, $120 Dining Credit, $100 Resy Credit, $84 Dunkin Credit',
        credits: [
          { id: 'c_ag_1', label: '$120 Uber Cash ($10/mo)', amount: 120, frequency: 'Monthly', used: true },
          { id: 'c_ag_2', label: '$100 Resy Semi-Annual Dining Credit', amount: 100, frequency: 'Semi-Annual', used: true },
          { id: 'c_ag_3', label: '$120 Dining Credit ($10/mo)', amount: 120, frequency: 'Monthly', used: false },
          { id: 'c_ag_4', label: '$84 Dunkin Credit ($7/mo)', amount: 84, frequency: 'Monthly', used: false }
        ],
        sub_active: false,
        sub_bonus_text: '90,000 MR Points',
        sub_spend_target: 6000,
        sub_base_spend: 6000,
        sub_deadline: '2026-10-01'
      }
    },
    {
      kind: 'card',
      title: 'Marriott Bonvoy Brilliant® Amex',
      subtitle: '$650 Fee • $300 Dining Credit • 85k Free Night Award + Platinum Elite',
      badge: 'Hotel Card',
      data: {
        card_name: 'Marriott Bonvoy Brilliant Amex',
        issuer: 'American Express',
        annual_fee: 650,
        renewal_month: '2027-06',
        points_program: 'Marriott Bonvoy',
        multipliers: '6X Marriott • 3X Restaurants & Flights • 2X All Other',
        perks: 'Automatic Platinum Elite Status, 25 Elite Night Credits, 85,000-pt Free Night Award, Priority Pass',
        credits: [
          { id: 'c_mbb_1', label: '$300 Brilliant Worldwide Dining Credit ($25/mo)', amount: 300, frequency: 'Monthly', used: true },
          { id: 'c_mbb_2', label: '$100 Ritz-Carlton / St. Regis Property Credit', amount: 100, frequency: 'Annual', used: false }
        ],
        sub_active: false,
        sub_bonus_text: '185,000 Marriott Bonvoy pts',
        sub_spend_target: 6000,
        sub_base_spend: 6000,
        sub_deadline: '2026-09-01'
      }
    },
    {
      kind: 'program',
      title: 'IHG One Rewards',
      subtitle: 'Diamond / Platinum Elite • 4th Night Free on Award Stays',
      badge: 'Hotel Program',
      data: {
        name: 'IHG One Rewards',
        ecosystem: 'Hotel Loyalty',
        icon: '🏨',
        balance: 145000,
        cpp_valuation: 0.65,
        status_tier: 'Platinum Elite',
        member_id: 'IHG-6619-048',
        qualifying_current: 28,
        qualifying_target: 40,
        qualifying_label: 'Elite Nights',
        expiration_policy: 'No expiration for Elite members',
        transfer_partners: 'Chase 1:1, Bilt 1:1 (Best bought on 100% bonus promos at 0.5¢)',
        notes: 'InterContinental, Kimpton & Six Senses properties; 4th Reward Night Free with IHG Premier card'
      }
    },
    {
      kind: 'program',
      title: 'British Airways / Qatar Airways Avios',
      subtitle: 'Oneworld Alliance • Qatar Qsuites & Short-Haul Partner Awards',
      badge: 'Airline Miles',
      data: {
        name: 'British Airways / Qatar Avios',
        ecosystem: 'Airline Miles',
        icon: '✈️',
        balance: 92000,
        cpp_valuation: 1.50,
        status_tier: 'Oneworld Ruby',
        member_id: 'AV-3029-881',
        qualifying_current: 0,
        qualifying_target: 0,
        qualifying_label: 'Tier Points',
        expiration_policy: '36 months without activity',
        transfer_partners: 'Chase, Amex, Capital One, Bilt & Citi 1:1 (frequent 30% bonuses)',
        notes: 'Instant 1:1 linking between BA, Qatar, Iberia, and Finnair Avios accounts'
      }
    },
    {
      kind: 'cert',
      title: 'Hyatt Guest of Honor (GoH) Award',
      subtitle: 'Share Globalist Free Breakfast, Lounge, Suite Upgrade & 4PM Checkout',
      badge: 'Elite Perk',
      data: {
        title: 'Hyatt Guest of Honor (GoH) Award',
        program: 'World of Hyatt',
        cert_type: 'Suite / Status Upgrade',
        points_cap: 'Up to 7 Nights (Cash or Points)',
        estimated_value_usd: 450,
        expiration_date: '2027-02-28',
        status: 'available',
        redeemed_trip_id: '',
        redeemed_property: '',
        notes: 'Can be applied to own stay or gifted to co-producer/crew hotel room'
      }
    }
  ];

  async function saveRewardsState(toastMsg) {
    const updated = await apiRequest('/api/rewards', {
      method: 'PUT',
      body: JSON.stringify(state.rewards)
    });
    if (updated) {
      applyBootstrapData(updated);
    } else {
      renderRewardsDashboard();
      renderTripSelectors();
    }
    if (toastMsg) showToast(toastMsg);
  }

  function computeDaysUntil(dateStr) {
    if (!dateStr || dateStr === 'Ongoing' || dateStr.length < 8) return 999;
    const target = new Date(dateStr + 'T23:59:59');
    if (isNaN(target.getTime())) return 999;
    const now = new Date();
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  function getCardLoggedSpendUsd(cardName) {
    if (!cardName) return 0;
    const norm = cardName.toLowerCase();
    return state.expenses
      .filter(e => {
        const pm = String(e.payment_method || '').toLowerCase();
        return pm === norm || pm.includes(norm) || norm.includes(pm);
      })
      .reduce((sum, e) => sum + (Number(e.amount_usd) || 0), 0);
  }

  function renderRewardsDashboard() {
    if (!state.rewards || !Array.isArray(state.rewards.programs)) {
      state.rewards = getDefaultRewardsData();
    }
    const programs = state.rewards.programs || [];
    const certs = state.rewards.certificates || [];
    const cards = state.rewards.cards || [];
    const redemptions = state.rewards.redemptions || [];

    // 1. Portfolio Valuation & Points KPIs
    let totalPoints = 0;
    let totalPortfolioVal = 0;
    const ecoVals = {
      'Credit Card Points': 0,
      'Hotel Loyalty': 0,
      'Airline Miles': 0,
      'Cash Back / Portal': 0
    };

    for (const p of programs) {
      const bal = Number(p.balance) || 0;
      const cpp = Number(p.cpp_valuation) || 1;
      const val = (bal * cpp) / 100;
      totalPoints += bal;
      totalPortfolioVal += val;
      if (ecoVals[p.ecosystem] !== undefined) {
        ecoVals[p.ecosystem] += val;
      }
    }

    const avgPortfolioCpp = totalPoints > 0 ? ((totalPortfolioVal / totalPoints) * 100).toFixed(2) : '0.00';

    const sidebarRewardsBadge = document.getElementById('badge-rewards-val');
    if (sidebarRewardsBadge) sidebarRewardsBadge.textContent = fmtUsdCompact(totalPortfolioVal);

    const rkpiVal = document.getElementById('rkpi-total-val');
    if (rkpiVal) rkpiVal.textContent = fmtUsd(totalPortfolioVal);
    const rkpiValTag = document.getElementById('rkpi-val-tag');
    if (rkpiValTag) rkpiValTag.textContent = `Avg ${avgPortfolioCpp}¢ / pt`;
    const rkpiPts = document.getElementById('rkpi-total-pts');
    if (rkpiPts) rkpiPts.textContent = `${totalPoints.toLocaleString('en-US')} total points & miles`;
    const rkpiEco = document.getElementById('rkpi-eco-breakdown');
    if (rkpiEco) {
      rkpiEco.textContent = `Cards: ${fmtUsdCompact(ecoVals['Credit Card Points'])} • Hotels: ${fmtUsdCompact(ecoVals['Hotel Loyalty'])} • Air: ${fmtUsdCompact(ecoVals['Airline Miles'])}`;
    }

    // 2. Certificates & Perks KPIs
    const availCerts = certs.filter(c => c.status !== 'redeemed');
    const redeemedCerts = certs.filter(c => c.status === 'redeemed');
    const availCertVal = availCerts.reduce((s, c) => s + (Number(c.estimated_value_usd) || 0), 0);
    const expiringSoonCerts = availCerts.filter(c => computeDaysUntil(c.expiration_date) <= 90);

    const rkpiCertCount = document.getElementById('rkpi-cert-count');
    if (rkpiCertCount) rkpiCertCount.textContent = `${availCerts.length} Available`;
    const rkpiCertTag = document.getElementById('rkpi-cert-exp-tag');
    if (rkpiCertTag) {
      if (expiringSoonCerts.length > 0) {
        rkpiCertTag.className = 'kpi-tag danger';
        rkpiCertTag.textContent = `${expiringSoonCerts.length} Expiring <90d`;
      } else {
        rkpiCertTag.className = 'kpi-tag positive';
        rkpiCertTag.textContent = 'All Healthy';
      }
    }
    const rkpiCertVal = document.getElementById('rkpi-cert-val');
    if (rkpiCertVal) rkpiCertVal.textContent = `Est. Value: ${fmtUsd(availCertVal)}`;
    const rkpiCertRed = document.getElementById('rkpi-cert-redeemed');
    if (rkpiCertRed) rkpiCertRed.textContent = `${redeemedCerts.length} Redeemed YTD`;

    // 3. Credit Card Credits vs Annual Fees KPIs
    let totalAnnualFees = 0;
    let totalCreditsAvailable = 0;
    let totalCreditsCaptured = 0;
    for (const c of cards) {
      totalAnnualFees += Number(c.annual_fee) || 0;
      const crList = Array.isArray(c.credits) ? c.credits : [];
      for (const cr of crList) {
        const amt = Number(cr.amount) || 0;
        totalCreditsAvailable += amt;
        if (cr.used) totalCreditsCaptured += amt;
      }
    }
    const netEffectiveFee = totalAnnualFees - totalCreditsCaptured;
    const rkpiCredUsed = document.getElementById('rkpi-credits-used');
    if (rkpiCredUsed) rkpiCredUsed.textContent = `${fmtUsdCompact(totalCreditsCaptured)} / ${fmtUsdCompact(totalCreditsAvailable)}`;
    const rkpiFeeTag = document.getElementById('rkpi-net-fee-tag');
    if (rkpiFeeTag) {
      if (netEffectiveFee <= 0) {
        rkpiFeeTag.className = 'kpi-tag positive';
        rkpiFeeTag.textContent = `Paid +${fmtUsdCompact(Math.abs(netEffectiveFee))} Net`;
      } else {
        rkpiFeeTag.className = 'kpi-tag warning';
        rkpiFeeTag.textContent = `Net Cost: ${fmtUsdCompact(netEffectiveFee)}`;
      }
    }
    const rkpiFees = document.getElementById('rkpi-annual-fees');
    if (rkpiFees) rkpiFees.textContent = `Annual Fees: ${fmtUsdCompact(totalAnnualFees)}`;
    const rkpiNetFee = document.getElementById('rkpi-net-effective-fee');
    if (rkpiNetFee) {
      rkpiNetFee.textContent = netEffectiveFee <= 0
        ? `Net Yield: +${fmtUsd(Math.abs(netEffectiveFee))} ahead`
        : `Remaining to offset: ${fmtUsd(netEffectiveFee)}`;
    }

    // 4. Active Welcome Bonus (SUB) Tracker KPIs
    const activeSubCards = cards.filter(c => c.sub_active);
    let totalSubTarget = 0;
    let totalSubCurrent = 0;
    for (const c of activeSubCards) {
      const logged = getCardLoggedSpendUsd(c.card_name);
      const curr = (Number(c.sub_base_spend) || 0) + logged;
      totalSubTarget += Number(c.sub_spend_target) || 0;
      totalSubCurrent += curr;
    }
    const rkpiSubCount = document.getElementById('rkpi-sub-count');
    if (rkpiSubCount) rkpiSubCount.textContent = `${activeSubCards.length} Active SUB${activeSubCards.length === 1 ? '' : 's'}`;
    const rkpiSubTag = document.getElementById('rkpi-sub-pts-tag');
    if (rkpiSubTag) {
      rkpiSubTag.textContent = activeSubCards[0] ? activeSubCards[0].sub_bonus_text : 'All SUBs Completed';
    }
    const rkpiSubSpend = document.getElementById('rkpi-sub-spend');
    if (rkpiSubSpend) {
      rkpiSubSpend.textContent = totalSubTarget > 0
        ? `${fmtUsdCompact(totalSubCurrent)} / ${fmtUsdCompact(totalSubTarget)} spend`
        : 'All minimum spends met';
    }
    const rkpiSubVal = document.getElementById('rkpi-sub-val');
    if (rkpiSubVal) {
      const rem = Math.max(0, totalSubTarget - totalSubCurrent);
      rkpiSubVal.textContent = rem > 0 ? `${fmtUsdCompact(rem)} left to unlock` : '🎉 Ready to trigger bonus!';
    }

    // 5. Trip Cash Saved via Redemptions KPIs
    let totalRetailCash = 0;
    let totalTaxesPaid = 0;
    let totalPointsRedeemed = 0;
    for (const r of redemptions) {
      totalRetailCash += Number(r.cash_price_usd) || 0;
      totalTaxesPaid += Number(r.taxes_fees_usd) || 0;
      totalPointsRedeemed += Number(r.points_used) || 0;
    }
    const totalNetSaved = Math.max(0, totalRetailCash - totalTaxesPaid);
    const avgAchievedCpp = totalPointsRedeemed > 0
      ? ((totalNetSaved / totalPointsRedeemed) * 100).toFixed(2)
      : '0.0';

    const rkpiSaved = document.getElementById('rkpi-saved-total');
    if (rkpiSaved) rkpiSaved.textContent = fmtUsd(totalNetSaved);
    const rkpiCppTag = document.getElementById('rkpi-avg-cpp-tag');
    if (rkpiCppTag) rkpiCppTag.textContent = `Avg ${avgAchievedCpp}¢ / pt`;
    const rkpiRedCount = document.getElementById('rkpi-redemption-count');
    if (rkpiRedCount) rkpiRedCount.textContent = `${redemptions.length} trip redemptions`;
    const rkpiTaxes = document.getElementById('rkpi-taxes-paid');
    if (rkpiTaxes) rkpiTaxes.textContent = `Taxes paid: ${fmtUsdCompact(totalTaxesPaid)}`;

    // Tab counts
    const cProg = document.getElementById('rtab-count-programs');
    if (cProg) cProg.textContent = programs.length;
    const cCert = document.getElementById('rtab-count-certs');
    if (cCert) cCert.textContent = availCerts.length;
    const cCard = document.getElementById('rtab-count-cards');
    if (cCard) cCard.textContent = cards.length;
    const cRed = document.getElementById('rtab-count-redemptions');
    if (cRed) cRed.textContent = redemptions.length;

    // Show active sub-tab
    const rtabs = ['programs', 'certs', 'cards', 'matrix', 'redemptions'];
    for (const t of rtabs) {
      const panel = document.getElementById(`rtab-${t}`);
      if (panel) panel.style.display = state.rewardsTab === t ? 'block' : 'none';
    }
    document.querySelectorAll('#rewards-subnav [data-rtab]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-rtab') === state.rewardsTab);
    });

    renderRewardsPrograms(programs);
    renderRewardsCerts(certs);
    renderRewardsCards(cards);
    renderRewardsMatrixAndCalc();
    renderRewardsRedemptions(redemptions);
  }

  function renderRewardsPrograms(programs) {
    document.querySelectorAll('#rewards-eco-chips [data-reco]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-reco') === state.rewardsEcoFilter);
    });

    const grid = document.getElementById('rewards-programs-grid');
    if (!grid) return;

    const filtered = state.rewardsEcoFilter === 'all'
      ? programs
      : programs.filter(p => p.ecosystem === state.rewardsEcoFilter);

    if (filtered.length === 0) {
      grid.innerHTML = `<div class="panel-card" style="grid-column: 1 / -1; text-align: center; padding: 32px; color: var(--text-muted);">No loyalty programs in this category yet. Click <strong>+ Add Loyalty Program</strong> or <strong>⚡ Popular Templates</strong>.</div>`;
      return;
    }

    grid.innerHTML = filtered.map(p => {
      const bal = Number(p.balance) || 0;
      const cpp = Number(p.cpp_valuation) || 1;
      const usdVal = (bal * cpp) / 100;
      const qCurr = Number(p.qualifying_current) || 0;
      const qTarget = Number(p.qualifying_target) || 0;
      const qPct = qTarget > 0 ? Math.min(100, Math.round((qCurr / qTarget) * 100)) : 0;
      const stepAmt = p.ecosystem === 'Cash Back / Portal' ? 50 : 5000;

      const ecoClass = p.ecosystem === 'Hotel Loyalty'
        ? 'eco-hotel'
        : p.ecosystem === 'Airline Miles'
        ? 'eco-airline'
        : p.ecosystem === 'Cash Back / Portal'
        ? 'eco-cash'
        : 'eco-bank';

      return `
        <div class="reward-item-card ${ecoClass}">
          <div class="reward-card-top">
            <div class="reward-program-title-wrap">
              <div class="reward-program-icon">${escapeHtml(p.icon || '💳')}</div>
              <div>
                <div class="reward-program-name">${escapeHtml(p.name)}</div>
                <div class="reward-program-eco">
                  <span>${escapeHtml(p.ecosystem)}</span>
                  ${p.member_id ? `• <button type="button" class="member-id-pill" data-copy-member="${escapeHtml(p.member_id)}" title="Click to copy Member ID">📋 ${escapeHtml(p.member_id)}</button>` : ''}
                </div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="elite-tier-badge">${escapeHtml(p.status_tier || 'Member')}</span>
              <button type="button" class="btn btn-sm" data-edit-rprog="${escapeHtml(p.id)}" title="Edit Program">✎</button>
              <button type="button" class="btn btn-sm btn-danger-ghost" data-del-rprog="${escapeHtml(p.id)}" title="Remove">✕</button>
            </div>
          </div>

          <div class="reward-balance-box">
            <div>
              <div class="reward-pts-number tabular">${bal.toLocaleString('en-US')}</div>
              <div class="reward-pts-unit">
                ${p.ecosystem === 'Cash Back / Portal' ? 'Portal Credits' : 'Points / Miles'}
                • <span class="mono">@ ${cpp.toFixed(2)}¢</span>
              </div>
              <div class="stepper-group" style="margin-top: 8px;">
                <button type="button" class="btn-stepper" data-step-rprog="${escapeHtml(p.id)}" data-delta="-${stepAmt}" title="Subtract ${stepAmt.toLocaleString()}">-${stepAmt >= 1000 ? (stepAmt / 1000) + 'k' : stepAmt}</button>
                <button type="button" class="btn-stepper" data-step-rprog="${escapeHtml(p.id)}" data-delta="${stepAmt}" title="Add ${stepAmt.toLocaleString()}">+${stepAmt >= 1000 ? (stepAmt / 1000) + 'k' : stepAmt}</button>
              </div>
            </div>
            <div class="reward-usd-val">
              <div class="reward-usd-amount tabular">${fmtUsd(usdVal)}</div>
              <div class="reward-cpp-sub">Estimated Value</div>
              <button type="button" class="btn btn-sm" data-quick-redeem-prog="${escapeHtml(p.name)}" style="margin-top: 8px; font-size: 11px; padding: 3px 8px;">✈️ Redeem</button>
            </div>
          </div>

          ${qTarget > 0 ? `
            <div class="elite-progress-wrap">
              <div class="elite-progress-header">
                <span>🎯 ${escapeHtml(p.qualifying_label || 'Elite Progress')}: <strong class="mono">${qCurr.toLocaleString()} / ${qTarget.toLocaleString()}</strong> (${qPct}%)</span>
                <div class="stepper-group">
                  <button type="button" class="btn-stepper" data-step-rnights="${escapeHtml(p.id)}" data-delta="-1">-1</button>
                  <button type="button" class="btn-stepper" data-step-rnights="${escapeHtml(p.id)}" data-delta="1">+1</button>
                </div>
              </div>
              <div class="progress-track" style="height: 7px;">
                <div class="progress-fill ${qPct >= 100 ? '' : 'warning'}" style="width: ${qPct}%;"></div>
              </div>
            </div>
          ` : ''}

          <div class="reward-meta-footer">
            ${p.transfer_partners ? `<div><strong>Partners:</strong> ${escapeHtml(p.transfer_partners)}</div>` : ''}
            <div style="display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
              <span>⏳ ${escapeHtml(p.expiration_policy || 'No expiration')}</span>
              ${p.notes ? `<span style="color: var(--text-secondary);">💡 ${escapeHtml(p.notes)}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderRewardsCerts(certs) {
    document.querySelectorAll('#rewards-cert-chips [data-rcert-filter]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-rcert-filter') === state.rewardsCertFilter);
    });

    const grid = document.getElementById('rewards-certs-grid');
    if (!grid) return;

    const filtered = certs.filter(c => {
      const days = computeDaysUntil(c.expiration_date);
      if (state.rewardsCertFilter === 'available') return c.status !== 'redeemed';
      if (state.rewardsCertFilter === 'expiring') return c.status !== 'redeemed' && days <= 90;
      if (state.rewardsCertFilter === 'redeemed') return c.status === 'redeemed';
      return true;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `<div class="panel-card" style="grid-column: 1 / -1; text-align: center; padding: 32px; color: var(--text-muted);">No certificates or perks match this filter. Click <strong>+ Add Certificate / Perk</strong> to add a Free Night Award or Companion Pass.</div>`;
      return;
    }

    grid.innerHTML = filtered.map(c => {
      const days = computeDaysUntil(c.expiration_date);
      const isRedeemed = c.status === 'redeemed';
      let badgeHtml = '';
      if (isRedeemed) {
        badgeHtml = `<span class="cert-countdown-pill redeemed">✅ Redeemed</span>`;
      } else if (days <= 60) {
        badgeHtml = `<span class="cert-countdown-pill urgent">🔴 Expires in ${Math.max(0, days)}d (${escapeHtml(c.expiration_date)})</span>`;
      } else if (days <= 120) {
        badgeHtml = `<span class="cert-countdown-pill soon">🟡 ${days}d left (${escapeHtml(c.expiration_date)})</span>`;
      } else {
        badgeHtml = `<span class="cert-countdown-pill safe">🟢 Valid thru ${escapeHtml(c.expiration_date)}</span>`;
      }

      return `
        <div class="reward-item-card ${isRedeemed ? '' : 'eco-hotel'}" style="${isRedeemed ? 'opacity: 0.78;' : ''}">
          <div class="reward-card-top">
            <div>
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--accent-amber); margin-bottom: 3px;">
                ${escapeHtml(c.program)} • ${escapeHtml(c.cert_type || 'Perk')}
              </div>
              <div class="reward-program-name">${escapeHtml(c.title)}</div>
            </div>
            <div style="display: flex; gap: 6px; align-items: center;">
              ${badgeHtml}
              <button type="button" class="btn btn-sm" data-edit-rcert="${escapeHtml(c.id)}" title="Edit">✎</button>
              <button type="button" class="btn btn-sm btn-danger-ghost" data-del-rcert="${escapeHtml(c.id)}" title="Delete">✕</button>
            </div>
          </div>

          <div class="reward-balance-box">
            <div>
              <div style="font-size: 11.5px; color: var(--text-muted);">POINT CAP / RULES</div>
              <div style="font-size: 13.5px; font-weight: 700; color: var(--text-primary); margin-top: 2px;">${escapeHtml(c.points_cap || 'Standard Room Award')}</div>
              ${c.redeemed_property ? `<div style="font-size: 12px; color: var(--accent-primary); margin-top: 4px;">📍 Used: ${escapeHtml(c.redeemed_property)}</div>` : ''}
            </div>
            <div class="reward-usd-val">
              <div class="reward-usd-amount tabular">${fmtUsd(c.estimated_value_usd || 0)}</div>
              <div class="reward-cpp-sub">Target Value</div>
            </div>
          </div>

          <div class="reward-meta-footer" style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
            <span style="flex: 1;">${escapeHtml(c.notes || '')}</span>
            <button type="button" class="btn btn-sm ${isRedeemed ? '' : 'btn-primary'}" data-toggle-rcert="${escapeHtml(c.id)}" style="white-space: nowrap;">
              ${isRedeemed ? '↺ Mark Available' : '✓ Mark Redeemed'}
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderRewardsCards(cards) {
    // 1. Active SUB Tracker Grid
    const subGrid = document.getElementById('rewards-sub-tracker-grid');
    if (subGrid) {
      const subCards = cards.filter(c => c.sub_active);
      if (subCards.length === 0) {
        subGrid.innerHTML = `<div style="grid-column: 1 / -1; color: var(--text-muted); font-size: 13px; padding: 12px;">No active Welcome Bonus (SUB) minimum spends in progress. Click <strong>+ Add Card</strong> or edit any card below to track a new sign-up bonus!</div>`;
      } else {
        subGrid.innerHTML = subCards.map(c => {
          const logged = getCardLoggedSpendUsd(c.card_name);
          const base = Number(c.sub_base_spend) || 0;
          const totalSpend = base + logged;
          const target = Math.max(1, Number(c.sub_spend_target) || 4000);
          const pct = Math.min(100, Math.round((totalSpend / target) * 100));
          const rem = Math.max(0, target - totalSpend);
          const daysLeft = computeDaysUntil(c.sub_deadline);

          return `
            <div class="sub-tracker-card">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                <div>
                  <span class="kpi-tag ${pct >= 100 ? 'positive' : 'warning'}">${pct >= 100 ? '🎉 BONUS UNLOCKED' : `⏳ ${daysLeft}d left (${escapeHtml(c.sub_deadline)})`}</span>
                  <h4 style="font-size: 15px; font-weight: 700; margin-top: 6px;">${escapeHtml(c.card_name)}</h4>
                  <div style="font-size: 12.5px; color: var(--accent-amber); font-weight: 600;">🎁 Target Bonus: ${escapeHtml(c.sub_bonus_text)}</div>
                </div>
                <button type="button" class="btn btn-sm" data-edit-rcard="${escapeHtml(c.id)}">✎ Adjust Spend</button>
              </div>

              <div>
                <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 5px;">
                  <span>Total Progress: <strong class="mono">${fmtUsd(totalSpend)}</strong> of <strong class="mono">${fmtUsd(target)}</strong> (${pct}%)</span>
                  <span class="mono" style="font-weight: 700; color: ${rem === 0 ? 'var(--accent-primary)' : 'var(--text-primary)'};">
                    ${rem === 0 ? 'Minimum Spend Met!' : `${fmtUsd(rem)} to go`}
                  </span>
                </div>
                <div class="progress-track" style="height: 9px;">
                  <div class="progress-fill ${pct >= 100 ? '' : 'warning'}" style="width: ${pct}%;"></div>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 11.5px; color: var(--text-muted); margin-top: 6px;">
                  <span>Road Ledger Auto-Tracked: <strong class="mono" style="color: var(--accent-sky);">${fmtUsd(logged)}</strong></span>
                  <span>Prior / Base Spend: <strong class="mono">${fmtUsd(base)}</strong></span>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // 2. Best Card to Swipe Cheat Sheet
    const cheatGrid = document.getElementById('best-card-cheat-grid');
    if (cheatGrid) {
      cheatGrid.innerHTML = BEST_SWIPE_CHEAT_SHEET.map(item => `
        <div class="cheat-card">
          <div class="cheat-cat">${escapeHtml(item.cat)}</div>
          <div class="cheat-winner">🏆 ${escapeHtml(item.winner)}</div>
          <div class="cheat-detail">${escapeHtml(item.detail)}</div>
        </div>
      `).join('');
    }

    // 3. Credit Card Wallet & Statement Credit Checklist Grid
    const walletGrid = document.getElementById('rewards-cards-wallet-grid');
    if (!walletGrid) return;

    if (cards.length === 0) {
      walletGrid.innerHTML = `<div class="panel-card" style="grid-column: 1 / -1; text-align: center; padding: 32px; color: var(--text-muted);">No travel credit cards in wallet. Click <strong>+ Add Card</strong> or <strong>⚡ Popular Templates</strong>.</div>`;
      return;
    }

    walletGrid.innerHTML = cards.map(c => {
      const fee = Number(c.annual_fee) || 0;
      const credits = Array.isArray(c.credits) ? c.credits : [];
      const captured = credits.filter(cr => cr.used).reduce((s, cr) => s + (Number(cr.amount) || 0), 0);
      const totalCred = credits.reduce((s, cr) => s + (Number(cr.amount) || 0), 0);
      const netFee = fee - captured;
      const loggedSpend = getCardLoggedSpendUsd(c.card_name);

      return `
        <div class="reward-item-card eco-bank">
          <div class="reward-card-top">
            <div>
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--accent-sky);">
                ${escapeHtml(c.issuer || 'Card Issuer')} • Renews ${escapeHtml(c.renewal_month || 'Annually')}
              </div>
              <div class="reward-program-name" style="margin-top: 2px;">💳 ${escapeHtml(c.card_name)}</div>
              <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">Earns: <strong>${escapeHtml(c.points_program || 'Points')}</strong></div>
            </div>
            <div style="display: flex; gap: 6px; align-items: center;">
              <span class="kpi-tag ${netFee <= 0 ? 'positive' : 'warning'}">
                ${netFee <= 0 ? `Net +${fmtUsdCompact(Math.abs(netFee))} Keeper` : `Net Fee: ${fmtUsdCompact(netFee)}`}
              </span>
              <button type="button" class="btn btn-sm" data-edit-rcard="${escapeHtml(c.id)}" title="Edit Card">✎</button>
              <button type="button" class="btn btn-sm btn-danger-ghost" data-del-rcard="${escapeHtml(c.id)}" title="Remove">✕</button>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 10px; background: var(--bg-subtle); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); font-size: 12px;">
            <div>
              <div style="color: var(--text-muted);">Annual Fee</div>
              <div class="mono" style="font-weight: 700; font-size: 13.5px;">${fmtUsd(fee)}</div>
            </div>
            <div>
              <div style="color: var(--text-muted);">Credits Used</div>
              <div class="mono" style="font-weight: 700; font-size: 13.5px; color: var(--accent-primary);">${fmtUsd(captured)} / ${fmtUsd(totalCred)}</div>
            </div>
            <div>
              <div style="color: var(--text-muted);">Road Spend Logged</div>
              <div class="mono" style="font-weight: 700; font-size: 13.5px; color: var(--accent-sky);">${fmtUsdCompact(loggedSpend)}</div>
            </div>
          </div>

          <div style="font-size: 12px; color: var(--text-secondary);">
            <strong>Multipliers:</strong> ${escapeHtml(c.multipliers || '1X–5X')}
          </div>

          ${credits.length > 0 ? `
            <div class="credit-checklist">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 2px;">
                Statement Credit Checklist (Tap to mark used)
              </div>
              ${credits.map((cr, idx) => `
                <label class="credit-check-row ${cr.used ? 'checked' : ''}">
                  <span class="credit-check-left">
                    <input type="checkbox" data-toggle-card-credit="${escapeHtml(c.id)}" data-credit-idx="${idx}" ${cr.used ? 'checked' : ''} />
                    <span class="credit-label-text">${escapeHtml(cr.label)}</span>
                  </span>
                  <span class="mono" style="font-size: 12px; font-weight: 700; color: ${cr.used ? 'var(--accent-primary)' : 'var(--text-secondary)'};">
                    ${fmtUsd(cr.amount || 0)}
                  </span>
                </label>
              `).join('')}
            </div>
          ` : ''}

          <div class="reward-meta-footer">
            <strong>Key Perks:</strong> ${escapeHtml(c.perks || 'No foreign transaction fees')}
          </div>
        </div>
      `;
    }).join('');
  }

  function updateCppCalculator() {
    const cashEl = document.getElementById('cpp-cash-price');
    const taxEl = document.getElementById('cpp-taxes-fees');
    const ptsEl = document.getElementById('cpp-points-req');
    const benchEl = document.getElementById('cpp-program-benchmark');
    const resEl = document.getElementById('cpp-result-val');
    const badgeEl = document.getElementById('cpp-verdict-badge');
    const subEl = document.getElementById('cpp-net-saved-sub');
    if (!cashEl || !ptsEl || !resEl) return;

    const cash = Number(cashEl.value) || 0;
    const taxes = Number(taxEl ? taxEl.value : 0) || 0;
    const pts = Math.max(1, Number(ptsEl.value) || 1);
    const benchmark = Number(benchEl ? benchEl.value : 1.8) || 1.8;

    const netSaved = Math.max(0, cash - taxes);
    const cpp = (netSaved / pts) * 100;

    resEl.textContent = `${cpp.toFixed(2)}¢ / pt`;
    if (subEl) {
      subEl.textContent = `Net Cash Saved: ${fmtUsd(netSaved)} vs. Benchmark (${benchmark.toFixed(2)}¢/pt = ${fmtUsd((pts * benchmark) / 100)})`;
    }
    if (badgeEl) {
      if (cpp >= benchmark * 1.25) {
        badgeEl.className = 'kpi-tag positive';
        badgeEl.textContent = '🔥 OUTSIZED REDEMPTION — Book with Points!';
      } else if (cpp >= benchmark * 0.95) {
        badgeEl.className = 'kpi-tag sky';
        badgeEl.textContent = '✅ SOLID VALUE — Above Baseline';
      } else {
        badgeEl.className = 'kpi-tag danger';
        badgeEl.textContent = '⚠️ BELOW BASELINE — Consider Paying Cash';
      }
    }
  }

  function renderRewardsMatrixAndCalc() {
    updateCppCalculator();

    document.querySelectorAll('#matrix-bank-chips [data-mbank]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-mbank') === state.matrixBankFilter);
    });

    const tbody = document.getElementById('transfer-matrix-tbody');
    if (!tbody) return;

    const rows = state.matrixBankFilter === 'all'
      ? TRANSFER_PARTNER_MATRIX
      : TRANSFER_PARTNER_MATRIX.filter(r => r.bank === state.matrixBankFilter);

    tbody.innerHTML = rows.map(r => `
      <tr>
        <td style="font-weight: 700;">${escapeHtml(r.bank)}</td>
        <td>
          <span class="kpi-tag ${escapeHtml(r.tag)}" style="margin-right: 6px;">${escapeHtml(r.type)}</span>
          <strong>${escapeHtml(r.partner)}</strong>
        </td>
        <td class="mono" style="font-weight: 700;">${escapeHtml(r.ratio)}</td>
        <td class="mono" style="font-size: 12px; color: var(--accent-primary);">${escapeHtml(r.speed)}</td>
        <td style="font-size: 12.5px; color: var(--text-secondary);">${escapeHtml(r.sweetSpot)}</td>
      </tr>
    `).join('');
  }

  function renderRewardsRedemptions(redemptions) {
    const tbody = document.getElementById('rewards-redemptions-tbody');
    if (!tbody) return;
    const tripMap = new Map(state.trips.map(t => [t.id, t]));

    if (redemptions.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 28px; color: var(--text-muted);">No points redemptions logged yet. Click <strong>+ Log Redemption</strong> to track how much cash your points saved on a shoot!</td></tr>`;
      return;
    }

    tbody.innerHTML = redemptions.map(r => {
      const trip = tripMap.get(r.trip_id);
      const cash = Number(r.cash_price_usd) || 0;
      const taxes = Number(r.taxes_fees_usd) || 0;
      const netSaved = Math.max(0, cash - taxes);
      const pts = Number(r.points_used) || 0;
      const cpp = pts > 0 ? ((netSaved / pts) * 100).toFixed(2) + '¢' : 'Cert / Perk';

      return `
        <tr>
          <td class="mono" style="font-size: 12.5px; color: var(--text-secondary);">${escapeHtml(r.redemption_date || '')}</td>
          <td>
            <div class="expense-title">${escapeHtml(r.item_title)}</div>
            ${r.notes ? `<div class="expense-vendor">${escapeHtml(r.notes)}</div>` : ''}
          </td>
          <td style="font-size: 12.5px;">${trip ? escapeHtml(trip.name) : 'General Travel'}</td>
          <td><span class="cat-badge">${escapeHtml(r.program)}</span></td>
          <td class="mono" style="text-align: right; font-weight: 600;">${pts > 0 ? pts.toLocaleString('en-US') + ' pts' : 'Free Night Cert'}</td>
          <td class="mono" style="text-align: right;">${fmtUsd(cash)}</td>
          <td class="mono" style="text-align: right; color: var(--text-muted);">${fmtUsd(taxes)}</td>
          <td class="mono" style="text-align: right; font-weight: 700; color: var(--accent-primary);">
            +${fmtUsd(netSaved)}
            <div style="font-size: 11px; color: var(--accent-amber);">${cpp}</div>
          </td>
          <td>
            <div class="row-actions">
              <button type="button" class="btn btn-sm" data-edit-rred="${escapeHtml(r.id)}" title="Edit">✎</button>
              <button type="button" class="btn btn-sm btn-danger-ghost" data-del-rred="${escapeHtml(r.id)}" title="Delete">✕</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function openRewardProgramModal(editProg = null) {
    document.getElementById('modal-rprog-title').textContent = editProg ? 'Edit Loyalty Program' : 'Add Loyalty Program';
    document.getElementById('rprog-id').value = editProg ? editProg.id : '';
    document.getElementById('rprog-name').value = editProg ? editProg.name : '';
    document.getElementById('rprog-ecosystem').value = editProg ? editProg.ecosystem : 'Credit Card Points';
    document.getElementById('rprog-icon').value = editProg ? (editProg.icon || '💳') : '💳';
    document.getElementById('rprog-balance').value = editProg ? editProg.balance : 50000;
    document.getElementById('rprog-cpp').value = editProg ? editProg.cpp_valuation : 1.85;
    document.getElementById('rprog-status').value = editProg ? (editProg.status_tier || '') : '';
    document.getElementById('rprog-member-id').value = editProg ? (editProg.member_id || '') : '';
    document.getElementById('rprog-nights-curr').value = editProg ? (editProg.qualifying_current || 0) : 0;
    document.getElementById('rprog-nights-target').value = editProg ? (editProg.qualifying_target || 0) : 0;
    document.getElementById('rprog-metric-label').value = editProg ? (editProg.qualifying_label || 'Elite Nights') : 'Elite Nights';
    document.getElementById('rprog-expiration').value = editProg ? (editProg.expiration_policy || 'No expiration while active') : 'No expiration while active';
    document.getElementById('rprog-partners').value = editProg ? (editProg.transfer_partners || '') : '';
    document.getElementById('rprog-notes').value = editProg ? (editProg.notes || '') : '';
    openModal('modal-reward-program');
  }

  async function saveRewardProgramFromModal() {
    const name = document.getElementById('rprog-name').value.trim();
    if (!name) {
      showToast('Please enter a Loyalty Program name');
      return;
    }
    const id = document.getElementById('rprog-id').value;
    const item = {
      id: id || ('rp_' + Math.random().toString(36).slice(2, 9)),
      name,
      ecosystem: document.getElementById('rprog-ecosystem').value,
      icon: document.getElementById('rprog-icon').value.trim() || '💳',
      balance: Number(document.getElementById('rprog-balance').value) || 0,
      cpp_valuation: Number(document.getElementById('rprog-cpp').value) || 1.0,
      status_tier: document.getElementById('rprog-status').value.trim() || 'Member',
      member_id: document.getElementById('rprog-member-id').value.trim(),
      qualifying_current: Number(document.getElementById('rprog-nights-curr').value) || 0,
      qualifying_target: Number(document.getElementById('rprog-nights-target').value) || 0,
      qualifying_label: document.getElementById('rprog-metric-label').value.trim() || 'Elite Nights',
      expiration_policy: document.getElementById('rprog-expiration').value.trim() || 'No expiration',
      transfer_partners: document.getElementById('rprog-partners').value.trim(),
      notes: document.getElementById('rprog-notes').value.trim()
    };

    const idx = state.rewards.programs.findIndex(p => p.id === id);
    if (idx !== -1) {
      state.rewards.programs[idx] = item;
    } else {
      state.rewards.programs.unshift(item);
    }
    closeModal('modal-reward-program');
    await saveRewardsState(id ? `Updated ${name}` : `Added ${name} to Points Hub`);
  }

  function openRewardCertModal(editCert = null) {
    document.getElementById('modal-rcert-title').textContent = editCert ? 'Edit Certificate / Travel Perk' : 'Add Free Night Certificate / Perk';
    document.getElementById('rcert-id').value = editCert ? editCert.id : '';
    document.getElementById('rcert-title').value = editCert ? editCert.title : '';
    document.getElementById('rcert-program').value = editCert ? editCert.program : '';
    document.getElementById('rcert-type').value = editCert ? (editCert.cert_type || 'Free Night Certificate') : 'Free Night Certificate';
    document.getElementById('rcert-cap').value = editCert ? (editCert.points_cap || '') : '';
    document.getElementById('rcert-value').value = editCert ? (editCert.estimated_value_usd || 350) : 350;
    document.getElementById('rcert-exp').value = editCert ? (editCert.expiration_date || '2027-06-30') : '2027-06-30';
    document.getElementById('rcert-status').value = editCert ? (editCert.status || 'available') : 'available';
    document.getElementById('rcert-redeemed-on').value = editCert ? (editCert.redeemed_property || '') : '';
    document.getElementById('rcert-notes').value = editCert ? (editCert.notes || '') : '';
    openModal('modal-reward-cert');
  }

  async function saveRewardCertFromModal() {
    const title = document.getElementById('rcert-title').value.trim();
    if (!title) {
      showToast('Please enter a Certificate or Perk title');
      return;
    }
    const id = document.getElementById('rcert-id').value;
    const item = {
      id: id || ('rc_' + Math.random().toString(36).slice(2, 9)),
      title,
      program: document.getElementById('rcert-program').value.trim() || 'Loyalty Perk',
      cert_type: document.getElementById('rcert-type').value,
      points_cap: document.getElementById('rcert-cap').value.trim() || 'Standard Award',
      estimated_value_usd: Number(document.getElementById('rcert-value').value) || 0,
      expiration_date: document.getElementById('rcert-exp').value || '2027-12-31',
      status: document.getElementById('rcert-status').value,
      redeemed_property: document.getElementById('rcert-redeemed-on').value.trim(),
      notes: document.getElementById('rcert-notes').value.trim()
    };

    const idx = state.rewards.certificates.findIndex(c => c.id === id);
    if (idx !== -1) {
      state.rewards.certificates[idx] = item;
    } else {
      state.rewards.certificates.unshift(item);
    }
    closeModal('modal-reward-cert');
    await saveRewardsState(id ? `Updated ${title}` : `Added ${title} to Vault`);
  }

  function openRewardCardModal(editCard = null) {
    document.getElementById('modal-rcard-title').textContent = editCard ? 'Edit Travel Credit Card' : 'Add Travel Credit Card';
    document.getElementById('rcard-id').value = editCard ? editCard.id : '';
    document.getElementById('rcard-name').value = editCard ? editCard.card_name : '';
    document.getElementById('rcard-issuer').value = editCard ? (editCard.issuer || 'Chase') : 'Chase';
    document.getElementById('rcard-fee').value = editCard ? (editCard.annual_fee || 0) : 95;
    document.getElementById('rcard-renewal').value = editCard ? (editCard.renewal_month || '2027-04') : '2027-04';
    document.getElementById('rcard-earns').value = editCard ? (editCard.points_program || '') : 'Chase Ultimate Rewards';
    document.getElementById('rcard-multipliers').value = editCard ? (editCard.multipliers || '') : '3X Travel & Dining • 1X All Other';

    const creditsLines = editCard && Array.isArray(editCard.credits)
      ? editCard.credits.map(cr => `${cr.label} | ${cr.amount}`).join('\n')
      : '$300 Annual Travel Credit | 300';
    document.getElementById('rcard-credits-lines').value = creditsLines;

    document.getElementById('rcard-sub-Active').checked = editCard ? Boolean(editCard.sub_active) : false;
    document.getElementById('rcard-sub-bonus').value = editCard ? (editCard.sub_bonus_text || '') : '75,000 Bonus Points';
    document.getElementById('rcard-sub-target').value = editCard ? (editCard.sub_spend_target || 4000) : 4000;
    document.getElementById('rcard-sub-base').value = editCard ? (editCard.sub_base_spend || 0) : 0;
    document.getElementById('rcard-sub-deadline').value = editCard ? (editCard.sub_deadline || '2027-03-01') : '2027-03-01';
    document.getElementById('rcard-perks').value = editCard ? (editCard.perks || '') : 'Primary Rental Car CDW, Lounge Access, $0 Foreign Transaction Fees';
    openModal('modal-reward-card');
  }

  async function saveRewardCardFromModal() {
    const cardName = document.getElementById('rcard-name').value.trim();
    if (!cardName) {
      showToast('Please enter a Credit Card name');
      return;
    }
    const id = document.getElementById('rcard-id').value;
    const existingCard = state.rewards.cards.find(c => c.id === id);
    const existingUsedMap = new Map(
      (existingCard && Array.isArray(existingCard.credits) ? existingCard.credits : []).map(cr => [cr.label, cr.used])
    );

    const rawLines = document.getElementById('rcard-credits-lines').value
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);

    const parsedCredits = rawLines.map((line, i) => {
      const parts = line.split('|').map(s => s.trim());
      const label = parts[0] || `Statement Credit #${i + 1}`;
      const amtMatch = parts[1] ? Number(parts[1].replace(/[^0-9.]/g, '')) : Number((label.match(/\$([0-9,]+)/) || [])[1]?.replace(/,/g, '') || 50);
      return {
        id: `cr_${i}_${Math.random().toString(36).slice(2, 6)}`,
        label,
        amount: amtMatch || 0,
        frequency: 'Annual',
        used: existingUsedMap.has(label) ? existingUsedMap.get(label) : false
      };
    });

    const item = {
      id: id || ('card_' + Math.random().toString(36).slice(2, 9)),
      card_name: cardName,
      issuer: document.getElementById('rcard-issuer').value,
      annual_fee: Number(document.getElementById('rcard-fee').value) || 0,
      renewal_month: document.getElementById('rcard-renewal').value.trim() || '2027-01',
      points_program: document.getElementById('rcard-earns').value.trim(),
      multipliers: document.getElementById('rcard-multipliers').value.trim(),
      perks: document.getElementById('rcard-perks').value.trim(),
      credits: parsedCredits,
      sub_active: document.getElementById('rcard-sub-Active').checked,
      sub_bonus_text: document.getElementById('rcard-sub-bonus').value.trim(),
      sub_spend_target: Number(document.getElementById('rcard-sub-target').value) || 4000,
      sub_base_spend: Number(document.getElementById('rcard-sub-base').value) || 0,
      sub_deadline: document.getElementById('rcard-sub-deadline').value || '2027-03-01'
    };

    const idx = state.rewards.cards.findIndex(c => c.id === id);
    if (idx !== -1) {
      state.rewards.cards[idx] = item;
    } else {
      state.rewards.cards.unshift(item);
    }
    closeModal('modal-reward-card');
    await saveRewardsState(id ? `Updated ${cardName}` : `Added ${cardName} to Card Wallet`);
  }

  function updateRedemptionModalPreview() {
    const pts = Number(document.getElementById('rred-points')?.value) || 0;
    const cash = Number(document.getElementById('rred-cash')?.value) || 0;
    const taxes = Number(document.getElementById('rred-taxes')?.value) || 0;
    const netSaved = Math.max(0, cash - taxes);
    const cpp = pts > 0 ? ((netSaved / pts) * 100).toFixed(2) + '¢ / pt' : 'Free Night Cert';
    const prev = document.getElementById('rred-live-preview');
    if (prev) {
      prev.textContent = `${fmtUsd(netSaved)} Saved (${cpp})`;
    }
  }

  function openRewardRedemptionModal(editRed = null, prefillProgram = '') {
    document.getElementById('modal-rred-title').textContent = editRed ? 'Edit Trip Redemption' : 'Log Points / Certificate Redemption';
    document.getElementById('rred-id').value = editRed ? editRed.id : '';
    document.getElementById('rred-date').value = editRed ? editRed.redemption_date : new Date().toISOString().slice(0, 10);
    document.getElementById('rred-trip-id').value = editRed ? (editRed.trip_id || 'all') : (state.selectedTripId !== 'all' ? state.selectedTripId : (state.trips[0]?.id || 'all'));
    document.getElementById('rred-program').value = editRed ? editRed.program : (prefillProgram || 'World of Hyatt');
    document.getElementById('rred-item').value = editRed ? editRed.item_title : '';
    document.getElementById('rred-points').value = editRed ? editRed.points_used : 25000;
    document.getElementById('rred-cash').value = editRed ? editRed.cash_price_usd : 650;
    document.getElementById('rred-taxes').value = editRed ? editRed.taxes_fees_usd : 0;
    document.getElementById('rred-notes').value = editRed ? (editRed.notes || '') : '';
    updateRedemptionModalPreview();
    openModal('modal-reward-redemption');
  }

  async function saveRewardRedemptionFromModal() {
    const itemTitle = document.getElementById('rred-item').value.trim();
    if (!itemTitle) {
      showToast('Please enter the hotel stay or flight booked');
      return;
    }
    const id = document.getElementById('rred-id').value;
    const cash = Number(document.getElementById('rred-cash').value) || 0;
    const taxes = Number(document.getElementById('rred-taxes').value) || 0;
    const pts = Number(document.getElementById('rred-points').value) || 0;
    const netSaved = Math.max(0, cash - taxes);
    const cpp = pts > 0 ? Number(((netSaved / pts) * 100).toFixed(2)) : 0;

    const item = {
      id: id || ('rr_' + Math.random().toString(36).slice(2, 9)),
      redemption_date: document.getElementById('rred-date').value || new Date().toISOString().slice(0, 10),
      trip_id: document.getElementById('rred-trip-id').value,
      program: document.getElementById('rred-program').value.trim() || 'Loyalty Points',
      item_title: itemTitle,
      points_used: pts,
      cash_price_usd: cash,
      taxes_fees_usd: taxes,
      cpp_achieved: cpp,
      notes: document.getElementById('rred-notes').value.trim()
    };

    const idx = state.rewards.redemptions.findIndex(r => r.id === id);
    if (idx !== -1) {
      state.rewards.redemptions[idx] = item;
    } else {
      state.rewards.redemptions.unshift(item);
    }
    closeModal('modal-reward-redemption');
    await saveRewardsState(`Logged redemption: Saved ${fmtUsd(netSaved)} on ${itemTitle}`);
  }

  function openRewardTemplatesModal() {
    const grid = document.getElementById('reward-templates-picker-grid');
    if (grid) {
      grid.innerHTML = POPULAR_REWARD_TEMPLATES.map((tpl, idx) => `
        <div class="template-pick-card">
          <div>
            <span class="kpi-tag sky" style="margin-bottom: 6px; display: inline-block;">${escapeHtml(tpl.badge)}</span>
            <div style="font-weight: 700; font-size: 14px; color: var(--text-primary);">${escapeHtml(tpl.title)}</div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 3px;">${escapeHtml(tpl.subtitle)}</div>
          </div>
          <button type="button" class="btn btn-sm btn-primary" data-add-reward-tpl="${idx}" style="width: 100%;">
            + Add to My Rewards Hub
          </button>
        </div>
      `).join('');
    }
    openModal('modal-reward-templates');
  }

  function triggerRewardsCsvExport() {
    const programs = state.rewards.programs || [];
    const certs = state.rewards.certificates || [];
    const redemptions = state.rewards.redemptions || [];

    const rows = [
      ['SECTION', 'NAME / TITLE', 'ECOSYSTEM / PROGRAM', 'BALANCE / POINTS', 'VALUATION (CPP)', 'ESTIMATED USD VALUE / CASH SAVED', 'STATUS / EXPIRATION', 'NOTES'].map(escapeCsvCell).join(',')
    ];

    for (const p of programs) {
      const val = (((Number(p.balance) || 0) * (Number(p.cpp_valuation) || 1)) / 100).toFixed(2);
      rows.push([
        'Loyalty Program',
        p.name,
        p.ecosystem,
        p.balance,
        p.cpp_valuation,
        val,
        p.status_tier,
        p.notes
      ].map(escapeCsvCell).join(','));
    }

    for (const c of certs) {
      rows.push([
        'Certificate / Perk',
        c.title,
        c.program,
        c.points_cap,
        '',
        Number(c.estimated_value_usd || 0).toFixed(2),
        `${c.status} (${c.expiration_date})`,
        c.notes
      ].map(escapeCsvCell).join(','));
    }

    for (const r of redemptions) {
      const saved = Math.max(0, (Number(r.cash_price_usd) || 0) - (Number(r.taxes_fees_usd) || 0)).toFixed(2);
      rows.push([
        'Trip Redemption',
        r.item_title,
        r.program,
        r.points_used,
        r.cpp_achieved,
        saved,
        r.redemption_date,
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

    // Live CPP Calculator & Redemption Modal Previews
    ['cpp-cash-price', 'cpp-taxes-fees', 'cpp-points-req', 'cpp-program-benchmark'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', updateCppCalculator);
        el.addEventListener('change', updateCppCalculator);
      }
    });
    ['rred-points', 'rred-cash', 'rred-taxes'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', updateRedemptionModalPreview);
    });

    // Statement Credit Checkbox delegation
    document.addEventListener('change', async e => {
      const credCheck = e.target.closest('[data-toggle-card-credit]');
      if (credCheck) {
        const cardId = credCheck.getAttribute('data-toggle-card-credit');
        const idx = Number(credCheck.getAttribute('data-credit-idx'));
        const card = state.rewards.cards.find(c => c.id === cardId);
        if (card && Array.isArray(card.credits) && card.credits[idx]) {
          card.credits[idx].used = Boolean(credCheck.checked);
          await saveRewardsState(
            credCheck.checked
              ? `✓ Marked "${card.credits[idx].label}" used`
              : `Unchecked "${card.credits[idx].label}"`
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
      if (e.target.closest('#btn-submit-rprog')) {
        e.preventDefault();
        saveRewardProgramFromModal();
        return;
      }
      if (e.target.closest('#btn-submit-rcert')) {
        e.preventDefault();
        saveRewardCertFromModal();
        return;
      }
      if (e.target.closest('#btn-submit-rcard')) {
        e.preventDefault();
        saveRewardCardFromModal();
        return;
      }
      if (e.target.closest('#btn-submit-rred')) {
        e.preventDefault();
        saveRewardRedemptionFromModal();
        return;
      }

      // Topbar Rewards Command Center launcher / toggle
      if (e.target.closest('#btn-topbar-rewards')) {
        e.preventDefault();
        switchView(state.activeView === 'rewards' ? 'dashboard' : 'rewards');
        return;
      }

      // Rewards Sub-navigation Tabs
      const rtabBtn = e.target.closest('#rewards-subnav [data-rtab]');
      if (rtabBtn) {
        e.preventDefault();
        state.rewardsTab = rtabBtn.getAttribute('data-rtab');
        renderRewardsDashboard();
        return;
      }

      // Rewards Ecosystem Filter Chips
      const recoChip = e.target.closest('#rewards-eco-chips [data-reco]');
      if (recoChip) {
        e.preventDefault();
        state.rewardsEcoFilter = recoChip.getAttribute('data-reco');
        renderRewardsDashboard();
        return;
      }

      // Rewards Cert Filter Chips
      const rcertChip = e.target.closest('#rewards-cert-chips [data-rcert-filter]');
      if (rcertChip) {
        e.preventDefault();
        state.rewardsCertFilter = rcertChip.getAttribute('data-rcert-filter');
        renderRewardsDashboard();
        return;
      }

      // Transfer Matrix Bank Filter Chips
      const mbankChip = e.target.closest('#matrix-bank-chips [data-mbank]');
      if (mbankChip) {
        e.preventDefault();
        state.matrixBankFilter = mbankChip.getAttribute('data-mbank');
        renderRewardsMatrixAndCalc();
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
          prog.balance = Math.max(0, (Number(prog.balance) || 0) + delta);
          await saveRewardsState(`${prog.name}: ${prog.balance.toLocaleString('en-US')} balance`);
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
          prog.qualifying_current = Math.max(0, (Number(prog.qualifying_current) || 0) + delta);
          await saveRewardsState(`${prog.name}: ${prog.qualifying_current} / ${prog.qualifying_target} ${prog.qualifying_label || 'Nights'}`);
        }
        return;
      }

      // Open Rewards Modals (Add / Edit / Delete)
      if (e.target.closest('#btn-rewards-add-program, #btn-rtab-add-program')) {
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
        state.rewards.programs = state.rewards.programs.filter(p => p.id !== id);
        await saveRewardsState('Loyalty program removed');
        return;
      }

      if (e.target.closest('#btn-rewards-add-cert, #btn-rtab-add-cert')) {
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
        state.rewards.certificates = state.rewards.certificates.filter(c => c.id !== id);
        await saveRewardsState('Certificate / perk removed');
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

      if (e.target.closest('#btn-rewards-add-card, #btn-rtab-add-card')) {
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
        state.rewards.cards = state.rewards.cards.filter(c => c.id !== id);
        await saveRewardsState('Credit card removed from wallet');
        return;
      }

      if (e.target.closest('#btn-rewards-add-redemption, #btn-rtab-add-redemption')) {
        e.preventDefault();
        openRewardRedemptionModal(null);
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
        state.rewards.redemptions = state.rewards.redemptions.filter(r => r.id !== id);
        await saveRewardsState('Redemption entry removed');
        return;
      }

      // Rewards Templates & Export buttons
      if (e.target.closest('#btn-rewards-open-templates')) {
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
          if (tpl.kind === 'card') state.rewards.cards.unshift(clone);
          else if (tpl.kind === 'program') state.rewards.programs.unshift(clone);
          else if (tpl.kind === 'cert') state.rewards.certificates.unshift(clone);
          closeModal('modal-reward-templates');
          await saveRewardsState(`Added ${tpl.title} to your Rewards Hub!`);
        }
        return;
      }
      if (e.target.closest('#btn-restore-default-rewards')) {
        e.preventDefault();
        state.rewards = getDefaultRewardsData();
        closeModal('modal-reward-templates');
        await saveRewardsState('Restored full sample Rewards & Loyalty lineup');
        return;
      }
      if (e.target.closest('#btn-clear-all-rewards')) {
        e.preventDefault();
        state.rewards = { programs: [], certificates: [], cards: [], redemptions: [] };
        closeModal('modal-reward-templates');
        await saveRewardsState('Cleared sample rewards — ready for your custom entries!');
        return;
      }
      if (e.target.closest('#btn-rewards-export-csv')) {
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

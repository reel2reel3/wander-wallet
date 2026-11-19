'use strict';

const tls = require('node:tls');
const net = require('node:net');
const crypto = require('node:crypto');

/**
 * Initialize SQLite tables for Travel & Itinerary tracking.
 */
function initTravelSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      trip_id TEXT DEFAULT '',
      type TEXT NOT NULL DEFAULT 'flight',
      title TEXT NOT NULL,
      vendor TEXT DEFAULT '',
      confirmation_code TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'confirmed',
      start_datetime TEXT NOT NULL,
      end_datetime TEXT DEFAULT '',
      timezone TEXT DEFAULT '',
      location_from TEXT DEFAULT '',
      location_to TEXT DEFAULT '',
      address TEXT DEFAULT '',
      details_json TEXT DEFAULT '{}',
      cancel_deadline TEXT DEFAULT '',
      is_refundable INTEGER NOT NULL DEFAULT 1,
      cost_amount REAL NOT NULL DEFAULT 0,
      cost_currency TEXT NOT NULL DEFAULT 'USD',
      cost_usd REAL NOT NULL DEFAULT 0,
      payment_method TEXT DEFAULT '',
      points_used REAL NOT NULL DEFAULT 0,
      points_earned REAL NOT NULL DEFAULT 0,
      loyalty_program TEXT DEFAULT '',
      linked_expense_id TEXT DEFAULT '',
      attachment_data TEXT DEFAULT '',
      attachment_name TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      source TEXT NOT NULL DEFAULT 'manual',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS travel_inbox (
      id TEXT PRIMARY KEY,
      message_uid TEXT DEFAULT '',
      subject TEXT DEFAULT '',
      sender TEXT DEFAULT '',
      received_at TEXT DEFAULT '',
      raw_snippet TEXT DEFAULT '',
      parsed_json TEXT DEFAULT '[]',
      parser_used TEXT DEFAULT 'regex',
      confidence TEXT DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS travel_documents (
      id TEXT PRIMARY KEY,
      doc_type TEXT NOT NULL DEFAULT 'passport',
      title TEXT NOT NULL,
      holder_name TEXT DEFAULT '',
      doc_number TEXT DEFAULT '',
      issuing_country TEXT DEFAULT '',
      issue_date TEXT DEFAULT '',
      expiry_date TEXT DEFAULT '',
      attachment_data TEXT DEFAULT '',
      attachment_name TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );
  `);
}

// ---------------------------------------------------------------------------
// MIME / Email Decoding Helpers
// ---------------------------------------------------------------------------

function decodeQuotedPrintable(str) {
  if (!str) return '';
  return str
    .replace(/=\r?\n/g, '')
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function decodeBase64Utf8(str) {
  try {
    return Buffer.from(str.replace(/\s+/g, ''), 'base64').toString('utf8');
  } catch (e) {
    return str;
  }
}

function decodeHeaderWord(val) {
  if (!val) return '';
  return val.replace(/=\?([^?]+)\?([BQ])\?([^?]+)\?=/gi, (_, _charset, enc, data) => {
    if (enc.toUpperCase() === 'B') return decodeBase64Utf8(data);
    return decodeQuotedPrintable(data.replace(/_/g, ' '));
  });
}

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(td|th)>/gi, '   ')
    .replace(/<\/(tr|p|div|li|h[1-6]|table|section)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#160;/gi, ' ')
    .replace(/&#36;/gi, '$')
    .replace(/&#x24;/gi, '$')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => {
      const n = parseInt(code, 10);
      return (n >= 32 && n <= 126) ? String.fromCharCode(n) : ' ';
    })
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseHeadersBlock(headerText) {
  const unfolded = headerText.replace(/\r?\n[ \t]+/g, ' ');
  const headers = {};
  for (const line of unfolded.split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const k = line.slice(0, idx).trim().toLowerCase();
      const v = decodeHeaderWord(line.slice(idx + 1).trim());
      headers[k] = v;
    }
  }
  return headers;
}

function extractMimeParts(raw) {
  const splitIdx = raw.search(/\r?\n\r?\n/);
  if (splitIdx === -1) {
    return { headers: {}, text: raw, html: '' };
  }
  const headerBlock = raw.slice(0, splitIdx);
  const body = raw.slice(splitIdx).replace(/^\r?\n\r?\n/, '');
  const headers = parseHeadersBlock(headerBlock);
  const contentType = (headers['content-type'] || 'text/plain').toLowerCase();
  const cte = (headers['content-transfer-encoding'] || '').toLowerCase();

  const boundaryMatch = (headers['content-type'] || '').match(/boundary="?([^";\r\n]+)"?/i);
  if (boundaryMatch) {
    const boundary = boundaryMatch[1];
    const parts = body.split('--' + boundary);
    let text = '';
    let html = '';
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      const trimmed = part.trim();
      if (!trimmed || trimmed.startsWith('--')) continue;
      const sub = extractMimeParts(part.replace(/^[ \t]*\r?\n/, ''));
      if (sub.text) text += (text ? '\n' : '') + sub.text;
      if (sub.html) html += (html ? '\n' : '') + sub.html;
    }
    return { headers, text, html };
  }

  let decoded = body;
  if (cte.includes('base64')) {
    decoded = decodeBase64Utf8(body);
  } else if (cte.includes('quoted-printable')) {
    decoded = decodeQuotedPrintable(body);
  }

  if (contentType.includes('text/html')) {
    return { headers, text: stripHtml(decoded), html: decoded };
  }
  if (contentType.includes('text/plain') || !headers['content-type']) {
    return { headers, text: decoded, html: '' };
  }
  // Ignore binary attachments / inline images (image/png, application/pdf, etc.)
  return { headers, text: '', html: '' };
}

// ---------------------------------------------------------------------------
// Schema.org JSON-LD Extractor
// ---------------------------------------------------------------------------

function normalizeIsoDateTime(val) {
  if (!val) return '';
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) {
    return s.slice(0, 16);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return s + 'T12:00';
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 16);
  }
  return '';
}

function flattenJsonLd(node, out = []) {
  if (!node) return out;
  if (Array.isArray(node)) {
    for (const item of node) flattenJsonLd(item, out);
  } else if (typeof node === 'object') {
    if (node['@type']) out.push(node);
    if (node['@graph']) flattenJsonLd(node['@graph'], out);
  }
  return out;
}

function extractSchemaOrgReservations(html) {
  if (!html) return [];
  const results = [];
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      const json = JSON.parse(match[1].trim());
      const nodes = flattenJsonLd(json);
      for (const n of nodes) {
        const types = Array.isArray(n['@type']) ? n['@type'] : [n['@type']];
        const t = types.join(',').toLowerCase();

        if (t.includes('flightreservation')) {
          const rf = n.reservationFor || {};
          const dep = rf.departureAirport || {};
          const arr = rf.arrivalAirport || {};
          const airline = (rf.airline && (rf.airline.name || rf.airline.iataCode)) || '';
          const flightNum = rf.flightNumber ? `${airline ? airline + ' ' : ''}${rf.flightNumber}`.trim() : '';
          results.push({
            type: 'flight',
            title: `${dep.iataCode || 'DEP'} → ${arr.iataCode || 'ARR'}${flightNum ? ' (' + flightNum + ')' : ''}`,
            vendor: airline || (n.provider && n.provider.name) || '',
            confirmation_code: n.reservationNumber || '',
            start_datetime: normalizeIsoDateTime(rf.departureTime),
            end_datetime: normalizeIsoDateTime(rf.arrivalTime),
            location_from: dep.iataCode || dep.name || '',
            location_to: arr.iataCode || arr.name || '',
            cost_amount: Number(n.totalPrice) || 0,
            cost_currency: n.priceCurrency || 'USD',
            details: {
              flight_number: flightNum,
              seat: n.airplaneSeat || '',
              cabin: (n.airplaneSeatClass && n.airplaneSeatClass.name) || '',
              terminal: rf.departureTerminal || ''
            }
          });
        } else if (t.includes('lodgingreservation')) {
          const rf = n.reservationFor || {};
          const addr = rf.address || {};
          const fullAddr = [addr.streetAddress, addr.addressLocality, addr.addressRegion, addr.addressCountry].filter(Boolean).join(', ');
          results.push({
            type: 'hotel',
            title: rf.name || 'Hotel Stay',
            vendor: rf.name || '',
            confirmation_code: n.reservationNumber || '',
            start_datetime: normalizeIsoDateTime(n.checkinTime || n.checkinDate),
            end_datetime: normalizeIsoDateTime(n.checkoutTime || n.checkoutDate),
            location_to: addr.addressLocality || '',
            address: fullAddr,
            cost_amount: Number(n.totalPrice) || 0,
            cost_currency: n.priceCurrency || 'USD',
            details: {
              room_type: (n.lodgingUnitDescription) || ''
            }
          });
        } else if (t.includes('rentalcarreservation')) {
          const rf = n.reservationFor || {};
          const pu = n.pickupLocation || {};
          results.push({
            type: 'car',
            title: `Rental Car: ${rf.name || rf.model || (rf.brand && rf.brand.name) || 'Vehicle'}`,
            vendor: (rf.rentalCompany && rf.rentalCompany.name) || (n.provider && n.provider.name) || '',
            confirmation_code: n.reservationNumber || '',
            start_datetime: normalizeIsoDateTime(n.pickupTime),
            end_datetime: normalizeIsoDateTime(n.dropoffTime),
            location_from: pu.name || (pu.address && pu.address.addressLocality) || '',
            address: (pu.address && pu.address.streetAddress) || '',
            cost_amount: Number(n.totalPrice) || 0,
            cost_currency: n.priceCurrency || 'USD',
            details: {
              car_class: rf.name || rf.model || ''
            }
          });
        } else if (t.includes('trainreservation') || t.includes('busreservation')) {
          const rf = n.reservationFor || {};
          const dep = rf.departureStation || {};
          const arr = rf.arrivalStation || {};
          results.push({
            type: 'transit',
            title: `${dep.name || 'Origin'} → ${arr.name || 'Destination'}`,
            vendor: (rf.provider && rf.provider.name) || '',
            confirmation_code: n.reservationNumber || '',
            start_datetime: normalizeIsoDateTime(rf.departureTime),
            end_datetime: normalizeIsoDateTime(rf.arrivalTime),
            location_from: dep.name || '',
            location_to: arr.name || '',
            cost_amount: Number(n.totalPrice) || 0,
            cost_currency: n.priceCurrency || 'USD',
            details: {
              seat: n.reservedTicket && n.reservedTicket.ticketedSeat && n.reservedTicket.ticketedSeat.seatNumber || ''
            }
          });
        } else if (t.includes('eventreservation') || t.includes('foodestablishmentreservation')) {
          const rf = n.reservationFor || {};
          const isDining = t.includes('foodestablishment');
          results.push({
            type: isDining ? 'dining' : 'activity',
            title: rf.name || (isDining ? 'Dining Reservation' : 'Activity'),
            vendor: rf.name || '',
            confirmation_code: n.reservationNumber || '',
            start_datetime: normalizeIsoDateTime(n.startTime || rf.startDate),
            end_datetime: normalizeIsoDateTime(rf.endDate),
            address: (rf.address && [rf.address.streetAddress, rf.address.addressLocality].filter(Boolean).join(', ')) || '',
            cost_amount: Number(n.totalPrice) || 0,
            cost_currency: n.priceCurrency || 'USD',
            details: {
              party_size: n.partySize || ''
            }
          });
        }
      }
    } catch (e) {
      // Ignore malformed JSON-LD block
    }
  }
  return results.filter(r => r.start_datetime || r.confirmation_code);
}

// ---------------------------------------------------------------------------
// Deterministic Regex / Template Extractor
// ---------------------------------------------------------------------------

const MONTH_INDEX = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
  JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12'
};

function parseIataCompactDate(str, fallbackYear) {
  if (!str) return '';
  // Matches 05JAN27, 05JAN2027, 05 JAN 27, 05-JAN-2027, 5 Jan 2027
  const m = String(str).match(/\b(\d{1,2})[\s\-]*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*[\s\-,]*(\d{2}|\d{4})?\b/i);
  if (!m) return '';
  const day = String(m[1]).padStart(2, '0');
  const mon = MONTH_INDEX[m[2].slice(0, 3).toUpperCase()];
  if (!mon) return '';
  let yr = fallbackYear || new Date().getFullYear();
  if (m[3]) {
    yr = m[3].length === 2 ? Number('20' + m[3]) : Number(m[3]);
  }
  if (yr < 2020 || yr > 2035) return '';
  return `${yr}-${mon}-${day}`;
}

function parseNaturalDate(dateStr, defaultYear) {
  if (!dateStr) return '';
  const iata = parseIataCompactDate(dateStr, defaultYear);
  if (iata) return iata;
  const cleaned = dateStr.replace(/(\d+)(st|nd|rd|th)/gi, '$1').trim();
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) {
    const yr = d.getFullYear();
    if (yr >= 2020 && yr <= 2035) {
      return d.toISOString().slice(0, 10);
    }
  }
  return '';
}

function formatTitleCaseName(raw) {
  return String(raw || '')
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function parseTimeTo24h(timeStr) {
  if (!timeStr) return '';
  const m = String(timeStr).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM|A|P|N)?$/i);
  if (!m) return '';
  let hr = parseInt(m[1], 10);
  const min = m[2];
  const mer = (m[3] || '').toUpperCase();
  if ((mer === 'PM' || mer === 'P' || mer === 'N') && hr < 12) hr += 12;
  if ((mer === 'AM' || mer === 'A') && hr === 12) hr = 0;
  if (hr < 0 || hr > 23) return '';
  return `${String(hr).padStart(2, '0')}:${min}`;
}

function extractRegexReservations(subject = '', sender = '', text = '') {
  const combined = `${subject}\n${sender}\n${text}`;

  // Detect type
  let type = 'other';
  if (/(flight|boarding|e-ticket|airline|airways|record locator|pnr|depart|airport|delta|united|american airlines|southwest|jetblue|alaska air|british airways|lufthansa|air france|copa)/i.test(combined)) {
    type = 'flight';
  } else if (/(hotel|check-in|check in|check-out|check out|marriott|hilton|hyatt|ihg|airbnb|vrbo|resort|inn|suites|lodging|room type)/i.test(combined)) {
    type = 'hotel';
  } else if (/(rental car|car rental|hertz|avis|national|enterprise|alamo|sixt|budget|pick-up|drop-off|vehicle)/i.test(combined)) {
    type = 'car';
  } else if (/(amtrak|eurostar|rail|train|ferry|shuttle|transfer|uber|lyft)/i.test(combined)) {
    type = 'transit';
  } else if (/(opentable|resy|restaurant|dining|table for|party of)/i.test(combined)) {
    type = 'dining';
  } else if (/(tour|ticket|viator|getyourguide|museum|excursion|admission|concert|show)/i.test(combined)) {
    type = 'activity';
  }

  // Passenger name (e.g. "Your Flight Receipt - KAREN HOCHMUTH 05JAN27" or "Passenger: KAREN HOCHMUTH")
  let passengerName = '';
  const subjPassengerMatch = subject.match(/Flight Receipt\s*[-–:]\s*([A-Z][A-Z\s.'-]{2,40}?)\s+\d{1,2}\s*(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)/i);
  if (subjPassengerMatch) {
    passengerName = formatTitleCaseName(subjPassengerMatch[1]);
  } else {
    const bodyPassengerMatch = combined.match(/(?:Passenger(?:\s+Name)?|Traveler)\s*[:\-]\s*([A-Z][A-Za-z\s.'-]{2,35})/i);
    if (bodyPassengerMatch) {
      passengerName = formatTitleCaseName(bodyPassengerMatch[1].split(/\r?\n/)[0]);
    }
  }

  // Confirmation code (Prioritize 6-character alphanumeric Airline PNR / Record Locator)
  let confirmation_code = '';
  const confPatterns = [
    /(?:confirmation|record locator|booking ref(?:erence)?|reservation|pnr)\s*(?:code|number|no\.?|#)?\s*[:\-]?\s*\b([A-Z0-9]{6})\b/i,
    /(?:confirmation|record locator|booking ref(?:erence)?|reservation|itinerary|pnr|reference)\s*(?:code|number|no\.?|#|id)?\s*[:\-]?\s*\b([A-Z0-9]{5,10})\b/i,
    /\b(?:conf(?:irmation)?)\s*#\s*([A-Z0-9-]{5,12})\b/i
  ];
  const badConfWords = /^(NUMBER|CODE|EMAIL|BELOW|DETAILS|RECEIPT|FLIGHT|DELTA|TICKET|STATUS|AMOUNT|POINTS|MILES)$/i;
  for (const pat of confPatterns) {
    const m = combined.match(pat);
    if (m && m[1] && !badConfWords.test(m[1])) {
      confirmation_code = m[1].toUpperCase();
      break;
    }
  }

  // Price & Fare Breakdown (Prioritize TICKET AMOUNT / TOTAL AMOUNT over promo/ancillary/tax lines, supporting both 1-row and 2-column HTML tables)
  let cost_amount = 0;
  let cost_currency = 'USD';
  let baseFareAmount = 0;

  const baseFareMatch = combined.match(/\bbase\s+fare\b[^0-9$€£]{0,60}?(USD|EUR|GBP|CAD|AUD|JPY|ARS|BRL|MXN|\$|€|£)?\s*(\$|€|£)?\s*([0-9,]+\.\d{2})\s*(USD|EUR|GBP|CAD|AUD|JPY|ARS|BRL|MXN)?/i);
  if (baseFareMatch) {
    baseFareAmount = parseFloat(baseFareMatch[3].replace(/,/g, '')) || 0;
  }

  // Match all explicitly labeled total lines (allowing up to 80 non-digit chars between label and amount)
  const totalRegex = /\b(ticket\s+amount|total\s+ticket\s+amount|grand\s+total|total\s+paid|amount\s+paid|total\s+charged|total\s+fare|total\s+amount|total\s+price|total\s+cost|total\s+due|air\s+transportation\s+charges|ticket\s+total|total)\b[^0-9$€£]{0,80}?(USD|EUR|GBP|CAD|AUD|JPY|ARS|BRL|MXN|\$|€|£)?\s*(\$|€|£)?\s*([0-9,]+\.\d{2})\s*(USD|EUR|GBP|CAD|AUD|JPY|ARS|BRL|MXN)?/gi;
  let bestPriority = 0;
  let tm;
  while ((tm = totalRegex.exec(combined)) !== null) {
    const label = (tm[1] || '').toLowerCase().replace(/\s+/g, ' ');
    const cur1 = (tm[2] || '').toUpperCase();
    const cur2 = (tm[5] || '').toUpperCase();
    const sym = cur2 || cur1 || '$';
    const val = parseFloat(tm[4].replace(/,/g, '')) || 0;
    if (val <= 0) continue;
    const prio = (label.includes('ticket amount') || label.includes('grand total') || label.includes('amount paid') || label.includes('total charged')) ? 3 : 2;
    if (prio > bestPriority || (prio === bestPriority && val > cost_amount)) {
      bestPriority = prio;
      cost_amount = val;
      cost_currency = sym === '€' ? 'EUR' : sym === '£' ? 'GBP' : (sym === '$' ? 'USD' : sym);
    }
  }

  // Also handle 2-column nested HTML tables where "Base Fare ... TICKET AMOUNT" labels are in the left column and "$336.00 USD ... $375.25 USD" are in the right column
  const fareSectionIdx = combined.search(/\b(base\s+fare|ticket\s+amount|taxes,\s*fees\s+and\s+charges)\b/i);
  if (fareSectionIdx !== -1) {
    const fareWindow = combined.slice(fareSectionIdx, fareSectionIdx + 1800);
    const allPricesInFareBlock = [];
    const priceInBlockRe = /(\$|€|£)?\s*([0-9,]+\.\d{2})\s*(USD|EUR|GBP|CAD|AUD|JPY|ARS|BRL|MXN)/gi;
    let pm;
    while ((pm = priceInBlockRe.exec(fareWindow)) !== null) {
      const val = parseFloat(pm[2].replace(/,/g, '')) || 0;
      if (val > 0 && val < 50000) {
        allPricesInFareBlock.push({ val, cur: (pm[3] || 'USD').toUpperCase() });
      }
    }
    if (allPricesInFareBlock.length > 0) {
      const maxInBlock = allPricesInFareBlock.reduce((best, cur) => (cur.val > best.val ? cur : best), allPricesInFareBlock[0]);
      if (maxInBlock.val > cost_amount) {
        cost_amount = maxInBlock.val;
        cost_currency = maxInBlock.cur;
      }
      if (baseFareAmount === 0 && allPricesInFareBlock.length >= 2) {
        const sortedDesc = [...allPricesInFareBlock].map(x => x.val).sort((a, b) => b - a);
        if (sortedDesc[1] > 50 && sortedDesc[1] < sortedDesc[0]) {
          baseFareAmount = sortedDesc[1];
        }
      }
    }
  }

  if (cost_amount === 0 && baseFareAmount > 0) {
    cost_amount = baseFareAmount;
  }

  if (cost_amount === 0) {
    const fallbackPrice = combined.match(/(\$|€|£)\s*([0-9,]+\.\d{2})\s*(USD|EUR|GBP|CAD|AUD)?/i);
    if (fallbackPrice) {
      const sym = (fallbackPrice[3] || fallbackPrice[1] || '$').toUpperCase();
      cost_currency = sym === '€' ? 'EUR' : sym === '£' ? 'GBP' : (sym === '$' ? 'USD' : sym);
      cost_amount = parseFloat(fallbackPrice[2].replace(/,/g, '')) || 0;
    }
  }

  // Dates:
  // 1. Check Subject line FIRST (e.g. "05JAN27" in "Your Flight Receipt - KAREN HOCHMUTH 05JAN27")
  const dateMatches = [];
  const subjIataMatches = subject.match(/\b\d{1,2}[\s\-]*(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*[\s\-,]*202[4-9]|\b\d{1,2}[\s\-]*(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*[\s\-]*2[4-9]\b/gi) || [];
  for (const sm of subjIataMatches) {
    const p = parseIataCompactDate(sm);
    if (p && !dateMatches.includes(p)) dateMatches.push(p);
  }
  const subjYear = dateMatches[0] ? Number(dateMatches[0].slice(0, 4)) : new Date().getFullYear();

  // Strip issue/purchase date lines AND "September 11th Security Fee" tax rows so they are never confused with travel dates
  const bodyWithoutIssueDates = text
    .replace(/September\s+11(?:th)?\s+Security\s+Fee/gi, 'TSA Security Fee')
    .split(/\r?\n/)
    .filter(line => !/(?:issue\s*date|date\s*of\s*issue|purchased\s*on|booking\s*date|receipt\s*date)/i.test(line))
    .join('\n');

  // 2. Check IATA compact dates in body (e.g. 05JAN27, 05 JAN 2027, Tue, 05JAN)
  const iataBodyMatches = bodyWithoutIssueDates.match(/\b\d{1,2}[\s\-]*(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*(?:[\s\-,]*(?:202[4-9]|2[4-9]))?\b/gi) || [];
  for (const im of iataBodyMatches) {
    const p = parseIataCompactDate(im, subjYear);
    if (p && !dateMatches.includes(p)) dateMatches.push(p);
  }

  // 3. Check ISO dates (2027-01-05)
  const isoDates = bodyWithoutIssueDates.match(/\b(202[4-9]-\d{2}-\d{2})\b/g) || [];
  for (const d of isoDates) {
    if (!dateMatches.includes(d)) dateMatches.push(d);
  }

  // 4. Check Month-first natural dates (January 5, 2027)
  const textDates = bodyWithoutIssueDates.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+202[4-9])?\b/gi) || [];
  for (const td of textDates) {
    const parsed = parseNaturalDate(td.includes('202') ? td : `${td}, ${subjYear}`, subjYear);
    if (parsed && !dateMatches.includes(parsed)) dateMatches.push(parsed);
  }

  const startDate = dateMatches[0] || new Date().toISOString().slice(0, 10);
  // Any subsequent date in the email that is earlier than startDate is a purchase/issue date, never an end/arrival date
  const validEndDates = dateMatches.slice(1).filter(d => d >= startDate);
  const endDate = validEndDates[0] || '';

  // Extract Departure & Arrival Times (e.g. "6:00 AM", "8:15A", "1:45 PM", "4:20P")
  const rawTimes = bodyWithoutIssueDates.match(/\b(\d{1,2}:\d{2}\s*(?:AM|PM|A|P|N))\b/gi) || [];
  const startTime = parseTimeTo24h(rawTimes[0]) || (type === 'hotel' ? '15:00' : '09:00');
  const endTime = parseTimeTo24h(rawTimes[1]) || (type === 'hotel' ? '11:00' : '12:00');

  // Airport route for flights
  let location_from = '';
  let location_to = '';
  let title = subject ? subject.replace(/^(re:|fwd?:)\s*/i, '').trim().slice(0, 80) : 'Travel Reservation';

  if (type === 'flight') {
    // Match explicit routes like BUF -> PTY, BUF to PTY, or Depart BUF ... Arrive PTY
    const routeMatch = combined.match(/\b([A-Z]{3})\s*(?:->|→|to|-|–)\s*([A-Z]{3})\b/)
      || combined.match(/(?:depart(?:ing|ure)?|from|origin)\s*[:\-]?\s*(?:[A-Za-z\s]+\()?([A-Z]{3})\)?[\s\S]{1,80}?(?:arriv(?:ing|al|e)?|to|destination)\s*[:\-]?\s*(?:[A-Za-z\s]+\()?([A-Z]{3})\)?/i);
    const bannedCodes = /^(USD|EUR|CAD|JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC|MON|TUE|WED|THU|FRI|SAT|SUN|EST|EDT|CST|CDT|MST|MDT|PST|PDT|GMT|UTC|PNR|TAX|FEE|BAG|VIP|TSA|THE|AND|FOR|YOU)$/;
    if (routeMatch && !bannedCodes.test(routeMatch[1].toUpperCase()) && !bannedCodes.test(routeMatch[2].toUpperCase())) {
      location_from = routeMatch[1].toUpperCase();
      location_to = routeMatch[2].toUpperCase();
    }
    if (location_from && location_to) {
      title = `Flight ${location_from} → ${location_to}${passengerName ? ` (${passengerName})` : ''}`;
    } else if (passengerName) {
      title = `Flight — ${passengerName}`;
    }
  }

  // Vendor guess from sender or body
  let vendor = '';
  if (/delta/i.test(sender) || /delta air lines/i.test(combined)) {
    vendor = 'Delta Air Lines';
  } else {
    const senderMatch = sender.match(/^"?([^"<@]+)"?\s*</);
    if (senderMatch) {
      vendor = senderMatch[1].trim();
    } else if (sender.includes('@')) {
      const dom = sender.split('@')[1].split('.')[0];
      vendor = dom.charAt(0).toUpperCase() + dom.slice(1);
    }
  }

  // Flight number, Seat, Cabin, Fare Breakdown & Full Email Text
  const details = {};
  if (passengerName) details.passenger = passengerName;
  if (baseFareAmount > 0 && cost_amount >= baseFareAmount) {
    const taxes = Number((cost_amount - baseFareAmount).toFixed(2));
    details.fare_breakdown = `Base Fare: $${baseFareAmount.toFixed(2)}${taxes > 0 ? ` + Taxes/Fees: $${taxes.toFixed(2)}` : ''}`;
  }
  if (text) {
    details.full_email_text = text.slice(0, 25000);
  }
  if (type === 'flight') {
    const deltaFlightMatch = combined.match(/\b(?:DELTA|DL|CM|UA|AA|WN|B6|AS|BA|AF|LH|LA|AV)\s*(\d{1,4})\b/i);
    if (deltaFlightMatch) {
      const carrier = deltaFlightMatch[0].match(/^[A-Za-z]+/)[0].toUpperCase();
      details.flight_number = `${carrier === 'DELTA' ? 'DL' : carrier} ${deltaFlightMatch[1]}`;
    }
    const seatMatch = combined.match(/\bSeat(?:\s*Assignment)?\s*[:\-]?\s*(\d{1,2}[A-J])\b/i);
    if (seatMatch) details.seat = seatMatch[1].toUpperCase();
    const cabinMatch = combined.match(/\b(Delta One|First Class|Business Class|Comfort\+|Main Cabin|Premium Select|Basic Economy)\b/i);
    if (cabinMatch) details.cabin = cabinMatch[1];
  }

  // Cancel deadline
  let cancel_deadline = '';
  const cancelMatch = combined.match(/free cancellation (?:until|before|by)\s+([A-Za-z]+\s+\d{1,2},?\s+202[4-9]|202[4-9]-\d{2}-\d{2})/i);
  if (cancelMatch) {
    cancel_deadline = parseNaturalDate(cancelMatch[1], subjYear);
  }

  if (!confirmation_code && dateMatches.length === 0 && type === 'other') {
    return [];
  }

  return [{
    type,
    title,
    vendor,
    confirmation_code,
    start_datetime: `${startDate}T${startTime}`,
    end_datetime: endDate ? `${endDate}T${endTime}` : (rawTimes[1] ? `${startDate}T${endTime}` : ''),
    location_from,
    location_to,
    address: '',
    cancel_deadline,
    cost_amount,
    cost_currency,
    details
  }];
}

// ---------------------------------------------------------------------------
// Optional LLM Fallback Parser (reuses Admin AI Key)
// ---------------------------------------------------------------------------

async function extractWithLlmFallback(subject, sender, text, rawKey, provider) {
  if (!rawKey) return null;
  const snippet = text.slice(0, 22000);
  const prompt = [
    'Extract all travel reservations from this confirmation email.',
    'For cost_amount, always use the final TICKET AMOUNT / GRAND TOTAL / TOTAL PAID (including base fare + taxes/fees), never a small promo, insurance, or single tax fee.',
    'Return ONLY a valid JSON array of objects with these fields:',
    'type (flight|hotel|car|transit|dining|activity|cruise|other), title, vendor, confirmation_code, start_datetime (YYYY-MM-DDTHH:mm), end_datetime (YYYY-MM-DDTHH:mm or empty), location_from, location_to, address, cancel_deadline (YYYY-MM-DD or empty), cost_amount (number), cost_currency (3-letter code), points_used (number), points_earned (number), loyalty_program, details (object with passenger, flight_number, seat, cabin, terminal, gate, room_type, car_class).',
    `Subject: ${subject}\nFrom: ${sender}\n\nEmail Body:\n${snippet}`
  ].join('\n\n');

  try {
    let rawOut = '';
    if (provider === 'openai' || rawKey.startsWith('sk-')) {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${rawKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.1,
          messages: [
            { role: 'system', content: 'You are a precise travel itinerary JSON extractor. Output ONLY valid JSON.' },
            { role: 'user', content: prompt }
          ]
        })
      });
      const data = await resp.json();
      rawOut = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
    } else {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(rawKey)}`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1 }
        })
      });
      const data = await resp.json();
      const parts = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
      rawOut = parts.map(p => p.text || '').join('');
    }
    const jsonMatch = rawOut.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const arr = JSON.parse(jsonMatch[0]);
      if (Array.isArray(arr) && arr.length > 0) return arr;
    }
  } catch (e) {
    // Fallback silently to regex result
  }
  return null;
}

async function parseTravelEmail({ rawEmail = '', subject = '', sender = '', text = '', html = '', aiKey = '', aiProvider = '' }) {
  let finalSubject = subject;
  let finalSender = sender;
  let finalText = text;
  let finalHtml = html;

  if (rawEmail && (!text && !html)) {
    const mime = extractMimeParts(rawEmail);
    finalSubject = finalSubject || mime.headers.subject || '';
    finalSender = finalSender || mime.headers.from || '';
    finalText = mime.text || '';
    finalHtml = mime.html || '';
  }

  // Always combine plain text AND stripped HTML so rich HTML fare tables (like Delta's TICKET AMOUNT table) are always read in full!
  const htmlAsText = finalHtml ? stripHtml(finalHtml) : '';
  if (htmlAsText) {
    if (!finalText) {
      finalText = htmlAsText;
    } else if (!finalText.includes(htmlAsText.slice(0, 120))) {
      finalText = `${finalText}\n\n${htmlAsText}`;
    }
  }

  // 1. Schema.org JSON-LD
  const schemaResults = extractSchemaOrgReservations(finalHtml);
  if (schemaResults.length > 0) {
    return {
      subject: finalSubject,
      sender: finalSender,
      snippet: finalText.slice(0, 25000),
      reservations: schemaResults,
      parser_used: 'schema.org',
      confidence: 'high'
    };
  }

  // 2. Optional LLM Fallback if key is configured
  if (aiKey) {
    const llmResults = await extractWithLlmFallback(finalSubject, finalSender, finalText, aiKey, aiProvider);
    if (llmResults && llmResults.length > 0) {
      llmResults.forEach(r => {
        r.details = { ...(r.details || {}), full_email_text: finalText.slice(0, 25000) };
      });
      return {
        subject: finalSubject,
        sender: finalSender,
        snippet: finalText.slice(0, 25000),
        reservations: llmResults,
        parser_used: 'llm',
        confidence: 'high'
      };
    }
  }

  // 3. Deterministic Regex Extractor
  const regexResults = extractRegexReservations(finalSubject, finalSender, finalText);
  return {
    subject: finalSubject,
    sender: finalSender,
    snippet: finalText.slice(0, 25000),
    reservations: regexResults,
    parser_used: 'regex',
    confidence: regexResults.length > 0 && regexResults[0].confirmation_code ? 'medium' : 'low'
  };
}

// ---------------------------------------------------------------------------
// Zero-Dependency IMAP4rev1 Client (TLS / App Password)
// ---------------------------------------------------------------------------

class SimpleImapClient {
  constructor({ host, port = 993, secure = true }) {
    this.host = host;
    this.port = Number(port) || 993;
    this.secure = secure !== false;
    this.socket = null;
    this.buffer = Buffer.alloc(0);
    this.tagCounter = 0;
    this.pending = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      const opts = { host: this.host, port: this.port, servername: this.host };
      const onConnect = () => {
        this.pending = {
          tag: null,
          isGreeting: true,
          resolve,
          reject
        };
      };
      this.socket = this.secure
        ? tls.connect(opts, onConnect)
        : net.connect(opts, onConnect);

      this.socket.setTimeout(25000);
      this.socket.on('timeout', () => {
        if (this.pending) {
          this.pending.reject(new Error('IMAP connection timed out'));
          this.pending = null;
        }
        this.socket.destroy();
      });
      this.socket.on('error', err => {
        if (this.pending) {
          this.pending.reject(err);
          this.pending = null;
        }
      });
      this.socket.on('data', chunk => {
        this.buffer = Buffer.concat([this.buffer, chunk]);
        this._processBuffer();
      });
    });
  }

  _processBuffer() {
    if (!this.pending) return;
    const str = this.buffer.toString('latin1');
    if (this.pending.isGreeting) {
      const nl = str.indexOf('\r\n');
      if (nl !== -1) {
        const line = str.slice(0, nl);
        this.buffer = this.buffer.slice(nl + 2);
        const p = this.pending;
        this.pending = null;
        if (line.startsWith('* OK') || line.startsWith('* PREAUTH')) p.resolve(line);
        else p.reject(new Error('Unexpected IMAP greeting: ' + line));
      }
      return;
    }

    const tag = this.pending.tag;
    const tagRegex = new RegExp(`(?:^|\\r\\n)${tag} (OK|NO|BAD)([^\\r\\n]*)\\r\\n`);
    const m = str.match(tagRegex);
    if (m) {
      const endIdx = m.index + m[0].length;
      const payload = str.slice(0, m.index);
      this.buffer = this.buffer.slice(endIdx);
      const p = this.pending;
      this.pending = null;
      if (m[1] === 'OK') p.resolve({ status: m[1], message: m[2].trim(), payload });
      else p.reject(new Error(`IMAP ${m[1]}: ${m[2].trim()}`));
    }
  }

  command(cmd) {
    return new Promise((resolve, reject) => {
      const tag = `A${++this.tagCounter}`;
      this.pending = { tag, isGreeting: false, resolve, reject };
      this.socket.write(`${tag} ${cmd}\r\n`);
    });
  }

  close() {
    try { this.socket.end(); } catch (e) {}
  }
}

function escapeImapStr(s) {
  return '"' + String(s || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

async function syncImapInbox({ host, port, user, password, daysBack = 180 }) {
  const client = new SimpleImapClient({ host, port: Number(port) || 993, secure: true });
  await client.connect();
  try {
    await client.command(`LOGIN ${escapeImapStr(user)} ${escapeImapStr(password)}`);
    await client.command('SELECT INBOX');

    const sinceDate = new Date(Date.now() - daysBack * 86400 * 1000);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const sinceStr = `${sinceDate.getDate()}-${months[sinceDate.getMonth()]}-${sinceDate.getFullYear()}`;

    const searchRes = await client.command(
      `SEARCH SINCE ${sinceStr} OR SUBJECT "confirmation" OR SUBJECT "itinerary" OR SUBJECT "reservation" OR SUBJECT "booking" OR SUBJECT "receipt" SUBJECT "flight"`
    );
    const searchLine = searchRes.payload.split(/\r?\n/).find(l => l.startsWith('* SEARCH')) || '';
    const seqNums = searchLine.replace('* SEARCH', '').trim().split(/\s+/).filter(Boolean).slice(-25);

    const emails = [];
    for (const seq of seqNums) {
      const fetchRes = await client.command(`FETCH ${seq} (UID BODY.PEEK[])`);
      const uidMatch = fetchRes.payload.match(/UID (\d+)/);
      const uid = uidMatch ? `imap:${user}:${uidMatch[1]}` : `imap:${user}:${seq}`;
      const litMatch = fetchRes.payload.match(/\{(\d+)\}\r\n/);
      let rawEmail = '';
      if (litMatch) {
        const start = litMatch.index + litMatch[0].length;
        const len = parseInt(litMatch[1], 10);
        rawEmail = fetchRes.payload.slice(start, start + len);
      } else {
        rawEmail = fetchRes.payload;
      }
      emails.push({ uid, rawEmail });
    }
    try { await client.command('LOGOUT'); } catch (e) {}
    return emails;
  } finally {
    client.close();
  }
}

// ---------------------------------------------------------------------------
// Gmail OAuth 2.0 REST Sync
// ---------------------------------------------------------------------------

function getGmailAuthUrl({ clientId, redirectUri, state }) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
    access_type: 'offline',
    prompt: 'consent',
    state: state || ''
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function exchangeGmailCode({ code, clientId, clientSecret, redirectUri }) {
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error_description || data.error || 'Gmail token exchange failed');
  return data;
}

async function refreshGmailToken({ refreshToken, clientId, clientSecret }) {
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token'
    })
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error_description || data.error || 'Gmail token refresh failed');
  return data;
}

function extractGmailPayloadParts(payload, acc = { text: '', html: '' }) {
  if (!payload) return acc;
  if (payload.body && payload.body.data) {
    const decoded = Buffer.from(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    if ((payload.mimeType || '').includes('text/html')) acc.html += decoded;
    else if ((payload.mimeType || '').includes('text/plain')) acc.text += decoded;
  }
  if (Array.isArray(payload.parts)) {
    for (const p of payload.parts) extractGmailPayloadParts(p, acc);
  }
  return acc;
}

async function syncGmailInbox({ accessToken, daysBack = 180 }) {
  const q = encodeURIComponent(`newer_than:${daysBack}d (confirmation OR itinerary OR reservation OR booking OR e-ticket OR flight OR hotel OR receipt)`);
  const listResp = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${q}&maxResults=25`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const listData = await listResp.json();
  if (!listResp.ok) throw new Error((listData.error && listData.error.message) || 'Gmail list failed');
  const msgs = listData.messages || [];
  const emails = [];
  for (const m of msgs) {
    const msgResp = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=full`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const msgData = await msgResp.json();
    if (!msgResp.ok) continue;
    const hdrs = (msgData.payload && msgData.payload.headers) || [];
    const getHdr = name => (hdrs.find(h => h.name.toLowerCase() === name) || {}).value || '';
    const parts = extractGmailPayloadParts(msgData.payload);
    const htmlText = parts.html ? stripHtml(parts.html) : '';
    const fullText = [parts.text, htmlText].filter(Boolean).join('\n\n');
    emails.push({
      uid: `gmail:${m.id}`,
      subject: getHdr('subject'),
      sender: getHdr('from'),
      received_at: getHdr('date'),
      text: fullText,
      html: parts.html
    });
  }
  return emails;
}

// ---------------------------------------------------------------------------
// Travel Alerts & ICS Calendar Export
// ---------------------------------------------------------------------------

function formatIcsDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr.length === 10 ? `${isoStr}T09:00:00Z` : (isoStr.endsWith('Z') ? isoStr : isoStr + ':00Z'));
  if (isNaN(d.getTime())) return '';
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function escapeIcsText(str) {
  return String(str || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function generateIcs(reservations, calendarName = 'Wander Wallet Travel') {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Wander Wallet//Travel Itinerary//EN',
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`
  ];

  for (const r of reservations) {
    const dtStart = formatIcsDate(r.start_datetime);
    if (!dtStart) continue;
    const dtEnd = formatIcsDate(r.end_datetime) || dtStart;
    const descParts = [
      r.vendor ? `Vendor: ${r.vendor}` : '',
      r.confirmation_code ? `Confirmation: ${r.confirmation_code}` : '',
      r.location_from && r.location_to ? `Route: ${r.location_from} -> ${r.location_to}` : '',
      r.notes || ''
    ].filter(Boolean);

    lines.push(
      'BEGIN:VEVENT',
      `UID:${r.id}@wanderwallet`,
      `DTSTAMP:${formatIcsDate(new Date().toISOString())}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${escapeIcsText(r.title)}`,
      r.address || r.location_to ? `LOCATION:${escapeIcsText(r.address || r.location_to)}` : '',
      `DESCRIPTION:${escapeIcsText(descParts.join('\n'))}`,
      'END:VEVENT'
    );
  }
  lines.push('END:VCALENDAR');
  return lines.filter(Boolean).join('\r\n');
}

function analyzeTripAlerts(trip, reservations) {
  const alerts = [];
  const active = (reservations || []).filter(r => r.status !== 'cancelled').sort((a, b) =>
    String(a.start_datetime).localeCompare(String(b.start_datetime))
  );

  // 1. Cancellation deadlines within 7 days
  const nowMs = Date.now();
  for (const r of active) {
    if (r.cancel_deadline) {
      const dlMs = new Date(r.cancel_deadline).getTime();
      const daysLeft = Math.ceil((dlMs - nowMs) / 86400000);
      if (!isNaN(daysLeft) && daysLeft >= 0 && daysLeft <= 7) {
        alerts.push({
          severity: daysLeft <= 2 ? 'urgent' : 'warning',
          kind: 'cancel_deadline',
          message: `Free cancellation deadline in ${daysLeft === 0 ? 'today' : daysLeft + 'd'} for "${r.title}" (${r.cancel_deadline}).`
        });
      }
    }
  }

  // 2. Overlapping reservations & tight flight layovers
  for (let i = 0; i < active.length - 1; i++) {
    const cur = active[i];
    const next = active[i + 1];
    if (cur.type === 'hotel' || next.type === 'hotel') continue;
    const curEnd = cur.end_datetime ? new Date(cur.end_datetime).getTime() : 0;
    const nextStart = new Date(next.start_datetime).getTime();
    if (curEnd && nextStart) {
      const diffMins = Math.round((nextStart - curEnd) / 60000);
      if (diffMins < 0) {
        alerts.push({
          severity: 'warning',
          kind: 'overlap',
          message: `Schedule overlap between "${cur.title}" and "${next.title}".`
        });
      } else if (cur.type === 'flight' && next.type === 'flight' && diffMins > 0 && diffMins < 60) {
        alerts.push({
          severity: 'warning',
          kind: 'tight_layover',
          message: `Tight ${diffMins}-min layover between "${cur.title}" and "${next.title}".`
        });
      }
    }
  }

  // 3. Missing lodging nights for an active trip
  if (trip && trip.start_date && trip.end_date) {
    const hotels = active.filter(r => r.type === 'hotel' && r.start_datetime && r.end_datetime);
    if (hotels.length > 0) {
      const start = new Date(trip.start_date + 'T00:00:00Z');
      const end = new Date(trip.end_date + 'T00:00:00Z');
      const missingNights = [];
      for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
        const nightStr = d.toISOString().slice(0, 10);
        const covered = hotels.some(h => {
          const hIn = h.start_datetime.slice(0, 10);
          const hOut = h.end_datetime.slice(0, 10);
          return nightStr >= hIn && nightStr < hOut;
        });
        if (!covered) missingNights.push(nightStr);
      }
      if (missingNights.length > 0 && missingNights.length <= 10) {
        alerts.push({
          severity: 'info',
          kind: 'missing_lodging',
          message: `${missingNights.length} trip night(s) without lodging booked: ${missingNights.slice(0, 3).join(', ')}${missingNights.length > 3 ? '...' : ''}.`
        });
      }
    }
  }

  return alerts;
}

module.exports = {
  initTravelSchema,
  parseTravelEmail,
  parseIataCompactDate,
  formatTitleCaseName,
  syncImapInbox,
  getGmailAuthUrl,
  exchangeGmailCode,
  refreshGmailToken,
  syncGmailInbox,
  generateIcs,
  analyzeTripAlerts
};

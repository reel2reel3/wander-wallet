(function () {
  'use strict';

  const TYPE_META = {
    flight: { icon: '✈️', label: 'Flight', color: '#0ea5e9' },
    hotel: { icon: '🏨', label: 'Lodging', color: '#f59e0b' },
    car: { icon: '🚗', label: 'Rental Car', color: '#10b981' },
    transit: { icon: '🚄', label: 'Ground Transit', color: '#14b8a6' },
    dining: { icon: '🍽️', label: 'Dining', color: '#f97316' },
    activity: { icon: '🎟️', label: 'Activity / Tour', color: '#a855f7' },
    cruise: { icon: '🚢', label: 'Cruise / Ferry', color: '#06b6d4' },
    other: { icon: '📌', label: 'Other Booking', color: '#64748b' }
  };

  const DOC_META = {
    passport: { icon: '🛂', label: 'Passport' },
    visa: { icon: '📄', label: 'Visa / eTA' },
    ktn: { icon: '🛫', label: 'KTN / Global Entry / TSA' },
    insurance: { icon: '🛡️', label: 'Travel Insurance' },
    lounge: { icon: '🛋️', label: 'Lounge Pass' },
    drivers_license: { icon: '🪪', label: "Driver's License / IDP" },
    vaccination: { icon: '💉', label: 'Vaccination / Health' },
    other: { icon: '📁', label: 'Other Document' }
  };

  const travelState = {
    subTab: 'timeline', // 'timeline' | 'inbox' | 'vault'
    selectedTripId: 'all',
    searchQuery: '',
    hidePrintPrices: false
  };

  function bridge() {
    return window.WWAppBridge || null;
  }

  function esc(s) {
    if (bridge() && bridge().escapeHtml) return bridge().escapeHtml(s);
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function toast(msg) {
    if (bridge() && bridge().showToast) bridge().showToast(msg);
  }

  function getAppData() {
    const b = bridge();
    if (b && b.getState) {
      const s = b.getState();
      if (s && (Array.isArray(s.reservations) || Array.isArray(s.trips))) {
        return s;
      }
    }
    try {
      const cached = JSON.parse(localStorage.getItem('ww_travel_offline_cache') || '{}');
      return {
        trips: cached.trips || [],
        reservations: cached.reservations || [],
        travel_inbox: [],
        travel_documents: cached.travel_documents || [],
        email_sync_status: {},
        selectedTripId: 'all'
      };
    } catch (e) {
      return { trips: [], reservations: [], travel_inbox: [], travel_documents: [], email_sync_status: {} };
    }
  }

  async function travelApi(url, options = {}) {
    const opts = {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    };
    const resp = await fetch(url, opts);
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(data.error || `Request failed (${resp.status})`);
    }
    if (data.bootstrap && bridge() && bridge().applyBootstrapData) {
      bridge().applyBootstrapData(data.bootstrap);
    }
    return data;
  }

  function formatDateTimeShort(dt) {
    if (!dt) return '';
    const d = new Date(dt.length === 10 ? dt + 'T12:00:00' : dt);
    if (isNaN(d.getTime())) return dt;
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  function formatDayHeader(dateStr) {
    if (!dateStr) return 'Unscheduled';
    const d = new Date(dateStr + 'T12:00:00');
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }

  function computeAlerts(trip, reservations) {
    const alerts = [];
    const active = (reservations || [])
      .filter(r => r.status !== 'cancelled')
      .sort((a, b) => String(a.start_datetime).localeCompare(String(b.start_datetime)));

    const nowMs = Date.now();
    for (const r of active) {
      if (r.cancel_deadline) {
        const dlMs = new Date(r.cancel_deadline + 'T23:59:59').getTime();
        const daysLeft = Math.ceil((dlMs - nowMs) / 86400000);
        if (!isNaN(daysLeft) && daysLeft >= 0 && daysLeft <= 7) {
          alerts.push({
            severity: daysLeft <= 2 ? 'urgent' : 'warning',
            message: `Free cancellation deadline ${daysLeft === 0 ? 'TODAY' : 'in ' + daysLeft + 'd'} for "${r.title}" (${r.cancel_deadline}).`
          });
        }
      }
    }

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
            message: `Schedule overlap between "${cur.title}" and "${next.title}".`
          });
        } else if (cur.type === 'flight' && next.type === 'flight' && diffMins > 0 && diffMins < 60) {
          alerts.push({
            severity: 'warning',
            message: `Tight ${diffMins}-min layover between "${cur.title}" and "${next.title}".`
          });
        }
      }
    }

    if (trip && trip.start_date && trip.end_date) {
      const hotels = active.filter(r => r.type === 'hotel' && r.start_datetime && r.end_datetime);
      if (hotels.length > 0) {
        const start = new Date(trip.start_date + 'T00:00:00Z');
        const end = new Date(trip.end_date + 'T00:00:00Z');
        const missing = [];
        for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
          const nightStr = d.toISOString().slice(0, 10);
          const covered = hotels.some(h => nightStr >= h.start_datetime.slice(0, 10) && nightStr < h.end_datetime.slice(0, 10));
          if (!covered) missing.push(nightStr);
        }
        if (missing.length > 0 && missing.length <= 14) {
          alerts.push({
            severity: 'info',
            message: `${missing.length} night(s) without lodging booked: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '...' : ''}.`
          });
        }
      }
    }
    return alerts;
  }

  function updateBadges(s) {
    const badge = document.getElementById('badge-travel-count');
    if (badge) {
      const pendingCount = (s.travel_inbox || []).length;
      const resCount = (s.reservations || []).length;
      badge.textContent = pendingCount > 0 ? `${pendingCount} new` : String(resCount);
      badge.style.color = pendingCount > 0 ? 'var(--accent-amber)' : 'var(--accent-sky)';
    }
    const hubBadge = document.getElementById('badge-hub-count');
    if (hubBadge) {
      hubBadge.textContent = String((s.trips || []).length);
    }
    updateVisitedSidebarBadges(s);
  }

  // ---------------------------------------------------------------------------
  // Main Travel View Renderer
  // ---------------------------------------------------------------------------

  function render() {
    const container = document.getElementById('view-travel');
    if (!container) return;
    const s = getAppData();
    const trips = s.trips || [];
    const allRes = s.reservations || [];
    const inbox = s.travel_inbox || [];
    const docs = s.travel_documents || [];

    if (s.selectedTripId && s.selectedTripId !== 'all' && trips.some(t => t.id === s.selectedTripId)) {
      travelState.selectedTripId = s.selectedTripId;
    } else if (travelState.selectedTripId !== 'all' && !trips.some(t => t.id === travelState.selectedTripId)) {
      travelState.selectedTripId = 'all';
    }

    const activeLegPath = (travelState.selectedTripId !== 'all' && s.selectedTripId === travelState.selectedTripId) ? (s.selectedLegPath || '') : '';
    const filteredRes = allRes.filter(r => {
      if (travelState.selectedTripId !== 'all' && r.trip_id !== travelState.selectedTripId) return false;
      if (activeLegPath && bridge() && bridge().matchesLegFilter) {
        if (!bridge().matchesLegFilter(r.leg_path, activeLegPath)) return false;
      }
      if (travelState.searchQuery) {
        const q = travelState.searchQuery.toLowerCase();
        const hay = `${r.title} ${r.vendor} ${r.confirmation_code} ${r.location_from} ${r.location_to} ${r.address} ${r.leg_path || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => String(a.start_datetime).localeCompare(String(b.start_datetime)));

    const activeTrip = trips.find(t => t.id === travelState.selectedTripId) || null;
    const activeTripLegs = (activeTrip && bridge() && bridge().getTripLegs) ? bridge().getTripLegs(activeTrip) : [];
    const alerts = computeAlerts(activeTrip, filteredRes);
    const totalCommittedUsd = filteredRes.reduce((sum, r) => sum + (Number(r.cost_usd) || 0), 0);
    const totalPointsUsed = filteredRes.reduce((sum, r) => sum + (Number(r.points_used) || 0), 0);

    container.innerHTML = `
      <section class="panel-card travel-hero-card">
        <div class="panel-header" style="border-bottom: 1px solid var(--border-subtle); padding-bottom: 14px; flex-wrap: wrap; gap: 12px;">
          <div>
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--accent-sky); margin-bottom: 4px;">
              🗺️ FULL-STACK TRAVEL PLANNING &amp; EMAIL TRACKING
            </div>
            <h2 class="panel-title" style="font-size: 20px;">Travel &amp; Itinerary Command Center</h2>
            <p class="panel-subtitle" style="margin-top: 3px;">
              Track flights, hotels, ground transit, email confirmations, travel documents, and sync costs to your ledger.
            </p>
          </div>
          <div class="panel-actions" style="flex-wrap: wrap; gap: 8px;">
            <button type="button" class="btn btn-sm btn-primary" id="btn-travel-add-res">+ Add Reservation</button>
            <button type="button" class="btn btn-sm" id="btn-travel-quick-import">📥 Quick Import (Paste / .eml)</button>
            <button type="button" class="btn btn-sm" id="btn-travel-sync-inbox">🔄 Sync Email Inbox</button>
            <button type="button" class="btn btn-sm" id="btn-travel-export-ics">📅 Export .ics</button>
            <button type="button" class="btn btn-sm" id="btn-travel-print-sheet">🖨️ Print / Share</button>
          </div>
        </div>

        <!-- KPI Strip -->
        <div class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); margin-top: 14px;">
          <div class="kpi-card">
            <span class="kpi-label">Active Bookings</span>
            <span class="kpi-value mono">${filteredRes.length}</span>
            <span class="kpi-subtext">${activeTrip ? esc(activeTrip.name) : 'Across all trips'}</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-label">Committed Travel Cost</span>
            <span class="kpi-value mono" style="color: var(--accent-primary);">$${totalCommittedUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span class="kpi-subtext">${totalPointsUsed > 0 ? totalPointsUsed.toLocaleString() + ' pts used' : 'Cash & card bookings'}</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-label">Pending Email Inbox</span>
            <span class="kpi-value mono" style="color: ${inbox.length > 0 ? 'var(--accent-amber)' : 'var(--text-primary)'};">${inbox.length}</span>
            <span class="kpi-subtext">Ready for review</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-label">Document Vault</span>
            <span class="kpi-value mono">${docs.length}</span>
            <span class="kpi-subtext">Passports, visas &amp; passes</span>
          </div>
        </div>

        <!-- Filter & Sub-Navigation Bar -->
        <div class="travel-toolbar" style="margin-top: 14px;">
          <div class="rewards-subnav" style="margin: 0; padding: 0; border: none;">
            <button type="button" class="rewards-tab-btn ${travelState.subTab === 'timeline' ? 'active' : ''}" data-travel-tab="timeline">
              <span>🗓️</span><span>Timeline (${filteredRes.length})</span>
            </button>
            <button type="button" class="rewards-tab-btn ${travelState.subTab === 'inbox' ? 'active' : ''}" data-travel-tab="inbox">
              <span>📥</span><span>Email Inbox ${inbox.length > 0 ? '(' + inbox.length + ')' : ''}</span>
            </button>
            <button type="button" class="rewards-tab-btn ${travelState.subTab === 'vault' ? 'active' : ''}" data-travel-tab="vault">
              <span>🛂</span><span>Document Vault (${docs.length})</span>
            </button>
          </div>
          <div class="travel-filter-controls">
            <select id="travel-trip-filter" class="form-control" style="min-width: 190px;">
              <option value="all">All Trips (${allRes.length})</option>
              ${trips.map(t => `<option value="${esc(t.id)}" ${travelState.selectedTripId === t.id ? 'selected' : ''}>${esc(t.name)} (${esc(t.start_date)})</option>`).join('')}
            </select>
            <input type="search" id="travel-search-input" class="form-control" placeholder="Search confirmation #, airline, hotel..." value="${esc(travelState.searchQuery)}" style="min-width: 210px;" />
          </div>
        </div>
        ${activeTrip ? `
          <div class="trip-legs-bar" style="margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
              <span style="font-size: 11.5px; font-weight: 700; color: var(--text-secondary); margin-right: 4px;">🗺️ Trip Legs:</span>
              <button type="button" class="leg-filter-chip ${!activeLegPath ? 'active' : ''}" data-select-leg="">
                Entire Trip
              </button>
              ${activeTripLegs.map(l => `
                <button type="button" class="leg-filter-chip ${activeLegPath === l.path ? 'active' : ''}" data-select-leg="${esc(l.path)}">
                  ${l.parent ? '↳ ' : '📍 '}${esc(l.path)}
                </button>
              `).join('')}
            </div>
            <button type="button" class="btn btn-xs" data-manage-trip-legs="${esc(activeTrip.id)}">+ Add / Edit Legs</button>
          </div>
        ` : ''}
      </section>

      ${alerts.length > 0 && travelState.subTab === 'timeline' ? `
        <div class="travel-alerts-stack">
          ${alerts.map(a => `
            <div class="travel-alert-item travel-alert-${a.severity}">
              <span>${a.severity === 'urgent' ? '🚨' : a.severity === 'warning' ? '⚠️' : 'ℹ️'}</span>
              <span>${esc(a.message)}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div id="travel-subview-body" style="margin-top: 16px;">
        ${travelState.subTab === 'timeline' ? renderTimelineHtml(filteredRes, trips) : ''}
        ${travelState.subTab === 'inbox' ? renderInboxHtml(inbox, trips) : ''}
        ${travelState.subTab === 'vault' ? renderVaultHtml(docs) : ''}
      </div>
    `;

    bindTravelViewEvents(container);
  }

  function renderTimelineHtml(reservations, trips) {
    if (reservations.length === 0) {
      return `
        <section class="panel-card" style="text-align: center; padding: 40px 20px;">
          <div style="font-size: 36px; margin-bottom: 10px;">🧳</div>
          <h3 style="margin-bottom: 6px;">No reservations yet</h3>
          <p style="color: var(--text-secondary); max-width: 460px; margin: 0 auto 18px;">
            Add a flight, hotel, rental car, or activity manually, paste a confirmation email, or sync your Gmail/IMAP inbox.
          </p>
          <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
            <button type="button" class="btn btn-primary" onclick="window.WWTravel.openReservationModal()">+ Add Reservation</button>
            <button type="button" class="btn" onclick="window.WWTravel.openQuickImportModal()">📥 Paste Confirmation Email</button>
          </div>
        </section>
      `;
    }

    // Group by date
    const groups = new Map();
    for (const r of reservations) {
      const dayKey = (r.start_datetime || '').slice(0, 10) || 'unscheduled';
      if (!groups.has(dayKey)) groups.set(dayKey, []);
      groups.get(dayKey).push(r);
    }

    let html = '<div class="travel-timeline">';
    for (const [dayKey, items] of groups.entries()) {
      html += `
        <div class="travel-day-group">
          <div class="travel-day-header">
            <span class="travel-day-pill">📅 ${esc(formatDayHeader(dayKey))}</span>
            <span class="travel-day-count">${items.length} booking${items.length > 1 ? 's' : ''}</span>
          </div>
          <div class="travel-day-cards">
      `;
      for (const r of items) {
        const meta = TYPE_META[r.type] || TYPE_META.other;
        const tripObj = trips.find(t => t.id === r.trip_id);
        let details = {};
        try { details = JSON.parse(r.details_json || '{}'); } catch (e) {}

        const detailChips = [];
        if (details.flight_number) detailChips.push(`✈️ ${details.flight_number}`);
        if (details.terminal) detailChips.push(`Terminal ${details.terminal}`);
        if (details.gate) detailChips.push(`Gate ${details.gate}`);
        if (details.seat) detailChips.push(`Seat ${details.seat}`);
        if (details.cabin) detailChips.push(details.cabin);
        if (details.room_type) detailChips.push(`🛏️ ${details.room_type}`);
        if (details.car_class) detailChips.push(`🚘 ${details.car_class}`);
        if (details.party_size) detailChips.push(`👥 Party of ${details.party_size}`);

        const mapQuery = encodeURIComponent(r.address || r.location_to || r.vendor || r.title);
        const hasSyncedExpense = Boolean(r.linked_expense_id);

        html += `
          <article class="panel-card travel-res-card" style="border-left: 4px solid ${meta.color};">
            <div class="travel-res-top">
              <div class="travel-res-title-wrap">
                <span class="travel-type-badge" style="background: ${meta.color}22; color: ${meta.color};">
                  ${meta.icon} ${meta.label}
                </span>
                ${tripObj ? `<span class="travel-trip-pill">🧳 ${esc(tripObj.name)}</span>` : ''}
                ${r.leg_path ? `<span class="travel-trip-pill" style="background: rgba(16,185,129,0.12); color: var(--accent-primary);">📍 ${esc(r.leg_path)}</span>` : ''}
                ${r.status && r.status !== 'confirmed' ? `<span class="travel-status-pill status-${esc(r.status)}">${esc(r.status)}</span>` : ''}
              </div>
              <div class="travel-res-actions">
                ${r.confirmation_code ? `
                  <button type="button" class="travel-conf-chip" data-copy-conf="${esc(r.confirmation_code)}" title="Click to copy confirmation code">
                    <span>Conf:</span> <strong class="mono">${esc(r.confirmation_code)}</strong> 📋
                  </button>
                ` : ''}
              </div>
            </div>

            <div class="travel-res-main">
              <div>
                <h3 class="travel-res-title">${esc(r.title)}</h3>
                <div class="travel-res-sub">
                  ${r.vendor ? `<span>🏢 ${esc(r.vendor)}</span>` : ''}
                  <span>🕒 ${esc(formatDateTimeShort(r.start_datetime))}${r.end_datetime ? ' → ' + esc(formatDateTimeShort(r.end_datetime)) : ''}</span>
                  ${r.location_from || r.location_to ? `<span>📍 ${esc(r.location_from)}${r.location_from && r.location_to ? ' → ' : ''}${esc(r.location_to)}</span>` : ''}
                </div>
                ${r.address ? `
                  <div style="margin-top: 4px; font-size: 12.5px;">
                    <a href="https://maps.google.com/?q=${mapQuery}" target="_blank" rel="noopener" style="color: var(--accent-sky); text-decoration: none;">
                      🗺️ ${esc(r.address)} ↗
                    </a>
                  </div>
                ` : ''}
              </div>

              <div class="travel-res-cost-col">
                ${Number(r.cost_usd) > 0 ? `
                  <div class="mono" style="font-size: 15px; font-weight: 700; color: var(--text-primary);">
                    $${Number(r.cost_usd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div style="font-size: 11px; color: var(--text-secondary);">
                    ${r.cost_currency !== 'USD' ? `${Number(r.cost_amount).toLocaleString()} ${esc(r.cost_currency)}` : (r.payment_method ? esc(r.payment_method) : 'Total Cost')}
                  </div>
                ` : ''}
                ${Number(r.points_used) > 0 ? `<div style="font-size: 11.5px; color: var(--accent-amber); font-weight: 600;">💎 ${Number(r.points_used).toLocaleString()} pts redeemed</div>` : ''}
                ${Number(r.points_earned) > 0 ? `<div style="font-size: 11.5px; color: var(--accent-primary);">+${Number(r.points_earned).toLocaleString()} pts earned</div>` : ''}
              </div>
            </div>

            ${detailChips.length > 0 ? `
              <div class="travel-detail-chips">
                ${detailChips.map(c => `<span class="travel-detail-chip">${esc(c)}</span>`).join('')}
              </div>
            ` : ''}

            ${r.cancel_deadline ? `
              <div style="font-size: 12px; color: var(--accent-amber); margin-top: 6px;">
                ⏳ Free cancellation deadline: <strong>${esc(r.cancel_deadline)}</strong>
              </div>
            ` : ''}

            ${r.notes ? `<div style="font-size: 12.5px; color: var(--text-secondary); margin-top: 6px;">${esc(r.notes)}</div>` : ''}

            <div class="travel-res-footer">
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                ${(Number(r.cost_usd) > 0 || Number(r.points_used) > 0 || Number(r.points_earned) > 0) ? `
                  <button type="button" class="btn btn-xs ${hasSyncedExpense ? '' : 'btn-primary'}" data-sync-finance="${esc(r.id)}">
                    ${hasSyncedExpense ? '✓ Synced to Ledger (Re-sync)' : '💳 Sync to Expenses & Rewards'}
                  </button>
                ` : ''}
                ${r.attachment_data ? `
                  <button type="button" class="btn btn-xs" data-view-att="${esc(r.id)}">📎 ${esc(r.attachment_name || 'View Ticket')}</button>
                ` : ''}
                <a class="btn btn-xs" href="/api/travel/export/ics?reservationId=${encodeURIComponent(r.id)}">📅 .ics</a>
              </div>
              <div style="display: flex; gap: 6px;">
                <button type="button" class="btn btn-xs" data-edit-res="${esc(r.id)}">✏️ Edit</button>
                <button type="button" class="btn btn-xs btn-danger" data-del-res="${esc(r.id)}">🗑️</button>
              </div>
            </div>
          </article>
        `;
      }
      html += '</div></div>';
    }
    html += '</div>';
    return html;
  }

  function renderInboxHtml(inbox, trips) {
    if (inbox.length === 0) {
      return `
        <section class="panel-card" style="text-align: center; padding: 40px 20px;">
          <div style="font-size: 36px; margin-bottom: 10px;">📭</div>
          <h3 style="margin-bottom: 6px;">Pending Email Inbox is clear</h3>
          <p style="color: var(--text-secondary); max-width: 480px; margin: 0 auto 18px;">
            Connect Gmail OAuth or IMAP in <strong>Admin</strong> to auto-pull confirmation emails, or use <strong>Quick Import</strong> to paste any confirmation email.
          </p>
          <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
            <button type="button" class="btn btn-primary" onclick="window.WWTravel.syncInbox()">🔄 Sync Email Inbox Now</button>
            <button type="button" class="btn" onclick="window.WWTravel.openQuickImportModal()">📥 Paste Email / .eml</button>
          </div>
        </section>
      `;
    }

    return `
      <div style="display: grid; gap: 14px;">
        ${inbox.map(item => {
          let parsed = [];
          try { parsed = JSON.parse(item.parsed_json || '[]'); } catch (e) {}
          const first = parsed[0] || {};
          return `
            <article class="panel-card">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap;">
                <div>
                  <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <span class="travel-type-badge" style="background: rgba(14,165,233,0.15); color: var(--accent-sky);">
                      Parser: ${esc(item.parser_used)} (${esc(item.confidence)})
                    </span>
                    <span style="font-size: 12px; color: var(--text-secondary);">From: ${esc(item.sender)}</span>
                  </div>
                  <h3 style="margin: 6px 0 4px;">${esc(item.subject || 'Travel Confirmation')}</h3>
                  <p style="font-size: 12.5px; color: var(--text-secondary); margin: 0;">${esc((item.raw_snippet || '').slice(0, 220))}</p>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px; min-width: 230px;">
                  <select class="form-control" data-inbox-trip="${esc(item.id)}">
                    <option value="">(Unassigned / No Trip)</option>
                    ${trips.map(t => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('')}
                  </select>
                  <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                    <button type="button" class="btn btn-sm btn-primary" data-inbox-approve="${esc(item.id)}">✓ Approve &amp; Add (${parsed.length || 1})</button>
                    <button type="button" class="btn btn-sm" data-inbox-edit="${esc(item.id)}">✏️ Edit First</button>
                    <button type="button" class="btn btn-sm btn-danger" data-inbox-dismiss="${esc(item.id)}">✕</button>
                  </div>
                </div>
              </div>
              ${parsed.length > 0 ? `
                <div class="travel-inbox-preview">
                  ${parsed.map(p => `
                    <div class="travel-inbox-cand">
                      <strong>${(TYPE_META[p.type] || TYPE_META.other).icon} ${esc(p.title || 'Booking')}</strong>
                      ${p.confirmation_code ? `<span class="mono">Conf: ${esc(p.confirmation_code)}</span>` : ''}
                      ${p.start_datetime ? `<span>${esc(formatDateTimeShort(p.start_datetime))}</span>` : ''}
                      ${Number(p.cost_amount) > 0 ? `<span class="mono">${esc(p.cost_currency || 'USD')} ${Number(p.cost_amount).toFixed(2)}</span>` : ''}
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </article>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderVaultHtml(docs) {
    return `
      <section class="panel-card">
        <div class="panel-header" style="margin-bottom: 14px;">
          <div>
            <h3 class="panel-title">Travel Document Vault</h3>
            <p class="panel-subtitle">Store Passports, Visas, KTN / Global Entry, Travel Insurance &amp; Lounge Passes offline-ready.</p>
          </div>
          <button type="button" class="btn btn-sm btn-primary" id="btn-travel-add-doc">+ Add Document</button>
        </div>
        ${docs.length === 0 ? `
          <div style="text-align: center; padding: 30px 10px; color: var(--text-secondary);">
            No travel documents saved yet. Click <strong>+ Add Document</strong> to store your passport, KTN, or insurance policy.
          </div>
        ` : `
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 14px;">
            ${docs.map(d => {
              const meta = DOC_META[d.doc_type] || DOC_META.other;
              let expiryHtml = '';
              if (d.expiry_date) {
                const days = Math.ceil((new Date(d.expiry_date + 'T23:59:59').getTime() - Date.now()) / 86400000);
                const col = days < 0 ? '#ef4444' : days <= 180 ? '#f59e0b' : '#10b981';
                expiryHtml = `<span style="font-size: 11.5px; font-weight: 600; color: ${col};">Exp: ${esc(d.expiry_date)} (${days < 0 ? 'EXPIRED' : days + 'd left'})</span>`;
              }
              return `
                <article class="panel-card" style="background: var(--bg-elevated); padding: 14px;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                    <span class="travel-type-badge">${meta.icon} ${meta.label}</span>
                    ${expiryHtml}
                  </div>
                  <h4 style="margin: 8px 0 4px;">${esc(d.title)}</h4>
                  ${d.holder_name ? `<div style="font-size: 12px; color: var(--text-secondary);">Holder: ${esc(d.holder_name)}</div>` : ''}
                  ${d.doc_number ? `
                    <div style="margin-top: 8px;">
                      <button type="button" class="travel-conf-chip" data-copy-conf="${esc(d.doc_number)}">
                        <span>#</span> <strong class="mono">${esc(d.doc_number)}</strong> 📋
                      </button>
                    </div>
                  ` : ''}
                  ${d.issuing_country ? `<div style="font-size: 12px; color: var(--text-secondary); margin-top: 6px;">Country: ${esc(d.issuing_country)}</div>` : ''}
                  ${d.notes ? `<div style="font-size: 12px; color: var(--text-secondary); margin-top: 6px;">${esc(d.notes)}</div>` : ''}
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 8px; border-top: 1px solid var(--border-subtle);">
                    ${d.attachment_data ? `<button type="button" class="btn btn-xs" data-view-doc-att="${esc(d.id)}">📎 ${esc(d.attachment_name || 'View File')}</button>` : '<span></span>'}
                    <div style="display: flex; gap: 6px;">
                      <button type="button" class="btn btn-xs" data-edit-doc="${esc(d.id)}">✏️</button>
                      <button type="button" class="btn btn-xs btn-danger" data-del-doc="${esc(d.id)}">🗑️</button>
                    </div>
                  </div>
                </article>
              `;
            }).join('')}
          </div>
        `}
      </section>
    `;
  }

  function bindTravelViewEvents(container) {
    container.querySelectorAll('[data-travel-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        travelState.subTab = btn.getAttribute('data-travel-tab');
        render();
      });
    });

    const tripSel = container.querySelector('#travel-trip-filter');
    if (tripSel) {
      tripSel.addEventListener('change', () => {
        travelState.selectedTripId = tripSel.value;
        if (bridge() && bridge().setSelectedTrip) {
          bridge().setSelectedTrip(tripSel.value);
        } else {
          render();
        }
      });
    }

    const searchInput = container.querySelector('#travel-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        travelState.searchQuery = searchInput.value;
        render();
        const nextInput = document.getElementById('travel-search-input');
        if (nextInput) {
          nextInput.focus();
          nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
        }
      });
    }

    const btnAdd = container.querySelector('#btn-travel-add-res');
    if (btnAdd) btnAdd.addEventListener('click', () => openReservationModal());

    const btnQuick = container.querySelector('#btn-travel-quick-import');
    if (btnQuick) btnQuick.addEventListener('click', () => openQuickImportModal());

    const btnSync = container.querySelector('#btn-travel-sync-inbox');
    if (btnSync) btnSync.addEventListener('click', () => syncInbox());

    const btnIcs = container.querySelector('#btn-travel-export-ics');
    if (btnIcs) {
      btnIcs.addEventListener('click', () => {
        window.location.href = `/api/travel/export/ics?tripId=${encodeURIComponent(travelState.selectedTripId)}`;
      });
    }

    const btnPrint = container.querySelector('#btn-travel-print-sheet');
    if (btnPrint) btnPrint.addEventListener('click', () => openPrintModal());

    const btnAddDoc = container.querySelector('#btn-travel-add-doc');
    if (btnAddDoc) btnAddDoc.addEventListener('click', () => openDocumentModal());

    container.querySelectorAll('[data-copy-conf]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const val = btn.getAttribute('data-copy-conf');
        try {
          await navigator.clipboard.writeText(val);
          toast(`Copied "${val}" to clipboard`);
        } catch (e) {
          toast(`Code: ${val}`);
        }
      });
    });

    container.querySelectorAll('[data-edit-res]').forEach(btn => {
      btn.addEventListener('click', () => {
        const s = getAppData();
        const r = (s.reservations || []).find(x => x.id === btn.getAttribute('data-edit-res'));
        if (r) openReservationModal(r);
      });
    });

    container.querySelectorAll('[data-del-res]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this reservation?')) return;
        try {
          await travelApi(`/api/travel/reservations/${encodeURIComponent(btn.getAttribute('data-del-res'))}`, { method: 'DELETE' });
          toast('Reservation deleted');
          render();
        } catch (e) { toast(e.message); }
      });
    });

    container.querySelectorAll('[data-sync-finance]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-sync-finance');
        try {
          await travelApi(`/api/travel/reservations/${encodeURIComponent(id)}/sync-finance`, {
            method: 'POST',
            body: JSON.stringify({ createExpense: true, syncRewards: true })
          });
          toast('✓ Synced to Expenses & Rewards!');
          render();
        } catch (e) { toast(e.message); }
      });
    });

    container.querySelectorAll('[data-view-att]').forEach(btn => {
      btn.addEventListener('click', () => {
        const s = getAppData();
        const r = (s.reservations || []).find(x => x.id === btn.getAttribute('data-view-att'));
        if (r && r.attachment_data) openAttachmentModal(r.attachment_name || r.title, r.attachment_data);
      });
    });

    // Inbox actions
    container.querySelectorAll('[data-inbox-approve]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-inbox-approve');
        const sel = container.querySelector(`[data-inbox-trip="${id}"]`);
        const tripId = sel ? sel.value : '';
        try {
          await travelApi(`/api/travel/inbox/${encodeURIComponent(id)}/import`, {
            method: 'POST',
            body: JSON.stringify({ trip_id: tripId })
          });
          toast('✓ Reservation(s) added to itinerary!');
          travelState.subTab = 'timeline';
          render();
        } catch (e) { toast(e.message); }
      });
    });

    container.querySelectorAll('[data-inbox-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-inbox-edit');
        const s = getAppData();
        const item = (s.travel_inbox || []).find(x => x.id === id);
        if (!item) return;
        let parsed = [];
        try { parsed = JSON.parse(item.parsed_json || '[]'); } catch (e) {}
        const cand = parsed[0] || { title: item.subject };
        const sel = container.querySelector(`[data-inbox-trip="${id}"]`);
        openReservationModal({
          ...cand,
          trip_id: sel ? sel.value : '',
          details_json: JSON.stringify(cand.details || {}),
          _inboxId: id
        });
      });
    });

    container.querySelectorAll('[data-inbox-dismiss]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-inbox-dismiss');
        try {
          await travelApi(`/api/travel/inbox/${encodeURIComponent(id)}/dismiss`, { method: 'POST' });
          toast('Inbox item dismissed');
          render();
        } catch (e) { toast(e.message); }
      });
    });

    // Vault actions
    container.querySelectorAll('[data-edit-doc]').forEach(btn => {
      btn.addEventListener('click', () => {
        const s = getAppData();
        const doc = (s.travel_documents || []).find(x => x.id === btn.getAttribute('data-edit-doc'));
        if (doc) openDocumentModal(doc);
      });
    });

    container.querySelectorAll('[data-del-doc]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this travel document?')) return;
        try {
          await travelApi(`/api/travel/documents/${encodeURIComponent(btn.getAttribute('data-del-doc'))}`, { method: 'DELETE' });
          toast('Document deleted');
          render();
        } catch (e) { toast(e.message); }
      });
    });

    container.querySelectorAll('[data-view-doc-att]').forEach(btn => {
      btn.addEventListener('click', () => {
        const s = getAppData();
        const d = (s.travel_documents || []).find(x => x.id === btn.getAttribute('data-view-doc-att'));
        if (d && d.attachment_data) openAttachmentModal(d.attachment_name || d.title, d.attachment_data);
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Modals (Dynamic Overlay)
  // ---------------------------------------------------------------------------

  function showTravelModal(title, bodyHtml) {
    closeTravelModal();
    const backdrop = document.createElement('div');
    backdrop.id = 'ww-travel-modal-backdrop';
    backdrop.className = 'modal-backdrop';
    backdrop.style.display = 'flex';
    backdrop.innerHTML = `
      <div class="modal-card" style="max-width: 680px; width: 95%; max-height: 90vh; overflow-y: auto;">
        <div class="modal-header">
          <h3>${esc(title)}</h3>
          <button type="button" class="modal-close" id="ww-travel-modal-close">&times;</button>
        </div>
        <div class="modal-body">${bodyHtml}</div>
      </div>
    `;
    document.body.appendChild(backdrop);
    backdrop.querySelector('#ww-travel-modal-close').addEventListener('click', closeTravelModal);
    backdrop.addEventListener('click', e => {
      if (e.target === backdrop) closeTravelModal();
    });
    return backdrop;
  }

  function closeTravelModal() {
    const el = document.getElementById('ww-travel-modal-backdrop');
    if (el) el.remove();
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function openReservationModal(existing = null) {
    const s = getAppData();
    const trips = s.trips || [];
    const isEdit = Boolean(existing && existing.id);
    let details = {};
    try { details = JSON.parse((existing && existing.details_json) || '{}'); } catch (e) {}
    const defaultTrip = (existing && existing.trip_id) || (travelState.selectedTripId !== 'all' ? travelState.selectedTripId : (trips[0] ? trips[0].id : ''));
    const defaultLegPath = (existing && existing.leg_path) !== undefined ? (existing.leg_path || '') : (s.selectedLegPath || '');

    const modal = showTravelModal(isEdit ? 'Edit Reservation' : 'Add Travel Reservation', `
      <form id="ww-res-form" style="display: grid; gap: 12px;">
        <div style="display: grid; grid-template-columns: 0.9fr 1.1fr 1.1fr; gap: 10px;">
          <div>
            <label class="form-label">Type</label>
            <select name="type" class="form-control">
              ${Object.entries(TYPE_META).map(([k, v]) => `<option value="${k}" ${(existing && existing.type === k) ? 'selected' : ''}>${v.icon} ${v.label}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="form-label">Trip</label>
            <select name="trip_id" id="ww-res-trip-sel" class="form-control">
              <option value="">(Unassigned)</option>
              ${trips.map(t => `<option value="${esc(t.id)}" ${defaultTrip === t.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="form-label">Trip Leg / Sub-Location</label>
            <select name="leg_path" id="ww-res-leg-sel" class="form-control"></select>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 10px;">
          <div>
            <label class="form-label">Title *</label>
            <input name="title" class="form-control" required placeholder="e.g. Delta DL120 JFK → CDG or Park Hyatt Paris" value="${esc((existing && existing.title) || '')}" />
          </div>
          <div>
            <label class="form-label">Confirmation #</label>
            <input name="confirmation_code" class="form-control mono" placeholder="ABC123" value="${esc((existing && existing.confirmation_code) || '')}" />
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
          <div>
            <label class="form-label">Vendor / Airline / Hotel</label>
            <input name="vendor" class="form-control" placeholder="Delta, Marriott, Hertz" value="${esc((existing && existing.vendor) || '')}" />
          </div>
          <div>
            <label class="form-label">Start Date &amp; Time *</label>
            <input type="datetime-local" name="start_datetime" class="form-control" required value="${esc(((existing && existing.start_datetime) || new Date().toISOString().slice(0, 16)).slice(0, 16))}" />
          </div>
          <div>
            <label class="form-label">End / Check-out</label>
            <input type="datetime-local" name="end_datetime" class="form-control" value="${esc(((existing && existing.end_datetime) || '').slice(0, 16))}" />
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1.4fr; gap: 10px;">
          <div>
            <label class="form-label">From (Airport / Pickup)</label>
            <input name="location_from" class="form-control" placeholder="JFK" value="${esc((existing && existing.location_from) || '')}" />
          </div>
          <div>
            <label class="form-label">To (Airport / City)</label>
            <input name="location_to" class="form-control" placeholder="CDG" value="${esc((existing && existing.location_to) || '')}" />
          </div>
          <div>
            <label class="form-label">Address / Venue</label>
            <input name="address" class="form-control" placeholder="Street address for map link" value="${esc((existing && existing.address) || '')}" />
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
          <div>
            <label class="form-label">Flight # / Room</label>
            <input name="detail_primary" class="form-control" placeholder="DL120 / King" value="${esc(details.flight_number || details.room_type || details.car_class || '')}" />
          </div>
          <div>
            <label class="form-label">Terminal / Gate</label>
            <input name="detail_terminal" class="form-control" placeholder="T4 / B22" value="${esc([details.terminal, details.gate].filter(Boolean).join(' '))}" />
          </div>
          <div>
            <label class="form-label">Seat / Cabin</label>
            <input name="detail_seat" class="form-control" placeholder="14A / Business" value="${esc([details.seat, details.cabin].filter(Boolean).join(' / '))}" />
          </div>
          <div>
            <label class="form-label">Cancel Deadline</label>
            <input type="date" name="cancel_deadline" class="form-control" value="${esc((existing && existing.cancel_deadline) || '')}" />
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 0.7fr 1.2fr; gap: 10px;">
          <div>
            <label class="form-label">Cost Amount</label>
            <input type="number" step="0.01" name="cost_amount" class="form-control" value="${Number((existing && existing.cost_amount) || 0)}" />
          </div>
          <div>
            <label class="form-label">Currency</label>
            <input name="cost_currency" class="form-control" value="${esc((existing && existing.cost_currency) || 'USD')}" />
          </div>
          <div>
            <label class="form-label">Payment Card</label>
            <input name="payment_method" class="form-control" placeholder="Amex Platinum" value="${esc((existing && existing.payment_method) || '')}" />
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1.2fr; gap: 10px;">
          <div>
            <label class="form-label">Points Used</label>
            <input type="number" name="points_used" class="form-control" value="${Number((existing && existing.points_used) || 0)}" />
          </div>
          <div>
            <label class="form-label">Points Earned</label>
            <input type="number" name="points_earned" class="form-control" value="${Number((existing && existing.points_earned) || 0)}" />
          </div>
          <div>
            <label class="form-label">Loyalty Program</label>
            <input name="loyalty_program" class="form-control" placeholder="Marriott Bonvoy, Delta" value="${esc((existing && existing.loyalty_program) || '')}" />
          </div>
        </div>

        <div>
          <label class="form-label">Ticket / Boarding Pass / Confirmation (PDF or Image)</label>
          <input type="file" id="ww-res-file" class="form-control" accept="image/*,application/pdf" />
        </div>

        <div>
          <label class="form-label">Notes</label>
          <textarea name="notes" class="form-control" rows="2">${esc((existing && existing.notes) || '')}</textarea>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px;">
          <button type="button" class="btn" id="ww-res-cancel">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Save Reservation'}</button>
        </div>
      </form>
    `);

    const resTripSel = modal.querySelector('#ww-res-trip-sel');
    const resLegSel = modal.querySelector('#ww-res-leg-sel');
    const syncResLegs = (selectedPath) => {
      const tripObj = trips.find(t => t.id === resTripSel.value);
      const legs = (tripObj && bridge() && bridge().getTripLegs) ? bridge().getTripLegs(tripObj) : [];
      resLegSel.innerHTML = `<option value="">(Entire Trip / No Leg)</option>` + legs.map(l => {
        const prefix = l.parent ? '\u00A0\u00A0└─ ' : '📍 ';
        return `<option value="${esc(l.path)}">${prefix}${esc(l.path)}</option>`;
      }).join('');
      resLegSel.value = legs.some(l => l.path === selectedPath) ? selectedPath : '';
    };
    syncResLegs(defaultLegPath);
    resTripSel.addEventListener('change', () => syncResLegs(''));

    modal.querySelector('#ww-res-cancel').addEventListener('click', closeTravelModal);
    modal.querySelector('#ww-res-form').addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const type = fd.get('type');
      const det = { ...details };
      const p1 = String(fd.get('detail_primary') || '').trim();
      if (type === 'flight') det.flight_number = p1;
      else if (type === 'hotel') det.room_type = p1;
      else if (type === 'car') det.car_class = p1;
      det.terminal = String(fd.get('detail_terminal') || '').trim();
      det.seat = String(fd.get('detail_seat') || '').trim();

      let attachment_data = (existing && existing.attachment_data) || '';
      let attachment_name = (existing && existing.attachment_name) || '';
      const fileInput = modal.querySelector('#ww-res-file');
      if (fileInput && fileInput.files && fileInput.files[0]) {
        attachment_name = fileInput.files[0].name;
        attachment_data = await readFileAsDataUrl(fileInput.files[0]);
      }

      const payload = {
        trip_id: fd.get('trip_id'),
        leg_path: fd.get('leg_path') || '',
        type,
        title: fd.get('title'),
        vendor: fd.get('vendor'),
        confirmation_code: fd.get('confirmation_code'),
        start_datetime: fd.get('start_datetime'),
        end_datetime: fd.get('end_datetime'),
        location_from: fd.get('location_from'),
        location_to: fd.get('location_to'),
        address: fd.get('address'),
        cancel_deadline: fd.get('cancel_deadline'),
        cost_amount: Number(fd.get('cost_amount')) || 0,
        cost_currency: fd.get('cost_currency') || 'USD',
        payment_method: fd.get('payment_method'),
        points_used: Number(fd.get('points_used')) || 0,
        points_earned: Number(fd.get('points_earned')) || 0,
        loyalty_program: fd.get('loyalty_program'),
        notes: fd.get('notes'),
        details: det,
        attachment_data,
        attachment_name
      };

      try {
        if (isEdit) {
          await travelApi(`/api/travel/reservations/${encodeURIComponent(existing.id)}`, { method: 'PUT', body: JSON.stringify(payload) });
          toast('✓ Reservation updated');
        } else {
          await travelApi('/api/travel/reservations', { method: 'POST', body: JSON.stringify(payload) });
          if (existing && existing._inboxId) {
            await travelApi(`/api/travel/inbox/${encodeURIComponent(existing._inboxId)}/dismiss`, { method: 'POST' });
          }
          toast('✓ Reservation added');
        }
        closeTravelModal();
        travelState.subTab = 'timeline';
        render();
      } catch (err) { toast(err.message); }
    });
  }

  function openQuickImportModal() {
    const modal = showTravelModal('Quick Import Confirmation Email / .eml', `
      <div style="display: grid; gap: 12px;">
        <p style="font-size: 13px; color: var(--text-secondary); margin: 0;">
          Paste the text of any airline, hotel, rental car, or restaurant confirmation email — or upload a saved <code>.eml</code> file.
        </p>
        <div>
          <label class="form-label">Upload .eml Email File (Optional)</label>
          <input type="file" id="ww-eml-file" class="form-control" accept=".eml,.txt,.html" />
        </div>
        <div>
          <label class="form-label">Subject (Optional)</label>
          <input type="text" id="ww-paste-subject" class="form-control" placeholder="e.g. Your Delta Flight Confirmation" />
        </div>
        <div>
          <label class="form-label">Paste Confirmation Text</label>
          <textarea id="ww-paste-body" class="form-control" rows="7" placeholder="Paste email confirmation here..."></textarea>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 8px;">
          <button type="button" class="btn" id="ww-paste-cancel">Cancel</button>
          <button type="button" class="btn btn-primary" id="ww-paste-submit">Parse &amp; Queue in Inbox</button>
        </div>
      </div>
    `);

    modal.querySelector('#ww-paste-cancel').addEventListener('click', closeTravelModal);
    modal.querySelector('#ww-eml-file').addEventListener('change', async e => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const txt = await file.text();
      modal.querySelector('#ww-paste-body').value = txt;
    });
    modal.querySelector('#ww-paste-submit').addEventListener('click', async () => {
      const bodyText = modal.querySelector('#ww-paste-body').value.trim();
      const subject = modal.querySelector('#ww-paste-subject').value.trim();
      if (!bodyText) return toast('Please paste confirmation text or upload an .eml file.');
      const isRawEml = /^(Return-Path:|Received:|MIME-Version:|From:|Subject:)/im.test(bodyText);
      try {
        await travelApi('/api/travel/parse', {
          method: 'POST',
          body: JSON.stringify({
            rawEmail: isRawEml ? bodyText : '',
            text: isRawEml ? '' : bodyText,
            subject,
            queueInInbox: true
          })
        });
        toast('✓ Parsed & added to Pending Email Inbox!');
        closeTravelModal();
        travelState.subTab = 'inbox';
        render();
      } catch (err) { toast(err.message); }
    });
  }

  function openDocumentModal(existing = null) {
    const isEdit = Boolean(existing && existing.id);
    const modal = showTravelModal(isEdit ? 'Edit Travel Document' : 'Add Travel Document', `
      <form id="ww-doc-form" style="display: grid; gap: 12px;">
        <div style="display: grid; grid-template-columns: 1fr 1.5fr; gap: 10px;">
          <div>
            <label class="form-label">Document Type</label>
            <select name="doc_type" class="form-control">
              ${Object.entries(DOC_META).map(([k, v]) => `<option value="${k}" ${(existing && existing.doc_type === k) ? 'selected' : ''}>${v.icon} ${v.label}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="form-label">Title *</label>
            <input name="title" class="form-control" required placeholder="e.g. US Passport or Global Entry" value="${esc((existing && existing.title) || '')}" />
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div>
            <label class="form-label">Document / Policy #</label>
            <input name="doc_number" class="form-control mono" value="${esc((existing && existing.doc_number) || '')}" />
          </div>
          <div>
            <label class="form-label">Holder Name</label>
            <input name="holder_name" class="form-control" value="${esc((existing && existing.holder_name) || '')}" />
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
          <div>
            <label class="form-label">Issuing Country</label>
            <input name="issuing_country" class="form-control" placeholder="USA" value="${esc((existing && existing.issuing_country) || '')}" />
          </div>
          <div>
            <label class="form-label">Issue Date</label>
            <input type="date" name="issue_date" class="form-control" value="${esc((existing && existing.issue_date) || '')}" />
          </div>
          <div>
            <label class="form-label">Expiry Date</label>
            <input type="date" name="expiry_date" class="form-control" value="${esc((existing && existing.expiry_date) || '')}" />
          </div>
        </div>
        <div>
          <label class="form-label">Scan / Photo / PDF (Optional)</label>
          <input type="file" id="ww-doc-file" class="form-control" accept="image/*,application/pdf" />
        </div>
        <div>
          <label class="form-label">Notes</label>
          <textarea name="notes" class="form-control" rows="2">${esc((existing && existing.notes) || '')}</textarea>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 8px;">
          <button type="button" class="btn" id="ww-doc-cancel">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Save Document'}</button>
        </div>
      </form>
    `);

    modal.querySelector('#ww-doc-cancel').addEventListener('click', closeTravelModal);
    modal.querySelector('#ww-doc-form').addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      let attachment_data = (existing && existing.attachment_data) || '';
      let attachment_name = (existing && existing.attachment_name) || '';
      const f = modal.querySelector('#ww-doc-file');
      if (f && f.files && f.files[0]) {
        attachment_name = f.files[0].name;
        attachment_data = await readFileAsDataUrl(f.files[0]);
      }
      const payload = {
        doc_type: fd.get('doc_type'),
        title: fd.get('title'),
        doc_number: fd.get('doc_number'),
        holder_name: fd.get('holder_name'),
        issuing_country: fd.get('issuing_country'),
        issue_date: fd.get('issue_date'),
        expiry_date: fd.get('expiry_date'),
        notes: fd.get('notes'),
        attachment_data,
        attachment_name
      };
      try {
        if (isEdit) {
          await travelApi(`/api/travel/documents/${encodeURIComponent(existing.id)}`, { method: 'PUT', body: JSON.stringify(payload) });
          toast('✓ Document updated');
        } else {
          await travelApi('/api/travel/documents', { method: 'POST', body: JSON.stringify(payload) });
          toast('✓ Document added to vault');
        }
        closeTravelModal();
        render();
      } catch (err) { toast(err.message); }
    });
  }

  function openAttachmentModal(title, dataUrl) {
    const isPdf = dataUrl.startsWith('data:application/pdf');
    showTravelModal(title, `
      <div style="text-align: center;">
        ${isPdf
          ? `<iframe src="${dataUrl}" style="width: 100%; height: 65vh; border: none; border-radius: 8px;"></iframe>`
          : `<img src="${dataUrl}" alt="${esc(title)}" style="max-width: 100%; max-height: 65vh; border-radius: 8px;" />`}
        <div style="margin-top: 12px;">
          <a href="${dataUrl}" download="${esc(title)}" class="btn btn-primary btn-sm">⬇️ Download Attachment</a>
        </div>
      </div>
    `);
  }

  function openPrintModal() {
    const s = getAppData();
    const list = (s.reservations || [])
      .filter(r => travelState.selectedTripId === 'all' || r.trip_id === travelState.selectedTripId)
      .sort((a, b) => String(a.start_datetime).localeCompare(String(b.start_datetime)));
    const trip = (s.trips || []).find(t => t.id === travelState.selectedTripId);

    const buildSheet = hidePrices => `
      <div id="ww-print-sheet" style="background: #fff; color: #111; padding: 20px; border-radius: 8px;">
        <h2 style="margin: 0 0 4px;">${esc(trip ? trip.name : 'Complete Travel Itinerary')}</h2>
        <p style="margin: 0 0 16px; color: #555; font-size: 13px;">${trip ? `${esc(trip.destination)} (${esc(trip.start_date)} → ${esc(trip.end_date)})` : 'Wander Wallet Travel Sheet'}</p>
        ${list.map(r => `
          <div style="border-bottom: 1px solid #e5e7eb; padding: 10px 0;">
            <div style="display: flex; justify-content: space-between;">
              <strong>${(TYPE_META[r.type] || TYPE_META.other).icon} ${esc(r.title)}</strong>
              ${r.confirmation_code ? `<span>Conf: <strong>${esc(r.confirmation_code)}</strong></span>` : ''}
            </div>
            <div style="font-size: 12.5px; color: #444; margin-top: 2px;">
              ${esc(formatDateTimeShort(r.start_datetime))}${r.end_datetime ? ' → ' + esc(formatDateTimeShort(r.end_datetime)) : ''}
              ${r.vendor ? ' • ' + esc(r.vendor) : ''}
              ${r.address ? ' • ' + esc(r.address) : ''}
            </div>
            ${!hidePrices && Number(r.cost_usd) > 0 ? `<div style="font-size: 12px; color: #059669; margin-top: 2px;">Cost: $${Number(r.cost_usd).toFixed(2)}</div>` : ''}
          </div>
        `).join('')}
      </div>
    `;

    const modal = showTravelModal('Printable / Shareable Itinerary', `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 10px;">
        <label style="display: flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer;">
          <input type="checkbox" id="ww-hide-prices-chk" ${travelState.hidePrintPrices ? 'checked' : ''} />
          Hide prices &amp; costs when sharing
        </label>
        <button type="button" class="btn btn-sm btn-primary" id="ww-do-print-btn">🖨️ Print / Save PDF</button>
      </div>
      <div id="ww-print-preview">${buildSheet(travelState.hidePrintPrices)}</div>
    `);

    modal.querySelector('#ww-hide-prices-chk').addEventListener('change', e => {
      travelState.hidePrintPrices = e.target.checked;
      modal.querySelector('#ww-print-preview').innerHTML = buildSheet(travelState.hidePrintPrices);
    });
    modal.querySelector('#ww-do-print-btn').addEventListener('click', () => {
      const w = window.open('', '_blank', 'width=850,height=700');
      if (w) {
        w.document.write(`<html><head><title>Itinerary</title><style>body{font-family:system-ui,sans-serif;padding:24px;}</style></head><body>${modal.querySelector('#ww-print-preview').innerHTML}</body></html>`);
        w.document.close();
        w.print();
      }
    });
  }

  async function syncInbox() {
    toast('🔄 Syncing email inbox for travel confirmations...');
    try {
      const res = await travelApi('/api/travel/email-sync', { method: 'POST' });
      toast(`✓ Scanned ${res.scanned} email(s), queued ${res.added} new booking(s).`);
      if (res.added > 0) travelState.subTab = 'inbox';
      render();
      renderAdminEmailSync();
    } catch (e) {
      toast(e.message);
    }
  }

  // ---------------------------------------------------------------------------
  // Admin Email Sync Panel
  // ---------------------------------------------------------------------------

  function renderAdminEmailSync() {
    const mount = document.getElementById('admin-travel-email-sync-mount');
    if (!mount) return;
    const s = getAppData();
    const st = s.email_sync_status || {};
    const redirectUri = `${window.location.origin}/api/travel/gmail/callback`;

    mount.innerHTML = `
      <div style="padding: 14px 16px; background: var(--bg-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-md);">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 12px;">
          <div>
            <div style="font-size: 13.5px; font-weight: 700;">📧 Travel Email Sync (Gmail OAuth 2.0 &amp; IMAP)</div>
            <div style="font-size: 12px; color: var(--text-secondary);">
              ${st.last_sync_at ? `Last sync: ${esc(formatDateTimeShort(st.last_sync_at))} — ${esc(st.last_sync_summary || '')}` : 'Connect your inbox to automatically pull flight, hotel, and car confirmations into Pending Review.'}
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <select id="ww-admin-auto-sync" class="form-control" style="font-size: 12.5px; padding: 5px 10px;" title="Automatic background email check interval">
              <option value="0" ${Number(st.auto_sync_minutes) === 0 ? 'selected' : ''}>Auto-Sync: Off (Manual)</option>
              <option value="240" ${Number(st.auto_sync_minutes) === 240 ? 'selected' : ''}>Auto-Sync: Every 4 hrs (6x/day)</option>
              <option value="360" ${(st.auto_sync_minutes === undefined || Number(st.auto_sync_minutes) === 360) ? 'selected' : ''}>Auto-Sync: Every 6 hrs (4x/day)</option>
              <option value="720" ${Number(st.auto_sync_minutes) === 720 ? 'selected' : ''}>Auto-Sync: Every 12 hrs (2x/day)</option>
              <option value="1440" ${Number(st.auto_sync_minutes) === 1440 ? 'selected' : ''}>Auto-Sync: Daily (24 hrs)</option>
            </select>
            <button type="button" class="btn btn-sm btn-primary" id="btn-admin-sync-travel-now">🔄 Sync Inbox Now</button>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); gap: 14px;">
          <!-- IMAP / App Password -->
          <form id="ww-admin-imap-form" style="padding: 12px; border: 1px solid var(--border-subtle); border-radius: 8px; display: grid; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong style="font-size: 13px;">Generic IMAP / App Password</strong>
              <span class="kpi-tag" style="color: ${st.imap_configured ? 'var(--accent-primary)' : 'var(--text-secondary)'};">${st.imap_configured ? 'Configured' : 'Not Set'}</span>
            </div>
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 8px;">
              <input name="imap_host" class="form-control" placeholder="imap.gmail.com" value="${esc(st.imap_host || 'imap.gmail.com')}" />
              <input name="imap_port" type="number" class="form-control" placeholder="993" value="${Number(st.imap_port) || 993}" />
            </div>
            <input name="imap_user" class="form-control" placeholder="you@gmail.com" value="${esc(st.imap_user || '')}" />
            <input name="imap_password" type="password" class="form-control" placeholder="${st.imap_configured ? '•••••••• (Saved — enter to replace)' : 'App Password'}" />
            <div style="display: flex; gap: 8px;">
              <button type="submit" class="btn btn-sm">💾 Save IMAP</button>
              ${st.imap_configured ? `<button type="button" class="btn btn-sm btn-danger" id="btn-admin-clear-imap">Clear</button>` : ''}
            </div>
          </form>

          <!-- Gmail OAuth 2.0 -->
          <form id="ww-admin-gmail-form" style="padding: 12px; border: 1px solid var(--border-subtle); border-radius: 8px; display: grid; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong style="font-size: 13px;">Gmail OAuth 2.0</strong>
              <span class="kpi-tag" style="color: ${st.gmail_connected ? 'var(--accent-primary)' : 'var(--text-secondary)'};">${st.gmail_connected ? 'Connected' : 'Disconnected'}</span>
            </div>
            <input name="gmail_client_id" class="form-control" placeholder="Google OAuth Client ID" value="${esc(st.gmail_client_id || '')}" />
            <input name="gmail_client_secret" type="password" class="form-control" placeholder="${st.gmail_configured ? '•••••••• (Saved — enter to replace)' : 'Google OAuth Client Secret'}" />
            <div style="font-size: 11px; color: var(--text-secondary); word-break: break-all;">
              Redirect URI: <code>${esc(redirectUri)}</code>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button type="submit" class="btn btn-sm">💾 Save Keys</button>
              <button type="button" class="btn btn-sm btn-primary" id="btn-admin-connect-gmail">🔗 Connect Gmail</button>
              ${st.gmail_connected ? `<button type="button" class="btn btn-sm btn-danger" id="btn-admin-disconnect-gmail">Disconnect</button>` : ''}
            </div>
          </form>
        </div>
      </div>
    `;

    mount.querySelector('#btn-admin-sync-travel-now').addEventListener('click', () => syncInbox());

    const autoSyncSel = mount.querySelector('#ww-admin-auto-sync');
    if (autoSyncSel) {
      autoSyncSel.addEventListener('change', async () => {
        try {
          await travelApi('/api/travel/email-config', {
            method: 'POST',
            body: JSON.stringify({ auto_sync_minutes: Number(autoSyncSel.value) })
          });
          toast(Number(autoSyncSel.value) === 0 ? 'Auto-Sync turned off' : `✓ Auto-Sync set to every ${Number(autoSyncSel.value) / 60}h`);
        } catch (err) { toast(err.message); }
      });
    }

    mount.querySelector('#ww-admin-imap-form').addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        await travelApi('/api/travel/email-config', {
          method: 'POST',
          body: JSON.stringify({
            imap_host: fd.get('imap_host'),
            imap_port: fd.get('imap_port'),
            imap_user: fd.get('imap_user'),
            imap_password: fd.get('imap_password') || undefined
          })
        });
        toast('✓ IMAP configuration saved');
        renderAdminEmailSync();
      } catch (err) { toast(err.message); }
    });

    const btnClearImap = mount.querySelector('#btn-admin-clear-imap');
    if (btnClearImap) {
      btnClearImap.addEventListener('click', async () => {
        await travelApi('/api/travel/email-config', { method: 'POST', body: JSON.stringify({ clear_imap: true }) });
        toast('IMAP cleared');
        renderAdminEmailSync();
      });
    }

    mount.querySelector('#ww-admin-gmail-form').addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        await travelApi('/api/travel/email-config', {
          method: 'POST',
          body: JSON.stringify({
            gmail_client_id: fd.get('gmail_client_id'),
            gmail_client_secret: fd.get('gmail_client_secret') || undefined
          })
        });
        toast('✓ Gmail OAuth keys saved');
        renderAdminEmailSync();
      } catch (err) { toast(err.message); }
    });

    mount.querySelector('#btn-admin-connect-gmail').addEventListener('click', async () => {
      try {
        const res = await travelApi('/api/travel/gmail/auth-url');
        if (res.url) window.location.href = res.url;
      } catch (err) { toast(err.message); }
    });

    const btnDisc = mount.querySelector('#btn-admin-disconnect-gmail');
    if (btnDisc) {
      btnDisc.addEventListener('click', async () => {
        await travelApi('/api/travel/email-config', { method: 'POST', body: JSON.stringify({ disconnect_gmail: true }) });
        toast('Gmail disconnected');
        renderAdminEmailSync();
      });
    }
  }

  // Handle Road FX Rates modal button in sidebar
  function openFxRatesModal() {
    const s = getAppData();
    const rates = (s.settings && s.settings.exchange_rates) || {
      USD: 1.0, ARS: 0.00098, BRL: 0.175, JPY: 0.00658, EUR: 1.085,
      GBP: 1.295, CAD: 0.725, AUD: 0.658, CHF: 1.155, ISK: 0.00725, KRW: 0.00073, MXN: 0.0505
    };
    const codes = Object.keys(rates);
    const lastUpd = (s.settings && s.settings.fx_last_updated) ? formatDateTimeShort(s.settings.fx_last_updated) : 'Default / Manual';

    const modal = showTravelModal('💱 Road FX Rates & Converter', `
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 12px;">
        <div style="font-size: 12px; color: var(--text-secondary);">
          Last updated: <strong>${esc(lastUpd)}</strong>
        </div>
        <button type="button" class="btn btn-sm btn-primary" id="ww-fx-refresh-btn">🔄 Update Live Rates</button>
      </div>

      <div style="padding: 12px; background: var(--bg-elevated); border: 1px solid var(--border-subtle); border-radius: 10px; margin-bottom: 14px;">
        <div style="font-size: 12px; font-weight: 700; margin-bottom: 8px;">Quick Currency Converter</div>
        <div style="display: grid; grid-template-columns: 1fr 0.8fr auto 0.8fr; gap: 8px; align-items: center;">
          <input type="number" step="any" id="ww-fx-amount" class="form-control mono" value="50" min="0" />
          <select id="ww-fx-from" class="form-control">
            ${codes.map(c => `<option value="${esc(c)}" ${c === 'USD' ? 'selected' : ''}>${esc(c)}</option>`).join('')}
          </select>
          <button type="button" class="btn btn-sm" id="ww-fx-swap" title="Swap currencies">⇄</button>
          <select id="ww-fx-to" class="form-control">
            ${codes.map(c => `<option value="${esc(c)}" ${c === 'EUR' ? 'selected' : ''}>${esc(c)}</option>`).join('')}
          </select>
        </div>
        <div id="ww-fx-result" class="mono" style="margin-top: 10px; font-size: 16px; font-weight: 800; color: var(--accent-primary);"></div>
      </div>

      <div id="ww-fx-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(175px, 1fr)); gap: 10px;"></div>
    `);

    const amtEl = modal.querySelector('#ww-fx-amount');
    const fromEl = modal.querySelector('#ww-fx-from');
    const toEl = modal.querySelector('#ww-fx-to');
    const resEl = modal.querySelector('#ww-fx-result');
    const gridEl = modal.querySelector('#ww-fx-grid');

    function updateConverter() {
      const amt = parseFloat(amtEl.value) || 0;
      const fromRate = Number(rates[fromEl.value]) || 1.0;
      const toRate = Number(rates[toEl.value]) || 1.0;
      const usdVal = amt * fromRate;
      const converted = usdVal / toRate;
      const fmt = (v, c) => v.toLocaleString(undefined, { minimumFractionDigits: (c === 'JPY' || c === 'KRW' || c === 'ISK' || c === 'ARS') ? 0 : 2, maximumFractionDigits: (c === 'JPY' || c === 'KRW' || c === 'ISK' || c === 'ARS') ? 0 : 2 });
      resEl.textContent = `${fmt(amt, fromEl.value)} ${fromEl.value} = ${fmt(converted, toEl.value)} ${toEl.value}`;

      gridEl.innerHTML = codes.map(code => {
        const val = Number(rates[code]) || 1.0;
        const inCode = usdVal / val;
        return `
          <div style="padding: 10px 12px; background: var(--bg-elevated); border: 1px solid var(--border-subtle); border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong class="mono">${esc(code)}</strong>
              <span class="mono" style="font-size: 13.5px; font-weight: 700; color: var(--accent-primary);">${fmt(inCode, code)}</span>
            </div>
            <div class="mono" style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">
              1 ${esc(code)} = $${val.toFixed(code === 'ARS' || code === 'KRW' || code === 'JPY' || code === 'ISK' ? 5 : 3)}
            </div>
          </div>
        `;
      }).join('');
    }

    amtEl.addEventListener('input', updateConverter);
    fromEl.addEventListener('change', updateConverter);
    toEl.addEventListener('change', updateConverter);
    modal.querySelector('#ww-fx-swap').addEventListener('click', () => {
      const tmp = fromEl.value;
      fromEl.value = toEl.value;
      toEl.value = tmp;
      updateConverter();
    });

    modal.querySelector('#ww-fx-refresh-btn').addEventListener('click', async () => {
      const btn = modal.querySelector('#ww-fx-refresh-btn');
      btn.disabled = true;
      btn.textContent = 'Updating...';
      try {
        await travelApi('/api/fx/refresh', { method: 'POST' });
        toast('✓ Live FX rates updated!');
        openFxRatesModal();
      } catch (err) {
        toast(err.message);
        btn.disabled = false;
        btn.textContent = '🔄 Update Live Rates';
      }
    });

    updateConverter();
  }

  // ---------------------------------------------------------------------------
  // Manage Trip Legs / Sub-Locations Modal (Country / City Hierarchy)
  // ---------------------------------------------------------------------------

  function openManageLegsModal(tripId, editingLegId = null) {
    const s = getAppData();
    const trips = s.trips || [];
    const targetTripId = tripId || (s.selectedTripId && s.selectedTripId !== 'all' ? s.selectedTripId : (trips[0] ? trips[0].id : ''));
    const trip = trips.find(t => t.id === targetTripId);
    if (!trip) {
      toast('Please select or create a trip first.');
      return;
    }

    const legs = (bridge() && bridge().getTripLegs) ? bridge().getTripLegs(trip) : [];
    const topLevelLegs = legs.filter(l => !l.parent);
    const editingLeg = editingLegId ? legs.find(l => l.id === editingLegId) : null;

    // Organize legs hierarchically: each top-level leg followed by its children, then any orphan sub-legs
    const orderedLegs = [];
    const seen = new Set();
    topLevelLegs.forEach(parent => {
      orderedLegs.push(parent);
      seen.add(parent.id);
      legs.filter(c => c.parent === parent.path).forEach(child => {
        orderedLegs.push(child);
        seen.add(child.id);
      });
    });
    legs.forEach(l => {
      if (!seen.has(l.id)) orderedLegs.push(l);
    });

    const allExp = (s.expenses || []).filter(e => e.trip_id === trip.id);
    const allRes = (s.reservations || []).filter(r => r.trip_id === trip.id);

    const modal = showTravelModal(`🗺️ Trip Legs & Locations — ${trip.name}`, `
      <div style="display: grid; gap: 14px;">
        <div style="font-size: 12.5px; color: var(--text-secondary); line-height: 1.45;">
          Organize <strong>${esc(trip.name)}</strong> into countries, regions, or city stops (e.g. <code>Panama</code>, <code>Argentina</code> → <code>Argentina / Buenos Aires</code>, or <code>Bangkok</code>, <code>Chiang Mai</code>). Toggle any leg in the top bar or ledger to isolate its expenses and bookings.
        </div>

        <form id="ww-leg-form" style="padding: 12px; background: var(--bg-elevated); border: 1px solid var(--border-subtle); border-radius: 10px; display: grid; gap: 10px;">
          <div style="font-size: 12.5px; font-weight: 700; color: var(--accent-primary);">
            ${editingLeg ? `✏️ Edit Leg: ${esc(editingLeg.path)}` : '+ Add New Trip Leg / Stop'}
          </div>
          <div style="display: grid; grid-template-columns: 1.3fr 1.2fr; gap: 10px;">
            <div>
              <label class="form-label">Location / Leg Name *</label>
              <input name="name" class="form-control" required placeholder="e.g. Argentina, Buenos Aires, Bangkok" value="${esc(editingLeg ? editingLeg.name : '')}" />
            </div>
            <div>
              <label class="form-label">Parent Country / Region (Optional)</label>
              <select name="parent" class="form-control">
                <option value="">(Top-Level Country / Region / Stop)</option>
                ${topLevelLegs
                  .filter(p => !editingLeg || p.id !== editingLeg.id)
                  .map(p => `<option value="${esc(p.path)}" ${(editingLeg && editingLeg.parent === p.path) ? 'selected' : ''}>📍 ${esc(p.path)}</option>`)
                  .join('')}
              </select>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr auto; gap: 10px; align-items: end;">
            <div>
              <label class="form-label">Default Currency (Optional)</label>
              <input name="currency" class="form-control mono" placeholder="${esc(trip.default_currency || 'USD')}" value="${esc(editingLeg ? (editingLeg.currency || '') : '')}" />
            </div>
            <div>
              <label class="form-label">Sub-Budget USD (Optional)</label>
              <input type="number" step="1" name="budget_usd" class="form-control mono" placeholder="0 = use trip budget" value="${editingLeg && editingLeg.budget_usd ? Number(editingLeg.budget_usd) : ''}" />
            </div>
            <div style="display: flex; gap: 6px;">
              ${editingLeg ? `<button type="button" class="btn btn-sm" id="ww-leg-cancel-edit">Cancel</button>` : ''}
              <button type="submit" class="btn btn-sm btn-primary">${editingLeg ? '💾 Update Leg' : '+ Add Leg'}</button>
            </div>
          </div>
        </form>

        <div>
          <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-secondary); margin-bottom: 8px;">
            Configured Legs (${orderedLegs.length})
          </div>
          ${orderedLegs.length === 0 ? `
            <div style="padding: 20px; text-align: center; color: var(--text-secondary); background: var(--bg-elevated); border-radius: 8px; font-size: 13px;">
              No sub-legs added yet. Add countries or cities above to break down this trip!
            </div>
          ` : `
            <div style="display: grid; gap: 6px;">
              ${orderedLegs.map(l => {
                const matchFn = (bridge() && bridge().matchesLegFilter) ? bridge().matchesLegFilter : ((a, b) => a === b);
                const legExp = allExp.filter(e => matchFn(e.leg_path, l.path));
                const legSpent = legExp.reduce((s, e) => s + (Number(e.amount_usd) || 0), 0);
                const legResCount = allRes.filter(r => matchFn(r.leg_path, l.path)).length;
                return `
                  <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 9px 12px; background: var(--bg-elevated); border: 1px solid var(--border-subtle); border-radius: 8px; ${l.parent ? 'margin-left: 22px; border-left: 3px solid var(--accent-sky);' : 'border-left: 3px solid var(--accent-primary);'}">
                    <div>
                      <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <strong style="font-size: 13.5px;">${l.parent ? '↳ ' : '📍 '}${esc(l.path)}</strong>
                        ${l.currency ? `<span class="kpi-tag mono">${esc(l.currency)}</span>` : ''}
                        ${Number(l.budget_usd) > 0 ? `<span class="kpi-tag mono" style="color: var(--accent-primary);">Budget: $${Number(l.budget_usd).toLocaleString()}</span>` : ''}
                      </div>
                      <div style="font-size: 11.5px; color: var(--text-secondary); margin-top: 2px;">
                        ${legExp.length} expense${legExp.length === 1 ? '' : 's'} ($${legSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) • ${legResCount} booking${legResCount === 1 ? '' : 's'}
                      </div>
                    </div>
                    <div style="display: flex; gap: 6px; align-items: center;">
                      <button type="button" class="btn btn-xs" data-leg-view="${esc(l.path)}" title="Filter workspace to this leg">👁️ View</button>
                      <button type="button" class="btn btn-xs" data-leg-edit="${esc(l.id)}">✏️</button>
                      <button type="button" class="btn btn-xs btn-danger" data-leg-del="${esc(l.id)}">🗑️</button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      </div>
    `);

    const refreshExpenseLegDropdownIfOpen = (selectedLegPath) => {
      const expTripSel = document.getElementById('exp-trip');
      const expLegSel = document.getElementById('exp-leg-path');
      if (expTripSel && expLegSel && expTripSel.value === trip.id) {
        const updatedState = getAppData();
        const updatedTrip = (updatedState.trips || []).find(t => t.id === trip.id);
        const updatedLegs = (updatedTrip && bridge() && bridge().getTripLegs) ? bridge().getTripLegs(updatedTrip) : [];
        expLegSel.innerHTML = `<option value="">(Entire Trip / No Specific Leg)</option>` + updatedLegs.map(l => {
          const prefix = l.parent ? '\u00A0\u00A0└─ ' : '📍 ';
          return `<option value="${esc(l.path)}">${prefix}${esc(l.path)}</option>`;
        }).join('');
        if (selectedLegPath && updatedLegs.some(l => l.path === selectedLegPath)) {
          expLegSel.value = selectedLegPath;
        }
      }
    };

    const btnCancelEdit = modal.querySelector('#ww-leg-cancel-edit');
    if (btnCancelEdit) {
      btnCancelEdit.addEventListener('click', () => openManageLegsModal(trip.id, null));
    }

    modal.querySelector('#ww-leg-form').addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const rawName = String(fd.get('name') || '').trim().replace(/\s*\/\s*/g, ' - ');
      const parent = String(fd.get('parent') || '').trim();
      if (!rawName) return;
      const newPath = parent ? `${parent} / ${rawName}` : rawName;
      const currency = String(fd.get('currency') || '').trim().toUpperCase();
      const budget_usd = Number(fd.get('budget_usd')) || 0;

      if (legs.some(l => l.path.toLowerCase() === newPath.toLowerCase() && (!editingLeg || l.id !== editingLeg.id))) {
        toast(`Leg "${newPath}" already exists on this trip.`);
        return;
      }

      let nextLegs;
      let renameFrom = '';
      let renameTo = '';

      if (editingLeg) {
        renameFrom = editingLeg.path;
        renameTo = newPath;
        nextLegs = legs.map(l => {
          if (l.id === editingLeg.id) {
            return { ...l, name: rawName, parent, path: newPath, currency, budget_usd };
          }
          if (l.parent === editingLeg.path) {
            return { ...l, parent: newPath, path: `${newPath} / ${l.name}` };
          }
          return l;
        });
      } else {
        const newLeg = {
          id: 'leg-' + Date.now().toString(36),
          name: rawName,
          parent,
          path: newPath,
          currency,
          budget_usd
        };
        nextLegs = [...legs, newLeg];
      }

      try {
        const resp = await fetch(`/api/trips/${encodeURIComponent(trip.id)}/legs`, {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ legs: nextLegs, renameFrom, renameTo })
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Failed to save leg');
        if (bridge() && bridge().applyBootstrapData) bridge().applyBootstrapData(data);
        refreshExpenseLegDropdownIfOpen(newPath);
        toast(editingLeg ? `✓ Updated leg "${newPath}"` : `✓ Added leg "${newPath}"`);
        openManageLegsModal(trip.id, null);
      } catch (err) {
        toast(err.message);
      }
    });

    modal.querySelectorAll('[data-leg-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        openManageLegsModal(trip.id, btn.getAttribute('data-leg-edit'));
      });
    });

    modal.querySelectorAll('[data-leg-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        const path = btn.getAttribute('data-leg-view');
        if (bridge() && bridge().setSelectedLeg) {
          bridge().setSelectedLeg(trip.id, path);
        }
        closeTravelModal();
      });
    });

    modal.querySelectorAll('[data-leg-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-leg-del');
        const target = legs.find(l => l.id === id);
        if (!target) return;
        if (!confirm(`Delete leg "${target.path}"? Any expenses or reservations assigned to it will remain on the main trip.`)) return;
        const nextLegs = legs.filter(l => l.id !== id && l.parent !== target.path);
        try {
          const resp = await fetch(`/api/trips/${encodeURIComponent(trip.id)}/legs`, {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ legs: nextLegs, deletedPath: target.path })
          });
          const data = await resp.json();
          if (!resp.ok) throw new Error(data.error || 'Failed to delete leg');
          if (bridge() && bridge().applyBootstrapData) bridge().applyBootstrapData(data);
          refreshExpenseLegDropdownIfOpen('');
          toast(`Removed leg "${target.path}"`);
          openManageLegsModal(trip.id, null);
        } catch (err) {
          toast(err.message);
        }
      });
    });
  }

  document.addEventListener('click', e => {
    if (e.target.closest('#btn-open-fx-rates-modal')) {
      openFxRatesModal();
      return;
    }
    const selLegBtn = e.target.closest('[data-select-leg]');
    if (selLegBtn) {
      const s = getAppData();
      const legPath = selLegBtn.getAttribute('data-select-leg') || '';
      if (bridge() && bridge().setSelectedLeg && s.selectedTripId && s.selectedTripId !== 'all') {
        bridge().setSelectedLeg(s.selectedTripId, legPath);
      }
      return;
    }
    const manageBtn = e.target.closest('[data-manage-trip-legs]');
    if (manageBtn) {
      openManageLegsModal(manageBtn.getAttribute('data-manage-trip-legs'));
      return;
    }
    if (e.target.closest('#btn-topbar-manage-legs')) {
      const s = getAppData();
      const tripId = (s.selectedTripId && s.selectedTripId !== 'all') ? s.selectedTripId : ((s.trips && s.trips[0]) ? s.trips[0].id : '');
      openManageLegsModal(tripId);
      return;
    }
    if (e.target.closest('#btn-exp-modal-manage-legs')) {
      const expTripSel = document.getElementById('exp-trip');
      const tripId = expTripSel ? expTripSel.value : '';
      openManageLegsModal(tripId);
      return;
    }
  });

  // Handle OAuth callback query params
  const params = new URLSearchParams(window.location.search);
  if (params.get('gmail_connected')) {
    setTimeout(() => toast('✓ Gmail OAuth connected! You can now sync your inbox.'), 400);
    window.history.replaceState({}, '', window.location.pathname);
  } else if (params.get('gmail_error')) {
    setTimeout(() => toast('Gmail OAuth error: ' + params.get('gmail_error')), 400);
    window.history.replaceState({}, '', window.location.pathname);
  }

  // ---------------------------------------------------------------------------
  // Central Trip Hub (Screenshot-Inspired Independent Dashboard Launcher)
  // ---------------------------------------------------------------------------

  const HUB_GRADIENTS = [
    'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
    'linear-gradient(135deg, #1a2980 0%, #26d0ce 100%)',
    'linear-gradient(135deg, #2b5876 0%, #4e4376 100%)',
    'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
    'linear-gradient(135deg, #3a1c71 0%, #d76d77 50%, #ffaf7b 100%)'
  ];

  function getTripDaysCount(start, end) {
    if (!start || !end) return 1;
    const diff = Math.round((new Date(end + 'T00:00:00Z') - new Date(start + 'T00:00:00Z')) / 86400000) + 1;
    return Math.max(1, isNaN(diff) ? 1 : diff);
  }

  function renderHub() {
    const container = document.getElementById('view-hub');
    if (!container) return;
    const s = getAppData();
    const trips = s.trips || [];
    const allRes = s.reservations || [];
    const allExp = s.expenses || [];
    const vStats = computeVisitedStats(s);

    container.innerHTML = `
      <div class="hub-header-row">
        <div>
          <h2 class="hub-main-title">Select a Trip to Open</h2>
          <p class="hub-main-sub">Click any trip card to launch its independent Travel &amp; Itinerary Planner or Financial Ledger.</p>
        </div>
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <button type="button" class="visited-sidebar-card" data-open-visited-mode="countries" style="min-width: 145px;" title="Open Countries Visited Map">
            <span class="visited-pin-icon">📍</span>
            <div class="visited-sidebar-card-text">
              <div class="visited-sidebar-count">${vStats.countries.total} <span class="visited-crown">👑</span></div>
              <div class="visited-sidebar-label">Countries</div>
            </div>
          </button>
          <button type="button" class="visited-sidebar-card" data-open-visited-mode="states" style="min-width: 145px;" title="Open U.S. States Visited Map">
            <span class="visited-pin-icon">📍</span>
            <div class="visited-sidebar-card-text">
              <div class="visited-sidebar-count">${vStats.states.total} <span class="visited-crown">👑</span></div>
              <div class="visited-sidebar-label">U.S. States</div>
            </div>
          </button>
          <button type="button" class="btn btn-primary" id="btn-hub-new-trip">+ New Trip</button>
        </div>
      </div>

      ${trips.length === 0 ? `
        <section class="panel-card" style="text-align: center; padding: 48px 20px;">
          <div style="font-size: 40px; margin-bottom: 10px;">🧭</div>
          <h3 style="margin-bottom: 6px;">No trips yet</h3>
          <p style="color: var(--text-secondary); margin-bottom: 16px;">Create your first trip to launch its Travel Planner and Financial Ledger.</p>
          <button type="button" class="btn btn-primary" id="btn-hub-empty-new">+ Create First Trip</button>
        </section>
      ` : `
        <div class="hub-cards-grid">
          ${trips.map((t, idx) => {
            const days = getTripDaysCount(t.start_date, t.end_date);
            const bookingsCount = allRes.filter(r => r.trip_id === t.id).length;
            const spentUsd = allExp.filter(e => e.trip_id === t.id).reduce((sum, e) => sum + (Number(e.amount_usd) || 0), 0);
            const status = (t.status || 'active').toLowerCase();
            const statusLabel = status === 'planning' ? 'PLANNING / WISHLIST' : status.toUpperCase();
            const bgStyle = t.cover_photo
              ? `background-image: url('${t.cover_photo}'); background-size: cover; background-position: center;`
              : `background: ${HUB_GRADIENTS[idx % HUB_GRADIENTS.length]};`;

            return `
              <article class="hub-trip-card">
                <div class="hub-card-hero" style="${bgStyle}">
                  <div class="hub-card-hero-overlay"></div>
                  <div class="hub-card-top-bar">
                    <span class="hub-status-pill hub-status-${esc(status)}">${esc(statusLabel)}</span>
                    <div class="hub-hero-actions">
                      <button type="button" class="hub-hero-btn" data-manage-trip-legs="${esc(t.id)}" title="Add or Edit Trip Legs / Stops">🗺️ Legs</button>
                      <button type="button" class="hub-hero-btn" data-hub-edit="${esc(t.id)}">✏️ Edit / Photo</button>
                      <button type="button" class="hub-hero-btn hub-hero-del" data-hub-del="${esc(t.id)}" title="Delete Trip">🗑️</button>
                    </div>
                  </div>
                  <div class="hub-card-hero-text">
                    <div class="hub-card-dest">📍 ${esc(t.destination || 'Destination')}</div>
                    <h3 class="hub-card-title">${esc(t.name)}</h3>
                  </div>
                </div>

                <div class="hub-card-body">
                  <p class="hub-card-desc">${esc(t.notes || `${t.start_date || ''} → ${t.end_date || ''}`)}</p>
                  <div class="hub-stat-grid">
                    <div class="hub-stat-box">
                      <span class="hub-stat-label">SCHEDULE</span>
                      <span class="hub-stat-val" style="color: var(--accent-sky);">${days} Day${days > 1 ? 's' : ''}</span>
                    </div>
                    <div class="hub-stat-box">
                      <span class="hub-stat-label">BOOKINGS</span>
                      <span class="hub-stat-val" style="color: #f97316;">${bookingsCount} Item${bookingsCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="hub-stat-box">
                      <span class="hub-stat-label">BUDGET</span>
                      <span class="hub-stat-val" style="color: var(--accent-primary);">$${Number(t.budget_usd || 0).toLocaleString()}</span>
                    </div>
                  </div>
                  ${spentUsd > 0 ? `<div style="font-size: 11.5px; color: var(--text-secondary);">Spent so far: <strong class="mono">$${spentUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong></div>` : ''}
                  <div class="hub-card-cta-row">
                    <button type="button" class="hub-btn-primary" data-hub-open-travel="${esc(t.id)}">Open Travel Planner →</button>
                    <button type="button" class="hub-btn-secondary" data-hub-open-finance="${esc(t.id)}">Finance Ledger</button>
                  </div>
                </div>
              </article>
            `;
          }).join('')}
        </div>
      `}
    `;

    const openNew = () => openHubTripModal();
    const btnNew = container.querySelector('#btn-hub-new-trip');
    if (btnNew) btnNew.addEventListener('click', openNew);
    const btnEmpty = container.querySelector('#btn-hub-empty-new');
    if (btnEmpty) btnEmpty.addEventListener('click', openNew);

    container.querySelectorAll('[data-hub-open-travel]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-hub-open-travel');
        travelState.selectedTripId = id;
        if (bridge()) {
          bridge().setSelectedTrip(id);
          bridge().switchView('travel');
        }
      });
    });

    container.querySelectorAll('[data-hub-open-finance]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-hub-open-finance');
        if (bridge()) {
          bridge().setSelectedTrip(id);
          bridge().switchView('dashboard');
        }
      });
    });

    container.querySelectorAll('[data-hub-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = trips.find(x => x.id === btn.getAttribute('data-hub-edit'));
        if (t) openHubTripModal(t);
      });
    });

    container.querySelectorAll('[data-hub-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-hub-del');
        if (!confirm('Delete this trip and its expenses?')) return;
        try {
          const resp = await fetch(`/api/trips/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'same-origin' });
          const data = await resp.json();
          if (resp.ok && bridge()) {
            bridge().applyBootstrapData(data);
            toast('Trip deleted');
            renderHub();
          }
        } catch (e) { toast(e.message); }
      });
    });
  }

  function openHubTripModal(existing = null) {
    const isEdit = Boolean(existing && existing.id);
    const modal = showTravelModal(isEdit ? 'Edit Trip & Cover Photo' : 'Create New Trip', `
      <form id="ww-hub-trip-form" style="display: grid; gap: 12px;">
        <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 10px;">
          <div>
            <label class="form-label">Trip Name *</label>
            <input name="name" class="form-control" required placeholder="e.g. Rocky Mountain Expedition" value="${esc((existing && existing.name) || '')}" />
          </div>
          <div>
            <label class="form-label">Status</label>
            <select name="status" class="form-control">
              <option value="active" ${(existing && existing.status === 'active') ? 'selected' : ''}>Active</option>
              <option value="upcoming" ${(existing && existing.status === 'upcoming') ? 'selected' : ''}>Upcoming</option>
              <option value="planning" ${(existing && existing.status === 'planning') ? 'selected' : ''}>Planning / Wishlist</option>
              <option value="completed" ${(existing && existing.status === 'completed') ? 'selected' : ''}>Completed</option>
            </select>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 10px;">
          <div>
            <label class="form-label">Destination / Route *</label>
            <input name="destination" class="form-control" required placeholder="e.g. Denver, CO → Zion National Park" value="${esc((existing && existing.destination) || '')}" />
          </div>
          <div>
            <label class="form-label">Budget (USD)</label>
            <input type="number" name="budget_usd" class="form-control" value="${Number((existing && existing.budget_usd) || 2500)}" />
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 0.7fr; gap: 10px;">
          <div>
            <label class="form-label">Start Date</label>
            <input type="date" name="start_date" class="form-control" value="${esc((existing && existing.start_date) || new Date().toISOString().slice(0, 10))}" />
          </div>
          <div>
            <label class="form-label">End Date</label>
            <input type="date" name="end_date" class="form-control" value="${esc((existing && existing.end_date) || new Date().toISOString().slice(0, 10))}" />
          </div>
          <div>
            <label class="form-label">Currency</label>
            <input name="default_currency" class="form-control" value="${esc((existing && existing.default_currency) || 'USD')}" />
          </div>
        </div>
        <div>
          <label class="form-label">Cover Photo (Upload Image)</label>
          <input type="file" id="ww-hub-cover-file" class="form-control" accept="image/*" />
        </div>
        <div>
          <label class="form-label">Description / Notes</label>
          <textarea name="notes" class="form-control" rows="2">${esc((existing && existing.notes) || '')}</textarea>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 8px;">
          <button type="button" class="btn" id="ww-hub-trip-cancel">Cancel</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Save Trip' : 'Create Trip'}</button>
        </div>
      </form>
    `);

    modal.querySelector('#ww-hub-trip-cancel').addEventListener('click', closeTravelModal);
    modal.querySelector('#ww-hub-trip-form').addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      let cover_photo = existing ? existing.cover_photo : '';
      const f = modal.querySelector('#ww-hub-cover-file');
      if (f && f.files && f.files[0]) {
        cover_photo = await readFileAsDataUrl(f.files[0]);
      }
      const payload = {
        name: fd.get('name'),
        status: fd.get('status'),
        destination: fd.get('destination'),
        budget_usd: Number(fd.get('budget_usd')) || 0,
        start_date: fd.get('start_date'),
        end_date: fd.get('end_date'),
        default_currency: fd.get('default_currency') || 'USD',
        notes: fd.get('notes'),
        cover_photo,
        legs_json: existing ? existing.legs_json : '[]'
      };
      try {
        const url = isEdit ? `/api/trips/${encodeURIComponent(existing.id)}` : '/api/trips';
        const resp = await fetch(url, {
          method: isEdit ? 'PUT' : 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Failed to save trip');
        if (bridge()) bridge().applyBootstrapData(data);
        toast(isEdit ? '✓ Trip updated' : '✓ Trip created');
        closeTravelModal();
        renderHub();
      } catch (err) { toast(err.message); }
    });
  }

  // ---------------------------------------------------------------------------
  // Visited U.S. States & World Countries Interactive Map Tracker
  // ---------------------------------------------------------------------------

  const visitedState = {
    mode: 'states', // 'states' | 'countries'
    viewTab: 'map', // 'map' | 'list'
    zoom: 1,
    panX: 0,
    panY: 0,
    listSearch: ''
  };

  const COUNTRY_CODE_TO_NAME = {
    US: 'United States', USA: 'United States', JP: 'Japan', AR: 'Argentina', PA: 'Panama',
    TH: 'Thailand', FR: 'France', GB: 'United Kingdom', UK: 'United Kingdom', IT: 'Italy',
    ES: 'Spain', DE: 'Germany', CA: 'Canada', MX: 'Mexico', BR: 'Brazil', CL: 'Chile',
    PE: 'Peru', CO: 'Colombia', CR: 'Costa Rica', AU: 'Australia', NZ: 'New Zealand',
    CH: 'Switzerland', IS: 'Iceland', KR: 'South Korea', SG: 'Singapore', ID: 'Indonesia',
    MY: 'Malaysia', PH: 'Philippines', VN: 'Vietnam', IN: 'India',ZA: 'South Africa',
    PT: 'Portugal', GR: 'Greece', NL: 'Netherlands', AT: 'Austria', IE: 'Ireland'
  };

  function getMapDataset() {
    return window.WW_MAP_DATA || { states: [], countries: [], allCountryNames: [] };
  }

  function computeVisitedStats(appState) {
    const s = appState || getAppData();
    const mapData = getMapDataset();
    const saved = (s.settings && s.settings.visited_places) || {};
    const manualStates = new Set(Array.isArray(saved.states) ? saved.states : []);
    const manualCountries = new Set(Array.isArray(saved.countries) ? saved.countries : []);
    const excludedStates = new Set(Array.isArray(saved.excluded_states) ? saved.excluded_states : []);
    const excludedCountries = new Set(Array.isArray(saved.excluded_countries) ? saved.excluded_countries : []);

    const fromTripsStates = new Set();
    const fromTripsCountries = new Set();

    const trips = s.trips || [];
    const allStates = mapData.states || [];
    const allCountries = mapData.allCountryNames || [];

    for (const t of trips) {
      const legs = (bridge() && bridge().getTripLegs) ? bridge().getTripLegs(t) : [];
      const textChunks = [
        t.name || '',
        t.destination || '',
        ...legs.map(l => l.path || l.name || '')
      ];
      const combinedText = textChunks.join(' • ');
      const lowerText = combinedText.toLowerCase();

      // Match Country Code or Country Names
      const cc = String(t.country_code || '').trim().toUpperCase();
      if (COUNTRY_CODE_TO_NAME[cc] && !excludedCountries.has(COUNTRY_CODE_TO_NAME[cc])) {
        fromTripsCountries.add(COUNTRY_CODE_TO_NAME[cc]);
      }
      for (const cName of allCountries) {
        if (excludedCountries.has(cName)) continue;
        if (lowerText.includes(cName.toLowerCase())) {
          fromTripsCountries.add(cName);
        }
      }

      // Match U.S. State Names or ", ST" postal abbreviations
      for (const st of allStates) {
        if (excludedStates.has(st.name)) continue;
        const nameRegex = new RegExp(`\\b${st.name.replace(/\s+/g, '\\s+')}\\b`, 'i');
        const codeRegex = new RegExp(`(?:,\\s*|\\b)${st.code}\\b`);
        if (nameRegex.test(combinedText) || (cc === 'US' && codeRegex.test(combinedText))) {
          fromTripsStates.add(st.name);
          if (!excludedCountries.has('United States')) {
            fromTripsCountries.add('United States');
          }
        }
      }
    }

    const finalStates = new Map(); // name -> 'trip' | 'manual'
    for (const name of fromTripsStates) {
      if (!excludedStates.has(name)) finalStates.set(name, 'trip');
    }
    for (const name of manualStates) {
      if (!finalStates.has(name)) finalStates.set(name, 'manual');
    }

    const finalCountries = new Map(); // name -> 'trip' | 'manual'
    for (const name of fromTripsCountries) {
      if (!excludedCountries.has(name)) finalCountries.set(name, 'trip');
    }
    for (const name of manualCountries) {
      if (!finalCountries.has(name)) finalCountries.set(name, 'manual');
    }

    let statesFromTripsCount = 0;
    let statesManualCount = 0;
    for (const src of finalStates.values()) {
      if (src === 'trip') statesFromTripsCount++;
      else statesManualCount++;
    }

    let countriesFromTripsCount = 0;
    let countriesManualCount = 0;
    for (const src of finalCountries.values()) {
      if (src === 'trip') countriesFromTripsCount++;
      else countriesManualCount++;
    }

    return {
      states: {
        map: finalStates,
        total: finalStates.size,
        max: 50,
        pct: Math.round((finalStates.size / 50) * 100),
        fromTrips: statesFromTripsCount,
        manual: statesManualCount,
        manualSet: manualStates,
        excludedSet: excludedStates
      },
      countries: {
        map: finalCountries,
        total: finalCountries.size,
        max: 195,
        pct: Math.round((finalCountries.size / 195) * 100),
        fromTrips: countriesFromTripsCount,
        manual: countriesManualCount,
        manualSet: manualCountries,
        excludedSet: excludedCountries
      }
    };
  }

  function updateVisitedSidebarBadges(appState) {
    const stats = computeVisitedStats(appState);
    const cEl = document.getElementById('sidebar-visited-countries-count');
    if (cEl) cEl.textContent = String(stats.countries.total);
    const sEl = document.getElementById('sidebar-visited-states-count');
    if (sEl) sEl.textContent = String(stats.states.total);
  }

  async function saveVisitedPlaceChange(mode, placeName, shouldBeVisited) {
    const s = getAppData();
    const stats = computeVisitedStats(s);
    const manualStates = new Set(stats.states.manualSet);
    const excludedStates = new Set(stats.states.excludedSet);
    const manualCountries = new Set(stats.countries.manualSet);
    const excludedCountries = new Set(stats.countries.excludedSet);

    if (mode === 'states') {
      if (shouldBeVisited) {
        manualStates.add(placeName);
        excludedStates.delete(placeName);
      } else {
        manualStates.delete(placeName);
        excludedStates.add(placeName);
      }
    } else {
      if (shouldBeVisited) {
        manualCountries.add(placeName);
        excludedCountries.delete(placeName);
      } else {
        manualCountries.delete(placeName);
        excludedCountries.add(placeName);
      }
    }

    const payload = {
      states: Array.from(manualStates),
      countries: Array.from(manualCountries),
      excluded_states: Array.from(excludedStates),
      excluded_countries: Array.from(excludedCountries)
    };

    try {
      await travelApi('/api/visited-places', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      updateVisitedSidebarBadges();
      renderVisitedPlaces();
    } catch (err) {
      toast(err.message);
    }
  }

  function openVisitedConfirmModal(mode, placeName, isCurrentlyVisited) {
    const noun = mode === 'states' ? 'state' : 'country';
    closeTravelModal();
    const backdrop = document.createElement('div');
    backdrop.id = 'ww-travel-modal-backdrop';
    backdrop.className = 'modal-backdrop';
    backdrop.style.display = 'flex';
    backdrop.innerHTML = `
      <div class="visited-confirm-dialog">
        <h3 class="visited-confirm-title">${isCurrentlyVisited ? `Remove ${esc(placeName)}?` : `Add ${esc(placeName)}?`}</h3>
        <p class="visited-confirm-desc">
          ${isCurrentlyVisited
            ? `Remove ${esc(placeName)} from your visited ${noun === 'state' ? 'states' : 'countries'} list.`
            : `Mark ${esc(placeName)} as a ${noun} you've visited. You can remove it later from the map or list view.`}
        </p>
        <div class="visited-confirm-actions">
          <button type="button" class="visited-btn-cancel" id="ww-visited-confirm-cancel">Cancel</button>
          <button type="button" class="visited-btn-confirm ${isCurrentlyVisited ? 'danger' : ''}" id="ww-visited-confirm-ok">
            ${isCurrentlyVisited ? `Remove ${noun}` : `Add ${noun}`}
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    backdrop.querySelector('#ww-visited-confirm-cancel').addEventListener('click', closeTravelModal);
    backdrop.addEventListener('click', e => {
      if (e.target === backdrop) closeTravelModal();
    });
    backdrop.querySelector('#ww-visited-confirm-ok').addEventListener('click', async () => {
      closeTravelModal();
      await saveVisitedPlaceChange(mode, placeName, !isCurrentlyVisited);
      toast(isCurrentlyVisited ? `Removed ${placeName}` : `✓ Added ${placeName} to visited ${mode}!`);
    });
  }

  function openAddVisitedPlaceModal(mode) {
    const noun = mode === 'states' ? 'state' : 'country';
    const mapData = getMapDataset();
    const stats = computeVisitedStats();
    const visitedMap = mode === 'states' ? stats.states.map : stats.countries.map;
    const allItems = mode === 'states'
      ? (mapData.states || []).map(s => s.name)
      : (mapData.allCountryNames || []);
    const unvisited = allItems.filter(name => !visitedMap.has(name));

    const modal = showTravelModal(mode === 'states' ? '+ Add U.S. State Visited' : '+ Add Country Visited', `
      <form id="ww-add-visited-form" style="display: grid; gap: 14px;">
        <p style="margin: 0; font-size: 13px; color: var(--text-secondary);">
          Select a ${noun} below to mark it as visited, or click directly on any ${noun} on the map.
        </p>
        <div>
          <label class="form-label">${mode === 'states' ? 'U.S. State' : 'Country'}</label>
          <select name="place" class="form-control" required>
            ${unvisited.map(name => `<option value="${esc(name)}">${esc(name)}</option>`).join('')}
          </select>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 8px;">
          <button type="button" class="btn" id="ww-add-visited-cancel">Cancel</button>
          <button type="submit" class="btn btn-primary">Add ${noun}</button>
        </div>
      </form>
    `);

    modal.querySelector('#ww-add-visited-cancel').addEventListener('click', closeTravelModal);
    modal.querySelector('#ww-add-visited-form').addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const place = fd.get('place');
      if (!place) return;
      closeTravelModal();
      await saveVisitedPlaceChange(mode, place, true);
      toast(`✓ Added ${place} to visited ${mode}!`);
    });
  }

  function applyMapTransform() {
    const g = document.getElementById('ww-visited-svg-group');
    if (!g) return;
    g.setAttribute('transform', `translate(${visitedState.panX}, ${visitedState.panY}) scale(${visitedState.zoom})`);
  }

  function renderVisitedPlaces(optionalMode) {
    if (optionalMode === 'states' || optionalMode === 'countries') {
      if (visitedState.mode !== optionalMode) {
        visitedState.mode = optionalMode;
        visitedState.zoom = 1;
        visitedState.panX = 0;
        visitedState.panY = 0;
        visitedState.listSearch = '';
      }
    }
    const container = document.getElementById('view-visited-places');
    if (!container) return;

    const isStates = visitedState.mode === 'states';
    const stats = computeVisitedStats();
    const cur = isStates ? stats.states : stats.countries;
    const mapData = getMapDataset();
    const polygons = isStates ? (mapData.states || []) : (mapData.countries || []);
    const allNames = isStates ? polygons.map(p => p.name) : (mapData.allCountryNames || []);
    const visitedEntries = Array.from(cur.map.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    container.innerHTML = `
      <div class="visited-page-wrap">
        <div class="visited-top-header">
          <div>
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <h2 class="visited-main-title">${isStates ? '🗺️ U.S. States Visited' : '🌐 Countries Visited'}</h2>
              <div class="visited-mode-switch">
                <button type="button" class="visited-mode-btn ${isStates ? 'active' : ''}" data-visited-mode="states">🇺🇸 U.S. States (${stats.states.total})</button>
                <button type="button" class="visited-mode-btn ${!isStates ? 'active' : ''}" data-visited-mode="countries">🌐 Countries (${stats.countries.total})</button>
              </div>
            </div>
            <p class="visited-main-sub">
              Track every ${isStates ? 'U.S. state' : 'country'} you've been to — from past trips and the ones you've planned in Wander Wallet.
            </p>
          </div>
          <div class="visited-header-actions">
            <button type="button" class="visited-btn-back" id="btn-visited-back-hub">Back to dashboard</button>
            <button type="button" class="visited-btn-add" id="btn-visited-add-modal">+ Add ${isStates ? 'state' : 'country'}</button>
          </div>
        </div>

        <!-- 4 KPI Cards matching Screenshots 2 & 4 -->
        <div class="visited-kpi-grid">
          <div class="visited-kpi-card">
            <div class="visited-kpi-val">${cur.total}</div>
            <div class="visited-kpi-lbl">${isStates ? 'States visited' : 'Countries visited'}</div>
          </div>
          <div class="visited-kpi-card">
            <div class="visited-kpi-val">${cur.pct}%</div>
            <div class="visited-kpi-lbl">${isStates ? 'of 50' : 'of world'}</div>
            <div class="visited-kpi-sub">${cur.total} / ${cur.max}</div>
          </div>
          <div class="visited-kpi-card">
            <div class="visited-kpi-val">${cur.fromTrips}</div>
            <div class="visited-kpi-lbl">From trips</div>
          </div>
          <div class="visited-kpi-card">
            <div class="visited-kpi-val">${cur.manual}</div>
            <div class="visited-kpi-lbl">Manually added</div>
          </div>
        </div>

        <!-- Map / List Pill Toggle -->
        <div class="visited-view-toggle-bar">
          <div class="visited-tab-group">
            <button type="button" class="visited-tab-btn ${visitedState.viewTab === 'map' ? 'active' : ''}" data-visited-tab="map">
              <span>${isStates ? '🗺️' : '🌐'}</span><span>Map</span>
            </button>
            <button type="button" class="visited-tab-btn ${visitedState.viewTab === 'list' ? 'active' : ''}" data-visited-tab="list">
              <span>📍</span><span>List (${cur.total})</span>
            </button>
          </div>
        </div>

        ${visitedState.viewTab === 'map' ? `
          <div class="visited-map-stage" id="ww-visited-map-stage">
            <div class="visited-zoom-controls">
              <button type="button" class="visited-zoom-btn" id="btn-visited-zoom-in" title="Zoom In">+</button>
              <button type="button" class="visited-zoom-btn" id="btn-visited-zoom-out" title="Zoom Out">&minus;</button>
              <button type="button" class="visited-zoom-btn" id="btn-visited-zoom-reset" title="Reset View">&#8635;</button>
            </div>
            <div id="ww-visited-map-tooltip" class="visited-map-tooltip" style="display: none;"></div>
            <svg
              id="ww-visited-svg"
              viewBox="${isStates ? '-60 0 1035 620' : '0 0 1000 540'}"
              preserveAspectRatio="xMidYMid meet"
              class="visited-map-svg"
            >
              <g id="ww-visited-svg-group" transform="translate(${visitedState.panX}, ${visitedState.panY}) scale(${visitedState.zoom})">
                ${polygons.map(item => {
                  const isVisited = cur.map.has(item.name);
                  return `<path
                    d="${item.d}"
                    data-place-name="${esc(item.name)}"
                    class="visited-map-shape ${isVisited ? 'is-visited' : 'not-visited'}"
                  />`;
                }).join('')}
              </g>
            </svg>
            <div class="visited-map-legend">
              <span><i class="legend-dot visited"></i> Visited</span>
              <span><i class="legend-dot unvisited"></i> Not visited</span>
              <span><i class="legend-dot ocean"></i> Background</span>
            </div>
          </div>
        ` : `
          <div class="visited-list-panel">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 14px;">
              <h3 style="margin: 0; font-size: 16px;">Visited ${isStates ? 'U.S. States' : 'Countries'} (${visitedEntries.length})</h3>
              <input type="search" id="ww-visited-list-search" class="form-control" style="max-width: 280px;" placeholder="Search all ${isStates ? '50 states' : 'countries'}..." value="${esc(visitedState.listSearch)}" />
            </div>

            ${visitedEntries.length === 0 ? `
              <div style="padding: 24px; text-align: center; color: var(--text-secondary); background: var(--bg-elevated); border-radius: 10px; margin-bottom: 18px;">
                No ${isStates ? 'U.S. states' : 'countries'} marked as visited yet. Switch to the <strong>Map</strong> tab and click any ${isStates ? 'state' : 'country'}, or click <strong>+ Add ${isStates ? 'state' : 'country'}</strong>!
              </div>
            ` : `
              <div class="visited-places-grid" style="margin-bottom: 22px;">
                ${visitedEntries
                  .filter(([name]) => !visitedState.listSearch || name.toLowerCase().includes(visitedState.listSearch.toLowerCase()))
                  .map(([name, source]) => `
                    <div class="visited-place-chip">
                      <div>
                        <strong>📍 ${esc(name)}</strong>
                        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">
                          ${source === 'trip' ? '✈️ From trips' : '✨ Manually added'}
                        </div>
                      </div>
                      <button type="button" class="btn btn-xs btn-danger" data-visited-remove="${esc(name)}">Remove</button>
                    </div>
                  `).join('')}
              </div>
            `}

            <h4 style="margin: 0 0 10px; font-size: 13.5px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">
              All ${isStates ? '50 U.S. States' : 'World Countries'} Directory — Click to Toggle
            </h4>
            <div class="visited-directory-grid">
              ${allNames
                .filter(name => !visitedState.listSearch || name.toLowerCase().includes(visitedState.listSearch.toLowerCase()))
                .map(name => {
                  const isVis = cur.map.has(name);
                  return `
                    <button type="button" class="visited-dir-btn ${isVis ? 'active' : ''}" data-visited-toggle="${esc(name)}">
                      <span>${isVis ? '🟡' : '⚪'} ${esc(name)}</span>
                      <span style="font-size: 11px; opacity: 0.8;">${isVis ? 'Visited ✓' : '+ Add'}</span>
                    </button>
                  `;
                }).join('')}
            </div>
          </div>
        `}
      </div>
    `;

    container.querySelectorAll('[data-visited-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        renderVisitedPlaces(btn.getAttribute('data-visited-mode'));
      });
    });

    container.querySelectorAll('[data-visited-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        visitedState.viewTab = btn.getAttribute('data-visited-tab');
        renderVisitedPlaces();
      });
    });

    const btnBack = container.querySelector('#btn-visited-back-hub');
    if (btnBack) {
      btnBack.addEventListener('click', () => {
        if (bridge() && bridge().switchView) bridge().switchView('hub');
      });
    }

    const btnAddModal = container.querySelector('#btn-visited-add-modal');
    if (btnAddModal) {
      btnAddModal.addEventListener('click', () => openAddVisitedPlaceModal(visitedState.mode));
    }

    // Map interaction (Click state/country -> Confirm Modal, Hover -> Tooltip, Zoom & Pan)
    const stage = container.querySelector('#ww-visited-map-stage');
    const tooltip = container.querySelector('#ww-visited-map-tooltip');
    if (stage) {
      let isDragging = false;
      let dragStartX = 0;
      let dragStartY = 0;
      let movedPixels = 0;

      stage.querySelectorAll('.visited-map-shape').forEach(shape => {
        shape.addEventListener('mouseenter', () => {
          const name = shape.getAttribute('data-place-name');
          const isVis = cur.map.has(name);
          if (tooltip) {
            tooltip.innerHTML = `<strong>${esc(name)}</strong> <span>${isVis ? '• Visited ✓' : '• Click to add'}</span>`;
            tooltip.style.display = 'block';
          }
        });
        shape.addEventListener('mousemove', e => {
          if (!tooltip) return;
          const rect = stage.getBoundingClientRect();
          tooltip.style.left = `${e.clientX - rect.left + 14}px`;
          tooltip.style.top = `${e.clientY - rect.top - 32}px`;
        });
        shape.addEventListener('mouseleave', () => {
          if (tooltip) tooltip.style.display = 'none';
        });
        shape.addEventListener('click', e => {
          e.stopPropagation();
          if (movedPixels > 6) return;
          const name = shape.getAttribute('data-place-name');
          if (!name) return;
          openVisitedConfirmModal(visitedState.mode, name, cur.map.has(name));
        });
      });

      const zoomBy = factor => {
        const nextZoom = Math.max(1, Math.min(6, visitedState.zoom * factor));
        if (nextZoom === 1) {
          visitedState.panX = 0;
          visitedState.panY = 0;
        }
        visitedState.zoom = nextZoom;
        applyMapTransform();
      };

      const btnIn = stage.querySelector('#btn-visited-zoom-in');
      const btnOut = stage.querySelector('#btn-visited-zoom-out');
      const btnReset = stage.querySelector('#btn-visited-zoom-reset');
      if (btnIn) btnIn.addEventListener('click', () => zoomBy(1.35));
      if (btnOut) btnOut.addEventListener('click', () => zoomBy(1 / 1.35));
      if (btnReset) {
        btnReset.addEventListener('click', () => {
          visitedState.zoom = 1;
          visitedState.panX = 0;
          visitedState.panY = 0;
          applyMapTransform();
        });
      }

      stage.addEventListener('mousedown', e => {
        if (e.target.closest('.visited-zoom-controls')) return;
        isDragging = true;
        movedPixels = 0;
        dragStartX = e.clientX - visitedState.panX;
        dragStartY = e.clientY - visitedState.panY;
      });
      window.addEventListener('mousemove', e => {
        if (!isDragging) return;
        const nx = e.clientX - dragStartX;
        const ny = e.clientY - dragStartY;
        movedPixels += Math.hypot(nx - visitedState.panX, ny - visitedState.panY);
        visitedState.panX = nx;
        visitedState.panY = ny;
        applyMapTransform();
      });
      window.addEventListener('mouseup', () => {
        isDragging = false;
      });
    }

    // List search & actions
    const searchInp = container.querySelector('#ww-visited-list-search');
    if (searchInp) {
      searchInp.addEventListener('input', () => {
        visitedState.listSearch = searchInp.value;
        renderVisitedPlaces();
        const nextInp = document.getElementById('ww-visited-list-search');
        if (nextInp) {
          nextInp.focus();
          nextInp.setSelectionRange(nextInp.value.length, nextInp.value.length);
        }
      });
    }

    container.querySelectorAll('[data-visited-remove]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const place = btn.getAttribute('data-visited-remove');
        await saveVisitedPlaceChange(visitedState.mode, place, false);
        toast(`Removed ${place}`);
      });
    });

    container.querySelectorAll('[data-visited-toggle]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const place = btn.getAttribute('data-visited-toggle');
        const isVis = cur.map.has(place);
        await saveVisitedPlaceChange(visitedState.mode, place, !isVis);
        toast(isVis ? `Removed ${place}` : `✓ Added ${place}`);
      });
    });
  }

  document.addEventListener('click', e => {
    if (e.target.closest('#btn-sidebar-visited-countries')) {
      visitedState.mode = 'countries';
      visitedState.viewTab = 'map';
      if (bridge() && bridge().switchView) bridge().switchView('visited-places');
      renderVisitedPlaces('countries');
      return;
    }
    if (e.target.closest('#btn-sidebar-visited-states')) {
      visitedState.mode = 'states';
      visitedState.viewTab = 'map';
      if (bridge() && bridge().switchView) bridge().switchView('visited-places');
      renderVisitedPlaces('states');
      return;
    }
    const modeCard = e.target.closest('[data-open-visited-mode]');
    if (modeCard) {
      const m = modeCard.getAttribute('data-open-visited-mode');
      visitedState.mode = m;
      visitedState.viewTab = 'map';
      if (bridge() && bridge().switchView) bridge().switchView('visited-places');
      renderVisitedPlaces(m);
      return;
    }
  });

  window.WWTravel = {
    render,
    renderHub,
    renderVisitedPlaces,
    syncFromState(s) {
      updateBadges(s);
      renderAdminEmailSync();
      if (s && s.activeView === 'hub') renderHub();
      if (s && s.activeView === 'travel') render();
      if (s && s.activeView === 'visited-places') renderVisitedPlaces();
    },
    openReservationModal,
    openQuickImportModal,
    syncInbox
  };
})();

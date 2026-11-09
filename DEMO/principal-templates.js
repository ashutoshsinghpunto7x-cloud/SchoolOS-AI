/**
 * FNIC Principal Suite — Universal Multi-Theme Screen Generator
 * Renders all 18 Principal screens for any wireframe design theme.
 * Themes supported:
 *  - 'emblem': Warm Paper (#FAF8F5), Book Navy (#1B365D), Muted Saffron (#D97724)
 *  - 'monochrome': Google Material / Monochrome (#FFFFFF, #F8F9FA, #1A73E8, Cool Grays)
 *  - 'nordic': Botanical Sage & Mist (#F4F6F4, #E8ECE8, #2A6B5D, Warm Cedar)
 *  - 'automation': Calm High-Density Automation Studio (#F7F8FA, #255CE7, Crisp Cards)
 */

window.FNIC_PRINCIPAL_SUITE = (function () {
  const DATA = window.FNIC_PRINCIPAL_DATA || {};
  const meta = DATA.meta || {
    schoolName: "Fortunate National Institute of Commerce (FNIC)",
    principalName: "Sunita Verma",
    role: "Principal & Academic Director",
    academicYear: "2026–27",
    stats: {
      attendanceToday: "94.8%",
      attendanceDelta: "+1.2% this week",
      staffPresent: "79 / 82",
      staffOnLeave: "3 approved",
      feeRealization: "88.4%",
      feeDefaulters: "34 students",
      whatsappAlertsSent: "428 today",
      whatsappDeliveryRate: "99.4%"
    }
  };
  const samples = DATA.sampleData || {};

  // Micro-interaction SVG icons
  const ICONS = {
    dashboard: '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
    users: '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    check: '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
    bell: '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
    calendar: '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    book: '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    sparkles: '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>',
    table: '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/></svg>',
    scan: '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><polyline points="7 12 12 7 17 12"/></svg>',
    bus: '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6v6"/><path d="M16 6v6"/><rect width="16" height="16" x="4" y="3" rx="2"/><path d="M4 11h16"/><path d="M8 19v2"/><path d="M16 19v2"/></svg>',
    mail: '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
    rupee: '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12"/><path d="M6 8h12"/><path d="m6 13 8.5 8"/><path d="M6 13h3a4 4 0 0 0 0-8"/></svg>',
    fileChart: '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 18v-2"/><path d="M12 18v-4"/><path d="M16 18v-6"/></svg>',
    gradCap: '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
    userCog: '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="15" r="3"/><circle cx="9" cy="7" r="4"/><path d="M10 15H6a4 4 0 0 0-4 4v2"/></svg>',
    arrowRight: '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>',
    search: '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'
  };

  function getThemeClasses(theme) {
    switch (theme) {
      case 'emblem':
        return {
          card: 'bg-white rounded-card p-5 shadow-sm transition-all',
          subtle: 'bg-sunken',
          primaryBtn: 'bg-brand-navy hover:bg-brand-navyHover text-white font-semibold rounded-control shadow-sm transition-transform active:scale-[0.98]',
          secondaryBtn: 'bg-sunken hover:bg-white text-brand-navy font-semibold rounded-control transition-colors',
          accentPill: 'bg-brand-saffronSoft text-brand-saffron',
          primaryPill: 'bg-brand-navySoft text-brand-navy',
          inkTitle: 'text-ink font-bold',
          inkMuted: 'text-ink-secondary text-[12px]'
        };
      case 'monochrome':
        return {
          card: 'bg-surface rounded-card p-5 border border-google-border/40 hover:border-google-border transition-all shadow-[0_1px_3px_rgba(0,0,0,0.03)]',
          subtle: 'bg-[#F1F3F4]',
          primaryBtn: 'bg-google-blue hover:bg-google-blueHover text-white font-semibold rounded-control shadow-sm transition-transform active:scale-[0.98]',
          secondaryBtn: 'bg-[#F1F3F4] hover:bg-[#E8EAED] text-google-text font-semibold rounded-control transition-colors',
          accentPill: 'bg-[#FEF7E0] text-[#B06000]',
          primaryPill: 'bg-google-blueSoft text-google-blue',
          inkTitle: 'text-google-text font-semibold',
          inkMuted: 'text-google-muted text-[12px]'
        };
      case 'nordic':
        return {
          card: 'bg-surface rounded-card p-5 border border-[#E3E8E5] transition-all shadow-[0_2px_12px_rgba(28,43,40,0.02)]',
          subtle: 'bg-[#EBF0EC]',
          primaryBtn: 'bg-nordic-sage hover:bg-nordic-pine text-white font-semibold rounded-control transition-transform active:scale-[0.98]',
          secondaryBtn: 'bg-[#EBF0EC] hover:bg-[#E0E7E2] text-nordic-slate font-semibold rounded-control transition-colors',
          accentPill: 'bg-[#F8EFEA] text-nordic-cedar',
          primaryPill: 'bg-nordic-sageSoft text-nordic-sage',
          inkTitle: 'text-nordic-slate font-bold',
          inkMuted: 'text-nordic-muted text-[12px]'
        };
      case 'automation':
      default:
        return {
          card: 'calm-surface rounded-card p-5 transition-all',
          subtle: 'bg-subtle',
          primaryBtn: 'bg-primary hover:bg-primary-hover text-white font-semibold rounded-pill transition-transform active:scale-[0.98]',
          secondaryBtn: 'bg-subtle hover:bg-white text-ink font-semibold rounded-pill transition-colors',
          accentPill: 'bg-saffron-tonal text-saffron',
          primaryPill: 'bg-primary-tonal text-primary',
          inkTitle: 'text-ink font-bold',
          inkMuted: 'text-ink-secondary text-[12px]'
        };
    }
  }

  // Individual screen templates
  const screens = {
    // 1. EXECUTIVE COCKPIT / DASHBOARD
    dashboard: function (theme, tc) {
      return `
        <div class="space-y-5">
          <!-- Executive Briefing Bar -->
          <div class="${tc.card} flex flex-wrap items-center justify-between gap-4">
            <div>
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill ${tc.primaryPill} text-[11px] font-bold">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Executive Command Center · Active Term 2</span>
              </span>
              <h1 class="text-[24px] ${tc.inkTitle} mt-1.5 flex items-center gap-2">
                <span>Welcome back, Principal ${meta.principalName}</span>
                <span class="inline-block transform hover:rotate-12 transition-transform cursor-pointer">🎓</span>
              </h1>
              
            </div>
            <div class="flex items-center gap-2">
              <button type="button" onclick="window.FNIC_SHOW_MODAL ? window.FNIC_SHOW_MODAL('Syncing School Feeds', 'All 14 GPS bus streams, 82 biometric clocks, and 42 class roll calls updated.') : alert('School status synchronized')" class="${tc.secondaryBtn} h-9 px-3.5 text-[12px] flex items-center gap-1.5">
                ${ICONS.scan} <span>Sync Campus State</span>
              </button>
              <button type="button" onclick="window.FNIC_NAVIGATE('leave_approvals')" class="${tc.primaryBtn} h-9 px-4 text-[12px] flex items-center gap-1.5">
                ${ICONS.bell} <span>Review 4 Pending Leaves</span>
              </button>
            </div>
          </div>

          <!-- 4 Critical Executive Tiles -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="${tc.card} cursor-pointer hover:-translate-y-0.5" onclick="window.FNIC_NAVIGATE('attendance_scanner')">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Student Attendance</span>
                <span class="p-1 rounded-md ${tc.subtle} text-emerald-600">${ICONS.scan}</span>
              </div>
              <div class="text-[26px] ${tc.inkTitle} mt-1">${meta.stats.attendanceToday}</div>
              <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 mt-1">↑ ${meta.stats.attendanceDelta}</span>
            </div>
            <div class="${tc.card} cursor-pointer hover:-translate-y-0.5" onclick="window.FNIC_NAVIGATE('teachers')">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Faculty On Campus</span>
                <span class="p-1 rounded-md ${tc.subtle} text-blue-600">${ICONS.users}</span>
              </div>
              <div class="text-[26px] ${tc.inkTitle} mt-1">${meta.stats.staffPresent}</div>
              <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 mt-1">${meta.stats.staffOnLeave}</span>
            </div>
            <div class="${tc.card} cursor-pointer hover:-translate-y-0.5" onclick="window.FNIC_NAVIGATE('discount_approvals')">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Fee Realization</span>
                <span class="p-1 rounded-md ${tc.subtle} text-purple-600">${ICONS.rupee}</span>
              </div>
              <div class="text-[26px] ${tc.inkTitle} mt-1">${meta.stats.feeRealization}</div>
              <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-secondary mt-1">${meta.stats.feeDefaulters} pending</span>
            </div>
            <div class="${tc.card} cursor-pointer hover:-translate-y-0.5" onclick="window.FNIC_NAVIGATE('messages')">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Parent Broadcasts</span>
                <span class="p-1 rounded-md ${tc.subtle} text-emerald-600">${ICONS.mail}</span>
              </div>
              <div class="text-[26px] ${tc.inkTitle} mt-1">${meta.stats.whatsappAlertsSent}</div>
              <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 mt-1">${meta.stats.whatsappDeliveryRate} delivered</span>
            </div>
          </div>

          <!-- 2-Column Command Workspace -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <!-- Left 8 Cols: Urgent Approvals & Today's Schedule -->
            <div class="lg:col-span-8 space-y-5">
              <div class="${tc.card}">
                <div class="flex items-center justify-between mb-4">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <h2 class="text-[16px] ${tc.inkTitle}">Urgent Action Required</h2>
                  </div>
                  <span class="text-[12px] ${tc.accentPill} px-2.5 py-0.5 rounded-pill font-bold">7 Pending Approvals</span>
                </div>
                <div class="space-y-3">
                  <div class="p-3.5 rounded-xl ${tc.subtle} flex items-center justify-between gap-3">
                    <div class="flex items-center gap-3">
                      <div class="w-9 h-9 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-[12px]">RK</div>
                      <div>
                        <div class="flex items-center gap-2">
                          <p class="text-[13px] font-bold text-ink">Ramesh Kumar · PGT Physics</p>
                          <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded-pill bg-red-100 text-red-700">Medical Leave</span>
                        </div>
                        <p class="text-[11px] text-ink-secondary">3 Nov – 5 Nov (3 days) · Substitute: Sunita Joshi (Period 3 free)</p>
                      </div>
                    </div>
                    <div class="flex gap-2">
                      <button type="button" onclick="window.FNIC_APPROVE('leave', 'l-1')" class="${tc.primaryBtn} h-8 px-3 text-[11px]">Sign Off</button>
                    </div>
                  </div>

                  <div class="p-3.5 rounded-xl ${tc.subtle} flex items-center justify-between gap-3">
                    <div class="flex items-center gap-3">
                      <div class="w-9 h-9 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[12px]">MT</div>
                      <div>
                        <div class="flex items-center gap-2">
                          <p class="text-[13px] font-bold text-ink">Class 12 Pre-Board Commerce Mock Test</p>
                          <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded-pill bg-blue-100 text-blue-700">Test Paper Signoff</span>
                        </div>
                        <p class="text-[11px] text-ink-secondary">Accountancy & Business Studies · 80 Marks · Blueprint CBSE 2026</p>
                      </div>
                    </div>
                    <div class="flex gap-2">
                      <button type="button" onclick="window.FNIC_APPROVE('test', 't-1')" class="${tc.primaryBtn} h-8 px-3 text-[11px]">Authorize</button>
                    </div>
                  </div>

                  <div class="p-3.5 rounded-xl ${tc.subtle} flex items-center justify-between gap-3">
                    <div class="flex items-center gap-3">
                      <div class="w-9 h-9 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-[12px]">FD</div>
                      <div>
                        <div class="flex items-center gap-2">
                          <p class="text-[13px] font-bold text-ink">Sibling Fee Concession: Aarav & Ananya Sharma</p>
                          <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded-pill bg-purple-100 text-purple-700">25% Discount</span>
                        </div>
                        <p class="text-[11px] text-ink-secondary">Standard institutional discount applied to second child (Class 7-B)</p>
                      </div>
                    </div>
                    <div class="flex gap-2">
                      <button type="button" onclick="window.FNIC_APPROVE('discount', 'd-1')" class="${tc.primaryBtn} h-8 px-3 text-[11px]">Approve ₹6,250</button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Academic Syllabus Pacing Card -->
              <div class="${tc.card}">
                <div class="flex items-center justify-between mb-3">
                  <h3 class="text-[15px] ${tc.inkTitle}">Curriculum Pace & Syllabus Mastery (Term 2)</h3>
                  <button type="button" onclick="window.FNIC_NAVIGATE('academic_plan')" class="text-[12px] font-bold text-blue-600 hover:underline">View All 42 Classes →</button>
                </div>
                <div class="space-y-3">
                  ${(samples.academicPlan || []).map(p => `
                    <div class="p-3 rounded-xl ${tc.subtle}">
                      <div class="flex items-center justify-between text-[12px] mb-1">
                        <span class="font-bold text-ink">${p.subject} · ${p.class}</span>
                        <span class="font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-pill text-[10px]">${p.status} (${p.completion})</span>
                      </div>
                      <div class="w-full h-2 bg-black/5 rounded-full overflow-hidden">
                        <div class="h-full bg-emerald-500 rounded-full" style="width: ${p.completion}"></div>
                      </div>
                      <div class="flex justify-between text-[11px] text-ink-secondary mt-1">
                        <span>Teacher: ${p.teacher}</span>
                        <span>Next Milestone: ${p.nextMilestone}</span>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>

            <!-- Right 4 Cols: Live Campus Telemetry -->
            <div class="lg:col-span-4 space-y-5">
              <!-- Live Fleet Card -->
              <div class="${tc.card}">
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-2">
                    <span class="p-1 rounded bg-amber-100 text-amber-700">${ICONS.bus}</span>
                    <h3 class="text-[14px] ${tc.inkTitle}">Transport Fleet (14 Buses)</h3>
                  </div>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-pill bg-emerald-100 text-emerald-700">GPS Live</span>
                </div>
                <div class="p-3 rounded-xl bg-amber-50/60 border border-amber-200/50 space-y-1">
                  <p class="text-[12px] font-bold text-amber-900">Route 4 Traffic Alert</p>
                  <p class="text-[11px] text-amber-800 leading-snug">${(samples.transport && samples.transport.delayedRoute) || 'Noida Sector 62 diversion'}</p>
                </div>
                <div class="mt-3 text-[12px] space-y-1.5 text-ink-secondary">
                  <div class="flex justify-between"><span>Speed compliance</span><span class="font-bold text-emerald-700">100% OK</span></div>
                  <div class="flex justify-between"><span>Active morning trips</span><span class="font-bold text-ink">14 completed</span></div>
                  <div class="flex justify-between"><span>Afternoon departure</span><span class="font-bold text-ink">02:30 PM queued</span></div>
                </div>
                <button type="button" onclick="window.FNIC_NAVIGATE('transport')" class="${tc.secondaryBtn} w-full mt-3 h-8 text-[11px]">Open Fleet Radar →</button>
              </div>

              <!-- Front Desk Daily Inquiries -->
              <div class="${tc.card}">
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-2">
                    <span class="p-1 rounded bg-blue-100 text-blue-700">${ICONS.fileChart}</span>
                    <h3 class="text-[14px] ${tc.inkTitle}">Front Desk Activity</h3>
                  </div>
                  <span class="text-[11px] text-ink-faint">Today</span>
                </div>
                <div class="grid grid-cols-2 gap-2 text-center">
                  <div class="p-2.5 rounded-xl ${tc.subtle}">
                    <div class="text-[20px] font-bold text-ink">${(samples.frontOffice && samples.frontOffice.visitorsToday) || 18}</div>
                    <span class="text-[10px] text-ink-secondary uppercase font-semibold">Visitors</span>
                  </div>
                  <div class="p-2.5 rounded-xl ${tc.subtle}">
                    <div class="text-[20px] font-bold text-ink">${(samples.frontOffice && samples.frontOffice.inquiriesToday) || 12}</div>
                    <span class="text-[10px] text-ink-secondary uppercase font-semibold">New Inquiries</span>
                  </div>
                </div>
                <p class="text-[11px] text-ink-secondary mt-3">Trending: <strong>${(samples.frontOffice && samples.frontOffice.topInquiryClass) || 'Class 11 Commerce'}</strong></p>
                <button type="button" onclick="window.FNIC_NAVIGATE('front_office')" class="${tc.secondaryBtn} w-full mt-3 h-8 text-[11px]">View Visitor Log →</button>
              </div>

              <!-- Quick Leadership Shortcuts -->
              <div class="${tc.card} space-y-2">
                <h3 class="text-[14px] ${tc.inkTitle} mb-2">Executive Shortcuts</h3>
                <button type="button" onclick="window.FNIC_NAVIGATE('recruitment')" class="${tc.secondaryBtn} w-full h-8 text-[12px] flex items-center justify-between px-3">
                  <span>${ICONS.users} &nbsp; Teacher Hiring (6 Roles)</span>
                  ${ICONS.arrowRight}
                </button>
                <button type="button" onclick="window.FNIC_NAVIGATE('school_timetable')" class="${tc.secondaryBtn} w-full h-8 text-[12px] flex items-center justify-between px-3">
                  <span>${ICONS.table} &nbsp; Master School Timetable</span>
                  ${ICONS.arrowRight}
                </button>
                <button type="button" onclick="window.FNIC_NAVIGATE('calendar')" class="${tc.secondaryBtn} w-full h-8 text-[12px] flex items-center justify-between px-3">
                  <span>${ICONS.calendar} &nbsp; Term 2 Assessment Calendar</span>
                  ${ICONS.arrowRight}
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    },

    // 2. RECRUITMENT & HIRING
    recruitment: function (theme, tc) {
      const rec = samples.recruitment || { openRoles: [], interviewsToday: [] };
      return `
        <div class="space-y-5">
          <div class="${tc.card} flex flex-wrap items-center justify-between gap-4">
            <div>
              <span class="px-2.5 py-0.5 rounded-pill ${tc.primaryPill} text-[11px] font-bold">HR &amp; Faculty Pipeline</span>
              <h1 class="text-[22px] ${tc.inkTitle} mt-1">Faculty Recruitment &amp; Interview Panel</h1>
              
            </div>
            <button type="button" onclick="window.FNIC_SHOW_MODAL ? window.FNIC_SHOW_MODAL('Create Teaching Position', 'New CBSE hiring requisition opened for academic year 2026-27.') : alert('Requisition created')" class="${tc.primaryBtn} h-9 px-4 text-[12px]">
              + Post New Requisition
            </button>
          </div>

          <!-- Interviews Scheduled Today -->
          <div class="${tc.card}">
            <h3 class="text-[15px] ${tc.inkTitle} mb-3 flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Interviews &amp; Demo Lectures Scheduled Today</span>
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              ${(rec.interviewsToday || []).map(iv => `
                <div class="p-3.5 rounded-xl ${tc.subtle} space-y-1.5">
                  <div class="flex items-center justify-between">
                    <span class="text-[11px] font-bold px-2 py-0.5 rounded-pill bg-emerald-100 text-emerald-800">${iv.time}</span>
                    <span class="text-[11px] text-ink-secondary">${iv.mode}</span>
                  </div>
                  <p class="text-[14px] font-bold text-ink">${iv.candidate}</p>
                  <p class="text-[12px] text-ink-secondary font-medium">${iv.role} · ${iv.experience}</p>
                  <div class="pt-1 flex gap-2">
                    <button type="button" onclick="window.FNIC_SHOW_MODAL('Open Rubric', 'Evaluating ${iv.candidate} on Subject Knowledge, Board Command, and Student Engagement.')" class="${tc.primaryBtn} h-7 px-3 text-[11px]">Score Demo Rubric</button>
                    <button type="button" onclick="window.FNIC_SHOW_MODAL('Candidate Dossier', 'Viewing CV and degrees for ${iv.candidate}.')" class="${tc.secondaryBtn} h-7 px-3 text-[11px]">View Dossier</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Open Requisitions Grid -->
          <div class="${tc.card}">
            <h3 class="text-[15px] ${tc.inkTitle} mb-3">Active Teaching Requisitions</h3>
            <div class="divide-y divide-black/5">
              ${(rec.openRoles || []).map(r => `
                <div class="py-2.5 flex items-center justify-between gap-2 flex-nowrap border-b border-black/[0.04] last:border-0">
                  <div>
                    <p class="text-[14px] font-bold text-ink">${r.title}</p>
                    <p class="text-[12px] text-ink-secondary">${r.applicants} Applicants · ${r.shortlisted} Shortlisted · Current Round: <strong>${r.status}</strong></p>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-[11px] font-semibold px-2.5 py-1 rounded-pill ${tc.primaryPill}">${r.interviewsToday} Today</span>
                    <button type="button" onclick="window.FNIC_SHOW_MODAL('Review Applicants', 'Displaying ${r.shortlisted} shortlisted applications for ${r.title}.')" class="${tc.secondaryBtn} h-8 px-3 text-[11px]">Review Pipeline</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    },

    // 3. FRONT OFFICE REPORTS
    front_office: function (theme, tc) {
      const fo = samples.frontOffice || {};
      return `
        <div class="space-y-5">
          <div class="${tc.card} flex flex-wrap items-center justify-between gap-4">
            <div>
              <span class="px-2.5 py-0.5 rounded-pill ${tc.primaryPill} text-[11px] font-bold">Front Office Telemetry</span>
              <h1 class="text-[22px] ${tc.inkTitle} mt-1">Front Office, Visitor &amp; Inquiry Reports</h1>
              
            </div>
            <button type="button" onclick="window.FNIC_SHOW_MODAL ? window.FNIC_SHOW_MODAL('Export Front Office Report', 'Generating certified PDF log for Directorate of Education compliance.') : alert('Exported')" class="${tc.primaryBtn} h-9 px-4 text-[12px]">
              Export PDF Log
            </button>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="${tc.card} text-center">
              <span class="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Visitors Today</span>
              <div class="text-[26px] ${tc.inkTitle} mt-1">${fo.visitorsToday || 18}</div>
              <span class="text-[11px] text-emerald-600 font-semibold">All Gate Passes Closed</span>
            </div>
            <div class="${tc.card} text-center">
              <span class="text-[11px] font-bold uppercase tracking-wider text-ink-faint">New Admissions</span>
              <div class="text-[26px] ${tc.inkTitle} mt-1">${fo.admissionsThisMonth || '42 Enrolled'}</div>
              <span class="text-[11px] text-blue-600 font-semibold">On target for 2026-27</span>
            </div>
            <div class="${tc.card} text-center">
              <span class="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Scheduled Visits</span>
              <div class="text-[26px] ${tc.inkTitle} mt-1">${fo.scheduledVisits || 6}</div>
              <span class="text-[11px] text-ink-secondary font-semibold">Campus Tour 02:00 PM</span>
            </div>
            <div class="${tc.card} text-center">
              <span class="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Phone Inquiries</span>
              <div class="text-[26px] ${tc.inkTitle} mt-1">37</div>
              <span class="text-[11px] text-purple-600 font-semibold">Auto-WhatsApp Sent</span>
            </div>
          </div>

          <div class="${tc.card}">
            <h3 class="text-[15px] ${tc.inkTitle} mb-3">Recent Gate Passes &amp; Parent Consultations</h3>
            <div class="divide-y divide-black/5">
              <div class="py-3">
                <p class="text-[13px] leading-snug">
                  <span class="font-bold text-ink">Vikramaditya Singhal</span>
                  <span class="text-[12px] text-ink-secondary"> · Pass #G-104 · Purpose: Class 11 Commerce Admission Consultation with Principal</span>
                </p>
                <div class="flex justify-end mt-1.5">
                  <span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-pill bg-emerald-100 text-emerald-800">Checked In 10:15 AM</span>
                </div>
              </div>
              <div class="py-3">
                <p class="text-[13px] leading-snug">
                  <span class="font-bold text-ink">Dr. R. K. Mukherjee</span>
                  <span class="text-[12px] text-ink-secondary"> · Pass #G-103 · Purpose: CBSE Board Science Inspection Liaison</span>
                </p>
                <div class="flex justify-end mt-1.5">
                  <span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-pill bg-blue-100 text-blue-800">With Vice Principal</span>
                </div>
              </div>
              <div class="py-3">
                <p class="text-[13px] leading-snug">
                  <span class="font-bold text-ink">Mrs. Neeta Agarwal</span>
                  <span class="text-[12px] text-ink-secondary"> · Pass #G-102 · Purpose: Student Early Exit (Health checkup · Rohan Agarwal Class 9-A)</span>
                </p>
                <div class="flex justify-end mt-1.5">
                  <span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-pill bg-gray-100 text-gray-700">Checked Out 11:30 AM</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    },

    // 4. LEAVE APPROVALS (Approvals Group)
    leave_approvals: function (theme, tc) {
      const leaves = samples.leaves || [];
      return `
        <div class="space-y-5">
          <div class="${tc.card} flex flex-wrap items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span class="px-2.5 py-0.5 rounded-pill ${tc.accentPill} text-[11px] font-bold">4 Pending Sign-Offs</span>
              </div>
              <h1 class="text-[22px] ${tc.inkTitle} mt-1">Faculty &amp; Staff Leave Approvals</h1>
              
            </div>
            <div class="flex gap-2">
              <button type="button" onclick="window.FNIC_SHOW_MODAL ? window.FNIC_SHOW_MODAL('All Approved', 'All 4 staff leaves approved with automated substitute notifications.') : alert('All approved')" class="${tc.primaryBtn} h-9 px-4 text-[12px]">
                Approve All With Auto-Substitute
              </button>
            </div>
          </div>

          <div class="space-y-3">
            ${leaves.map(l => `
              <div class="${tc.card} space-y-3">
                <div class="flex items-center justify-between gap-3">
                  <div class="flex items-center gap-2 min-w-0 flex-wrap sm:flex-nowrap">
                    <span class="text-[15px] font-bold text-ink whitespace-nowrap">${l.teacher}</span>
                    <span class="text-[12px] text-ink-secondary whitespace-nowrap">(${l.designation})</span>
                  </div>
                  <span class="h-6 px-3 rounded-pill text-[10px] font-bold uppercase whitespace-nowrap inline-flex items-center justify-center shrink-0 ${l.type.includes('Medical') ? 'bg-red-100 text-red-700' : l.type.includes('Casual') ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}">${l.type}</span>
                </div>
                <div class="space-y-1 text-[12px]">
                  <p class="text-ink font-medium">Dates: <strong>${l.dates}</strong></p>
                  <p class="text-ink font-medium truncate" title="${l.reason}">Reason: <span class="text-ink-secondary">${l.reason}</span></p>
                  <div class="pt-0.5">
                    <span class="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded inline-block">
                      ✓ Recommended Substitute: ${l.substitute}
                    </span>
                  </div>
                </div>
                <div class="flex items-center gap-2 pt-1 border-t border-black/[0.04]">
                  <button type="button" onclick="window.FNIC_SHOW_MODAL('Request Clarification', 'Sending WhatsApp nudge to ${l.teacher} for additional medical paperwork.')" class="${tc.secondaryBtn} h-8 px-3 text-[11px]">Nudge / Clarify</button>
                  <button type="button" onclick="window.FNIC_APPROVE('leave', '${l.id}')" class="${tc.primaryBtn} h-8 px-4 text-[11px]">Authorize Leave</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    },

    // 5. TEST APPROVALS
    test_approvals: function (theme, tc) {
      const tests = samples.tests || [];
      return `
        <div class="space-y-5">
          <div class="${tc.card} flex flex-wrap items-center justify-between gap-4">
            <div>
              <span class="px-2.5 py-0.5 rounded-pill ${tc.primaryPill} text-[11px] font-bold">Academic Assessment Quality Gate</span>
              <h1 class="text-[22px] ${tc.inkTitle} mt-1">Mock Test &amp; Examination Sign-Offs</h1>
              
            </div>
          </div>

          <div class="space-y-3">
            ${tests.map(t => `
              <div class="${tc.card} space-y-3">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span class="text-[11px] font-bold px-2 py-0.5 rounded-pill bg-blue-100 text-blue-800">${t.subject} · ${t.class}</span>
                    <h3 class="text-[15px] font-bold text-ink mt-1">${t.name}</h3>
                    <p class="text-[12px] text-ink-secondary">Prepared by: <strong>${t.preparedBy}</strong> · Total Marks: ${t.marks} · Date: ${t.date}</p>
                  </div>
                  <div class="flex gap-2">
                    <button type="button" onclick="window.FNIC_SHOW_MODAL('Inspect Test Blueprint', 'Viewing CBSE Chapter Weightage matrix for ${t.name}.')" class="${tc.secondaryBtn} h-8 px-3 text-[11px]">Preview Blueprint</button>
                    <button type="button" onclick="window.FNIC_APPROVE('test', '${t.id}')" class="${tc.primaryBtn} h-8 px-4 text-[11px]">Approve &amp; Send to Printing</button>
                  </div>
                </div>
                <div class="p-3 rounded-xl ${tc.subtle} text-[11px] text-ink-secondary">
                  <strong>Chapters Covered:</strong> ${t.chapters}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    },

    // 6. DISCOUNT APPROVALS
    discount_approvals: function (theme, tc) {
      const disc = samples.discounts || [];
      return `
        <div class="space-y-5">
          <div class="${tc.card} flex flex-wrap items-center justify-between gap-4">
            <div>
              <span class="px-2.5 py-0.5 rounded-pill ${tc.accentPill} text-[11px] font-bold">Financial Concession Oversight</span>
              <h1 class="text-[22px] ${tc.inkTitle} mt-1">Fee Concession &amp; Sibling Discount Approvals</h1>
              
            </div>
          </div>

          <div class="space-y-3">
            ${disc.map(d => `
              <div class="${tc.card} flex flex-wrap items-center justify-between gap-4">
                <div class="space-y-1">
                  <div class="flex items-center gap-2">
                    <span class="text-[15px] font-bold text-ink">${d.student}</span>
                    <span class="text-[12px] text-ink-secondary">(${d.class})</span>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-pill bg-purple-100 text-purple-700">${d.concessionType}</span>
                  </div>
                  <p class="text-[12px] text-ink font-medium">Original Fee: <strong>${d.originalFee}</strong> → Discounted Fee: <strong class="text-emerald-700">${d.discountedFee}</strong> (Waiver: ${d.discountAmount})</p>
                  <p class="text-[11px] text-ink-secondary">Reason: ${d.reason}</p>
                </div>
                <div class="flex gap-2">
                  <button type="button" onclick="window.FNIC_SHOW_MODAL('Concession Rejected', 'Concession request returned to Accounts desk.')" class="${tc.secondaryBtn} h-8 px-3 text-[11px]">Decline</button>
                  <button type="button" onclick="window.FNIC_APPROVE('discount', '${d.id}')" class="${tc.primaryBtn} h-8 px-4 text-[11px]">Sign Off ${d.discountAmount}</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    },

    // 7. ACADEMIC PLAN (Academics Group)
    academic_plan: function (theme, tc) {
      const plans = samples.academicPlan || [];
      return `
        <div class="space-y-5">
          <div class="${tc.card} flex flex-wrap items-center justify-between gap-4">
            <div>
              <span class="px-2.5 py-0.5 rounded-pill ${tc.primaryPill} text-[11px] font-bold">CBSE Curriculum Compliance</span>
              <h1 class="text-[22px] ${tc.inkTitle} mt-1">Academic Plan Master Dashboard</h1>
              
            </div>
            <button type="button" onclick="window.FNIC_SHOW_MODAL ? window.FNIC_SHOW_MODAL('Syncing All Lesson Plans', '42 class diaries synchronized with CBSE 2026 guidelines.') : alert('Synced')" class="${tc.primaryBtn} h-9 px-4 text-[12px]">
              Audit All 42 Lesson Plans
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${plans.map(p => `
              <div class="${tc.card} space-y-3">
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-[15px] font-bold text-ink">${p.subject}</h3>
                    <p class="text-[12px] text-ink-secondary">${p.class} · Faculty: <strong>${p.teacher}</strong></p>
                  </div>
                  <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-pill ${p.status.includes('Ahead') ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}">${p.status}</span>
                </div>
                <div>
                  <div class="flex justify-between text-[11px] font-semibold text-ink mb-1">
                    <span>Curriculum Completed</span>
                    <span>${p.completion}</span>
                  </div>
                  <div class="w-full h-2.5 bg-black/5 rounded-full overflow-hidden">
                    <div class="h-full bg-emerald-500 rounded-full" style="width: ${p.completion}"></div>
                  </div>
                </div>
                <div class="p-2.5 rounded-xl ${tc.subtle} text-[11px] text-ink-secondary flex justify-between">
                  <span>Next: <strong>${p.nextMilestone}</strong></span>
                  <span>Target: <strong>${p.milestoneDate}</strong></span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    },

    // 8. MARKS & REPORT CARDS
    marks_hub: function (theme, tc) {
      return `
        <div class="space-y-5">
          <div class="${tc.card} flex flex-wrap items-center justify-between gap-4">
            <div>
              <span class="px-2.5 py-0.5 rounded-pill ${tc.primaryPill} text-[11px] font-bold">Performance Analytics</span>
              <h1 class="text-[22px] ${tc.inkTitle} mt-1">Marks, Grading &amp; Report Card Generation</h1>
              
            </div>
            <button type="button" onclick="window.FNIC_SHOW_MODAL('Batch Generate PDF', '1,240 standardized bilingual report cards queued for rendering.')" class="${tc.primaryBtn} h-9 px-4 text-[12px]">
              Batch Print Report Cards
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="${tc.card} space-y-2">
              <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded-pill bg-emerald-100 text-emerald-800">Ready To Publish</span>
              <h3 class="text-[14px] font-bold text-ink">Class 10 Term 1 Final Marks</h3>
              <p class="text-[12px] text-ink-secondary">All 5 sections submitted and moderated. School average: 81.4%.</p>
              <button type="button" onclick="window.FNIC_SHOW_MODAL('Publish Marks', 'Class 10 Term 1 marks published to Student and Parent portals.')" class="${tc.primaryBtn} w-full mt-2 h-8 text-[11px]">Publish to Parent Portal</button>
            </div>
            <div class="${tc.card} space-y-2">
              <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded-pill bg-amber-100 text-amber-800">Pending Moderation</span>
              <h3 class="text-[14px] font-bold text-ink">Class 12 Pre-Board 1 Marks</h3>
              <p class="text-[12px] text-ink-secondary">Physics & Accountancy practical scores awaiting lab sign-off.</p>
              <button type="button" onclick="window.FNIC_SHOW_MODAL('Review Moderation', 'Opening score moderation panel for Class 12 Pre-Board.')" class="${tc.secondaryBtn} w-full mt-2 h-8 text-[11px]">Inspect Moderation</button>
            </div>
            <div class="${tc.card} space-y-2">
              <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded-pill bg-purple-100 text-purple-800">Remedial Focus</span>
              <h3 class="text-[14px] font-bold text-ink">Remedial Students List</h3>
              <p class="text-[12px] text-ink-secondary">28 students identified for Saturday extra revision in Mathematics.</p>
              <button type="button" onclick="window.FNIC_SHOW_MODAL('Remedial Allocation', 'Assigning PGT Math extra doubt-clearing sessions.')" class="${tc.secondaryBtn} w-full mt-2 h-8 text-[11px]">View Remedial Roster</button>
            </div>
          </div>
        </div>
      `;
    },

    // 9. EXAMS & ASSESSMENTS
    exams_list: function (theme, tc) {
      return `
        <div class="space-y-5">
          <div class="${tc.card} flex flex-wrap items-center justify-between gap-4">
            <div>
              <span class="px-2.5 py-0.5 rounded-pill ${tc.primaryPill} text-[11px] font-bold">Assessment Master</span>
              <h1 class="text-[22px] ${tc.inkTitle} mt-1">Exams, Term Dates &amp; Seating Plans</h1>
              
            </div>
            <button type="button" onclick="window.FNIC_SHOW_MODAL('Auto-Generate Seating', 'Algorithmic room allocation: no 2 students from same class side by side.')" class="${tc.primaryBtn} h-9 px-4 text-[12px]">
              Generate Auto-Seating Matrix
            </button>
          </div>

          <div class="${tc.card}">
            <h3 class="text-[15px] ${tc.inkTitle} mb-3">Upcoming Examination Schedule</h3>
            <div class="divide-y divide-black/5">
              <div class="py-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded-pill bg-blue-100 text-blue-800">18 Nov 2026</span>
                  <p class="text-[14px] font-bold text-ink mt-1">Class 12 Mid-Term Board Practice (Accountancy &amp; Physics)</p>
                  <p class="text-[12px] text-ink-secondary">Timing: 09:00 AM – 12:00 PM · 24 Rooms · 12 Invigilators Assigned</p>
                </div>
                <button type="button" onclick="window.FNIC_SHOW_MODAL('Exam Dossier', 'Viewing invigilator duties and room layout.')" class="${tc.secondaryBtn} h-8 px-3 text-[11px]">View Roster</button>
              </div>
              <div class="py-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded-pill bg-emerald-100 text-emerald-800">22 Nov 2026</span>
                  <p class="text-[14px] font-bold text-ink mt-1">Class 10 Mathematics Standard &amp; Basic Examination</p>
                  <p class="text-[12px] text-ink-secondary">Timing: 09:00 AM – 12:00 PM · 18 Rooms · Answer Sheets Pre-Printed</p>
                </div>
                <button type="button" onclick="window.FNIC_SHOW_MODAL('Exam Dossier', 'Viewing invigilator duties and room layout.')" class="${tc.secondaryBtn} h-8 px-3 text-[11px]">View Roster</button>
              </div>
            </div>
          </div>
        </div>
      `;
    },

    // 10. QUESTION BANK
    question_bank: function (theme, tc) {
      return `
        <div class="space-y-5">
          <div class="${tc.card} flex flex-wrap items-center justify-between gap-4">
            <div>
              <span class="px-2.5 py-0.5 rounded-pill ${tc.primaryPill} text-[11px] font-bold">Curated Content Library</span>
              <h1 class="text-[22px] ${tc.inkTitle} mt-1">Question Bank &amp; Test Paper Generator</h1>
              
            </div>
            <button type="button" onclick="window.FNIC_SHOW_MODAL('Auto-Generate Test', 'Creating 80-mark balanced blueprint with 20 MCQs, 5 short, and 3 case-based questions.')" class="${tc.primaryBtn} h-9 px-4 text-[12px]">
              + Generate Test From Bank
            </button>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="${tc.card} text-center">
              <span class="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Commerce &amp; Accounts</span>
              <div class="text-[24px] ${tc.inkTitle} mt-1">2,840</div>
              <span class="text-[11px] text-emerald-600 font-semibold">Updated 2026</span>
            </div>
            <div class="${tc.card} text-center">
              <span class="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Mathematics</span>
              <div class="text-[24px] ${tc.inkTitle} mt-1">3,120</div>
              <span class="text-[11px] text-blue-600 font-semibold">Includes Assertion/Reason</span>
            </div>
            <div class="${tc.card} text-center">
              <span class="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Science &amp; Physics</span>
              <div class="text-[24px] ${tc.inkTitle} mt-1">1,650</div>
              <span class="text-[11px] text-purple-600 font-semibold">Diagram based</span>
            </div>
            <div class="${tc.card} text-center">
              <span class="text-[11px] font-bold uppercase tracking-wider text-ink-faint">English &amp; Humanities</span>
              <div class="text-[24px] ${tc.inkTitle} mt-1">820</div>
              <span class="text-[11px] text-ink-secondary font-semibold">Unseen passages</span>
            </div>
          </div>
        </div>
      `;
    },

    // 11. SCHOOL CALENDAR
    calendar: function (theme, tc) {
      return `
        <div class="space-y-5">
          <div class="${tc.card} flex flex-wrap items-center justify-between gap-4">
            <div>
              <span class="px-2.5 py-0.5 rounded-pill ${tc.primaryPill} text-[11px] font-bold">Institutional Timeline</span>
              <h1 class="text-[22px] ${tc.inkTitle} mt-1">Academic Calendar 2026–27</h1>
              
            </div>
            <button type="button" onclick="window.FNIC_SHOW_MODAL('Add Calendar Event', 'New school event notified via WhatsApp to all parents.')" class="${tc.primaryBtn} h-9 px-4 text-[12px]">
              + Add Institutional Event
            </button>
          </div>

          <div class="${tc.card}">
            <h3 class="text-[15px] ${tc.inkTitle} mb-3">November 2026 Key Dates</h3>
            <div class="space-y-2.5">
              <div class="p-3 rounded-xl ${tc.subtle} flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex flex-col items-center justify-center font-bold">
                    <span class="text-[10px] leading-tight">NOV</span>
                    <span class="text-[14px] leading-tight">07</span>
                  </div>
                  <div>
                    <p class="text-[13px] font-bold text-ink">Parent-Teacher Meeting (Term 1 Marks Review)</p>
                    <p class="text-[11px] text-ink-secondary">Classes 9 to 12 · 08:30 AM to 01:30 PM · Slot booking active</p>
                  </div>
                </div>
                <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-pill bg-amber-100 text-amber-800">Mandatory</span>
              </div>

              <div class="p-3 rounded-xl ${tc.subtle} flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex flex-col items-center justify-center font-bold">
                    <span class="text-[10px] leading-tight">NOV</span>
                    <span class="text-[14px] leading-tight">14</span>
                  </div>
                  <div>
                    <p class="text-[13px] font-bold text-ink">Annual Children's Day Carnival &amp; Cultural Fest</p>
                    <p class="text-[11px] text-ink-secondary">Campus Open Day · Inter-House Debate &amp; Drama Competitions</p>
                  </div>
                </div>
                <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-pill bg-purple-100 text-purple-800">Celebration</span>
              </div>
            </div>
          </div>
        </div>
      `;
    },

    // 12. FACULTY DIRECTORY (Staff Group)
    teachers: function (theme, tc) {
      const teachers = samples.teachers || [];
      return `
        <div class="space-y-5">
          <div class="${tc.card} flex flex-wrap items-center justify-between gap-4">
            <div>
              <span class="px-2.5 py-0.5 rounded-pill ${tc.primaryPill} text-[11px] font-bold">Staff Roster</span>
              <h1 class="text-[22px] ${tc.inkTitle} mt-1">Faculty &amp; Teaching Staff Directory</h1>
              
            </div>
            <button type="button" onclick="window.FNIC_SHOW_MODAL('Add Faculty Member', 'Registering new faculty member into FNIC system.')" class="${tc.primaryBtn} h-9 px-4 text-[12px]">
              + Onboard Faculty Member
            </button>
          </div>

          <div class="${tc.card}">
            <div class="divide-y divide-black/5">
              ${teachers.map(t => `
                <div class="py-2.5 flex items-center justify-between gap-2 flex-nowrap border-b border-black/[0.04] last:border-0">
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="w-10 h-10 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[13px] shrink-0">${t.name.split(' ').map(n=>n[0]).join('')}</div>
                    <div class="min-w-0">
                      <div class="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <p class="text-[14px] font-bold text-ink whitespace-nowrap">${t.name}</p>
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-pill bg-blue-50 text-blue-700 whitespace-nowrap shrink-0">${t.designation}</span>
                      </div>
                      <p class="text-[12px] text-ink-secondary truncate">${t.department} · Class Teacher: <strong>${t.classTeacherOf}</strong> · ${t.classes}</p>
                    </div>
                  </div>
                  <div class="flex flex-col items-end justify-center gap-1.5 shrink-0">
                    <span class="text-[10px] font-semibold px-2.5 py-0.5 rounded-pill whitespace-nowrap ${t.status === 'Present' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}">${t.status}</span>
                    <button type="button" onclick="window.FNIC_SHOW_MODAL('Teacher Dossier', 'Opening full portfolio for ${t.name}.')" class="${tc.secondaryBtn} h-6 px-3 text-[11px] whitespace-nowrap">View</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    },

    // 13. CLASS TEACHERS ALLOCATION
    class_teachers: function (theme, tc) {
      return `
        <div class="space-y-5">
          <div class="${tc.card} flex flex-wrap items-center justify-between gap-4">
            <div>
              <span class="px-2.5 py-0.5 rounded-pill ${tc.primaryPill} text-[11px] font-bold">Leadership Allocation</span>
              <h1 class="text-[22px] ${tc.inkTitle} mt-1">Class Teacher In-Charge Allocation</h1>
              
            </div>
            <button type="button" onclick="window.FNIC_SHOW_MODAL('Allocation Saved', 'Class teacher allocations updated for all sections.')" class="${tc.primaryBtn} h-9 px-4 text-[12px]">
              Save Allocation Matrix
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="${tc.card} space-y-2">
              <h3 class="text-[15px] font-bold text-ink">Class 10 Section A</h3>
              <p class="text-[12px] text-ink-secondary">Current In-Charge: <strong>Devansh Joshi (PGT Math)</strong></p>
              <div class="text-[11px] text-emerald-700 bg-emerald-50 p-2 rounded">✓ 100% on-time roll call record this month</div>
            </div>
            <div class="${tc.card} space-y-2">
              <h3 class="text-[15px] font-bold text-ink">Class 12 Section B (Commerce)</h3>
              <p class="text-[12px] text-ink-secondary">Current In-Charge: <strong>Sunita Verma (Principal / Direct Charge)</strong></p>
              <div class="text-[11px] text-blue-700 bg-blue-50 p-2 rounded">Board examination focus section</div>
            </div>
          </div>
        </div>
      `;
    },

    // 14. TEACHER TIMETABLE BUILDER
    teacher_timetable: function (theme, tc) {
      return `
        <div class="space-y-5">
          <div class="${tc.card} flex flex-wrap items-center justify-between gap-4">
            <div>
              <span class="px-2.5 py-0.5 rounded-pill ${tc.primaryPill} text-[11px] font-bold">Faculty Load Balancing</span>
              <h1 class="text-[22px] ${tc.inkTitle} mt-1">Individual Faculty Timetable Builder</h1>
              
            </div>
            <button type="button" onclick="window.FNIC_SHOW_MODAL('Auto-Optimize', 'Balancing faculty load: no teacher assigned more than 3 consecutive periods.')" class="${tc.primaryBtn} h-9 px-4 text-[12px]">
              Auto-Balance Workload
            </button>
          </div>

          <div class="${tc.card}">
            <h3 class="text-[15px] ${tc.inkTitle} mb-3">Workload Distribution (Target: 28 Periods / Week)</h3>
            <div class="divide-y divide-black/5 text-[12px]">
              <div class="py-2.5 flex justify-between items-center">
                <span>Ramesh Kumar (PGT Physics)</span>
                <span class="font-bold text-ink">26 / 28 periods (2 Free)</span>
              </div>
              <div class="py-2.5 flex justify-between items-center">
                <span>Pooja Sharma (TGT Mathematics)</span>
                <span class="font-bold text-ink">28 / 28 periods (Fully Loaded)</span>
              </div>
              <div class="py-2.5 flex justify-between items-center">
                <span>Sunita Joshi (TGT Science)</span>
                <span class="font-bold text-ink">24 / 28 periods (4 Free for substitution)</span>
              </div>
            </div>
          </div>
        </div>
      `;
    },

    // 15. SCHOOL TIMETABLE (Operations Group)
    school_timetable: function (theme, tc) {
      return `
        <div class="space-y-5">
          <div class="${tc.card} flex flex-wrap items-center justify-between gap-4">
            <div>
              <span class="px-2.5 py-0.5 rounded-pill ${tc.primaryPill} text-[11px] font-bold">Institutional Operations</span>
              <h1 class="text-[22px] ${tc.inkTitle} mt-1">Master School Timetable (Grid View)</h1>
              
            </div>
            <button type="button" onclick="window.FNIC_SHOW_MODAL('Timetable Published', 'Updated master timetable broadcast to digital noticeboards.')" class="${tc.primaryBtn} h-9 px-4 text-[12px]">
              Publish to Smart Displays
            </button>
          </div>

          <div class="${tc.card} overflow-x-auto">
            <table class="w-full text-[12px] text-left">
              <thead>
                <tr class="border-b border-black/10 text-ink-secondary">
                  <th class="py-2 font-bold">Class / Period</th>
                  <th class="py-2">P1 (08:30)</th>
                  <th class="py-2">P2 (09:15)</th>
                  <th class="py-2">P3 (10:00)</th>
                  <th class="py-2">Recess</th>
                  <th class="py-2">P4 (11:15)</th>
                  <th class="py-2">P5 (12:00)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-black/5 font-medium">
                <tr>
                  <td class="py-2.5 font-bold text-ink">Class 10-A</td>
                  <td class="py-2.5 text-blue-700">Math (Devansh)</td>
                  <td class="py-2.5 text-purple-700">Science (Sunita)</td>
                  <td class="py-2.5 text-amber-700">English (Manish)</td>
                  <td class="py-2.5 text-ink-faint">Break</td>
                  <td class="py-2.5 text-emerald-700">Physics (Ramesh)</td>
                  <td class="py-2.5 text-blue-700">Hindi (Kavita)</td>
                </tr>
                <tr>
                  <td class="py-2.5 font-bold text-ink">Class 12-B Com</td>
                  <td class="py-2.5 text-emerald-700">Accounts (Sunita V)</td>
                  <td class="py-2.5 text-amber-700">Economics (Rajan)</td>
                  <td class="py-2.5 text-blue-700">BST (Priyanka)</td>
                  <td class="py-2.5 text-ink-faint">Break</td>
                  <td class="py-2.5 text-purple-700">Math (Devansh)</td>
                  <td class="py-2.5 text-emerald-700">Library</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    },

    // 16. ATTENDANCE SCANNER
            // 19. CLASS ATTENDANCE ROLL CALL REGISTER (Fully Interactive)
    attendance_class: function (theme, tc) {
      return `
        <div class="space-y-5" id="attendance-register-root">
          
          <!-- Top Control Header: Action buttons properly styled and visible -->
          <div class="bg-white rounded-[18px] p-5 shadow-[0_1px_3px_rgba(27,42,78,0.04)] border border-[#E8E2D6] flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 class="text-[20px] sm:text-[22px] font-bold text-[#1B2A4E]">Class 10-A Attendance Register</h1>
              <p class="text-[13px] text-[#55607A] mt-0.5">12 Students Enrolled</p>
            </div>

            <!-- Top Header Action Buttons: Clearly visible, high-contrast, no white spots -->
            <div class="flex items-center gap-2.5">
              <button 
                type="button" 
                onclick="window.fnicMarkAllPresent()"
                class="h-10 px-4 rounded-full bg-[#F3EEE3] hover:bg-[#E8E2D6] active:scale-95 text-[#1B2A4E] text-[13px] font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                <svg class="w-4 h-4 text-[#D9822B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Mark All Present</span>
              </button>

              <button 
                type="button" 
                onclick="window.fnicSaveAttendance()"
                class="h-10 px-5 rounded-full bg-[#1B2A4E] hover:bg-[#121D38] active:scale-95 text-white text-[13px] font-bold transition-all shadow-sm flex items-center gap-2"
              >
                <span>Save &amp; Dispatch Alerts</span>
                <svg class="w-4 h-4 text-[#F5B332]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </button>
            </div>
          </div>

          <!-- Main Layout: 8-Col Interactive Roster + 4-Col Live Telemetry -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            <!-- Left 8 Cols: Interactive 3-Way Segmented Toggle for every student -->
            <div class="lg:col-span-8 bg-white rounded-[18px] p-5 shadow-[0_1px_3px_rgba(27,42,78,0.04)] border border-[#E8E2D6] space-y-4">
              
              <div class="pb-3 border-b border-[#E8E2D6] space-y-2">
                <div class="text-[15px] font-bold text-[#1B2A4E]">Class 10-A</div>
                <div class="flex flex-wrap items-center gap-2 text-[12px] font-semibold text-[#55607A]" id="live-roster-counts">
                  <span class="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-bold">8 Present</span>
                  <span class="text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full font-bold">2 Absent</span>
                  <span class="text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full font-bold">1 Late</span>
                </div>
              </div>

              <!-- Interactive Student Rows -->
              <div class="divide-y divide-black/5" id="roster-rows-container">

                <div class="py-2.5 flex items-center justify-between gap-2 sm:gap-4">
                  <!-- Left side: Roll + Name (+ reason if any) -->
                  <div class="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <span class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#EBF1F8] text-[#1B2A4E] font-bold text-[11px] sm:text-[12px] flex items-center justify-center shrink-0">01</span>
                    <div class="min-w-0">
                      <p class="text-[13px] sm:text-[14px] font-bold text-[#1B2A4E] truncate">Aarav Verma</p>
                      
                    </div>
                  </div>

                  <!-- Right side: Present / Absent / Late toggle directly BESIDE the name on the exact same row -->
                  <div class="shrink-0 flex items-center">
                    
                      <div class="inline-flex items-center bg-[#F3EEE3] rounded-full p-0.5 sm:p-1 border border-[#E8E2D6]/80 gap-0.5 sm:gap-1 shadow-inner">
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s1', 'present')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-emerald-600 text-white shadow-xs scale-105">P</button>
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s1', 'absent')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">A</button>
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s1', 'late')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">L</button>
                      </div>
                    
                  </div>
                </div>

                <div class="py-2.5 flex items-center justify-between gap-2 sm:gap-4">
                  <!-- Left side: Roll + Name (+ reason if any) -->
                  <div class="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <span class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#EBF1F8] text-[#1B2A4E] font-bold text-[11px] sm:text-[12px] flex items-center justify-center shrink-0">02</span>
                    <div class="min-w-0">
                      <p class="text-[13px] sm:text-[14px] font-bold text-[#1B2A4E] truncate">Ananya Sharma</p>
                      
                    </div>
                  </div>

                  <!-- Right side: Present / Absent / Late toggle directly BESIDE the name on the exact same row -->
                  <div class="shrink-0 flex items-center">
                    
                      <div class="inline-flex items-center bg-[#F3EEE3] rounded-full p-0.5 sm:p-1 border border-[#E8E2D6]/80 gap-0.5 sm:gap-1 shadow-inner">
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s2', 'present')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-emerald-600 text-white shadow-xs scale-105">P</button>
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s2', 'absent')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">A</button>
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s2', 'late')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">L</button>
                      </div>
                    
                  </div>
                </div>

                <div class="py-2.5 flex items-center justify-between gap-2 sm:gap-4">
                  <!-- Left side: Roll + Name (+ reason if any) -->
                  <div class="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <span class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#EBF1F8] text-[#1B2A4E] font-bold text-[11px] sm:text-[12px] flex items-center justify-center shrink-0">03</span>
                    <div class="min-w-0">
                      <p class="text-[13px] sm:text-[14px] font-bold text-[#1B2A4E] truncate">Devansh Mishra</p>
                      <p class="text-[10px] sm:text-[11px] text-red-600 font-medium truncate">High fever reported by mother</p>
                    </div>
                  </div>

                  <!-- Right side: Present / Absent / Late toggle directly BESIDE the name on the exact same row -->
                  <div class="shrink-0 flex items-center">
                    
                      <div class="inline-flex items-center bg-[#F3EEE3] rounded-full p-0.5 sm:p-1 border border-[#E8E2D6]/80 gap-0.5 sm:gap-1 shadow-inner">
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s3', 'present')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">P</button>
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s3', 'absent')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-red-600 text-white shadow-xs scale-105">A</button>
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s3', 'late')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">L</button>
                      </div>
                    
                  </div>
                </div>

                <div class="py-2.5 flex items-center justify-between gap-2 sm:gap-4">
                  <!-- Left side: Roll + Name (+ reason if any) -->
                  <div class="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <span class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#EBF1F8] text-[#1B2A4E] font-bold text-[11px] sm:text-[12px] flex items-center justify-center shrink-0">04</span>
                    <div class="min-w-0">
                      <p class="text-[13px] sm:text-[14px] font-bold text-[#1B2A4E] truncate">Ishita Nair</p>
                      
                    </div>
                  </div>

                  <!-- Right side: Present / Absent / Late toggle directly BESIDE the name on the exact same row -->
                  <div class="shrink-0 flex items-center">
                    
                      <div class="inline-flex items-center bg-[#F3EEE3] rounded-full p-0.5 sm:p-1 border border-[#E8E2D6]/80 gap-0.5 sm:gap-1 shadow-inner">
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s4', 'present')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-emerald-600 text-white shadow-xs scale-105">P</button>
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s4', 'absent')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">A</button>
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s4', 'late')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">L</button>
                      </div>
                    
                  </div>
                </div>

                <div class="py-2.5 flex items-center justify-between gap-2 sm:gap-4">
                  <!-- Left side: Roll + Name (+ reason if any) -->
                  <div class="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <span class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#EBF1F8] text-[#1B2A4E] font-bold text-[11px] sm:text-[12px] flex items-center justify-center shrink-0">05</span>
                    <div class="min-w-0">
                      <p class="text-[13px] sm:text-[14px] font-bold text-[#1B2A4E] truncate">Kabir Khan</p>
                      <p class="text-[10px] sm:text-[11px] text-red-600 font-medium truncate">School bus #4 delayed in traffic</p>
                    </div>
                  </div>

                  <!-- Right side: Present / Absent / Late toggle directly BESIDE the name on the exact same row -->
                  <div class="shrink-0 flex items-center">
                    
                      <div class="inline-flex items-center bg-[#F3EEE3] rounded-full p-0.5 sm:p-1 border border-[#E8E2D6]/80 gap-0.5 sm:gap-1 shadow-inner">
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s5', 'present')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">P</button>
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s5', 'absent')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">A</button>
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s5', 'late')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-amber-500 text-white shadow-xs scale-105">L</button>
                      </div>
                    
                  </div>
                </div>

                <div class="py-2.5 flex items-center justify-between gap-2 sm:gap-4">
                  <!-- Left side: Roll + Name (+ reason if any) -->
                  <div class="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <span class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#EBF1F8] text-[#1B2A4E] font-bold text-[11px] sm:text-[12px] flex items-center justify-center shrink-0">06</span>
                    <div class="min-w-0">
                      <p class="text-[13px] sm:text-[14px] font-bold text-[#1B2A4E] truncate">Meera Joshi</p>
                      <p class="text-[10px] sm:text-[11px] text-red-600 font-medium truncate">Pre-approved family function</p>
                    </div>
                  </div>

                  <!-- Right side: Present / Absent / Late toggle directly BESIDE the name on the exact same row -->
                  <div class="shrink-0 flex items-center">
                    
                      <span class="h-7 px-3 rounded-full bg-blue-50 text-blue-800 text-[11px] font-bold inline-flex items-center">On Leave</span>
                    
                  </div>
                </div>

                <div class="py-2.5 flex items-center justify-between gap-2 sm:gap-4">
                  <!-- Left side: Roll + Name (+ reason if any) -->
                  <div class="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <span class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#EBF1F8] text-[#1B2A4E] font-bold text-[11px] sm:text-[12px] flex items-center justify-center shrink-0">07</span>
                    <div class="min-w-0">
                      <p class="text-[13px] sm:text-[14px] font-bold text-[#1B2A4E] truncate">Pranav Gupta</p>
                      
                    </div>
                  </div>

                  <!-- Right side: Present / Absent / Late toggle directly BESIDE the name on the exact same row -->
                  <div class="shrink-0 flex items-center">
                    
                      <div class="inline-flex items-center bg-[#F3EEE3] rounded-full p-0.5 sm:p-1 border border-[#E8E2D6]/80 gap-0.5 sm:gap-1 shadow-inner">
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s7', 'present')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-emerald-600 text-white shadow-xs scale-105">P</button>
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s7', 'absent')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">A</button>
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s7', 'late')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">L</button>
                      </div>
                    
                  </div>
                </div>

                <div class="py-2.5 flex items-center justify-between gap-2 sm:gap-4">
                  <!-- Left side: Roll + Name (+ reason if any) -->
                  <div class="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <span class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#EBF1F8] text-[#1B2A4E] font-bold text-[11px] sm:text-[12px] flex items-center justify-center shrink-0">08</span>
                    <div class="min-w-0">
                      <p class="text-[13px] sm:text-[14px] font-bold text-[#1B2A4E] truncate">Riya Tiwari</p>
                      <p class="text-[10px] sm:text-[11px] text-red-600 font-medium truncate">Attending elder sister wedding</p>
                    </div>
                  </div>

                  <!-- Right side: Present / Absent / Late toggle directly BESIDE the name on the exact same row -->
                  <div class="shrink-0 flex items-center">
                    
                      <div class="inline-flex items-center bg-[#F3EEE3] rounded-full p-0.5 sm:p-1 border border-[#E8E2D6]/80 gap-0.5 sm:gap-1 shadow-inner">
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s8', 'present')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">P</button>
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s8', 'absent')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-red-600 text-white shadow-xs scale-105">A</button>
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s8', 'late')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">L</button>
                      </div>
                    
                  </div>
                </div>

                <div class="py-2.5 flex items-center justify-between gap-2 sm:gap-4">
                  <!-- Left side: Roll + Name (+ reason if any) -->
                  <div class="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <span class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#EBF1F8] text-[#1B2A4E] font-bold text-[11px] sm:text-[12px] flex items-center justify-center shrink-0">09</span>
                    <div class="min-w-0">
                      <p class="text-[13px] sm:text-[14px] font-bold text-[#1B2A4E] truncate">Samarth Singh</p>
                      
                    </div>
                  </div>

                  <!-- Right side: Present / Absent / Late toggle directly BESIDE the name on the exact same row -->
                  <div class="shrink-0 flex items-center">
                    
                      <div class="inline-flex items-center bg-[#F3EEE3] rounded-full p-0.5 sm:p-1 border border-[#E8E2D6]/80 gap-0.5 sm:gap-1 shadow-inner">
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s9', 'present')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-emerald-600 text-white shadow-xs scale-105">P</button>
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s9', 'absent')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">A</button>
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s9', 'late')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">L</button>
                      </div>
                    
                  </div>
                </div>

                <div class="py-2.5 flex items-center justify-between gap-2 sm:gap-4">
                  <!-- Left side: Roll + Name (+ reason if any) -->
                  <div class="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <span class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#EBF1F8] text-[#1B2A4E] font-bold text-[11px] sm:text-[12px] flex items-center justify-center shrink-0">10</span>
                    <div class="min-w-0">
                      <p class="text-[13px] sm:text-[14px] font-bold text-[#1B2A4E] truncate">Tanvi Dubey</p>
                      
                    </div>
                  </div>

                  <!-- Right side: Present / Absent / Late toggle directly BESIDE the name on the exact same row -->
                  <div class="shrink-0 flex items-center">
                    
                      <div class="inline-flex items-center bg-[#F3EEE3] rounded-full p-0.5 sm:p-1 border border-[#E8E2D6]/80 gap-0.5 sm:gap-1 shadow-inner">
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s10', 'present')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-emerald-600 text-white shadow-xs scale-105">P</button>
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s10', 'absent')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">A</button>
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s10', 'late')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">L</button>
                      </div>
                    
                  </div>
                </div>

                <div class="py-2.5 flex items-center justify-between gap-2 sm:gap-4">
                  <!-- Left side: Roll + Name (+ reason if any) -->
                  <div class="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <span class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#EBF1F8] text-[#1B2A4E] font-bold text-[11px] sm:text-[12px] flex items-center justify-center shrink-0">11</span>
                    <div class="min-w-0">
                      <p class="text-[13px] sm:text-[14px] font-bold text-[#1B2A4E] truncate">Aditya Rao</p>
                      
                    </div>
                  </div>

                  <!-- Right side: Present / Absent / Late toggle directly BESIDE the name on the exact same row -->
                  <div class="shrink-0 flex items-center">
                    
                      <div class="inline-flex items-center bg-[#F3EEE3] rounded-full p-0.5 sm:p-1 border border-[#E8E2D6]/80 gap-0.5 sm:gap-1 shadow-inner">
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s11', 'present')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-emerald-600 text-white shadow-xs scale-105">P</button>
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s11', 'absent')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">A</button>
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s11', 'late')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">L</button>
                      </div>
                    
                  </div>
                </div>

                <div class="py-2.5 flex items-center justify-between gap-2 sm:gap-4">
                  <!-- Left side: Roll + Name (+ reason if any) -->
                  <div class="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <span class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#EBF1F8] text-[#1B2A4E] font-bold text-[11px] sm:text-[12px] flex items-center justify-center shrink-0">12</span>
                    <div class="min-w-0">
                      <p class="text-[13px] sm:text-[14px] font-bold text-[#1B2A4E] truncate">Bhavya Patel</p>
                      
                    </div>
                  </div>

                  <!-- Right side: Present / Absent / Late toggle directly BESIDE the name on the exact same row -->
                  <div class="shrink-0 flex items-center">
                    
                      <div class="inline-flex items-center bg-[#F3EEE3] rounded-full p-0.5 sm:p-1 border border-[#E8E2D6]/80 gap-0.5 sm:gap-1 shadow-inner">
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s12', 'present')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-emerald-600 text-white shadow-xs scale-105">P</button>
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s12', 'absent')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">A</button>
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s12', 'late')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">L</button>
                      </div>
                    
                  </div>
                </div>
              </div>
            </div>

            <!-- Right 4 Cols: Live Campus Telemetry -->
            <div class="lg:col-span-4 space-y-5">
              <!-- Live Fleet Card -->
              <div class="${tc.card}">
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-2">
                    <span class="p-1 rounded bg-amber-100 text-amber-700">${ICONS.bus}</span>
                    <h3 class="text-[14px] ${tc.inkTitle}">Transport Fleet (14 Buses)</h3>
                  </div>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-pill bg-emerald-100 text-emerald-700">GPS Live</span>
                </div>
                <div class="p-3 rounded-xl bg-amber-50/60 border border-amber-200/50 space-y-1">
                  <p class="text-[12px] font-bold text-amber-900">Route 4 Traffic Alert</p>
                  <p class="text-[11px] text-amber-800 leading-snug">${(samples.transport && samples.transport.delayedRoute) || 'Noida Sector 62 diversion'}</p>
                </div>
                <div class="mt-3 text-[12px] space-y-1.5 text-ink-secondary">
                  <div class="flex justify-between"><span>Speed compliance</span><span class="font-bold text-emerald-700">100% OK</span></div>
                  <div class="flex justify-between"><span>Active morning trips</span><span class="font-bold text-ink">14 completed</span></div>
                  <div class="flex justify-between"><span>Afternoon departure</span><span class="font-bold text-ink">02:30 PM queued</span></div>
                </div>
                <button type="button" onclick="window.FNIC_NAVIGATE('transport')" class="${tc.secondaryBtn} w-full mt-3 h-8 text-[11px]">Open Fleet Radar →</button>
              </div>

              <!-- Front Desk Daily Inquiries -->
              <div class="${tc.card}">
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-2">
                    <span class="p-1 rounded bg-blue-100 text-blue-700">${ICONS.fileChart}</span>
                    <h3 class="text-[14px] ${tc.inkTitle}">Front Desk Activity</h3>
                  </div>
                  <span class="text-[11px] text-ink-faint">Today</span>
                </div>
                <div class="grid grid-cols-2 gap-2 text-center">
                  <div class="p-2.5 rounded-xl ${tc.subtle}">
                    <div class="text-[20px] font-bold text-ink">${(samples.frontOffice && samples.frontOffice.visitorsToday) || 18}</div>
                    <span class="text-[10px] text-ink-secondary uppercase font-semibold">Visitors</span>
                  </div>
                  <div class="p-2.5 rounded-xl ${tc.subtle}">
                    <div class="text-[20px] font-bold text-ink">${(samples.frontOffice && samples.frontOffice.inquiriesToday) || 12}</div>
                    <span class="text-[10px] text-ink-secondary uppercase font-semibold">New Inquiries</span>
                  </div>
                </div>
                <p class="text-[11px] text-ink-secondary mt-3">Trending: <strong>${(samples.frontOffice && samples.frontOffice.topInquiryClass) || 'Class 11 Commerce'}</strong></p>
                <button type="button" onclick="window.FNIC_NAVIGATE('front_office')" class="${tc.secondaryBtn} w-full mt-3 h-8 text-[11px]">View Visitor Log →</button>
              </div>

              <!-- Quick Leadership Shortcuts -->
              <div class="${tc.card} space-y-2">
                <h3 class="text-[14px] ${tc.inkTitle} mb-2">Executive Shortcuts</h3>
                <button type="button" onclick="window.FNIC_NAVIGATE('recruitment')" class="${tc.secondaryBtn} w-full h-8 text-[12px] flex items-center justify-between px-3">
                  <span>${ICONS.users} &nbsp; Teacher Hiring (6 Roles)</span>
                  ${ICONS.arrowRight}
                </button>
                <button type="button" onclick="window.FNIC_NAVIGATE('school_timetable')" class="${tc.secondaryBtn} w-full h-8 text-[12px] flex items-center justify-between px-3">
                  <span>${ICONS.table} &nbsp; Master School Timetable</span>
                  ${ICONS.arrowRight}
                </button>
                <button type="button" onclick="window.FNIC_NAVIGATE('calendar')" class="${tc.secondaryBtn} w-full h-8 text-[12px] flex items-center justify-between px-3">
                  <span>${ICONS.calendar} &nbsp; Term 2 Assessment Calendar</span>
                  ${ICONS.arrowRight}
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    },

    // 2. RECRUITMENT & HIRING
    recruitment: function (theme, tc) {
      const rec = samples.recruitment || { openRoles: [], interviewsToday: [] };
      return `
        <div class="space-y-5">
          <div class="${tc.card} flex flex-wrap items-center justify-between gap-4">
            <div>
              <span class="px-2.5 py-0.5 rounded-pill ${tc.primaryPill} text-[11px] font-bold">HR &amp; Faculty Pipeline</span>
              <h1 class="text-[22px] ${tc.inkTitle} mt-1">Faculty Recruitment &amp; Interview Panel</h1>
              
            </div>
            <button type="button" onclick="window.FNIC_SHOW_MODAL ? window.FNIC_SHOW_MODAL('Create Teaching Position', 'New CBSE hiring requisition opened for academic year 2026-27.') : alert('Requisition created')" class="${tc.primaryBtn} h-9 px-4 text-[12px]">
              + Post New Requisition
            </button>
          </div>

          <!-- Interviews Scheduled Today -->
          <div class="${tc.card}">
            <h3 class="text-[15px] ${tc.inkTitle} mb-3 flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Interviews &amp; Demo Lectures Scheduled Today</span>
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              ${(rec.interviewsToday || []).map(iv => `
                <div class="p-3.5 rounded-xl ${tc.subtle} space-y-1.5">
                  <div class="flex items-center justify-between">
                    <span class="text-[11px] font-bold px-2 py-0.5 rounded-pill bg-emerald-100 text-emerald-800">${iv.time}</span>
                    <span class="text-[11px] text-ink-secondary">${iv.mode}</span>
                  </div>
                  <p class="text-[14px] font-bold text-ink">${iv.candidate}</p>
                  <p class="text-[12px] text-ink-secondary font-medium">${iv.role} · ${iv.experience}</p>
                  <div class="pt-1 flex gap-2">
                    <button type="button" onclick="window.FNIC_SHOW_MODAL('Open Rubric', 'Evaluating ${iv.candidate} on Subject Knowledge, Board Command, and Student Engagement.')" class="${tc.primaryBtn} h-7 px-3 text-[11px]">Score Demo Rubric</button>
                    <button type="button" onclick="window.FNIC_SHOW_MODAL('Candidate Dossier', 'Viewing CV and degrees for ${iv.candidate}.')" class="${tc.secondaryBtn} h-7 px-3 text-[11px]">View Dossier</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Open Requisitions Grid -->
          <div class="${tc.card}">
            <h3 class="text-[15px] ${tc.inkTitle} mb-3">Active Teaching Requisitions</h3>
            <div class="divide-y divide-black/5">
              ${(rec.openRoles || []).map(r => `
                <div class="py-2.5 flex items-center justify-between gap-2 flex-nowrap border-b border-black/[0.04] last:border-0">
                  <div>
                    <p class="text-[14px] font-bold text-ink">${r.title}</p>
                    <p class="text-[12px] text-ink-secondary">${r.applicants} Applicants · ${r.shortlisted} Shortlisted · Current Round: <strong>${r.status}</strong></p>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-[11px] font-semibold px-2.5 py-1 rounded-pill ${tc.primaryPill}">${r.interviewsToday} Today</span>
                    <button type="button" onclick="window.FNIC_SHOW_MODAL('Review Applicants', 'Displaying ${r.shortlisted} shortlisted applications for ${r.title}.')" class="${tc.secondaryBtn} h-8 px-3 text-[11px]">Review Pipeline</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    },

    // 3. FRONT OFFICE REPORTS
    front_office: function (theme, tc) {
      const fo = samples.frontOffice || {};
      return `
        <div class="space-y-5">
          <div class="${tc.card} flex flex-wrap items-center justify-between gap-4">
            <div>
              <span class="px-2.5 py-0.5 rounded-pill ${tc.primaryPill} text-[11px] font-bold">Front Office Telemetry</span>
              <h1 class="text-[22px] ${tc.inkTitle} mt-1">Front Office, Visitor &amp; Inquiry Reports</h1>
              
            </div>
            <button type="button" onclick="window.FNIC_SHOW_MODAL ? window.FNIC_SHOW_MODAL('Export Front Office Report', 'Generating certified PDF log for Directorate of Education compliance.') : alert('Exported')" class="${tc.primaryBtn} h-9 px-4 text-[12px]">
              Export PDF Log
            </button>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="${tc.card} text-center">
              <span class="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Visitors Today</span>
              <div class="text-[26px] ${tc.inkTitle} mt-1">${fo.visitorsToday || 18}</div>
              <span class="text-[11px] text-emerald-600 font-semibold">All Gate Passes Closed</span>
            </div>
            <div class="${tc.card} text-center">
              <span class="text-[11px] font-bold uppercase tracking-wider text-ink-faint">New Admissions</span>
              <div class="text-[26px] ${tc.inkTitle} mt-1">${fo.admissionsThisMonth || '42 Enrolled'}</div>
              <span class="text-[11px] text-blue-600 font-semibold">On target for 2026-27</span>
            </div>
            <div class="${tc.card} text-center">
              <span class="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Scheduled Visits</span>
              <div class="text-[26px] ${tc.inkTitle} mt-1">${fo.scheduledVisits || 6}</div>
              <span class="text-[11px] text-ink-secondary font-semibold">Campus Tour 02:00 PM</span>
            </div>
            <div class="${tc.card} text-center">
              <span class="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Phone Inquiries</span>
              <div class="text-[26px] ${tc.inkTitle} mt-1">37</div>
              <span class="text-[11px] text-purple-600 font-semibold">Auto-WhatsApp Sent</span>
            </div>
          </div>

          <div class="${tc.card}">
            <h3 class="text-[15px] ${tc.inkTitle} mb-3">Recent Gate Passes &amp; Parent Consultations</h3>
            <div class="divide-y divide-black/5">
              <div class="py-3">
                <p class="text-[13px] leading-snug">
                  <span class="font-bold text-ink">Vikramaditya Singhal</span>
                  <span class="text-[12px] text-ink-secondary"> · Pass #G-104 · Purpose: Class 11 Commerce Admission Consultation with Principal</span>
                </p>
                <div class="flex justify-end mt-1.5">
                  <span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-pill bg-emerald-100 text-emerald-800">Checked In 10:15 AM</span>
                </div>
              </div>
              <div class="py-3">
                <p class="text-[13px] leading-snug">
                  <span class="font-bold text-ink">Dr. R. K. Mukherjee</span>
                  <span class="text-[12px] text-ink-secondary"> · Pass #G-103 · Purpose: CBSE Board Science Inspection Liaison</span>
                </p>
                <div class="flex justify-end mt-1.5">
                  <span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-pill bg-blue-100 text-blue-800">With Vice Principal</span>
                </div>
              </div>
              <div class="py-3">
                <p class="text-[13px] leading-snug">
                  <span class="font-bold text-ink">Mrs. Neeta Agarwal</span>
                  <span class="text-[12px] text-ink-secondary"> · Pass #G-102 · Purpose: Student Early Exit (Health checkup · Rohan Agarwal Class 9-A)</span>
                </p>
                <div class="flex justify-end mt-1.5">
                  <span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-pill bg-gray-100 text-gray-700">Checked Out 11:30 AM</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    },

    // 4. LEAVE APPROVALS (Approvals Group)
    leave_approvals: function (theme, tc) {
      const leaves = samples.leaves || [];
      return `
        <div class="space-y-5">
          <div class="${tc.card} flex flex-wrap items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span class="px-2.5 py-0.5 rounded-pill ${tc.accentPill} text-[11px] font-bold">4 Pending Sign-Offs</span>
              </div>
              <h1 class="text-[22px] ${tc.inkTitle} mt-1">Faculty &amp; Staff Leave Approvals</h1>
              
            </div>
            <div class="flex gap-2">
              <button type="button" onclick="window.FNIC_SHOW_MODAL ? window.FNIC_SHOW_MODAL('All Approved', 'All 4 staff leaves approved with automated substitute notifications.') : alert('All approved')" class="${tc.primaryBtn} h-9 px-4 text-[12px]">
                Approve All With Auto-Substitute
              </button>
            </div>
          </div>

          <div class="space-y-3">
            ${leaves.map(l => `
              <div class="${tc.card} space-y-3">
                <div class="flex items-center justify-between gap-3">
                  <div class="flex items-center gap-2 min-w-0 flex-wrap sm:flex-nowrap">
                    <span class="text-[15px] font-bold text-ink whitespace-nowrap">${l.teacher}</span>
                    <span class="text-[12px] text-ink-secondary whitespace-nowrap">(${l.designation})</span>
                  </div>
                  <span class="h-6 px-3 rounded-pill text-[10px] font-bold uppercase whitespace-nowrap inline-flex items-center justify-center shrink-0 ${l.type.includes('Medical') ? 'bg-red-100 text-red-700' : l.type.includes('Casual') ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}">${l.type}</span>
                </div>
                <div class="space-y-1 text-[12px]">
                  <p class="text-ink font-medium">Dates: <strong>${l.dates}</strong></p>
                  <p class="text-ink font-medium truncate" title="${l.reason}">Reason: <span class="text-ink-secondary">${l.reason}</span></p>
                  <div class="pt-0.5">
                    <span class="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded inline-block">
                      ✓ Recommended Substitute: ${l.substitute}
                    </span>
                  </div>
                </div>
                <div class="flex items-center gap-2 pt-1 border-t border-black/[0.04]">
                  <button type="button" onclick="window.FNIC_SHOW_MODAL('Request Clarification', 'Sending WhatsApp nudge to ${l.teacher} for additional medical paperwork.')" class="${tc.secondaryBtn} h-8 px-3 text-[11px]">Nudge / Clarify</button>
                  <button type="button" onclick="window.FNIC_APPROVE('leave', '${l.id}')" class="${tc.primaryBtn} h-8 px-4 text-[11px]">Authorize Leave</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    },

    // 5. TEST APPROVALS
    test_approvals: function (theme, tc) {
      const tests = samples.tests || [];
      return `
        <div class="space-y-5">
          <div class="${tc.card} flex flex-wrap items-center justify-between gap-4">
            <div>
              <span class="px-2.5 py-0.5 rounded-pill ${tc.primaryPill} text-[11px] font-bold">Academic Assessment Quality Gate</span>
              <h1 class="text-[22px] ${tc.inkTitle} mt-1">Mock Test &amp; Examination Sign-Offs</h1>
              
            </div>
          </div>

          <div class="space-y-3">
            ${tests.map(t => `
              <div class="${tc.card} space-y-3">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span class="text-[11px] font-bold px-2 py-0.5 rounded-pill bg-blue-100 text-blue-800">${t.subject} · ${t.class}</span>
                    <h3 class="text-[15px] font-bold text-ink mt-1">${t.name}</h3>
                    <p class="text-[12px] text-ink-secondary">Prepared by: <strong>${t.preparedBy}</strong> · Total Marks: ${t.marks} · Date: ${t.date}</p>
                  </div>
                  <div class="flex gap-2">
                    <button type="button" onclick="window.FNIC_SHOW_MODAL('Inspect Test Blueprint', 'Viewing CBSE Chapter Weightage matrix for ${t.name}.')" class="${tc.secondaryBtn} h-8 px-3 text-[11px]">Preview Blueprint</button>
                    <button type="button" onclick="window.FNIC_APPROVE('test', '${t.id}')" class="${tc.primaryBtn} h-8 px-4 text-[11px]">Approve &amp; Send to Printing</button>
                  </div>
                </div>
                <div class="p-3 rounded-xl ${tc.subtle} text-[11px] text-ink-secondary">
                  <strong>Chapters Covered:</strong> ${t.chapters}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    },

    // 6. DISCOUNT APPROVALS
    discount_approvals: function (theme, tc) {
      const disc = samples.discounts || [];
      return `
        <div class="space-y-5">
          <div class="${tc.card} flex flex-wrap items-center justify-between gap-4">
            <div>
              <span class="px-2.5 py-0.5 rounded-pill ${tc.accentPill} text-[11px] font-bold">Financial Concession Oversight</span>
              <h1 class="text-[22px] ${tc.inkTitle} mt-1">Fee Concession &amp; Sibling Discount Approvals</h1>
              
            </div>
          </div>

          <div class="space-y-3">
            ${disc.map(d => `
              <div class="${tc.card} flex flex-wrap items-center justify-between gap-4">
                <div class="space-y-1">
                  <div class="flex items-center gap-2">
                    <span class="text-[15px] font-bold text-ink">${d.student}</span>
                    <span class="text-[12px] text-ink-secondary">(${d.class})</span>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-pill bg-purple-100 text-purple-700">${d.concessionType}</span>
                  </div>
                  <p class="text-[12px] text-ink font-medium">Original Fee: <strong>${d.originalFee}</strong> → Discounted Fee: <strong class="text-emerald-700">${d.discountedFee}</strong> (Waiver: ${d.discountAmount})</p>
                  <p class="text-[11px] text-ink-secondary">Reason: ${d.reason}</p>
                </div>
                <div class="flex gap-2">
                  <button type="button" onclick="window.FNIC_SHOW_MODAL('Concession Rejected', 'Concession request returned to Accounts desk.')" class="${tc.secondaryBtn} h-8 px-3 text-[11px]">Decline</button>
                  <button type="button" onclick="window.FNIC_APPROVE('discount', '${d.id}')" class="${tc.primaryBtn} h-8 px-4 text-[11px]">Sign Off ${d.discountAmount}</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    },

    // 7. ACADEMIC PLAN (Academics Group)
    academic_plan: function (theme, tc) {
      const plans = samples.academicPlan || [];
      return `
        <div class="space-y-5">
          <div class="${tc.card} flex flex-wrap items-center justify-between gap-4">
            <div>
              <span class="px-2.5 py-0.5 rounded-pill ${tc.primaryPill} text-[11px] font-bold">CBSE Curriculum Compliance</span>
              <h1 class="text-[22px] ${tc.inkTitle} mt-1">Academic Plan Master Dashboard</h1>
              
            </div>
            <button type="button" onclick="window.FNIC_SHOW_MODAL ? window.FNIC_SHOW_MODAL('Syncing All Lesson Plans', '42 class diaries synchronized with CBSE 2026 guidelines.') : alert('Synced')" class="${tc.primaryBtn} h-9 px-4 text-[12px]">
              Audit All 42 Lesson Plans
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${plans.map(p => `
              <div class="${tc.card} space-y-3">
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-[15px] font-bold text-ink">${p.subject}</h3>
                    <p class="text-[12px] text-ink-secondary">${p.class} · Faculty: <strong>${p.teacher}</strong></p>
                  </div>
                  <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-pill ${p.status.includes('Ahead') ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}">${p.status}</span>
                </div>
                <div>
                  <div class="flex justify-between text-[11px] font-semibold text-ink mb-1">
                    <span>Curriculum Completed</span>
                    <span>${p.completion}</span>
                  </div>
                  <div class="w-full h-2.5 bg-black/5 rounded-full overflow-hidden">
                    <div class="h-full bg-emerald-500 rounded-full" style="width: ${p.completion}"></div>
                  </div>
                </div>
                <div class="p-2.5 rounded-xl ${tc.subtle} text-[11px] text-ink-secondary flex justify-between">
                  <span>Next: <strong>${p.nextMilestone}</strong></span>
                  <span>Target: <strong>${p.milestoneDate}</strong></span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    },

    // 8. MARKS & REPORT CARDS
    marks_hub: function (theme, tc) {
      return `
        <div class="space-y-5">
          <div class="${tc.card} flex flex-wrap items-center justify-between gap-4">
            <div>
              <span class="px-2.5 py-0.5 rounded-pill ${tc.primaryPill} text-[11px] font-bold">Performance Analytics</span>
              <h1 class="text-[22px] ${tc.inkTitle} mt-1">Marks, Grading &amp; Report Card Generation</h1>
              
            </div>
            <button type="button" onclick="window.FNIC_SHOW_MODAL('Batch Generate PDF', '1,240 standardized bilingual report cards queued for rendering.')" class="${tc.primaryBtn} h-9 px-4 text-[12px]">
              Batch Print Report Cards
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="${tc.card} space-y-2">
              <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded-pill bg-emerald-100 text-emerald-800">Ready To Publish</span>
              <h3 class="text-[14px] font-bold text-ink">Class 10 Term 1 Final Marks</h3>
              <p class="text-[12px] text-ink-secondary">All 5 sections submitted and moderated. School average: 81.4%.</p>
              <button type="button" onclick="window.FNIC_SHOW_MODAL('Publish Marks', 'Class 10 Term 1 marks published to Student and Parent portals.')" class="${tc.primaryBtn} w-full mt-2 h-8 text-[11px]">Publish to Parent Portal</button>
            </div>
            <div class="${tc.card} space-y-2">
              <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded-pill bg-amber-100 text-amber-800">Pending Moderation</span>
              <h3 class="text-[14px] font-bold text-ink">Class 12 Pre-Board 1 Marks</h3>
              <p class="text-[12px] text-ink-secondary">Physics & Accountancy practical scores awaiting lab sign-off.</p>
              <button type="button" onclick="window.FNIC_SHOW_MODAL('Review Moderation', 'Opening score moderation panel for Class 12 Pre-Board.')" class="${tc.secondaryBtn} w-full mt-2 h-8 text-[11px]">Inspect Moderation</button>
            </div>
            <div class="${tc.card} space-y-2">
              <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded-pill bg-purple-100 text-purple-800">Remedial Focus</span>
              <h3 class="text-[14px] font-bold text-ink">Remedial Students List</h3>
              <p class="text-[12px] text-ink-secondary">28 students identified for Saturday extra revision in Mathematics.</p>
              <button type="button" onclick="window.FNIC_SHOW_MODAL('Remedial Allocation', 'Assigning PGT Math extra doubt-clearing sessions.')" class="${tc.secondaryBtn} w-full mt-2 h-8 text-[11px]">View Remedial Roster</button>
            </div>
          </div>
        </div>
      `;
    },

    // 9. EXAMS & ASSESSMENTS
    exams_list: function (theme, tc) {
      return `
        <div class="space-y-5">
          <div class="${tc.card} flex flex-wrap items-center justify-between gap-4">
            <div>
              <span class="px-2.5 py-0.5 rounded-pill ${tc.primaryPill} text-[11px] font-bold">Assessment Master</span>
              <h1 class="text-[22px] ${tc.inkTitle} mt-1">Exams, Term Dates &amp; Seating Plans</h1>
              
            </div>
            <button type="button" onclick="window.FNIC_SHOW_MODAL('Auto-Generate Seating', 'Algorithmic room allocation: no 2 students from same class side by side.')" class="${tc.primaryBtn} h-9 px-4 text-[12px]">
              Generate Auto-Seating Matrix
            </button>
          </div>

          <div class="${tc.card}">
            <h3 class="text-[15px] ${tc.inkTitle} mb-3">Upcoming Examination Schedule</h3>
            <div class="divide-y divide-black/5">
              <div class="py-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded-pill bg-blue-100 text-blue-800">18 Nov 2026</span>
                  <p class="text-[14px] font-bold text-ink mt-1">Class 12 Mid-Term Board Practice (Accountancy &amp; Physics)</p>
                  <p class="text-[12px] text-ink-secondary">Timing: 09:00 AM – 12:00 PM · 24 Rooms · 12 Invigilators Assigned</p>
                </div>
                <button type="button" onclick="window.FNIC_SHOW_MODAL('Exam Dossier', 'Viewing invigilator duties and room layout.')" class="${tc.secondaryBtn} h-8 px-3 text-[11px]">View Roster</button>
              </div>
              <div class="py-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded-pill bg-emerald-100 text-emerald-800">22 Nov 2026</span>
                  <p class="text-[14px] font-bold text-ink mt-1">Class 10 Mathematics Standard &amp; Basic Examination</p>
                  <p class="text-[12px] text-ink-secondary">Timing: 09:00 AM – 12:00 PM · 18 Rooms · Answer Sheets Pre-Printed</p>
                </div>
                <button type="button" onclick="window.FNIC_SHOW_MODAL('Exam Dossier', 'Viewing invigilator duties and room layout.')" class="${tc.secondaryBtn} h-8 px-3 text-[11px]">View Roster</button>
              </div>
            </div>
          </div>
        </div>
      `;
    },

    // 10. QUESTION BANK
    question_bank: function (theme, tc) {
      return `
        <div class="space-y-5">
          <div class="${tc.card} flex flex-wrap items-center justify-between gap-4">
            <div>
              <span class="px-2.5 py-0.5 rounded-pill ${tc.primaryPill} text-[11px] font-bold">Curated Content Library</span>
              <h1 class="text-[22px] ${tc.inkTitle} mt-1">Question Bank &amp; Test Paper Generator</h1>
              
            </div>
            <button type="button" onclick="window.FNIC_SHOW_MODAL('Auto-Generate Test', 'Creating 80-mark balanced blueprint with 20 MCQs, 5 short, and 3 case-based questions.')" class="${tc.primaryBtn} h-9 px-4 text-[12px]">
              + Generate Test From Bank
            </button>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="${tc.card} text-center">
              <span class="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Commerce &amp; Accounts</span>
              <div class="text-[24px] ${tc.inkTitle} mt-1">2,840</div>
              <span class="text-[11px] text-emerald-600 font-semibold">Updated 2026</span>
            </div>
            <div class="${tc.card} text-center">
              <span class="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Mathematics</span>
              <div class="text-[24px] ${tc.inkTitle} mt-1">3,120</div>
              <span class="text-[11px] text-blue-600 font-semibold">Includes Assertion/Reason</span>
            </div>
            <div class="${tc.card} text-center">
              <span class="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Science &amp; Physics</span>
              <div class="text-[24px] ${tc.inkTitle} mt-1">1,650</div>
              <span class="text-[11px] text-purple-600 font-semibold">Diagram based</span>
            </div>
            <div class="${tc.card} text-center">
              <span class="text-[11px] font-bold uppercase tracking-wider text-ink-faint">English &amp; Humanities</span>
              <div class="text-[24px] ${tc.inkTitle} mt-1">820</div>
              <span class="text-[11px] text-ink-secondary font-semibold">Unseen passages</span>
            </div>
          </div>
        </div>
      `;
    },

    // 11. SCHOOL CALENDAR
    calendar: function (theme, tc) {
      return `
        <div class="space-y-5">
          <div class="${tc.card} flex flex-wrap items-center justify-between gap-4">
            <div>
              <span class="px-2.5 py-0.5 rounded-pill ${tc.primaryPill} text-[11px] font-bold">Institutional Timeline</span>
              <h1 class="text-[22px] ${tc.inkTitle} mt-1">Academic Calendar 2026–27</h1>
              
            </div>
            <button type="button" onclick="window.FNIC_SHOW_MODAL('Add Calendar Event', 'New school event notified via WhatsApp to all parents.')" class="${tc.primaryBtn} h-9 px-4 text-[12px]">
              + Add Institutional Event
            </button>
          </div>

          <div class="${tc.card}">
            <h3 class="text-[15px] ${tc.inkTitle} mb-3">November 2026 Key Dates</h3>
            <div class="space-y-2.5">
              <div class="p-3 rounded-xl ${tc.subtle} flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex flex-col items-center justify-center font-bold">
                    <span class="text-[10px] leading-tight">NOV</span>
                    <span class="text-[14px] leading-tight">07</span>
                  </div>
                  <div>
                    <p class="text-[13px] font-bold text-ink">Parent-Teacher Meeting (Term 1 Marks Review)</p>
                    <p class="text-[11px] text-ink-secondary">Classes 9 to 12 · 08:30 AM to 01:30 PM · Slot booking active</p>
                  </div>
                </div>
                <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-pill bg-amber-100 text-amber-800">Mandatory</span>
              </div>

              <div class="p-3 rounded-xl ${tc.subtle} flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex flex-col items-center justify-center font-bold">
                    <span class="text-[10px] leading-tight">NOV</span>
                    <span class="text-[14px] leading-tight">14</span>
                  </div>
                  <div>
                    <p class="text-[13px] font-bold text-ink">Annual Children's Day Carnival &amp; Cultural Fest</p>
                    <p class="text-[11px] text-ink-secondary">Campus Open Day · Inter-House Debate &amp; Drama Competitions</p>
                  </div>
                </div>
                <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-pill bg-purple-100 text-purple-800">Celebration</span>
              </div>
            </div>
          </div>
        </div>
      `;
    },

    // 12. FACULTY DIRECTORY (Staff Group)
    teachers: function (theme, tc) {
      const teachers = samples.teachers || [];
      return `
        <div class="space-y-5">
          <div class="${tc.card} flex flex-wrap items-center justify-between gap-4">
            <div>
              <span class="px-2.5 py-0.5 rounded-pill ${tc.primaryPill} text-[11px] font-bold">Staff Roster</span>
              <h1 class="text-[22px] ${tc.inkTitle} mt-1">Faculty &amp; Teaching Staff Directory</h1>
              
            </div>
            <button type="button" onclick="window.FNIC_SHOW_MODAL('Add Faculty Member', 'Registering new faculty member into FNIC system.')" class="${tc.primaryBtn} h-9 px-4 text-[12px]">
              + Onboard Faculty Member
            </button>
          </div>

          <div class="${tc.card}">
            <div class="divide-y divide-black/5">
              ${teachers.map(t => `
                <div class="py-2.5 flex items-center justify-between gap-2 flex-nowrap border-b border-black/[0.04] last:border-0">
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="w-10 h-10 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-[13px] shrink-0">${t.name.split(' ').map(n=>n[0]).join('')}</div>
                    <div class="min-w-0">
                      <div class="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <p class="text-[14px] font-bold text-ink whitespace-nowrap">${t.name}</p>
                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-pill bg-blue-50 text-blue-700 whitespace-nowrap shrink-0">${t.designation}</span>
                      </div>
                      <p class="text-[12px] text-ink-secondary truncate">${t.department} · Class Teacher: <strong>${t.classTeacherOf}</strong> · ${t.classes}</p>
                    </div>
                  </div>
                  <div class="flex flex-col items-end justify-center gap-1.5 shrink-0">
                    <span class="text-[10px] font-semibold px-2.5 py-0.5 rounded-pill whitespace-nowrap ${t.status === 'Present' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}">${t.status}</span>
                    <button type="button" onclick="window.FNIC_SHOW_MODAL('Teacher Dossier', 'Opening full portfolio for ${t.name}.')" class="${tc.secondaryBtn} h-6 px-3 text-[11px] whitespace-nowrap">View</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    },

    // 13. CLASS TEACHERS ALLOCATION
    class_teachers: function (theme, tc) {
      return `
        <div class="space-y-5">
          <div class="${tc.card} flex flex-wrap items-center justify-between gap-4">
            <div>
              <span class="px-2.5 py-0.5 rounded-pill ${tc.primaryPill} text-[11px] font-bold">Leadership Allocation</span>
              <h1 class="text-[22px] ${tc.inkTitle} mt-1">Class Teacher In-Charge Allocation</h1>
              
            </div>
            <button type="button" onclick="window.FNIC_SHOW_MODAL('Allocation Saved', 'Class teacher allocations updated for all sections.')" class="${tc.primaryBtn} h-9 px-4 text-[12px]">
              Save Allocation Matrix
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="${tc.card} space-y-2">
              <h3 class="text-[15px] font-bold text-ink">Class 10 Section A</h3>
              <p class="text-[12px] text-ink-secondary">Current In-Charge: <strong>Devansh Joshi (PGT Math)</strong></p>
              <div class="text-[11px] text-emerald-700 bg-emerald-50 p-2 rounded">✓ 100% on-time roll call record this month</div>
            </div>
            <div class="${tc.card} space-y-2">
              <h3 class="text-[15px] font-bold text-ink">Class 12 Section B (Commerce)</h3>
              <p class="text-[12px] text-ink-secondary">Current In-Charge: <strong>Sunita Verma (Principal / Direct Charge)</strong></p>
              <div class="text-[11px] text-blue-700 bg-blue-50 p-2 rounded">Board examination focus section</div>
            </div>
          </div>
        </div>
      `;
    },

    // 14. TEACHER TIMETABLE BUILDER
    teacher_timetable: function (theme, tc) {
      return `
        <div class="space-y-5">
          <div class="${tc.card} flex flex-wrap items-center justify-between gap-4">
            <div>
              <span class="px-2.5 py-0.5 rounded-pill ${tc.primaryPill} text-[11px] font-bold">Faculty Load Balancing</span>
              <h1 class="text-[22px] ${tc.inkTitle} mt-1">Individual Faculty Timetable Builder</h1>
              
            </div>
            <button type="button" onclick="window.FNIC_SHOW_MODAL('Auto-Optimize', 'Balancing faculty load: no teacher assigned more than 3 consecutive periods.')" class="${tc.primaryBtn} h-9 px-4 text-[12px]">
              Auto-Balance Workload
            </button>
          </div>

          <div class="${tc.card}">
            <h3 class="text-[15px] ${tc.inkTitle} mb-3">Workload Distribution (Target: 28 Periods / Week)</h3>
            <div class="divide-y divide-black/5 text-[12px]">
              <div class="py-2.5 flex justify-between items-center">
                <span>Ramesh Kumar (PGT Physics)</span>
                <span class="font-bold text-ink">26 / 28 periods (2 Free)</span>
              </div>
              <div class="py-2.5 flex justify-between items-center">
                <span>Pooja Sharma (TGT Mathematics)</span>
                <span class="font-bold text-ink">28 / 28 periods (Fully Loaded)</span>
              </div>
              <div class="py-2.5 flex justify-between items-center">
                <span>Sunita Joshi (TGT Science)</span>
                <span class="font-bold text-ink">24 / 28 periods (4 Free for substitution)</span>
              </div>
            </div>
          </div>
        </div>
      `;
    },

    // 15. SCHOOL TIMETABLE (Operations Group)
    school_timetable: function (theme, tc) {
      return `
        <div class="space-y-5">
          <div class="${tc.card} flex flex-wrap items-center justify-between gap-4">
            <div>
              <span class="px-2.5 py-0.5 rounded-pill ${tc.primaryPill} text-[11px] font-bold">Institutional Operations</span>
              <h1 class="text-[22px] ${tc.inkTitle} mt-1">Master School Timetable (Grid View)</h1>
              
            </div>
            <button type="button" onclick="window.FNIC_SHOW_MODAL('Timetable Published', 'Updated master timetable broadcast to digital noticeboards.')" class="${tc.primaryBtn} h-9 px-4 text-[12px]">
              Publish to Smart Displays
            </button>
          </div>

          <div class="${tc.card} overflow-x-auto">
            <table class="w-full text-[12px] text-left">
              <thead>
                <tr class="border-b border-black/10 text-ink-secondary">
                  <th class="py-2 font-bold">Class / Period</th>
                  <th class="py-2">P1 (08:30)</th>
                  <th class="py-2">P2 (09:15)</th>
                  <th class="py-2">P3 (10:00)</th>
                  <th class="py-2">Recess</th>
                  <th class="py-2">P4 (11:15)</th>
                  <th class="py-2">P5 (12:00)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-black/5 font-medium">
                <tr>
                  <td class="py-2.5 font-bold text-ink">Class 10-A</td>
                  <td class="py-2.5 text-blue-700">Math (Devansh)</td>
                  <td class="py-2.5 text-purple-700">Science (Sunita)</td>
                  <td class="py-2.5 text-amber-700">English (Manish)</td>
                  <td class="py-2.5 text-ink-faint">Break</td>
                  <td class="py-2.5 text-emerald-700">Physics (Ramesh)</td>
                  <td class="py-2.5 text-blue-700">Hindi (Kavita)</td>
                </tr>
                <tr>
                  <td class="py-2.5 font-bold text-ink">Class 12-B Com</td>
                  <td class="py-2.5 text-emerald-700">Accounts (Sunita V)</td>
                  <td class="py-2.5 text-amber-700">Economics (Rajan)</td>
                  <td class="py-2.5 text-blue-700">BST (Priyanka)</td>
                  <td class="py-2.5 text-ink-faint">Break</td>
                  <td class="py-2.5 text-purple-700">Math (Devansh)</td>
                  <td class="py-2.5 text-emerald-700">Library</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    },

    // 16. ATTENDANCE SCANNER
            // 19. CLASS ATTENDANCE ROLL CALL REGISTER (Fully Interactive)
    attendance_class: function (theme, tc) {
      return `
        <div class="space-y-5" id="attendance-register-root">
          
          <!-- Top Control Header: Action buttons properly styled and visible -->
          <div class="bg-white rounded-[18px] p-5 shadow-[0_1px_3px_rgba(27,42,78,0.04)] border border-[#E8E2D6] flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 class="text-[20px] sm:text-[22px] font-bold text-[#1B2A4E]">Class 10-A Attendance Register</h1>
              <p class="text-[13px] text-[#55607A] mt-0.5">12 Students Enrolled</p>
            </div>

            <!-- Top Header Action Buttons: Clearly visible, high-contrast, no white spots -->
            <div class="flex items-center gap-2.5">
              <button 
                type="button" 
                onclick="window.fnicMarkAllPresent()"
                class="h-10 px-4 rounded-full bg-[#F3EEE3] hover:bg-[#E8E2D6] active:scale-95 text-[#1B2A4E] text-[13px] font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                <svg class="w-4 h-4 text-[#D9822B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Mark All Present</span>
              </button>

              <button 
                type="button" 
                onclick="window.fnicSaveAttendance()"
                class="h-10 px-5 rounded-full bg-[#1B2A4E] hover:bg-[#121D38] active:scale-95 text-white text-[13px] font-bold transition-all shadow-sm flex items-center gap-2"
              >
                <span>Save &amp; Dispatch Alerts</span>
                <svg class="w-4 h-4 text-[#F5B332]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </button>
            </div>
          </div>

          <!-- Main Layout: 8-Col Interactive Roster + 4-Col Live Telemetry -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            <!-- Left 8 Cols: Interactive 3-Way Segmented Toggle for every student -->
            <div class="lg:col-span-8 bg-white rounded-[18px] p-5 shadow-[0_1px_3px_rgba(27,42,78,0.04)] border border-[#E8E2D6] space-y-4">
              
              <div class="pb-3 border-b border-[#E8E2D6] space-y-2">
                <div class="text-[15px] font-bold text-[#1B2A4E]">Class 10-A</div>
                <div class="flex flex-wrap items-center gap-2 text-[12px] font-semibold text-[#55607A]" id="live-roster-counts">
                  <span class="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-bold">8 Present</span>
                  <span class="text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full font-bold">2 Absent</span>
                  <span class="text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full font-bold">1 Late</span>
                </div>
              </div>

              <!-- Interactive Student Rows -->
              <div class="divide-y divide-black/5" id="roster-rows-container">

                <div class="py-2.5 flex items-center justify-between gap-2 flex-nowrap border-b border-black/[0.04] last:border-0">
                  <div class="flex items-center gap-3 min-w-0 flex-1">
                    <span class="w-8 h-8 rounded-full bg-[#EBF1F8] text-[#1B2A4E] font-bold text-[12px] flex items-center justify-center shrink-0">01</span>
                    <div>
                      <p class="text-[14px] font-bold text-[#1B2A4E]">Aarav Verma</p>
                      <p class="text-[11px] text-[#55607A]">Roll #01 · +91 98112 40101</p>
                    </div>
                  </div>

                  <!-- 3-Way Segmented Pill Button -->
                  <div class="shrink-0">
                    
                      <div class="inline-flex items-center bg-[#F3EEE3] rounded-full p-0.5 border border-[#E8E2D6]/80 gap-0.5 shrink-0">
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s1', 'present')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-emerald-600 text-white shadow-xs scale-105">P</button>
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s1', 'absent')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">A</button>
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s1', 'late')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">L</button>
                      </div>
                    
                  </div>
                </div>

                <div class="py-2.5 flex items-center justify-between gap-2 flex-nowrap border-b border-black/[0.04] last:border-0">
                  <div class="flex items-center gap-3 min-w-0 flex-1">
                    <span class="w-8 h-8 rounded-full bg-[#EBF1F8] text-[#1B2A4E] font-bold text-[12px] flex items-center justify-center shrink-0">02</span>
                    <div>
                      <p class="text-[14px] font-bold text-[#1B2A4E]">Ananya Sharma</p>
                      <p class="text-[11px] text-[#55607A]">Roll #02 · +91 98234 11223</p>
                    </div>
                  </div>

                  <!-- 3-Way Segmented Pill Button -->
                  <div class="shrink-0">
                    
                      <div class="inline-flex items-center bg-[#F3EEE3] rounded-full p-0.5 border border-[#E8E2D6]/80 gap-0.5 shrink-0">
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s2', 'present')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-emerald-600 text-white shadow-xs scale-105">P</button>
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s2', 'absent')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">A</button>
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s2', 'late')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">L</button>
                      </div>
                    
                  </div>
                </div>

                <div class="py-2.5 flex items-center justify-between gap-2 flex-nowrap border-b border-black/[0.04] last:border-0">
                  <div class="flex items-center gap-3 min-w-0 flex-1">
                    <span class="w-8 h-8 rounded-full bg-[#EBF1F8] text-[#1B2A4E] font-bold text-[12px] flex items-center justify-center shrink-0">03</span>
                    <div>
                      <p class="text-[14px] font-bold text-[#1B2A4E]">Devansh Mishra</p>
                      <p class="text-[11px] text-red-600 font-medium">High fever reported by mother</p>
                    </div>
                  </div>

                  <!-- 3-Way Segmented Pill Button -->
                  <div class="shrink-0">
                    
                      <div class="inline-flex items-center bg-[#F3EEE3] rounded-full p-0.5 border border-[#E8E2D6]/80 gap-0.5 shrink-0">
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s3', 'present')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">P</button>
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s3', 'absent')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-red-600 text-white shadow-xs scale-105">A</button>
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s3', 'late')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">L</button>
                      </div>
                    
                  </div>
                </div>

                <div class="py-2.5 flex items-center justify-between gap-2 flex-nowrap border-b border-black/[0.04] last:border-0">
                  <div class="flex items-center gap-3 min-w-0 flex-1">
                    <span class="w-8 h-8 rounded-full bg-[#EBF1F8] text-[#1B2A4E] font-bold text-[12px] flex items-center justify-center shrink-0">04</span>
                    <div>
                      <p class="text-[14px] font-bold text-[#1B2A4E]">Ishita Nair</p>
                      <p class="text-[11px] text-[#55607A]">Roll #04 · +91 99100 88221</p>
                    </div>
                  </div>

                  <!-- 3-Way Segmented Pill Button -->
                  <div class="shrink-0">
                    
                      <div class="inline-flex items-center bg-[#F3EEE3] rounded-full p-0.5 border border-[#E8E2D6]/80 gap-0.5 shrink-0">
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s4', 'present')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-emerald-600 text-white shadow-xs scale-105">P</button>
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s4', 'absent')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">A</button>
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s4', 'late')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">L</button>
                      </div>
                    
                  </div>
                </div>

                <div class="py-2.5 flex items-center justify-between gap-2 flex-nowrap border-b border-black/[0.04] last:border-0">
                  <div class="flex items-center gap-3 min-w-0 flex-1">
                    <span class="w-8 h-8 rounded-full bg-[#EBF1F8] text-[#1B2A4E] font-bold text-[12px] flex items-center justify-center shrink-0">05</span>
                    <div>
                      <p class="text-[14px] font-bold text-[#1B2A4E]">Kabir Khan</p>
                      <p class="text-[11px] text-red-600 font-medium">School bus #4 delayed in traffic</p>
                    </div>
                  </div>

                  <!-- 3-Way Segmented Pill Button -->
                  <div class="shrink-0">
                    
                      <div class="inline-flex items-center bg-[#F3EEE3] rounded-full p-0.5 border border-[#E8E2D6]/80 gap-0.5 shrink-0">
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s5', 'present')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">P</button>
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s5', 'absent')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">A</button>
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s5', 'late')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-amber-500 text-white shadow-xs scale-105">L</button>
                      </div>
                    
                  </div>
                </div>

                <div class="py-2.5 flex items-center justify-between gap-2 flex-nowrap border-b border-black/[0.04] last:border-0">
                  <div class="flex items-center gap-3 min-w-0 flex-1">
                    <span class="w-8 h-8 rounded-full bg-[#EBF1F8] text-[#1B2A4E] font-bold text-[12px] flex items-center justify-center shrink-0">06</span>
                    <div>
                      <p class="text-[14px] font-bold text-[#1B2A4E]">Meera Joshi</p>
                      <p class="text-[11px] text-red-600 font-medium">Pre-approved family function</p>
                    </div>
                  </div>

                  <!-- 3-Way Segmented Pill Button -->
                  <div class="shrink-0">
                    
                      <span class="px-3 py-1.5 rounded-full bg-blue-50 text-blue-800 text-[11px] font-bold">Approved Leave</span>
                    
                  </div>
                </div>

                <div class="py-2.5 flex items-center justify-between gap-2 flex-nowrap border-b border-black/[0.04] last:border-0">
                  <div class="flex items-center gap-3 min-w-0 flex-1">
                    <span class="w-8 h-8 rounded-full bg-[#EBF1F8] text-[#1B2A4E] font-bold text-[12px] flex items-center justify-center shrink-0">07</span>
                    <div>
                      <p class="text-[14px] font-bold text-[#1B2A4E]">Pranav Gupta</p>
                      <p class="text-[11px] text-[#55607A]">Roll #07 · +91 97112 66778</p>
                    </div>
                  </div>

                  <!-- 3-Way Segmented Pill Button -->
                  <div class="shrink-0">
                    
                      <div class="inline-flex items-center bg-[#F3EEE3] rounded-full p-0.5 border border-[#E8E2D6]/80 gap-0.5 shrink-0">
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s7', 'present')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-emerald-600 text-white shadow-xs scale-105">P</button>
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s7', 'absent')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">A</button>
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s7', 'late')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">L</button>
                      </div>
                    
                  </div>
                </div>

                <div class="py-2.5 flex items-center justify-between gap-2 flex-nowrap border-b border-black/[0.04] last:border-0">
                  <div class="flex items-center gap-3 min-w-0 flex-1">
                    <span class="w-8 h-8 rounded-full bg-[#EBF1F8] text-[#1B2A4E] font-bold text-[12px] flex items-center justify-center shrink-0">08</span>
                    <div>
                      <p class="text-[14px] font-bold text-[#1B2A4E]">Riya Tiwari</p>
                      <p class="text-[11px] text-red-600 font-medium">Attending elder sister wedding</p>
                    </div>
                  </div>

                  <!-- 3-Way Segmented Pill Button -->
                  <div class="shrink-0">
                    
                      <div class="inline-flex items-center bg-[#F3EEE3] rounded-full p-0.5 border border-[#E8E2D6]/80 gap-0.5 shrink-0">
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s8', 'present')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">P</button>
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s8', 'absent')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-red-600 text-white shadow-xs scale-105">A</button>
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s8', 'late')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">L</button>
                      </div>
                    
                  </div>
                </div>

                <div class="py-2.5 flex items-center justify-between gap-2 flex-nowrap border-b border-black/[0.04] last:border-0">
                  <div class="flex items-center gap-3 min-w-0 flex-1">
                    <span class="w-8 h-8 rounded-full bg-[#EBF1F8] text-[#1B2A4E] font-bold text-[12px] flex items-center justify-center shrink-0">09</span>
                    <div>
                      <p class="text-[14px] font-bold text-[#1B2A4E]">Samarth Singh</p>
                      <p class="text-[11px] text-[#55607A]">Roll #09 · +91 98991 88990</p>
                    </div>
                  </div>

                  <!-- 3-Way Segmented Pill Button -->
                  <div class="shrink-0">
                    
                      <div class="inline-flex items-center bg-[#F3EEE3] rounded-full p-0.5 border border-[#E8E2D6]/80 gap-0.5 shrink-0">
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s9', 'present')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-emerald-600 text-white shadow-xs scale-105">P</button>
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s9', 'absent')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">A</button>
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s9', 'late')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">L</button>
                      </div>
                    
                  </div>
                </div>

                <div class="py-2.5 flex items-center justify-between gap-2 flex-nowrap border-b border-black/[0.04] last:border-0">
                  <div class="flex items-center gap-3 min-w-0 flex-1">
                    <span class="w-8 h-8 rounded-full bg-[#EBF1F8] text-[#1B2A4E] font-bold text-[12px] flex items-center justify-center shrink-0">10</span>
                    <div>
                      <p class="text-[14px] font-bold text-[#1B2A4E]">Tanvi Dubey</p>
                      <p class="text-[11px] text-[#55607A]">Roll #10 · +91 98733 99001</p>
                    </div>
                  </div>

                  <!-- 3-Way Segmented Pill Button -->
                  <div class="shrink-0">
                    
                      <div class="inline-flex items-center bg-[#F3EEE3] rounded-full p-0.5 border border-[#E8E2D6]/80 gap-0.5 shrink-0">
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s10', 'present')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-emerald-600 text-white shadow-xs scale-105">P</button>
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s10', 'absent')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">A</button>
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s10', 'late')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">L</button>
                      </div>
                    
                  </div>
                </div>

                <div class="py-2.5 flex items-center justify-between gap-2 flex-nowrap border-b border-black/[0.04] last:border-0">
                  <div class="flex items-center gap-3 min-w-0 flex-1">
                    <span class="w-8 h-8 rounded-full bg-[#EBF1F8] text-[#1B2A4E] font-bold text-[12px] flex items-center justify-center shrink-0">11</span>
                    <div>
                      <p class="text-[14px] font-bold text-[#1B2A4E]">Aditya Rao</p>
                      <p class="text-[11px] text-[#55607A]">Roll #11 · +91 98114 10203</p>
                    </div>
                  </div>

                  <!-- 3-Way Segmented Pill Button -->
                  <div class="shrink-0">
                    
                      <div class="inline-flex items-center bg-[#F3EEE3] rounded-full p-0.5 border border-[#E8E2D6]/80 gap-0.5 shrink-0">
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s11', 'present')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-emerald-600 text-white shadow-xs scale-105">P</button>
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s11', 'absent')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">A</button>
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s11', 'late')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">L</button>
                      </div>
                    
                  </div>
                </div>

                <div class="py-2.5 flex items-center justify-between gap-2 flex-nowrap border-b border-black/[0.04] last:border-0">
                  <div class="flex items-center gap-3 min-w-0 flex-1">
                    <span class="w-8 h-8 rounded-full bg-[#EBF1F8] text-[#1B2A4E] font-bold text-[12px] flex items-center justify-center shrink-0">12</span>
                    <div>
                      <p class="text-[14px] font-bold text-[#1B2A4E]">Bhavya Patel</p>
                      <p class="text-[11px] text-[#55607A]">Roll #12 · +91 98221 21314</p>
                    </div>
                  </div>

                  <!-- 3-Way Segmented Pill Button -->
                  <div class="shrink-0">
                    
                      <div class="inline-flex items-center bg-[#F3EEE3] rounded-full p-0.5 border border-[#E8E2D6]/80 gap-0.5 shrink-0">
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s12', 'present')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-emerald-600 text-white shadow-xs scale-105">P</button>
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s12', 'absent')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">A</button>
                        <button 
                          type="button" 
                          onclick="window.fnicSetStudentStatus && window.fnicSetStudentStatus('s12', 'late')" 
                          class="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-[12px] sm:text-[13px] font-bold flex items-center justify-center transition-all bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600">L</button>
                      </div>
                    
                  </div>
                </div>
              </div>
            </div>

            <!-- Right 4 Cols: Live Telemetry & Summary Cards -->
            <div class="lg:col-span-4 space-y-4">
              
              <!-- Attendance Summary -->
              <div class="bg-white rounded-[18px] p-5 shadow-[0_1px_3px_rgba(27,42,78,0.04)] border border-[#E8E2D6] space-y-3">
                <h3 class="text-[15px] font-bold text-[#1B2A4E]">Class Summary</h3>
                <div class="space-y-2 text-[13px]">
                  <div class="flex justify-between p-2.5 rounded-xl bg-[#FBF8F3] border border-[#E8E2D6]/60">
                    <span class="text-[#55607A]">Total Strength</span>
                    <b class="text-[#1B2A4E]">42 Students</b>
                  </div>
                  <div class="flex justify-between p-2.5 rounded-xl bg-emerald-50 text-emerald-800">
                    <span class="font-medium">Present Today</span>
                    <b id="summary-count-present">38 (90.4%)</b>
                  </div>
                  <div class="flex justify-between p-2.5 rounded-xl bg-red-50 text-red-800">
                    <span class="font-medium">Absent</span>
                    <b id="summary-count-absent">2 (4.8%)</b>
                  </div>
                  <div class="flex justify-between p-2.5 rounded-xl bg-amber-50 text-amber-800">
                    <span class="font-medium">Late Arrival</span>
                    <b id="summary-count-late">1 (2.4%)</b>
                  </div>
                  <div class="flex justify-between p-2.5 rounded-xl bg-blue-50 text-blue-800">
                    <span class="font-medium">Official Leave</span>
                    <b>1 (2.4%)</b>
                  </div>
                </div>
              </div>

              <!-- Absent Parent Queue -->
              <div class="bg-white rounded-[18px] p-5 shadow-[0_1px_3px_rgba(27,42,78,0.04)] border border-[#E8E2D6] space-y-3">
                <div class="flex items-center justify-between">
                  <h3 class="text-[14px] font-bold text-[#1B2A4E]">WhatsApp Alert Queue</h3>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800">2 Parents</span>
                </div>
                <div class="space-y-2 text-[12px]">
                  <div class="p-2.5 rounded-xl bg-[#FBF8F3] border border-[#E8E2D6]/70">
                    <p class="font-bold text-[#1B2A4E]">Devansh Mishra (Roll 03)</p>
                    <p class="text-[#55607A] text-[11px]">Parent: Kavita Mishra (+91 94551 22334)</p>
                    <span class="text-[10px] text-red-600 font-semibold mt-1 block">Reason: High fever</span>
                  </div>
                  <div class="p-2.5 rounded-xl bg-[#FBF8F3] border border-[#E8E2D6]/70">
                    <p class="font-bold text-[#1B2A4E]">Riya Tiwari (Roll 08)</p>
                    <p class="text-[#55607A] text-[11px]">Parent: Manish Tiwari (+91 98188 77889)</p>
                    <span class="text-[10px] text-red-600 font-semibold mt-1 block">Reason: Family wedding</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      `;
    },

    attendance_scanner: function (theme, tc) {
      return `
        <div class="space-y-5">
          <div class="${tc.card} flex flex-wrap items-center justify-between gap-4">
            <div>
              <span class="px-2.5 py-0.5 rounded-pill bg-emerald-100 text-emerald-800 text-[11px] font-bold">Gate Biometric &amp; QR Stream</span>
              <h1 class="text-[22px] ${tc.inkTitle} mt-1">Main Gate Attendance Scanner &amp; Camera Stream</h1>
              
            </div>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
              <span class="text-[12px] font-bold text-emerald-700">Live: Gate 1 &amp; Gate 2 Online</span>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div class="lg:col-span-7 ${tc.card} space-y-3">
              <div class="flex items-center justify-between">
                <h3 class="text-[15px] font-bold text-ink">Live Gate Taps (Past 5 Minutes)</h3>
                <span class="text-[11px] text-ink-secondary">Speed: 42 scans/min</span>
              </div>
              <div class="space-y-2">
                <div class="p-2.5 rounded-xl ${tc.subtle} flex items-center justify-between">
                  <div class="flex items-center gap-2.5">
                    <span class="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">08:24:12 AM</span>
                    <span class="text-[13px] font-bold text-ink">Aarav Verma (Class 10-A)</span>
                  </div>
                  <span class="text-[11px] text-emerald-700 font-semibold">✓ Verified RFID</span>
                </div>
                <div class="p-2.5 rounded-xl ${tc.subtle} flex items-center justify-between">
                  <div class="flex items-center gap-2.5">
                    <span class="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">08:24:05 AM</span>
                    <span class="text-[13px] font-bold text-ink">Ishita Nair (Class 10-A)</span>
                  </div>
                  <span class="text-[11px] text-emerald-700 font-semibold">✓ Verified RFID</span>
                </div>
                <div class="p-2.5 rounded-xl ${tc.subtle} flex items-center justify-between">
                  <div class="flex items-center gap-2.5">
                    <span class="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">08:23:48 AM</span>
                    <span class="text-[13px] font-bold text-ink">Kabir Khan (Class 10-A)</span>
                  </div>
                  <span class="text-[11px] text-amber-700 font-semibold">⚠ Bus Delay Late Mark</span>
                </div>
              </div>
            </div>

            <div class="lg:col-span-5 ${tc.card} space-y-3">
              <h3 class="text-[15px] font-bold text-ink">Scanner Device Health</h3>
              <div class="space-y-2 text-[12px]">
                <div class="flex justify-between p-2 rounded bg-black/5"><span>Main Gate Turnstile A</span><span class="font-bold text-emerald-700">Active (99.8%)</span></div>
                <div class="flex justify-between p-2 rounded bg-black/5"><span>Bus Depot Biometric 1</span><span class="font-bold text-emerald-700">Active</span></div>
                <div class="flex justify-between p-2 rounded bg-black/5"><span>Faculty Staff Room Terminal</span><span class="font-bold text-emerald-700">Active</span></div>
              </div>
              <button type="button" onclick="window.FNIC_SHOW_MODAL('Scanner Diagnostics', 'Running network latency ping across all 6 scanners. Result: 12ms latency.')" class="${tc.primaryBtn} w-full mt-2 h-8 text-[11px]">Run Device Diagnostics</button>
            </div>
          </div>
        </div>
      `;
    },

    // 17. TRANSPORT FLEET
    transport: function (theme, tc) {
      const tp = samples.transport || {};
      return `
        <div class="space-y-5">
          <div class="${tc.card} flex flex-wrap items-center justify-between gap-4">
            <div>
              <span class="px-2.5 py-0.5 rounded-pill ${tc.primaryPill} text-[11px] font-bold">Fleet Safety &amp; GPS</span>
              <h1 class="text-[22px] ${tc.inkTitle} mt-1">School Transport Fleet &amp; Route Telemetry</h1>
              
            </div>
            <button type="button" onclick="window.FNIC_SHOW_MODAL('Broadcast Bus Alert', 'Push notification sent to parents of Route 4 regarding traffic diversion.')" class="${tc.primaryBtn} h-9 px-4 text-[12px]">
              Notify Route 4 Parents
            </button>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="${tc.card} text-center">
              <span class="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Active Buses</span>
              <div class="text-[26px] ${tc.inkTitle} mt-1">${tp.totalBuses || 14} / 14</div>
              <span class="text-[11px] text-emerald-600 font-semibold">100% On-Road</span>
            </div>
            <div class="${tc.card} text-center">
              <span class="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Speed Compliance</span>
              <div class="text-[26px] ${tc.inkTitle} mt-1">${tp.speedCompliant || '100%'}</div>
              <span class="text-[11px] text-emerald-600 font-semibold">Under 40 km/h limit</span>
            </div>
            <div class="${tc.card} text-center">
              <span class="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Delayed Routes</span>
              <div class="text-[26px] ${tc.inkTitle} mt-1">${tp.delayed || 1}</div>
              <span class="text-[11px] text-amber-600 font-semibold">Route 4 (+12 min)</span>
            </div>
            <div class="${tc.card} text-center">
              <span class="text-[11px] font-bold uppercase tracking-wider text-ink-faint">Fuel Readiness</span>
              <div class="text-[26px] ${tc.inkTitle} mt-1">Full</div>
              <span class="text-[11px] text-blue-600 font-semibold">CNG Inspected</span>
            </div>
          </div>
        </div>
      `;
    },

    // 18. STAFF NOTICES & MESSAGES
    messages: function (theme, tc) {
      return `
        <div class="space-y-5">
          <div class="${tc.card} flex flex-wrap items-center justify-between gap-4">
            <div>
              <span class="px-2.5 py-0.5 rounded-pill ${tc.primaryPill} text-[11px] font-bold">Institutional Communication</span>
              <h1 class="text-[22px] ${tc.inkTitle} mt-1">Staff Circulars, Notices &amp; Parent Broadcasts</h1>
              
            </div>
            <button type="button" onclick="window.FNIC_SHOW_MODAL('Compose Circular', 'New staff circular draft opened.')" class="${tc.primaryBtn} h-9 px-4 text-[12px]">
              + Compose Circular
            </button>
          </div>

          <div class="${tc.card}">
            <h3 class="text-[15px] ${tc.inkTitle} mb-3">Published Directives</h3>
            <div class="space-y-3">
              <div class="p-3.5 rounded-xl ${tc.subtle} space-y-1">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded-pill bg-blue-100 text-blue-800">Circular #2026/48</span>
                  <span class="text-[11px] text-ink-secondary">Issued Today 08:00 AM</span>
                </div>
                <h4 class="text-[14px] font-bold text-ink">Mandatory Staff Meeting: Term 2 Board Preparation</h4>
                <p class="text-[12px] text-ink-secondary">All PGT and TGT faculty to assemble in the Senior Library at 02:45 PM today for CBSE sample paper review.</p>
              </div>

              <div class="p-3.5 rounded-xl ${tc.subtle} space-y-1">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded-pill bg-purple-100 text-purple-800">Circular #2026/47</span>
                  <span class="text-[11px] text-ink-secondary">Issued Yesterday</span>
                </div>
                <h4 class="text-[14px] font-bold text-ink">Winter Uniform Guidelines Transition</h4>
                <p class="text-[12px] text-ink-secondary">Navy blazers and maroon ties mandatory for all students starting Monday 10 November.</p>
              </div>
            </div>
          </div>
        </div>
      `;
    }
  };

  return {
    renderScreen: function (screenId, theme) {
      const tc = getThemeClasses(theme);
      const fn = screens[screenId];
      if (typeof fn === 'function') {
        return fn(theme, tc);
      }
      return screens.dashboard(theme, tc);
    },
    getSections: function () {
      return DATA.sections || [];
    },
    getMeta: function () {
      return meta;
    }
  };
})();

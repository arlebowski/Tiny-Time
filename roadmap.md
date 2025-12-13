# Tiny Tracker Roadmap

This is a living roadmap.  
Checkboxes reflect product decisions, not just implementation tasks.

---

## NOW (Must be done before launch)

### Core data model
- [x] Family container
- [x] Multi-kid support

### Multi-kid UX
- [x] A. Header + Kid Switching
  - [x] Replace title with: [Logo] {kidName}’s Tracker ▾
  - [x] Share stays on the right
  - [x] Add dropdown menu to switch kids
  - [x] Add global activeKidId state
  - [x] Reinitialize storage + rerender tabs on kid switch (Option A)

- [x] B. Kid Theming
  - [x] Add themeColor to each kid’s settings
  - [x] Provide 5 pastel color choices
  - [x] Apply theme to:
    - header background
    - title color
    - share icon tint
    - (Optional later: analytics line color)

- [x] C. Add Child
  - [x] Add “+ Add Child” button on Family Tab
  - [x] Create “Add Child” modal (reuse onboarding fields)
  - [x] New kid saved under current family
  - [x] Set activeKidId to new kid after creation

- [x] D. Update Tabs
  - [x] Pass activeKidId to:
    - Today
    - Tracker
    - Analytics
    - AI Chat
  - [ ] Ensure all queries consistently use the correct kid

- [x] E. Update Family Tab
  - [x] Show list of kids
  - [x] Tap kid = switch kid
  - [x] Theme picker per kid

---

### UI cleanup + polish
- [x] Make new user more prominent on sign up
- [x] Favicon
- [ ] Fix time entry field sizing / alignment
- [ ] Replace baby bottle graphic on onboarding with proper logo
- [ ] On first login, onboarding screen is scrolled halfway down
- [x] Make logo slightly bigger
- [x] Fix clipboard / Messenger popup after dismissing share sheet
- [ ] Improve loading speed when switching kids or tabs
- [ ] Fix color bleed above header when theme changes

---

### Sleep tracking (v1)
**Backend**
- [ ] sleepSessions collection
- [ ] activeSleep doc OR endTime == null convention
- [ ] Real-time listeners for active sleep

**Frontend**
- [ ] Start / stop sleep timer
- [ ] Timer updates across family members in real time
- [ ] Timer persists when app is closed
- [ ] Sleep sessions appear in Today + Analytics

---

### Analytics improvements
- [ ] Sleep duration summaries
- [ ] Combined feeding + sleep patterns
- [ ] Chart polish (thinner bars, possible redesign)

---

### Launch gate
- [ ] Chat / community infra improvements (minimal)
- [ ] Push notifications (basic)
- [ ] Subscription system (v1)
- [ ] Onboarding audit
- [ ] Website
- [ ] QA + launch

---

## NEXT (Post-launch priorities)

- [ ] Breastfeeding tracking
- [ ] Prediction engine v2
- [ ] Community features

---

## LATER / OPTIONAL

- [ ] Pumping
- [ ] Growth charts
- [ ] Medication tracking

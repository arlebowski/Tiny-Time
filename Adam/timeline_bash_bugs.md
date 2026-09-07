# Timeline bash bugs (2026-09-06)

Found while bashing Sleep Detail/Timeline on iPhone 17 Pro simulator (Sat Sep 5 sleep log + native test ad). **None of these come from the current ads / interstitial work.** Uncommitted Timeline changes only touch ad density, FlatList batching, `delaysContentTouches`, and memoizing the pan gesture.

| Age | Meaning |
| --- | --- |
| Old | In tree since native Detail/Timeline landed (mid-Feb 2026) |
| Old, later tightened | Same class of bug, made more visible by a later Feb commit |

---

## 1. Sleep duration: card vs sheet disagree

**Age: Old** (Feb 14–15, 2026)

**Seen:** Same 9:25 PM sleep is **3s** on the timeline card and **2s** in the Sleep sheet.

**Why:** Two formatters, two rounding rules.

- Timeline: `formatSleepDuration` uses `Math.round(ms / 1000)` — `TimelineItem.js` (`6dbd5f34`, 2026-02-15)
- Sheet: `formatElapsedHmsTT` uses `Math.floor(ms / 1000)` — `dateTime.js` / `SleepSheet.js` (`3a864e89`, 2026-02-14)

A 2.5s session becomes 3s on the card and 2s in the editor. Start/end are also shown to the minute only (`9:25 PM – 9:25 PM`), so the row looks empty while the duration is not.

---

## 2. No pressed state on swipe / delete chrome

**Age: Old** (Feb 15–18, 2026)

**Seen:** Holding swipe **Edit** / **Delete** and dialog **Cancel** / **Delete** does not dim or scale.

**Why:** Those `Pressable`s have no `pressed` style.

- Swipe actions: `TimelineSwipeRow.js` `ActionColumn` (`a8622425`, 2026-02-18)
- Confirm Cancel / Delete: `Timeline.js` (`6dbd5f34`, 2026-02-15)

---

## 3. Full-swipe Cancel parks the row off-screen (“ghost”)

**Age: Old, later tightened** (Feb 15, pin added Feb 18)

**Seen:** Delete **button** → dialog → **Cancel** restores the row (that path calls `closeSwipe()` first). Full swipe (~80% width) is the broken path; mouse pans in the simulator did not reliably hit the lock, but the code is unambiguous.

**Why:**

- Full-swipe `onEnd` opens the confirm modal and **pins** `translateX = -width`, then sets `openSwipeId` to `null` so the “other row closed” effect does not spring it back (`a8622425`, 2026-02-18).
- Dialog **Cancel**, overlay tap, and Android back only run `setDeletingCard(null)` (`6dbd5f34`, 2026-02-15). They never `closeSwipe()`.
- Failed Firestore delete un-hides the item the same way: no swipe reset.

---

## 4. Empty timeline copy always says “today”

**Age: Old** (`6dbd5f34`, 2026-02-15)

**Seen:** Filter Sleep on **Mon 31** (Aug 31): “No sleep sessions **yet today**.”

**Why:** `EmptyState` in `Timeline.js` hard-codes “yet today” for all / feed / sleep / diaper. It has no selected-date prop.

---

## 5. Month title follows the week’s last day, not the selected day

**Age: Old** (`6dbd5f34`, 2026-02-15)

**Seen:** Header **September 2026** while **Mon 31** (August) is selected.

**Why:** `HorizontalCalendar` sets `monthKey` from `days[6]` (rightmost chip in the strip), not `selectedDate`. A week that starts in August and ends in September always titles September.

---

## 6. Layout animation turns off while a swipe is active or a row is hiding

**Age: Old** (guard `5222d413`, 2026-02-24)

**Why:** `itemLayoutAnimation` is cleared when `swipingCardId` or `hiddenItemIds.size > 0`. Remaining rows jump instead of easing. This predates ads; ads sitting in the same list make it more noticeable.

---

## Not counted as bugs

- **0.0 hrs** next to a 3s sleep: summary is hours to one decimal (`formatV2Number`). 3s is 0.0008 h.
- Native ad placement after the first sleep row: current density rules, not a defect.
- Delete-button Cancel restoring the row: working path.

---

## Suggested fix order

1. `closeSwipe` (or equivalent) on Cancel, overlay dismiss, and failed delete.
2. One rounding rule for sleep duration (prefer `formatElapsedHmsTT` / floor, or round everywhere).
3. Empty copy that does not say “today” on other days.
4. Month title from `selectedDate`.
5. Pressed styles on the four buttons.
6. Decide whether swipe/hide should keep `LinearTransition`.

---

## Logging bash coverage (2026-09-06)

Exercised on iPhone 17 Pro simulator (Sun Sep 6, 2026). **None of the new items below come from the ads / interstitial commits** (`6f546a93`, `355977c9`) or the uncommitted Timeline ad-density work. AdMob’s test “native ad validator” overlay did keep covering the timeline after saves; that is test-mode chrome, not counted as a product bug.

**Reached**
- Solids: + → Feed → Solids. Next with zero foods (stays on step 1). One food (Chicken) with prep Mashed, amount A little, reaction Loved (toggled). Notes field. Double-tap **Add** (one timeline row). Edit via row tap. Expand via chevron (Mashed • A little, note **B**). Summary **1 foods**.
- Bottle: stepper down to **0 oz** → Add → alert “Please enter the amount.” Stepper up to **2 oz** → saved. Summary and timeline show 2 oz. Default open amount was 6.5 oz.
- Sleep: Start sleep (timer 1s) → End sleep (auto-saves and dismisses). Sleep tab: **23s** card, summary **0.0 hrs** (same hours-decimal class as known non-bug).
- Diaper: sheet defaults to **Dry**; Wet selected and saved. Diaper tab: **1 changes**, row **Wet** 10:40 AM.
- Filters: Feed / Sleep / Diaper after each type. Sun 6 selected.

**Behaved correctly (no new bug)**
- Double-tap solids **Add** created a single Chicken log.
- 0 oz bottle is blocked by an alert (does not write).
- Solids Next with no foods does not advance.
- Prep / amount / reaction chips select, dim others, and toggle off.
- Bottle 2 oz and diaper Wet persist on the timeline.

**Could not reach via automation** (stopped after ~3 calibrated tries or never opened the control)
- Nursing (Feed type picker only showed Bottle + Solids; nursing is off in `activityVisibility`).
- Solids **Browse All Foods**, search, empty results, custom / emoji / long / quoted names.
- Photos (library picker).
- oz→ml toggle (taps hit the time row / opened the time tray instead).
- Future / midnight time: date wheel spun to Wed Sep 23 then jumped back to **Today**; could not land 11:59 PM or Mon Sep 7 and Save.
- Sleep end-before-start pickers; multi-hour sleep; 0-duration save without starting.
- Diaper rapid repeats, notes, edit, delete.
- Timeline sort toggle, All tab mixed list, empty days besides known bug 4.
- Swipe Edit/Delete and row Delete on solids (known bugs 2–3).
- Hardware typing into notes was flaky (see bug 10).

---

## 7. Solids Next looks enabled with zero foods

**Age: Old** (`e1496a37` / `6dbd5f34`, Feb 2026)

**Seen:** Solids step 1, no foods. **Next** is a full bright green pill (`/tmp/next-btn.png`, `/tmp/bash-solids-next-empty.png`). Tap does nothing — no alert, no step change.

**Why:** `solidsCanNext` is `addedFoods.length > 0` (`FeedSheet.js` ~1082). Footer sets `disabled: !solidsCanNext` (~1146) and the `Pressable` is `disabled`. The **button fill stays `accent` green**; only the label gets `opacity: 0.5` (~1181). Easy to think Next is tappable.

---

## 8. Amount chips: “A little” and “None” are the same empty circle

**Age: Old** (`e1496a37`, 2026-02-19)

**Seen:** Chicken detail tray. Amount row is five icon-only chips. The 4th and 5th are both empty ring icons. Selecting the 4th saved as **A little** (review card + expanded timeline). `/tmp/detail-after.png`, `/tmp/bash-detail-toggles.png`.

**Why:** `AMOUNT_ICON_BY_LABEL['A little']` is `AmountNoneIcon`, and **None** falls through to the same icon (`FeedSheet.js` 119–124, 1741–1746). Chips are `iconOnly`, so there is no text to tell them apart.

---

## 9. Summary copy is always plural: “1 foods”, “1 changes”

**Age: Old** (`9af657a3` SolidsCard 2026-02-14; `6dbd5f34` comparison string 2026-02-15)

**Seen:** After one solids log, Feed summary **1 foods** and **↑ 1 foods ahead of pace** (`/tmp/bash-feed-tab2.png`, `/tmp/bash-feed-with-bottle.png`). After one wet diaper, **1 changes** (`/tmp/bash-diaper-tab.png`).

**Why:** Cards hard-code `unit="foods"` / `unit="changes"` (`SolidsCard.js` 18–19, `DiaperCard.js` 92–93). Pace line interpolates that unit with no pluralization (`DetailScreen.js` 91, 95–97).

---

## 10. Notes lost characters — LIKELY AUTOMATION ARTIFACT, NOT A PRODUCT BUG

**Age: n/a**

**Seen:** On Review, typed **Bash note**; after **Add** and reopen, notes were a single **B** (`/tmp/bash-typed-note2.png`, `/tmp/bash-after-done.png`, `/tmp/bash-expanded-details.png`).

**Assessment:** `InputRow` text mode is a plain controlled `TextInput` — `value={value || ''}` with `onChangeText={onChange}` (`InputRow.js` 42–48) — which is correct React Native usage, and `handleSave` writes that same state (`FeedSheet.js` 816, 826). A controlled `TextInput` drops keystrokes when they arrive faster than the JS round-trip, which is exactly what synthetic Simulator hardware-keyboard input does. **Re-test by typing on a real device or with the on-screen keyboard before treating this as a defect.**

---

## 11. Dismissing solids Review drops unsaved edits with no confirm

**Age: Old** (close path `3a864e89` 2026-02-14; Review back `e1496a37` 2026-02-19)

**Seen:** Edit Review with notes **Bx** (`/tmp/bash-dismiss-unsaved.png`). Tap the Review header back control → sheet gone, back on Feed timeline (`/tmp/bash-review-back.png`). Re-expand still shows **B**, not **Bx**. No “discard changes?” alert. Drag-down from mid-sheet also did not confirm (and often did not dismiss).

**Why (confirmed):** `handleClose` (~545–558) never prompts; it just clears local sheet state. Any dismissal silently discards edits.

**Unconfirmed:** the sheet leaving the screen on the Review back control contradicts the code — `onHeaderBackPress` only calls `setSolidsStep(1)` (`FeedSheet.js` 1371–1376). That part may have been a mis-hit rather than the back control. Reproduce by hand before filing.

---

## 12. Bottle Add looks enabled at 0 oz

**Age: Old** (`3a864e89` / bottle save `FeedSheet.js` 646–649)

**Seen:** Amount **0 oz**, primary **Add** still solid red (`/tmp/bash-oz0.png`). Tap → iOS alert “Enter amount” / “Please enter the amount.” (`/tmp/bash-oz0-add.png`). No log written (summary stayed 0 oz until a later 2 oz save).

**Why:** Bottle CTA is only `disabled={saving}` (~1203). Zero is checked inside `handleSave` after `setSaving(true)`, then `setSaving(false)` and `Alert.alert`. Contrast sleep’s Start/Save which uses `opacity: 0.7` when `ctaDisabled` (`SleepSheet.js` 702).

---

## 13. Future times in the feed picker snap back to now

**Age: Old** (`clampIsoToNow`, `FeedSheet.js` 185–196, 569–571)

**Seen:** Time tray opened from Bottle. Date wheel went to **Wed Sep 23** (`/tmp/bash-future-picker.png`). Seconds later the same tray showed **Today 10:35 AM** (`/tmp/bash-after-future-done.png`). Could not keep a future day selected.

**Why:** `handleDateTimeChange` runs `clampIsoToNow`, which replaces any timestamp more than 60s ahead with `Date.now()`. The wheel is a controlled value, so it jumps back. Save would also `Alert.alert('Invalid time', 'Time cannot be in the future.')` (~600–602), but the picker never lets you get there.

---

## 14. New diaper sheet defaults to Dry (Wet/Poop dimmed) — DESIGN QUESTION, NOT A DEFECT

**Age: Old** (`3a864e89`, 2026-02-14) — deliberate, so decide whether it is the default you want

**Seen:** Opening Diaper from + pre-selects **Dry** with a gold ring; Wet and Poop are faded (`/tmp/bash-diaper-sheet.png`, `/tmp/diaper-types.png`). Wet still works if you tap it (logged **Wet** 10:40 AM, `/tmp/bash-diaper-tab.png`).

**Why:** `useState` defaults `isDry` to `true` (`DiaperSheet.js` 97–98). Toggles make Dry exclusive with Wet/Poop (~151–167) and `dim={isDry}` on Wet/Poop (~301–302).

---

## Family / invite / share bash coverage (2026-09-06)

Exercised on iPhone 17 Pro simulator (Sun Sep 6, 2026). **None of the new items below come from the ads / interstitial commits** (`6f546a93`, `355977c9`) or the uncommitted ads work. Left a fake child **TestZ** (typed as ZZTest; Simulator keyboard reordered characters — treat as automation, not a name-field bug) selected in Levi's family. Did not remove Marlene or any real member.

**Reached**
- Family hub (person icon): profile row (Adam Lebowski), Appearance (Light/Dark + Theme 1–4), My Families (Adam's family / Levi's family Active, Add or Join a Family).
- My Profile: avatar, Name, Email, Sign Out, Delete My Account. Photo picker opened (system Photos); dismissed with X without changing the real avatar.
- Family (Levi's family): family name, Your Kids (Levi), Add Child sheet, Family Members (Adam Owner without trash; Marlene with trash).
- Add Child: empty name, whitespace-only name, name **TestZ**, birth-date spinner (today Sep 6 2026; year wheel to 2037; Done), save. New child listed first with **Active**, auto-selected on Track (header **TestZ**, empty bottle/nursing/solids).
- Kid (TestZ): name, birth **Dec 31, 2026**, Feeding Unit row (oz), Day Sleep Window sheet (6:30 am–7:30 pm), Activity Visibility (all On), Delete Kid copy.
- Appearance Dark then back to Light (restored).
- Share menu: **Share app link** → native iOS share sheet (`A Tracker for Tinies` / `tinytracker.io`). Dismissed without sending.

**Behaved correctly (no new bug)**
- Empty name and whitespace-only name both Alert **Error / Please enter your child's name**; no child written until TestZ + a date.
- New child becomes Active and is selected on Track.
- Owner row has no remove control (Adam).
- Profile photo picker is the system picker; Cancel/X returns to My Profile unchanged.
- Share app link payload is well-formed (no `undefined`/`null`). Dark mode hub cards stayed readable.
- Activity Visibility on TestZ showed Bottle/Nursing/Solids/Sleep/Diaper all **On** (nursing-off from the earlier logging pass is Levi's setting, not this new kid).

**Could not reach via automation** (stopped after ~3 calibrated tries or never opened the control)
- Invite **partner** from the share popover (menu opened; tap often dismissed it without a second share sheet). Family **Copy invite link ↗** (below the fold; did not get back to that row after creating TestZ).
- PartnerInviteModal (hub **PI** chip), SetupScreen invite/share, Join with Code, Add or Join a Family create form.
- Email/phone invite fields, role/permission picker, pending-invite list, resend/revoke — **not in this UI**. Invite is `createInvite` + `Share.share` with a 6-char code (`App.js` `handleGlobalInvitePartner`, `FamilySubscreen.js` copy).
- Remove member / last owner / Delete Family / Delete Kid confirm (did not tap destructive actions on real data).
- Kid switcher popover; Feeding Unit sheet (taps opened Day Sleep instead); Activity Visibility **Done** (three taps; drag-down dismissed).
- Add-child photo, duplicate name **Levi**, emoji/quotes/newlines/long name, leap day, picker Cancel vs confirm, rapid double-save, mid-flow dismiss confirm.
- Empty family / no-children empty states (this account already has families and Levi).
- Long family name / long email overflow. Rapid double-tap navigation push.

---

## 15. Add Child looks enabled with empty name and date

**Age: Old** (`05f676afd`, 2026-02-21 button; validation `4a029655f`, 2026-02-15)

**Seen:** Add Child sheet with placeholder **Emma** and **Tap to select**. Primary **Add Child** is a full bright red pill (`/tmp/bash-add-child.png`). Tap → iOS alert **Error** / **Please enter your child's name** (`/tmp/bash-add-empty.png`). Same alert after whitespace-only name (`/tmp/bash-ws-alert.png`). No extra child until a later named save.

**Why:** CTA is only `disabled={savingChild}` — fill stays `bottle.primary` (`AddChildHalfSheet.js` 90–100). Name/date are checked inside `handleCreateChild` after tap (`FamilyScreenContext.js` 851–858). Contrast **Add Family**, which dims the CTA until name + child + date are filled (`AddFamilyHalfSheet.js` 39–46, 160–167). Same class as bottle Add at 0 oz (bug 12).

---

## 16. Birth date can be in the future; age then goes blank

**Age: Old** (picker cap `e8e6ada22`, 2026-02-24; age formatter `4a029655f`, 2026-02-15). Create path does not check `birthTimestamp <= now` (`FamilyScreenContext.js` 864–872).

**Seen:** Birth Date spinner opened on **September 6 2026**. Year wheel showed **2027–2030** below 2026 and could be dragged to **2037** (`/tmp/bash-future-year.png`). **Done** wrote **Dec 31, 2026** on the sheet (`/tmp/bash-after-future-done.png`) — still ~4 months ahead of today. Saved **TestZ**; Family row subtitle is **Dec 31** with no age, **Active** (`/tmp/bash-after-create.png`). Kid screen shows **Dec 31, 2026** with no age (`/tmp/bash-kid-testz.png`). Tracker header selected **TestZ** (`/tmp/bash-tracker-testz.png`).

**Why:** `DatePickerTray` sets `maximumDate` to **Dec 31 of `maxYear`**, and Add Child passes `maxYear={new Date().getFullYear()}` (`AddChildHalfSheet.js` 75–76, `Wheelpickers.js` 868–869). iOS spinner can scroll past that; Done clamps to year-end, not to today. `formatAgeFromDate` returns `''` when `diffDays < 0` (`FamilyScreenContext.js` 49–56), so the kid row is only `formatMonthDay` (`FamilySubscreen.js` 107–109).

---

## 17. Invite code collision retry is dead code; a collision silently repoints someone else's invite

**Age: Old** (`firestoreService.js` `createInvite`, 1392–1424)

**Not reachable through the UI** — proven from code while reviewing the invite path the family pass could not drive.

**Why:** `createInvite` loops `MAX_ATTEMPTS = 3` to "generate unique invite code", but the write is `inviteRef.set({...})` on `invites/<code>`. Firestore `set` without `{ merge }` **overwrites** an existing document and does not throw, so the `catch` never fires on a collision and the retry loop can only ever run once. A duplicate code does not retry — it **overwrites the existing invite**, repointing that code at a different `familyId` / `kidId` and invalidating the first inviter's outstanding link. The code space is `36^6` ≈ 2.2B so this is rare, but the guard that is supposed to prevent it provably does nothing. `set` would need to be a `create`, or a transaction that reads first.

Single-use is enforced correctly elsewhere: `acceptInvite` checks `invite.used` inside a transaction and writes `used`/`usedBy`/`usedAt` (`authService.js` 390–430).

---

## 18. Invite codes never expire and are generated with `Math.random()` — HARDENING QUESTION, NOT A DEFECT

**Age: Old** (`firestoreService.js` 1398–1416)

**Why:** `createInvite` writes `familyId`, `kidId`, `createdBy`, `createdAt`, `used` — **no `expiresAt`** — and `acceptInvite` never checks the age of the invite (`authService.js` 390–414). A shared code stays redeemable forever until someone uses it. Codes come from `Math.random().toString(36)`, not a CSPRNG, and there is no attempt-rate limit on redemption. Single-use redemption limits the blast radius to one family per leaked code, so this is a hardening call rather than a live bug — worth deciding on an expiry window.

---

## 19. `app.json` points at a deleted app icon, so the dev server refuses to start

**Age: Old** (deleted in `99718c4d`, 2026-04-19, "Onboarding screen nolonger flashes on login") — **also on `main`**

**Seen:** `npx expo start --dev-client` boots, prints `Waiting on http://localhost:8081`, then dies with:

```
Unable to resolve asset "./assets/icon.png" from "icon" in your app.json or app.config.js
```

The dev client then shows **Error loading app / Failed to connect to http://localhost:8081** (`/tmp/del-9.png`). Nothing is left listening on 8081.

**Why:** `native/app.json` line 7 is `"icon": "./assets/icon.png"`, but `native/assets/icon.png` was deleted in `99718c4d` and never replaced. It is absent from both `HEAD` and `main` (`git cat-file -e HEAD:native/assets/icon.png` fails), present in `99718c4d~1`, and not gitignored.

**The deletion was deliberate and must not be reverted.** Per Adam: removing `native/assets/icon.png` is what stopped the onboarding screen flashing on login, which is exactly what `99718c4d` is named for. **Do not restore that file.**

The shipped app icon is unaffected. This is a prebuilt/bare workflow with `ios/` committed, and the icon lives in the asset catalog at `native/ios/native/Images.xcassets/AppIcon.appiconset/icon.png` — byte-identical to the deleted file (26,814 bytes, SHA-256 `07a257c5…4ed6f`). So only Expo's own asset resolution is affected, not the build.

**Open question, not a prescription:** `app.json` still names an asset that is intentionally gone. If `expo start` is expected to work, the `icon` key would need to be removed or repointed rather than the asset restored — but that is Adam's call, and the app icon itself is already correct in the asset catalog. Recorded here only so the dev-server failure mode is not rediscovered as a mystery.

---

## 20. Six ad WebViews stay alive and poll JavaScript ~10x/sec each

**Age: Recent** — ads work (`6f546a93` 2026-08-31 / `355977c9` 2026-09-04 plus uncommitted native-ad changes)

**Seen:** With the app frozen (no tap registering anywhere, including the tab bar and `+`), a 10.6-second `log stream` on `com.tinytracker.mobile` captured **1296** `WebPage::runJavaScriptInFrameInScriptWorld` calls across **6 distinct `WebContent` processes** (webPageIDs 21, 2353, 11235, 14020, 16583, 17597) — exactly **108 calls per webview in 10.6s**, i.e. ~10 Hz each, ~60 Hz combined. Combined RSS for the app plus its WebContent children was ~810 MB.

**Why (needs confirmation):** each native ad creates a `WKWebView`; the ~10 Hz JS polling is Open Measurement viewability sampling, which is expected **per live ad**. Six simultaneous ad webviews is not — the timeline caps at 3 slots per day view plus the home slot. That points at ad views being retained after their slot unmounts (virtualization recycling ad rows) rather than destroyed.

**Caveat:** the freeze itself is confounded — Metro had died (see bug 19), so the RN dev client was also in a reconnect storm, opening TCP connections to `:8081` in bursts (connection ids in the 31,000s). Re-measure the webview count on a healthy dev server before treating the leak as proven. The count of six is still worth explaining on its own.

---

## Agreed disposition (2026-09-06)

Keep these fixes separate from the ads work. Finish the surgically scoped ads branch first; do not mix longstanding `main` behavior into that change.

### Correctness follow-up

1. **#17 Invite collision:** fix first. Verify with an isolated automated collision test, never real family data.
2. **#16 Future birth date:** reject dates after today. Verify today vs tomorrow and the year boundary.
3. **#3 Full-swipe ghost row:** reset the swipe state on every dismissal and failed-delete path. Manually reproduce the full-swipe → Cancel path before changing it, then re-test all exits.

### Consistency follow-up

Fix **#1, #4, #5, #8, and #9** as a separate low-risk consistency pass. Their code paths are deterministic enough that additional pre-fix reproduction is unnecessary; add focused tests where practical and verify the corrected UI afterward.

Treat **#2, #7, #12, and #15** as optional UI polish. Treat **#11, #13, #14, and #18** as product/design or security-hardening decisions rather than automatic fixes. Do not change **#6** or **#10** based on this report.

Fresh evaluation did not substantiate **#19** or **#20**: the current Expo dev server successfully serves the iOS manifest and bundle despite the missing icon path, and Simulator WebContent process count does not map one-to-one to retained native-ad views. Re-investigate only if a concrete failure or measured leak appears.

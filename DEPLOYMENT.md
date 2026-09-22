# Deployment Guide — Pablo Paraiso Booking System

## Architecture

The Pablo Paraiso website (`Website/`) is a static site hosted on
**GitHub Pages**. The booking form submits directly to the **management
app's** Google Apps Script backend (`Web App/`), so every
website booking appears instantly in the management dashboard, the
**Bookings** table, the **Calendar**, and the **ActivityLog**.

```
Public website (GitHub Pages)
   │  booking form → POST /exec?action=submitPublicBooking
   ↓
Management App GAS backend (script.google.com)
   │  → writes to the SAME Google Sheet
   │  → creates events on the configured CALENDAR_ID
   ↓
Google Sheet + Google Calendar
   │  read by the management app frontend (also on GitHub Pages)
   ↓
Web App dashboard
```

> **No separate backend deployment is needed for the public site.**
> The public site's own `code.gs` is kept for reference but is **no longer
> used** for booking submissions — the form now posts to the management app's
> GAS endpoint. See [Setting up the Integration](#step-1-set-up-the-integration)
> below.

This guide walks you through connecting the management app's backend to
the website's booking form, enabling **real calendar availability checking**,
**double-booking prevention**, and **full activity logging**.

---

## Prerequisites

- A Google account (the page admin)
- Access to [script.google.com](https://script.google.com)
- A Google Sheet for data storage
- A Google Calendar for availability tracking

---

## Step 1: Set up the Integration

The website booking form now submits to the **management app's** GAS backend.
You need to:

1. Deploy the management app's `code.gs` as a web app (see "Management App
   Backend" below).
2. Set the `SHEET_ID`, `CALENDAR_ID`, and `AUTHORIZED_USERS` script properties
   in the **management app's** GAS project.
3. Copy the management app's `/exec` URL into this site's `index.html`.

## Management App Backend

### 1. Create / open the management app's GAS project

1. Go to [script.google.com](https://script.google.com) → **New Project**.
2. Paste the contents of `Web App/backend/code.gs` into the
   editor.
3. Set three **Script Properties** (Project Settings ⚙ → Script properties):

```
SHEET_ID      = 1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789  (your management Google Sheet)
CALENDAR_ID   = c_1234567890@group.calendar.google.com  (NOT your default — your Pablo Paraiso calendar)
AUTHORIZED_USERS = your-email@gmail.com, manager@retreat.com  (for the management app's auth)
```

> If `CALENDAR_ID` is omitted or set to `"primary"`, the backend falls back
> to your default personal calendar. To use a *different* calendar, create a
> dedicated one in Google Calendar and paste its ID here.

### 2. Create the Google Sheet (management app)

1. Create a Google Sheet with tabs: `Finances`, `Customers`, `Bookings`,
   `Supplies`, `Properties`, `Config`, `ActivityLog`, `WebBookings`.
2. Copy its ID from the URL into the `SHEET_ID` script property.
3. Or — run `seedDatabase()` from the Apps Script editor (▶ Run) to create
   everything automatically.

### 3. Create the Google Calendar

1. Go to [calendar.google.com](https://calendar.google.com).
2. **Create a new calendar** called "Pablo Paraiso Bookings" (recommended —
   keeps booking events separate from your personal calendar).
3. **Copy the Calendar ID** from Settings → Settings → Access permissions:
   - Dedicated calendar ID looks like: `c_1234567890@group.calendar.google.com`
   - Personal calendar ID is usually your email address
   - Or use `"primary"` for your default calendar (not recommended for this use case)
4. **Paste it** into the `CALENDAR_ID` script property (from Step 1 above).
5. **Share the calendar** with your team if needed (Settings → Share with
   specific people → give "Make changes to events" permission).

### 4. Deploy as a Web App

1. In the Apps Script editor, click **Deploy** → **New deployment**.
2. Select **Web app** as the deployment type.
3. Configure the settings:
   - **Execute as**: "Me" (your Google account — this is who owns the Sheet + Calendar)
   - **Who has access**: "Anyone, even anonymous" (this allows website visitors
     to submit bookings via the public `submitPublicBooking` endpoint)
4. Click **Deploy**.
5. **Authorize the script** — this must be done manually:
   - Select `seedDatabase` from the **functions dropdown** (top toolbar)
   - Click **▶ Run** → review and grant permissions
   - Authorize Google Calendar (read/write), Google Sheets (read/write)
   - Click **Allow**. This is a one-time setup per Google account.
6. After deployment, copy the **Web app URL**:
   ```
   https://script.google.com/macros/s/AKfy8aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567/exec
   ```

---

## Step 2: Update the Website's Endpoint URL

1. Copy the **Web app URL** from the management app deployment above.
2. Open `Website/index.html` in an editor.
3. Replace `MANAGEMENT_SCRIPT_ID` with your actual GAS script ID
   (the long alphanumeric string between `/s/` and `/exec`):

   ```javascript
   // OLD (placeholder):
   var GAS_ENDPOINT = "https://script.google.com/macros/s/MANAGEMENT_SCRIPT_ID/exec?action=submitPublicBooking";

   // NEW (yours):
   var GAS_ENDPOINT = "https://script.google.com/macros/s/AKfy8aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567/exec?action=submitPublicBooking";
   ```

4. The `?action=submitPublicBooking` suffix is **required** — it tells the
   management backend to use the public (no-auth) booking handler.
5. Save and push to GitHub — the site redeploys to GitHub Pages automatically.

---

## Step 6: Test the Booking System

1. Start your local server:
   ```bash
   python3 -m http.server 8000
   ```
2. Open `http://localhost:8000` in your browser.
3. Fill out the booking form with a **future date**.
4. Submit the form.
5. **If the slot is available:** You should see a green success message.
6. **If the slot is already booked:** You should see a red error message asking
   you to pick a different date/time.
7. Check your **Google Sheet** — you should see a new row in the **Bookings** tab
   with all the details, and a new row in the **ActivityLog** tab.
8. Check your **Google Calendar** — a new event should appear for the booked date/time.

### Testing Double-Booking Prevention

1. Submit a booking for the same date/time.
2. You should see: *"That time slot is already booked. Please select a different date and/or time."*
3. Check the ActivityLog — both attempts will be recorded.

---

## Activity Logging

Every single interaction is logged in the **ActivityLog** tab of your Google Sheet:

| Timestamp | Action | Status | Request Data (JSON) | Details | Client IP |
|---|---|---|---|---|---|
| 2025-03-15 14:30:22 | booking_request | success | {"name":"...","date":"2025-04-01",...} | Booking confirmed. ID: BK-... | 123.45.67.89 |
| 2025-03-15 14:32:05 | booking_request | failed | {"name":"...","date":"2025-04-01",...} | Slot not available: 1 event(s) already booked | 123.45.67.89 |
| 2025-03-15 14:35:10 | booking_request | failed | {"name":"","date":null,...} | Validation error: Please fill in all required fields | 123.45.67.89 |
| 2025-03-15 14:40:00 | availability_check | failed | {"date":"2025-04-01","timeSlot":"14:00"} | Slot not available | 123.45.67.89 |

**Log levels captured:**
- `attempt` — every form submission, regardless of outcome
- `success` — booking confirmed, event created, sheet logged
- `failed` — slot unavailable or validation error
- `error` — system-level errors (network, API, unexpected exceptions)

---

## Troubleshooting

### "Exception: The coordinates or times of the event are not in the proper format"
- Ensure the `date` field from the form is in `YYYY-MM-DD` format (HTML `<input type="date">` provides this).
- The `timeSlot` values must match exactly: `09:00`, `13:00`, `14:00`, `17:00`.

### "You do not have permission to call getCalendarById"
- The script runs as "Me" (your account). Ensure your account has access to the calendar.
- If using a shared calendar, ensure you have edit permissions.

### Facebook Messenger chat bubble does not appear
- The Meta Customer Chat Plugin (Meta's official Messenger integration) only renders
  on domains that have been **whitelisted** in your Facebook Page settings.
- **localhost cannot be whitelisted** — this is a Facebook limitation. The plugin will
  not render at `http://localhost:PORT`. Test directly on your production domain, or
  visit `https://m.me/561017820679235` in a new tab to test Messenger manually.
- Ensure `FB_PAGE_ID = "561017820679235"` in `index.html` matches your Facebook Page ID.
- Check the browser console for Facebook SDK errors (ad blockers can block
  `connect.facebook.net`).
- The plugin may take up to 24 hours to activate after whitelisting (rarely instantly).

### "TypeError: output.setHeader is not a function"

This was an issue in the old public-site `code.gs`. The management app's
backend uses `sendJson()` which wraps every `setHeader()` call in try-catch,
so this error should not occur. If it does, ensure you are using the latest
`backend/code.gs` from the management app repo.

### Calendar checks are slow (3+ seconds)
- Google Apps Script has a 6-minute execution limit, but individual API calls may take
  time. The script is optimized to check availability before creating events, which
  prevents race conditions.

---

## Files in This Project

```
Website/
├── index.html              # Main website (static, GitHub Pages)
├── code.gs                 # [DEPRECATED] Standalone backend — no longer used for bookings.
│                            # The booking form now posts to the MANAGEMENT APP's
│                            # GAS backend (Web App/backend/code.gs).
├── DEPLOYMENT.md           # This guide
├── README.md               # Project documentation
├── .gitignore              # Prevents committing secrets
└── assets/
    └── img/                # All images (Unsplash + custom SVG)
```

**The management app** (`Web App/`) contains the active
backend (`backend/code.gs`), frontend (`js/`, `css/`), and its own
`README.md` with the full API contract.

---

## Security Notes

- The management app's GAS web app URL is effectively public (the
  `submitPublicBooking` endpoint accepts unauthenticated POSTs for website
  form submissions). Input validation in `code.gs` prevents malformed data.
- All other endpoints (dashboard, bookings, customers, etc.) require a
  valid GIS token verified against Google's tokeninfo endpoint, plus the
  user's email must be on the `AUTHORIZED_USERS` allow-list.
- The Google Sheet and Calendar are protected by your Google account's
  permissions. Only the script owner ("Me") can write to them.
- The GAS endpoint URL should NOT be treated as a secret — it is loaded
  client-side in `index.html`.
- The Facebook Page ID (`FB_PAGE_ID` in `index.html`) is PUBLIC information
  displayed on your Facebook Page — it is NOT a secret and safe to include
  in frontend code.
- No API keys, access tokens, or passwords are exposed in client-side code.
- No API keys, access tokens, or passwords are exposed in client-side code.

---

## Facebook Messenger Domain Whitelisting

The Meta Customer Chat Plugin renders a floating Messenger chat bubble at the
bottom-right corner of your page. It is Meta's official Messenger integration
(replacing the old custom chat widget). This requires **domain whitelisting**.

### Setup Instructions

1. Go to your Facebook Page (e.g., `https://www.facebook.com/PabloParaiso`)
2. Click **Settings** → **General** → **Messages**
3. Find **"Whitelisted websites"** in the Messages section, click **Edit** (pencil icon)
4. Add your production domain(s):
   ```
   https://pabloparaiso.com.ph
   ```
   - Include the protocol (`https://`) — no trailing slash needed
   - Add both `www` and non-`www` versions if your site serves both
   - One domain per line; add multiple if needed
5. Click **Save Changes**

### Configuration in `index.html`

The Page ID is configured as a single variable — change ONLY this value to switch
pages (Page IDs are public, not secrets):

```javascript
var FB_PAGE_ID = "561017820679235";  // ← Replace with your Page ID
```

Find your Page ID:
- Go to `facebook.com/[your-page]` → right-click → **View Page Source** → search for `"entity_id"` or `"page_id"`
- Or: `facebook.com/[your-page]` → **Page** → **About** → scroll to "Page ID"

### Important Notes

- **localhost cannot be whitelisted** — the plugin will NOT appear at `http://localhost:PORT`
- The plugin activates within **24 hours** of whitelisting (rarely instantly)
- No ad blocker should be active when testing (they can block `connect.facebook.net`)
- The chat bubble appears at **bottom-right** on both desktop and mobile — it does
  **NOT overlap** the back-to-top button (bottom-left) or the booking form
- On localhost, test Messenger directly: `https://m.me/561017820679235`

### Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| No chat bubble on production domain | Domain not whitelisted | Add to Facebook Page → Settings → Messages → Whitelisted websites |
| No chat bubble on localhost | localhost cannot be whitelisted | Expected — deploy to production domain |
| Bubble appears but no greeting text | `logged_in_greeting` not set | Edit greeting attributes in the `fb-customerchat` div in `index.html` |
| Console error about `FB is not defined` | SDK failed to load | Disable ad blocker; check `connect.facebook.net` is reachable |
| Bubble overlaps back-to-top button | Custom CSS z-index conflict | Back-to-top is at bottom-LEFT (z-index 90); Messenger is bottom-RIGHT (z-index 9999+) — should not overlap |

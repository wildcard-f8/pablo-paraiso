# Deployment Guide — Booking System Backend

This guide walks you through setting up the Google Apps Script (GAS) backend that powers the Pablo Paraiso booking system. Following this guide enables **real calendar availability checking**, **double-booking prevention**, and **full activity logging**.

---

## Prerequisites

- A Google account (the page admin)
- Access to [script.google.com](https://script.google.com)
- A Google Sheet for data storage
- A Google Calendar for availability tracking

---

## Step 1: Create the Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a new spreadsheet.
2. **Rename it** to "Pablo Paraiso — Bookings".
3. **Create two tabs** (bottom-left):
   - **Bookings** — for confirmed reservations
   - **ActivityLog** — for all request/failures

   *Your Google Sheet will automatically populate the column headers on the first
   booking request. No manual setup is needed — the script creates them.*

4. **Copy the Sheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789/edit
                                        ^---------------------------^
                                            This is your SHEET_ID
   ```

---

## Step 2: Set Up the Google Calendar

1. Go to [calendar.google.com](https://calendar.google.com).
2. **Create a new calendar** called "Pablo Paraiso Bookings" (recommended — keeps
   booking events separate from personal events).
3. **Share the calendar** with your team (optional — Settings → Share with specific people).
4. **Copy the Calendar ID** from Settings → Settings → Access permissions:
   - Look for "Calendar ID" (usually your email, or the calendar's unique ID).
   - If you use a dedicated calendar, the ID looks like `c_1234567890@group.calendar.google.com`.
   - If you use your primary calendar, use `"primary"`.

---

## Step 3: Create the Google Apps Script Project

1. Go to [script.google.com](https://script.google.com) and click **New Project**.
2. **Delete** the default `Code.gs` content.
3. **Copy and paste** the contents of `code.gs` (located in this project folder) into the editor.
4. **Update the configuration constants** at the top of `code.gs`:

   ```javascript
   var SHEET_ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789";  // ← Your Sheet ID
   var CALENDAR_ID = "primary";  // ← Or your dedicated calendar ID
   ```

5. **Save** the project (Ctrl+S) and give it a name like "Pablo Paraiso Booking Backend".

---

## Step 4: Deploy as a Web App

1. In the Apps Script editor, click **Deploy** → **New deployment**.
2. Select **Web app** as the deployment type.
3. Configure the settings:
   - **Execute as**: "Me" (your Google account)
   - **Who has access**: "Anyone" (this allows website visitors to submit bookings)
4. Click **Deploy**.
5. **Authorize** the script when prompted — you will need to grant permission for:
   - Google Calendar (read events, create events)
   - Google Sheets (read/write data)
6. After deployment, you will receive a **Web app URL** that looks like:
   ```
   https://script.google.com/macros/s/AKfy8aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567/exec
   ```

---

## Step 5: Configure the Frontend

1. Copy the **Web app URL** from Step 4.
2. Open `index.html` in your project.
3. Replace the placeholder URL:

   ```javascript
   var GAS_ENDPOINT = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";
   ```

   With your actual URL:

   ```javascript
   var GAS_ENDPOINT = "https://script.google.com/macros/s/AKfy8aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567/exec";
   ```

4. Save the file.

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

### Calendar checks are slow (3+ seconds)
- Google Apps Script has a 6-minute execution limit, but individual API calls may take
  time. The script is optimized to check availability before creating events, which
  prevents race conditions.

---

## Files in This Project

```
Pablo Paraiso/
├── index.html              # Main website (static)
├── code.gs                 # Google Apps Script backend
├── DEPLOYMENT.md           # This guide
├── README.md               # Project documentation
├── .gitignore              # Prevents committing secrets
└── assets/
    └── img/                # All images (Unsplash + custom SVG)
```

---

## Security Notes

- The GAS web app URL is effectively public (anyone can POST to it). Input validation
  in `code.gs` prevents malformed data.
- The Google Sheet and Calendar are protected by your Google account's permissions.
- The `.gitignore` file prevents accidental commits of `.env`, `.pem`, `secrets.json`,
  etc.
|- The GAS endpoint URL should NOT be treated as a secret — it is loaded client-side
  in `index.html`.
|- The Facebook Page ID (`FB_PAGE_ID` in `index.html`) is PUBLIC information displayed
  on your Facebook Page — it is NOT a secret and safe to include in frontend code.
  No API keys, access tokens, or passwords are exposed.

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

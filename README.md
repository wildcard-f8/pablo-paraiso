# Pablo Paraiso — Lakeside Pool House Retreat

A luxury lakeside pool house booking website, perfect for pool parties, team building events, and sunset barbecues.

## Overview

Pablo Paraiso (Spanish for "Paul's Paradise") is a fictional luxury pool house retreat nestled along the scenic shores of Laguna de Bay, just 30 minutes from Manila. This website serves as a static demo booking site for the venue.

## Design

The website features a **summer lakeside barbecue aesthetic** with:

- **Color palette**: Lakeside blues, sunset oranges, and lush greens
- **Typography**: Playfair Display (serif headings) + Poppins (modern body)
- **Layout**: Airbnb-inspired rounded card-based design with horizontal scrolling gallery
- **Responsive**: Fully responsive across all devices with mobile navigation

### Color Tokens

| Variable | Value | Usage |
|---|---|---|
| `--water-blue` | `#0077BE` | Primary accent — lakeside water |
| `--sunset-orange` | `#FF6B35` | Secondary accent — barbecue sunset |
| `--lounge-green` | `#4CAF50` | Tertiary accent — lush greenery |
| `--sand-beige` | `#F4D6A3` | Warm accent — beach sand |

## Features

- **Hero section** with full-width pool background image and gradient overlay
- **Animated stats bar** highlighting capacity, ratings, and awards
- **About section** with split image/text layout
- **Amenities grid** with icon-based service cards
- **Horizontal-scrolling photo gallery** with image overlays
- **Pricing packages** with popular-tier highlighting
- **Testimonials** carousel with horizontal scroll
- **Interactive booking form** with validation and success/error messaging
- **Google Maps embed** with location details
- **Back-to-top button** with scroll detection
- **Sticky mobile navigation** with hamburger menu
- **Custom Messenger Chat Widget** — floating blue bubble at bottom-right that expands into an in-page chat window with welcome message, quick-reply buttons (Book a Retreat, View Packages), and a "Continue to Messenger" send button. Works on localhost immediately — no domain whitelisting required.
- **Facebook Customer Chat Plugin** — official `fb-customerchat` div with Page ID `561017820679235`, pre-configured for production. Requires domain whitelisting (Page → Settings → Messages → "Whitelisted websites") to activate on a live domain.

## Packages

| Package | Duration | Guests | Price |
|---|---|---|---|
| 6-Hour Package | 6 hours | Up to 30 | ₱4,000 |
| 10-Hour Package | 10 hours | Up to 30 | ₱6,000 |
| Custom Event | Flexible | Up to 30+ | Contact |

### Pricing Details
- **Security Deposit**: ₱3,000 (refundable after event)
- **Additional Hours**: ₱500/hr (beyond package duration)
- **Over 30 Guests**: ₱200/head (max 30 pax included)
- **Corkage Fee**: None

## Amenities
Pool (3ft–5ft), 1-room Villa (1 toilet & bath), 2 shower rooms, tables, grill, videoke, garden

## Assets

All images are sourced from [Unsplash](https://unsplash.com) — completely free for commercial use under the Unsplash license.

## Running Locally

```bash
# Navigate to the project directory
cd "/home/magicpotion/Projects/Pablo Paraiso"

# Start a local HTTP server
python3 -m http.server 8000

# Open in browser
http://localhost:8000
```

> **Note**: Images will not appear in file:// mode due to browser security restrictions. Use a local HTTP server.

## File Structure

```
Pablo Paraiso/
├── index.html          # Main website (single-page)
├── assets/
│   └── img/
│       ├── logo.svg              # Brand logo
│       ├── favicon.svg           # Browser favicon
│       ├── hero-pool.jpg         # Hero background (1920×1080)
│       ├── pool-party.jpg        # Pool party scene (800×600)
│       ├── barbecue.jpg          # Barbecue scene (800×600)
│       ├── team-building.jpg     # Team building scene (800×600)
│       ├── lounge.jpg            # Lounge area (800×600)
│       ├── sunset-lake.jpg       # Aerial lake sunset (1200×800)
│       ├── gallery-1.jpg         # Gallery image (600×400)
│       ├── gallery-2.jpg         # Gallery image (600×400)
│       ├── gallery-3.jpg         # Gallery image (600×400)
│       └── gallery-4.jpg         # Gallery image (600×400)
└── README.md
```

## Future Enhancements (V2)

- Dynamic content management
- Admin dashboard for availability management
- Payment integration
- Real venue photos (to replace placeholder images)
- Facebook Page ID `561017820679235` confirmed (extracted from public page source; page has no username)

## Booking Backend

The booking system includes a **Google Apps Script backend** (`code.gs`) that:
- Checks Google Calendar for date/time slot availability before confirming
- Prevents double-bookings by querying events in the requested time range
- Logs confirmed bookings to a Google Sheet (Bookings tab)
- Logs ALL activity to an ActivityLog sheet (attempts, successes, failures, errors)
- Returns real-time success or rejection messages to the frontend

**See `DEPLOYMENT.md` for step-by-step setup instructions.**

## Credits

- **Design**: Inspired by Airbnb's warm, photography-forward aesthetic
- **Images**: [Unsplash](https://unsplash.com) — free stock photography
- **Icons**: [Bootstrap Icons](https://icons.getbootstrap.com/)
- **Fonts**: [Google Fonts](https://fonts.google.com/) — Playfair Display, Poppins

/**
 * Pablo Paraiso — Booking System Backend (Google Apps Script)
 *
 * This script handles booking requests from the website:
 * 1. Logs ALL activity (every request: attempts, successes, failures)
 * 2. Checks Google Calendar for date/time slot availability
 * 3. If available: creates a Calendar event AND logs to Sheets
 * 4. If not available: rejects the booking, logs the failed attempt
 *
 * DEPLOYMENT:
 *   1. Create a Google Sheet with tabs: "Bookings" and "ActivityLog"
 *   2. Create a Google Calendar (or use your primary one)
 *   3. Paste this code into script.google.com
 *   4. Set SHEET_ID and CALENDAR_ID below
 *   5. Deploy → New Deployment → Web App → POST → "Anyone"
 *   6. Copy the web app URL and paste into index.html
 *
 * USAGE:
 *   POST https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec
 *   Content-Type: application/json
 *   Body: { name, email, phone, eventType, date, timeSlot, guests, package, budget, message }
 */

// ─── Configuration ───────────────────────────────────────────────

// Replace with your Google Sheet ID (from the URL: docs.google.com/spreadsheets/d/SHEET_ID/edit)
var SHEET_ID = "YOUR_SHEET_ID_HERE";

// Replace with your Google Calendar ID (from Settings → Calendars → Calendar ID)
// Use "primary" for your main calendar, or the ID of a dedicated booking calendar
var CALENDAR_ID = "primary";

// Package durations (in hours) — must match the packages on the website
var PACKAGE_DURATIONS = {
  "6-Hour Package": 6,
  "10-Hour Package": 10,
  "Custom Event": 6  // Default duration; coordinator will confirm exact hours
};

// Available time slots
var TIME_SLOTS = [
  { value: "09:00", label: "Morning (9:00 AM – 1:00 PM)" },
  { value: "13:00", label: "Afternoon (1:00 PM – 5:00 PM)" },
  { value: "14:00", label: "Afternoon (2:00 PM – 6:00 PM)" },
  { value: "17:00", label: "Evening (5:00 PM – 9:00 PM)" }
];

// ─── Sheets Column Definitions ──────────────────────────────────

// Bookings sheet columns
var BOOKING_COLUMNS = [
  "Timestamp", "Status", "Booking ID", "Name", "Email", "Phone",
  "Event Type", "Date", "Time Slot", "Guests", "Package",
  "Budget", "Duration (hrs)", "Calendar Event ID", "Special Requests"
];

// ActivityLog sheet columns
var LOG_COLUMNS = [
  "Timestamp", "Action", "Status", "Request Data (JSON)", "Details", "Client IP"
];

// ─── Main Entry Point ───────────────────────────────────────────

/**
 * Handles POST requests from the booking form.
 * Checks calendar availability, creates events, logs to sheets.
 */
function doPost(e) {
  var clientIP = e.parameter.ip || (e.headers && e.headers["X-Forwarded-For"]) || "unknown";

  try {
    // Parse the incoming JSON payload
    var data;
    if (typeof e.postData.contents === "string" && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else {
      data = e.parameter;
    }

    // ─── Activity Log: Request received ───
    logActivity("booking_request", "attempt", data, "Request received from website", clientIP);

    // ─── Input Validation ───
    var validation = validateInput(data);
    if (!validation.isValid) {
      logActivity("booking_request", "failed", data, "Validation error: " + validation.error, clientIP);
      return createJsonResponse(400, {
        success: false,
        message: validation.error
      });
    }

    var date = data.date;
    var timeSlot = data.timeSlot;
    var duration = PACKAGE_DURATIONS[data.package] || 3;

    // ─── Check Calendar Availability ───
    var availability = checkCalendarAvailability(date, timeSlot, duration);
    if (!availability.available) {
      // ─── Activity Log: Slot not available ───
      logActivity("availability_check", "failed", data,
        "Slot not available: " + availability.reason, clientIP);

      return createJsonResponse(409, {
        success: false,
        message: "That time slot is already booked. Please select a different date and/or time." +
          (availability.suggestion ? " Suggestion: " + availability.suggestion : "")
      });
    }

    // ─── Slot is available — create calendar event ───
    var eventResult = createCalendarEvent(data, date, timeSlot, duration);
    if (!eventResult.success) {
      logActivity("calendar_create", "error", data, eventResult.error, clientIP);
      return createJsonResponse(500, {
        success: false,
        message: "A system error occurred while creating your booking. Please try again or contact us directly."
      });
    }

    // ─── Log booking in Sheets ───
    var bookingId = "BK-" + new Date().getTime();
    var logResult = logBooking(data, bookingId, duration, eventResult.eventId);
    if (!logResult.success) {
      logActivity("sheet_log", "error", data, logResult.error, clientIP);
      // Non-fatal: booking was created in calendar but not in sheet
    }

    // ─── Activity Log: Booking successful ───
    logActivity("booking_request", "success", data,
      "Booking confirmed. Booking ID: " + bookingId + ", Calendar Event ID: " + eventResult.eventId, clientIP);

    return createJsonResponse(200, {
      success: true,
      message: "Your booking has been confirmed! We will contact you within 2 hours to finalize the details.",
      bookingId: bookingId
    });

  } catch (error) {
    // ─── Activity Log: System error ───
    logActivity("booking_request", "error", data || null,
      "Unhandled error: " + error.toString(), clientIP);

    return createJsonResponse(500, {
      success: false,
      message: "An unexpected error occurred. Please try again or contact us at hello@pabloparaiso.ph."
    });
  }
}

/**
 * Handles GET requests — returns a simple status check for monitoring.
 */
function doGet(e) {
  return createJsonResponse(200, {
    status: "ok",
    service: "Pablo Paraiso Booking System",
    timestamp: new Date().toISOString()
  });
}

// ─── Validation ─────────────────────────────────────────────────

/**
 * Validates required booking fields.
 * Returns { isValid: true } or { isValid: false, error: "reason" }
 */
function validateInput(data) {
  if (!data || typeof data !== "object") {
    return { isValid: false, error: "No data received." };
  }

  var required = ["name", "email", "phone", "date", "timeSlot", "guests", "package"];
  for (var i = 0; i < required.length; i++) {
    var field = required[i];
    if (!data[field] || data[field].toString().trim() === "") {
      return { isValid: false, error: "Please fill in all required fields (marked with *)." };
    }
  }

  // Validate email format
  var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    return { isValid: false, error: "Please enter a valid email address." };
  }

  // Validate date is in the future
  var inputDate = new Date(data.date);
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  if (inputDate < today) {
    return { isValid: false, error: "The selected date must be today or in the future." };
  }

  // Validate guests count
  var guests = parseInt(data.guests);
  if (guests < 1 || guests > 30) {
    return { isValid: false, error: "Number of guests must be between 1 and 30." };
  }

  // Validate time slot
  var validSlots = TIME_SLOTS.map(function(s) { return s.value; });
  if (validSlots.indexOf(data.timeSlot) === -1) {
    return { isValid: false, error: "Please select a valid time slot." };
  }

  // Validate package
  if (!PACKAGE_DURATIONS[data.package]) {
    return { isValid: false, error: "Please select a valid package." };
  }

  return { isValid: true };
}

// ─── Calendar ───────────────────────────────────────────────────

/**
 * Checks if the requested date and time slot is available in the calendar.
 * Returns { available: true } or { available: false, reason: "...", suggestion: "..." }
 */
function checkCalendarAvailability(dateStr, timeSlot, durationHours) {
  try {
    var calendar = CalendarApp.getCalendarById(CALENDAR_ID);
    if (!calendar) {
      return { available: false, reason: "Calendar not configured." };
    }

    var startDate = new Date(dateStr);
    var timeParts = timeSlot.split(":");
    startDate.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]), 0, 0);

    var endDate = new Date(startDate.getTime() + durationHours * 60 * 60 * 1000);

    // Check for overlapping events
    var events = calendar.getEvents(startDate, endDate);

    // Filter out all-day events (which show up for any date range)
    var realConflicts = events.filter(function(event) {
      return !(event.getAllDay() && event.isAllDayEvent());
    });

    if (realConflicts.length > 0) {
      // Try to suggest an alternative
      var suggestion = findAvailableSlot(dateStr, durationHours);
      return {
        available: false,
        reason: realConflicts.length + " event(s) already booked for this time",
        suggestion: suggestion
      };
    }

    return { available: true };
  } catch (error) {
    return { available: false, reason: "Error checking calendar: " + error.toString() };
  }
}

/**
 * Searches for the next available date/time slot after the requested one.
 */
function findAvailableSlot(dateStr, durationHours) {
  try {
    var calendar = CalendarApp.getCalendarById(CALENDAR_ID);
    var baseDate = new Date(dateStr);

    // Try the next 7 days
    for (var d = 0; d < 7; d++) {
      var checkDate = new Date(baseDate);
      checkDate.setDate(baseDate.getDate() + d);

      for (var s = 0; s < TIME_SLOTS.length; s++) {
        var startDate = new Date(checkDate);
        var timeParts = TIME_SLOTS[s].value.split(":");
        startDate.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]), 0, 0);
        var endDate = new Date(startDate.getTime() + durationHours * 60 * 60 * 1000);

        var events = calendar.getEvents(startDate, endDate);
        var conflicts = events.filter(function(e) { return !e.isAllDayEvent(); });

        if (conflicts.length === 0) {
          var options = TIME_SLOTS[s].label.split("(")[1].replace(")", "");
          var dateStr = checkDate.toLocaleDateString("en-US", {
            weekday: "short", month: "short", day: "numeric"
          });
          return dateStr + " at " + options;
        }
      }
    }
    return "No alternative slots found in the next 7 days.";
  } catch (error) {
    return null;
  }
}

/**
 * Creates a calendar event for the booking.
 */
function createCalendarEvent(data, dateStr, timeSlot, durationHours) {
  try {
    var calendar = CalendarApp.getCalendarById(CALENDAR_ID);
    if (!calendar) {
      return { success: false, error: "Calendar not configured." };
    }

    var startDate = new Date(dateStr);
    var timeParts = timeSlot.split(":");
    startDate.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]), 0, 0);

    var endDate = new Date(startDate.getTime() + durationHours * 60 * 60 * 1000);

    var title = data.package + " — " + data.name + " (" + data.guests + " guests)";
    var description =
      "Booking Details:\n" +
      "Name: " + data.name + "\n" +
      "Email: " + data.email + "\n" +
      "Phone: " + data.phone + "\n" +
      "Event Type: " + data.eventType + "\n" +
      "Package: " + data.package + "\n" +
      "Guests: " + data.guests + "\n" +
      (data.budget ? "Budget: " + data.budget + "\n" : "") +
      (data.message ? "Special Requests: " + data.message + "\n" : "") +
      "\nSource: Pablo Paraiso website booking form";

    var event = calendar.createEvent(title, startDate, endDate, {
      description: description,
      guests: data.email
    });

    return { success: true, eventId: event.getId() };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ─── Sheets ─────────────────────────────────────────────────────

/**
 * Logs a booking to the Google Sheet.
 */
function logBooking(data, bookingId, duration, calendarEventId) {
  try {
    var sheet = SpreadsheetApp.openById(SHEET_ID);
    var bookingsSheet = sheet.getSheetByName("Bookings");

    if (!bookingsSheet) {
      // Create the sheet with headers if it doesn't exist
      var newSheet = sheet.insertSheet("Bookings");
      newSheet.appendRow(BOOKING_COLUMNS);
      bookingsSheet = newSheet;
    }

    var rowData = [
      new Date(),
      "CONFIRMED",
      bookingId,
      data.name,
      data.email,
      data.phone,
      data.eventType,
      data.date,
      data.timeSlot,
      data.guests,
      data.package,
      data.budget || "Not specified",
      duration,
      calendarEventId,
      data.message || ""
    ];

    bookingsSheet.appendRow(rowData);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Logs all activity to the ActivityLog sheet for auditing.
 * This captures every request: attempts, successes, failures, and errors.
 */
function logActivity(action, status, data, details, clientIP) {
  try {
    var sheet = SpreadsheetApp.openById(SHEET_ID);
    var logSheet = sheet.getSheetByName("ActivityLog");

    if (!logSheet) {
      var newSheet = sheet.insertSheet("ActivityLog");
      newSheet.appendRow(LOG_COLUMNS);
      newSheet.setFrozenRows(1);
      logSheet = newSheet;
    }

    var rowData = [
      new Date(),
      action,
      status,
      data ? JSON.stringify(data) : "null",
      details,
      clientIP || "unknown"
    ];

    logSheet.appendRow(rowData);

    // Also log to console for debugging (visible in Apps Script logs)
    console.log("[" + status.toUpperCase() + "] " + action + " — " + details);
  } catch (error) {
    // If sheet logging fails, log to console as fallback
    console.log("LOGGING ERROR: " + error.toString());
    console.log("[" + status.toUpperCase() + "] " + action + " — " + details);
  }
}

// ─── Response Helper ────────────────────────────────────────────

/**
 * Creates a standard JSON response for the web app.
 */
function createJsonResponse(statusCode, body) {
  var headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  var output = ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);

  // Set CORS headers
  for (var key in headers) {
    output.setHeader(key, headers[key]);
  }

  return output;
}

// ─── Utility ────────────────────────────────────────────────────

/**
 * Returns the list of available time slots (can be called from frontend
 * via google.script.run if needed, or used for reference).
 */
function getTimeSlots() {
  return TIME_SLOTS.map(function(s) { return s.label; });
}

/**
 * Health check function — useful for monitoring.
 */
function healthCheck() {
  return {
    status: "ok",
    sheetId: SHEET_ID,
    calendarId: CALENDAR_ID,
    timeSlots: TIME_SLOTS.length,
    packages: Object.keys(PACKAGE_DURATIONS),
    timestamp: new Date().toISOString()
  };
}

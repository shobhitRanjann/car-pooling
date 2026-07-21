# Frontend Requirements: Office Carpooling App (React)

## 1. Architecture & Tech Stack
*   **Framework:** React.js (Single Page Application).
*   **Styling:** Tailwind CSS (Focus on clean, minimalist, corporate UI).
*   **HTTP Client:** Axios or Fetch API (Configured to pass JWT `Authorization: Bearer <token>` in headers).
*   **State Management:** React Context API (for global Auth/User state).

## 2. Core UI Philosophy
*   **Target Audience:** Busy corporate professionals. 
*   **UX Rule:** Zero friction. No long forms. Rely on copy-pasting Google Maps URLs and simple taps (toggles/counters).

## 3. Application Views & Routes

### A. Authentication Flow (`/login`, `/signup`)
*   **Signup Form:** Fields for Email (must be `@watermark.com`), Password, First Name, Last Name, and **Mobile Number**.
*   **Login Form:** Email and Password. Stores the returned JWT token securely (localStorage or HttpOnly cookie) and redirects to the Dashboard.

### B. Driver Dashboard: "Offer a Ride" (`/offer-ride`)
A minimalist, one-page form with exactly 5 interactive elements:
1.  **Start Location:** Text input (Placeholder: "Paste Google Maps URL").
2.  **End Location:** Text input (Placeholder: "Paste Google Maps URL").
3.  **Departure Time:** HTML5 Time Picker (e.g., `<input type="time">`).
4.  **Available Seats:** A numeric counter UI (`[-] 3 [+]`) defaulting to 3.
5.  **Status Toggle:** A modern UI switch (Active / Inactive).
*   **Action:** Clicking "Publish" sends the payload to `POST /api/rides/offer` and redirects to the Live Board.

### C. Passenger Dashboard: "Live Board" (`/board`)
A feed of active rides, automatically fetched from `GET /api/rides/active`.
*   **Card Layout:** Each ride is displayed as a clean card containing:
    *   **Driver Info:** Name and Mobile Number (pulled from the nested driver object).
    *   **Time & Seats:** Departure time and remaining seats.
    *   **Location Links:** Two clickable anchor tags styling as buttons or clean text ("📍 View Start Location", "🏁 View Destination") that open the Google Maps URLs in a new tab.
*   **Action:** A "Request to Join" button. When clicked, it hits `POST /api/rides/join/{offerId}`.

### D. My Rides / Status View (Optional but recommended)
*   A small section where drivers can see who requested to join their ride and tap "Accept" or "Reject" (hitting `PUT /api/rides/request/{requestId}/status`).

## 4. API Integration Mapping
*   `POST /api/auth/login` -> Auth Context -> Token Storage.
*   `POST /api/rides/offer` -> Triggered by Driver Dashboard form submission.
*   `GET /api/rides/active` -> Populates the Passenger Live Board on component mount.

## 5. Security & Error Handling
*   If a user tries to sign up without being on the backend whitelist, display the 400 Bad Request error cleanly: *"Email not authorized. Contact Admin."*
*   If the JWT expires, automatically log the user out and redirect to `/login`.
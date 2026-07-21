# Backend Requirements Specification: Office Carpooling API

## 1. System Overview
This is a robust, API-first backend designed to serve both web and mobile frontends for an internal corporate carpooling ("piggyback") application. The architecture is stateless, relying on JWT (JSON Web Tokens) for authentication, and is strictly locked down to authorized company employees.

### 1.1 Tech Stack
*   **Framework:** Java 17+ with Spring Boot 3.x
*   **Database:** PostgreSQL (with Spring Data JPA / Hibernate)
*   **Security:** Spring Security & JWT (io.jsonwebtoken)
*   **Build Tool:** Maven

---

## 2. Authentication & Authorization Model
The system uses a highly restrictive **Pre-Approved Email Whitelist** model to ensure only verified employees can access the platform.

### 2.1 Roles
*   **ROLE_SUPER_USER:** The system administrator. Has the authority to add emails to the whitelist. Cannot be registered via the API; must be seeded directly into the database.
*   **ROLE_USER:** Standard employee. Can offer rides and request rides.

### 2.2 Security Rules
*   **Domain Restriction:** All registering emails must end exactly in `@watermark.com`.
*   **Whitelist Requirement:** An email cannot be registered unless it already exists in the `user_whitelist` table.
*   **Hard Limit:** The system enforces a strict maximum of 50 whitelisted users.
*   **Stateless Auth:** All protected endpoints require a valid JWT passed in the `Authorization: Bearer <token>` header.

---

## 3. Database Schema (Core Entities)

### 3.1 `user_whitelist`
Tracks the emails authorized by the Super User.
*   `id` (Primary Key, Serial)
*   `email` (String, Unique, Not Null)
*   `is_registered` (Boolean, Default: false)
*   `created_at` (Timestamp)

### 3.2 `app_user`
Stores registered user accounts.
*   `id` (Primary Key, Serial)
*   `email` (String, Unique, Not Null)
*   `password_hash` (String, Not Null - BCrypt)
*   `first_name` (String)
*   `last_name` (String)
*   `role` (String, Default: 'ROLE_USER')
*   `created_at` (Timestamp)

### 3.3 `ride_offer`
Created when a driver publishes a ride leaving the office.
*   `id` (Primary Key, Serial)
*   `driver_id` (Foreign Key -> app_user.id)
*   `destination_pin_code` (String)
*   `route_description` (Text)
*   `departure_time` (Timestamp)
*   `available_seats` (Integer)
*   `status` (String: ACTIVE, COMPLETED, CANCELLED)

### 3.4 `ride_request`
Created when a user asks to join an active ride offer.
*   `id` (Primary Key, Serial)
*   `ride_offer_id` (Foreign Key -> ride_offer.id)
*   `passenger_id` (Foreign Key -> app_user.id)
*   `pickup_point` (String)
*   `status` (String: PENDING, ACCEPTED, REJECTED)

---

## 4. API Endpoints

### 4.1 Authentication APIs (Public)
*   **POST** `/api/auth/login`
    *   **Payload:** `{ "email": "...", "password": "..." }`
    *   **Action:** Validates credentials against BCrypt hash.
    *   **Response:** JWT token and user role.
*   **POST** `/api/auth/signup`
    *   **Payload:** `{ "email": "...", "password": "...", "firstName": "...", "lastName": "..." }`
    *   **Action:** Validates email domain (@watermark.com), checks if email exists in `user_whitelist`, and ensures `is_registered` is false. Hashes password and creates `app_user`. Updates whitelist `is_registered` to true.
    *   **Response:** Success/Failure message.

### 4.2 Admin APIs (Protected: ROLE_SUPER_USER only)
*   **POST** `/api/admin/whitelist`
    *   **Parameters:** `?email=employee@watermark.com`
    *   **Action:** Checks current whitelist count. If < 50, adds email to `user_whitelist`.
    *   **Response:** Success message or "Limit Reached" error.

### 4.3 Ride Engine APIs (Protected: ROLE_USER & ROLE_SUPER_USER)
*   **POST** `/api/rides/offer`
    *   **Payload:** `{ "destinationPinCode": "...", "routeDescription": "...", "departureTime": "...", "availableSeats": 3 }`
    *   **Action:** Creates a new `ride_offer` tied to the authenticated user.
*   **GET** `/api/rides/active`
    *   **Action:** Fetches all `ride_offer` records where status is 'ACTIVE'.
*   **POST** `/api/rides/join/{offerId}`
    *   **Payload:** `{ "pickupPoint": "..." }`
    *   **Action:** Checks if `available_seats` > 0. Creates a `ride_request` with status 'PENDING'.
*   **PUT** `/api/rides/request/{requestId}/status`
    *   **Parameters:** `?status=ACCEPTED` (or REJECTED)
    *   **Action:** Updates request status. If ACCEPTED, decrements `available_seats` by 1 on the parent `ride_offer`. If seats hit 0, (optional) auto-updates offer status to FULL/COMPLETED.

---

## 5. Core Business Logic & Validation Rules

1.  **Case Insensitivity:** All email inputs (during whitelist addition, signup, and login) must be trimmed and converted to lowercase before database operations.
2.  **Concurrency Protection:** When accepting a ride request, the system must verify `available_seats` is strictly greater than 0 *at the exact moment of execution* to prevent double-booking.
3.  **CORS Configuration:** Cross-Origin Resource Sharing must be configured to allow HTTP methods (GET, POST, PUT, DELETE, OPTIONS) from the frontend origin (e.g., `http://localhost:3000` or production domain) while passing the Authorization headers.
4.  **Error Handling:** Meaningful HTTP status codes must be returned:
    *   `200 OK` for success.
    *   `400 Bad Request` for validation failures (e.g., wrong domain, whitelist limit reached, no seats left).
    *   `401 Unauthorized` for missing/invalid JWTs.
    *   `403 Forbidden` for users attempting to hit Admin endpoints without the SUPER_USER role.
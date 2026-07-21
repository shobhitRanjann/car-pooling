# Backend Code Refactor: Maps URLs & Contact Info Pivot

## Context & Objective
Update the existing Spring Boot backend codebase for the Office Carpooling App. We are dropping "Pin Codes" and "Route Descriptions" in favor of direct Google Maps URLs. We are also adding a mobile number to the user profile so coworkers can call each other directly, eliminating the need for vehicle details.

Please apply the following schema and DTO changes to the existing code.

## 1. Database Model Updates

### A. Update `AppUser.java`
*   **Add Field:** `private String mobileNumber;`
*   Generate the corresponding getter and setter.

### B. Update `RideOffer.java`
*   **Remove Fields:** `destinationPinCode` and `routeDescription`.
*   **Add Field:** `private String startLocationUrl;` (Stores the Google Maps link for the current/office location).
*   **Add Field:** `private String endLocationUrl;` (Stores the Google Maps link for the destination).

## 2. DTO (Data Transfer Object) Updates

### A. Update `AuthDTOs.java` -> `SignupRequest`
*   **Add Field:** `@NotBlank private String mobileNumber;`
*   Generate the corresponding getter and setter.
*   Update the `AuthController.java` to map `signUpRequest.getMobileNumber()` to the `AppUser` entity during registration.

### B. Update `RideDTOs.java` -> `RideOfferRequest`
*   **Remove Fields:** `destinationPinCode` and `routeDescription`.
*   **Add Fields:** 
    *   `private String startLocationUrl;`
    *   `private String endLocationUrl;`
    *   `private boolean isActive;` (Maps to the UI toggle. If true, status is "ACTIVE", else "INACTIVE").
*   Generate corresponding getters and setters.
*   Update `RideController.java` to map these new URL fields when saving a new `RideOffer`. 

## 3. API Response Adjustments
*   Ensure that when `GET /api/rides/active` is called, the serialized `RideOffer` JSON payload automatically includes the driver's `firstName`, `lastName`, and `mobileNumber` (via the nested `AppUser` driver object) so the frontend can display contact info on the Live Board.
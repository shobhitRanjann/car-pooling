package com.piggyback.controller;

import com.piggyback.dto.ApiResponse;
import com.piggyback.dto.JoinRideRequest;
import com.piggyback.dto.RideOfferRequest;
import com.piggyback.dto.RideOfferUpdateRequest;
import com.piggyback.entity.RideOffer;
import com.piggyback.entity.RideRequest;
import com.piggyback.service.RideService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rides")
@RequiredArgsConstructor
public class RideController {

    private final RideService rideService;

    /**
     * POST /api/rides/offer
     * Creates a new ride offer. The authenticated user becomes the driver.
     */
    @PostMapping("/offer")
    public ResponseEntity<ApiResponse<RideOffer>> createOffer(
            @Valid @RequestBody RideOfferRequest request,
            @AuthenticationPrincipal String driverEmail) {
        RideOffer offer = rideService.createOffer(request, driverEmail);
        return ResponseEntity.ok(ApiResponse.ok("Ride offer created successfully.", offer));
    }

    /**
     * PUT /api/rides/offer/{offerId}
     * Edits an existing ride offer. Only the driver who created it can edit.
     */
    @PutMapping("/offer/{offerId}")
    public ResponseEntity<ApiResponse<RideOffer>> updateOffer(
            @PathVariable Long offerId,
            @Valid @RequestBody RideOfferUpdateRequest request,
            @AuthenticationPrincipal String driverEmail) {
        RideOffer offer = rideService.updateOffer(offerId, request, driverEmail);
        return ResponseEntity.ok(ApiResponse.ok("Ride offer updated successfully.", offer));
    }

    /**
     * PUT /api/rides/offer/{offerId}/toggle
     * Toggles offer status between ACTIVE and INACTIVE. Driver only.
     */
    @PutMapping("/offer/{offerId}/toggle")
    public ResponseEntity<ApiResponse<RideOffer>> toggleOfferStatus(
            @PathVariable Long offerId,
            @AuthenticationPrincipal String driverEmail) {
        RideOffer offer = rideService.toggleOfferStatus(offerId, driverEmail);
        return ResponseEntity.ok(ApiResponse.ok("Ride status toggled to " + offer.getStatus() + ".", offer));
    }

    /**
     * DELETE /api/rides/offer/{offerId}
     * Soft deletes a ride offer. Driver only.
     */
    @DeleteMapping("/offer/{offerId}")
    public ResponseEntity<ApiResponse<Void>> deleteOffer(
            @PathVariable Long offerId,
            @AuthenticationPrincipal String driverEmail) {
        rideService.deleteOffer(offerId, driverEmail);
        return ResponseEntity.ok(ApiResponse.ok("Ride offer deleted successfully.", null));
    }

    /**
     * GET /api/rides/active
     * Returns all non-deleted ACTIVE ride offers.
     */
    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<RideOffer>>> getActiveRides(
            @AuthenticationPrincipal String userEmail) {
        List<RideOffer> rides = rideService.getActiveRides(userEmail);
        return ResponseEntity.ok(ApiResponse.ok("Active rides fetched successfully.", rides));
    }

    /**
     * GET /api/rides/my-offers
     * Returns all non-deleted offers created by the authenticated driver (all statuses).
     */
    @GetMapping("/my-offers")
    public ResponseEntity<ApiResponse<List<RideOffer>>> getMyOffers(
            @AuthenticationPrincipal String driverEmail) {
        List<RideOffer> offers = rideService.getMyOffers(driverEmail);
        return ResponseEntity.ok(ApiResponse.ok("Your offers fetched successfully.", offers));
    }

    /**
     * GET /api/rides/offer/{offerId}/requests
     * Returns all requests for a specific ride offer. Driver only.
     */
    @GetMapping("/offer/{offerId}/requests")
    public ResponseEntity<ApiResponse<List<RideRequest>>> getRequestsForOffer(
            @PathVariable Long offerId,
            @AuthenticationPrincipal String driverEmail) {
        List<RideRequest> requests = rideService.getRequestsForOffer(offerId, driverEmail);
        return ResponseEntity.ok(ApiResponse.ok("Requests fetched successfully.", requests));
    }

    /**
     * POST /api/rides/join/{offerId}
     * Creates a PENDING ride request for the authenticated passenger.
     */
    @PostMapping("/join/{offerId}")
    public ResponseEntity<ApiResponse<RideRequest>> joinRide(
            @PathVariable Long offerId,
            @Valid @RequestBody JoinRideRequest request,
            @AuthenticationPrincipal String passengerEmail) {
        RideRequest rideRequest = rideService.joinRide(offerId, request, passengerEmail);
        return ResponseEntity.ok(ApiResponse.ok("Ride request submitted successfully.", rideRequest));
    }

    /**
     * PUT /api/rides/request/{requestId}/status?status=ACCEPTED
     * Updates the status of a ride request.
     */
    @PutMapping("/request/{requestId}/status")
    public ResponseEntity<ApiResponse<RideRequest>> updateRequestStatus(
            @PathVariable Long requestId,
            @RequestParam String status,
            @AuthenticationPrincipal String driverEmail) {
        RideRequest updated = rideService.updateRequestStatus(requestId, status, driverEmail);
        return ResponseEntity.ok(ApiResponse.ok("Request status updated to " + updated.getStatus() + ".", updated));
    }
}


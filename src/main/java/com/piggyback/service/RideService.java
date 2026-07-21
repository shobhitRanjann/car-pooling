package com.piggyback.service;

import com.piggyback.dto.JoinRideRequest;
import com.piggyback.dto.RideOfferRequest;
import com.piggyback.dto.RideOfferUpdateRequest;
import com.piggyback.entity.AppUser;
import com.piggyback.entity.RideOffer;
import com.piggyback.entity.RideRequest;
import com.piggyback.exception.AppException;
import com.piggyback.repository.AppUserRepository;
import com.piggyback.repository.RideOfferRepository;
import com.piggyback.repository.RideRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RideService {

    private final RideOfferRepository rideOfferRepository;
    private final RideRequestRepository rideRequestRepository;
    private final AppUserRepository appUserRepository;
    private final SseService sseService;

    // ----------------------------------------------------------------
    // Ride Offers
    // ----------------------------------------------------------------

    /**
     * Creates a new ride offer for the authenticated driver.
     */
    @Transactional
    public RideOffer createOffer(RideOfferRequest request, String driverEmail) {
        AppUser driver = getActiveUser(driverEmail);

        // Limit: Max 5 offers per user
        if (rideOfferRepository.countByDriver_EmailAndIsDeletedFalse(driverEmail) >= 5) {
            throw new AppException("You can only have up to 5 ride offers at a time.", HttpStatus.BAD_REQUEST);
        }

        // Limit: Only 1 active offer per user
        boolean isActive = request.getIsActive() != null ? request.getIsActive() : true;
        if (isActive && rideOfferRepository.existsByDriver_EmailAndStatusAndIsDeletedFalse(driverEmail, RideOffer.Status.ACTIVE)) {
            throw new AppException("ACTIVE_LIMIT_EXCEEDED", HttpStatus.CONFLICT);
        }

        // Map the UI toggle: true → ACTIVE, false → INACTIVE
        RideOffer.Status initialStatus = isActive ? RideOffer.Status.ACTIVE : RideOffer.Status.INACTIVE;

        RideOffer offer = RideOffer.builder()
                .driver(driver)
                .startLocationUrl(request.getStartLocationUrl().trim())
                .endLocationUrl(request.getEndLocationUrl().trim())
                .departureTime(request.getDepartureTime())
                .availableSeats(request.getAvailableSeats())
                .status(initialStatus)
                .isDeleted(false)
                .build();

        RideOffer savedOffer = rideOfferRepository.save(offer);

        // Broadcast SSE
        String domain = driverEmail.substring(driverEmail.lastIndexOf('@') + 1);
        sseService.broadcastToDomain(domain, "NEW_RIDE", "A new ride was just posted by " + driver.getFirstName() + "!", driverEmail);

        return savedOffer;
    }

    /**
     * Returns all non-deleted ACTIVE ride offers (shown on the Live Board).
     * Populates the transient currentUserRequestStatus field if the user has requested the ride.
     */
    @Transactional(readOnly = true)
    public List<RideOffer> getActiveRides(String passengerEmail) {
        List<RideOffer> activeOffers = rideOfferRepository.findByStatusInAndIsDeletedFalse(List.of(RideOffer.Status.ACTIVE, RideOffer.Status.FULL));
        
        // Check if the current user has requested any of these rides
        for (RideOffer offer : activeOffers) {
            rideRequestRepository.findByRideOffer_IdAndPassenger_EmailAndIsDeletedFalse(offer.getId(), passengerEmail)
                    .ifPresent(req -> offer.setCurrentUserRequestStatus(req.getStatus().name()));
        }
        return activeOffers;
    }

    // ----------------------------------------------------------------
    // Ride Requests
    // ----------------------------------------------------------------

    /**
     * Creates a PENDING ride request for the passenger on a given offer.
     * Validation:
     *  - Offer must exist, be non-deleted, and ACTIVE
     *  - Offer must have available_seats > 0
     *  - Driver cannot join their own ride
     *  - Passenger must not have an existing PENDING or ACCEPTED request for the same offer
     */
    @Transactional
    public RideRequest joinRide(Long offerId, JoinRideRequest request, String passengerEmail) {
        AppUser passenger = getActiveUser(passengerEmail);

        // Fetch the offer (non-deleted)
        RideOffer offer = rideOfferRepository.findByIdAndIsDeletedFalse(offerId)
                .orElseThrow(() -> new AppException(
                        "Ride offer not found.", HttpStatus.BAD_REQUEST));

        // Must be ACTIVE
        if (offer.getStatus() != RideOffer.Status.ACTIVE) {
            throw new AppException(
                    "This ride offer is not accepting new passengers (status: "
                            + offer.getStatus() + ").",
                    HttpStatus.BAD_REQUEST);
        }

        // Must have seats available
        if (offer.getAvailableSeats() <= 0) {
            throw new AppException(
                    "No seats available on this ride.", HttpStatus.BAD_REQUEST);
        }

        // Driver cannot join their own ride
        if (offer.getDriver().getId().equals(passenger.getId())) {
            throw new AppException(
                    "You cannot join your own ride offer.", HttpStatus.BAD_REQUEST);
        }

        // Prevent duplicate requests
        boolean alreadyRequested = rideRequestRepository
                .existsByRideOffer_IdAndPassenger_IdAndIsDeletedFalseAndStatusIn(
                        offerId,
                        passenger.getId(),
                        List.of(RideRequest.Status.PENDING, RideRequest.Status.ACCEPTED, RideRequest.Status.REJECTED)
                );
        if (alreadyRequested) {
            throw new AppException(
                    "You already have an active request for this ride.", HttpStatus.BAD_REQUEST);
        }

        RideRequest rideRequest = RideRequest.builder()
                .rideOffer(offer)
                .passenger(passenger)
                .pickupPoint(request.getPickupPoint().trim())
                .status(RideRequest.Status.PENDING)
                .isDeleted(false)
                .build();

        RideRequest savedRequest = rideRequestRepository.save(rideRequest);

        // Send SSE to driver
        sseService.sendToUser(offer.getDriver().getEmail(), "RIDE_REQUEST", passenger.getFirstName() + " requested to join your ride!");

        return savedRequest;
    }

    /**
     * Updates the status of a ride request (ACCEPTED or REJECTED).
     * If ACCEPTED:
     *  - Acquires a pessimistic write lock on the ride offer
     *  - Re-verifies seats > 0 (concurrency protection)
     *  - Decrements available_seats by 1
     *  - If seats hit 0, auto-updates offer status to FULL
     */
    @Transactional
    public RideRequest updateRequestStatus(Long requestId, String newStatus, String driverEmail) {
        RideRequest.Status targetStatus;
        try {
            targetStatus = RideRequest.Status.valueOf(newStatus.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new AppException(
                    "Invalid status value. Allowed: PENDING, ACCEPTED, REJECTED.",
                    HttpStatus.BAD_REQUEST);
        }

        RideRequest rideRequest = rideRequestRepository.findByIdAndIsDeletedFalse(requestId)
                .orElseThrow(() -> new AppException("Ride request not found.", HttpStatus.BAD_REQUEST));

        if (!rideRequest.getRideOffer().getDriver().getEmail().equals(driverEmail)) {
            throw new AppException("Only the ride creator can manage requests.", HttpStatus.FORBIDDEN);
        }

        if (rideRequest.getStatus() == targetStatus) {
            return rideRequest; // No change needed
        }

        RideOffer offer = rideOfferRepository
                .findByIdAndIsDeletedFalseWithLock(rideRequest.getRideOffer().getId())
                .orElseThrow(() -> new AppException("Ride offer no longer available.", HttpStatus.BAD_REQUEST));

        // If we are moving TO ACCEPTED
        if (targetStatus == RideRequest.Status.ACCEPTED) {
            if (offer.getAvailableSeats() <= 0) {
                throw new AppException("No seats available.", HttpStatus.BAD_REQUEST);
            }
            offer.setAvailableSeats(offer.getAvailableSeats() - 1);
            if (offer.getAvailableSeats() == 0) {
                offer.setStatus(RideOffer.Status.FULL);
            }
        } 
        // If we are moving AWAY FROM ACCEPTED (undoing)
        else if (rideRequest.getStatus() == RideRequest.Status.ACCEPTED) {
            offer.setAvailableSeats(offer.getAvailableSeats() + 1);
            if (offer.getStatus() == RideOffer.Status.FULL && offer.getAvailableSeats() > 0) {
                offer.setStatus(RideOffer.Status.ACTIVE);
            }
        }

        rideOfferRepository.save(offer);
        rideRequest.setStatus(targetStatus);
        
        RideRequest savedReq = rideRequestRepository.save(rideRequest);

        // Send SSE notification to the passenger
        String driverName = offer.getDriver().getFirstName();
        String statusText;
        if (targetStatus == RideRequest.Status.ACCEPTED) statusText = "confirmed ✅";
        else if (targetStatus == RideRequest.Status.REJECTED) statusText = "declined ❌";
        else statusText = "moved back to pending ⏳";

        String message = "Your request to join " + driverName + "'s ride was " + statusText;
        sseService.sendToUser(rideRequest.getPassenger().getEmail(), "REQUEST_UPDATE", message);
        
        return savedReq;
    }

    // ----------------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------------

    /** Load a non-deleted user by email or throw 400. */
    private AppUser getActiveUser(String email) {
        return appUserRepository.findByEmailAndIsDeletedFalse(email)
                .orElseThrow(() -> new AppException(
                        "User account not found or deactivated.", HttpStatus.BAD_REQUEST));
    }

    // ----------------------------------------------------------------
    // Offer editing & status management
    // ----------------------------------------------------------------

    /**
     * Updates a ride offer. Only the driver who created the offer can edit it.
     * All fields except startLocationUrl and endLocationUrl are optional (null = keep current value).
     */
    @Transactional
    public RideOffer updateOffer(Long offerId, RideOfferUpdateRequest request, String driverEmail) {
        RideOffer offer = rideOfferRepository.findByIdAndIsDeletedFalse(offerId)
                .orElseThrow(() -> new AppException("Ride offer not found.", HttpStatus.BAD_REQUEST));

        if (!offer.getDriver().getEmail().equals(driverEmail)) {
            throw new AppException("You can only edit your own ride offers.", HttpStatus.FORBIDDEN);
        }

        offer.setStartLocationUrl(request.getStartLocationUrl().trim());
        offer.setEndLocationUrl(request.getEndLocationUrl().trim());

        if (request.getDepartureTime() != null) {
            offer.setDepartureTime(request.getDepartureTime());
        }
        if (request.getAvailableSeats() != null) {
            offer.setAvailableSeats(request.getAvailableSeats());
        }
        if (request.getIsActive() != null) {
            boolean wantActive = request.getIsActive();
            if (wantActive && offer.getStatus() != RideOffer.Status.ACTIVE) {
                if (rideOfferRepository.existsByDriver_EmailAndStatusAndIdNotAndIsDeletedFalse(driverEmail, RideOffer.Status.ACTIVE, offerId)) {
                    throw new AppException("ACTIVE_LIMIT_EXCEEDED", HttpStatus.CONFLICT);
                }
            }
            offer.setStatus(wantActive ? RideOffer.Status.ACTIVE : RideOffer.Status.INACTIVE);
        }

        return rideOfferRepository.save(offer);
    }

    /**
     * Toggles an offer between ACTIVE and INACTIVE.
     * Only the driver who created the offer can toggle it.
     * FULL / COMPLETED / CANCELLED offers cannot be toggled.
     */
    @Transactional
    public RideOffer toggleOfferStatus(Long offerId, String driverEmail) {
        RideOffer offer = rideOfferRepository.findByIdAndIsDeletedFalse(offerId)
                .orElseThrow(() -> new AppException("Ride offer not found.", HttpStatus.BAD_REQUEST));

        if (!offer.getDriver().getEmail().equals(driverEmail)) {
            throw new AppException("You can only modify your own ride offers.", HttpStatus.FORBIDDEN);
        }

        if (offer.getStatus() == RideOffer.Status.ACTIVE) {
            offer.setStatus(RideOffer.Status.INACTIVE);
        } else if (offer.getStatus() == RideOffer.Status.INACTIVE) {
            // Check limit before toggling to ACTIVE
            if (rideOfferRepository.existsByDriver_EmailAndStatusAndIdNotAndIsDeletedFalse(driverEmail, RideOffer.Status.ACTIVE, offerId)) {
                throw new AppException("ACTIVE_LIMIT_EXCEEDED", HttpStatus.CONFLICT);
            }
            offer.setStatus(RideOffer.Status.ACTIVE);
        } else {
            throw new AppException(
                    "Only ACTIVE or INACTIVE offers can be toggled. Current status: " + offer.getStatus(),
                    HttpStatus.BAD_REQUEST);
        }

        return rideOfferRepository.save(offer);
    }

    /**
     * Soft deletes a ride offer.
     */
    @Transactional
    public void deleteOffer(Long offerId, String driverEmail) {
        RideOffer offer = rideOfferRepository.findByIdAndIsDeletedFalse(offerId)
                .orElseThrow(() -> new AppException("Ride offer not found.", HttpStatus.BAD_REQUEST));

        if (!offer.getDriver().getEmail().equals(driverEmail)) {
            throw new AppException("You can only delete your own ride offers.", HttpStatus.FORBIDDEN);
        }

        offer.setIsDeleted(true);
        rideOfferRepository.save(offer);
    }

    /**
     * Returns all non-deleted requests for a specific ride offer.
     * Only the ride creator can view these.
     */
    @Transactional(readOnly = true)
    public List<RideRequest> getRequestsForOffer(Long offerId, String driverEmail) {
        RideOffer offer = rideOfferRepository.findByIdAndIsDeletedFalse(offerId)
                .orElseThrow(() -> new AppException("Ride offer not found.", HttpStatus.BAD_REQUEST));

        if (!offer.getDriver().getEmail().equals(driverEmail)) {
            throw new AppException("Only the ride creator can view requests.", HttpStatus.FORBIDDEN);
        }

        return rideRequestRepository.findByRideOffer_IdAndIsDeletedFalse(offerId);
    }

    /**
     * Returns all non-deleted offers created by the current driver (all statuses).
     * Used to populate the My Rides page.
     */
    @Transactional(readOnly = true)
    public List<RideOffer> getMyOffers(String driverEmail) {
        return rideOfferRepository.findByDriver_EmailAndIsDeletedFalseOrderByStatusAsc(driverEmail);
    }
}

package com.piggyback.repository;

import com.piggyback.entity.RideRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RideRequestRepository extends JpaRepository<RideRequest, Long> {

    /** Fetch a non-deleted ride request by ID. */
    Optional<RideRequest> findByIdAndIsDeletedFalse(Long id);

    /** Check if a passenger already has a pending/accepted request for the same offer. */
    boolean existsByRideOffer_IdAndPassenger_IdAndIsDeletedFalseAndStatusIn(
            Long rideOfferId,
            Long passengerId,
            java.util.List<RideRequest.Status> statuses
    );

    /** Find a specific passenger's request for an offer (to check status). */
    Optional<RideRequest> findByRideOffer_IdAndPassenger_EmailAndIsDeletedFalse(Long offerId, String passengerEmail);

    /** Find all non-deleted requests for a specific offer. Used by Ride Creators to manage requests. */
    java.util.List<RideRequest> findByRideOffer_IdAndIsDeletedFalse(Long offerId);
}

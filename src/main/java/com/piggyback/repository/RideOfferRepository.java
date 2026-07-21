package com.piggyback.repository;

import com.piggyback.entity.RideOffer;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RideOfferRepository extends JpaRepository<RideOffer, Long> {

    /** Fetch all non-deleted ride offers matching the given statuses (e.g. ACTIVE and FULL for the Live Board). */
    List<RideOffer> findByStatusInAndIsDeletedFalse(List<RideOffer.Status> statuses);

    /** Fetch all non-deleted offers belonging to a specific driver (all statuses). Used for My Rides page. */
    List<RideOffer> findByDriver_EmailAndIsDeletedFalseOrderByStatusAsc(String driverEmail);

    /** Count non-deleted offers for a driver (max 5 limit). */
    long countByDriver_EmailAndIsDeletedFalse(String driverEmail);

    /** Check if a driver already has an active offer. */
    boolean existsByDriver_EmailAndStatusAndIsDeletedFalse(String driverEmail, RideOffer.Status status);

    /** Check if a driver has an active offer OTHER THAN the given offer ID (for updates). */
    boolean existsByDriver_EmailAndStatusAndIdNotAndIsDeletedFalse(String driverEmail, RideOffer.Status status, Long id);

    /** Find a non-deleted offer by ID (general read). */
    Optional<RideOffer> findByIdAndIsDeletedFalse(Long id);

    /**
     * Find a non-deleted offer by ID with a PESSIMISTIC WRITE lock.
     * Used during seat-decrement to prevent double-booking.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM RideOffer r WHERE r.id = :id AND r.isDeleted = false")
    Optional<RideOffer> findByIdAndIsDeletedFalseWithLock(@Param("id") Long id);
}

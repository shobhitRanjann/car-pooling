package com.piggyback.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "ride_offer")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RideOffer {

    public enum Status {
        ACTIVE, FULL, COMPLETED, CANCELLED, INACTIVE
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Driver info is fetched EAGERLY so that GET /api/rides/active
     * serialises firstName, lastName, and mobileNumber inline without
     * requiring a second query or a DTO projection.
     */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "driver_id", nullable = false)
    private AppUser driver;

    @Column(name = "start_location_url", nullable = false)
    private String startLocationUrl;

    @Column(name = "end_location_url", nullable = false)
    private String endLocationUrl;

    @Column(name = "departure_time", nullable = false)
    private LocalDateTime departureTime;

    @Column(name = "available_seats", nullable = false)
    private Integer availableSeats;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Status status = Status.ACTIVE;

    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private Boolean isDeleted = false;

    /**
     * Ephemeral field populated dynamically during GET /api/rides/active.
     * Tells the frontend if the requesting user has already requested this ride.
     * Null if no request exists, otherwise "PENDING", "ACCEPTED", etc.
     */
    @Transient
    private String currentUserRequestStatus;
}

package com.piggyback.entity;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "ride_request")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RideRequest {

    public enum Status {
        PENDING, ACCEPTED, REJECTED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ride_offer_id", nullable = false)
    @JsonIgnore
    private RideOffer rideOffer;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "passenger_id", nullable = false)
    private AppUser passenger;

    @Column(name = "pickup_point")
    private String pickupPoint;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Status status = Status.PENDING;

    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private Boolean isDeleted = false;
}

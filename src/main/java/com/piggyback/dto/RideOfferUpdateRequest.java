package com.piggyback.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Used for PUT /api/rides/offer/{offerId}.
 * All fields except startLocationUrl and endLocationUrl are optional —
 * only non-null values are applied (partial update).
 */
@Data
public class RideOfferUpdateRequest {

    /** Can be a Google Maps URL or plain text like "From Office". */
    @NotBlank(message = "Start location is required")
    private String startLocationUrl;

    @NotBlank(message = "End location is required")
    private String endLocationUrl;

    /** Null = don't change the departure time. No @Future — edit can keep existing time. */
    private LocalDateTime departureTime;

    @Min(value = 1, message = "At least 1 seat must be available")
    private Integer availableSeats;

    /**
     * Maps to the status toggle on the card.
     * true  → ACTIVE | false → INACTIVE | null → no change
     */
    private Boolean isActive;
}

package com.piggyback.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class RideOfferRequest {

    @NotBlank(message = "Start location URL is required")
    private String startLocationUrl;

    @NotBlank(message = "End location URL is required")
    private String endLocationUrl;

    @NotNull(message = "Departure time is required")
    private LocalDateTime departureTime;

    @NotNull(message = "Available seats is required")
    @Min(value = 1, message = "At least 1 seat must be available")
    private Integer availableSeats;


    /**
     * Maps to the UI toggle on the driver's screen.
     * true  → status ACTIVE  (visible to passengers on the Live Board)
     * false → status INACTIVE (hidden from Live Board)
     */
    @JsonProperty("isActive")
    private Boolean isActive = true;
}

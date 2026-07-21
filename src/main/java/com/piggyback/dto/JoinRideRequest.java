package com.piggyback.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class JoinRideRequest {

    @NotBlank(message = "Pickup point is required")
    private String pickupPoint;
}

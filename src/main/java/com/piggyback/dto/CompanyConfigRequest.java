package com.piggyback.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class CompanyConfigRequest {

    /**
     * Company email domain WITHOUT the leading '@'.
     * Example: "watermark.com"
     * Only letters, digits, hyphens, and dots are allowed.
     */
    @NotBlank(message = "Domain is required")
    @Pattern(
        regexp = "^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
        message = "Domain must be a valid domain name (e.g. watermark.com)"
    )
    private String domain;

    /**
     * Maximum number of whitelisted users allowed for this company.
     * Must be between 1 and 1000.
     */
    @NotNull(message = "Max users is required")
    @Min(value = 1, message = "Max users must be at least 1")
    private Integer maxUsers;
}

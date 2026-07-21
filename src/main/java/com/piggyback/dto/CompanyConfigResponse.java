package com.piggyback.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class CompanyConfigResponse {
    private Long id;
    private String domain;
    private Integer maxUsers;
    private String logoFilename;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

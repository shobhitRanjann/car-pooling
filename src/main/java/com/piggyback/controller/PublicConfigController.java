package com.piggyback.controller;

import com.piggyback.dto.ApiResponse;
import com.piggyback.dto.CompanyConfigResponse;
import com.piggyback.entity.CompanyConfig;
import com.piggyback.repository.CompanyConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/public/config")
@RequiredArgsConstructor
public class PublicConfigController {

    private final CompanyConfigRepository companyConfigRepository;

    /**
     * GET /api/public/config/domain?name=watermark.com
     * Returns the branding and maxUsers config for a specific domain.
     * This is public so the login page can render the correct logo.
     */
    @GetMapping("/domain")
    public ResponseEntity<ApiResponse<CompanyConfigResponse>> getConfigByDomain(@RequestParam("name") String domain) {
        return companyConfigRepository.findByDomainAndIsDeletedFalse(domain.trim().toLowerCase())
                .map(config -> new CompanyConfigResponse(
                        config.getId(),
                        config.getDomain(),
                        config.getMaxUsers(),
                        config.getLogoFilename(),
                        config.getCreatedAt(),
                        config.getUpdatedAt()
                ))
                .map(res -> ResponseEntity.ok(ApiResponse.ok("Domain configuration found.", res)))
                .orElseGet(() -> ResponseEntity.ok(ApiResponse.ok("No configuration for this domain.", null)));
    }
}

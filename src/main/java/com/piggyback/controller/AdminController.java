package com.piggyback.controller;

import com.piggyback.dto.ApiResponse;
import com.piggyback.dto.CompanyConfigRequest;
import com.piggyback.dto.CompanyConfigResponse;
import com.piggyback.service.AdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_SUPER_USER')")
public class AdminController {

    private final AdminService adminService;

    // ----------------------------------------------------------------
    // Company Configuration
    // ----------------------------------------------------------------

    /**
     * POST /api/admin/config
     * Sets or updates the company domain and user limit.
     * Acts as an UPSERT — safe to call multiple times.
     *
     * Payload: { "domain": "acme.com", "maxUsers": 30 }
     */
    @PostMapping("/config")
    public ResponseEntity<ApiResponse<CompanyConfigResponse>> setCompanyConfig(
            @Valid @RequestBody CompanyConfigRequest request) {
        CompanyConfigResponse config = adminService.setCompanyConfig(request);
        return ResponseEntity.ok(ApiResponse.ok("Company configuration saved successfully.", config));
    }

    /**
     * GET /api/admin/config
     * Returns all active company configurations.
     */
    @GetMapping("/config")
    public ResponseEntity<ApiResponse<java.util.List<CompanyConfigResponse>>> getAllCompanyConfigs() {
        java.util.List<CompanyConfigResponse> configs = adminService.getAllCompanyConfigs();
        return ResponseEntity.ok(ApiResponse.ok("Company configurations fetched successfully.", configs));
    }

    /**
     * POST /api/admin/config/{domain}/logo
     * Uploads and compresses a logo for the given company domain.
     */
    @PostMapping("/config/{domain}/logo")
    public ResponseEntity<ApiResponse<String>> uploadLogo(
            @PathVariable String domain,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        String filename = adminService.uploadLogo(domain, file);
        return ResponseEntity.ok(ApiResponse.ok("Logo uploaded and compressed successfully.", filename));
    }

    // ----------------------------------------------------------------
    // Whitelist Management
    // ----------------------------------------------------------------

    /**
     * POST /api/admin/whitelist?email=employee@acme.com
     * Adds an email to the whitelist.
     * Domain must match the configured company domain.
     * Count must be below the configured maxUsers limit.
     */
    @PostMapping("/whitelist")
    public ResponseEntity<ApiResponse<Void>> addToWhitelist(
            @RequestParam String email) {
        adminService.addToWhitelist(email);
        return ResponseEntity.ok(ApiResponse.ok("Email successfully added to whitelist."));
    }

    /**
     * GET /api/admin/whitelist
     * Returns all whitelist users.
     */
    @GetMapping("/whitelist")
    public ResponseEntity<ApiResponse<java.util.List<com.piggyback.entity.UserWhitelist>>> getAllWhitelistUsers() {
        return ResponseEntity.ok(ApiResponse.ok("Users fetched.", adminService.getAllWhitelistUsers()));
    }

    /**
     * PUT /api/admin/whitelist/{email}/toggle
     * Toggles the active/suspended status of a user.
     */
    @PutMapping("/whitelist/{email}/toggle")
    public ResponseEntity<ApiResponse<com.piggyback.entity.UserWhitelist>> toggleWhitelistUserStatus(
            @PathVariable String email) {
        com.piggyback.entity.UserWhitelist user = adminService.toggleWhitelistUserStatus(email);
        return ResponseEntity.ok(ApiResponse.ok("User status updated.", user));
    }
}

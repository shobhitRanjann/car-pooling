package com.piggyback.controller;

import com.piggyback.dto.ApiResponse;
import com.piggyback.dto.AuthResponse;
import com.piggyback.dto.LoginRequest;
import com.piggyback.dto.SignupRequest;
import com.piggyback.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Log4j2
public class AuthController {

    private final AuthService authService;

    /**
     * POST /api/auth/signup
     * Registers a new employee after whitelist & domain validation.
     */
    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<Void>> signup(
            @Valid @RequestBody SignupRequest request) {
        String message = authService.signup(request);
        return ResponseEntity.ok(ApiResponse.ok(message));
    }

    /**
     * POST /api/auth/login
     * Authenticates a user and returns a JWT.
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request) {
        log.info("Login with email {}",request.getEmail());
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.ok("Login successful.", response));
    }
}

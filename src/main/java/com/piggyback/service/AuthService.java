package com.piggyback.service;

import com.piggyback.dto.AuthResponse;
import com.piggyback.dto.LoginRequest;
import com.piggyback.dto.SignupRequest;
import com.piggyback.entity.AppUser;
import com.piggyback.entity.CompanyConfig;
import com.piggyback.entity.UserWhitelist;
import com.piggyback.exception.AppException;
import com.piggyback.repository.AppUserRepository;
import com.piggyback.repository.UserWhitelistRepository;
import com.piggyback.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final AppUserRepository appUserRepository;
    private final UserWhitelistRepository userWhitelistRepository;
    private final AdminService adminService;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    /**
     * Registers a new user.
     * Checks (in order):
     *  1. Email domain must be @watermark.com
     *  2. Email must exist in the active whitelist (isDeleted = false)
     *  3. Whitelist entry must not yet be registered (isRegistered = false)
     *  4. No active app_user account with the same email
     */
    @Transactional
    public String signup(SignupRequest request) {
        // 1. Trim & lowercase
        String email = request.getEmail().trim().toLowerCase();
        int atIndex = email.lastIndexOf('@');
        if (atIndex == -1) {
            throw new AppException("Invalid email format.", HttpStatus.BAD_REQUEST);
        }
        String domain = email.substring(atIndex + 1);

        // 2. Load company config for this domain
        CompanyConfig config = adminService.requireConfigByDomain(domain);
        String expectedSuffix = "@" + config.getDomain();

        // 3. Domain validation against the configured company domain
        if (!email.endsWith(expectedSuffix)) {
            throw new AppException(
                    "Registration is only allowed for @" + config.getDomain() + " email addresses.",
                    HttpStatus.BAD_REQUEST);
        }

        // 4. Check registration limit
        long activeUsers = userWhitelistRepository.countByEmailEndingWithAndIsDeletedFalse(expectedSuffix);
        if (activeUsers >= config.getMaxUsers()) {
            throw new AppException("user registration limit reached", HttpStatus.BAD_REQUEST);
        }

        // 5. Fetch or create whitelist entry
        java.util.Optional<com.piggyback.entity.UserWhitelist> optionalEntry = userWhitelistRepository.findByEmail(email);
        com.piggyback.entity.UserWhitelist entry;
        boolean isPending = false;

        if (optionalEntry.isPresent()) {
            entry = optionalEntry.get();
            if (Boolean.TRUE.equals(entry.getIsRegistered())) {
                throw new AppException("An account with this email already exists.", HttpStatus.BAD_REQUEST);
            }
            if (Boolean.TRUE.equals(entry.getIsDeleted())) {
                isPending = true;
            }
        } else {
            // Self-signup: create a pending whitelist entry
            entry = com.piggyback.entity.UserWhitelist.builder()
                    .email(email)
                    .isRegistered(false)
                    .isDeleted(true) // Pending admin approval
                    .build();
            isPending = true;
        }

        // 6. Extra guard: no duplicate active user
        if (appUserRepository.existsByEmailAndIsDeletedFalse(email)) {
            throw new AppException("An active account with this email already exists.", HttpStatus.BAD_REQUEST);
        }

        // 7. Create user
        AppUser user = AppUser.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName().trim())
                .lastName(request.getLastName().trim())
                .mobileNumber(request.getMobileNumber().trim())
                .role("ROLE_USER")
                .isDeleted(false)
                .build();
        appUserRepository.save(user);

        // 8. Mark whitelist entry as registered
        entry.setIsRegistered(true);
        userWhitelistRepository.save(entry);

        if (isPending) {
            return "Please share email to admin for account activation";
        }
        return "Registration successful. You can now log in.";
    }

    /**
     * Authenticates a user and returns a JWT.
     */
    public AuthResponse login(LoginRequest request) {
        // Trim & lowercase
        String email = request.getEmail().trim().toLowerCase();

        // Load active user
        AppUser user = appUserRepository.findByEmailAndIsDeletedFalse(email)
                .orElseThrow(() -> new AppException(
                        "Invalid email or password.",
                        HttpStatus.BAD_REQUEST));

        // Check if whitelist entry is pending (isDeleted = true)
        com.piggyback.entity.UserWhitelist whitelistEntry = userWhitelistRepository.findByEmail(email).orElse(null);
        if (whitelistEntry != null && Boolean.TRUE.equals(whitelistEntry.getIsDeleted())) {
            throw new AppException("Please share email to admin for account activation", HttpStatus.FORBIDDEN);
        }

        // Validate password
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new AppException("Invalid email or password.", HttpStatus.BAD_REQUEST);
        }
        // Generate JWT
        String token = jwtUtil.generateToken(user.getEmail(), user.getRole());
        return new AuthResponse(token, user.getRole(), user.getEmail());
    }
}

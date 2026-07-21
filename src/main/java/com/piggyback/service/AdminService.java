package com.piggyback.service;

import com.piggyback.dto.CompanyConfigRequest;
import com.piggyback.dto.CompanyConfigResponse;
import com.piggyback.entity.CompanyConfig;
import com.piggyback.entity.UserWhitelist;
import com.piggyback.exception.AppException;
import com.piggyback.repository.CompanyConfigRepository;
import com.piggyback.repository.UserWhitelistRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.Image;
import java.awt.image.BufferedImage;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserWhitelistRepository userWhitelistRepository;
    private final CompanyConfigRepository companyConfigRepository;

    // ----------------------------------------------------------------
    // Company Config
    // ----------------------------------------------------------------

    /**
     * Sets or updates a company configuration (domain + max users).
     * The domain is stored in lowercase without the leading '@'.
     */
    @Transactional
    public CompanyConfigResponse setCompanyConfig(CompanyConfigRequest request) {
        String domain = request.getDomain().trim().toLowerCase();

        // Look for an existing config for THIS domain
        Optional<CompanyConfig> existing =
                companyConfigRepository.findByDomainAndIsDeletedFalse(domain);

        CompanyConfig config;
        if (existing.isPresent()) {
            config = existing.get();
            config.setMaxUsers(request.getMaxUsers());
        } else {
            config = CompanyConfig.builder()
                    .domain(domain)
                    .maxUsers(request.getMaxUsers())
                    .isDeleted(false)
                    .build();
        }

        config = companyConfigRepository.save(config);
        return toResponse(config);
    }

    /**
     * Returns all active company configurations.
     */
    @Transactional(readOnly = true)
    public java.util.List<CompanyConfigResponse> getAllCompanyConfigs() {
        return companyConfigRepository.findByIsDeletedFalse().stream()
                .map(this::toResponse)
                .toList();
    }

    // ----------------------------------------------------------------
    // Whitelist Management
    // ----------------------------------------------------------------

    /**
     * Adds an email to the whitelist.
     * Rules (all driven by the current company config):
     *  1. Company config must be set
     *  2. Email domain must match the configured company domain
     *  3. Active whitelist count must be < configured maxUsers
     *  4. Email must not already be in the whitelist (any state)
     */
    @Transactional
    public void addToWhitelist(String rawEmail) {
        String email = rawEmail.trim().toLowerCase();
        int atIndex = email.lastIndexOf('@');
        if (atIndex == -1) {
            throw new AppException("Invalid email format.", HttpStatus.BAD_REQUEST);
        }
        String domain = email.substring(atIndex + 1);

        // Load company config for this domain
        CompanyConfig config = companyConfigRepository.findByDomainAndIsDeletedFalse(domain)
                .orElseThrow(() -> new AppException(
                        "Your company domain (@" + domain + ") is not registered for Piggyback.",
                        HttpStatus.BAD_REQUEST));

        // 3. Count users FOR THIS DOMAIN
        long activeCount = userWhitelistRepository.countByEmailEndingWithAndIsDeletedFalse("@" + domain);
        if (activeCount >= config.getMaxUsers()) {
            throw new AppException(
                    "Whitelist limit reached for " + domain + ". Maximum of " + config.getMaxUsers()
                            + " users allowed.",
                    HttpStatus.BAD_REQUEST);
        }

        // 4. Duplicate check
        if (userWhitelistRepository.existsByEmail(email)) {
            throw new AppException(
                    "This email is already in the whitelist.",
                    HttpStatus.BAD_REQUEST);
        }

        // 5. Add to whitelist
        UserWhitelist entry = UserWhitelist.builder()
                .email(email)
                .isRegistered(false)
                .isDeleted(false)
                .build();
        userWhitelistRepository.save(entry);
    }

    public java.util.List<UserWhitelist> getAllWhitelistUsers() {
        return userWhitelistRepository.findAll();
    }

    @Transactional
    public UserWhitelist toggleWhitelistUserStatus(String email) {
        UserWhitelist entry = userWhitelistRepository.findByEmail(email)
                .orElseThrow(() -> new AppException("User not found.", HttpStatus.NOT_FOUND));

        boolean newStatus = !entry.getIsDeleted();
        
        // If we are activating them, check the domain limit
        if (!newStatus) {
            String domain = email.substring(email.lastIndexOf('@') + 1);
            CompanyConfig config = companyConfigRepository.findByDomainAndIsDeletedFalse(domain)
                    .orElseThrow(() -> new AppException("Company domain not registered.", HttpStatus.BAD_REQUEST));
            
            long activeCount = userWhitelistRepository.countByEmailEndingWithAndIsDeletedFalse("@" + domain);
            if (activeCount >= config.getMaxUsers()) {
                throw new AppException(
                        "Whitelist limit reached for " + domain + ". Cannot activate user.",
                        HttpStatus.BAD_REQUEST);
            }
        }
        
        entry.setIsDeleted(newStatus);
        return userWhitelistRepository.save(entry);
    }

    // ----------------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------------

    /**
     * Gets a config by domain, throws 404 if missing.
     */
    public CompanyConfig requireConfigByDomain(String domain) {
        return companyConfigRepository.findByDomainAndIsDeletedFalse(domain)
                .orElseThrow(() -> new AppException("Company config not found for domain: " + domain, HttpStatus.NOT_FOUND));
    }

    private CompanyConfigResponse toResponse(CompanyConfig config) {
        return new CompanyConfigResponse(
                config.getId(),
                config.getDomain(),
                config.getMaxUsers(),
                config.getLogoFilename(),
                config.getCreatedAt(),
                config.getUpdatedAt()
        );
    }

    /**
     * Uploads and compresses a logo for the given company domain.
     */
    @Transactional
    public String uploadLogo(String domain, MultipartFile file) {
        CompanyConfig config = requireConfigByDomain(domain);

        if (file.isEmpty()) {
            throw new AppException("Failed to store empty file.", HttpStatus.BAD_REQUEST);
        }

        try {
            // Ensure directory exists
         //   log.info("in uploadLogo method");
            Path uploadPath = Paths.get("/Users/shobhit/Desktop/piggyback/uploads/logos");
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // Get extension
            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf(".") + 1).toLowerCase();
            }

            // Read the image
            BufferedImage originalImage = ImageIO.read(file.getInputStream());
            String filename;

            if (originalImage == null) {
                // ImageIO doesn't support this format (e.g., WebP, SVG).
                // Just save the raw file without resizing.
                if (extension.isEmpty()) extension = "webp";
                filename = domain + "-logo." + extension;
                Files.copy(file.getInputStream(), uploadPath.resolve(filename), java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            } else {
                // Calculate new dimensions (max height 60px)
                int targetHeight = 60;
                int targetWidth = (int) ((double) originalImage.getWidth() / originalImage.getHeight() * targetHeight);
                
                if (originalImage.getHeight() <= targetHeight) {
                    targetHeight = originalImage.getHeight();
                    targetWidth = originalImage.getWidth();
                }

                // Resize the image
                Image resultingImage = originalImage.getScaledInstance(targetWidth, targetHeight, Image.SCALE_SMOOTH);
                BufferedImage outputImage = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_INT_ARGB);
                Graphics2D g2d = outputImage.createGraphics();
                g2d.drawImage(resultingImage, 0, 0, null);
                g2d.dispose();

                // Save as PNG
                filename = domain + "-logo.png";
                File destinationFile = uploadPath.resolve(filename).toFile();
                ImageIO.write(outputImage, "png", destinationFile);
            }

            // Update config
            config.setLogoFilename(filename);
            companyConfigRepository.save(config);

            return filename;
        } catch (Exception e) {
            throw new AppException("Failed to upload and compress logo: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}

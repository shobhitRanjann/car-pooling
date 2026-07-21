package com.piggyback.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Singleton-style configuration set exclusively by the Super Admin.
 * Stores the allowed company email domain and the maximum number of
 * whitelisted users permitted.
 */
@Entity
@Table(name = "company_config")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompanyConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Company email domain WITHOUT the leading '@'.
     * Example: "watermark.com"
     */
    @Column(nullable = false, unique = true)
    private String domain;

    /**
     * Maximum number of whitelisted (active, non-deleted) users allowed.
     */
    @Column(name = "max_users", nullable = false)
    private Integer maxUsers;

    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private Boolean isDeleted = false;

    /**
     * Local filename of the uploaded logo in the uploads/logos directory.
     * Example: "watermark-logo-12345.png"
     */
    @Column(name = "logo_filename")
    private String logoFilename;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}

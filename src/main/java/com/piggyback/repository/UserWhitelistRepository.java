package com.piggyback.repository;

import com.piggyback.entity.UserWhitelist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserWhitelistRepository extends JpaRepository<UserWhitelist, Long> {

    /** Find a whitelist entry by email (deleted or not). */
    Optional<UserWhitelist> findByEmail(String email);

    /** Find a non-deleted whitelist entry by email. */
    Optional<UserWhitelist> findByEmailAndIsDeletedFalse(String email);

    /** Count active (non-deleted) whitelist entries for a specific domain. */
    long countByEmailEndingWithAndIsDeletedFalse(String emailSuffix);

    /** Check if email already exists in whitelist (any state). */
    boolean existsByEmail(String email);
}

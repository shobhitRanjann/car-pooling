package com.piggyback.repository;

import com.piggyback.entity.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AppUserRepository extends JpaRepository<AppUser, Long> {

    /** Used by UserDetailsServiceImpl — only loads active (non-deleted) users. */
    Optional<AppUser> findByEmailAndIsDeletedFalse(String email);

    /** Used during signup to ensure no duplicate active accounts. */
    boolean existsByEmailAndIsDeletedFalse(String email);
}

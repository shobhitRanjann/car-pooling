package com.piggyback.repository;

import com.piggyback.entity.CompanyConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CompanyConfigRepository extends JpaRepository<CompanyConfig, Long> {

    /** Returns a specific company's config by their domain. */
    Optional<CompanyConfig> findByDomainAndIsDeletedFalse(String domain);

    /** Returns all active company configs. */
    java.util.List<CompanyConfig> findByIsDeletedFalse();
}

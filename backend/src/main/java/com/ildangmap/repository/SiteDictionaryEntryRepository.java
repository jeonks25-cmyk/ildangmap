package com.ildangmap.repository;

import com.ildangmap.domain.sitememory.SiteDictionaryEntry;
import com.ildangmap.domain.sitememory.SiteDictionaryEntryType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SiteDictionaryEntryRepository extends JpaRepository<SiteDictionaryEntry, Long> {

    Optional<SiteDictionaryEntry> findByCanonicalKey(String canonicalKey);

    long countByEntryType(SiteDictionaryEntryType entryType);

    List<SiteDictionaryEntry> findByEntryTypeOrderByRegistrationCountDesc(
            SiteDictionaryEntryType entryType,
            Pageable pageable
    );

    @Query("""
            SELECT e FROM SiteDictionaryEntry e
            WHERE e.entryType = :entryType
              AND (
                e.canonicalKey LIKE CONCAT('%', :token, '%')
                OR e.displayName LIKE CONCAT('%', :token, '%')
              )
            ORDER BY e.registrationCount DESC
            """)
    List<SiteDictionaryEntry> searchByToken(
            @Param("entryType") SiteDictionaryEntryType entryType,
            @Param("token") String token,
            Pageable pageable
    );

    void deleteByEntryType(SiteDictionaryEntryType entryType);
}

package com.ildangmap.repository;

import com.ildangmap.domain.sitememory.SiteMemoryEvent;
import com.ildangmap.domain.sitememory.SiteMemoryEventType;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SiteMemoryEventRepository extends JpaRepository<SiteMemoryEvent, Long> {

    @Query(
            """
            SELECT COUNT(e) FROM SiteMemoryEvent e
            WHERE e.ocrSource = :ocrSource
              AND e.eventType IN :types
              AND e.createdAt >= :from
              AND e.createdAt < :to
            """)
    long countByOcrSourceAndTypes(
            @Param("ocrSource") String ocrSource,
            @Param("types") List<SiteMemoryEventType> types,
            @Param("from") Instant from,
            @Param("to") Instant to);

    @Query(
            """
            SELECT COUNT(e) FROM SiteMemoryEvent e
            WHERE e.ocrSource = :ocrSource
              AND e.eventType IN :types
              AND e.success = true
              AND e.createdAt >= :from
              AND e.createdAt < :to
            """)
    long countSuccessByOcrSourceAndTypes(
            @Param("ocrSource") String ocrSource,
            @Param("types") List<SiteMemoryEventType> types,
            @Param("from") Instant from,
            @Param("to") Instant to);

    @Query(
            """
            SELECT COUNT(e) FROM SiteMemoryEvent e
            WHERE e.eventType = com.ildangmap.domain.sitememory.SiteMemoryEventType.OCR_EDIT
              AND e.ocrSource = :ocrSource
              AND e.userEdited = true
              AND e.createdAt >= :from
              AND e.createdAt < :to
            """)
    long countEditsByOcrSource(
            @Param("ocrSource") String ocrSource,
            @Param("from") Instant from,
            @Param("to") Instant to);

    @Query(
            """
            SELECT COUNT(e) FROM SiteMemoryEvent e
            WHERE e.eventType IN :types
              AND e.success = true
              AND e.createdAt >= :from
              AND e.createdAt < :to
            """)
    long countSuccessByTypes(
            @Param("types") List<SiteMemoryEventType> types,
            @Param("from") Instant from,
            @Param("to") Instant to);

    @Query(
            """
            SELECT COUNT(e) FROM SiteMemoryEvent e
            WHERE e.eventType IN :types
              AND e.createdAt >= :from
              AND e.createdAt < :to
            """)
    long countByTypes(
            @Param("types") List<SiteMemoryEventType> types,
            @Param("from") Instant from,
            @Param("to") Instant to);

    @Query(
            """
            SELECT COUNT(e) FROM SiteMemoryEvent e
            WHERE e.eventType = com.ildangmap.domain.sitememory.SiteMemoryEventType.OCR_EDIT
              AND e.userEdited = true
              AND e.createdAt >= :from
              AND e.createdAt < :to
            """)
    long countOcrEdits(@Param("from") Instant from, @Param("to") Instant to);

    @Query(
            """
            SELECT COUNT(e) FROM SiteMemoryEvent e
            WHERE e.eventType IN :types
              AND e.userEdited = true
              AND e.createdAt >= :from
              AND e.createdAt < :to
            """)
    long countEditedAfterOcr(
            @Param("types") List<SiteMemoryEventType> types,
            @Param("from") Instant from,
            @Param("to") Instant to);

    @Query(
            """
            SELECT e.canonicalKey, COUNT(e) FROM SiteMemoryEvent e
            WHERE e.eventType IN :types
              AND e.canonicalKey IS NOT NULL
              AND e.canonicalKey <> ''
              AND e.createdAt >= :from
              AND e.createdAt < :to
            GROUP BY e.canonicalKey
            ORDER BY COUNT(e) DESC
            """)
    List<Object[]> topCanonicalKeys(
            @Param("types") List<SiteMemoryEventType> types,
            @Param("from") Instant from,
            @Param("to") Instant to);

    @Query(
            """
            SELECT e.ocrTitleOriginal, e.ocrTitleCorrected, COUNT(e) FROM SiteMemoryEvent e
            WHERE e.eventType = com.ildangmap.domain.sitememory.SiteMemoryEventType.OCR_EDIT
              AND e.userEditedTitle = true
              AND e.ocrTitleOriginal IS NOT NULL
              AND e.ocrTitleCorrected IS NOT NULL
              AND e.ocrTitleOriginal <> e.ocrTitleCorrected
              AND e.createdAt >= :from
              AND e.createdAt < :to
            GROUP BY e.ocrTitleOriginal, e.ocrTitleCorrected
            ORDER BY COUNT(e) DESC
            """)
    List<Object[]> topTitleCorrections(@Param("from") Instant from, @Param("to") Instant to);

    @Query(
            """
            SELECT
              SUM(CASE WHEN e.hasApartmentName = false OR e.hasApartmentName IS NULL THEN 1 ELSE 0 END),
              SUM(CASE WHEN e.hasBuilding = false OR e.hasBuilding IS NULL THEN 1 ELSE 0 END),
              SUM(CASE WHEN e.hasUnit = false OR e.hasUnit IS NULL THEN 1 ELSE 0 END),
              SUM(CASE WHEN e.success = false THEN 1 ELSE 0 END)
            FROM SiteMemoryEvent e
            WHERE e.eventType IN :types
              AND e.createdAt >= :from
              AND e.createdAt < :to
            """)
    List<Object[]> failurePatternTotals(
            @Param("types") List<SiteMemoryEventType> types,
            @Param("from") Instant from,
            @Param("to") Instant to);

    @Query(
            """
            SELECT e FROM SiteMemoryEvent e
            WHERE e.eventType IN :types
              AND e.createdAt >= :from
              AND e.createdAt < :to
            ORDER BY e.createdAt DESC
            """)
    List<SiteMemoryEvent> findRecentOcrEvents(
            @Param("types") List<SiteMemoryEventType> types,
            @Param("from") Instant from,
            @Param("to") Instant to,
            org.springframework.data.domain.Pageable pageable);

    @Query(
            """
            SELECT e FROM SiteMemoryEvent e
            WHERE e.eventType = com.ildangmap.domain.sitememory.SiteMemoryEventType.OCR_EDIT
              AND e.userId = :userId
              AND e.ocrTitleOriginal = :original
            ORDER BY e.createdAt DESC
            """)
    List<SiteMemoryEvent> findEditsForOriginalTitle(
            @Param("userId") Long userId,
            @Param("original") String original,
            org.springframework.data.domain.Pageable pageable);
}

package com.ildangmap.repository;

import com.ildangmap.domain.place.PlaceReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PlaceReportRepository extends JpaRepository<PlaceReport, Long> {
    long countByPlaceId(Long placeId);

    Optional<PlaceReport> findTopByPlaceIdOrderByCreatedAtDesc(Long placeId);
}

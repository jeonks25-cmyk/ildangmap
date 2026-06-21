package com.ildangmap.repository;

import com.ildangmap.domain.place.MapPlace;
import com.ildangmap.domain.place.PlaceStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MapPlaceRepository extends JpaRepository<MapPlace, Long> {
    Optional<MapPlace> findByExternalIdAndDeletedFalse(String externalId);

    Optional<MapPlace> findByExternalId(String externalId);

    long countByDeletedFalse();

    long countByStatusAndDeletedFalse(PlaceStatus status);
}

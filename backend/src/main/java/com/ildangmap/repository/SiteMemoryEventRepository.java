package com.ildangmap.repository;

import com.ildangmap.domain.sitememory.SiteMemoryEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SiteMemoryEventRepository extends JpaRepository<SiteMemoryEvent, Long> {
}

package com.ildangmap.repository;

import com.ildangmap.domain.briefing.Briefing;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BriefingRepository extends JpaRepository<Briefing, Long> {

    List<Briefing> findByActiveTrueOrderByPublishedAtDesc();

    List<Briefing> findByCraftAndActiveTrueOrderByPublishedAtDesc(String craft);
}

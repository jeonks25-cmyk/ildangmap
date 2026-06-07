package com.ildangmap.service;

import com.ildangmap.domain.briefing.Briefing;
import com.ildangmap.repository.BriefingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BriefingService {

    private final BriefingRepository briefingRepository;

    public List<Briefing> getActiveBriefings(String craft) {
        if (craft == null || craft.isBlank()) {
            return briefingRepository.findByActiveTrueOrderByPublishedAtDesc();
        }
        return briefingRepository.findByCraftAndActiveTrueOrderByPublishedAtDesc(craft);
    }
}

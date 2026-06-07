package com.ildangmap.service;

import com.ildangmap.domain.settlement.Settlement;
import com.ildangmap.repository.SettlementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SettlementService {

    private final SettlementRepository settlementRepository;

    public List<Settlement> getMonthlySettlements(Long userId, String settlementMonth) {
        return settlementRepository.findByUserIdAndSettlementMonthOrderByIdDesc(userId, settlementMonth);
    }

    public List<Settlement> getJobSettlements(Long jobId) {
        return settlementRepository.findByJobIdOrderByIdDesc(jobId);
    }
}

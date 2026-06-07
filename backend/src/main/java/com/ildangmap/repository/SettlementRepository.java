package com.ildangmap.repository;

import com.ildangmap.domain.settlement.Settlement;
import com.ildangmap.domain.settlement.SettlementStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SettlementRepository extends JpaRepository<Settlement, Long> {

    List<Settlement> findByUserIdAndSettlementMonthOrderByIdDesc(Long userId, String settlementMonth);

    List<Settlement> findByJobIdOrderByIdDesc(Long jobId);

    List<Settlement> findByStatusOrderByIdDesc(SettlementStatus status);
}

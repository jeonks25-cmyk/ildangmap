package com.ildangmap.repository;

import com.ildangmap.domain.user.NicknameChangeHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NicknameChangeHistoryRepository extends JpaRepository<NicknameChangeHistory, Long> {

    Optional<NicknameChangeHistory> findTopByUserIdOrderByChangedAtDesc(Long userId);

    List<NicknameChangeHistory> findByUserIdOrderByChangedAtDesc(Long userId);
}

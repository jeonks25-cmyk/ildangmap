package com.ildangmap.repository;

import com.ildangmap.domain.schedule.UserSchedulesData;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserSchedulesDataRepository extends JpaRepository<UserSchedulesData, Long> {

    Optional<UserSchedulesData> findByUserId(Long userId);
}

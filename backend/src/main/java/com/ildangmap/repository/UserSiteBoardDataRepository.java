package com.ildangmap.repository;

import com.ildangmap.domain.siteboard.UserSiteBoardData;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserSiteBoardDataRepository extends JpaRepository<UserSiteBoardData, Long> {

    Optional<UserSiteBoardData> findByUserId(Long userId);
}

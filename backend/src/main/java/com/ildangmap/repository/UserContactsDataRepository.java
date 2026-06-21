package com.ildangmap.repository;

import com.ildangmap.domain.contact.UserContactsData;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserContactsDataRepository extends JpaRepository<UserContactsData, Long> {

    Optional<UserContactsData> findByUserId(Long userId);

    boolean existsByUserId(Long userId);
}

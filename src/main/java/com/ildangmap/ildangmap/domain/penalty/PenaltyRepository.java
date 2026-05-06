package com.ildangmap.ildangmap.domain.penalty;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PenaltyRepository extends JpaRepository<Penalty, Long> {

    List<Penalty> findByUserName(String userName);
}
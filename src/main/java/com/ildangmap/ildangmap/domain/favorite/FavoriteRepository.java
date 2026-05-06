package com.ildangmap.ildangmap.domain.favorite;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {

    List<Favorite> findByWorkerName(String workerName);

    List<Favorite> findByBossName(String bossName);
}
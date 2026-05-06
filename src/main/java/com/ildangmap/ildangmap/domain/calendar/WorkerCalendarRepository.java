package com.ildangmap.ildangmap.domain.calendar;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WorkerCalendarRepository extends JpaRepository<WorkerCalendar, Long> {

    List<WorkerCalendar> findByWorkerName(String workerName);
}
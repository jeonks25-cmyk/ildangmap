package com.ildangmap.ildangmap.controller;

import com.ildangmap.ildangmap.domain.calendar.WorkerCalendar;
import com.ildangmap.ildangmap.domain.calendar.WorkerCalendarRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/calendar")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class WorkerCalendarController {

    private final WorkerCalendarRepository workerCalendarRepository;

    // 일정 등록
    @PostMapping
    public String saveCalendar(@RequestBody WorkerCalendar calendar) {
        workerCalendarRepository.save(calendar);
        return "기술자 일정 등록 완료";
    }

    // 전체 조회
    @GetMapping
    public List<WorkerCalendar> getAllCalendar() {
        return workerCalendarRepository.findAll();
    }

    // 특정 기술자 조회
    @GetMapping("/{workerName}")
    public List<WorkerCalendar> getWorkerCalendar(@PathVariable String workerName) {
        return workerCalendarRepository.findByWorkerName(workerName);
    }
}
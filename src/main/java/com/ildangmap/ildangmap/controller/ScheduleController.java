package com.ildangmap.ildangmap.controller;

import com.ildangmap.ildangmap.domain.schedule.Schedule;
import com.ildangmap.ildangmap.domain.schedule.ScheduleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/schedule")
@CrossOrigin(origins = "*")
public class ScheduleController {

    private final ScheduleRepository scheduleRepository;

    @GetMapping
    public List<Schedule> getAll() {
        return scheduleRepository.findAll();
    }
}
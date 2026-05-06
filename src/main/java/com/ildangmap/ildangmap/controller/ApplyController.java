package com.ildangmap.ildangmap.controller;

import com.ildangmap.ildangmap.domain.job.Job;
import com.ildangmap.ildangmap.domain.job.JobRepository;
import com.ildangmap.ildangmap.domain.match.Match;
import com.ildangmap.ildangmap.domain.match.MatchRepository;
import com.ildangmap.ildangmap.domain.schedule.Schedule;
import com.ildangmap.ildangmap.domain.schedule.ScheduleRepository;
import com.ildangmap.ildangmap.domain.user.User;
import com.ildangmap.ildangmap.domain.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ApplyController {

    private final JobRepository jobRepository;
    private final UserRepository userRepository;
    private final MatchRepository matchRepository;
    private final ScheduleRepository scheduleRepository;

    @PostMapping("/apply")
    public String apply(@RequestParam Long jobId, @RequestParam Long userId) {

        Job job = jobRepository.findById(jobId).orElseThrow();
        User user = userRepository.findById(userId).orElseThrow();

        // 🔥 builder로 통일 (setter 금지)
        Match match = Match.builder()
                .jobId(job.getId())
                .userId(user.getId())
                .status("APPLIED")
                .build();

        matchRepository.save(match);

        // 🔥 schedule도 builder로
        Schedule schedule = Schedule.builder()
                .jobId(job.getId())
                .title(job.getTitle())
                .workerName(user.getName())
                .date("2026-05-03")
                .build();

        scheduleRepository.save(schedule);

        return "지원 완료";
    }
}
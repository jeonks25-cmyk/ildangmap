package com.ildangmap.ildangmap.controller;

import com.ildangmap.ildangmap.domain.job.Job;
import com.ildangmap.ildangmap.domain.job.JobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/jobs")
@CrossOrigin(origins = "*")
public class JobController {

    private final JobRepository jobRepository;

    @GetMapping
    public List<Job> getJobs() {
        return jobRepository.findAll();
    }
}
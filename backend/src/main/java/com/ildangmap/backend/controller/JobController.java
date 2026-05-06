package com.ildangmap.backend.controller;

import com.ildangmap.backend.entity.Job;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/jobs")
@CrossOrigin(origins = "*")
public class JobController {

    private final List<Job> jobs = new ArrayList<>();

    public JobController() {

        Job job1 = new Job();
        job1.setId(1L);
        job1.setTitle("아파트 필름 보조");
        job1.setLocation("대전 서구");
        job1.setPay("150000");
        job1.setLat(36.3504);
        job1.setLng(127.3845);

        Job job2 = new Job();
        job2.setId(2L);
        job2.setTitle("상가 필름 시공");
        job2.setLocation("대전 중구");
        job2.setPay("200000");
        job2.setLat(36.3287);
        job2.setLng(127.4220);

        Job job3 = new Job();
        job3.setId(3L);
        job3.setTitle("학원 필름 작업");
        job3.setLocation("세종");
        job3.setPay("180000");
        job3.setLat(36.4800);
        job3.setLng(127.2890);

        jobs.add(job1);
        jobs.add(job2);
        jobs.add(job3);
    }

    @GetMapping
    public List<Job> getJobs() {
        return jobs;
    }

    @PostMapping
    public Job createJob(@RequestBody Job job) {

        job.setId((long) (jobs.size() + 1));

        jobs.add(job);

        return job;
    }
}
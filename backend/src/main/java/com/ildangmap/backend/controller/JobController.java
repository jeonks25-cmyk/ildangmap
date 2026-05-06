package com.ildangmap.backend.controller;

import com.ildangmap.backend.entity.Job;
import com.ildangmap.backend.repository.JobRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/jobs")
@CrossOrigin(origins = "*")
public class JobController {

    private final JobRepository jobRepository;

    public JobController(JobRepository jobRepository) {
        this.jobRepository = jobRepository;

        // 최초 데이터 자동 생성
        if (jobRepository.count() == 0) {

            Job job1 = new Job();
            job1.setTitle("아파트 필름 보조");
            job1.setLocation("대전 서구");
            job1.setPay("150000");
            job1.setLat(36.3504);
            job1.setLng(127.3845);

            Job job2 = new Job();
            job2.setTitle("상가 필름 시공");
            job2.setLocation("대전 중구");
            job2.setPay("200000");
            job2.setLat(36.3287);
            job2.setLng(127.4239);

            Job job3 = new Job();
            job3.setTitle("학원 필름 작업");
            job3.setLocation("세종");
            job3.setPay("180000");
            job3.setLat(36.4800);
            job3.setLng(127.2890);

            jobRepository.save(job1);
            jobRepository.save(job2);
            jobRepository.save(job3);
        }
    }

    @GetMapping
    public List<Job> getJobs() {
        return jobRepository.findAll();
    }

    @PostMapping
    public Job createJob(@RequestBody Job job) {
        return jobRepository.save(job);
    }
}
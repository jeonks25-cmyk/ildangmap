package com.ildangmap.ildangmap.config;

import com.ildangmap.ildangmap.domain.job.Job;
import com.ildangmap.ildangmap.domain.job.JobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataLoader implements CommandLineRunner {

    private final JobRepository jobRepository;

    @Override
    public void run(String... args) {
        if (jobRepository.count() == 0) {
            Job job1 = Job.builder()
                    .title("상가 필름")
                    .location("대전 중구")
                    .pay("200000원")
                    .lat(36.3504)
                    .lng(127.3845)
                    .build();

            Job job2 = Job.builder()
                    .title("아파트 필름")
                    .location("대전 서구")
                    .pay("180000원")
                    .lat(36.3510)
                    .lng(127.3830)
                    .build();

            jobRepository.save(job1);
            jobRepository.save(job2);
        }
    }
}
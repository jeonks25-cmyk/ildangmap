package com.ildangmap.config;

import com.ildangmap.domain.job.Job;
import com.ildangmap.domain.job.JobStatus;
import com.ildangmap.repository.JobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

@Component
@Profile("smoke")
@RequiredArgsConstructor
public class JobSmokeDataLoader implements ApplicationRunner {

    private final JobRepository jobRepository;

    @Override
    public void run(ApplicationArguments args) {
        if (jobRepository.count() > 0) {
            return;
        }

        jobRepository.save(buildJob(
                1L,
                "둔산동 상가 필름 기공",
                "film",
                "140000",
                "대전 서구 둔산동",
                "대전 서구 둔산대로 123",
                36.3560000,
                127.3780000,
                1.20,
                false
        ));

        jobRepository.save(buildJob(
                2L,
                "유성구 아파트 필름 보조",
                "film",
                "120000",
                "대전 유성구 봉명동",
                "대전 유성구 대학로 99",
                36.3620000,
                127.3450000,
                2.40,
                false
        ));
    }

    private Job buildJob(
            Long ownerUserId,
            String title,
            String trade,
            String payAmount,
            String shortAddress,
            String fullAddress,
            double lat,
            double lng,
            double distanceKm,
            boolean nightWork
    ) {
        return Job.builder()
                .ownerUserId(ownerUserId)
                .title(title)
                .trade(trade)
                .role("기공")
                .payAmount(new BigDecimal(payAmount))
                .workDate(LocalDate.now())
                .startTime(LocalTime.of(8, 0))
                .endTime(LocalTime.of(17, 0))
                .locationText(shortAddress + " 현장")
                .shortAddress(shortAddress)
                .fullAddress(fullAddress)
                .lat(lat)
                .lng(lng)
                .distanceKm(BigDecimal.valueOf(distanceKm))
                .workType("FULL_DAY")
                .status(JobStatus.RECRUITING)
                .parkingAvailable(true)
                .mealProvided(true)
                .nightWork(nightWork)
                .longTerm(false)
                .build();
    }
}

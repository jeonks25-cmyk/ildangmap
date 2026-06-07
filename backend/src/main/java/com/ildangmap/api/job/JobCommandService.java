package com.ildangmap.api.job;

import com.ildangmap.api.job.dto.JobCreateRequest;
import com.ildangmap.api.job.dto.JobSummaryResponse;
import com.ildangmap.domain.job.Job;
import com.ildangmap.domain.job.JobStatus;
import com.ildangmap.repository.JobRepository;
import com.ildangmap.service.SessionUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class JobCommandService {

    private static final Pattern WORK_TIME_PATTERN = Pattern.compile("(\\d{1,2}:\\d{2})\\s*~\\s*(\\d{1,2}:\\d{2})");
    private static final Long DEFAULT_OWNER_USER_ID = 1L;

    private final JobRepository jobRepository;
    private final SessionUserService sessionUserService;

    @Transactional
    public JobSummaryResponse createJob(JobCreateRequest request) {
        String shortAddress = resolveShortAddress(request);
        String fullAddress = StringUtils.hasText(request.getFullAddress()) ? request.getFullAddress() : shortAddress;
        String craft = StringUtils.hasText(request.getCraft()) ? request.getCraft() : "film";
        String role = StringUtils.hasText(request.getRole())
                ? request.getRole()
                : (StringUtils.hasText(request.getTrade()) ? request.getTrade() : "기공");
        LocalDate workDate = request.getWorkDate() != null ? request.getWorkDate() : LocalDate.now();
        LocalTime[] workTimes = parseWorkTimeRange(request.getWorkTime());

        Optional<Long> sessionOwnerId = sessionUserService.resolveCurrentUserId();
        long ownerUserId = sessionOwnerId.orElseGet(() ->
                request.getOwnerUserId() != null ? request.getOwnerUserId() : DEFAULT_OWNER_USER_ID);

        Job job = Job.builder()
                .ownerUserId(ownerUserId)
                .title(request.getTitle().trim())
                .trade(craft)
                .role(role)
                .payAmount(resolvePayAmount(request))
                .workDate(workDate)
                .startTime(workTimes[0])
                .endTime(workTimes[1])
                .locationText(StringUtils.hasText(request.getLocationText()) ? request.getLocationText() : shortAddress)
                .shortAddress(shortAddress)
                .fullAddress(fullAddress)
                .lat(request.getLat())
                .lng(request.getLng())
                .distanceKm(request.getDistanceKm() != null ? request.getDistanceKm() : BigDecimal.ZERO)
                .workType(mapWorkTypeToEntity(request.getWorkType()))
                .status(JobStatus.RECRUITING)
                .parkingAvailable(true)
                .mealProvided(false)
                .nightWork(Boolean.TRUE.equals(request.getUrgent()))
                .longTerm(false)
                .build();

        Job saved = jobRepository.save(job);
        return JobSummaryMapper.toResponse(saved);
    }

    private String resolveShortAddress(JobCreateRequest request) {
        if (StringUtils.hasText(request.getShortAddress())) {
            return request.getShortAddress().trim();
        }
        if (StringUtils.hasText(request.getAddress())) {
            return request.getAddress().trim();
        }
        if (StringUtils.hasText(request.getLocation())) {
            return request.getLocation().trim();
        }
        if (StringUtils.hasText(request.getLocationText())) {
            return request.getLocationText().trim();
        }
        return "주소 미입력";
    }

    private BigDecimal resolvePayAmount(JobCreateRequest request) {
        if (request.getPayAmount() != null) {
            return request.getPayAmount();
        }
        if (!StringUtils.hasText(request.getPay())) {
            return BigDecimal.ZERO;
        }
        String digits = request.getPay().replaceAll("[^0-9]", "");
        if (digits.isEmpty()) {
            return BigDecimal.ZERO;
        }
        return new BigDecimal(digits);
    }

    private String mapWorkTypeToEntity(String workType) {
        if (!StringUtils.hasText(workType)) {
            return "FULL_DAY";
        }
        String normalized = workType.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "FULLDAY", "FULL_DAY" -> "FULL_DAY";
            case "MORNING" -> "MORNING";
            case "AFTERNOON" -> "AFTERNOON";
            case "SHORTHELP", "SHORT_HELP" -> "SHORT_HELP";
            default -> workType.trim();
        };
    }

    private LocalTime[] parseWorkTimeRange(String workTime) {
        if (!StringUtils.hasText(workTime)) {
            return new LocalTime[] { LocalTime.of(8, 0), LocalTime.of(17, 0) };
        }
        Matcher matcher = WORK_TIME_PATTERN.matcher(workTime.trim());
        if (!matcher.find()) {
            return new LocalTime[] { LocalTime.of(8, 0), LocalTime.of(17, 0) };
        }
        return new LocalTime[] { LocalTime.parse(matcher.group(1)), LocalTime.parse(matcher.group(2)) };
    }
}

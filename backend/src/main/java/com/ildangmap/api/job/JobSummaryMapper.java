package com.ildangmap.api.job;

import com.ildangmap.api.job.dto.ApplicantSummaryResponse;
import com.ildangmap.api.job.dto.JobSummaryResponse;
import com.ildangmap.domain.application.JobApplication;
import com.ildangmap.domain.application.JobApplicationStatus;
import com.ildangmap.domain.job.Job;
import com.ildangmap.domain.job.JobStatus;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.Collections;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;

public final class JobSummaryMapper {

    private static final Long SELF_APPLICANT_USER_ID = 1L;
    private static final String SELF_WORKER_ID = "self-worker-mvp";
    private static final int DEFAULT_MAX_APPLICANTS = 5;
    private static final int SHORT_HELP_MAX_APPLICANTS = 1;

    private static final EnumSet<JobApplicationStatus> ACTIVE_APPLICATION_STATUSES =
            EnumSet.of(JobApplicationStatus.PENDING, JobApplicationStatus.ACCEPTED);

    private static final NumberFormat PAY_FORMAT = NumberFormat.getInstance(Locale.KOREA);

    private JobSummaryMapper() {
    }

    public static JobSummaryResponse toResponse(Job job) {
        return toResponse(job, Collections.emptyList());
    }

    public static JobSummaryResponse toResponse(Job job, List<JobApplication> applications) {
        List<JobApplication> safeApplications = applications != null ? applications : Collections.emptyList();
        int maxApplicantCount = resolveMaxApplicantCount(job);
        int currentApplicantCount = (int) safeApplications.stream()
                .filter(application -> ACTIVE_APPLICATION_STATUSES.contains(application.getStatus()))
                .count();

        String pay = formatPay(job.getPayAmount());
        String craft = job.getTrade();
        String address = job.getShortAddress();
        boolean urgent = job.isNightWork();
        boolean liveHelp = job.isShortHelpJob();

        return JobSummaryResponse.builder()
                .id(job.getId())
                .title(job.getTitle())
                .pay(pay)
                .lat(job.getLat())
                .lng(job.getLng())
                .craft(craft)
                .address(address)
                .urgent(urgent)
                .shortAddress(address)
                .fullAddress(job.getFullAddress())
                .payAmount(job.getPayAmount())
                .trade(craft)
                .workType(mapWorkType(job.getWorkType()))
                .status(mapStatus(job.getStatus()))
                .distanceKm(job.getDistanceKm())
                .isUrgent(urgent)
                .workDate(job.getWorkDate())
                .liveHelp(liveHelp)
                .ownerUserId(job.getOwnerUserId())
                .applicants(safeApplications.stream().map(JobSummaryMapper::toApplicantResponse).toList())
                .currentApplicantCount(currentApplicantCount)
                .maxApplicantCount(maxApplicantCount)
                .build();
    }

    public static ApplicantSummaryResponse toApplicantResponse(JobApplication application) {
        String workerId = SELF_APPLICANT_USER_ID.equals(application.getApplicantUserId())
                ? SELF_WORKER_ID
                : "user-" + application.getApplicantUserId();

        return ApplicantSummaryResponse.builder()
                .id(application.getId())
                .name(resolveApplicantName(application.getApplicantUserId()))
                .role(application.getRole())
                .status(mapApplicantStatus(application.getStatus()))
                .workerId(workerId)
                .build();
    }

    private static String resolveApplicantName(Long applicantUserId) {
        if (SELF_APPLICANT_USER_ID.equals(applicantUserId)) {
            return "김준호";
        }
        return "지원자" + applicantUserId;
    }

    private static String mapApplicantStatus(JobApplicationStatus status) {
        if (status == JobApplicationStatus.ACCEPTED) {
            return "confirmed";
        }
        if (status == JobApplicationStatus.REJECTED) {
            return "rejected";
        }
        return "applied";
    }

    public static int resolveMaxApplicantCount(Job job) {
        if (job.isShortHelpJob()) {
            return SHORT_HELP_MAX_APPLICANTS;
        }
        return DEFAULT_MAX_APPLICANTS;
    }

    private static String formatPay(BigDecimal payAmount) {
        if (payAmount == null) {
            return "";
        }
        return PAY_FORMAT.format(payAmount) + "원";
    }

    private static String mapStatus(JobStatus status) {
        if (status == null) {
            return "recruiting";
        }
        return switch (status) {
            case RECRUITING -> "recruiting";
            case FULL -> "full";
            case CONFIRMED -> "confirmed";
            case WORKING -> "working";
            case COMPLETED -> "completed";
            case CANCELLED -> "cancelled";
        };
    }

    private static String mapWorkType(String workType) {
        if (workType == null || workType.isBlank()) {
            return "fullDay";
        }
        String normalized = workType.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "FULL_DAY" -> "fullDay";
            case "MORNING" -> "morning";
            case "AFTERNOON" -> "afternoon";
            case "SHORT_HELP" -> "shortHelp";
            default -> workType.trim();
        };
    }
}

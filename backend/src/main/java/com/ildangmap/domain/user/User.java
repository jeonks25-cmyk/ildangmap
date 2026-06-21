package com.ildangmap.domain.user;

import com.ildangmap.global.persistence.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Entity
@Table(
        name = "users",
        indexes = {
                @Index(name = "idx_users_email", columnList = "email", unique = true),
                @Index(name = "idx_users_provider", columnList = "provider, provider_id", unique = true),
                @Index(name = "uk_users_display_nickname", columnList = "display_nickname", unique = true)
        }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 120)
    private String email;

    /** 카카오 프로필 닉네임 — 내부 전용, API 미노출 (기존 name 컬럼 재사용) */
    @Column(name = "name", nullable = false, length = 60)
    private String kakaoName;

    /** 공개 활동명 — 자유게시판·UI 표시용 */
    @Column(name = "display_nickname", length = 16, unique = true)
    private String displayNickname;

    @Column(name = "display_nickname_changed_at")
    private LocalDateTime displayNicknameChangedAt;

    @Column(length = 30)
    private String phone;

    @Column(nullable = false, length = 80)
    private String region;

    @Enumerated(EnumType.STRING)
    @Column(name = "user_type", nullable = false, length = 20)
    private UserType userType;

    @Column(nullable = false, length = 30, columnDefinition = "VARCHAR(30)")
    private String provider;

    @Column(name = "provider_id", nullable = false, length = 80, columnDefinition = "VARCHAR(80)")
    private String providerId;

    @Column(name = "profile_image_url", length = 255, columnDefinition = "VARCHAR(255)")
    private String profileImageUrl;

    @Column(name = "birth_year")
    private Integer birthYear;

    @Column(length = 30)
    private String craft;

    @Column(name = "experience_years")
    private Integer experienceYears;

    @Column(name = "desired_pay")
    private Integer desiredPay;

    /** JSON array — ["대전","세종"] */
    @Column(name = "activity_regions", columnDefinition = "TEXT")
    private String activityRegionsJson;

    @Column(columnDefinition = "TEXT")
    private String intro;

    /** 현장 명함 — 상호명 */
    @Column(name = "business_name", length = 80)
    private String businessName;

    /** 직책 */
    @Column(name = "job_title", length = 40)
    private String jobTitle;

    @Column(name = "kakao_talk_id", length = 40)
    private String kakaoTalkId;

    @Column(name = "blog_url", length = 255)
    private String blogUrl;

    @Column(name = "instagram_url", length = 255)
    private String instagramUrl;

    @Column(name = "homepage_url", length = 255)
    private String homepageUrl;

    @Column(name = "portfolio_image_url", columnDefinition = "TEXT")
    private String portfolioImageUrl;

    /** 사업자등록번호 (선택, 10자리) */
    @Column(name = "business_reg_no", length = 12)
    private String businessRegNo;

    @Column(nullable = false)
    private boolean active;

    @Builder
    public User(
            String email,
            String kakaoName,
            String displayNickname,
            LocalDateTime displayNicknameChangedAt,
            String phone,
            String region,
            UserType userType,
            String provider,
            String providerId,
            String profileImageUrl,
            Integer birthYear,
            String craft,
            Integer experienceYears,
            Integer desiredPay,
            String activityRegionsJson,
            String intro,
            String businessName,
            String jobTitle,
            String kakaoTalkId,
            String blogUrl,
            String instagramUrl,
            String homepageUrl,
            String portfolioImageUrl,
            String businessRegNo,
            boolean active
    ) {
        this.email = email;
        this.kakaoName = kakaoName;
        this.displayNickname = displayNickname;
        this.displayNicknameChangedAt = displayNicknameChangedAt;
        this.phone = phone;
        this.region = region;
        this.userType = userType;
        this.provider = provider;
        this.providerId = providerId;
        this.profileImageUrl = profileImageUrl;
        this.birthYear = birthYear;
        this.craft = craft;
        this.experienceYears = experienceYears;
        this.desiredPay = desiredPay;
        this.activityRegionsJson = activityRegionsJson;
        this.intro = intro;
        this.businessName = businessName;
        this.jobTitle = jobTitle;
        this.kakaoTalkId = kakaoTalkId;
        this.blogUrl = blogUrl;
        this.instagramUrl = instagramUrl;
        this.homepageUrl = homepageUrl;
        this.portfolioImageUrl = portfolioImageUrl;
        this.businessRegNo = businessRegNo;
        this.active = active;
    }

    public void updateOAuthProfile(String email, String kakaoName, String profileImageUrl) {
        if (email != null) {
            this.email = email;
        }
        if (kakaoName != null && !kakaoName.isBlank()) {
            this.kakaoName = kakaoName;
        }
        if (profileImageUrl != null) {
            this.profileImageUrl = profileImageUrl;
        }
    }

    public void setInitialDisplayNickname(String nickname) {
        this.displayNickname = nickname;
        // 최초 설정은 쿨다운 시작점이 아님 — PATCH 변경 시에만 changedAt 갱신
    }

    public void changeDisplayNickname(String nickname, LocalDateTime at) {
        this.displayNickname = nickname;
        this.displayNicknameChangedAt = at;
    }

    public boolean hasDisplayNickname() {
        return displayNickname != null && !displayNickname.isBlank();
    }

    public void updateProfileDetails(
            Integer birthYear,
            String craft,
            Integer experienceYears,
            Integer desiredPay,
            List<String> activityRegions,
            String phone,
            String intro,
            String businessName,
            String jobTitle,
            String kakaoTalkId,
            String blogUrl,
            String instagramUrl,
            String homepageUrl,
            String portfolioImageUrl,
            String businessRegNo
    ) {
        this.birthYear = birthYear;
        this.craft = craft;
        this.experienceYears = experienceYears;
        this.desiredPay = desiredPay;
        if (phone != null) {
            this.phone = phone.trim();
        }
        if (intro != null) {
            this.intro = intro.trim();
        }
        if (activityRegions != null && !activityRegions.isEmpty()) {
            this.activityRegionsJson = String.join(",", activityRegions);
            this.region = activityRegions.get(0);
        }
        this.businessName = trimToNull(businessName);
        this.jobTitle = trimToNull(jobTitle);
        this.kakaoTalkId = trimToNull(kakaoTalkId);
        this.blogUrl = trimToNull(blogUrl);
        this.instagramUrl = trimToNull(instagramUrl);
        this.homepageUrl = trimToNull(homepageUrl);
        this.portfolioImageUrl = trimToNull(portfolioImageUrl);
        this.businessRegNo = trimToNull(businessRegNo);
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public List<String> readActivityRegions() {
        if (activityRegionsJson == null || activityRegionsJson.isBlank()) {
            if (region != null && !region.isBlank()) {
                return List.of(region.trim());
            }
            return List.of("대전");
        }
        return List.of(activityRegionsJson.split(","))
                .stream()
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }
}

package com.ildangmap.service;

import com.ildangmap.config.OAuth2AttributeUtils;
import com.ildangmap.api.user.dto.MeResponse;
import com.ildangmap.api.user.dto.NicknameAvailabilityResponse;
import com.ildangmap.api.user.dto.ProfileUpdateRequest;
import com.ildangmap.domain.user.NicknameChangeHistory;
import com.ildangmap.domain.user.User;
import com.ildangmap.global.exception.BadRequestException;
import com.ildangmap.global.exception.ConflictException;
import com.ildangmap.global.exception.ResourceNotFoundException;
import com.ildangmap.global.exception.UnauthorizedException;
import com.ildangmap.repository.NicknameChangeHistoryRepository;
import com.ildangmap.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final int NICKNAME_MIN = 2;
    private static final int NICKNAME_MAX = 16;
    private static final Pattern NICKNAME_PATTERN = Pattern.compile("^[가-힣a-zA-Z0-9]+$");
    private static final List<String> ALLOWED_CRAFTS = List.of(
            "film", "wallpaper", "tile", "electric", "facility", "paint", "other"
    );

    private final UserRepository userRepository;
    private final NicknameChangeHistoryRepository nicknameChangeHistoryRepository;

    @Transactional(readOnly = true)
    public User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("사용자를 찾을 수 없습니다. id=" + userId));
    }

    @Transactional(readOnly = true)
    public Optional<User> findByOAuth2User(OAuth2User oauth2User) {
        String provider = OAuth2AttributeUtils.nonBlankOrDefault(
                OAuth2AttributeUtils.read(oauth2User, "provider"), "kakao");
        String providerId = OAuth2AttributeUtils.read(oauth2User, "providerId");
        if (!StringUtils.hasText(providerId)) {
            providerId = OAuth2AttributeUtils.read(oauth2User, "id");
        }
        if (!StringUtils.hasText(providerId)) {
            return Optional.empty();
        }
        return userRepository.findByProviderAndProviderId(provider, providerId);
    }

    @Transactional(readOnly = true)
    public MeResponse getMeForOAuth2User(OAuth2User oauth2User) {
        return findByOAuth2User(oauth2User)
                .map(this::toMeResponse)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public MeResponse getMeForUserId(Long userId) {
        return toMeResponse(getUser(userId));
    }

    @Transactional
    public User upsertFromOAuth2(OAuth2User oauth2User) {
        String provider = OAuth2AttributeUtils.nonBlankOrDefault(
                OAuth2AttributeUtils.read(oauth2User, "provider"), "kakao");
        String providerId = OAuth2AttributeUtils.read(oauth2User, "providerId");
        if (!StringUtils.hasText(providerId)) {
            providerId = OAuth2AttributeUtils.read(oauth2User, "id");
        }
        if (!StringUtils.hasText(providerId)) {
            throw new IllegalStateException("OAuth2 providerId is missing");
        }

        String kakaoName = OAuth2AttributeUtils.nonBlankOrDefault(
                OAuth2AttributeUtils.read(oauth2User, "kakaoName"), "kakao-user");
        String profileImageUrl = OAuth2AttributeUtils.nonBlankOrDefault(
                OAuth2AttributeUtils.read(oauth2User, "profileImageUrl"), "");

        Optional<User> existing = userRepository.findByProviderAndProviderId(provider, providerId);
        if (existing.isPresent()) {
            User user = existing.get();
            user.updateOAuthProfile(null, kakaoName, profileImageUrl);
            return userRepository.save(user);
        }

        User created = User.builder()
                .email(null)
                .kakaoName(kakaoName)
                .displayNickname(null)
                .displayNicknameChangedAt(null)
                .phone("")
                .region("대전 서구")
                .userType(com.ildangmap.domain.user.UserType.WORKER)
                .provider(provider)
                .providerId(providerId)
                .profileImageUrl(profileImageUrl)
                .active(true)
                .build();
        return userRepository.save(created);
    }

    @Transactional(readOnly = true)
    public NicknameAvailabilityResponse checkNicknameAvailability(String rawNickname, Long excludeUserId) {
        String nickname = normalizeNickname(rawNickname);
        validateNicknameFormat(nickname);
        if (isNicknameTaken(nickname, excludeUserId)) {
            return NicknameAvailabilityResponse.builder()
                    .nickname(nickname)
                    .available(false)
                    .reason("ALREADY_TAKEN")
                    .build();
        }
        return NicknameAvailabilityResponse.builder()
                .nickname(nickname)
                .available(true)
                .reason(null)
                .build();
    }

    @Transactional
    public MeResponse setInitialNickname(Long userId, String rawNickname) {
        User user = getUser(userId);
        if (user.hasDisplayNickname()) {
            throw new ConflictException("NICKNAME_ALREADY_SET", "닉네임이 이미 설정되어 있습니다.");
        }
        String nickname = normalizeNickname(rawNickname);
        validateNicknameFormat(nickname);
        if (isNicknameTaken(nickname, userId)) {
            throw new ConflictException("NICKNAME_TAKEN", "이미 사용 중인 닉네임입니다.");
        }
        LocalDateTime now = LocalDateTime.now();
        user.setInitialDisplayNickname(nickname);
        userRepository.save(user);
        nicknameChangeHistoryRepository.save(
                NicknameChangeHistory.builder()
                        .user(user)
                        .fromNickname(null)
                        .toNickname(nickname)
                        .changedAt(now)
                        .build()
        );
        return toMeResponse(user);
    }

    @Transactional
    public MeResponse changeNickname(Long userId, String rawNickname) {
        User user = getUser(userId);
        if (!user.hasDisplayNickname()) {
            throw new BadRequestException("닉네임을 먼저 설정해주세요.");
        }
        String nickname = normalizeNickname(rawNickname);
        validateNicknameFormat(nickname);
        if (nickname.equals(user.getDisplayNickname())) {
            return toMeResponse(user);
        }
        if (isNicknameTaken(nickname, userId)) {
            throw new ConflictException("NICKNAME_TAKEN", "이미 사용 중인 닉네임입니다.");
        }
        LocalDateTime now = LocalDateTime.now();
        String previous = user.getDisplayNickname();
        user.changeDisplayNickname(nickname, now);
        userRepository.save(user);
        nicknameChangeHistoryRepository.save(
                NicknameChangeHistory.builder()
                        .user(user)
                        .fromNickname(previous)
                        .toNickname(nickname)
                        .changedAt(now)
                        .build()
        );
        return toMeResponse(user);
    }

    @Transactional
    public MeResponse updateProfileDetails(Long userId, ProfileUpdateRequest request) {
        User user = getUser(userId);
        String craft = request.getCraft();
        if (craft != null && !craft.isBlank() && !ALLOWED_CRAFTS.contains(craft.trim())) {
            throw new BadRequestException("공종 값이 올바르지 않습니다.");
        }
        List<String> regions = request.getRegions();
        if (regions != null) {
            regions = regions.stream()
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .distinct()
                    .limit(10)
                    .toList();
            if (regions.isEmpty()) {
                throw new BadRequestException("활동지역을 선택해주세요.");
            }
        }
        String businessRegNo = normalizeBusinessRegNo(request.getBusinessRegNo());
        user.updateProfileDetails(
                request.getBirthYear(),
                craft != null && !craft.isBlank() ? craft.trim() : null,
                request.getExperienceYears(),
                request.getDesiredPay(),
                regions,
                request.getPhone(),
                request.getIntro(),
                request.getBusinessName(),
                request.getJobTitle(),
                request.getKakaoTalkId(),
                request.getBlogUrl(),
                request.getInstagramUrl(),
                request.getHomepageUrl(),
                request.getPortfolioImageUrl(),
                businessRegNo
        );
        return toMeResponse(userRepository.save(user));
    }

    private String normalizeBusinessRegNo(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String digits = raw.replaceAll("[^0-9]", "");
        if (digits.isEmpty()) {
            return null;
        }
        if (digits.length() != 10) {
            throw new BadRequestException("사업자등록번호는 10자리 숫자입니다.");
        }
        return digits;
    }

    private boolean isNicknameTaken(String nickname, Long excludeUserId) {
        return userRepository.findByDisplayNickname(nickname)
                .map(u -> excludeUserId == null || !u.getId().equals(excludeUserId))
                .orElse(false);
    }

    private String normalizeNickname(String raw) {
        if (raw == null) {
            throw new BadRequestException("닉네임을 입력해주세요.");
        }
        return raw.trim();
    }

    private void validateNicknameFormat(String nickname) {
        if (nickname.length() < NICKNAME_MIN || nickname.length() > NICKNAME_MAX) {
            throw new BadRequestException("닉네임은 " + NICKNAME_MIN + "~" + NICKNAME_MAX + "자입니다.");
        }
        if (!NICKNAME_PATTERN.matcher(nickname).matches()) {
            throw new BadRequestException("닉네임은 한글·영문·숫자만 사용할 수 있습니다.");
        }
    }

    private MeResponse toMeResponse(User user) {
        boolean setupRequired = !user.hasDisplayNickname();
        return MeResponse.builder()
                .id(user.getId())
                .displayNickname(user.getDisplayNickname())
                .profileImageUrl(user.getProfileImageUrl())
                .nicknameSetupRequired(setupRequired)
                .userType(user.getUserType().name())
                .nicknameChangeAvailableAt(null)
                .canChangeNickname(true)
                .birthYear(user.getBirthYear())
                .craft(user.getCraft())
                .experienceYears(user.getExperienceYears())
                .desiredPay(user.getDesiredPay())
                .regions(user.readActivityRegions())
                .phone(StringUtils.hasText(user.getPhone()) ? user.getPhone() : null)
                .intro(StringUtils.hasText(user.getIntro()) ? user.getIntro() : null)
                .businessName(user.getBusinessName())
                .jobTitle(user.getJobTitle())
                .kakaoTalkId(user.getKakaoTalkId())
                .blogUrl(user.getBlogUrl())
                .instagramUrl(user.getInstagramUrl())
                .homepageUrl(user.getHomepageUrl())
                .portfolioImageUrl(user.getPortfolioImageUrl())
                .businessRegNo(user.getBusinessRegNo())
                .build();
    }

    public User requireUser(Long userId) {
        if (userId == null) {
            throw new UnauthorizedException("로그인이 필요합니다.");
        }
        return getUser(userId);
    }
}

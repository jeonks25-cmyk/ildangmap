package com.ildangmap.api.user.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class MeResponse {

    private Long id;
    /** 공개 활동명 — 카카오 이름 미포함 */
    private String displayNickname;
    private String profileImageUrl;
    private boolean nicknameSetupRequired;
    private String userType;
    /** 닉네임 변경 가능 시각 (ISO-8601). 최초 설정 전이거나 변경 가능하면 null */
    private String nicknameChangeAvailableAt;
    private boolean canChangeNickname;

    private Integer birthYear;
    private String craft;
    private Integer experienceYears;
    private Integer desiredPay;
    private List<String> regions;
    private String phone;
    private String intro;
}

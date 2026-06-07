package com.ildangmap.api.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class NicknameSetRequest {

    @NotBlank(message = "닉네임을 입력해주세요.")
    @Size(min = 2, max = 16, message = "닉네임은 2~16자입니다.")
    private String nickname;
}

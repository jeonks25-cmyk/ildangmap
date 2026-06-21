package com.ildangmap.service;

import com.ildangmap.api.user.dto.MeResponse;
import com.ildangmap.domain.user.NicknameChangeHistory;
import com.ildangmap.domain.user.User;
import com.ildangmap.domain.user.UserType;
import com.ildangmap.repository.NicknameChangeHistoryRepository;
import com.ildangmap.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceNicknameTest {

    @Mock
    UserRepository userRepository;

    @Mock
    NicknameChangeHistoryRepository nicknameChangeHistoryRepository;

    @InjectMocks
    UserService userService;

    User user;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .email("test@example.com")
                .kakaoName("카카오이름")
                .displayNickname(null)
                .displayNicknameChangedAt(null)
                .phone("")
                .region("대전 서구")
                .userType(UserType.WORKER)
                .provider("kakao")
                .providerId("123")
                .profileImageUrl("")
                .active(true)
                .build();
        org.springframework.test.util.ReflectionTestUtils.setField(user, "id", 1L);
    }

    @Test
    void setInitialNickname_allowsImmediateChangeAfterSetup() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.findByDisplayNickname("필름기공87")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(nicknameChangeHistoryRepository.save(any(NicknameChangeHistory.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        MeResponse afterSetup = userService.setInitialNickname(1L, "필름기공87");

        assertThat(afterSetup.getDisplayNickname()).isEqualTo("필름기공87");
        assertThat(afterSetup.isNicknameSetupRequired()).isFalse();
        assertThat(afterSetup.isCanChangeNickname()).isTrue();
        assertThat(user.getDisplayNicknameChangedAt()).isNull();

        when(userRepository.findByDisplayNickname("도배기공92")).thenReturn(Optional.empty());
        MeResponse afterChange = userService.changeNickname(1L, "도배기공92");

        assertThat(afterChange.getDisplayNickname()).isEqualTo("도배기공92");
        assertThat(afterChange.isCanChangeNickname()).isTrue();
        assertThat(afterChange.getNicknameChangeAvailableAt()).isNull();
    }

    @Test
    void changeNickname_allowsRepeatedChangeWithoutCooldown() {
        user.setInitialDisplayNickname("필름기공87");
        user.changeDisplayNickname("도배기공92", LocalDateTime.now().minusDays(1));
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.findByDisplayNickname("타일반장84")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(nicknameChangeHistoryRepository.save(any(NicknameChangeHistory.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        MeResponse afterChange = userService.changeNickname(1L, "타일반장84");

        assertThat(afterChange.getDisplayNickname()).isEqualTo("타일반장84");
        assertThat(afterChange.isCanChangeNickname()).isTrue();
    }

    @Test
    void setInitialNickname_savesHistory() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.findByDisplayNickname("필름기공87")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(nicknameChangeHistoryRepository.save(any(NicknameChangeHistory.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        userService.setInitialNickname(1L, "필름기공87");

        ArgumentCaptor<NicknameChangeHistory> captor = ArgumentCaptor.forClass(NicknameChangeHistory.class);
        verify(nicknameChangeHistoryRepository).save(captor.capture());
        assertThat(captor.getValue().getFromNickname()).isNull();
        assertThat(captor.getValue().getToNickname()).isEqualTo("필름기공87");
    }
}

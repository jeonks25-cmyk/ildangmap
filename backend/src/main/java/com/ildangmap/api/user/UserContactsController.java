package com.ildangmap.api.user;

import com.ildangmap.api.user.dto.ContactFavoriteRequest;
import com.ildangmap.api.user.dto.ContactGroupCreateRequest;
import com.ildangmap.api.user.dto.ContactGroupUpdateRequest;
import com.ildangmap.api.user.dto.ContactMemoRequest;
import com.ildangmap.api.user.dto.ContactsPayloadDto;
import com.ildangmap.global.api.ApiResponse;
import com.ildangmap.global.exception.UnauthorizedException;
import com.ildangmap.service.SessionUserService;
import com.ildangmap.service.UserContactsService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class UserContactsController {

    private final UserContactsService userContactsService;
    private final SessionUserService sessionUserService;

    @GetMapping({"/users/me/contacts", "/api/users/me/contacts"})
    @Operation(summary = "내 인원·그룹 조회", description = "계정에 저장된 인원 목록·그룹·즐겨찾기·메모를 반환합니다.")
    public ApiResponse<ContactsPayloadDto> getContacts(Authentication authentication) {
        Long userId = requireUserId(authentication);
        return ApiResponse.success(userContactsService.getContacts(userId));
    }

    @PutMapping({"/users/me/contacts", "/api/users/me/contacts"})
    @Operation(summary = "내 인원·그룹 저장", description = "계정 인원 스냅샷 전체를 저장합니다.")
    public ApiResponse<ContactsPayloadDto> saveContacts(
            @Valid @RequestBody ContactsPayloadDto request,
            Authentication authentication
    ) {
        Long userId = requireUserId(authentication);
        return ApiResponse.success("인원 정보를 저장했습니다.", userContactsService.saveContacts(userId, request));
    }

    @PostMapping({"/users/me/contacts/groups", "/api/users/me/contacts/groups"})
    @Operation(summary = "그룹 생성")
    public ApiResponse<ContactsPayloadDto> createGroup(
            @Valid @RequestBody ContactGroupCreateRequest request,
            Authentication authentication
    ) {
        Long userId = requireUserId(authentication);
        return ApiResponse.success("그룹을 만들었습니다.", userContactsService.createGroup(userId, request));
    }

    @PatchMapping({"/users/me/contacts/groups/{groupId}", "/api/users/me/contacts/groups/{groupId}"})
    @Operation(summary = "그룹 수정")
    public ApiResponse<ContactsPayloadDto> updateGroup(
            @PathVariable String groupId,
            @Valid @RequestBody ContactGroupUpdateRequest request,
            Authentication authentication
    ) {
        Long userId = requireUserId(authentication);
        return ApiResponse.success("그룹을 수정했습니다.", userContactsService.updateGroup(userId, groupId, request));
    }

    @DeleteMapping({"/users/me/contacts/groups/{groupId}", "/api/users/me/contacts/groups/{groupId}"})
    @Operation(summary = "그룹 삭제")
    public ApiResponse<ContactsPayloadDto> deleteGroup(
            @PathVariable String groupId,
            Authentication authentication
    ) {
        Long userId = requireUserId(authentication);
        return ApiResponse.success("그룹을 삭제했습니다.", userContactsService.deleteGroup(userId, groupId));
    }

    @PatchMapping({"/users/me/contacts/{contactId}/favorite", "/api/users/me/contacts/{contactId}/favorite"})
    @Operation(summary = "즐겨찾기 저장")
    public ApiResponse<ContactsPayloadDto> setFavorite(
            @PathVariable String contactId,
            @Valid @RequestBody ContactFavoriteRequest request,
            Authentication authentication
    ) {
        Long userId = requireUserId(authentication);
        return ApiResponse.success(
                "즐겨찾기를 저장했습니다.",
                userContactsService.setFavorite(userId, contactId, Boolean.TRUE.equals(request.getFavorite())));
    }

    @PatchMapping({"/users/me/contacts/{contactId}/memo", "/api/users/me/contacts/{contactId}/memo"})
    @Operation(summary = "메모 저장")
    public ApiResponse<ContactsPayloadDto> setMemo(
            @PathVariable String contactId,
            @Valid @RequestBody ContactMemoRequest request,
            Authentication authentication
    ) {
        Long userId = requireUserId(authentication);
        return ApiResponse.success(
                "메모를 저장했습니다.", userContactsService.setMemo(userId, contactId, request.getMemo()));
    }

    private Long requireUserId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new UnauthorizedException("로그인이 필요합니다.");
        }
        Object principal = authentication.getPrincipal();
        if (!(principal instanceof OAuth2User)) {
            throw new UnauthorizedException("로그인이 필요합니다.");
        }
        return sessionUserService
                .resolveCurrentUserId()
                .orElseThrow(() -> new UnauthorizedException("로그인이 필요합니다."));
    }
}

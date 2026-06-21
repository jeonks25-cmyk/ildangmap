package com.ildangmap.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ildangmap.api.user.dto.ContactGroupCreateRequest;
import com.ildangmap.api.user.dto.ContactGroupUpdateRequest;
import com.ildangmap.api.user.dto.ContactsPayloadDto;
import com.ildangmap.domain.contact.UserContactsData;
import com.ildangmap.global.exception.BadRequestException;
import com.ildangmap.global.exception.ResourceNotFoundException;
import com.ildangmap.repository.UserContactsDataRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserContactsService {

    private static final TypeReference<ContactsPayloadDto> PAYLOAD_TYPE = new TypeReference<>() {};

    private final UserContactsDataRepository repository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public ContactsPayloadDto getContacts(Long userId) {
        return repository.findByUserId(userId).map(this::deserialize).orElseGet(ContactsPayloadDto::empty);
    }

    @Transactional
    public ContactsPayloadDto saveContacts(Long userId, ContactsPayloadDto payload) {
        ContactsPayloadDto normalized = normalize(payload);
        String json = serialize(normalized);
        UserContactsData entity =
                repository.findByUserId(userId).orElseGet(() -> UserContactsData.createEmpty(userId));
        entity.replacePayload(json);
        repository.save(entity);
        return normalized;
    }

    @Transactional
    public ContactsPayloadDto createGroup(Long userId, ContactGroupCreateRequest request) {
        ContactsPayloadDto payload = getContacts(userId);
        String name = request.getName() != null ? request.getName().trim() : "";
        if (name.isEmpty()) {
            throw new BadRequestException("그룹 이름을 입력해 주세요.");
        }
        String groupId = "grp-" + Instant.now().toEpochMilli() + "-" + UUID.randomUUID().toString().substring(0, 4);
        Map<String, Object> group = new LinkedHashMap<>();
        group.put("id", groupId);
        group.put("name", name);
        group.put("sortOrder", payload.getGroups().size());
        group.put("createdAt", Instant.now().toString());
        if (request.getTradeHint() != null && !request.getTradeHint().isBlank()) {
            group.put("tradeHint", request.getTradeHint().trim());
        }
        payload.getGroups().add(group);
        payload.getMemberIdsByGroup().putIfAbsent(groupId, new ArrayList<>());
        return saveContacts(userId, payload);
    }

    @Transactional
    public ContactsPayloadDto updateGroup(Long userId, String groupId, ContactGroupUpdateRequest request) {
        ContactsPayloadDto payload = getContacts(userId);
        Map<String, Object> group = findGroup(payload, groupId);
        if (request.getName() != null) {
            String name = request.getName().trim();
            if (name.isEmpty()) {
                throw new BadRequestException("그룹 이름을 입력해 주세요.");
            }
            group.put("name", name);
        }
        if (request.getTradeHint() != null) {
            String hint = request.getTradeHint().trim();
            if (hint.isEmpty()) {
                group.remove("tradeHint");
            } else {
                group.put("tradeHint", hint);
            }
        }
        return saveContacts(userId, payload);
    }

    @Transactional
    public ContactsPayloadDto deleteGroup(Long userId, String groupId) {
        ContactsPayloadDto payload = getContacts(userId);
        boolean removed = payload.getGroups().removeIf(g -> groupId.equals(String.valueOf(g.get("id"))));
        if (!removed) {
            throw new ResourceNotFoundException("그룹을 찾을 수 없습니다.");
        }
        payload.getMemberIdsByGroup().remove(groupId);
        return saveContacts(userId, payload);
    }

    @Transactional
    public ContactsPayloadDto setFavorite(Long userId, String contactId, boolean favorite) {
        ContactsPayloadDto payload = getContacts(userId);
        if (favorite) {
            payload.getFavoriteById().put(contactId, true);
        } else {
            payload.getFavoriteById().remove(contactId);
        }
        return saveContacts(userId, payload);
    }

    @Transactional
    public ContactsPayloadDto setMemo(Long userId, String contactId, String memo) {
        ContactsPayloadDto payload = getContacts(userId);
        String clean = memo != null ? memo.trim() : "";
        if (clean.isEmpty()) {
            payload.getMemoById().remove(contactId);
        } else {
            payload.getMemoById().put(contactId, clean);
        }
        return saveContacts(userId, payload);
    }

    private Map<String, Object> findGroup(ContactsPayloadDto payload, String groupId) {
        return payload.getGroups().stream()
                .filter(g -> groupId.equals(String.valueOf(g.get("id"))))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("그룹을 찾을 수 없습니다."));
    }

    private ContactsPayloadDto normalize(ContactsPayloadDto payload) {
        ContactsPayloadDto next = payload != null ? payload : ContactsPayloadDto.empty();
        if (next.getFavoriteById() == null) next.setFavoriteById(new HashMap<>());
        if (next.getMemoById() == null) next.setMemoById(new HashMap<>());
        if (next.getContactOverridesById() == null) next.setContactOverridesById(new HashMap<>());
        if (next.getRemovedContactIds() == null) next.setRemovedContactIds(new ArrayList<>());
        if (next.getGroups() == null) next.setGroups(new ArrayList<>());
        if (next.getMemberIdsByGroup() == null) next.setMemberIdsByGroup(new HashMap<>());
        if (next.getAddedContacts() == null) next.setAddedContacts(new ArrayList<>());
        if (next.getCoworkHistory() == null) next.setCoworkHistory(new ArrayList<>());
        if (next.getCoworkProcessedScheduleIds() == null) next.setCoworkProcessedScheduleIds(new ArrayList<>());
        return next;
    }

    private ContactsPayloadDto deserialize(UserContactsData entity) {
        try {
            ContactsPayloadDto payload = objectMapper.readValue(entity.getPayloadJson(), PAYLOAD_TYPE);
            return normalize(payload);
        } catch (JsonProcessingException e) {
            return ContactsPayloadDto.empty();
        }
    }

    private String serialize(ContactsPayloadDto payload) {
        try {
            return objectMapper.writeValueAsString(normalize(payload));
        } catch (JsonProcessingException e) {
            throw new BadRequestException("연락처 데이터 형식이 올바르지 않습니다.");
        }
    }
}

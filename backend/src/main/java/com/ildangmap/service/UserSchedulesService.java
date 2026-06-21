package com.ildangmap.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ildangmap.api.user.dto.SchedulesPayloadDto;
import com.ildangmap.domain.schedule.UserSchedulesData;
import com.ildangmap.global.exception.BadRequestException;
import com.ildangmap.repository.UserSchedulesDataRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserSchedulesService {

    private static final TypeReference<SchedulesPayloadDto> PAYLOAD_TYPE = new TypeReference<>() {};

    private final UserSchedulesDataRepository repository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public SchedulesPayloadDto getSchedules(Long userId) {
        return repository.findByUserId(userId).map(this::deserialize).orElseGet(SchedulesPayloadDto::empty);
    }

    @Transactional
    public SchedulesPayloadDto saveSchedules(Long userId, SchedulesPayloadDto payload) {
        SchedulesPayloadDto normalized = normalize(payload);
        String json = serialize(normalized);
        UserSchedulesData entity =
                repository.findByUserId(userId).orElseGet(() -> UserSchedulesData.createEmpty(userId));
        entity.replacePayload(json);
        repository.save(entity);
        return normalized;
    }

    private SchedulesPayloadDto normalize(SchedulesPayloadDto payload) {
        SchedulesPayloadDto next = payload != null ? payload : SchedulesPayloadDto.empty();
        if (next.getSchedules() == null) next.setSchedules(new java.util.ArrayList<>());
        if (next.getFieldOps() == null) next.setFieldOps(new java.util.HashMap<>());
        return next;
    }

    private SchedulesPayloadDto deserialize(UserSchedulesData entity) {
        try {
            SchedulesPayloadDto payload = objectMapper.readValue(entity.getPayloadJson(), PAYLOAD_TYPE);
            return normalize(payload);
        } catch (JsonProcessingException e) {
            return SchedulesPayloadDto.empty();
        }
    }

    private String serialize(SchedulesPayloadDto payload) {
        try {
            return objectMapper.writeValueAsString(normalize(payload));
        } catch (JsonProcessingException e) {
            throw new BadRequestException("일정 데이터 형식이 올바르지 않습니다.");
        }
    }
}

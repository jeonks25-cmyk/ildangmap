package com.ildangmap.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ildangmap.api.user.dto.SchedulesPayloadDto;
import com.ildangmap.domain.schedule.UserSchedulesData;
import com.ildangmap.global.exception.BadRequestException;
import com.ildangmap.repository.UserSchedulesDataRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserSchedulesService {

    private static final TypeReference<SchedulesPayloadDto> PAYLOAD_TYPE = new TypeReference<>() {};

    private final UserSchedulesDataRepository repository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public SchedulesPayloadDto getSchedules(Long userId) {
        SchedulesPayloadDto payload =
                repository.findByUserId(userId).map(this::deserialize).orElseGet(SchedulesPayloadDto::empty);
        int scheduleCount = payload.getSchedules() != null ? payload.getSchedules().size() : 0;
        log.info("[getSchedules] userId={} scheduleCount={}", userId, scheduleCount);
        return payload;
    }

    @Transactional
    public SchedulesPayloadDto saveSchedules(Long userId, SchedulesPayloadDto payload) {
        SchedulesPayloadDto normalized = normalize(payload);
        int scheduleCount = normalized.getSchedules() != null ? normalized.getSchedules().size() : 0;
        String json = serialize(normalized);
        log.info(
                "[saveSchedules] userId={} scheduleCount={} payloadBytes={}",
                userId,
                scheduleCount,
                json.length());
        UserSchedulesData entity =
                repository.findByUserId(userId).orElseGet(() -> UserSchedulesData.createEmpty(userId));
        entity.replacePayload(json);
        repository.save(entity);
        log.info("[saveSchedules] saved userId={} entityId={} scheduleCount={}", userId, entity.getId(), scheduleCount);
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

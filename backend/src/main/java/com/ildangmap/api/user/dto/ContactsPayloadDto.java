package com.ildangmap.api.user.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ContactsPayloadDto {

    @Builder.Default
    private Map<String, Boolean> favoriteById = new HashMap<>();

    @Builder.Default
    private Map<String, String> memoById = new HashMap<>();

    @Builder.Default
    private Map<String, Map<String, Object>> contactOverridesById = new HashMap<>();

    @Builder.Default
    private List<String> removedContactIds = new ArrayList<>();

    @Builder.Default
    private List<Map<String, Object>> groups = new ArrayList<>();

    @Builder.Default
    private Map<String, List<String>> memberIdsByGroup = new HashMap<>();

    @Builder.Default
    private List<Map<String, Object>> addedContacts = new ArrayList<>();

    @Builder.Default
    private List<Map<String, Object>> coworkHistory = new ArrayList<>();

    @Builder.Default
    private List<String> coworkProcessedScheduleIds = new ArrayList<>();

    public static ContactsPayloadDto empty() {
        return ContactsPayloadDto.builder().build();
    }

    public boolean hasAnyData() {
        return !addedContacts.isEmpty()
                || !groups.isEmpty()
                || !favoriteById.isEmpty()
                || !memoById.isEmpty()
                || !contactOverridesById.isEmpty()
                || !removedContactIds.isEmpty()
                || !memberIdsByGroup.isEmpty()
                || !coworkHistory.isEmpty()
                || !coworkProcessedScheduleIds.isEmpty();
    }
}

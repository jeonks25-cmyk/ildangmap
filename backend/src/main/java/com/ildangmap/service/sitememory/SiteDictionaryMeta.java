package com.ildangmap.service.sitememory;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Getter;
import lombok.Setter;

import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;

@Getter
@Setter
public class SiteDictionaryMeta {

    private Map<String, Long> buildings = new LinkedHashMap<>();
    private Map<String, Long> crafts = new LinkedHashMap<>();
    private Set<String> aliases = new LinkedHashSet<>();

    private static final TypeReference<SiteDictionaryMeta> TYPE = new TypeReference<>() {};

    public static SiteDictionaryMeta empty() {
        return new SiteDictionaryMeta();
    }

    public static SiteDictionaryMeta fromJson(ObjectMapper objectMapper, String json) {
        if (json == null || json.isBlank()) {
            return empty();
        }
        try {
            SiteDictionaryMeta meta = objectMapper.readValue(json, TYPE);
            if (meta.buildings == null) meta.buildings = new LinkedHashMap<>();
            if (meta.crafts == null) meta.crafts = new LinkedHashMap<>();
            if (meta.aliases == null) meta.aliases = new LinkedHashSet<>();
            return meta;
        } catch (JsonProcessingException e) {
            return empty();
        }
    }

    public String toJson(ObjectMapper objectMapper) {
        try {
            return objectMapper.writeValueAsString(this);
        } catch (JsonProcessingException e) {
            return "{}";
        }
    }

    public void bumpBuilding(String building) {
        if (building == null || building.isBlank()) return;
        String key = building.trim();
        buildings.put(key, buildings.getOrDefault(key, 0L) + 1L);
    }

    public void bumpCraft(String craft) {
        if (craft == null || craft.isBlank()) return;
        String key = craft.trim();
        crafts.put(key, crafts.getOrDefault(key, 0L) + 1L);
    }

    public void addAlias(String alias) {
        if (alias == null || alias.isBlank()) return;
        aliases.add(alias.trim());
    }

    public boolean hasBuilding(String building) {
        return building != null && !building.isBlank() && buildings.containsKey(building.trim());
    }
}

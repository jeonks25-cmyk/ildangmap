package com.ildangmap.ildangmap.controller;

import com.ildangmap.ildangmap.domain.favorite.Favorite;
import com.ildangmap.ildangmap.domain.favorite.FavoriteRepository;
import com.ildangmap.ildangmap.domain.urgent.UrgentCall;
import com.ildangmap.ildangmap.domain.urgent.UrgentCallRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/urgent")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class UrgentCallController {

    private final UrgentCallRepository urgentCallRepository;
    private final FavoriteRepository favoriteRepository;

    // 전체 조회
    @GetMapping
    public List<UrgentCall> getAll() {
        return urgentCallRepository.findAll();
    }

    // 단골 기반 조회
    @GetMapping("/favorite/{workerName}")
    public List<UrgentCall> getFavoriteCalls(
            @PathVariable String workerName
    ) {
        List<Favorite> favorites =
                favoriteRepository.findByWorkerName(workerName);

        List<String> bossNames = favorites.stream()
                .map(Favorite::getBossName)
                .collect(Collectors.toList());

        return urgentCallRepository.findAll().stream()
                .filter(call -> bossNames.contains(call.getBossName()))
                .collect(Collectors.toList());
    }

    // 등록
    @PostMapping
    public String save(@RequestBody UrgentCall call) {
        call.setStatus("모집중");
        urgentCallRepository.save(call);
        return "등록 완료";
    }
}
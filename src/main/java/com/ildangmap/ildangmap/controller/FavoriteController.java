package com.ildangmap.ildangmap.controller;

import com.ildangmap.ildangmap.domain.favorite.Favorite;
import com.ildangmap.ildangmap.domain.favorite.FavoriteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/favorite")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class FavoriteController {

    private final FavoriteRepository favoriteRepository;

    // 즐겨찾기 등록
    @PostMapping
    public String saveFavorite(
            @RequestBody Favorite favorite
    ) {
        favoriteRepository.save(favorite);
        return "즐겨찾기 등록 완료";
    }

    // 내 즐겨찾기 조회
    @GetMapping("/{workerName}")
    public List<Favorite> getMyFavorites(
            @PathVariable String workerName
    ) {
        return favoriteRepository.findByWorkerName(workerName);
    }
}
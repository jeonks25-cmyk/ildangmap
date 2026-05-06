package com.ildangmap.ildangmap.controller;

import com.ildangmap.ildangmap.domain.match.Match;
import com.ildangmap.ildangmap.domain.match.MatchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/match")
@CrossOrigin(origins = "*")
public class MatchController {

    private final MatchRepository matchRepository;

    @PostMapping
    public String createMatch(@RequestParam Long jobId, @RequestParam Long userId) {

        Match match = Match.builder()
                .jobId(jobId)
                .userId(userId)
                .status("APPLIED")
                .build();

        matchRepository.save(match);

        return "매칭 완료";
    }
}
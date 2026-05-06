package com.ildangmap.ildangmap.controller;

import com.ildangmap.ildangmap.domain.penalty.Penalty;
import com.ildangmap.ildangmap.domain.penalty.PenaltyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/penalty")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class PenaltyController {

    private final PenaltyRepository penaltyRepository;

    // 패널티 등록
    @PostMapping
    public String savePenalty(@RequestBody Penalty penalty) {
        penalty.setCreatedDate(LocalDate.now().toString());
        penaltyRepository.save(penalty);

        return "패널티 등록 완료";
    }

    // 전체 패널티 조회
    @GetMapping
    public List<Penalty> getAllPenalty() {
        return penaltyRepository.findAll();
    }

    // 특정 사용자 패널티 조회
    @GetMapping("/{userName}")
    public List<Penalty> getUserPenalty(@PathVariable String userName) {
        return penaltyRepository.findByUserName(userName);
    }
}
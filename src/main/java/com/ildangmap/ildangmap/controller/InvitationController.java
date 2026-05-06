package com.ildangmap.ildangmap.controller;

import com.ildangmap.ildangmap.domain.invitation.*;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/invitation")
@CrossOrigin(origins = "*")
public class InvitationController {

    private final InvitationRepository invitationRepository;

    // 🔥 오야지 → 기술자 초대
    @PostMapping
    public Invitation invite(@RequestBody Invitation invitation) {
        invitation.setStatus("PENDING");
        return invitationRepository.save(invitation);
    }

    // 🔥 기술자 → 받은 초대 목록
    @GetMapping("/worker/{workerId}")
    public List<Invitation> getInvitations(@PathVariable Long workerId) {
        return invitationRepository.findByWorkerId(workerId);
    }

    // 🔥 수락
    @PostMapping("/accept/{id}")
    public Invitation accept(@PathVariable Long id) {
        Invitation inv = invitationRepository.findById(id).orElseThrow();
        inv.setStatus("ACCEPT");
        return invitationRepository.save(inv);
    }

    // 🔥 거절
    @PostMapping("/reject/{id}")
    public Invitation reject(@PathVariable Long id) {
        Invitation inv = invitationRepository.findById(id).orElseThrow();
        inv.setStatus("REJECT");
        return invitationRepository.save(inv);
    }
}
package com.ildangmap.ildangmap.domain.invitation;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InvitationRepository extends JpaRepository<Invitation, Long> {

    List<Invitation> findByWorkerId(Long workerId);
}
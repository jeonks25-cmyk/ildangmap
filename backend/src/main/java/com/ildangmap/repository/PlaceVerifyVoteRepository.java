package com.ildangmap.repository;

import com.ildangmap.domain.place.PlaceVerifyVote;
import com.ildangmap.domain.place.VerifyVoteType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PlaceVerifyVoteRepository extends JpaRepository<PlaceVerifyVote, Long> {
    Optional<PlaceVerifyVote> findByPlaceIdAndVoterId(Long placeId, Long voterId);

    long countByPlaceIdAndVote(Long placeId, VerifyVoteType vote);
}

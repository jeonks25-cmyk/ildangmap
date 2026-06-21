package com.ildangmap.domain.place;

import com.ildangmap.global.persistence.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
        name = "place_verify_vote",
        uniqueConstraints = @UniqueConstraint(name = "uk_place_verify_voter", columnNames = {"place_id", "voter_id"}),
        indexes = @Index(name = "idx_place_verify_place", columnList = "place_id")
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PlaceVerifyVote extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "place_id", nullable = false)
    private MapPlace place;

    @Column(name = "voter_id", nullable = false)
    private Long voterId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private VerifyVoteType vote;

    @Builder
    public PlaceVerifyVote(MapPlace place, Long voterId, VerifyVoteType vote) {
        this.place = place;
        this.voterId = voterId;
        this.vote = vote;
    }

    public void changeVote(VerifyVoteType next) {
        this.vote = next;
    }
}

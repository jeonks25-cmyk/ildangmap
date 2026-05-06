package com.ildangmap.ildangmap.domain.apply;

import com.ildangmap.ildangmap.domain.job.Job;
import com.ildangmap.ildangmap.domain.user.User;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Apply {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    private Job job;

    @ManyToOne
    private User user;
}
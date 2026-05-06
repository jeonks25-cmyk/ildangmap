package com.ildangmap.ildangmap.domain.urgent;

import jakarta.persistence.*;

@Entity
public class UrgentCall {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    private String region;
    private String pay;
    private String description;

    // 모집중 / 마감
    private String status;

    private String bossName;

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getRegion() { return region; }
    public String getPay() { return pay; }
    public String getDescription() { return description; }
    public String getStatus() { return status; }
    public String getBossName() { return bossName; }

    public void setId(Long id) { this.id = id; }
    public void setTitle(String title) { this.title = title; }
    public void setRegion(String region) { this.region = region; }
    public void setPay(String pay) { this.pay = pay; }
    public void setDescription(String description) { this.description = description; }
    public void setStatus(String status) { this.status = status; }
    public void setBossName(String bossName) { this.bossName = bossName; }
}
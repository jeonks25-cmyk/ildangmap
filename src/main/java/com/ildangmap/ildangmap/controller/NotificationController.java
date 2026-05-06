package com.ildangmap.ildangmap.controller;

import com.ildangmap.ildangmap.domain.notification.Notification;
import com.ildangmap.ildangmap.domain.notification.NotificationRepository;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/notification")
@CrossOrigin(origins = "http://localhost:3000")
public class NotificationController {

    private final NotificationRepository notificationRepository;

    public NotificationController(
            NotificationRepository notificationRepository
    ) {
        this.notificationRepository = notificationRepository;
    }

    /**
     * 알림 생성
     */
    @PostMapping
    public String createNotification(
            @RequestBody Notification notification
    ) {
        notification.setCreatedAt(LocalDateTime.now());
        notification.setIsRead(false);

        notificationRepository.save(notification);

        return "알림 생성 완료!";
    }

    /**
     * 특정 사용자 알림 조회
     */
    @GetMapping("/{userName}")
    public List<Notification> getNotifications(
            @PathVariable String userName
    ) {
        return notificationRepository
                .findByUserNameOrderByCreatedAtDesc(userName);
    }
}
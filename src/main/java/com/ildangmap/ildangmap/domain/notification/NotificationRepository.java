package com.ildangmap.ildangmap.domain.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NotificationRepository
        extends JpaRepository<Notification, Long> {

    List<Notification> findByUserNameOrderByCreatedAtDesc(
            String userName
    );
}
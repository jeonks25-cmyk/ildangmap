package com.ildangmap.repository;

import com.ildangmap.domain.scheduleboard.ScheduleBoardNotificationEvent;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScheduleBoardNotificationEventRepository extends JpaRepository<ScheduleBoardNotificationEvent, Long> {

    List<ScheduleBoardNotificationEvent> findByRecipientUserIdAndDeliveredAtIsNullOrderByCreatedAtDesc(
            Long recipientUserId);
}

package com.ildangmap.domain.contact;

import com.ildangmap.global.persistence.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
        name = "user_contacts_data",
        indexes = {
                @Index(name = "uk_user_contacts_user_id", columnList = "user_id", unique = true)
        }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserContactsData extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    /** 프론트 contacts store와 1:1 매핑되는 JSON 스냅샷 */
    @Column(name = "payload_json", nullable = false, columnDefinition = "LONGTEXT")
    private String payloadJson;

    @Builder
    public UserContactsData(Long userId, String payloadJson) {
        this.userId = userId;
        this.payloadJson = payloadJson != null ? payloadJson : "{}";
    }

    public static UserContactsData createEmpty(Long userId) {
        return UserContactsData.builder().userId(userId).payloadJson("{}").build();
    }

    public void replacePayload(String nextPayloadJson) {
        this.payloadJson = nextPayloadJson != null ? nextPayloadJson : "{}";
    }
}

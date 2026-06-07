INSERT INTO users (
    id, email, name, display_nickname, phone, region, user_type, provider, provider_id, profile_image_url, active, created_at, updated_at
) VALUES (
    1, 'worker1@ildangmap.local', 'kakao-internal-1', '김기공', '010-1111-2222', '대전 서구', 'WORKER', 'kakao', 'kakao-worker-1', '', true, NOW(), NOW()
) ON DUPLICATE KEY UPDATE updated_at = NOW();

INSERT INTO jobs (
    id, owner_user_id, title, trade, role, pay_amount, work_date, start_time, end_time,
    location_text, short_address, full_address, lat, lng, distance_km, work_type, status,
    parking_available, meal_provided, night_work, long_term, created_at, updated_at
) VALUES (
    1, 1, '둔산동 상가 필름 기공', 'film', '기공', 140000, CURDATE(), '08:00:00', '17:00:00',
    '둔산동 상가 현장', '대전 서구 둔산동', '대전 서구 둔산대로 123', 36.3560000, 127.3780000, 1.20,
    'FULL_DAY', 'RECRUITING', true, true, false, true, NOW(), NOW()
) ON DUPLICATE KEY UPDATE updated_at = NOW();

INSERT INTO jobs (
    id, owner_user_id, title, trade, role, pay_amount, work_date, start_time, end_time,
    location_text, short_address, full_address, lat, lng, distance_km, work_type, status,
    parking_available, meal_provided, night_work, long_term, created_at, updated_at
) VALUES (
    2, 1, '유성구 아파트 필름 보조', 'film', '보조', 120000, CURDATE(), '09:00:00', '15:00:00',
    '유성구 아파트 현장', '대전 유성구 봉명동', '대전 유성구 대학로 99', 36.3620000, 127.3450000, 2.40,
    'FULL_DAY', 'RECRUITING', true, false, false, false, NOW(), NOW()
) ON DUPLICATE KEY UPDATE updated_at = NOW();

INSERT INTO settlements (
    id, job_id, user_id, settlement_month, expected_amount, settled_amount, unpaid_amount,
    status, settled_date, memo, created_at, updated_at
) VALUES (
    1, 1, 1, DATE_FORMAT(CURDATE(), '%Y-%m'), 140000, 0, 140000,
    'PENDING', NULL, '첫 정산 데이터', NOW(), NOW()
) ON DUPLICATE KEY UPDATE updated_at = NOW();

INSERT INTO emergency_jobs (
    id, job_id, title, region, description, emergency_pay_amount, required_minutes,
    lat, lng, status, expires_at, created_at, updated_at
) VALUES (
    1, 1, '둔산동 필름 긴급헬프', '대전 서구', '2~3시간 보조 가능 기사 급구', 80000, 180,
    36.3560000, 127.3780000, 'OPEN', DATE_ADD(NOW(), INTERVAL 2 HOUR), NOW(), NOW()
) ON DUPLICATE KEY UPDATE updated_at = NOW();

INSERT INTO briefings (
    id, category, craft, title, summary, region, average_pay, trend, flow, published_at, active, created_at, updated_at
) VALUES (
    1, 'PRICE', 'film', '대전 필름 단가 안정적 유지', '현재 평균 단가는 15~17만 수준입니다.',
    '대전', '15~17만', '보합', '이번 주 대전권 필름 공고는 안정적으로 유지되고 있습니다.', NOW(), true, NOW(), NOW()
) ON DUPLICATE KEY UPDATE updated_at = NOW();

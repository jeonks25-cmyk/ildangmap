import React, { useCallback } from "react";
import {
  formatContactListMetaLine,
  getContactDisplayName,
} from "../../utils/fieldContactsMock";
import { usePersonCard } from "../../context/PersonCardContext";

const NONE_OUTLOOK = { state: "none", dot: "⚫", label: "일정 미공유" };

/**
 * 인력 배치 보드의 한 줄 — 정보 전용(압축).
 * 표시: 이름 / 출생년도 · 거주지역 / 가용 전망(언제부터 가능한지).
 * 상태(outlook)는 일정 카드 캘린더와 같은 useFieldScheduleStore 데이터에서 계산된 값을 prop으로 받는다.
 * 행을 누르면 기술자 일정 카드(FieldBusinessCardSheet)가 열린다.
 * 호출 행동(전화/카톡/현장초대)은 이 줄에 두지 않고 일정 카드 안에서만 한다.
 */
function ContactCardInner({ contact, outlook, onToggleFavoriteById }) {
  const { openPersonCard } = usePersonCard();

  const onMainClick = useCallback(() => {
    if (!contact) return;
    openPersonCard(contact);
  }, [contact, openPersonCard]);

  const onFavClick = useCallback(
    (e) => {
      e.stopPropagation();
      if (!contact) return;
      onToggleFavoriteById?.(contact.id);
    },
    [contact, onToggleFavoriteById]
  );

  if (!contact) return null;

  const displayName = getContactDisplayName(contact);
  const metaLine = formatContactListMetaLine(contact);
  const status = outlook || NONE_OUTLOOK;

  return (
    <div className="contact-board-row" role="listitem">
      <button
        type="button"
        className="contact-board-row__main contact-board-row__main--stacked"
        onClick={onMainClick}
        aria-label={`${displayName} 일정 보기`}
      >
        <span className="contact-board-row__top">
          <span className="contact-board-row__name">{displayName}</span>
          <span className={`contact-board-row__status contact-board-row__status--${status.state}`}>
            {status.dot} {status.label}
          </span>
        </span>
        {metaLine ? <span className="contact-board-row__sub">{metaLine}</span> : null}
      </button>

      <button
        type="button"
        className={`contact-board-row__fav${contact.favorite ? " is-on" : ""}`}
        onClick={onFavClick}
        aria-label={contact.favorite ? "즐겨찾기 해제" : "즐겨찾기"}
        aria-pressed={contact.favorite}
      >
        {contact.favorite ? "★" : "☆"}
      </button>
    </div>
  );
}

function contactVisualEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.id === b.id &&
    a.favorite === b.favorite &&
    a.name === b.name &&
    a.nickname === b.nickname &&
    a.birthYear === b.birthYear &&
    a.homeRegion === b.homeRegion &&
    a.basePay === b.basePay
  );
}

function outlookEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.state === b.state && a.label === b.label;
}

export default React.memo(ContactCardInner, (prev, next) => {
  if (!contactVisualEqual(prev.contact, next.contact)) return false;
  if (!outlookEqual(prev.outlook, next.outlook)) return false;
  if (prev.onToggleFavoriteById !== next.onToggleFavoriteById) return false;
  return true;
});

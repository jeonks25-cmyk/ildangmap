import React, { useEffect, useMemo, useState } from "react";
import { FIELD_CONTACTS_MOCK } from "../../utils/fieldContactsMock";
import { useContactsStore } from "../../store/useContactsStore";
import { useUiStore } from "../../store/useUiStore";
import { getUsers } from "../../api/usersApi";

function phoneDigits(value) {
  return String(value || "").replace(/[^\d]/g, "");
}

/**
 * 사람 추가 시트 (P0) — 일당맵 가입자 검색 + 직접 입력.
 * 추가된 사람은 어떤 그룹에도 자동 배정하지 않는다(전체 탭에만 표시).
 * 일정/구조화 초대/명함/그룹 시스템과 무관 — useContactsStore.addedContacts 만 사용.
 */
export default function PeopleAddSheet({ open, onClose, onAdded }) {
  const addedContacts = useContactsStore((s) => s.addedContacts);
  const addContact = useContactsStore((s) => s.addContact);
  const showAppToast = useUiStore((s) => s.showAppToast);

  const [directory, setDirectory] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [addedKeys, setAddedKeys] = useState(() => new Set());
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");

  useEffect(() => {
    if (!open) return;
    let alive = true;
    getUsers()
      .then((list) => {
        if (alive) setDirectory(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (alive) setDirectory([]);
      });
    return () => {
      alive = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setManualName("");
      setManualPhone("");
      setAddedKeys(new Set());
    }
  }, [open]);

  const existingPhones = useMemo(() => {
    const set = new Set();
    [...FIELD_CONTACTS_MOCK, ...addedContacts].forEach((c) => {
      const d = phoneDigits(c.phone);
      if (d) set.add(d);
    });
    return set;
  }, [addedContacts]);

  const results = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const qDigits = phoneDigits(q);
    return directory.filter((u) => {
      if (!u || addedKeys.has(String(u.id))) return false;
      const d = phoneDigits(u.phone);
      if (d && existingPhones.has(d)) return false;
      const nameHit = String(u.name || "").toLowerCase().includes(q);
      const phoneHit = qDigits && d.includes(qDigits);
      const regionHit = String(u.region || "").toLowerCase().includes(q);
      return nameHit || phoneHit || regionHit;
    });
  }, [directory, searchQuery, existingPhones, addedKeys]);

  if (!open) return null;

  const handleAddUser = (user) => {
    addContact({
      name: user.name,
      phone: user.phone,
      homeRegion: user.region,
      trade: user.trade,
      userId: user.id,
      source: "appuser",
    });
    setAddedKeys((prev) => {
      const next = new Set(prev);
      next.add(String(user.id));
      return next;
    });
    showAppToast(`${user.name}님을 내 팀에 추가했습니다`);
    onAdded?.();
  };

  const handleManualSave = () => {
    const name = manualName.trim();
    if (!name) {
      showAppToast("이름을 입력하세요");
      return;
    }
    addContact({ name, phone: manualPhone, source: "manual" });
    showAppToast(`${name}님을 내 팀에 추가했습니다`);
    setManualName("");
    setManualPhone("");
    onAdded?.();
  };

  return (
    <div className="people-add-sheet" role="presentation" onClick={onClose}>
      <section
        className="people-add-sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-label="사람 추가"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="people-add-sheet__head">
          <h2 className="people-add-sheet__title">사람 추가</h2>
          <button type="button" className="people-add-sheet__done" onClick={onClose}>
            완료
          </button>
        </header>

        <div className="people-add-sheet__scroll">
          <section className="people-add-sheet__section">
            <h3 className="people-add-sheet__section-title">일당맵 가입자 검색</h3>
            <label className="contacts-search people-add-sheet__search">
              <span className="contacts-search__icon" aria-hidden="true">
                🔍
              </span>
              <input
                type="search"
                className="contacts-search__input"
                placeholder="이름 또는 전화번호"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="가입자 검색"
              />
            </label>

            {searchQuery.trim() ? (
              results.length === 0 ? (
                <p className="people-add-sheet__hint">검색된 가입자가 없습니다. 아래에서 직접 추가하세요.</p>
              ) : (
                <div className="people-add-sheet__results" role="list">
                  {results.map((user) => (
                    <div key={user.id} className="people-add-sheet__result" role="listitem">
                      <span className="people-add-sheet__result-body">
                        <span className="people-add-sheet__result-name">{user.name}</span>
                        <span className="people-add-sheet__result-sub">
                          {[user.region, user.role].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <button
                        type="button"
                        className="people-add-sheet__add-btn"
                        onClick={() => handleAddUser(user)}
                      >
                        추가
                      </button>
                    </div>
                  ))}
                </div>
              )
            ) : null}
          </section>

          <section className="people-add-sheet__section">
            <h3 className="people-add-sheet__section-title">직접 입력</h3>
            <input
              type="text"
              className="people-add-sheet__input"
              placeholder="이름"
              value={manualName}
              maxLength={20}
              onChange={(e) => setManualName(e.target.value)}
              aria-label="이름"
            />
            <input
              type="tel"
              className="people-add-sheet__input"
              placeholder="전화번호 (선택)"
              value={manualPhone}
              onChange={(e) => setManualPhone(e.target.value)}
              aria-label="전화번호"
            />
            <button
              type="button"
              className="people-add-sheet__save"
              onClick={handleManualSave}
              disabled={!manualName.trim()}
            >
              저장
            </button>
          </section>
        </div>
      </section>
    </div>
  );
}

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FIELD_CONTACTS_MOCK } from "../../utils/fieldContactsMock";
import { useContactsStore } from "../../store/useContactsStore";
import { useUiStore } from "../../store/useUiStore";
import { useUserStore } from "../../store/useUserStore";
import { getUsers } from "../../api/usersApi";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { filterUserDirectory, phoneDigits } from "../../utils/userDirectorySearch";
import { isContactPickerSupported, pickPhoneContact } from "../../utils/contactPicker";
import { buildInviteSharePayload, buildSmsHref } from "../../utils/inviteLink";
import { getDisplayNickname } from "../../utils/displayNickname";
import { CRAFT_LABEL } from "../../utils/jobModel";

const TAB_SEARCH = "search";
const TAB_CONTACTS = "contacts";

function formatPhoneHint(phone) {
  const d = phoneDigits(phone);
  if (d.length < 8) return phone || "";
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7, 11)}`.replace(/-+$/, "");
}

/**
 * 인원 추가 — 일당맵 가입자 검색(자동완성) + 연락처 초대.
 */
export default function PeopleAddSheet({ open, onClose, onAdded }) {
  const addedContacts = useContactsStore((s) => s.addedContacts);
  const addContact = useContactsStore((s) => s.addContact);
  const showAppToast = useUiStore((s) => s.showAppToast);
  const myUserId = useUserStore((s) => s.session?.userId ?? s.profile?.userId ?? 1);
  const profile = useUserStore((s) => s.profile);
  const sessionUser = useUserStore((s) => s.session?.user);
  const myDisplayName = useMemo(() => getDisplayNickname(profile, sessionUser), [profile, sessionUser]);

  const [tab, setTab] = useState(TAB_SEARCH);
  const [directory, setDirectory] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [addedKeys, setAddedKeys] = useState(() => new Set());
  const [pickedContact, setPickedContact] = useState(null);
  const [searchFocused, setSearchFocused] = useState(false);

  const debouncedQuery = useDebouncedValue(searchQuery, 250);

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
      setTab(TAB_SEARCH);
      setSearchQuery("");
      setAddedKeys(new Set());
      setPickedContact(null);
      setSearchFocused(false);
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

  const results = useMemo(
    () => filterUserDirectory(directory, debouncedQuery, { existingPhones, skipIds: addedKeys }),
    [directory, debouncedQuery, existingPhones, addedKeys]
  );

  const showResults = searchFocused && debouncedQuery.trim().length > 0;
  const contactPickerReady = isContactPickerSupported();

  const handleAddUser = useCallback(
    (user) => {
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
    },
    [addContact, onAdded, showAppToast]
  );

  const buildInviteForPicked = useCallback(
    (contact) =>
      buildInviteSharePayload({
        ref: myUserId,
        inviterName: myDisplayName,
        contactId: contact?.id,
      }),
    [myDisplayName, myUserId]
  );

  const handlePickContact = useCallback(async () => {
    const result = await pickPhoneContact();
    if (result.ok) {
      setPickedContact(result.contact);
      return;
    }
    if (result.reason === "unsupported") {
      showAppToast("이 기기에서는 연락처 선택을 지원하지 않습니다");
      return;
    }
    if (result.reason === "empty") {
      showAppToast("선택한 연락처에 이름·번호가 없습니다");
    }
  }, [showAppToast]);

  const handleAddPickedContact = useCallback(() => {
    if (!pickedContact?.name) {
      showAppToast("연락처를 먼저 선택하세요");
      return;
    }
    const contactId = addContact({
      name: pickedContact.name,
      phone: pickedContact.phone,
      source: "manual",
    });
    if (!contactId) return;
    showAppToast(`${pickedContact.name}님을 내 팀에 추가했습니다`);
    setPickedContact(null);
    onAdded?.();
  }, [addContact, onAdded, pickedContact, showAppToast]);

  const handleSmsInvitePicked = useCallback(() => {
    if (!pickedContact) {
      showAppToast("연락처를 먼저 선택하세요");
      return;
    }
    const { fullText } = buildInviteForPicked(null);
    window.location.href = buildSmsHref({ phone: pickedContact.phone, body: fullText });
    showAppToast("문자 초대를 준비했습니다");
  }, [buildInviteForPicked, pickedContact, showAppToast]);

  const handleKakaoInvitePicked = useCallback(async () => {
    if (!pickedContact) {
      showAppToast("연락처를 먼저 선택하세요");
      return;
    }
    const { title, text, url } = buildInviteForPicked(null);
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (_) {
        return;
      }
    }
    try {
      const { fullText } = buildInviteForPicked(null);
      await navigator.clipboard.writeText(fullText);
      showAppToast("초대 메시지를 복사했습니다");
    } catch (_) {
      showAppToast("공유를 지원하지 않는 기기입니다");
    }
  }, [buildInviteForPicked, pickedContact, showAppToast]);

  if (!open) return null;

  return (
    <div className="people-add-sheet" role="presentation" onClick={onClose}>
      <section
        className="people-add-sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-label="인원 추가"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="people-add-sheet__head">
          <h2 className="people-add-sheet__title">인원 추가</h2>
          <button type="button" className="people-add-sheet__done" onClick={onClose}>
            완료
          </button>
        </header>

        <div className="people-add-sheet__tabs" role="tablist" aria-label="추가 방식">
          <button
            type="button"
            role="tab"
            aria-selected={tab === TAB_SEARCH}
            className={`people-add-sheet__tab${tab === TAB_SEARCH ? " is-active" : ""}`}
            onClick={() => setTab(TAB_SEARCH)}
          >
            사용자 검색
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === TAB_CONTACTS}
            className={`people-add-sheet__tab${tab === TAB_CONTACTS ? " is-active" : ""}`}
            onClick={() => setTab(TAB_CONTACTS)}
          >
            연락처 초대
          </button>
        </div>

        <div className="people-add-sheet__scroll">
          {tab === TAB_SEARCH ? (
            <section className="people-add-sheet__section">
              <p className="people-add-sheet__lead">이름이나 전화번호로 일당맵 가입자를 찾아 바로 추가하세요.</p>
              <label className="contacts-search people-add-sheet__search">
                <span className="contacts-search__icon" aria-hidden="true">
                  🔍
                </span>
                <input
                  type="search"
                  className="contacts-search__input"
                  placeholder="이름 · 전화번호"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => window.setTimeout(() => setSearchFocused(false), 150)}
                  aria-label="가입자 검색"
                  autoComplete="off"
                  autoFocus
                />
              </label>

              {showResults ? (
                results.length === 0 ? (
                  <p className="people-add-sheet__hint">검색된 가입자가 없습니다.</p>
                ) : (
                  <ul className="people-add-sheet__results people-add-sheet__results--autocomplete" aria-label="검색 결과">
                    {results.map((user) => (
                      <li key={user.id}>
                        <button type="button" className="people-add-sheet__result-btn" onClick={() => handleAddUser(user)}>
                          <span className="people-add-sheet__result-body">
                            <span className="people-add-sheet__result-name">{user.name}</span>
                            <span className="people-add-sheet__result-sub">
                              {[user.region, CRAFT_LABEL[user.trade] || user.role, formatPhoneHint(user.phone)]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </span>
                          <span className="people-add-sheet__result-action" aria-hidden="true">
                            추가
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )
              ) : (
                <p className="people-add-sheet__hint people-add-sheet__hint--idle">
                  {searchQuery.trim() ? "검색 중…" : "예: 김 · 0101234"}
                </p>
              )}
            </section>
          ) : (
            <section className="people-add-sheet__section">
              <p className="people-add-sheet__lead">휴대폰 연락처에서 선택해 팀에 추가하거나 초대하세요.</p>

              <button type="button" className="people-add-sheet__pick-btn" onClick={handlePickContact}>
                {contactPickerReady ? "연락처에서 선택" : "연락처 선택 (미지원 기기)"}
              </button>

              {!contactPickerReady ? (
                <p className="people-add-sheet__hint">
                  Android Chrome에서는 연락처를 바로 불러올 수 있습니다. 다른 기기는 문자·카카오 공유로 초대하세요.
                </p>
              ) : null}

              {pickedContact ? (
                <div className="people-add-sheet__picked">
                  <div className="people-add-sheet__picked-body">
                    <strong>{pickedContact.name}</strong>
                    {pickedContact.phone ? <span>{formatPhoneHint(pickedContact.phone)}</span> : null}
                  </div>
                  <button type="button" className="people-add-sheet__picked-clear" onClick={() => setPickedContact(null)}>
                    변경
                  </button>
                </div>
              ) : null}

              <div className="people-add-sheet__invite-actions">
                <button
                  type="button"
                  className="people-add-sheet__invite-btn people-add-sheet__invite-btn--primary"
                  onClick={handleAddPickedContact}
                  disabled={!pickedContact}
                >
                  팀에 추가
                </button>
                <button
                  type="button"
                  className="people-add-sheet__invite-btn"
                  onClick={handleSmsInvitePicked}
                  disabled={!pickedContact?.phone}
                >
                  문자 초대
                </button>
                <button
                  type="button"
                  className="people-add-sheet__invite-btn"
                  onClick={handleKakaoInvitePicked}
                  disabled={!pickedContact}
                >
                  카카오 공유
                </button>
              </div>
            </section>
          )}
        </div>
      </section>
    </div>
  );
}

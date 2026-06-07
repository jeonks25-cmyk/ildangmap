import React from "react";
import SettingsMenuRow from "./SettingsMenuRow";

export default function SettingsMenuSection({ title, items = [], onItemClick }) {
  if (!items.length) return null;

  return (
    <section className="settings-menu-section" aria-label={title}>
      <h2 className="settings-menu-section__title">{title}</h2>
      <div className="settings-menu-section__card" role="list">
        {items.map((item) => (
          <SettingsMenuRow
            key={item.id}
            icon={item.icon}
            label={item.label}
            value={item.value}
            showChevron={item.action !== "none"}
            disabled={item.disabled}
            onClick={item.action === "none" ? undefined : () => onItemClick?.(item)}
          />
        ))}
      </div>
    </section>
  );
}

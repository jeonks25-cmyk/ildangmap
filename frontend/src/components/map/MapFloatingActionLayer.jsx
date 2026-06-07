import React from "react";

import MapQuickAddFab from "./MapQuickAddFab";



/** 지도 우측 중앙 + FAB·말풍선 퀵액션 */

export default function MapFloatingActionLayer({

  quickAddOpen = false,

  onQuickAddToggle,

  onQuickAddClose,

  onQuickAddSelect,

  showQuickAdd = true,

}) {

  return (

    <div className={`map-floating-action-layer${quickAddOpen ? " is-menu-open" : ""}`} aria-label="지도 빠른 등록">

      {showQuickAdd ? (

        <MapQuickAddFab

          open={quickAddOpen}

          onToggle={onQuickAddToggle}

          onSelect={onQuickAddSelect}

          onClose={onQuickAddClose}

        />

      ) : null}

    </div>

  );

}


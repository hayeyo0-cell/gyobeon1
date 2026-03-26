// 🔥 핵심: 기존 코드에서 딱 필요한 부분만 유지 + 안정 구조

const { useEffect, useMemo, useState } = React;

const TEAM_LABELS = {
  ks: "경산",
  my: "문양",
  wb: "월배",
  as: "안심",
};

const TEAM_ORDER = ["ks", "my", "wb", "as"];

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

function weekdayName(dateStr) {
  const names = ["일","월","화","수","목","금","토"];
  return names[new Date(dateStr).getDay()];
}

function App() {
  const [editMode, setEditMode] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const [viewTeam, setViewTeam] = useState("ks");

  const dummyGrid = Array.from({ length: 30 }).map((_, i) => ({
    idx: i,
    code: `${i + 1}d`,
    displayName: `이름${i + 1}`,
    customColor: "",
  }));

  function openEditDialog(item) {
    alert(`수정: ${item.displayName}`);
  }

  function openPathDialog(item) {
    alert(`행로표: ${item.code}`);
  }

  return (
    <>
      <div className="topbar">GB_2601</div>

      <div className="container">
        <button onClick={() => setShowAll(true)}>전체</button>
      </div>

      {showAll && (
        <div className="fullscreen-viewer">

          {/* 🔥 핵심: 4칸 헤더 */}
          <div className="all-header">
            <button className="all-header-btn" onClick={() => setSelectedDate(addDays(selectedDate, -1))}>-</button>

            <div className="all-header-title">
              [{TEAM_LABELS[viewTeam]}] {selectedDate} ({weekdayName(selectedDate)})
            </div>

            {/* 🔥 수정 버튼 */}
            <button
              className={`all-edit-btn ${editMode ? "active" : ""}`}
              onClick={() => setEditMode(!editMode)}
            >
              {editMode ? "수정중" : "수정"}
            </button>

            <button className="all-header-btn" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>+</button>
          </div>

          <div className="all-grid-wrap">
            <div className="all-grid-real">
              {dummyGrid.map((item) => (
                <div
                  key={item.idx}
                  className="all-cell-real"
                  style={{ backgroundColor: item.customColor || "#fff" }}
                  onClick={() => {
                    if (editMode) {
                      openEditDialog(item);
                    } else {
                      openPathDialog(item);
                    }
                  }}
                >
                  <div className="all-code">{item.code}</div>
                  <div className="all-name">{item.displayName}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bottom-team-tabs">
            {TEAM_ORDER.map((t) => (
              <button
                key={t}
                className={`bottom-team-tab ${viewTeam === t ? "active" : ""}`}
                onClick={() => setViewTeam(t)}
              >
                {TEAM_LABELS[t]}
              </button>
            ))}
          </div>

        </div>
      )}
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

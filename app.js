const { useEffect, useMemo, useRef, useState } = React;

const TEAM_LABELS = {
  ks: "경산",
  my: "문양",
  wb: "월배",
  as: "안심",
};

const TEAM_ORDER = ["ks", "my", "wb", "as"];

const NIGHT_RANGE_BY_TEAM = {
  ks: { start: 21, end: 29 },
  my: { start: 24, end: 34 },
  wb: { start: 25, end: 37 },
  as: { start: 25, end: 37 },
};

const COLOR_OPTIONS = [
  { value: "", label: "기본" },
  { value: "#dbeafe", label: "하늘" },
  { value: "#bbf7d0", label: "연두" },
  { value: "#fde68a", label: "노랑" },
  { value: "#fecaca", label: "분홍" },
  { value: "#e9d5ff", label: "보라" },
  { value: "#e5e7eb", label: "회색" },
];

const DEFAULT_GYOBUN = [
  "2d","대3","16d","휴1","휴2","대2","14d","24d","24~","휴3","5d","17d",
  "27d","27~","휴4","3d","13d","23d","23~","휴5","휴6","대1","15d","22d","22~",
  "휴7","9d","10d","28d","28~","휴8","4d","20d","25d","25~","휴9","1d","11d",
  "대4","대4~","휴10","휴11","7d","18d","29d","29~","휴12","8d","12d","26d",
  "26~","휴13","휴14","6d","19d","21d","21~","휴15"
];

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

function diffDays(a, b) {
  const da = new Date(a);
  const db = new Date(b);
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

function positiveMod(n, mod) {
  return ((n % mod) + mod) % mod;
}

function weekdayName(dateStr) {
  const names = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
  return names[new Date(dateStr).getDay()];
}

function isSaturday(dateStr) {
  return new Date(dateStr).getDay() === 6;
}

function isSunday(dateStr) {
  return new Date(dateStr).getDay() === 0;
}

function guessDayType(dateStr) {
  if (isSunday(dateStr)) return "hol";
  if (isSaturday(dateStr)) return "sat";
  return "nor";
}

function parseLines(text) {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean);
}

function parseInfo(text) {
  const lines = parseLines(text);
  const [year, month, day, baseCode, baseName, total] = lines;
  return {
    raw: lines,
    baseDate:
      year && month && day
        ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
        : null,
    baseCode: baseCode || null,
    baseName: baseName || null,
    totalCount: total ? Number(total) : lines.length,
  };
}

function normalizeWorktimeLine(line) {
  return line.replace(/\s+/g, " ").trim().toLowerCase();
}

function parseWorktime(text, gyobunOrder = []) {
  const lines = parseLines(text).map(normalizeWorktimeLine);
  const map = {};

  gyobunOrder.forEach((code, idx) => {
    const key = String(code || "").trim().toLowerCase();
    map[key] = lines[idx] || "----";
  });

  return map;
}

function normalizeCodeKey(code) {
  return String(code || "").trim().toLowerCase().replace(/\s+/g, "");
}

function parseShiftCode(code) {
  const s = normalizeCodeKey(code);
  const match = s.match(/^(\d+)(d|~)$/);
  if (!match) return null;
  return {
    num: Number(match[1]),
    suffix: match[2],
  };
}

function getNightRange(teamKey) {
  return NIGHT_RANGE_BY_TEAM[teamKey] || { start: 22, end: 29 };
}

function isNightStartCode(teamKey, code) {
  const parsed = parseShiftCode(code);
  if (!parsed || parsed.suffix !== "d") return false;
  const range = getNightRange(teamKey);
  return parsed.num >= range.start && parsed.num <= range.end;
}

function isNightEndCode(teamKey, code) {
  const parsed = parseShiftCode(code);
  if (!parsed || parsed.suffix !== "~") return false;
  const range = getNightRange(teamKey);
  return parsed.num >= range.start && parsed.num <= range.end;
}

function isDayShiftCode(teamKey, code) {
  const parsed = parseShiftCode(code);
  if (!parsed || parsed.suffix !== "d") return false;
  const range = getNightRange(teamKey);
  return parsed.num >= 1 && parsed.num < range.start;
}

function pickWorktime(team, code, dateStr) {
  const kind = guessDayType(dateStr);
  const key = normalizeCodeKey(code);
  const source = team?.worktimes?.[kind] || {};
  return source[key] || "----";
}

function getPathFolder(teamKey, dateStr, code) {
  const day = new Date(dateStr).getDay();
  // 0:일 1:월 2:화 3:수 4:목 5:금 6:토

  if (isNightStartCode(teamKey, code)) {
    if (day >= 1 && day <= 4) return "nor";
    if (day === 5) return "nor_sat";
    if (day === 6) return "sat_hol";
    if (day === 0) return "hol_nor";
  }

  if (isNightEndCode(teamKey, code)) {
    if (day >= 2 && day <= 5) return "nor";
    if (day === 6) return "nor_sat";
    if (day === 0) return "sat_hol";
    if (day === 1) return "hol_nor";
  }

  if (isDayShiftCode(teamKey, code)) {
    if (day >= 1 && day <= 5) return "nor";
    if (day === 6) return "sat";
    if (day === 0) return "hol";
  }

  if (day >= 1 && day <= 5) return "nor";
  if (day === 6) return "sat";
  return "hol";
}

function findPathImage(team, dateStr, code) {
  if (!team || !code) return null;

  const folder = getPathFolder(team.key, dateStr, code);
  const raw = normalizeCodeKey(code);

  const strippedD = raw.replace(/d$/, "");
  const strippedTilde = raw.replace(/~$/, "");
  const strippedAll = raw.replace(/d$/, "").replace(/~$/, "");

  const candidates = [
    raw,
    strippedD,
    strippedTilde,
    strippedAll,
    `제${strippedAll}`,
    `${raw}.png`,
    `${raw}.jpg`,
    `${raw}.jpeg`,
    `${strippedD}.png`,
    `${strippedD}.jpg`,
    `${strippedD}.jpeg`,
    `${strippedTilde}.png`,
    `${strippedTilde}.jpg`,
    `${strippedTilde}.jpeg`,
    `${strippedAll}.png`,
    `${strippedAll}.jpg`,
    `${strippedAll}.jpeg`,
    `제${strippedAll}.png`,
    `제${strippedAll}.jpg`,
    `제${strippedAll}.jpeg`,
  ];

  const bucket = team?.paths?.[folder];
  if (!bucket) return null;

  for (const key of candidates) {
    if (bucket[key]) return bucket[key];
    if (bucket[key.toLowerCase()]) return bucket[key.toLowerCase()];
  }

  return null;
}

function isSpecialS(value) {
  return value === "s1" || value === "s2";
}

function menuTimeClass(code, time) {
  if (isSpecialS(time)) return "red-text";
  if (code?.startsWith("휴")) return "blue-text";
  return "";
}

function getGyobunOrder(team) {
  if (team?.gyobun?.length) return team.gyobun;
  return DEFAULT_GYOBUN;
}

function createTeamBucket(teamKey) {
  return {
    key: teamKey,
    label: TEAM_LABELS[teamKey],
    names: [],
    gyobun: [],
    people: [],
    info: { totalCount: 0, baseDate: null, baseCode: null, baseName: null, raw: [] },
    worktimes: { nor: {}, sat: {}, hol: {} },
    paths: { nor: {}, sat: {}, hol: {}, nor_sat: {}, sat_hol: {}, hol_nor: {} },
  };
}

function parseZipToData(parsedFiles) {
  const result = {};
  TEAM_ORDER.forEach((teamKey) => {
    result[teamKey] = createTeamBucket(teamKey);
  });

  Object.entries(parsedFiles).forEach(([path, content]) => {
    const clean = path.replace(/^\/+/, "");
    const parts = clean.split("/");
    const teamKey = parts.find((p) => TEAM_ORDER.includes(p));
    if (!teamKey) return;

    const team = result[teamKey];
    const fileName = parts[parts.length - 1];

    if (fileName === "name.txt") team.names = parseLines(content);
    if (fileName === "gyobun.txt") team.gyobun = parseLines(content);
    if (fileName === "info.txt") team.info = parseInfo(content);
  });

  TEAM_ORDER.forEach((teamKey) => {
    const team = result[teamKey];
    if (!team.gyobun.length) team.gyobun = DEFAULT_GYOBUN.slice();

    team.people = team.names.map((name, idx) => ({
      name,
      baseCode: team.gyobun[idx] || "",
      idx,
    }));
  });

  Object.entries(parsedFiles).forEach(([path, content]) => {
    const clean = path.replace(/^\/+/, "");
    const parts = clean.split("/");
    const teamKey = parts.find((p) => TEAM_ORDER.includes(p));
    if (!teamKey) return;

    const team = result[teamKey];
    const fileName = parts[parts.length - 1];
    const parent = parts[parts.length - 2];
    const gyobunOrder = team.gyobun.length ? team.gyobun : DEFAULT_GYOBUN;

    if (fileName === "nor_worktime.txt") team.worktimes.nor = parseWorktime(content, gyobunOrder);
    if (fileName === "sat_worktime.txt") team.worktimes.sat = parseWorktime(content, gyobunOrder);
    if (fileName === "hol_worktime.txt") team.worktimes.hol = parseWorktime(content, gyobunOrder);

    if (parts.includes("path") && /\.(png|jpg|jpeg)$/i.test(fileName)) {
      const kind = parent;
      if (team.paths[kind]) {
        const originalName = fileName;
        const lowerName = fileName.toLowerCase();
        const baseName = lowerName.replace(/\.(png|jpg|jpeg)$/i, "");

        team.paths[kind][originalName] = content;
        team.paths[kind][lowerName] = content;
        team.paths[kind][baseName] = content;
      }
    }
  });

  return result;
}

function loadOverrides() {
  try {
    return JSON.parse(localStorage.getItem("gyobeon_overrides") || "{}");
  } catch {
    return {};
  }
}

function saveOverrides(value) {
  localStorage.setItem("gyobeon_overrides", JSON.stringify(value));
}

function loadMySelection() {
  try {
    return JSON.parse(localStorage.getItem("gyobeon_my_selection") || "null");
  } catch {
    return null;
  }
}

function saveMySelection(value) {
  localStorage.setItem("gyobeon_my_selection", JSON.stringify(value));
}

function getOverrideKey(teamKey, index) {
  return `${teamKey}_${index}`;
}

function buildAssignedGrid(team, anchorName, anchorCode, dayOffset, overrides) {
  if (!team || !team.people?.length) return [];

  const people = team.people;
  const fixedCodes = getGyobunOrder(team);

  const anchorPersonIndex = people.findIndex((p) => p.name === anchorName);
  const anchorCodeIndex = fixedCodes.indexOf(anchorCode);

  if (anchorPersonIndex < 0 || anchorCodeIndex < 0) {
    return fixedCodes.map((slotCode, slotIndex) => {
      const person = people[slotIndex] || { idx: slotIndex, name: "" };
      const override = overrides[getOverrideKey(team.key, person.idx)] || {};
      return {
        idx: person.idx,
        name: person.name,
        displayName: override.name || person.name,
        code: slotCode,
        customColor: override.color || "",
      };
    });
  }

  return fixedCodes.map((slotCode, slotIndex) => {
    const personIndex = positiveMod(
      anchorPersonIndex + (slotIndex - anchorCodeIndex - dayOffset),
      people.length
    );
    const person = people[personIndex];
    const override = overrides[getOverrideKey(team.key, person.idx)] || {};

    return {
      idx: person.idx,
      name: person.name,
      displayName: override.name || person.name,
      code: slotCode,
      customColor: override.color || "",
    };
  });
}

function buildTeamAnchorForDate(team) {
  const baseName = team.info?.baseName || team.people?.[0]?.name || "";
  const baseCode = team.info?.baseCode || getGyobunOrder(team)[0] || "";
  const baseDate = team.info?.baseDate || formatDate(new Date());

  return {
    name: baseName,
    code: baseCode,
    anchorDate: baseDate,
  };
}

function buildAllTeamsAutoAnchors(data, selectedTeamKey, selectedName, selectedCode, selectedAnchorDate) {
  const result = {};

  TEAM_ORDER.forEach((teamKey) => {
    const team = data?.[teamKey];
    if (!team) return;

    if (teamKey === selectedTeamKey) {
      result[teamKey] = {
        name: selectedName,
        code: selectedCode,
        anchorDate: selectedAnchorDate,
      };
      return;
    }

    result[teamKey] = buildTeamAnchorForDate(team);
  });

  return result;
}

function openZipDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("gyobeon-app-db", 1);
    request.onupgradeneeded = function () {
      const db = request.result;
      if (!db.objectStoreNames.contains("files")) {
        db.createObjectStore("files");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveZipBlob(blob, name) {
  const db = await openZipDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("files", "readwrite");
    const store = tx.objectStore("files");
    store.put({ blob, name, savedAt: Date.now() }, "latestZip");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadZipBlob() {
  const db = await openZipDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("files", "readonly");
    const store = tx.objectStore("files");
    const req = store.get("latestZip");
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

function App() {
  const initialSelection = loadMySelection();
  const initialDate = formatDate(new Date());

  const [zipName, setZipName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  const [selectedTeam, setSelectedTeam] = useState(initialSelection?.teamKey || "ks");
  const [viewTeam, setViewTeam] = useState(initialSelection?.teamKey || "ks");
  const [selectedDate, setSelectedDate] = useState(initialDate);

  const [teamAnchors, setTeamAnchors] = useState({
    ks: { name: "", code: "", anchorDate: initialDate },
    my: { name: "", code: "", anchorDate: initialDate },
    wb: { name: "", code: "", anchorDate: initialDate },
    as: { name: "", code: "", anchorDate: initialDate },
  });

  const [overrides, setOverrides] = useState({});
  const [showAll, setShowAll] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const [pathOpen, setPathOpen] = useState(false);
  const [pathTarget, setPathTarget] = useState(null);
  const [pathImage, setPathImage] = useState("");

  const [deferredPrompt, setDeferredPrompt] = useState(null);

  const showAllRef = useRef(false);
  const pathOpenRef = useRef(false);
  const editOpenRef = useRef(false);

  useEffect(() => {
    setOverrides(loadOverrides());

    async function tryAutoLoad() {
      try {
        const saved = await loadZipBlob();
        if (saved?.blob) {
          setZipName(saved.name || "이전 ZIP");
          await parseAndSetZip(saved.blob, false, true);
        }
      } catch (e) {
        console.log("자동 ZIP 로드 실패", e);
      }
    }

    tryAutoLoad();
  }, []);

  useEffect(() => {
    showAllRef.current = showAll;
  }, [showAll]);

  useEffect(() => {
    pathOpenRef.current = pathOpen;
  }, [pathOpen]);

  useEffect(() => {
    editOpenRef.current = editOpen;
  }, [editOpen]);

  useEffect(() => {
    function handler(e) {
      e.preventDefault();
      setDeferredPrompt(e);
    }
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    if (!window.history.state || !window.history.state.__gyobeon) {
      window.history.replaceState({ __gyobeon: true, layer: "root" }, "");
    }

    function handlePopState() {
      if (editOpenRef.current) {
        setEditOpen(false);
        return;
      }
      if (pathOpenRef.current) {
        setPathOpen(false);
        return;
      }
      if (showAllRef.current) {
        setShowAll(false);
        return;
      }
      window.history.pushState({ __gyobeon: true, layer: "root" }, "");
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (showAll && (!window.history.state || window.history.state.layer !== "all")) {
      window.history.pushState({ __gyobeon: true, layer: "all" }, "");
    }
  }, [showAll]);

  useEffect(() => {
    if (pathOpen && (!window.history.state || window.history.state.layer !== "path")) {
      window.history.pushState({ __gyobeon: true, layer: "path" }, "");
    }
  }, [pathOpen]);

  useEffect(() => {
    if (editOpen && (!window.history.state || window.history.state.layer !== "edit")) {
      window.history.pushState({ __gyobeon: true, layer: "edit" }, "");
    }
  }, [editOpen]);

  const currentTeam = data?.[selectedTeam] || null;
  const currentViewTeam = data?.[viewTeam] || null;
  const currentAnchor =
    teamAnchors[selectedTeam] || { name: "", code: "", anchorDate: selectedDate };
  const currentViewAnchor =
    teamAnchors[viewTeam] || { name: "", code: "", anchorDate: selectedDate };

  const currentDayOffset = useMemo(() => {
    return diffDays(currentAnchor.anchorDate || selectedDate, selectedDate);
  }, [currentAnchor.anchorDate, selectedDate]);

  const currentViewDayOffset = useMemo(() => {
    return diffDays(currentViewAnchor.anchorDate || selectedDate, selectedDate);
  }, [currentViewAnchor.anchorDate, selectedDate]);

  useEffect(() => {
    if (!data) return;

    const saved = loadMySelection();

    if (saved?.teamKey && saved?.name && saved?.code && saved?.anchorDate) {
      const autoAnchors = buildAllTeamsAutoAnchors(
        data,
        saved.teamKey,
        saved.name,
        saved.code,
        saved.anchorDate
      );
      setTeamAnchors(autoAnchors);
      setSelectedTeam(saved.teamKey);
      return;
    }

    const nextAnchors = {};
    TEAM_ORDER.forEach((teamKey) => {
      nextAnchors[teamKey] = buildTeamAnchorForDate(data[teamKey]);
    });
    setTeamAnchors(nextAnchors);
  }, [data]);

  const myInfo = useMemo(() => {
    if (!currentTeam || !currentAnchor.name || !currentAnchor.code) return null;

    const assignedGrid = buildAssignedGrid(
      currentTeam,
      currentAnchor.name,
      currentAnchor.code,
      currentDayOffset,
      overrides
    );

    const me = assignedGrid.find((item) => item.name === currentAnchor.name);
    if (!me) return null;

    return {
      code: me.code,
      time: pickWorktime(currentTeam, me.code, selectedDate),
    };
  }, [
    currentTeam,
    currentAnchor.name,
    currentAnchor.code,
    currentDayOffset,
    selectedDate,
    overrides,
  ]);

  const grid = useMemo(() => {
    if (!currentViewTeam || !currentViewAnchor.name || !currentViewAnchor.code) return [];
    return buildAssignedGrid(
      currentViewTeam,
      currentViewAnchor.name,
      currentViewAnchor.code,
      currentViewDayOffset,
      overrides
    );
  }, [
    currentViewTeam,
    currentViewAnchor.name,
    currentViewAnchor.code,
    currentViewDayOffset,
    overrides,
  ]);

  async function parseAndSetZip(fileOrBlob, saveToIdb = true, keepSavedSelection = false) {
    setLoading(true);
    setError("");

    try {
      if (saveToIdb) {
        await saveZipBlob(fileOrBlob, fileOrBlob.name || "gyobeon-data.zip");
      }

      const zip = await JSZip.loadAsync(fileOrBlob);
      const parsedFiles = {};
      const tasks = [];

      zip.forEach((relativePath, entry) => {
        if (entry.dir) return;
        const lower = relativePath.toLowerCase();

        if (lower.endsWith(".txt")) {
          tasks.push(
            entry.async("string").then((text) => {
              parsedFiles[relativePath] = text;
            })
          );
        } else if (/\.(png|jpg|jpeg)$/i.test(lower)) {
          tasks.push(
            entry.async("base64").then((base64) => {
              const mime = lower.endsWith(".png") ? "image/png" : "image/jpeg";
              parsedFiles[relativePath] = `data:${mime};base64,${base64}`;
            })
          );
        }
      });

      await Promise.all(tasks);

      const nextData = parseZipToData(parsedFiles);
      setData(nextData);

      if (!keepSavedSelection) {
        const defaultTeam = selectedTeam || "ks";
        const defaultName =
          nextData[defaultTeam]?.info?.baseName ||
          nextData[defaultTeam]?.people?.[0]?.name ||
          "";
        const defaultCode =
          nextData[defaultTeam]?.info?.baseCode ||
          getGyobunOrder(nextData[defaultTeam])[0] ||
          "";

        const autoAnchors = buildAllTeamsAutoAnchors(
          nextData,
          defaultTeam,
          defaultName,
          defaultCode,
          selectedDate
        );
        setTeamAnchors(autoAnchors);
      }

      setShowSettings(false);
    } catch (e) {
      console.error(e);
      setError("ZIP 파일을 읽는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleZipUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setZipName(file.name);
    await parseAndSetZip(file, true, false);
  }

  function applyMySelection(name, code, teamKey = selectedTeam) {
    if (!data || !name || !code) return;

    const anchorDate = selectedDate;

    const autoAnchors = buildAllTeamsAutoAnchors(
      data,
      teamKey,
      name,
      code,
      anchorDate
    );

    setTeamAnchors(autoAnchors);
    setSelectedTeam(teamKey);
    saveMySelection({
      teamKey,
      name,
      code,
      anchorDate,
    });
  }

  function handleCellTap(item) {
    if (editMode) {
      openEditDialog(item);
    } else {
      openPathDialog(item);
    }
  }

  function openEditDialog(item) {
    setEditingCell(item);
    const key = getOverrideKey(viewTeam, item.idx);
    const current = overrides[key] || {};
    setEditName(current.name || item.displayName || item.name || "");
    setEditColor(current.color || "");
    setEditOpen(true);
  }

  function closeEditDialog() {
    if (editOpenRef.current) {
      window.history.back();
    } else {
      setEditOpen(false);
    }
  }

  function commitEdit(nextColorValue = editColor) {
    if (!editingCell) return;

    const key = getOverrideKey(viewTeam, editingCell.idx);
    const next = { ...overrides };

    if (!editName.trim() && !nextColorValue) {
      delete next[key];
    } else {
      next[key] = {
        name: editName.trim(),
        color: nextColorValue,
      };
    }

    setOverrides(next);
    saveOverrides(next);
    closeEditDialog();
  }

  function openPathDialog(item) {
    if (!currentViewTeam) return;
    const image = findPathImage(currentViewTeam, selectedDate, item.code);
    setPathTarget(item);
    setPathImage(image || "");
    setPathOpen(true);
  }

  function closePathDialog() {
    if (pathOpenRef.current) {
      window.history.back();
    } else {
      setPathOpen(false);
    }
  }

  function openAllView() {
    setShowAll(true);
  }

  function resetOverrides() {
    setOverrides({});
    saveOverrides({});
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  return (
    <>
      <div className="topbar">GB_2601</div>

      <div className="container">
        {!data ? (
          <div className="card">
            <div className="card-title">데이터 불러오기</div>
            <input type="file" accept=".zip" className="input" onChange={handleZipUpload} />
            <div className="help-text">ZIP 파일을 선택하면 압축 내부 데이터를 그대로 읽어서 적용합니다.</div>
            <div className="notice-box">
              처음 한 번 ZIP을 선택하면 이후에는 휴대폰에서 다시 열 때 자동으로 불러옵니다.
            </div>
            {loading && <div className="help-text" style={{ color: "#2563eb" }}>불러오는 중...</div>}
            {zipName && <div className="help-text">현재 파일: {zipName}</div>}
            {error && <div className="help-text" style={{ color: "#dc2626" }}>{error}</div>}
          </div>
        ) : (
          <>
            <div className="settings-row">
              {deferredPrompt && <button className="install-btn" onClick={handleInstall}>설치</button>}
              <button className="settings-btn" onClick={() => setShowSettings(true)}>설정</button>
            </div>

            <div className="date-grid">
              <div className="date-box">
                <button
                  className="date-btn"
                  onClick={() => {
                    const d = new Date(selectedDate);
                    d.setFullYear(d.getFullYear() + 1);
                    setSelectedDate(formatDate(d));
                  }}
                >
                  +
                </button>
                <div className="date-value">{new Date(selectedDate).getFullYear()}년</div>
                <button
                  className="date-btn"
                  onClick={() => {
                    const d = new Date(selectedDate);
                    d.setFullYear(d.getFullYear() - 1);
                    setSelectedDate(formatDate(d));
                  }}
                >
                  -
                </button>
              </div>

              <div className="date-box">
                <button
                  className="date-btn"
                  onClick={() => {
                    const d = new Date(selectedDate);
                    d.setMonth(d.getMonth() + 1);
                    setSelectedDate(formatDate(d));
                  }}
                >
                  +
                </button>
                <div className="date-value">{new Date(selectedDate).getMonth() + 1}월</div>
                <button
                  className="date-btn"
                  onClick={() => {
                    const d = new Date(selectedDate);
                    d.setMonth(d.getMonth() - 1);
                    setSelectedDate(formatDate(d));
                  }}
                >
                  -
                </button>
              </div>

              <div className="date-box">
                <button className="date-btn" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>+</button>
                <div className="date-value">{new Date(selectedDate).getDate()}일</div>
                <button className="date-btn" onClick={() => setSelectedDate(addDays(selectedDate, -1))}>-</button>
              </div>
            </div>

            <div className="card main-panel">
              <div className="center-view">
                <div
                  className={
                    "main-code " +
                    (isSpecialS(myInfo?.time)
                      ? "red-text"
                      : myInfo?.code?.startsWith("휴")
                      ? "blue-text"
                      : "")
                  }
                >
                  {myInfo?.code || "-"} {weekdayName(selectedDate)}
                </div>

                <div className={`main-time ${menuTimeClass(myInfo?.code, myInfo?.time)}`}>
                  {myInfo?.time || "----"}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {data && (
        <div className="bottom-tabs">
          <button className="bottom-tab" onClick={openAllView}>전체</button>
        </div>
      )}

      {showSettings && (
        <div className="modal-backdrop" onClick={() => setShowSettings(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">설정</div>

            <label className="label">데이터 ZIP 다시 불러오기</label>
            <input type="file" accept=".zip" className="input" onChange={handleZipUpload} />

            <label className="label" style={{ marginTop: 12 }}>내 소속</label>
            <select
              className="select"
              value={selectedTeam}
              onChange={(e) => {
                const teamKey = e.target.value;
                setSelectedTeam(teamKey);
                setViewTeam(teamKey);

                const anchor = teamAnchors[teamKey];
                if (anchor?.name && anchor?.code) {
                  applyMySelection(anchor.name, anchor.code, teamKey);
                }
              }}
            >
              {TEAM_ORDER.map((key) => (
                <option key={key} value={key}>{TEAM_LABELS[key]}</option>
              ))}
            </select>

            <label className="label" style={{ marginTop: 12 }}>내 이름</label>
            <select
              className="select"
              value={currentAnchor.name || ""}
              onChange={(e) => {
                applyMySelection(e.target.value, currentAnchor.code || "", selectedTeam);
              }}
            >
              {(currentTeam?.people || []).map((person) => (
                <option key={`${person.idx}-${person.name}`} value={person.name}>
                  {person.name}
                </option>
              ))}
            </select>

            <label className="label" style={{ marginTop: 12 }}>오늘 내 교번</label>
            <select
              className="select"
              value={currentAnchor.code || ""}
              onChange={(e) => {
                applyMySelection(currentAnchor.name || "", e.target.value, selectedTeam);
              }}
            >
              {getGyobunOrder(currentTeam).map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>

            <div className="help-text">
              내 소속/이름/오늘 내 교번만 선택하면 다른 소속은 자동 계산됩니다.
            </div>

            <div className="modal-actions">
              <button className="modal-btn" onClick={resetOverrides}>수정값 초기화</button>
              <button className="modal-btn primary" onClick={() => setShowSettings(false)}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {showAll && (
        <div className="fullscreen-viewer">
          <div className="all-header">
            <button className="all-header-btn" onClick={() => setSelectedDate(addDays(selectedDate, -1))}>-</button>

            <div className="all-header-title">
              {TEAM_LABELS[viewTeam]} {new Date(selectedDate).getFullYear()}.
              {new Date(selectedDate).getMonth() + 1}.
              {new Date(selectedDate).getDate()} {weekdayName(selectedDate)}
            </div>

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
              {grid.map((item) => {
                const viewAnchor = teamAnchors[viewTeam] || {};
                const isMine = item.name === viewAnchor.name;

                return (
                  <div
                    key={`${item.idx}-${item.displayName}`}
                    className={`all-cell-real ${isMine ? "cell-my" : ""}`}
                    style={{ backgroundColor: item.customColor || "#ffffff" }}
                    onClick={() => handleCellTap(item)}
                  >
                    <div className="all-code">{item.code || "-"}</div>
                    <div className="all-name">{item.displayName || "-"}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bottom-team-tabs">
            <button className={`bottom-team-tab ${viewTeam === "ks" ? "active" : ""}`} onClick={() => setViewTeam("ks")}>경산</button>
            <button className={`bottom-team-tab ${viewTeam === "my" ? "active" : ""}`} onClick={() => setViewTeam("my")}>문양</button>
            <button className={`bottom-team-tab ${viewTeam === "wb" ? "active" : ""}`} onClick={() => setViewTeam("wb")}>월배</button>
            <button className={`bottom-team-tab ${viewTeam === "as" ? "active" : ""}`} onClick={() => setViewTeam("as")}>안심</button>
          </div>
        </div>
      )}

      {editOpen && (
        <div className="modal-backdrop" onClick={closeEditDialog}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">이름변경 및 색상 수정</div>
            <div className="modal-sub">
              {TEAM_LABELS[viewTeam]} {editingCell?.code} {editingCell?.displayName || editingCell?.name}
            </div>

            <label className="label">이름</label>
            <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} />

            <label className="label" style={{ marginTop: 12 }}>색상</label>
            <select
              className="select"
              value={editColor || "default"}
              onChange={(e) => setEditColor(e.target.value)}
            >
              {COLOR_OPTIONS.map((item) => (
                <option key={item.label} value={item.value || "default"}>
                  {item.label}
                </option>
              ))}
            </select>

            <div
              className="color-preview"
              style={{ backgroundColor: editColor === "default" ? "#ffffff" : editColor || "#ffffff" }}
            />

            <div className="modal-actions">
              <button className="modal-btn" onClick={closeEditDialog}>아니요</button>
              <button
                className="modal-btn primary"
                onClick={() => commitEdit(editColor === "default" ? "" : editColor)}
              >
                변경
              </button>
            </div>
          </div>
        </div>
      )}

      {pathOpen && (
        <div className="viewer-page">
          <div className="viewer-header">
            <div className="viewer-title">행로표</div>
            <button className="modal-btn primary" onClick={closePathDialog}>닫기</button>
          </div>

          <div className="viewer-body">
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              {TEAM_LABELS[viewTeam]} / {pathTarget?.displayName || pathTarget?.name} / {pathTarget?.code}
            </div>
            <div style={{ color: "#6b7280", marginBottom: 16 }}>
              {selectedDate} {weekdayName(selectedDate)}
            </div>

            {pathImage ? (
              <img src={pathImage} alt="행로표" className="fullscreen-image" />
            ) : (
              <div className="empty-box">해당 행로표 이미지를 찾지 못했습니다.</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

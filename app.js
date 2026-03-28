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

const ADMIN_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwjtUuLeABXGdPbdfsGNbvMh_xynrZHeyU3V82ElZUnXqr9U-D6tWqeYNbsqN-6F9vxLg/exec";

/**
 * 공휴일 목록
 * YYYY-MM-DD 형식
 * 해가 바뀌면 이 배열만 수정하면 됩니다.
 * 아래는 2026년 기준 예시입니다.
 */
const HOLIDAYS = [
  "2026-01-01",
  "2026-02-16",
  "2026-02-17",
  "2026-02-18",
  "2026-03-01",
  "2026-03-02",
  "2026-05-05",
  "2026-05-24",
  "2026-05-25",
  "2026-06-03",
  "2026-06-06",
  "2026-08-15",
  "2026-08-17",
  "2026-09-24",
  "2026-09-25",
  "2026-09-26",
  "2026-10-03",
  "2026-10-05",
  "2026-10-09",
  "2026-12-25",
];

const DEFAULT_GYOBUN = [
  "2d","대3","16d","휴1","휴2","대2","14d","24d","24~","휴3","5d","17d",
  "27d","27~","휴4","3d","13d","23d","23~","휴5","휴6","대1","15d","22d","22~",
  "휴7","9d","10d","28d","28~","휴8","4d","20d","25d","25~","휴9","1d","11d",
  "대4","대4~","휴10","휴11","7d","18d","29d","29~","휴12","8d","12d","26d",
  "26~","휴13","휴14","6d","19d","21d","21~","휴15"
];

const HIDDEN_NAME_KEYS = ["gb2601"];

function normalizeNameKey(name) {
  return String(name || "").trim().toLowerCase().replace(/\s+/g, "");
}

function shouldHideName(name) {
  return HIDDEN_NAME_KEYS.includes(normalizeNameKey(name));
}

function getAllGridLayout(count) {
  if (count >= 49) return { cols: 6, className: "density-6" };
  if (count >= 36) return { cols: 5, className: "density-5" };
  return { cols: 4, className: "density-4" };
}

function parseLocalDate(dateStr) {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(dateStr, days) {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

function addMonths(dateStr, months) {
  const d = parseLocalDate(dateStr);
  const originalDate = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(originalDate, lastDay));
  return formatDate(d);
}

function diffDays(a, b) {
  const da = parseLocalDate(a);
  const db = parseLocalDate(b);
  da.setHours(0, 0, 0, 0);
  db.setHours(0, 0, 0, 0);
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

function positiveMod(n, mod) {
  return ((n % mod) + mod) % mod;
}

function weekdayName(dateStr) {
  const names = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
  return names[parseLocalDate(dateStr).getDay()];
}

function weekdayShort(dateStr) {
  const names = ["일", "월", "화", "수", "목", "금", "토"];
  return names[parseLocalDate(dateStr).getDay()];
}

function isSaturday(dateStr) {
  return parseLocalDate(dateStr).getDay() === 6;
}

function isSunday(dateStr) {
  return parseLocalDate(dateStr).getDay() === 0;
}

function isHolidayDate(dateStr) {
  return HOLIDAYS.includes(dateStr);
}

function guessDayType(dateStr) {
  if (isSunday(dateStr) || isHolidayDate(dateStr)) return "hol";
  if (isSaturday(dateStr)) return "sat";
  return "nor";
}

function getDateToneClass(dateStr) {
  if (isSunday(dateStr) || isHolidayDate(dateStr)) return "tone-sun";
  if (isSaturday(dateStr)) return "tone-sat";
  return "tone-normal";
}

function getDateBasedColor(dateStr) {
  if (isSunday(dateStr) || isHolidayDate(dateStr)) return "#ef4444";
  if (isSaturday(dateStr)) return "#3b82f6";
  return "#111827";
}

function parseLines(text) {
  return String(text || "")
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
  return String(line || "").replace(/\s+/g, " ").trim().toLowerCase();
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
  const day = parseLocalDate(dateStr).getDay();
  const isHol = isHolidayDate(dateStr);

  if (isNightStartCode(teamKey, code)) {
    if (isHol || day === 0) return "hol_nor";
    if (day >= 1 && day <= 4) return "nor";
    if (day === 5) return "nor_sat";
    if (day === 6) return "sat_hol";
  }

  if (isNightEndCode(teamKey, code)) {
    if (day === 1 && isHolidayDate(addDays(dateStr, -1))) return "hol_nor";
    if (day >= 2 && day <= 5) return "nor";
    if (day === 6) return "nor_sat";
    if (day === 0 || isHol) return "sat_hol";
    if (day === 1) return "hol_nor";
  }

  if (isDayShiftCode(teamKey, code)) {
    if (isHol || day === 0) return "hol";
    if (day === 6) return "sat";
    if (day >= 1 && day <= 5) return "nor";
  }

  if (isHol || day === 0) return "hol";
  if (day === 6) return "sat";
  return "nor";
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

function cloneTeamData(data) {
  const result = {};
  TEAM_ORDER.forEach((teamKey) => {
    const team = data?.[teamKey];
    if (!team) return;
    result[teamKey] = {
      ...team,
      names: Array.isArray(team.names) ? [...team.names] : [],
      gyobun: Array.isArray(team.gyobun) ? [...team.gyobun] : [],
      people: Array.isArray(team.people) ? team.people.map((p) => ({ ...p })) : [],
      info: team.info ? { ...team.info, raw: [...(team.info.raw || [])] } : createTeamBucket(teamKey).info,
      worktimes: {
        nor: { ...(team.worktimes?.nor || {}) },
        sat: { ...(team.worktimes?.sat || {}) },
        hol: { ...(team.worktimes?.hol || {}) },
      },
      paths: {
        nor: { ...(team.paths?.nor || {}) },
        sat: { ...(team.paths?.sat || {}) },
        hol: { ...(team.paths?.hol || {}) },
        nor_sat: { ...(team.paths?.nor_sat || {}) },
        sat_hol: { ...(team.paths?.sat_hol || {}) },
        hol_nor: { ...(team.paths?.hol_nor || {}) },
      },
    };
  });
  return result;
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

    const filtered = team.names
      .map((name, idx) => ({
        name,
        baseCode: team.gyobun[idx] || "",
        idx,
      }))
      .filter((person) => !shouldHideName(person.name));

    team.people = filtered;
    team.names = filtered.map((p) => p.name);
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

function loadGroups() {
  try {
    return JSON.parse(localStorage.getItem("gyobeon_groups") || "{}");
  } catch {
    return {};
  }
}

function saveGroups(groups) {
  localStorage.setItem("gyobeon_groups", JSON.stringify(groups));
}

function loadAdminRoster() {
  try {
    return JSON.parse(localStorage.getItem("gyobeon_admin_roster") || "{}");
  } catch {
    return {};
  }
}

function saveAdminRoster(value) {
  localStorage.setItem("gyobeon_admin_roster", JSON.stringify(value));
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
    return fixedCodes
      .map((slotCode, slotIndex) => {
        const person = people[slotIndex] || { idx: slotIndex, name: "" };
        const override = overrides[getOverrideKey(team.key, person.idx)] || {};
        return {
          idx: person.idx,
          name: person.name,
          displayName: override.name || person.name,
          code: slotCode,
          customColor: override.color || "",
        };
      })
      .filter((item) => item.name);
  }

  return fixedCodes
    .map((slotCode, slotIndex) => {
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
    })
    .filter((item) => item.name);
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

function getMonthMatrix(dateStr) {
  const d = parseLocalDate(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth();

  const first = new Date(year, month, 1);
  const firstDay = first.getDay();
  const start = new Date(year, month, 1 - firstDay);

  const matrix = [];
  for (let r = 0; r < 6; r++) {
    const row = [];
    for (let c = 0; c < 7; c++) {
      const temp = new Date(start);
      temp.setDate(start.getDate() + r * 7 + c);
      row.push(formatDate(temp));
    }
    matrix.push(row);
  }
  return matrix;
}

function getWeekDates(baseDate) {
  const d = parseLocalDate(baseDate);
  const day = d.getDay();
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - day);

  const dates = [];
  for (let i = 0; i < 7; i++) {
    const temp = new Date(sunday);
    temp.setDate(sunday.getDate() + i);
    dates.push(formatDate(temp));
  }
  return dates;
}

function splitWorktime(worktime) {
  const raw = String(worktime || "").trim();
  if (!raw || raw === "----") {
    return { startTime: "-", endTime: "-" };
  }

  const normalized = raw.replace(/\s+/g, "");
  if (normalized.includes("-")) {
    const [start, end] = normalized.split("-");
    return {
      startTime: start || "-",
      endTime: end || "-",
    };
  }

  return {
    startTime: raw,
    endTime: "",
  };
}

function getPersonGyobunForDate(data, teamKey, name, dateStr, overrides = {}, savedSelection = null) {
  const team = data?.[teamKey];
  if (!team) return null;

  let anchor;

  if (
    savedSelection?.teamKey === teamKey &&
    savedSelection?.name === name &&
    savedSelection?.code &&
    savedSelection?.anchorDate
  ) {
    anchor = {
      name: savedSelection.name,
      code: savedSelection.code,
      anchorDate: savedSelection.anchorDate,
    };
  } else {
    anchor = buildTeamAnchorForDate(team);
  }

  const offset = diffDays(anchor.anchorDate, dateStr);
  const grid = buildAssignedGrid(team, anchor.name, anchor.code, offset, overrides);
  return grid.find((item) => item.name === name || item.displayName === name) || null;
}

function normalizeTeamKeyFromSheet(value) {
  const v = String(value || "").trim().toLowerCase();
  if (TEAM_ORDER.includes(v)) return v;

  const labelMatch = TEAM_ORDER.find((key) => TEAM_LABELS[key] === String(value || "").trim());
  if (labelMatch) return labelMatch;

  return "";
}

function buildAdminSheetText(data) {
  const lines = [];
  lines.push(["소속코드", "소속명", "이름", "기준교번", "사용여부"].join("\t"));

  TEAM_ORDER.forEach((teamKey) => {
    const team = data?.[teamKey];
    if (!team) return;

    const people = team.people || [];
    people.forEach((person, idx) => {
      lines.push(
        [
          teamKey,
          TEAM_LABELS[teamKey],
          person.name || "",
          getGyobunOrder(team)[idx] || person.baseCode || "",
          "Y",
        ].join("\t")
      );
    });
  });

  return lines.join("\n");
}

function parseDelimitedText(text) {
  const raw = String(text || "").replace(/\r/g, "").trim();
  if (!raw) return [];

  const lines = raw.split("\n").filter(Boolean);
  if (!lines.length) return [];

  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  return lines.map((line) => line.split(delimiter).map((v) => String(v || "").trim()));
}

function parseAdminSheetText(text) {
  const rows = parseDelimitedText(text);
  if (!rows.length) return { ok: false, message: "내용이 비어 있습니다." };

  const header = rows[0].map((v) => v.replace(/\s+/g, ""));
  const body = rows.slice(1);

  const teamIdx = header.findIndex((h) => ["소속코드", "소속", "team", "teamkey"].includes(h.toLowerCase()));
  const teamNameIdx = header.findIndex((h) => ["소속명", "teamlabel"].includes(h.toLowerCase()));
  const nameIdx = header.findIndex((h) => ["이름", "name"].includes(h.toLowerCase()));
  const codeIdx = header.findIndex((h) => ["기준교번", "교번", "basecode", "code"].includes(h.toLowerCase()));
  const enabledIdx = header.findIndex((h) => ["사용여부", "활성", "enabled", "use"].includes(h.toLowerCase()));

  if (nameIdx < 0 || codeIdx < 0 || (teamIdx < 0 && teamNameIdx < 0)) {
    return { ok: false, message: "헤더는 소속코드(또는 소속명), 이름, 기준교번, 사용여부 형식이어야 합니다." };
  }

  const result = {};
  TEAM_ORDER.forEach((teamKey) => {
    result[teamKey] = [];
  });

  body.forEach((cols) => {
    const rawTeam = teamIdx >= 0 ? cols[teamIdx] : "";
    const rawTeamLabel = teamNameIdx >= 0 ? cols[teamNameIdx] : "";
    const teamKey = normalizeTeamKeyFromSheet(rawTeam) || normalizeTeamKeyFromSheet(rawTeamLabel);
    const name = String(cols[nameIdx] || "").trim();
    const baseCode = String(cols[codeIdx] || "").trim();
    const enabledRaw = enabledIdx >= 0 ? String(cols[enabledIdx] || "").trim().toUpperCase() : "Y";
    const enabled = !["N", "NO", "0", "FALSE"].includes(enabledRaw);

    if (!teamKey || !name || !baseCode) return;

    result[teamKey].push({
      name,
      baseCode,
      enabled,
    });
  });

  const hasAny = TEAM_ORDER.some((teamKey) => result[teamKey].length > 0);
  if (!hasAny) {
    return { ok: false, message: "적용 가능한 데이터가 없습니다." };
  }

  return { ok: true, data: result };
}

function normalizeAdminRosterShape(input) {
  const result = {};
  TEAM_ORDER.forEach((teamKey) => {
    result[teamKey] = [];
  });

  if (!input || typeof input !== "object") return result;

  if (Array.isArray(input.rows)) {
    input.rows.forEach((row) => {
      const teamKey =
        normalizeTeamKeyFromSheet(row?.teamKey) ||
        normalizeTeamKeyFromSheet(row?.team) ||
        normalizeTeamKeyFromSheet(row?.teamLabel);
      const name = String(row?.name || "").trim();
      const baseCode = String(row?.baseCode || row?.code || "").trim();
      const enabled = row?.enabled === false ? false : true;

      if (!teamKey || !name || !baseCode) return;
      result[teamKey].push({ name, baseCode, enabled });
    });
    return result;
  }

  TEAM_ORDER.forEach((teamKey) => {
    const rows = Array.isArray(input[teamKey]) ? input[teamKey] : [];
    result[teamKey] = rows
      .map((row) => ({
        name: String(row?.name || "").trim(),
        baseCode: String(row?.baseCode || row?.code || "").trim(),
        enabled: row?.enabled === false ? false : true,
      }))
      .filter((row) => row.name && row.baseCode);
  });

  return result;
}

function applyAdminRosterToData(baseData, adminRoster) {
  if (!baseData) return null;
  const next = cloneTeamData(baseData);

  TEAM_ORDER.forEach((teamKey) => {
    const team = next[teamKey];
    if (!team) return;

    const rows = Array.isArray(adminRoster?.[teamKey]) ? adminRoster[teamKey] : [];
    if (!rows.length) return;

    const filtered = rows
      .filter((row) => row && row.name && row.baseCode && row.enabled !== false)
      .filter((row) => !shouldHideName(row.name))
      .map((row, idx) => ({
        idx,
        name: row.name,
        baseCode: row.baseCode,
      }));

    if (!filtered.length) return;

    team.people = filtered;
    team.names = filtered.map((p) => p.name);
    team.gyobun = filtered.map((p) => p.baseCode);
    team.info = {
      ...team.info,
      totalCount: filtered.length,
      baseName: team.info?.baseName && filtered.some((p) => p.name === team.info.baseName)
        ? team.info.baseName
        : filtered[0]?.name || "",
      baseCode: team.info?.baseCode && filtered.some((p) => p.baseCode === team.info.baseCode)
        ? team.info.baseCode
        : filtered[0]?.baseCode || "",
    };
  });

  return next;
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

async function fetchAdminRosterFromScript() {
  const response = await fetch(ADMIN_SCRIPT_URL, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("관리자 데이터 조회 실패");
  }

  const json = await response.json();
  const rawRoster = json?.data && typeof json.data === "object" ? json.data : json;
  return normalizeAdminRosterShape(rawRoster);
}

async function saveAdminRosterToScript(roster) {
  const response = await fetch(ADMIN_SCRIPT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify({
      action: "saveRoster",
      data: roster,
    }),
  });

  if (!response.ok) {
    throw new Error("관리자 데이터 저장 실패");
  }

  const json = await response.json().catch(() => ({}));
  if (json?.ok === false) {
    throw new Error(json?.message || "관리자 데이터 저장 실패");
  }

  return json;
}

function downloadTextFile(filename, text, mime = "text/tab-separated-values;charset=utf-8") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function App() {
  const initialSelection = loadMySelection();
  const initialGroups = loadGroups();
  const initialAdminRoster = loadAdminRoster();
  const initialDate = formatDate(new Date());

  const [zipName, setZipName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [baseData, setBaseData] = useState(null);
  const [remoteRosterLoading, setRemoteRosterLoading] = useState(false);

  const [activeTab, setActiveTab] = useState("home");
  const activeTabRef = useRef("home");

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
  const [editMode, setEditMode] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const [pathOpen, setPathOpen] = useState(false);
  const [pathTarget, setPathTarget] = useState(null);
  const [pathImage, setPathImage] = useState("");

  const [showSettings, setShowSettings] = useState(false);

  const [groups, setGroups] = useState(initialGroups);
  const [currentGroup, setCurrentGroup] = useState(Object.keys(initialGroups)[0] || "");
  const [groupBaseDate, setGroupBaseDate] = useState(selectedDate);
  const [showGroupAdd, setShowGroupAdd] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [groupAddTeam, setGroupAddTeam] = useState("ks");
  const [groupAddName, setGroupAddName] = useState("");

  const [deferredPrompt, setDeferredPrompt] = useState(null);

  const [adminRoster, setAdminRoster] = useState(initialAdminRoster);
  const [showAdminSheet, setShowAdminSheet] = useState(false);
  const [adminSheetText, setAdminSheetText] = useState("");
  const [adminSheetError, setAdminSheetError] = useState("");
  const [adminSaving, setAdminSaving] = useState(false);

  const pathOpenRef = useRef(false);
  const editOpenRef = useRef(false);

  const data = useMemo(() => {
    if (!baseData) return null;
    return applyAdminRosterToData(baseData, adminRoster);
  }, [baseData, adminRoster]);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

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
    async function loadRemoteAdminRoster() {
      setRemoteRosterLoading(true);
      try {
        const remoteRoster = await fetchAdminRosterFromScript();
        const hasAny = TEAM_ORDER.some((teamKey) => (remoteRoster[teamKey] || []).length > 0);

        if (hasAny) {
          setAdminRoster(remoteRoster);
          saveAdminRoster(remoteRoster);
        }
      } catch (e) {
        console.log("원격 관리자 데이터 로드 실패", e);
      } finally {
        setRemoteRosterLoading(false);
      }
    }

    loadRemoteAdminRoster();
  }, []);

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

      if (showAdminSheet) {
        setShowAdminSheet(false);
        return;
      }

      if (showSettings) {
        setShowSettings(false);
        return;
      }

      if (showGroupAdd) {
        setShowGroupAdd(false);
        return;
      }

      if (activeTabRef.current !== "home") {
        setActiveTab("home");
        return;
      }

      window.history.pushState({ __gyobeon: true, layer: "root" }, "");
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [showAdminSheet, showSettings, showGroupAdd]);

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

  useEffect(() => {
    setGroupBaseDate(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    if (!data) return;

    const saved = loadMySelection();

    if (saved?.teamKey && saved?.name && saved?.code && saved?.anchorDate) {
      const team = data[saved.teamKey];
      const exists = team?.people?.some((p) => p.name === saved.name);
      const codeExists = getGyobunOrder(team).includes(saved.code);

      if (exists && codeExists) {
        const autoAnchors = buildAllTeamsAutoAnchors(
          data,
          saved.teamKey,
          saved.name,
          saved.code,
          saved.anchorDate
        );
        setTeamAnchors(autoAnchors);
        setSelectedTeam(saved.teamKey);
        setViewTeam(saved.teamKey);
        return;
      }
    }

    const nextAnchors = {};
    TEAM_ORDER.forEach((teamKey) => {
      nextAnchors[teamKey] = buildTeamAnchorForDate(data[teamKey]);
    });
    setTeamAnchors(nextAnchors);
  }, [data]);

  const currentTeam = data?.[selectedTeam] || null;
  const currentViewTeam = data?.[viewTeam] || null;
  const currentAnchor = teamAnchors[selectedTeam] || { name: "", code: "", anchorDate: selectedDate };
  const currentViewAnchor = teamAnchors[viewTeam] || { name: "", code: "", anchorDate: selectedDate };

  const currentDayOffset = useMemo(
    () => diffDays(currentAnchor.anchorDate || selectedDate, selectedDate),
    [currentAnchor.anchorDate, selectedDate]
  );

  const currentViewDayOffset = useMemo(
    () => diffDays(currentViewAnchor.anchorDate || selectedDate, selectedDate),
    [currentViewAnchor.anchorDate, selectedDate]
  );

  const savedSelection = useMemo(() => loadMySelection(), [selectedTeam, selectedDate, teamAnchors]);

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
  }, [currentTeam, currentAnchor.name, currentAnchor.code, currentDayOffset, selectedDate, overrides]);

  const allGrid = useMemo(() => {
    if (!currentViewTeam || !currentViewAnchor.name || !currentViewAnchor.code) return [];
    return buildAssignedGrid(
      currentViewTeam,
      currentViewAnchor.name,
      currentViewAnchor.code,
      currentViewDayOffset,
      overrides
    );
  }, [currentViewTeam, currentViewAnchor.name, currentViewAnchor.code, currentViewDayOffset, overrides]);

  const visibleAllGrid = useMemo(() => {
    return allGrid.filter((item) => item && item.name && !shouldHideName(item.name));
  }, [allGrid]);

  const allGridLayout = useMemo(() => {
    return getAllGridLayout(visibleAllGrid.length || 0);
  }, [visibleAllGrid.length]);

  const allGridRows = useMemo(() => {
    return Math.max(1, Math.ceil((visibleAllGrid.length || 1) / allGridLayout.cols));
  }, [visibleAllGrid.length, allGridLayout.cols]);

  const monthMatrix = useMemo(() => getMonthMatrix(selectedDate), [selectedDate]);
  const monthHeaderDate = parseLocalDate(selectedDate);
  const weekDates = useMemo(() => getWeekDates(groupBaseDate), [groupBaseDate]);
  const groupMembers = groups[currentGroup] || [];

  function switchTab(tabName) {
    if (tabName === activeTabRef.current) return;

    if (tabName === "all") {
      setViewTeam(selectedTeam);
    }

    setActiveTab(tabName);

    if (tabName === "home") {
      window.history.pushState({ __gyobeon: true, layer: "root" }, "");
    } else {
      window.history.pushState({ __gyobeon: true, layer: `tab-${tabName}` }, "");
    }
  }

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
      setBaseData(nextData);

      if (!keepSavedSelection) {
        const defaultTeam = selectedTeam || "ks";
        const effectiveData = applyAdminRosterToData(nextData, adminRoster);
        const defaultName =
          effectiveData?.[defaultTeam]?.info?.baseName ||
          effectiveData?.[defaultTeam]?.people?.[0]?.name ||
          "";
        const defaultCode =
          effectiveData?.[defaultTeam]?.info?.baseCode ||
          getGyobunOrder(effectiveData?.[defaultTeam])[0] ||
          "";

        const autoAnchors = buildAllTeamsAutoAnchors(
          effectiveData,
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
    const autoAnchors = buildAllTeamsAutoAnchors(data, teamKey, name, code, anchorDate);

    setTeamAnchors(autoAnchors);
    setSelectedTeam(teamKey);
    setViewTeam(teamKey);

    saveMySelection({
      teamKey,
      name,
      code,
      anchorDate,
    });
  }

  function handleAllCellTap(item) {
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

    const cleanName = editName.trim();
    const cleanColor = nextColorValue || "";

    const key = getOverrideKey(viewTeam, editingCell.idx);
    const next = { ...overrides };

    if (!cleanName && !cleanColor) {
      delete next[key];
    } else {
      next[key] = {
        name: cleanName,
        color: cleanColor,
      };
    }

    setOverrides(next);
    saveOverrides(next);

    setEditOpen(false);
    setEditingCell(null);
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

  function resetOverrides() {
    setOverrides({});
    saveOverrides({});
  }

  function createGroup() {
    const name = newGroupName.trim();
    if (!name) {
      alert("그룹 이름을 입력해주세요.");
      return;
    }

    const next = { ...groups };
    if (!next[name]) {
      next[name] = [];
    }

    setGroups(next);
    saveGroups(next);
    setCurrentGroup(name);
  }

  function addToGroup() {
    const typedGroupName = newGroupName.trim();
    const targetGroup = currentGroup || typedGroupName;

    if (!targetGroup) {
      alert("그룹 이름을 입력하거나 현재 그룹을 선택해주세요.");
      return;
    }

    if (!groupAddTeam || !groupAddName) {
      alert("소속과 이름을 선택해주세요.");
      return;
    }

    const next = { ...groups };

    if (!next[targetGroup]) {
      next[targetGroup] = [];
    }

    const exists = next[targetGroup].some(
      (item) => item.team === groupAddTeam && item.name === groupAddName
    );

    if (!exists) {
      next[targetGroup].push({
        team: groupAddTeam,
        name: groupAddName,
      });
    }

    setGroups(next);
    saveGroups(next);
    setCurrentGroup(targetGroup);
    setNewGroupName("");
    setShowGroupAdd(false);
  }

  function removeFromGroup(teamKey, name) {
    const next = { ...groups };
    next[currentGroup] = (next[currentGroup] || []).filter(
      (item) => !(item.team === teamKey && item.name === name)
    );
    setGroups(next);
    saveGroups(next);
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  function openAdminSheetEditor() {
    if (!data) return;
    const text = buildAdminSheetText(data);
    setAdminSheetText(text);
    setAdminSheetError("");
    setShowAdminSheet(true);
  }

  async function applyAdminSheetChanges() {
    const parsed = parseAdminSheetText(adminSheetText);
    if (!parsed.ok) {
      setAdminSheetError(parsed.message || "스프레드시트 형식이 올바르지 않습니다.");
      return;
    }

    try {
      setAdminSaving(true);
      const nextRoster = parsed.data;

      setAdminRoster(nextRoster);
      saveAdminRoster(nextRoster);

      await saveAdminRosterToScript(nextRoster);

      setAdminSheetError("");
      setShowAdminSheet(false);
    } catch (e) {
      console.error(e);
      setAdminSheetError("앱스 스크립트 저장에 실패했습니다.");
    } finally {
      setAdminSaving(false);
    }
  }

  async function handleAdminSheetFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setAdminSheetText(text);
      setAdminSheetError("");
    } catch (e) {
      console.error(e);
      setAdminSheetError("파일을 읽지 못했습니다.");
    }
  }

  async function refreshAdminRosterNow() {
    try {
      setRemoteRosterLoading(true);
      const remoteRoster = await fetchAdminRosterFromScript();
      const hasAny = TEAM_ORDER.some((teamKey) => (remoteRoster[teamKey] || []).length > 0);

      if (hasAny) {
        setAdminRoster(remoteRoster);
        saveAdminRoster(remoteRoster);
      }
    } catch (e) {
      console.error(e);
      setAdminSheetError("최신 관리자 명단을 불러오지 못했습니다.");
    } finally {
      setRemoteRosterLoading(false);
    }
  }

  function resetAdminRoster() {
    setAdminRoster({});
    saveAdminRoster({});
    setAdminSheetText("");
    setAdminSheetError("");
  }

  return (
    <>
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
            {activeTab === "home" && (
              <>
                <div className="settings-row">
                  {deferredPrompt && (
                    <button className="install-btn" onClick={handleInstall}>
                      설치
                    </button>
                  )}
                  <button className="settings-btn" onClick={() => setShowSettings(true)}>
                    설정
                  </button>
                </div>

                <div className="date-grid">
                  <div className="date-box">
                    <button
                      className="date-btn"
                      onClick={() => {
                        const d = parseLocalDate(selectedDate);
                        d.setFullYear(d.getFullYear() + 1);
                        setSelectedDate(formatDate(d));
                      }}
                    >
                      +
                    </button>
                    <div className="date-value">{parseLocalDate(selectedDate).getFullYear()}년</div>
                    <button
                      className="date-btn"
                      onClick={() => {
                        const d = parseLocalDate(selectedDate);
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
                        const d = parseLocalDate(selectedDate);
                        d.setMonth(d.getMonth() + 1);
                        setSelectedDate(formatDate(d));
                      }}
                    >
                      +
                    </button>
                    <div className="date-value">{parseLocalDate(selectedDate).getMonth() + 1}월</div>
                    <button
                      className="date-btn"
                      onClick={() => {
                        const d = parseLocalDate(selectedDate);
                        d.setMonth(d.getMonth() - 1);
                        setSelectedDate(formatDate(d));
                      }}
                    >
                      -
                    </button>
                  </div>

                  <div className="date-box">
                    <button className="date-btn" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>+</button>
                    <div className="date-value">{parseLocalDate(selectedDate).getDate()}일</div>
                    <button className="date-btn" onClick={() => setSelectedDate(addDays(selectedDate, -1))}>-</button>
                  </div>
                </div>

                <div className="card main-panel">
                  <div className="center-view">
                    <div
                      className="main-code"
                      style={{ color: getDateBasedColor(selectedDate) }}
                    >
                      {myInfo?.code || "-"} {weekdayName(selectedDate)}
                    </div>

                    <div
                      className="main-time"
                      style={{ color: getDateBasedColor(selectedDate) }}
                    >
                      {myInfo?.time || "----"}
                    </div>

                    <div className="main-subinfo">
                      {TEAM_LABELS[selectedTeam]} / {currentAnchor.name || "-"}
                    </div>

                    {remoteRosterLoading && (
                      <div className="help-text" style={{ marginTop: 8, color: "#2563eb" }}>
                        관리자 명단 동기화 중...
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {activeTab === "all" && (
              <div className="tab-page all-page">
                <div className="all-tab-header">
                  <div className="all-header">
                    <button className="all-header-btn" onClick={() => setSelectedDate(addDays(selectedDate, -1))}>-</button>

                    <div className="all-header-title">
                      {TEAM_LABELS[viewTeam]} {parseLocalDate(selectedDate).getFullYear()}.
                      {parseLocalDate(selectedDate).getMonth() + 1}.
                      {parseLocalDate(selectedDate).getDate()} {weekdayName(selectedDate)}
                    </div>

                    <button
                      className={`all-edit-btn ${editMode ? "active" : ""}`}
                      onClick={() => setEditMode(!editMode)}
                    >
                      {editMode ? "수정중" : "수정"}
                    </button>

                    <button className="all-header-btn" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>+</button>
                  </div>
                </div>

                <div className="all-team-tabs">
                  {TEAM_ORDER.map((key) => (
                    <button
                      key={key}
                      className={`all-team-tab ${viewTeam === key ? "active" : ""}`}
                      onClick={() => setViewTeam(key)}
                    >
                      {TEAM_LABELS[key]}
                    </button>
                  ))}
                </div>

                <div className="all-tab-grid-wrap">
                  <div
                    className={`all-grid-real ${allGridLayout.className}`}
                    style={{
                      gridTemplateColumns: `repeat(${allGridLayout.cols}, minmax(0, 1fr))`,
                      gridTemplateRows: `repeat(${allGridRows}, minmax(0, 1fr))`,
                    }}
                  >
                    {visibleAllGrid.map((item) => {
                      const isMine =
                        viewTeam === selectedTeam &&
                        item.name === currentAnchor.name;

                      return (
                        <div
                          key={`${item.idx}-${item.displayName}`}
                          className={`all-cell-real ${isMine ? "cell-my" : ""}`}
                          style={
                            item.customColor
                              ? {
                                  background: item.customColor,
                                  backgroundImage: "none",
                                }
                              : undefined
                          }
                          onClick={() => handleAllCellTap(item)}
                        >
                          <div className="all-code">{item.code || "-"}</div>
                          <div className="all-name">{item.displayName || "-"}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "month" && (
              <div className="tab-page">
                <div className="month-header-bar">
                  <button className="month-nav-btn" onClick={() => setSelectedDate(addMonths(selectedDate, -1))}>-</button>
                  <div className="month-header-title">
                    {monthHeaderDate.getFullYear()}년 {monthHeaderDate.getMonth() + 1}월
                  </div>
                  <button className="month-nav-btn" onClick={() => setSelectedDate(addMonths(selectedDate, 1))}>+</button>
                </div>

                <div className="month-calendar">
                  <div className="month-weekdays">
                    <div className="sun">일</div>
                    <div>월</div>
                    <div>화</div>
                    <div>수</div>
                    <div>목</div>
                    <div>금</div>
                    <div className="sat">토</div>
                  </div>

                  {monthMatrix.map((row, rowIdx) => (
                    <div className="month-row" key={rowIdx}>
                      {row.map((date) => {
                        const item = getPersonGyobunForDate(
                          data,
                          selectedTeam,
                          currentAnchor.name,
                          date,
                          overrides,
                          savedSelection
                        );

                        const sameMonth = parseLocalDate(date).getMonth() === monthHeaderDate.getMonth();
                        const isSelected = date === selectedDate;
                        const toneClass = getDateToneClass(date);

                        const worktime = item?.code ? pickWorktime(data[selectedTeam], item.code, date) : "";
                        const { startTime, endTime } = splitWorktime(worktime);

                        return (
                          <button
                            key={date}
                            className={`month-cell ${sameMonth ? "" : "other-month"} ${isSelected ? "selected" : ""}`}
                            onClick={() => setSelectedDate(date)}
                          >
                            <div className={`month-cell-inner ${toneClass}`}>
                              <div className={`month-day ${toneClass}`}>
                                {parseLocalDate(date).getDate()}
                              </div>

                              <div className={`month-code-line ${toneClass}`}>
                                {item?.code || "-"}
                              </div>

                              <div className="month-time-wrap">
                                <div className={`month-time-line ${toneClass}`}>
                                  {startTime || "-"}
                                </div>

                                <div className={`month-time-line ${toneClass}`}>
                                  {endTime || ""}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "group" && (
              <div className="group-page tab-page">
                <div className="group-topbar">
                  <button className="group-nav-btn" onClick={() => setGroupBaseDate(addDays(groupBaseDate, -7))}>-</button>

                  <select
                    className="group-select"
                    value={currentGroup}
                    onChange={(e) => setCurrentGroup(e.target.value)}
                  >
                    {Object.keys(groups).length === 0 ? (
                      <option value="">그룹 없음</option>
                    ) : (
                      Object.keys(groups).map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))
                    )}
                  </select>

                  <button className="group-add-btn" onClick={() => setShowGroupAdd(true)}>추가하기</button>
                  <button className="group-nav-btn" onClick={() => setGroupBaseDate(addDays(groupBaseDate, 7))}>+</button>
                </div>

                <div className="group-table-wrap">
                  <table className="group-table">
                    <thead>
                      <tr>
                        <th>이름</th>
                        {weekDates.map((date) => (
                          <th key={date}>
                            <div className={`${isSunday(date) || isHolidayDate(date) ? "sun" : ""} ${isSaturday(date) ? "sat" : ""}`}>
                              {weekdayShort(date)}
                            </div>
                            <div>{parseLocalDate(date).getDate()}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {groupMembers.length === 0 ? (
                        <tr>
                          <td colSpan={8}>그룹 인원이 없습니다.</td>
                        </tr>
                      ) : (
                        groupMembers.map((member, idx) => (
                          <tr key={`${member.team}-${member.name}-${idx}`}>
                            <td className="group-name-cell">
                              <div>{member.name}</div>
                              <div className="group-team-label">{TEAM_LABELS[member.team]}</div>
                              <button
                                className="group-remove-btn"
                                onClick={() => removeFromGroup(member.team, member.name)}
                              >
                                삭제
                              </button>
                            </td>
                            {weekDates.map((date) => {
                              const item = getPersonGyobunForDate(
                                data,
                                member.team,
                                member.name,
                                date,
                                overrides,
                                savedSelection
                              );
                              return <td key={date}>{item?.code || "-"}</td>;
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {data && (
        <div
          className={`bottom-tabs tabs-4 ${
            activeTab === "home"
              ? "home-theme"
              : activeTab === "all"
              ? "all-theme"
              : activeTab === "month"
              ? "month-theme"
              : "group-theme"
          }`}
        >
          <button className={`bottom-tab ${activeTab === "home" ? "active" : ""}`} onClick={() => switchTab("home")}>홈</button>
          <button className={`bottom-tab ${activeTab === "all" ? "active" : ""}`} onClick={() => switchTab("all")}>전체</button>
          <button className={`bottom-tab ${activeTab === "month" ? "active" : ""}`} onClick={() => switchTab("month")}>월교번</button>
          <button className={`bottom-tab ${activeTab === "group" ? "active" : ""}`} onClick={() => switchTab("group")}>그룹</button>
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

            <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #e5e7eb" }}>
              <div className="label" style={{ marginBottom: 8 }}>관리자</div>

              <button className="modal-btn" onClick={openAdminSheetEditor}>
                관리자 스프레드시트 편집
              </button>

              <button
                className="modal-btn"
                style={{ marginTop: 8 }}
                onClick={refreshAdminRosterNow}
              >
                최신 관리자 명단 다시 불러오기
              </button>

              <div className="help-text" style={{ marginTop: 8 }}>
                관리자 편집 내용은 Apps Script와 연동되어 저장되고, 사용자는 앱 실행 시 최신 명단을 자동으로 받아옵니다.
              </div>
            </div>

            <div className="modal-actions">
              <button className="modal-btn" onClick={resetOverrides}>수정값 초기화</button>
              <button className="modal-btn primary" onClick={() => setShowSettings(false)}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {showGroupAdd && (
        <div className="modal-backdrop" onClick={() => setShowGroupAdd(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">그룹 추가</div>

            <label className="label">새 그룹 이름</label>
            <input
              className="input"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="예: 낚시"
            />

            <div className="help-text">
              현재 그룹이 없으면 새 그룹 이름을 입력한 뒤 바로 추가할 수 있습니다.
            </div>

            <button className="modal-btn primary" style={{ marginTop: 10 }} onClick={createGroup}>그룹 생성</button>

            <label className="label" style={{ marginTop: 16 }}>현재 그룹</label>
            <select className="select" value={currentGroup} onChange={(e) => setCurrentGroup(e.target.value)}>
              {Object.keys(groups).length === 0 ? (
                <option value="">그룹 없음</option>
              ) : (
                Object.keys(groups).map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))
              )}
            </select>

            <label className="label" style={{ marginTop: 12 }}>소속</label>
            <select className="select" value={groupAddTeam} onChange={(e) => setGroupAddTeam(e.target.value)}>
              {TEAM_ORDER.map((key) => (
                <option key={key} value={key}>{TEAM_LABELS[key]}</option>
              ))}
            </select>

            <label className="label" style={{ marginTop: 12 }}>이름</label>
            <select className="select" value={groupAddName} onChange={(e) => setGroupAddName(e.target.value)}>
              <option value="">선택</option>
              {(data?.[groupAddTeam]?.people || []).map((person) => (
                <option key={`${groupAddTeam}-${person.name}`} value={person.name}>
                  {person.name}
                </option>
              ))}
            </select>

            <div className="modal-actions">
              <button className="modal-btn" onClick={() => setShowGroupAdd(false)}>취소</button>
              <button className="modal-btn primary" onClick={addToGroup}>추가</button>
            </div>
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
              onChange={(e) => setEditColor(e.target.value === "default" ? "" : e.target.value)}
            >
              <option value="default">기본</option>
              {COLOR_OPTIONS.filter((item) => item.value).map((item) => (
                <option key={item.label} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <div
              className="color-preview"
              style={{ backgroundColor: editColor || "#ffffff" }}
            />

            <div className="modal-actions">
              <button className="modal-btn" onClick={closeEditDialog}>아니요</button>
              <button className="modal-btn primary" onClick={() => commitEdit(editColor)}>
                변경
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdminSheet && (
        <div className="modal-backdrop" onClick={() => setShowAdminSheet(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720, width: "94vw" }}>
            <div className="modal-title">관리자 스프레드시트 편집</div>

            <div className="help-text" style={{ marginBottom: 10 }}>
              헤더 형식: 소속코드 / 소속명 / 이름 / 기준교번 / 사용여부
              <br />
              사용여부는 Y 또는 N 으로 입력하세요.
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              <button
                className="modal-btn"
                onClick={() => {
                  const text = buildAdminSheetText(data);
                  setAdminSheetText(text);
                  downloadTextFile("교번관리자편집.tsv", text);
                }}
              >
                현재표 다운로드
              </button>

              <label className="modal-btn" style={{ cursor: "pointer" }}>
                파일 불러오기
                <input
                  type="file"
                  accept=".tsv,.csv,.txt"
                  style={{ display: "none" }}
                  onChange={handleAdminSheetFileUpload}
                />
              </label>

              <button
                className="modal-btn"
                onClick={() => {
                  const text = buildAdminSheetText(data);
                  setAdminSheetText(text);
                  setAdminSheetError("");
                }}
              >
                현재표 다시 불러오기
              </button>

              <button className="modal-btn" onClick={resetAdminRoster}>
                관리자 변경 초기화
              </button>
            </div>

            <textarea
              className="input"
              value={adminSheetText}
              onChange={(e) => setAdminSheetText(e.target.value)}
              style={{ minHeight: 280, fontFamily: "monospace", whiteSpace: "pre" }}
              placeholder="여기에 엑셀/구글시트 내용을 복사해서 붙여넣으세요."
            />

            {adminSheetError && (
              <div className="help-text" style={{ color: "#dc2626", marginTop: 8 }}>
                {adminSheetError}
              </div>
            )}

            <div className="modal-actions">
              <button className="modal-btn" onClick={() => setShowAdminSheet(false)}>취소</button>
              <button className="modal-btn primary" onClick={applyAdminSheetChanges} disabled={adminSaving}>
                {adminSaving ? "저장중..." : "적용"}
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

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

const BASE_DATE = "2026-03-30";
const ADMIN_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxdEOtps60qtHeyXtC7O_n9XmzgagOTLqkp0BDcQX7U9upbCQAojeXUD3N61_mO9phRgQ/exec";

const ADMIN_NAME = "권재림";
const ADMIN_PASSWORD = "7717tutu";

let REMOTE_BASE_DATE = BASE_DATE;
function setGlobalBaseDate(value) {
  REMOTE_BASE_DATE = value || BASE_DATE;
}

const FALLBACK_TEAM_ANCHORS = {
  ks: { code: "2d", name: "조성래" },
  my: { code: "2d", name: "이승용" },
  wb: { code: "대4", name: "이석재" },
  as: { code: "4d", name: "강병웅" },
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

const LS_SHARED_CONFIG_CACHE = "gyobeon_shared_config_cache";
const LS_REMOTE_ROSTER_CACHE = "gyobeon_remote_roster_cache";
const LS_LAST_SEEN_PUBLISHED_AT = "gyobeon_last_seen_published_at";

function normalizeNameKey(name) {
  return String(name || "").trim().toLowerCase().replace(/\s+/g, "");
}

function shouldHideName(name) {
  return HIDDEN_NAME_KEYS.includes(normalizeNameKey(name));
}

function samePersonName(a, b) {
  return (
    String(a || "").trim().replace(/\s/g, "") ===
    String(b || "").trim().replace(/\s/g, "")
  );
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
  return HOLIDAYS.includes(String(dateStr || "").trim());
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
  if (isSaturday(dateStr)) return "#2563eb";
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
    return "nor";
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

function getDiaOrder(team) {
  if (team?.diaOrder?.length) return team.diaOrder;
  return getGyobunOrder(team);
}

function normalizeToFixedCode(team, code) {
  const fixedCodes = getGyobunOrder(team);
  return (
    fixedCodes.find((item) => normalizeCodeKey(item) === normalizeCodeKey(code)) ||
    code ||
    ""
  );
}

function shiftCodeByDays(team, baseCode, dayOffset) {
  const order = getGyobunOrder(team);
  const baseIdx = order.findIndex(
    (code) => normalizeCodeKey(code) === normalizeCodeKey(baseCode)
  );

  if (baseIdx < 0) return baseCode || "";
  return order[positiveMod(baseIdx + dayOffset, order.length)] || baseCode || "";
}

function getAllGridLayout(count) {
  if (count >= 49) return { cols: 6, className: "density-6" };
  if (count >= 36) return { cols: 5, className: "density-5" };
  return { cols: 4, className: "density-4" };
}

function createTeamBucket(teamKey) {
  return {
    key: teamKey,
    label: TEAM_LABELS[teamKey],
    names: [],
    gyobun: [],
    diaOrder: [],
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
      diaOrder: Array.isArray(team.diaOrder) ? [...team.diaOrder] : [],
      people: Array.isArray(team.people) ? team.people.map((p) => ({ ...p })) : [],
      info: team.info
        ? { ...team.info, raw: [...(team.info.raw || [])] }
        : createTeamBucket(teamKey).info,
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
    if (fileName === "dialist.txt") team.diaOrder = parseLines(content);
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
    const raw = JSON.parse(localStorage.getItem("gyobeon_my_selection") || "null");
    if (!raw) return null;
    return {
      teamKey: raw.teamKey || "ks",
      name: raw.name || "",
      code: raw.code || "",
      anchorDate: raw.anchorDate || formatDate(new Date()),
    };
  } catch {
    return null;
  }
}

function saveMySelection(value) {
  const next = {
    teamKey: value?.teamKey || "ks",
    name: value?.name || "",
    code: value?.code || "",
    anchorDate: value?.anchorDate || formatDate(new Date()),
  };
  localStorage.setItem("gyobeon_my_selection", JSON.stringify(next));
}

function clearMySelection() {
  localStorage.removeItem("gyobeon_my_selection");
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

function getEmptyRemoteRoster() {
  return {
    ks: [],
    my: [],
    wb: [],
    as: [],
  };
}

function loadCachedSharedConfig() {
  try {
    return JSON.parse(localStorage.getItem(LS_SHARED_CONFIG_CACHE) || "null");
  } catch {
    return null;
  }
}

function saveCachedSharedConfig(value) {
  try {
    localStorage.setItem(LS_SHARED_CONFIG_CACHE, JSON.stringify(value || null));
  } catch (_) {}
}

function normalizeTeamKey(value) {
  const v = String(value || "").trim().toLowerCase();
  if (TEAM_ORDER.includes(v)) return v;
  const found = TEAM_ORDER.find((key) => TEAM_LABELS[key] === String(value || "").trim());
  return found || "";
}

function normalizeRemoteRosterShape(input) {
  const result = getEmptyRemoteRoster();
  if (!input || typeof input !== "object") return result;

  const rows = Array.isArray(input.rows) ? input.rows : Array.isArray(input) ? input : [];

  rows.forEach((row) => {
    const teamKey =
      normalizeTeamKey(row?.team) ||
      normalizeTeamKey(row?.teamKey) ||
      normalizeTeamKey(row?.teamLabel) ||
      normalizeTeamKey(row?.소속);

    const gyobun = String(row?.gyobun || row?.교번 || row?.code || "").trim();
    const employeeId = String(row?.employeeId || row?.직원ID || row?.id || "").trim();
    const name = String(row?.name || row?.이름 || "").trim();

    if (!teamKey || !gyobun || !name) return;

    result[teamKey].push({
      code: gyobun,
      employeeId,
      name,
    });
  });

  return result;
}

function loadCachedRemoteRoster() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_REMOTE_ROSTER_CACHE) || "null");
    return normalizeRemoteRosterShape(raw);
  } catch {
    return getEmptyRemoteRoster();
  }
}

function saveCachedRemoteRoster(value) {
  try {
    localStorage.setItem(LS_REMOTE_ROSTER_CACHE, JSON.stringify(value || getEmptyRemoteRoster()));
  } catch (_) {}
}

function getOverrideKey(teamKey, index) {
  return `${teamKey}_${index}`;
}

function buildAssignedGrid(team, anchorName, anchorCode, dayOffset, overrides) {
  if (!team || !team.people?.length) return [];

  const people = team.people;
  const fixedCodes = getGyobunOrder(team);

  const anchorPersonIndex = people.findIndex((p) => samePersonName(p.name, anchorName));
  const anchorCodeIndex = fixedCodes.findIndex(
    (code) => normalizeCodeKey(code) === normalizeCodeKey(anchorCode)
  );

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
  const people = Array.isArray(team?.people) ? team.people : [];
  const fixedCodes = getGyobunOrder(team);
  const baseDate = REMOTE_BASE_DATE || BASE_DATE;

  if (!people.length) {
    return {
      name: team?.info?.baseName || "",
      code: team?.info?.baseCode || fixedCodes[0] || "",
      anchorDate: baseDate,
    };
  }

  const matchedPerson = people.find((p) => samePersonName(p.name, team?.info?.baseName));

  if (matchedPerson) {
    return {
      name: matchedPerson.name,
      code: matchedPerson.baseCode || team?.info?.baseCode || fixedCodes[0] || "",
      anchorDate: baseDate,
    };
  }

  const firstPerson = people[0];

  return {
    name: firstPerson?.name || "",
    code: firstPerson?.baseCode || team?.info?.baseCode || fixedCodes[0] || "",
    anchorDate: baseDate,
  };
}

function findRemoteRowByName(teamKey, name, remoteRoster) {
  const rows = remoteRoster?.[teamKey] || [];
  return rows.find((row) => samePersonName(row.name, name)) || null;
}

function findZipPersonByName(team, name) {
  if (!team?.people?.length) return null;
  return team.people.find((p) => samePersonName(p.name, name)) || null;
}

function buildTeamAnchorFromRemote(teamKey, team, remoteRoster) {
  const rows = remoteRoster?.[teamKey] || [];
  const gyobunOrder = getGyobunOrder(team);

  for (const code of gyobunOrder) {
    const found = rows.find(
      (row) => normalizeCodeKey(row.code) === normalizeCodeKey(code)
    );

    if (found?.name) {
      return {
        name: found.name,
        code,
        anchorDate: REMOTE_BASE_DATE || BASE_DATE,
      };
    }
  }

  const fallback = FALLBACK_TEAM_ANCHORS[teamKey];
  if (fallback?.name && fallback?.code) {
    return {
      name: fallback.name,
      code: normalizeToFixedCode(team, fallback.code),
      anchorDate: BASE_DATE,
    };
  }

  return buildTeamAnchorForDate(team);
}

function buildAnchorForIdentity(teamKey, team, remoteRoster, name, mySelection = null) {
  if (!team || !name) {
    return buildTeamAnchorFromRemote(teamKey, team, remoteRoster);
  }

  const remoteRow = findRemoteRowByName(teamKey, name, remoteRoster);
  if (remoteRow?.code) {
    return {
      name,
      code: normalizeToFixedCode(team, remoteRow.code),
      anchorDate: REMOTE_BASE_DATE || BASE_DATE,
    };
  }

  if (
    mySelection?.teamKey === teamKey &&
    samePersonName(mySelection?.name, name) &&
    mySelection?.code
  ) {
    return {
      name,
      code: normalizeToFixedCode(team, mySelection.code),
      anchorDate: mySelection.anchorDate || BASE_DATE,
    };
  }

  const zipPerson = findZipPersonByName(team, name);
  if (zipPerson?.baseCode) {
    return {
      name,
      code: normalizeToFixedCode(team, zipPerson.baseCode),
      anchorDate: REMOTE_BASE_DATE || BASE_DATE,
    };
  }

  return buildTeamAnchorFromRemote(teamKey, team, remoteRoster);
}

function buildAllTeamsAutoAnchorsFromIdentity(
  data,
  remoteRoster,
  selectedTeamKey,
  selectedName,
  mySelection = null
) {
  const result = {};

  TEAM_ORDER.forEach((teamKey) => {
    const team = data?.[teamKey];
    if (!team) return;

    if (teamKey === selectedTeamKey && selectedName) {
      result[teamKey] = buildAnchorForIdentity(
        teamKey,
        team,
        remoteRoster,
        selectedName,
        mySelection
      );
      return;
    }

    result[teamKey] = buildTeamAnchorFromRemote(teamKey, team, remoteRoster);
  });

  return result;
}

function applyRemoteRosterToData(baseData, remoteRoster) {
  if (!baseData) return null;

  const next = cloneTeamData(baseData);

  TEAM_ORDER.forEach((teamKey) => {
    const team = next[teamKey];
    if (!team) return;

    const rows = Array.isArray(remoteRoster?.[teamKey]) ? remoteRoster[teamKey] : [];
    if (!rows.length) return;

    const fixedOrder = getGyobunOrder(team);
    const mapped = [];

    fixedOrder.forEach((slotCode, idx) => {
      const found = rows.find(
        (row) => normalizeCodeKey(row.code) === normalizeCodeKey(slotCode)
      );
      if (!found) return;
      if (shouldHideName(found.name)) return;

      mapped.push({
        idx,
        name: found.name,
        baseCode: slotCode,
        employeeId: found.employeeId || "",
      });
    });

    const minRequired = Math.max(1, Math.floor(fixedOrder.length * 0.7));
    if (mapped.length < minRequired) return;

    team.people = mapped;
    team.names = mapped.map((p) => p.name);
    team.gyobun = fixedOrder.slice();
    team.info = {
      ...team.info,
      totalCount: mapped.length,
      baseName:
        team.info?.baseName && mapped.some((p) => samePersonName(p.name, team.info.baseName))
          ? team.info.baseName
          : mapped[0]?.name || "",
      baseCode:
        team.info?.baseCode &&
        fixedOrder.some((code) => normalizeCodeKey(code) === normalizeCodeKey(team.info.baseCode))
          ? team.info.baseCode
          : fixedOrder[0] || "",
      baseDate: REMOTE_BASE_DATE || BASE_DATE,
    };
  });

  return next;
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

function fetchJsonp(params = {}, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const callbackName = `gyobeonJsonp_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const script = document.createElement("script");

    const cleanup = () => {
      try {
        delete window[callbackName];
      } catch (_) {}
      if (script.parentNode) script.parentNode.removeChild(script);
    };

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("JSONP 로드 시간 초과"));
    }, timeoutMs);

    window[callbackName] = (data) => {
      clearTimeout(timeout);
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      clearTimeout(timeout);
      cleanup();
      reject(new Error("JSONP 로드 실패"));
    };

    const search = new URLSearchParams({
      ...params,
      callback: callbackName,
      t: String(Date.now()),
    });

    script.src = `${ADMIN_SCRIPT_URL}?${search.toString()}`;
    document.body.appendChild(script);
  });
}

function fetchRemoteRosterJsonp(timeoutMs = 6000) {
  return fetchJsonp({ mode: "roster" }, timeoutMs);
}

function fetchSharedConfigJsonp(timeoutMs = 4000) {
  return fetchJsonp({ mode: "config" }, timeoutMs);
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

async function saveParsedData(value) {
  const db = await openZipDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("files", "readwrite");
    const store = tx.objectStore("files");
    store.put({ data: value, savedAt: Date.now() }, "parsedData");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadParsedData() {
  const db = await openZipDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("files", "readonly");
    const store = tx.objectStore("files");
    const req = store.get("parsedData");
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

function promptAdminPassword() {
  const value = window.prompt("관리자 비밀번호를 입력하세요");
  if (value == null) return null;
  if (String(value).trim() !== ADMIN_PASSWORD) {
    alert("비밀번호가 올바르지 않습니다.");
    return null;
  }
  return String(value).trim();
}

function App() {
  const initialSelection = loadMySelection();
  const initialGroups = loadGroups();
  const initialDate = formatDate(new Date());

  const cachedShared = loadCachedSharedConfig();
  if (cachedShared?.baseDate) {
    setGlobalBaseDate(cachedShared.baseDate);
  }

  const [zipName, setZipName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  const [remoteRoster, setRemoteRoster] = useState(loadCachedRemoteRoster());
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [refreshRosterMessage, setRefreshRosterMessage] = useState("");

  const [pendingRosterJson, setPendingRosterJson] = useState(null);
  const [showUpdatePopup, setShowUpdatePopup] = useState(false);
  const [lastSeenPublishedAt, setLastSeenPublishedAt] = useState(
    localStorage.getItem(LS_LAST_SEEN_PUBLISHED_AT) || ""
  );

  const [activeTab, setActiveTab] = useState("home");
  const activeTabRef = useRef("home");

  const [selectedTeam, setSelectedTeam] = useState(initialSelection?.teamKey || "ks");
  const [viewTeam, setViewTeam] = useState(initialSelection?.teamKey || "ks");
  const [selectedDate, setSelectedDate] = useState(initialDate);

  const [mySelection, setMySelection] = useState(
    initialSelection || {
      teamKey: "ks",
      name: "",
      code: "",
      anchorDate: initialDate,
    }
  );

  const [teamAnchors, setTeamAnchors] = useState({
    ks: { name: "", code: "", anchorDate: REMOTE_BASE_DATE },
    my: { name: "", code: "", anchorDate: REMOTE_BASE_DATE },
    wb: { name: "", code: "", anchorDate: REMOTE_BASE_DATE },
    as: { name: "", code: "", anchorDate: REMOTE_BASE_DATE },
  });

  const [remoteBaseDate, setRemoteBaseDate] = useState(cachedShared?.baseDate || BASE_DATE);
  const [savingSharedConfig, setSavingSharedConfig] = useState(false);

  const [overrides, setOverrides] = useState({});
  const [editMode, setEditMode] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const [pathOpen, setPathOpen] = useState(false);
  const [pathTarget, setPathTarget] = useState(null);
  const [pathImage, setPathImage] = useState("");
  const [pathTeamKey, setPathTeamKey] = useState("");

  const [showSettings, setShowSettings] = useState(false);
  const [allowProfileEdit, setAllowProfileEdit] = useState(
    !initialSelection?.name || !initialSelection?.code
  );

  const [groups, setGroups] = useState(initialGroups);
  const [currentGroup, setCurrentGroup] = useState(Object.keys(initialGroups)[0] || "");
  const [groupBaseDate, setGroupBaseDate] = useState(selectedDate);
  const [selectedGroupDate, setSelectedGroupDate] = useState("");
  const [showGroupAdd, setShowGroupAdd] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [groupAddTeam, setGroupAddTeam] = useState("ks");
  const [groupAddName, setGroupAddName] = useState("");

  const [deferredPrompt, setDeferredPrompt] = useState(null);

  const pathOpenRef = useRef(false);
  const editOpenRef = useRef(false);

  const effectiveData = useMemo(() => {
    if (!data) return null;
    return applyRemoteRosterToData(data, remoteRoster);
  }, [data, remoteRoster]);

  const isAdminUser = samePersonName(mySelection?.name, ADMIN_NAME);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    setOverrides(loadOverrides());
  }, []);

  useEffect(() => {
    saveMySelection(mySelection);
  }, [mySelection]);

  useEffect(() => {
    let cancelled = false;

    async function initAppFast() {
      try {
        const shared = loadCachedSharedConfig();
        if (shared?.baseDate) {
          setGlobalBaseDate(shared.baseDate);
          setRemoteBaseDate(shared.baseDate);
        }

        try {
          const parsedSaved = await loadParsedData();
          if (!cancelled && parsedSaved?.data) {
            setData(parsedSaved.data);
          }

          const savedZip = await loadZipBlob();
          if (!cancelled && savedZip?.name) {
            setZipName(savedZip.name || "저장된 ZIP");
          }

          if (!cancelled && !parsedSaved?.data && savedZip?.blob) {
            setZipName(savedZip.name || "저장된 ZIP");
            await parseAndSetZip(
              savedZip.blob,
              false,
              true,
              loadCachedRemoteRoster(),
              false
            );
          }
        } catch (e) {
          console.log("로컬 복원 실패", e);
        }
      } catch (e) {
        console.log("초기 로컬 복원 실패", e);
      }

      try {
        const shared = await fetchSharedConfigJsonp(4000);
        if (cancelled) return;

        if (shared?.baseDate) {
          saveCachedSharedConfig(shared);
          setGlobalBaseDate(shared.baseDate);
          setRemoteBaseDate(shared.baseDate);
        }
      } catch (e) {
        console.log("공용 기준일 백그라운드 로드 실패", e);
      }

      try {
        setRemoteLoading(true);
        const json = await fetchRemoteRosterJsonp(6000);
        if (cancelled) return;

        const next = normalizeRemoteRosterShape(json);
        const hasAny = TEAM_ORDER.some((teamKey) => (next[teamKey] || []).length > 0);
        const serverPublishedAt = String(json?.publishedAt || "").trim();

        if (hasAny) {
          if (serverPublishedAt && lastSeenPublishedAt && serverPublishedAt !== lastSeenPublishedAt) {
            setPendingRosterJson(json);
            setShowUpdatePopup(true);
          } else {
            setRemoteRoster(next);
            saveCachedRemoteRoster(next);

            if (serverPublishedAt) {
              localStorage.setItem(LS_LAST_SEEN_PUBLISHED_AT, serverPublishedAt);
              setLastSeenPublishedAt(serverPublishedAt);
            }
          }
        }
      } catch (e) {
        console.log("원격 현재배정 백그라운드 로드 실패", e);
      } finally {
        if (!cancelled) {
          setRemoteLoading(false);
        }
      }
    }

    initAppFast();

    return () => {
      cancelled = true;
    };
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

      if (showUpdatePopup) {
        setShowUpdatePopup(false);
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
  }, [showUpdatePopup]);

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
    if (showUpdatePopup && (!window.history.state || window.history.state.layer !== "update")) {
      window.history.pushState({ __gyobeon: true, layer: "update" }, "");
    }
  }, [showUpdatePopup]);

  useEffect(() => {
    setGroupBaseDate(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    if (!effectiveData) return;

    if (mySelection?.teamKey && mySelection?.name) {
      const autoAnchors = buildAllTeamsAutoAnchorsFromIdentity(
        effectiveData,
        remoteRoster,
        mySelection.teamKey,
        mySelection.name,
        mySelection
      );

      setTeamAnchors(autoAnchors);
      setSelectedTeam(mySelection.teamKey);

      if (activeTabRef.current === "home") {
        setViewTeam(mySelection.teamKey);
      }
      return;
    }

    const nextAnchors = {};
    TEAM_ORDER.forEach((teamKey) => {
      const team = effectiveData[teamKey];
      nextAnchors[teamKey] = buildTeamAnchorFromRemote(teamKey, team, remoteRoster);
    });
    setTeamAnchors(nextAnchors);
  }, [effectiveData, remoteRoster, mySelection]);

  useEffect(() => {
    if (!allowProfileEdit) return;

    const teamKey = selectedTeam;
    const currentName =
      mySelection?.teamKey === teamKey ? mySelection?.name || "" : "";

    if (!currentName) return;

    const team = effectiveData?.[teamKey] || data?.[teamKey];
    if (!team) return;

    let nextCode = "";
    const remoteRow = findRemoteRowByName(teamKey, currentName, remoteRoster);
    if (remoteRow?.code) {
      nextCode = normalizeToFixedCode(team, remoteRow.code);
    } else {
      const zipPerson = findZipPersonByName(team, currentName);
      if (zipPerson?.baseCode) {
        nextCode = normalizeToFixedCode(team, zipPerson.baseCode);
      }
    }

    if (!nextCode) return;

    if (
      mySelection?.teamKey !== teamKey ||
      normalizeCodeKey(mySelection?.code) !== normalizeCodeKey(nextCode)
    ) {
      setMySelection((prev) => ({
        ...prev,
        teamKey,
        code: nextCode,
        anchorDate: REMOTE_BASE_DATE || BASE_DATE,
      }));
    }
  }, [allowProfileEdit, selectedTeam, mySelection?.name, remoteRoster, effectiveData, data]);

  const currentTeam = effectiveData?.[selectedTeam] || null;
  const currentViewTeam = effectiveData?.[viewTeam] || null;
  const currentViewAnchor =
    teamAnchors[viewTeam] || { name: "", code: "", anchorDate: REMOTE_BASE_DATE };

  const hasRemoteForSelectedTeam = (remoteRoster?.[selectedTeam] || []).length > 0;
  const setupSourceData =
    allowProfileEdit && hasRemoteForSelectedTeam && effectiveData ? effectiveData : data;

  const myInfo = useMemo(() => {
    const myTeamKey = mySelection?.teamKey || selectedTeam;
    const myName = mySelection?.name || "";

    const team = effectiveData?.[myTeamKey];
    if (!team || !myName) return null;

    const anchor = buildAnchorForIdentity(
      myTeamKey,
      team,
      remoteRoster,
      myName,
      mySelection
    );
    if (!anchor?.code) return null;

    const dayOffset = diffDays(anchor.anchorDate || REMOTE_BASE_DATE || BASE_DATE, selectedDate);
    const code = shiftCodeByDays(team, anchor.code, dayOffset);

    return {
      code,
      time: pickWorktime(team, code, selectedDate),
    };
  }, [effectiveData, remoteRoster, selectedDate, selectedTeam, mySelection]);

  const allGrid = useMemo(() => {
    if (!currentViewTeam) return [];

    let anchorName = "";
    let anchorCode = "";
    let anchorDate = REMOTE_BASE_DATE || BASE_DATE;

    if (
      mySelection?.teamKey === viewTeam &&
      mySelection?.name &&
      mySelection?.code
    ) {
      anchorName = mySelection.name;
      anchorCode = normalizeToFixedCode(currentViewTeam, mySelection.code);
      anchorDate = mySelection.anchorDate || BASE_DATE;
    } else {
      const teamAnchor = buildTeamAnchorFromRemote(
        viewTeam,
        currentViewTeam,
        remoteRoster
      );
      anchorName = teamAnchor?.name || "";
      anchorCode = normalizeToFixedCode(currentViewTeam, teamAnchor?.code || "");
      anchorDate = teamAnchor?.anchorDate || REMOTE_BASE_DATE || BASE_DATE;
    }

    if (!anchorName || !anchorCode) {
      return buildAssignedGrid(currentViewTeam, "", "", 0, overrides);
    }

    const dayOffset = diffDays(anchorDate, selectedDate);

    return buildAssignedGrid(
      currentViewTeam,
      anchorName,
      anchorCode,
      dayOffset,
      overrides
    );
  }, [
    currentViewTeam,
    viewTeam,
    remoteRoster,
    overrides,
    selectedDate,
    mySelection,
  ]);

  const visibleAllGrid = useMemo(() => {
    return allGrid.filter((item) => item && item.name && !shouldHideName(item.name));
  }, [allGrid]);

  const allGridLayout = useMemo(() => {
    return getAllGridLayout(visibleAllGrid.length || 0);
  }, [visibleAllGrid.length]);

  const allGridRows = useMemo(() => {
    return Math.max(1, Math.ceil((visibleAllGrid.length || 1) / allGridLayout.cols));
  }, [visibleAllGrid.length, allGridLayout.cols]);

  const diaList = useMemo(() => {
    const team = currentViewTeam;
    if (!team) return [];

    const teamAnchor = currentViewAnchor;
    const dayOffset = diffDays(
      teamAnchor.anchorDate || REMOTE_BASE_DATE || BASE_DATE,
      selectedDate
    );

    const grid = buildAssignedGrid(
      team,
      teamAnchor.name,
      teamAnchor.code,
      dayOffset,
      overrides
    );

    const diaOrder = getDiaOrder(team);

    return diaOrder.map((code) => {
      const found = grid.find(
        (item) => normalizeCodeKey(item.code) === normalizeCodeKey(code)
      );

      return {
        code,
        idx: found?.idx ?? -1,
        name: found?.name || "-",
        displayName: found?.displayName || found?.name || "-",
      };
    });
  }, [currentViewTeam, currentViewAnchor, selectedDate, overrides]);

  const monthMatrix = useMemo(() => getMonthMatrix(selectedDate), [selectedDate]);
  const monthHeaderDate = parseLocalDate(selectedDate);
  const weekDates = useMemo(() => getWeekDates(groupBaseDate), [groupBaseDate]);
  const groupMembers = groups[currentGroup] || [];

  useEffect(() => {
    if (!weekDates.length) return;
    if (!selectedGroupDate || !weekDates.includes(selectedGroupDate)) {
      setSelectedGroupDate(weekDates[0]);
    }
  }, [weekDates, selectedGroupDate]);

  function switchTab(tabName) {
    if (tabName === activeTabRef.current) return;

    if (tabName === "all") {
      setViewTeam(selectedTeam);
    }

    if (tabName === "dia" && activeTabRef.current !== "all") {
      setViewTeam(selectedTeam);
    }

    setActiveTab(tabName);

    if (tabName === "home") {
      window.history.pushState({ __gyobeon: true, layer: "root" }, "");
    } else {
      window.history.pushState({ __gyobeon: true, layer: `tab-${tabName}` }, "");
    }
  }

  async function parseAndSetZip(
    fileOrBlob,
    saveToIdb = true,
    keepSavedSelection = false,
    rosterForApply = remoteRoster,
    showBusy = true
  ) {
    if (showBusy) setLoading(true);
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

      await saveParsedData(nextData);
      setData(nextData);

      const nextEffectiveData = applyRemoteRosterToData(
        nextData,
        rosterForApply || getEmptyRemoteRoster()
      );

      if (!keepSavedSelection) {
        setAllowProfileEdit(true);

        const defaultTeam = mySelection?.teamKey || selectedTeam || "ks";
        const defaultName =
          mySelection?.name ||
          nextEffectiveData?.[defaultTeam]?.info?.baseName ||
          nextEffectiveData?.[defaultTeam]?.people?.[0]?.name ||
          "";

        const autoAnchors = buildAllTeamsAutoAnchorsFromIdentity(
          nextEffectiveData,
          rosterForApply || getEmptyRemoteRoster(),
          defaultTeam,
          defaultName,
          mySelection
        );
        setTeamAnchors(autoAnchors);
      }
    } catch (e) {
      console.error(e);
      setError("ZIP 파일을 읽는 중 오류가 발생했습니다.");
    } finally {
      if (showBusy) setLoading(false);
    }
  }

  async function handleZipUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setZipName(file.name);
    await parseAndSetZip(file, true, false, remoteRoster, true);
  }

  async function refreshLatestRoster(showAlert = true) {
    try {
      setRemoteLoading(true);
      setRefreshRosterMessage("");

      const json = await fetchRemoteRosterJsonp(8000);
      const next = normalizeRemoteRosterShape(json);
      const hasAny = TEAM_ORDER.some((teamKey) => (next[teamKey] || []).length > 0);
      const serverPublishedAt = String(json?.publishedAt || "").trim();

      if (!hasAny) {
        throw new Error("배포된 최신 현재배정 데이터가 없습니다.");
      }

      setRemoteRoster(next);
      saveCachedRemoteRoster(next);

      if (serverPublishedAt) {
        localStorage.setItem(LS_LAST_SEEN_PUBLISHED_AT, serverPublishedAt);
        setLastSeenPublishedAt(serverPublishedAt);
      }

      setPendingRosterJson(null);
      setShowUpdatePopup(false);
      setRefreshRosterMessage("배포된 최신 인원이 반영되었습니다.");

      if (showAlert) {
        alert("배포된 최신 인원이 반영되었습니다.");
      }
    } catch (e) {
      console.error(e);
      setRefreshRosterMessage("최신 인원 불러오기에 실패했습니다.");
      if (showAlert) {
        alert(`최신 인원 불러오기 실패: ${e.message || e}`);
      }
    } finally {
      setRemoteLoading(false);
      setTimeout(() => setRefreshRosterMessage(""), 1800);
    }
  }

  async function saveSharedConfig() {
    if (!isAdminUser) {
      alert("관리자만 저장할 수 있습니다.");
      return;
    }

    const adminKey = promptAdminPassword();
    if (!adminKey) return;

    try {
      setSavingSharedConfig(true);

      const payload = {
        action: "saveConfig",
        adminKey,
        baseDate: remoteBaseDate,
        zipBase64: "",
      };

      const res = await fetch(ADMIN_SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!json?.ok) {
        throw new Error(json?.error || "공용 기준일 저장 실패");
      }

      setGlobalBaseDate(remoteBaseDate);
      saveCachedSharedConfig({ baseDate: remoteBaseDate });
      alert("공용 기준일 저장 완료");
    } catch (e) {
      console.error(e);
      alert(`저장 실패: ${e.message || e}`);
    } finally {
      setSavingSharedConfig(false);
    }
  }

  async function publishRoster() {
    if (!isAdminUser) {
      alert("관리자만 배포할 수 있습니다.");
      return;
    }

    const adminKey = promptAdminPassword();
    if (!adminKey) return;

    try {
      setSavingSharedConfig(true);

      const payload = {
        action: "publishRoster",
        adminKey,
        baseDate: remoteBaseDate,
      };

      const res = await fetch(ADMIN_SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!json?.ok) {
        throw new Error(json?.error || "배포 실패");
      }

      if (json?.baseDate) {
        setGlobalBaseDate(json.baseDate);
        setRemoteBaseDate(json.baseDate);
        saveCachedSharedConfig({ baseDate: json.baseDate });
      }

      if (json?.publishedAt) {
        localStorage.setItem(LS_LAST_SEEN_PUBLISHED_AT, json.publishedAt);
        setLastSeenPublishedAt(json.publishedAt);
      }

      await refreshLatestRoster(false);

      alert(`배포 완료 (${json?.publishedCount || 0}건)`);
    } catch (e) {
      console.error(e);
      alert(`배포 실패: ${e.message || e}`);
    } finally {
      setSavingSharedConfig(false);
    }
  }

  function applyInitialSelection(teamKey, name, code) {
    if (!teamKey || !name || !code) return;

    setMySelection({
      teamKey,
      name,
      code,
      anchorDate: selectedDate,
    });

    setSelectedTeam(teamKey);
    setViewTeam(teamKey);
    setAllowProfileEdit(false);
  }

  function startReconfigureProfile() {
    setAllowProfileEdit(true);
    setSelectedTeam(mySelection?.teamKey || selectedTeam || "ks");
  }

  function cancelReconfigureProfile() {
    if (mySelection?.teamKey) {
      setSelectedTeam(mySelection.teamKey);
      setViewTeam(mySelection.teamKey);
    }
    setAllowProfileEdit(false);
  }

  function resetMyProfile() {
    clearMySelection();
    setMySelection({
      teamKey: "ks",
      name: "",
      code: "",
      anchorDate: formatDate(new Date()),
    });
    setAllowProfileEdit(true);
    setSelectedTeam("ks");
    setViewTeam("ks");
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
    if (!currentViewTeam || !item?.code) return;
    const image = findPathImage(currentViewTeam, selectedDate, item.code);
    setPathTeamKey(viewTeam);
    setPathTarget(item);
    setPathImage(image || "");
    setPathOpen(true);
  }

  function openPathDialogForTeamAndDate(teamKey, item, dateStr) {
    const team = effectiveData?.[teamKey];
    if (!team || !item?.code) return;

    const image = findPathImage(team, dateStr, item.code);
    setViewTeam(teamKey);
    setSelectedDate(dateStr);
    setPathTeamKey(teamKey);
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

  function createGroup() {
    const name = newGroupName.trim();
    if (!name) {
      alert("그룹 이름을 입력해주세요.");
      return;
    }

    const next = { ...groups };
    if (!next[name]) next[name] = [];

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
    if (!next[targetGroup]) next[targetGroup] = [];

    const exists = next[targetGroup].some(
      (item) => item.team === groupAddTeam && samePersonName(item.name, groupAddName)
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
      (item) => !(item.team === teamKey && samePersonName(item.name, name))
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

  function applyPendingRosterUpdate() {
    if (!pendingRosterJson) {
      setShowUpdatePopup(false);
      return;
    }

    const next = normalizeRemoteRosterShape(pendingRosterJson);
    const serverPublishedAt = String(pendingRosterJson?.publishedAt || "").trim();

    setRemoteRoster(next);
    saveCachedRemoteRoster(next);

    if (serverPublishedAt) {
      localStorage.setItem(LS_LAST_SEEN_PUBLISHED_AT, serverPublishedAt);
      setLastSeenPublishedAt(serverPublishedAt);
    }

    setPendingRosterJson(null);
    setShowUpdatePopup(false);
    alert("최신 교번 정보가 반영되었습니다.");
  }

  function closeUpdatePopup() {
    setShowUpdatePopup(false);
  }

  const canEnterApp =
    !!effectiveData &&
    !!mySelection?.teamKey &&
    !!mySelection?.name &&
    !!mySelection?.code &&
    !allowProfileEdit;

  return (
    <>
      <div className="container">
        {!effectiveData ? (
          <div className="card">
            <div className="card-title">기본자료 ZIP 등록</div>
            <input type="file" accept=".zip" className="input" onChange={handleZipUpload} />
            <div className="help-text">
              처음 한 번만 ZIP 파일을 등록하면 이후에는 자동으로 저장되어 계속 사용할 수 있습니다.
            </div>
            <div className="notice-box">
              관리자로부터 받은 최신 ZIP 파일을 선택해주세요.
            </div>
            {loading && <div className="help-text" style={{ color: "#2563eb" }}>불러오는 중...</div>}
            {zipName && <div className="help-text">현재 파일: {zipName}</div>}
            {error && <div className="help-text" style={{ color: "#dc2626" }}>{error}</div>}
          </div>
        ) : allowProfileEdit ? (
          <div className="card">
            <div className="card-title">초기 설정</div>

            <label className="label">내 소속</label>
            <select
              className="select"
              value={selectedTeam}
              onChange={(e) => {
                const nextTeam = e.target.value;
                setSelectedTeam(nextTeam);
                setMySelection((prev) => ({
                  ...prev,
                  teamKey: nextTeam,
                  name: "",
                  code: "",
                }));
              }}
            >
              {TEAM_ORDER.map((key) => (
                <option key={key} value={key}>
                  {TEAM_LABELS[key]}
                </option>
              ))}
            </select>

            <label className="label" style={{ marginTop: 12 }}>내 이름</label>
            <select
              className="select"
              value={mySelection?.teamKey === selectedTeam ? mySelection?.name || "" : ""}
              onChange={(e) => {
                setMySelection((prev) => ({
                  ...prev,
                  teamKey: selectedTeam,
                  name: e.target.value,
                }));
              }}
            >
              <option value="">선택</option>
              {(setupSourceData?.[selectedTeam]?.people || []).map((person) => (
                <option key={`${person.idx}-${person.name}`} value={person.name}>
                  {person.name}
                </option>
              ))}
            </select>

            <div className="modal-actions" style={{ justifyContent: "flex-start", marginTop: 10 }}>
              <button
                className="modal-btn"
                onClick={() => refreshLatestRoster(true)}
                disabled={remoteLoading}
              >
                {remoteLoading ? "불러오는 중..." : "이름이 없나요? 최신 인원 불러오기"}
              </button>
            </div>

            {!!refreshRosterMessage && (
              <div className="help-text" style={{ color: "#2563eb", marginTop: 6 }}>
                {refreshRosterMessage}
              </div>
            )}

            <label className="label" style={{ marginTop: 12 }}>오늘 교번</label>
            <select
              className="select"
              value={mySelection?.teamKey === selectedTeam ? mySelection?.code || "" : ""}
              onChange={(e) => {
                setMySelection((prev) => ({
                  ...prev,
                  teamKey: selectedTeam,
                  code: e.target.value,
                }));
              }}
            >
              <option value="">선택</option>
              {(setupSourceData?.[selectedTeam]?.gyobun || DEFAULT_GYOBUN).map((code, idx) => (
                <option key={`${code}-${idx}`} value={code}>
                  {code}
                </option>
              ))}
            </select>

            <label className="label" style={{ marginTop: 12 }}>기준 날짜</label>
            <input
              className="input"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />

            <div className="help-text" style={{ marginTop: 10 }}>
              이름이 최신 현재배정에 있으면 오늘 교번은 자동으로 채워집니다.
            </div>

            <div className="modal-actions">
              <button
                className="modal-btn primary"
                onClick={() =>
                  applyInitialSelection(
                    selectedTeam,
                    mySelection?.name,
                    mySelection?.code
                  )
                }
                disabled={!mySelection?.name || !mySelection?.code}
              >
                시작하기
              </button>
            </div>
          </div>
        ) : (
          <>
            {activeTab === "home" && (
              <>
                <div className="settings-row">
                  {deferredPrompt && (
                    <button className="install-btn" onClick={handleInstall}>설치</button>
                  )}
                  <button className="settings-btn" onClick={() => setShowSettings(true)}>설정</button>
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
                    <div className="main-code" style={{ color: getDateBasedColor(selectedDate) }}>
                      {myInfo?.code || "-"} {weekdayName(selectedDate)}
                    </div>

                    <div className="main-time" style={{ color: getDateBasedColor(selectedDate) }}>
                      {myInfo?.time || "----"}
                    </div>

                    <div className="main-subinfo">
                      {TEAM_LABELS[mySelection?.teamKey || selectedTeam] || "-"} / {mySelection?.name || "-"}
                    </div>

                    {remoteLoading && (
                      <div className="help-text" style={{ color: "#2563eb" }}>
                        배포된 최신 현재배정 불러오는 중...
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
                  {TEAM_ORDER.map((key) => {
                    const isActive = viewTeam === key;
                    const isMyTeam = selectedTeam === key;

                    return (
                      <button
                        key={key}
                        className={`all-team-tab ${isMyTeam ? "my-team" : ""} ${isActive ? "active" : ""}`}
                        onClick={() => setViewTeam(key)}
                      >
                        {TEAM_LABELS[key]}
                        {isActive && <span className="view-dot" />}
                      </button>
                    );
                  })}
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
                        viewTeam === (mySelection?.teamKey || selectedTeam) &&
                        (samePersonName(item.name, mySelection?.name) ||
                          samePersonName(item.displayName, mySelection?.name));

                      const isToday = selectedDate === formatDate(new Date());

                      return (
                        <div
                          key={`${item.idx}-${item.displayName}`}
                          className={`all-cell-real ${isMine ? "cell-my" : ""} ${isMine && isToday ? "cell-my-today" : ""}`}
                          style={
                            item.customColor
                              ? { background: item.customColor, backgroundImage: "none" }
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

            {activeTab === "dia" && (
              <div className="tab-page">
                <div className="all-tab-header">
                  <div className="all-header">
                    <button className="all-header-btn" onClick={() => setSelectedDate(addDays(selectedDate, -1))}>-</button>

                    <div className="all-header-title">
                      {TEAM_LABELS[viewTeam]} DIA순서 {parseLocalDate(selectedDate).getFullYear()}.
                      {parseLocalDate(selectedDate).getMonth() + 1}.
                      {parseLocalDate(selectedDate).getDate()} {weekdayName(selectedDate)}
                    </div>

                    <button className="all-header-btn" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>+</button>
                  </div>
                </div>

                <div className="all-team-tabs">
                  {TEAM_ORDER.map((key) => {
                    const isActive = viewTeam === key;
                    const isMyTeam = selectedTeam === key;

                    return (
                      <button
                        key={key}
                        className={`all-team-tab ${isMyTeam ? "my-team" : ""} ${isActive ? "active" : ""}`}
                        onClick={() => setViewTeam(key)}
                      >
                        {TEAM_LABELS[key]}
                        {isActive && <span className="view-dot" />}
                      </button>
                    );
                  })}
                </div>

                <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                  {diaList.map((item, idx) => (
                    <div
                      key={`${item.code}-${idx}`}
                      onClick={() => openPathDialog(item)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        padding: "14px 16px",
                        borderBottom: idx === diaList.length - 1 ? "none" : "1px solid #e5e7eb",
                        fontSize: 18,
                        background:
                          viewTeam === selectedTeam && samePersonName(item.name, currentViewAnchor.name)
                            ? "#eef6ff"
                            : "#ffffff",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontWeight: 800, width: 60, color: getDateBasedColor(selectedDate) }}>
                        {item.code}
                      </div>
                      <div style={{ color: "#111827", fontWeight: 600 }}>
                        {item.displayName || item.name}
                      </div>
                    </div>
                  ))}
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
                        const item = mySelection?.name
                          ? getPersonGyobunForDate(
                              effectiveData,
                              remoteRoster,
                              mySelection?.teamKey || selectedTeam,
                              mySelection.name,
                              date,
                              overrides,
                              mySelection
                            )
                          : null;

                        const sameMonth = parseLocalDate(date).getMonth() === monthHeaderDate.getMonth();
                        const isSelected = date === selectedDate;
                        const toneClass = getDateToneClass(date);

                        const targetTeamKey = mySelection?.teamKey || selectedTeam;
                        const worktime = item?.code
                          ? pickWorktime(effectiveData[targetTeamKey], item.code, date)
                          : "";
                        const { startTime, endTime } = splitWorktime(worktime);

                        return (
                          <button
                            key={date}
                            className={`month-cell ${sameMonth ? "" : "other-month"} ${isSelected ? "selected" : ""}`}
                            onClick={() => {
                              if (item?.code) {
                                openPathDialogForTeamAndDate(
                                  targetTeamKey,
                                  {
                                    code: item.code,
                                    name: item.name || mySelection?.name || "",
                                    displayName: item.displayName || mySelection?.name || "",
                                    idx: -1,
                                  },
                                  date
                                );
                              } else {
                                setSelectedDate(date);
                              }
                            }}
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
                        {weekDates.map((date) => {
                          const isSelectedCol = selectedGroupDate === date;

                          return (
                            <th
                              key={date}
                              onClick={() => setSelectedGroupDate(date)}
                              style={{
                                cursor: "pointer",
                                background: isSelectedCol ? "#ede9fe" : "",
                                borderBottom: isSelectedCol ? "3px solid #7c3aed" : "",
                                transition: "all 0.18s ease",
                              }}
                            >
                              <div
                                className={`${isSunday(date) || isHolidayDate(date) ? "sun" : ""} ${
                                  isSaturday(date) ? "sat" : ""
                                }`}
                              >
                                {weekdayShort(date)}
                              </div>
                              <div>{parseLocalDate(date).getDate()}</div>
                            </th>
                          );
                        })}
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
                                effectiveData,
                                remoteRoster,
                                member.team,
                                member.name,
                                date,
                                overrides,
                                mySelection
                              );

                              const isSelectedCol = selectedGroupDate === date;

                              return (
                                <td
                                  key={date}
                                  onClick={() => {
                                    setSelectedGroupDate(date);

                                    const targetDate = selectedGroupDate || date;

                                    if (item?.code) {
                                      openPathDialogForTeamAndDate(
                                        member.team,
                                        {
                                          code: item.code,
                                          name: item.name || member.name,
                                          displayName: item.displayName || member.name,
                                          idx: -1,
                                        },
                                        targetDate
                                      );
                                    }
                                  }}
                                  style={{
                                    cursor: "pointer",
                                    background: isSelectedCol ? "#f5f3ff" : "",
                                    fontWeight: isSelectedCol ? 700 : 500,
                                    color: isSelectedCol ? "#4c1d95" : "#111827",
                                    transition: "all 0.18s ease",
                                  }}
                                >
                                  {item?.code || "-"}
                                </td>
                              );
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

      {canEnterApp && (
        <div
          className={`bottom-tabs tabs-5 ${
            activeTab === "home"
              ? "home-theme"
              : activeTab === "all"
              ? "all-theme"
              : activeTab === "dia"
              ? "all-theme"
              : activeTab === "month"
              ? "month-theme"
              : "group-theme"
          }`}
        >
          <button className={`bottom-tab ${activeTab === "home" ? "active" : ""}`} onClick={() => switchTab("home")}>홈</button>
          <button className={`bottom-tab ${activeTab === "all" ? "active" : ""}`} onClick={() => switchTab("all")}>전체</button>
          <button className={`bottom-tab ${activeTab === "dia" ? "active" : ""}`} onClick={() => switchTab("dia")}>DIA순서</button>
          <button className={`bottom-tab ${activeTab === "month" ? "active" : ""}`} onClick={() => switchTab("month")}>월교번</button>
          <button className={`bottom-tab ${activeTab === "group" ? "active" : ""}`} onClick={() => switchTab("group")}>그룹</button>
        </div>
      )}

      {showSettings && (
        <div className="modal-backdrop" onClick={() => setShowSettings(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">설정</div>

            <label className="label">기본자료 ZIP 등록 / 변경</label>
            <input type="file" accept=".zip" className="input" onChange={handleZipUpload} />

            <div className="help-text">
              처음 한 번 등록하면 이후에는 자동 저장됩니다. ZIP 구조가 바뀔 때만 다시 등록하면 됩니다.
            </div>

            {!allowProfileEdit ? (
              <>
                <label className="label" style={{ marginTop: 14 }}>내 정보</label>
                <div className="notice-box" style={{ marginTop: 8 }}>
                  내 소속: {TEAM_LABELS[mySelection?.teamKey || selectedTeam] || "-"}<br />
                  내 이름: {mySelection?.name || "-"}<br />
                  내 기준교번: {mySelection?.code || "-"}<br />
                  기준날짜: {mySelection?.anchorDate || "-"}
                </div>

                <div className="help-text" style={{ marginTop: 10 }}>
                  앱은 먼저 ZIP/저장값으로 빠르게 열리고, 배포된 최신 현재배정은 뒤에서 자동 확인됩니다.
                </div>

                <div className="modal-actions">
                  <button className="modal-btn" onClick={startReconfigureProfile}>내 정보 다시 설정</button>
                </div>
              </>
            ) : (
              <>
                <label className="label" style={{ marginTop: 12 }}>내 소속</label>
                <select
                  className="select"
                  value={selectedTeam}
                  onChange={(e) => {
                    const nextTeam = e.target.value;
                    setSelectedTeam(nextTeam);
                    setMySelection((prev) => ({
                      ...prev,
                      teamKey: nextTeam,
                      name: "",
                      code: "",
                    }));
                  }}
                >
                  {TEAM_ORDER.map((key) => (
                    <option key={key} value={key}>{TEAM_LABELS[key]}</option>
                  ))}
                </select>

                <label className="label" style={{ marginTop: 12 }}>내 이름</label>
                <select
                  className="select"
                  value={mySelection?.teamKey === selectedTeam ? mySelection?.name || "" : ""}
                  onChange={(e) => {
                    setMySelection((prev) => ({
                      ...prev,
                      teamKey: selectedTeam,
                      name: e.target.value,
                    }));
                  }}
                >
                  <option value="">선택</option>
                  {(setupSourceData?.[selectedTeam]?.people || []).map((person) => (
                    <option key={`${person.idx}-${person.name}`} value={person.name}>
                      {person.name}
                    </option>
                  ))}
                </select>

                <div className="modal-actions" style={{ justifyContent: "flex-start", marginTop: 10 }}>
                  <button
                    className="modal-btn"
                    onClick={() => refreshLatestRoster(true)}
                    disabled={remoteLoading}
                  >
                    {remoteLoading ? "불러오는 중..." : "이름이 없나요? 최신 인원 불러오기"}
                  </button>
                </div>

                <label className="label" style={{ marginTop: 12 }}>오늘 교번</label>
                <select
                  className="select"
                  value={mySelection?.teamKey === selectedTeam ? mySelection?.code || "" : ""}
                  onChange={(e) => {
                    setMySelection((prev) => ({
                      ...prev,
                      teamKey: selectedTeam,
                      code: e.target.value,
                    }));
                  }}
                >
                  <option value="">선택</option>
                  {(setupSourceData?.[selectedTeam]?.gyobun || DEFAULT_GYOBUN).map((code, idx) => (
                    <option key={`${code}-${idx}`} value={code}>
                      {code}
                    </option>
                  ))}
                </select>

                <label className="label" style={{ marginTop: 12 }}>기준 날짜</label>
                <input
                  className="input"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />

                <div className="modal-actions">
                  <button className="modal-btn" onClick={cancelReconfigureProfile}>취소</button>
                  <button
                    className="modal-btn primary"
                    onClick={() =>
                      applyInitialSelection(
                        selectedTeam,
                        mySelection?.name,
                        mySelection?.code
                      )
                    }
                    disabled={!mySelection?.name || !mySelection?.code}
                  >
                    저장
                  </button>
                </div>
              </>
            )}

            {isAdminUser && (
              <div className="card" style={{ marginTop: 14, padding: 12 }}>
                <div className="label" style={{ marginBottom: 10 }}>관리자</div>

                <label className="label">공용 기준일</label>
                <input
                  className="input"
                  type="date"
                  value={remoteBaseDate}
                  onChange={(e) => {
                    setRemoteBaseDate(e.target.value);
                    setGlobalBaseDate(e.target.value);
                  }}
                />

                <div className="help-text" style={{ marginTop: 10 }}>
                  관리자에서 저장 또는 배포하면 공용 기준일과 배포본이 반영됩니다.
                </div>

                <div className="modal-actions">
                  <button
                    className="modal-btn"
                    onClick={() => refreshLatestRoster(true)}
                    disabled={remoteLoading || savingSharedConfig}
                  >
                    {remoteLoading ? "불러오는 중..." : "배포된 최신 인원 새로고침"}
                  </button>

                  <button
                    className="modal-btn"
                    onClick={publishRoster}
                    disabled={savingSharedConfig}
                  >
                    {savingSharedConfig ? "처리중..." : "현재배정 배포"}
                  </button>

                  <button
                    className="modal-btn primary"
                    onClick={saveSharedConfig}
                    disabled={savingSharedConfig}
                  >
                    {savingSharedConfig ? "저장중..." : "공용 기준일 저장"}
                  </button>
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button className="modal-btn" onClick={resetMyProfile}>내 정보 초기화</button>
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
              {(effectiveData?.[groupAddTeam]?.people || []).map((person) => (
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

            <div className="color-preview" style={{ backgroundColor: editColor || "#ffffff" }} />

            <div className="modal-actions">
              <button className="modal-btn" onClick={closeEditDialog}>아니요</button>
              <button className="modal-btn primary" onClick={() => commitEdit(editColor)}>변경</button>
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
              {TEAM_LABELS[pathTeamKey || viewTeam]} / {pathTarget?.displayName || pathTarget?.name} / {pathTarget?.code}
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

      {showUpdatePopup && (
        <div className="modal-backdrop" onClick={closeUpdatePopup}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">업데이트 알림</div>
            <div className="help-text" style={{ marginTop: 8 }}>
              새로운 교번 정보가 있습니다.<br />
              지금 업데이트하시겠습니까?
            </div>

            <div className="modal-actions">
              <button className="modal-btn" onClick={closeUpdatePopup}>나중에</button>
              <button className="modal-btn primary" onClick={applyPendingRosterUpdate}>업데이트</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function getPersonGyobunForDate(
  data,
  remoteRoster,
  teamKey,
  name,
  dateStr,
  overrides = {},
  mySelection = null
) {
  const team = data?.[teamKey];
  if (!team) return null;

  const anchor = buildAnchorForIdentity(teamKey, team, remoteRoster, name, mySelection);
  if (!anchor?.code) return null;

  const dayOffset = diffDays(anchor.anchorDate || REMOTE_BASE_DATE || BASE_DATE, dateStr);
  const code = shiftCodeByDays(team, anchor.code, dayOffset);

  const person = team.people.find((p) => samePersonName(p.name, name));
  const override = person ? overrides[getOverrideKey(teamKey, person.idx)] || {} : {};

  return {
    code,
    name,
    displayName: override.name || name,
  };
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

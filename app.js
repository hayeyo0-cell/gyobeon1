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

const ADMIN_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxdEOtps60qtHeyXtC7O_n9XmzgagOTLqkp0BDcQX7U9upbCQAojeXUD3N61_mO9phRgQ/exec";

const ADMIN_NAME = "권재림";
const ADMIN_PASSWORD = "7717tutu";

let REMOTE_BASE_DATE = "2026-03-28";

function setGlobalBaseDate(value) {
  REMOTE_BASE_DATE = value || "2026-03-28";
}

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

function normalizeNameKey(name) {
  return String(name || "").trim().toLowerCase().replace(/\s+/g, "");
}

function shouldHideName(name) {
  return HIDDEN_NAME_KEYS.includes(normalizeNameKey(name));
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

function isSameDateStr(a, b) {
  return String(a || "") === String(b || "");
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
  const people = Array.isArray(team?.people) ? team.people : [];
  const fixedCodes = getGyobunOrder(team);
  const baseDate = REMOTE_BASE_DATE;

  if (!people.length) {
    return {
      name: team?.info?.baseName || "",
      code: team?.info?.baseCode || fixedCodes[0] || "",
      anchorDate: baseDate,
    };
  }

  const matchedPerson = people.find((p) => p.name === team?.info?.baseName);

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
        anchorDate: REMOTE_BASE_DATE,
      };
    }
  }

  return buildTeamAnchorForDate(team);
}

function buildAllTeamsAutoAnchors(
  data,
  remoteRoster,
  selectedTeamKey,
  selectedName,
  selectedCode,
  selectedAnchorDate
) {
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

    result[teamKey] = buildTeamAnchorFromRemote(teamKey, team, remoteRoster);
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
      const found = rows.find((row) => normalizeCodeKey(row.code) === normalizeCodeKey(slotCode));
      if (!found) return;
      if (shouldHideName(found.name)) return;

      mapped.push({
        idx,
        name: found.name,
        baseCode: slotCode,
        employeeId: found.employeeId || "",
      });
    });

    if (!mapped.length) return;

    team.people = mapped;
    team.names = mapped.map((p) => p.name);
    team.gyobun = fixedOrder.slice();
    team.info = {
      ...team.info,
      totalCount: mapped.length,
      baseName:
        team.info?.baseName && mapped.some((p) => p.name === team.info.baseName)
          ? team.info.baseName
          : mapped[0]?.name || "",
      baseCode:
        team.info?.baseCode && fixedOrder.includes(team.info.baseCode)
          ? team.info.baseCode
          : fixedOrder[0] || "",
      baseDate: REMOTE_BASE_DATE,
    };
  });

  return next;
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

  const [activeTab, setActiveTab] = useState("home");
  const activeTabRef = useRef("home");

  const [selectedTeam, setSelectedTeam] = useState(initialSelection?.teamKey || "ks");
  const [viewTeam, setViewTeam] = useState(initialSelection?.teamKey || "ks");
  const [selectedDate, setSelectedDate] = useState(initialDate);

  const [teamAnchors, setTeamAnchors] = useState({
    ks: { name: "", code: "", anchorDate: REMOTE_BASE_DATE },
    my: { name: "", code: "", anchorDate: REMOTE_BASE_DATE },
    wb: { name: "", code: "", anchorDate: REMOTE_BASE_DATE },
    as: { name: "", code: "", anchorDate: REMOTE_BASE_DATE },
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
  const [selectedGroupDate, setSelectedGroupDate] = useState("");
  const [showGroupAdd, setShowGroupAdd] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [groupAddTeam, setGroupAddTeam] = useState("ks");
  const [groupAddName, setGroupAddName] = useState("");

  const [deferredPrompt, setDeferredPrompt] = useState(null);

  const [remoteBaseDate, setRemoteBaseDate] = useState(cachedShared?.baseDate || REMOTE_BASE_DATE);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [savingSharedConfig, setSavingSharedConfig] = useState(false);

  const [sharedConfigReady, setSharedConfigReady] = useState(false);

  const pathOpenRef = useRef(false);
  const editOpenRef = useRef(false);

  const effectiveData = useMemo(() => {
    if (!data) return null;
    return applyRemoteRosterToData(data, remoteRoster);
  }, [data, remoteRoster]);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    setOverrides(loadOverrides());
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initAppFast() {
      let hasParsed = false;

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
            hasParsed = true;
          }
        } catch (e) {
          console.log("parsedData 로드 실패", e);
        }

        try {
          const savedZip = await loadZipBlob();
          if (!cancelled && savedZip?.name) {
            setZipName(savedZip.name || "저장된 ZIP");
          }
        } catch (e) {
          console.log("ZIP 메타 로드 실패", e);
        }

        if (!hasParsed) {
          try {
            const saved = await loadZipBlob();
            if (!cancelled && saved?.blob) {
              setZipName(saved.name || "저장된 ZIP");
              await parseAndSetZip(
                saved.blob,
                false,
                true,
                loadCachedRemoteRoster(),
                false
              );
            }
          } catch (e) {
            console.log("fallback ZIP 로드 실패", e);
          }
        }
      } finally {
        if (!cancelled) {
          setSharedConfigReady(true);
        }
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

        if (hasAny) {
          setRemoteRoster(next);
          saveCachedRemoteRoster(next);
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

      if (activeTabRef.current !== "home") {
        setActiveTab("home");
        return;
      }

      window.history.pushState({ __gyobeon: true, layer: "root" }, "");
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

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

  function findRemoteCodeByName(teamKey, name) {
    const rows = remoteRoster?.[teamKey] || [];
    const found = rows.find(
      (row) =>
        String(row.name || "").trim().replace(/\s/g, "") ===
        String(name || "").trim().replace(/\s/g, "")
    );
    return found?.code || "";
  }

  function findRemoteAssignment(teamKey, name) {
    const rows = remoteRoster?.[teamKey] || [];
    return rows.find(
      (row) =>
        String(row.name || "").trim().replace(/\s/g, "") ===
        String(name || "").trim().replace(/\s/g, "")
    ) || null;
  }

  function findZipCodeByName(teamKey, name) {
    const team = data?.[teamKey];
    if (!team?.people?.length) return "";
    const found = team.people.find((p) => p.name === name);
    return found?.baseCode || "";
  }

  function resolveAnchorCode(teamKey, name, manualCode = "") {
    return (
      manualCode ||
      findRemoteCodeByName(teamKey, name) ||
      findZipCodeByName(teamKey, name) ||
      ""
    );
  }

  useEffect(() => {
    if (!effectiveData) return;

    const saved = loadMySelection();

    if (saved?.teamKey && saved?.name) {
      const fixedCode = resolveAnchorCode(saved.teamKey, saved.name, saved.code || "");
      const fixedSelection = {
        teamKey: saved.teamKey,
        name: saved.name,
        code: fixedCode,
        anchorDate: REMOTE_BASE_DATE,
      };

      saveMySelection(fixedSelection);

      const autoAnchors = buildAllTeamsAutoAnchors(
        effectiveData,
        remoteRoster,
        fixedSelection.teamKey,
        fixedSelection.name,
        fixedSelection.code,
        fixedSelection.anchorDate
      );

      setTeamAnchors(autoAnchors);
      setSelectedTeam(fixedSelection.teamKey);
      setViewTeam(fixedSelection.teamKey);
      return;
    }

    const nextAnchors = {};
    TEAM_ORDER.forEach((teamKey) => {
      const team = effectiveData[teamKey];
      nextAnchors[teamKey] = buildTeamAnchorFromRemote(teamKey, team, remoteRoster);
    });
    setTeamAnchors(nextAnchors);
  }, [effectiveData, remoteRoster]);

  const currentTeam = effectiveData?.[selectedTeam] || null;
  const currentViewTeam = effectiveData?.[viewTeam] || null;
  const currentAnchor = teamAnchors[selectedTeam] || { name: "", code: "", anchorDate: REMOTE_BASE_DATE };
  const currentViewAnchor = teamAnchors[viewTeam] || { name: "", code: "", anchorDate: REMOTE_BASE_DATE };
  const isAdminUser = currentAnchor.name === ADMIN_NAME;

  const todayStr = formatDate(new Date());

  const myInfo = useMemo(() => {
    if (!currentTeam || !currentAnchor.name) return null;

    if (isSameDateStr(selectedDate, REMOTE_BASE_DATE)) {
      const remoteMe = findRemoteAssignment(selectedTeam, currentAnchor.name);
      if (remoteMe?.code) {
        return {
          code: remoteMe.code,
          time: pickWorktime(currentTeam, remoteMe.code, selectedDate),
        };
      }
    }

    if (!currentAnchor.code) return null;

    const dayOffset = diffDays(currentAnchor.anchorDate || REMOTE_BASE_DATE, selectedDate);
    const assignedGrid = buildAssignedGrid(
      currentTeam,
      currentAnchor.name,
      currentAnchor.code,
      dayOffset,
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
    currentAnchor.anchorDate,
    selectedDate,
    overrides,
    selectedTeam,
    remoteRoster,
  ]);

  const allGrid = useMemo(() => {
    if (!currentViewTeam) return [];

    const remoteRows = remoteRoster?.[viewTeam] || [];

    if (isSameDateStr(selectedDate, REMOTE_BASE_DATE) && remoteRows.length > 0) {
      return getGyobunOrder(currentViewTeam)
        .map((slotCode, idx) => {
          const found = remoteRows.find(
            (row) => normalizeCodeKey(row.code) === normalizeCodeKey(slotCode)
          );
          if (!found) return null;

          const override = overrides[getOverrideKey(viewTeam, idx)] || {};
          return {
            idx,
            name: found.name,
            displayName: override.name || found.name,
            code: slotCode,
            customColor: override.color || "",
          };
        })
        .filter(Boolean);
    }

    if (!currentViewAnchor.name || !currentViewAnchor.code) return [];

    const dayOffset = diffDays(currentViewAnchor.anchorDate || REMOTE_BASE_DATE, selectedDate);

    return buildAssignedGrid(
      currentViewTeam,
      currentViewAnchor.name,
      currentViewAnchor.code,
      dayOffset,
      overrides
    );
  }, [
    currentViewTeam,
    currentViewAnchor.name,
    currentViewAnchor.code,
    currentViewAnchor.anchorDate,
    overrides,
    remoteRoster,
    viewTeam,
    selectedDate,
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
        const defaultTeam = selectedTeam || "ks";
        const defaultName =
          nextEffectiveData?.[defaultTeam]?.info?.baseName ||
          nextEffectiveData?.[defaultTeam]?.people?.[0]?.name ||
          "";
        const defaultCode = resolveAnchorCode(defaultTeam, defaultName);

        const autoAnchors = buildAllTeamsAutoAnchors(
          nextEffectiveData,
          rosterForApply || getEmptyRemoteRoster(),
          defaultTeam,
          defaultName,
          defaultCode,
          REMOTE_BASE_DATE
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

  async function saveSharedConfig() {
    if (!isAdminUser) {
      alert("관리자만 저장할 수 있습니다.");
      return;
    }

    if (!isAdminMode) {
      alert("관리자 모드에서만 저장할 수 있습니다.");
      return;
    }

    if (adminPassword !== ADMIN_PASSWORD) {
      alert("관리자 비밀번호가 올바르지 않습니다.");
      return;
    }

    try {
      setSavingSharedConfig(true);

      const payload = {
        adminKey: adminPassword,
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

  function applyMySelection(name, teamKey = selectedTeam) {
    if (!effectiveData || !name) return;

    const anchorCode = resolveAnchorCode(teamKey, name);
    if (!anchorCode) {
      alert("선택한 이름의 기준 교번을 찾지 못했습니다.");
      return;
    }

    const selection = {
      teamKey,
      name,
      code: anchorCode,
      anchorDate: REMOTE_BASE_DATE,
    };

    const autoAnchors = buildAllTeamsAutoAnchors(
      effectiveData,
      remoteRoster,
      selection.teamKey,
      selection.name,
      selection.code,
      selection.anchorDate
    );

    setTeamAnchors(autoAnchors);
    setSelectedTeam(teamKey);
    setViewTeam(teamKey);
    saveMySelection(selection);
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
    localStorage.removeItem("gyobeon_my_selection");
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

  return (
    <>
      <div className="container">
        {!sharedConfigReady ? (
          <div className="card">
            <div className="card-title">앱 준비중</div>
            <div className="help-text" style={{ color: "#2563eb" }}>
              기본 설정을 확인하는 중입니다...
            </div>
          </div>
        ) : !effectiveData ? (
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
        ) : (
          <>
            {activeTab === "home" && (
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
                      className={`main-code ${isSameDateStr(selectedDate, todayStr) ? "today-blink" : ""}`}
                      style={{ color: getDateBasedColor(selectedDate) }}
                    >
                      {myInfo?.code || "-"} {weekdayName(selectedDate)}
                    </div>

                    <div className="main-time" style={{ color: getDateBasedColor(selectedDate) }}>
                      {myInfo?.time || "----"}
                    </div>

                    <div className="main-subinfo">
                      {TEAM_LABELS[selectedTeam]} / {currentAnchor.name || "-"}
                    </div>

                    {remoteLoading && (
                      <div className="help-text" style={{ color: "#2563eb" }}>
                        최신 현재배정 불러오는 중...
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
                        viewTeam === selectedTeam &&
                        item.name === currentAnchor.name;

                      const isTodaySelected = isSameDateStr(selectedDate, todayStr);

                      return (
                        <div
                          key={`${item.idx}-${item.displayName}`}
                          className={`all-cell-real ${isMine ? "cell-my" : ""} ${isMine && isTodaySelected ? "cell-my-today" : ""}`}
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
                        const item = currentAnchor.name
                          ? getPersonGyobunForDate(
                              effectiveData,
                              remoteRoster,
                              selectedTeam,
                              currentAnchor.name,
                              date,
                              overrides
                            )
                          : null;

                        const sameMonth = parseLocalDate(date).getMonth() === monthHeaderDate.getMonth();
                        const isSelected = date === selectedDate;
                        const toneClass = getDateToneClass(date);

                        const worktime = item?.code
                          ? pickWorktime(effectiveData[selectedTeam], item.code, date)
                          : "";
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
                                overrides
                              );

                              const isSelectedCol = selectedGroupDate === date;

                              return (
                                <td
                                  key={date}
                                  onClick={() => setSelectedGroupDate(date)}
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

      {effectiveData && (
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

            <label className="label">기본자료 ZIP 등록 / 변경</label>
            <input type="file" accept=".zip" className="input" onChange={handleZipUpload} />

            <div className="help-text">
              처음 한 번 등록하면 이후에는 자동 저장됩니다. ZIP 구조가 바뀔 때만 다시 등록하면 됩니다.
            </div>

            <label className="label" style={{ marginTop: 12 }}>내 소속</label>
            <select
              className="select"
              value={selectedTeam}
              onChange={(e) => {
                const teamKey = e.target.value;
                setSelectedTeam(teamKey);
                setViewTeam(teamKey);

                const currentName = teamAnchors[teamKey]?.name || "";
                if (currentName) {
                  applyMySelection(currentName, teamKey);
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
                applyMySelection(e.target.value, selectedTeam);
              }}
            >
              <option value="">선택</option>
              {(currentTeam?.people || []).map((person) => (
                <option key={`${person.idx}-${person.name}`} value={person.name}>
                  {person.name}
                </option>
              ))}
            </select>

            <div className="help-text">
              내 이름만 선택하면 앱이 자동으로 기준 교번을 찾아 오늘 교번을 보여줍니다.
            </div>

            {isAdminUser && (
              <div className="card" style={{ marginTop: 14, padding: 12 }}>
                <div className="label" style={{ marginBottom: 10 }}>관리자 모드</div>

                {!isAdminMode ? (
                  <>
                    <input
                      className="input"
                      type="password"
                      placeholder="관리자 비밀번호"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                    />
                    <button
                      className="modal-btn primary"
                      style={{ marginTop: 10 }}
                      onClick={() => {
                        if (!isAdminUser) {
                          alert("관리자만 사용할 수 있습니다.");
                          return;
                        }

                        if (!adminPassword) {
                          alert("관리자 비밀번호를 입력해주세요.");
                          return;
                        }

                        if (adminPassword !== ADMIN_PASSWORD) {
                          alert("관리자 비밀번호가 올바르지 않습니다.");
                          return;
                        }

                        setIsAdminMode(true);
                      }}
                    >
                      관리자 모드 열기
                    </button>
                  </>
                ) : (
                  <>
                    <div className="notice-box" style={{ marginTop: 0 }}>
                      관리자 전용: 공용 기준일 저장
                    </div>

                    <label className="label" style={{ marginTop: 12 }}>공용 기준일</label>
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
                      기본자료 ZIP은 사용자별로 한 번 등록하고, 관리자는 스프레드시트와 기준일만 관리합니다.
                    </div>

                    <div className="modal-actions">
                      <button
                        className="modal-btn"
                        onClick={() => {
                          setIsAdminMode(false);
                        }}
                      >
                        관리자 종료
                      </button>
                      <button
                        className="modal-btn primary"
                        onClick={saveSharedConfig}
                        disabled={savingSharedConfig}
                      >
                        {savingSharedConfig ? "저장중..." : "공용 기준일 저장"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="modal-actions">
              <button className="modal-btn" onClick={resetOverrides}>초기화</button>
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

            <div
              className="color-preview"
              style={{ backgroundColor: editColor || "#ffffff" }}
            />

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

function getPersonGyobunForDate(
  data,
  remoteRoster,
  teamKey,
  name,
  dateStr,
  overrides = {}
) {
  const team = data?.[teamKey];
  if (!team) return null;

  const saved = loadMySelection();
  const anchor =
    saved?.teamKey === teamKey && saved?.name === name && saved?.code && saved?.anchorDate
      ? {
          name: saved.name,
          code: saved.code,
          anchorDate: saved.anchorDate,
        }
      : buildTeamAnchorFromRemote(teamKey, team, remoteRoster);

  const offset = diffDays(anchor.anchorDate || REMOTE_BASE_DATE, dateStr);
  const grid = buildAssignedGrid(team, anchor.name, anchor.code, offset, overrides);
  return grid.find((item) => item.name === name || item.displayName === name) || null;
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

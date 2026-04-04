function App() {
  const initialSelection = loadMySelection();
  const initialGroups = loadGroups();
  const todayStr = getKoreaToday();
  const cachedShared = loadCachedSharedConfig();
  const initialRemoteRoster = loadCachedRemoteRoster();

  if (cachedShared?.baseDate) {
    setGlobalBaseDate(cachedShared.baseDate);
  }

  const [zipName, setZipName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [remoteRoster, setRemoteRoster] = useState(initialRemoteRoster);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [refreshRosterMessage, setRefreshRosterMessage] = useState("");
  const [pendingRosterJson, setPendingRosterJson] = useState(null);
  const [showUpdatePopup, setShowUpdatePopup] = useState(false);
  const [lastSeenPublishedAt, setLastSeenPublishedAt] = useState(
    localStorage.getItem(LS_LAST_SEEN_PUBLISHED_AT) || ""
  );
  const [holidayVersion, setHolidayVersion] = useState(0);
  const [worktimeVersion, setWorktimeVersion] = useState(0);

  const [activeTab, setActiveTab] = useState("home");
  const activeTabRef = useRef("home");

  const [selectedTeam, setSelectedTeam] = useState(initialSelection?.teamKey || "ks");
  const [viewTeam, setViewTeam] = useState(initialSelection?.teamKey || "ks");

  const [homeDate, setHomeDate] = useState(todayStr);
  const [browseDate, setBrowseDate] = useState(todayStr);
  const [monthDate, setMonthDate] = useState(todayStr);

  const [mySelection, setMySelection] = useState(
    initialSelection || {
      teamKey: "ks",
      name: "",
      code: "",
      anchorDate: todayStr,
    }
  );

  const [profileAnchorDate, setProfileAnchorDate] = useState(
    initialSelection?.anchorDate || todayStr
  );

  const [teamAnchors, setTeamAnchors] = useState({
    ks: { name: "", code: "", anchorDate: todayStr },
    my: { name: "", code: "", anchorDate: todayStr },
    wb: { name: "", code: "", anchorDate: todayStr },
    as: { name: "", code: "", anchorDate: todayStr },
  });

  const [remoteBaseDate, setRemoteBaseDate] = useState(
    cachedShared?.baseDate || ""
  );

  const [savingSharedConfig, setSavingSharedConfig] = useState(false);
  const [overrides, setOverrides] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [editColor, setEditColor] = useState("");
  const [editAlias, setEditAlias] = useState("");
  const [isWorktimeEditOpen, setIsWorktimeEditOpen] = useState(false);
  const [editStartHour, setEditStartHour] = useState("");
  const [editStartMin, setEditStartMin] = useState("");
  const [editEndHour, setEditEndHour] = useState("");
  const [editEndMin, setEditEndMin] = useState("");

  const [pathOpen, setPathOpen] = useState(false);
  const [pathTarget, setPathTarget] = useState(null);
  const [pathImage, setPathImage] = useState("");
  const [pathTeamKey, setPathTeamKey] = useState("");
  const [pathDate, setPathDate] = useState(todayStr);

  const [showSettings, setShowSettings] = useState(false);

  const [allowProfileEdit, setAllowProfileEdit] = useState(
    !initialSelection?.name || !initialSelection?.code
  );

  const [groups, setGroups] = useState(initialGroups);
  const [currentGroup, setCurrentGroup] = useState(Object.keys(initialGroups)[0] || "");
  const [groupBaseDate, setGroupBaseDate] = useState(todayStr);
  const [selectedGroupDate, setSelectedGroupDate] = useState("");

  const [showGroupAdd, setShowGroupAdd] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [groupAddTeam, setGroupAddTeam] = useState("ks");
  const [groupAddName, setGroupAddName] = useState("");
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  const [initialRemoteChecked, setInitialRemoteChecked] = useState(false);
  const [needsFirstUserRemoteCheck, setNeedsFirstUserRemoteCheck] = useState(false);

  const pathOpenRef = useRef(false);
  const editOpenRef = useRef(false);

  const effectiveData = useMemo(() => {
    if (!data) return null;
    return applyRemoteRosterToData(data, remoteRoster);
  }, [data, remoteRoster]);

  const isAdminUser = samePersonName(mySelection?.name, ADMIN_NAME);
  const isKsUser = mySelection?.teamKey === "ks";

  const currentEditDayType = guessDayType(browseDate);
  const currentEditDayLabel =
    currentEditDayType === "nor" ? "평일" :
    currentEditDayType === "sat" ? "토요일" :
    "휴일";

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    cleanupNameOverrides();
    setOverrides(loadOverrides());
  }, []);

  useEffect(() => {
    saveMySelection(mySelection);
  }, [mySelection]);

  useEffect(() => {
    setProfileAnchorDate(mySelection?.anchorDate || todayStr);
  }, [mySelection?.anchorDate, todayStr]);

  useEffect(() => {
    if (!data) return;
    const migrated = migrateLegacyOverrides(loadOverrides(), data);
    setOverrides(migrated);
  }, [data]);

  useEffect(() => {
    const years = [
      getYearFromDateStr(homeDate),
      getYearFromDateStr(browseDate),
      getYearFromDateStr(monthDate),
      getYearFromDateStr(groupBaseDate),
    ].filter(Boolean);

    [...new Set(years)].forEach((year) => {
      ensureHolidayYear(year, () => setHolidayVersion((v) => v + 1));
    });
  }, [homeDate, browseDate, monthDate, groupBaseDate]);

  useEffect(() => {
    let cancelled = false;

    async function initAppFast() {
      let parsedSaved = null;
      let savedZip = null;

      try {
        const shared = loadCachedSharedConfig();
        if (shared?.baseDate) {
          setGlobalBaseDate(shared.baseDate);
          setRemoteBaseDate(shared.baseDate);
        }

        try {
          parsedSaved = await loadParsedData();
          if (!cancelled && parsedSaved?.data) {
            setData(parsedSaved.data);
          }

          savedZip = await loadZipBlob();
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
        const thisYear = getYearFromDateStr(getKoreaToday());
        const preloadYears = [thisYear - 1, thisYear, thisYear + 1];

        await Promise.all(
          preloadYears.map((year) =>
            ensureHolidayYear(year, () => {
              if (!cancelled) setHolidayVersion((v) => v + 1);
            })
          )
        );
      } catch (e) {
        console.log("공휴일 초기 로드 실패", e);
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
        const hasLocalZipBase = !!parsedSaved?.data || !!savedZip?.blob;

        if (hasLocalZipBase) {
          setRemoteLoading(true);

          const localCachedRoster = loadCachedRemoteRoster();
          const hasLocalCachedRoster = hasAnyRemoteRoster(localCachedRoster);

          const json = await fetchRemoteRosterJsonp(6000);
          if (cancelled) return;

          const next = normalizeRemoteRosterShape(json);
          const hasAny = hasAnyRemoteRoster(next);
          const serverPublishedAt = String(json?.publishedAt || "").trim();
          const rosterChanged = !isSameRemoteRoster(localCachedRoster, next);

          if (hasAny) {
            let shouldPrompt = false;

            if (!hasLocalCachedRoster) {
              shouldPrompt = false;
              setNeedsFirstUserRemoteCheck(true);
              setInitialRemoteChecked(false);
            } else if (serverPublishedAt) {
              shouldPrompt = serverPublishedAt !== lastSeenPublishedAt;
              setInitialRemoteChecked(true);
            } else {
              shouldPrompt = rosterChanged;
              setInitialRemoteChecked(true);
            }

            if (shouldPrompt) {
              setPendingRosterJson(json);
              setShowUpdatePopup(true);
            }
          } else {
            if (hasLocalCachedRoster) {
              setInitialRemoteChecked(true);
            }
          }
        }
      } catch (e) {
        console.log("원격 현재배정 백그라운드 체크 실패", e);
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
        setHomeDate(getKoreaToday());
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

    const currentCode =
      mySelection?.teamKey === teamKey ? String(mySelection?.code || "").trim() : "";

    const nextAnchorDate = profileAnchorDate || getKoreaToday();

    if (currentCode) {
      if (String(mySelection?.anchorDate || "") !== String(nextAnchorDate)) {
        setMySelection((prev) => ({
          ...prev,
          teamKey,
          anchorDate: nextAnchorDate,
        }));
      }
      return;
    }

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

    if (!nextCode) {
      if (String(mySelection?.anchorDate || "") !== String(nextAnchorDate)) {
        setMySelection((prev) => ({
          ...prev,
          teamKey,
          anchorDate: nextAnchorDate,
        }));
      }
      return;
    }

    setMySelection((prev) => ({
      ...prev,
      teamKey,
      code: nextCode,
      anchorDate: nextAnchorDate,
    }));
  }, [
    allowProfileEdit,
    selectedTeam,
    mySelection?.teamKey,
    mySelection?.name,
    mySelection?.code,
    mySelection?.anchorDate,
    remoteRoster,
    effectiveData,
    data,
    profileAnchorDate,
  ]);

  async function checkRemoteRosterAfterFirstStart() {
    try {
      if (remoteLoading) return;
      if (!data) return;

      setRemoteLoading(true);

      const cachedRoster = loadCachedRemoteRoster();
      const hasCachedRoster = hasAnyRemoteRoster(cachedRoster);

      const json = await fetchRemoteRosterJsonp(8000);
      const next = normalizeRemoteRosterShape(json);
      const hasAny = hasAnyRemoteRoster(next);
      const serverPublishedAt = String(json?.publishedAt || "").trim();
      const rosterChanged = !isSameRemoteRoster(cachedRoster, next);

      if (hasAny) {
        let shouldPrompt = false;

        if (!hasCachedRoster) {
          shouldPrompt = true;
        } else if (serverPublishedAt) {
          shouldPrompt = serverPublishedAt !== lastSeenPublishedAt;
        } else {
          shouldPrompt = rosterChanged;
        }

        if (shouldPrompt) {
          setPendingRosterJson(json);
          setShowUpdatePopup(true);
        }
      }

      setInitialRemoteChecked(true);
      setNeedsFirstUserRemoteCheck(false);
    } catch (e) {
      console.log("최초 시작 후 원격 체크 실패", e);
      setInitialRemoteChecked(true);
      setNeedsFirstUserRemoteCheck(false);
    } finally {
      setRemoteLoading(false);
    }
  }

  const currentViewTeam = effectiveData?.[viewTeam] || null;
  const currentViewAnchor =
    teamAnchors[viewTeam] || {
      name: "",
      code: "",
      anchorDate: getResolvedBaseDate(viewTeam, currentViewTeam, remoteRoster),
    };

  const setupSourceData = effectiveData || data;

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

    const dayOffset = diffDays(
      anchor.anchorDate || getResolvedBaseDate(myTeamKey, team, remoteRoster),
      homeDate
    );

    const code = shiftCodeByDays(team, anchor.code, dayOffset);

    return {
      code,
      time: pickWorktime(team, code, homeDate),
    };
  }, [effectiveData, remoteRoster, homeDate, selectedTeam, mySelection, holidayVersion, worktimeVersion]);

  const allGrid = useMemo(() => {
    if (!currentViewTeam) return [];

    let anchorName = "";
    let anchorCode = "";
    let anchorDate = getResolvedBaseDate(viewTeam, currentViewTeam, remoteRoster);

    if (
      mySelection?.teamKey === viewTeam &&
      mySelection?.name &&
      mySelection?.code
    ) {
      anchorName = mySelection.name;
      anchorCode = normalizeToFixedCode(currentViewTeam, mySelection.code);
      anchorDate =
        mySelection.anchorDate ||
        getResolvedBaseDate(viewTeam, currentViewTeam, remoteRoster);
    } else {
      const teamAnchor = buildTeamAnchorFromRemote(
        viewTeam,
        currentViewTeam,
        remoteRoster
      );
      anchorName = teamAnchor?.name || "";
      anchorCode = normalizeToFixedCode(currentViewTeam, teamAnchor?.code || "");
      anchorDate =
        teamAnchor?.anchorDate ||
        getResolvedBaseDate(viewTeam, currentViewTeam, remoteRoster);
    }

    if (!anchorName || !anchorCode) {
      return buildAssignedGrid(currentViewTeam, "", "", 0, overrides);
    }

    const dayOffset = diffDays(anchorDate, browseDate);
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
    browseDate,
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
      teamAnchor.anchorDate || getResolvedBaseDate(viewTeam, team, remoteRoster),
      browseDate
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
  }, [currentViewTeam, currentViewAnchor, browseDate, overrides, remoteRoster, viewTeam]);

  const monthMatrix = useMemo(() => getMonthMatrix(monthDate), [monthDate]);
  const monthHeaderDate = parseLocalDate(monthDate);
  const weekDates = useMemo(() => getWeekDates(groupBaseDate), [groupBaseDate]);
  const groupMembers = groups[currentGroup] || [];

  useEffect(() => {
    if (!weekDates.length) return;
    if (!selectedGroupDate || !weekDates.includes(selectedGroupDate)) {
      setSelectedGroupDate(weekDates[0]);
    }
  }, [weekDates, selectedGroupDate]);

  function switchTab(tabName) {
    const currentTab = activeTabRef.current;
    const today = getKoreaToday();
    const myTeamKey = mySelection?.teamKey || selectedTeam || "ks";

    if (tabName === currentTab) {
      if (tabName === "home") {
        setHomeDate(today);
      }
      return;
    }

    if (tabName === "home") {
      setHomeDate(today);
    }

    if (currentTab === "home" && tabName !== "home") {
      if (tabName === "all" || tabName === "dia") {
        setBrowseDate(homeDate);
        setViewTeam(myTeamKey);
      } else if (tabName === "month") {
        setMonthDate(today);
      } else if (tabName === "group") {
        setGroupBaseDate(today);
        setSelectedGroupDate("");
      }
    }

    if (tabName === "all") {
      setViewTeam(myTeamKey);
    }

    if (tabName === "dia") {
      setViewTeam(myTeamKey);
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

    const cachedRoster = loadCachedRemoteRoster();
    const hasCachedRoster = hasAnyRemoteRoster(cachedRoster);

    setInitialRemoteChecked(hasCachedRoster);
    setNeedsFirstUserRemoteCheck(!hasCachedRoster);

    await parseAndSetZip(file, true, false, remoteRoster, true);
  }

  async function refreshLatestRoster(showAlert = true) {
    try {
      setRemoteLoading(true);
      setRefreshRosterMessage("");

      const json = await fetchRemoteRosterJsonp(8000);
      const next = normalizeRemoteRosterShape(json);
      const hasAny = hasAnyRemoteRoster(next);
      const serverPublishedAt = String(json?.publishedAt || "").trim();

      if (!hasAny) {
        throw new Error("배포된 최신 현재배정 데이터가 없습니다.");
      }

      setRemoteRoster(next);
      saveCachedRemoteRoster(next);
      setInitialRemoteChecked(true);
      setNeedsFirstUserRemoteCheck(false);

      if (serverPublishedAt) {
        localStorage.setItem(LS_LAST_SEEN_PUBLISHED_AT, serverPublishedAt);
        setLastSeenPublishedAt(serverPublishedAt);
      } else {
        const fallbackSeen = String(Date.now());
        localStorage.setItem(LS_LAST_SEEN_PUBLISHED_AT, fallbackSeen);
        setLastSeenPublishedAt(fallbackSeen);
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
        localStorage.removeItem(LS_LAST_SEEN_PUBLISHED_AT);
        setLastSeenPublishedAt("");
      }

      alert(`배포 완료 (${json?.publishedCount || 0}건)`);
    } catch (e) {
      console.error(e);
      alert(`배포 실패: ${e.message || e}`);
    } finally {
      setSavingSharedConfig(false);
    }
  }

  async function applyInitialSelection(teamKey, name, code) {
    if (!teamKey || !name || !code) return;

    const nextAnchorDate = profileAnchorDate || getKoreaToday();

    const nextSelection = {
      teamKey,
      name,
      code,
      anchorDate: nextAnchorDate,
    };

    setMySelection(nextSelection);
    setSelectedTeam(teamKey);
    setViewTeam(teamKey);

    const today = getKoreaToday();
    setHomeDate(today);
    setBrowseDate(today);
    setMonthDate(today);
    setGroupBaseDate(today);
    setSelectedGroupDate("");

    if (effectiveData) {
      const nextAnchors = buildAllTeamsAutoAnchorsFromIdentity(
        effectiveData,
        remoteRoster,
        teamKey,
        name,
        nextSelection
      );
      setTeamAnchors(nextAnchors);
    }

    setAllowProfileEdit(false);

    if (needsFirstUserRemoteCheck) {
      await checkRemoteRosterAfterFirstStart();
    }
  }

  function startReconfigureProfile() {
    setAllowProfileEdit(true);
    setSelectedTeam(mySelection?.teamKey || selectedTeam || "ks");
    setProfileAnchorDate(getKoreaToday());
  }

  function cancelReconfigureProfile() {
    if (mySelection?.teamKey) {
      setSelectedTeam(mySelection.teamKey);
      setViewTeam(mySelection.teamKey);
    }
    setProfileAnchorDate(mySelection?.anchorDate || todayStr);
    setAllowProfileEdit(false);
  }

  function resetMyProfile() {
    const today = getKoreaToday();

    clearMySelection();

    setMySelection({
      teamKey: "ks",
      name: "",
      code: "",
      anchorDate: today,
    });

    setProfileAnchorDate(today);
    setAllowProfileEdit(true);
    setSelectedTeam("ks");
    setViewTeam("ks");
    setInitialRemoteChecked(false);
    setNeedsFirstUserRemoteCheck(false);

    setHomeDate(today);
    setBrowseDate(today);
    setMonthDate(today);
    setGroupBaseDate(today);
    setSelectedGroupDate("");
  }

  function handleAllCellTap(item) {
    if (editMode) {
      openEditDialog(item);
    } else {
      openPathDialog(item, browseDate);
    }
  }

  function openEditDialog(item) {
    setEditingCell(item);
    const key = getOverrideKey(viewTeam, item.name);
    const current = overrides[key] || {};
    setEditColor(current.color || "");
    setEditAlias(current.alias || "");

    const team = effectiveData?.[viewTeam];
    const currentTime = team ? pickWorktime(team, item.code, browseDate) : "----";
    const parts = parseTimeValueToParts(currentTime);

    setEditStartHour(parts.sh);
    setEditStartMin(parts.sm);
    setEditEndHour(parts.eh);
    setEditEndMin(parts.em);
    setIsWorktimeEditOpen(false);

    setEditOpen(true);
  }

  function closeEditDialog() {
    if (editOpenRef.current) {
      window.history.back();
    } else {
      setEditOpen(false);
    }
  }

  function commitEdit(nextColorValue = editColor, nextAliasValue = editAlias) {
    if (!editingCell) return;

    const cleanColor = String(nextColorValue || "").trim();
    const cleanAlias = String(nextAliasValue || "").trim();
    const key = getOverrideKey(viewTeam, editingCell.name);
    const next = { ...overrides };

    if (!cleanColor && !cleanAlias) {
      delete next[key];
    } else {
      next[key] = {
        color: cleanColor,
        alias: cleanAlias,
      };
    }

    if (isWorktimeEditOpen) {
      const built = buildTimeValueFromParts(
        editStartHour,
        editStartMin,
        editEndHour,
        editEndMin
      );

      if (!built) {
        alert("출퇴근시간 형식을 다시 확인해주세요.");
        return;
      }

      const dayType = guessDayType(browseDate);
      const allWorktimeOverrides = loadWorktimeOverrides();
      const wtKey = getWorktimeOverrideKey(viewTeam, editingCell.code);
      const currentEntry = { ...(allWorktimeOverrides[wtKey] || {}) };

      currentEntry[dayType] = built;
      allWorktimeOverrides[wtKey] = currentEntry;

      saveWorktimeOverrides(allWorktimeOverrides);
      setWorktimeVersion((v) => v + 1);
    }

    setOverrides(next);
    saveOverrides(next);
    setEditOpen(false);
    setEditingCell(null);
    setEditColor("");
    setEditAlias("");
    setIsWorktimeEditOpen(false);
    setEditStartHour("");
    setEditStartMin("");
    setEditEndHour("");
    setEditEndMin("");
  }

  function openPathDialog(item, dateStr = todayStr) {
    if (!currentViewTeam || !item?.code) return;

    const image = findPathImage(currentViewTeam, dateStr, item.code);
    setPathTeamKey(viewTeam);
    setPathTarget(item);
    setPathDate(dateStr);
    setPathImage(image || "");
    setPathOpen(true);
  }

  function openPathDialogForTeamAndDate(teamKey, item, dateStr) {
    const team = effectiveData?.[teamKey];
    if (!team || !item?.code) return;

    const image = findPathImage(team, dateStr, item.code);
    setViewTeam(teamKey);
    setPathTeamKey(teamKey);
    setPathTarget(item);
    setPathDate(dateStr);
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
    setInitialRemoteChecked(true);
    setNeedsFirstUserRemoteCheck(false);

    if (serverPublishedAt) {
      localStorage.setItem(LS_LAST_SEEN_PUBLISHED_AT, serverPublishedAt);
      setLastSeenPublishedAt(serverPublishedAt);
    } else {
      const fallbackSeen = String(Date.now());
      localStorage.setItem(LS_LAST_SEEN_PUBLISHED_AT, fallbackSeen);
      setLastSeenPublishedAt(fallbackSeen);
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
                const nextAnchorDate = profileAnchorDate || getKoreaToday();

                setSelectedTeam(nextTeam);
                setMySelection((prev) => ({
                  ...prev,
                  teamKey: nextTeam,
                  name: "",
                  code: "",
                  anchorDate: nextAnchorDate,
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
                const nextName = e.target.value;
                const nextAnchorDate = profileAnchorDate || getKoreaToday();

                setMySelection((prev) => ({
                  ...prev,
                  teamKey: selectedTeam,
                  name: nextName,
                  code: "",
                  anchorDate: nextAnchorDate,
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
                const nextCode = e.target.value;
                const nextAnchorDate = profileAnchorDate || getKoreaToday();

                setMySelection((prev) => ({
                  ...prev,
                  teamKey: selectedTeam,
                  code: nextCode,
                  anchorDate: nextAnchorDate,
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
              value={profileAnchorDate}
              onChange={(e) => {
                const nextDate = e.target.value || getKoreaToday();
                setProfileAnchorDate(nextDate);
                setMySelection((prev) => ({
                  ...prev,
                  anchorDate: nextDate,
                }));
              }}
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

                  {isKsUser && (
                    <div className="quick-links">
                      <button
                        className="quick-btn band"
                        onClick={() => window.location.href = KS_BAND_URL}
                      >
                        <img src="./band.png" alt="밴드" className="quick-icon" />
                        <span>밴드</span>
                      </button>

                      <button
                        className="quick-btn vacation"
                        onClick={() => window.location.href = KS_VACATION_URL}
                      >
                        <img src="./vacation.png" alt="휴가" className="quick-icon" />
                        <span>휴가</span>
                      </button>
                    </div>
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
                        const d = parseLocalDate(homeDate);
                        d.setFullYear(d.getFullYear() + 1);
                        setHomeDate(formatDate(d));
                      }}
                    >
                      +
                    </button>
                    <div className="date-value">{parseLocalDate(homeDate).getFullYear()}년</div>
                    <button
                      className="date-btn"
                      onClick={() => {
                        const d = parseLocalDate(homeDate);
                        d.setFullYear(d.getFullYear() - 1);
                        setHomeDate(formatDate(d));
                      }}
                    >
                      -
                    </button>
                  </div>

                  <div className="date-box">
                    <button
                      className="date-btn"
                      onClick={() => {
                        const d = parseLocalDate(homeDate);
                        d.setMonth(d.getMonth() + 1);
                        setHomeDate(formatDate(d));
                      }}
                    >
                      +
                    </button>
                    <div className="date-value">{parseLocalDate(homeDate).getMonth() + 1}월</div>
                    <button
                      className="date-btn"
                      onClick={() => {
                        const d = parseLocalDate(homeDate);
                        d.setMonth(d.getMonth() - 1);
                        setHomeDate(formatDate(d));
                      }}
                    >
                      -
                    </button>
                  </div>

                  <div className="date-box">
                    <button className="date-btn" onClick={() => setHomeDate(addDays(homeDate, 1))}>+</button>
                    <div className="date-value">{parseLocalDate(homeDate).getDate()}일</div>
                    <button className="date-btn" onClick={() => setHomeDate(addDays(homeDate, -1))}>-</button>
                  </div>
                </div>

                <div className="card main-panel">
                  <div className="center-view">
                    <div className="main-code" style={{ color: getDateBasedColor(homeDate) }}>
                      {myInfo?.code || "-"} {weekdayName(homeDate)}
                    </div>

                    <div className="main-time" style={{ color: getDateBasedColor(homeDate) }}>
                      {myInfo?.time || "----"}
                    </div>

                    <div className="main-subinfo">
                      {TEAM_LABELS[mySelection?.teamKey || selectedTeam] || "-"} / {mySelection?.name || "-"}
                    </div>

                    {remoteLoading && (
                      <div className="help-text" style={{ color: "#2563eb" }}>
                        최신 배포본 확인 중...
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
                    <button className="all-header-btn" onClick={() => setBrowseDate(addDays(browseDate, -1))}>-</button>

                    <div className="all-header-title">
                      {TEAM_LABELS[viewTeam]} {parseLocalDate(browseDate).getFullYear()}.
                      {parseLocalDate(browseDate).getMonth() + 1}.
                      {parseLocalDate(browseDate).getDate()} {weekdayName(browseDate)}
                    </div>

                    <button
                      className={`all-edit-btn ${editMode ? "active" : ""}`}
                      onClick={() => setEditMode(!editMode)}
                    >
                      {editMode ? "수정중" : "수정"}
                    </button>

                    <button className="all-header-btn" onClick={() => setBrowseDate(addDays(browseDate, 1))}>+</button>
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
                        samePersonName(item.name, mySelection?.name);

                      const isToday = browseDate === getKoreaToday();

                      const customStyle = item.customColor
                        ? {
                            backgroundColor: item.customColor,
                            backgroundImage: "none",
                          }
                        : undefined;

                      return (
                        <div
                          key={`${item.idx}-${item.name}`}
                          className={`all-cell-real ${isMine ? "cell-my" : ""} ${isMine && isToday ? "cell-my-today" : ""}`}
                          style={customStyle}
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
                  <div className="all-header dia-header">
                    <button className="all-header-btn" onClick={() => setBrowseDate(addDays(browseDate, -1))}>-</button>

                    <div className="all-header-title">
                      {TEAM_LABELS[viewTeam]} DIA순서 {parseLocalDate(browseDate).getFullYear()}.
                      {parseLocalDate(browseDate).getMonth() + 1}.
                      {parseLocalDate(browseDate).getDate()} {weekdayName(browseDate)}
                    </div>

                    <button className="all-header-btn" onClick={() => setBrowseDate(addDays(browseDate, 1))}>+</button>
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
                      onClick={() => openPathDialog(item, browseDate)}
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
                      <div style={{ fontWeight: 800, width: 60, color: getDateBasedColor(browseDate) }}>
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
                  <button className="month-nav-btn" onClick={() => setMonthDate(addMonths(monthDate, -1))}>-</button>
                  <div className="month-header-title">
                    {monthHeaderDate.getFullYear()}년 {monthHeaderDate.getMonth() + 1}월
                  </div>
                  <button className="month-nav-btn" onClick={() => setMonthDate(addMonths(monthDate, 1))}>+</button>
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
                        const isSelected = date === monthDate;
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
                                setMonthDate(date);
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

                                    if (item?.code) {
                                      openPathDialogForTeamAndDate(
                                        member.team,
                                        {
                                          code: item.code,
                                          name: item.name || member.name,
                                          displayName: item.displayName || member.name,
                                          idx: -1,
                                        },
                                        date
                                      );
                                    }
                                  }}
                                  style={{
                                    cursor: "pointer",
                                    background: isSelectedCol ? "#f5f3ff" : "",
                                    fontWeight: isSelectedCol ? 700 : 600,
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
              : activeTab === "all" || activeTab === "dia"
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
                  앱은 저장된 ZIP/공용데이터로 빠르게 열리고, 최신 배포본은 뒤에서 확인 후 알림으로 안내됩니다.
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
                    const nextAnchorDate = profileAnchorDate || getKoreaToday();

                    setSelectedTeam(nextTeam);
                    setMySelection((prev) => ({
                      ...prev,
                      teamKey: nextTeam,
                      name: "",
                      code: "",
                      anchorDate: nextAnchorDate,
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
                    const nextName = e.target.value;
                    const nextAnchorDate = profileAnchorDate || getKoreaToday();

                    setMySelection((prev) => ({
                      ...prev,
                      teamKey: selectedTeam,
                      name: nextName,
                      code: "",
                      anchorDate: nextAnchorDate,
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
                    const nextCode = e.target.value;
                    const nextAnchorDate = profileAnchorDate || getKoreaToday();

                    setMySelection((prev) => ({
                      ...prev,
                      teamKey: selectedTeam,
                      code: nextCode,
                      anchorDate: nextAnchorDate,
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
                  value={profileAnchorDate}
                  onChange={(e) => {
                    const nextDate = e.target.value || getKoreaToday();
                    setProfileAnchorDate(nextDate);
                    setMySelection((prev) => ({
                      ...prev,
                      anchorDate: nextDate,
                    }));
                  }}
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
            <div className="modal-title">표시 수정</div>
            <div className="modal-sub">
              {TEAM_LABELS[viewTeam]} {editingCell?.code} {editingCell?.name}
            </div>

            <label className="label" style={{ marginTop: 12 }}>표시 이름</label>
            <input
              className="input"
              value={editAlias}
              onChange={(e) => setEditAlias(e.target.value)}
              placeholder="비워두면 원래 이름 사용"
            />
            <div className="help-text" style={{ marginTop: 6 }}>
              ※ 사용자 화면 표시용에 저장됨
            </div>

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

            <button
              className="modal-btn"
              style={{ width: "100%", marginTop: 12 }}
              onClick={() => setIsWorktimeEditOpen((prev) => !prev)}
            >
              출퇴근시간 수정 {isWorktimeEditOpen ? "▴" : "▾"}
            </button>

            {isWorktimeEditOpen && (
              <div style={{ marginTop: 12 }}>
                <div className="help-text" style={{ marginBottom: 10 }}>
                  ※ 현재 날짜 기준 출퇴근시간 수정
                </div>

                <div className="notice-box" style={{ marginBottom: 12 }}>
                  적용 기준: {currentEditDayLabel}
                </div>

                <label className="label">출근</label>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, marginBottom: 12 }}>
                  <input
                    className="input"
                    inputMode="numeric"
                    value={editStartHour}
                    onChange={(e) => setEditStartHour(clamp2(e.target.value))}
                    style={{ textAlign: "center" }}
                    placeholder="06"
                  />
                  <div style={{ fontWeight: 700 }}>:</div>
                  <input
                    className="input"
                    inputMode="numeric"
                    value={editStartMin}
                    onChange={(e) => setEditStartMin(clamp2(e.target.value))}
                    style={{ textAlign: "center" }}
                    placeholder="33"
                  />
                </div>

                <label className="label">퇴근</label>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                  <input
                    className="input"
                    inputMode="numeric"
                    value={editEndHour}
                    onChange={(e) => setEditEndHour(clamp2(e.target.value))}
                    style={{ textAlign: "center" }}
                    placeholder="15"
                  />
                  <div style={{ fontWeight: 700 }}>:</div>
                  <input
                    className="input"
                    inputMode="numeric"
                    value={editEndMin}
                    onChange={(e) => setEditEndMin(clamp2(e.target.value))}
                    style={{ textAlign: "center" }}
                    placeholder="54"
                  />
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button className="modal-btn" onClick={closeEditDialog}>아니요</button>
              <button className="modal-btn primary" onClick={() => commitEdit(editColor, editAlias)}>변경</button>
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
              {pathDate} {weekdayName(pathDate)}
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
              최신 인원/교번 정보가 있습니다.<br />
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

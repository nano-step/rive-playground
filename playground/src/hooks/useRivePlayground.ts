import { useState, useCallback, useRef, useEffect } from "react";
import type { Rive } from "@rive-app/react-canvas";
import { decodeImage } from "@rive-app/canvas";
import type {
  PlaygroundState,
  SMInput,
  TextRunEntry,
  ViewModelProperty,
  RiveEvent,
  ListAction,
} from "../types";
import { SM_INPUT_NUMBER, SM_INPUT_BOOLEAN, SM_INPUT_TRIGGER } from "../types";
import { useRiveMetadata } from "./useRiveMetadata";

const INITIAL_STATE: PlaygroundState = {
  isLoaded: false,
  isLoading: false,
  fileName: "",
  error: null,
  artboards: [],
  selectedArtboard: "",
  selectedStateMachine: "",
  selectedAnimation: "",
  smInputs: [],
  textRuns: [],
  viewModelProps: [],
  riveEvents: [],
};

let _eventIdCounter = 0;

export function useRivePlayground() {
  const [state, setState] = useState<PlaygroundState>(INITIAL_STATE);
  const [riveSource, setRiveSource] = useState<{
    buffer?: ArrayBuffer;
    src?: string;
  } | null>(null);
  const [riveBuffer, setRiveBuffer] = useState<ArrayBuffer | null>(null);
  const riveRef = useRef<Rive | null>(null);
  const selectedSMRef = useRef("");
  const selectedArtboardRef = useRef("");
  const vmInstanceRef = useRef<Record<string, unknown> | null>(null);
  const vmPropsCache = useRef<Map<string, Record<string, unknown>>>(new Map());
  const textRunNamesRef = useRef<string[]>([]);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const extractTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPresetRef = useRef<{
    inputs: Array<{ name: string; type: string; value: unknown }>;
    viewModelProps: Array<{ path: string; type: string; value: unknown }>;
    textRuns: Array<{ name: string; value: string }>;
  } | null>(null);
  const isApplyingPresetRef = useRef(false);

  const clearLoadTimeout = useCallback(() => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (state.isLoading) {
      clearLoadTimeout();
      loadTimeoutRef.current = setTimeout(() => {
        setState((prev) =>
          prev.isLoading
            ? {
                ...prev,
                isLoading: false,
                error:
                  "Loading timed out. The file may be corrupted or incompatible.",
              }
            : prev,
        );
      }, 15000);
    } else {
      clearLoadTimeout();
    }
    return clearLoadTimeout;
  }, [state.isLoading, clearLoadTimeout]);

  const metadataArtboards = useRiveMetadata(riveBuffer);

  useEffect(() => {
    if (metadataArtboards.length > 0) {
      setState((prev) => {
        const selectedArtboard =
          prev.selectedArtboard || metadataArtboards[0]?.name || "";
        const currentAb =
          metadataArtboards.find((a) => a.name === selectedArtboard) ??
          metadataArtboards[0];
        const selectedSM =
          prev.selectedStateMachine ||
          currentAb?.stateMachines[0]?.name ||
          "";
        const selectedAnimation =
          prev.selectedAnimation || currentAb?.animations[0]?.name || "";

        return {
          ...prev,
          artboards: metadataArtboards,
          selectedArtboard,
          selectedStateMachine: selectedSM,
          selectedAnimation,
        };
      });
    }
  }, [metadataArtboards]);

  const [resetCounter, setResetCounter] = useState(0);

  const riveKey = riveSource
    ? `${state.selectedArtboard}::${state.selectedStateMachine}::${resetCounter}`
    : "";

  const metadataReady = metadataArtboards.length > 0 && !!state.selectedArtboard;

  selectedSMRef.current = state.selectedStateMachine;
  selectedArtboardRef.current = state.selectedArtboard;

  const extractLiveData = useCallback(() => {
    const rive = riveRef.current;
    const smName = selectedSMRef.current;
    if (!rive || !smName) return;
    try {
      let smInputs: SMInput[] = [];
      try {
        const rawInputs = rive.stateMachineInputs(smName);
        smInputs = (rawInputs ?? []).map((inp) => ({
          name: inp.name,
          type: inp.type,
          value:
            inp.type === SM_INPUT_BOOLEAN || inp.type === SM_INPUT_NUMBER
              ? inp.value
              : undefined,
          fire: inp.type === SM_INPUT_TRIGGER ? () => inp.fire() : undefined,
        }));
      } catch {}

      let textRuns: TextRunEntry[] = [];
      for (const name of textRunNamesRef.current) {
        try {
          const val = rive.getTextRunValue(name);
          if (val !== undefined && val !== null) {
            textRuns.push({ name, value: String(val) });
          }
        } catch {}
      }

      let viewModelProps: ViewModelProperty[] = [];
      try {
        const riveAny = rive as unknown as Record<string, unknown>;

        let vmInst =
          (riveAny["viewModelInstance"] as Record<string, unknown> | null) ??
          null;

        if (!vmInst) {
          const defaultVM = (
            riveAny["defaultViewModel"] as
              | (() => Record<string, unknown> | null)
              | undefined
          )?.();
          if (defaultVM) {
            vmInst =
              (
                defaultVM["defaultInstance"] as
                  | (() => Record<string, unknown> | null)
                  | undefined
              )?.() ?? null;
            if (vmInst) {
              const bindFn = riveAny["bindViewModelInstance"] as
                | ((i: unknown) => void)
                | undefined;
              try {
                bindFn?.call(rive, vmInst);
              } catch {}
            }
          }
        }

        type VmInst = Record<string, unknown> & {
          viewModel(n: string): VmInst | null;
          image(n: string): Record<string, unknown> | null;
          trigger(n: string): Record<string, unknown> | null;
          list(n: string): Record<string, unknown> | null;
          [k: string]: unknown;
        };

        const readInstance = (
          inst: VmInst,
          pathPrefix: string,
        ): ViewModelProperty[] => {
          const props =
            (inst["properties"] as Array<{ name: string; type: string }>) ?? [];

          return props.map((p) => {
            const path = pathPrefix ? `${pathPrefix}.${p.name}` : p.name;
            const entry: ViewModelProperty = {
              name: p.name,
              type: p.type,
              path,
            };
            try {
              if (p.type === "list") {
                const listProp = inst.list(p.name);
                if (listProp) {
                  vmPropsCache.current.set(path, listProp);
                  const rawLen = listProp["length"];
                  const len = typeof rawLen === "function"
                    ? (rawLen as () => number).call(listProp)
                    : (rawLen as number) ?? 0;

                  const listItemChildren: ViewModelProperty[] = [];
                  let discoveredType = "";

                  for (let i = 0; i < len; i++) {
                    const itemInst = (
                      listProp["instanceAt"] as ((i: number) => VmInst | null) | undefined
                    )?.call(listProp, i);
                    if (!itemInst) continue;

                    const itemPath = `${path}[${i}]`;
                    vmPropsCache.current.set(itemPath, itemInst as Record<string, unknown>);

                    if (i === 0) {
                      discoveredType = (itemInst["viewModelName"] as string | undefined) ?? "";
                    }

                    listItemChildren.push({
                      name: `Item ${i}`,
                      type: "listItem",
                      path: itemPath,
                      children: readInstance(itemInst, itemPath),
                    });
                  }

                  entry.children = listItemChildren;
                  entry.listItemType = discoveredType;
                }
              } else {
                const typeKey = p.type === "enumType" ? "enum" : p.type;
                const fn = inst[typeKey] as ((n: string) => Record<string, unknown> | null) | undefined;
                const prop = fn?.call(inst, p.name);
                if (prop) {
                  vmPropsCache.current.set(path, prop);
                  if (p.type === "enumType") {
                    entry.value = prop["value"] as string;
                    entry.enumValues = (prop["values"] as string[]) ?? [];
                  } else if (
                    p.type === "string" ||
                    p.type === "number" ||
                    p.type === "boolean" ||
                    p.type === "color"
                  ) {
                    entry.value = prop["value"] as string | number | boolean;
                  } else if (p.type === "image") {
                    entry.imageUrl =
                      (prop["url"] as string | undefined) ?? undefined;
                  } else if (p.type === "viewModel") {
                    const childInst = prop as VmInst;
                    if (
                      childInst &&
                      typeof childInst["properties"] !== "undefined"
                    ) {
                      entry.children = readInstance(childInst, path);
                    }
                  }
                }
              }
            } catch {}
            return entry;
          });
        };

        if (vmInst) {
          vmInstanceRef.current = vmInst;
          vmPropsCache.current.clear();
          viewModelProps = readInstance(vmInst as VmInst, "");
        }
      } catch {}

      const pending = pendingPresetRef.current;
      if (pending) {
        if (smInputs.length === 0) return;

        pendingPresetRef.current = null;
        isApplyingPresetRef.current = false;
        const rive = riveRef.current;
        if (rive) {
          try {
            const rawInputs = rive.stateMachineInputs(selectedSMRef.current);
            for (const inp of pending.inputs) {
              const found = rawInputs?.find((i) => i.name === inp.name);
              if (found) found.value = inp.value as number | boolean;
            }
            smInputs = smInputs.map((i) => {
              const override = pending.inputs.find((p) => p.name === i.name);
              return override ? { ...i, value: override.value as number | boolean } : i;
            });
          } catch {}
          for (const tr of pending.textRuns) {
            try { rive.setTextRunValue(tr.name, tr.value); } catch {}
          }
          textRuns = textRuns.map((t) => {
            const override = pending.textRuns.find((p) => p.name === t.name);
            return override ? { ...t, value: override.value } : t;
          });
        }
        for (const vp of pending.viewModelProps) {
          const cached = vmPropsCache.current.get(vp.path);
          if (cached && "value" in cached) {
            try { (cached as { value: unknown }).value = vp.value; } catch {}
          }
          viewModelProps = viewModelProps.map((p) => {
            if (p.path === vp.path) return { ...p, value: vp.value as string | number | boolean };
            if (p.children) {
              return {
                ...p, children: p.children.map((c) =>
                  c.path === vp.path ? { ...c, value: vp.value as string | number | boolean } : c
                ),
              };
            }
            return p;
          });
        }
      }

      setState((prev) => ({
        ...prev,
        smInputs,
        textRuns,
        viewModelProps,
      }));
    } catch {}
  }, []);

  const addRiveEvent = useCallback((name: string, type: "general" | "openUrl", properties?: Record<string, unknown>, url?: string) => {
    const now = new Date();
    const ts = now.toLocaleTimeString("en-US", { hour12: false }) + "." + String(now.getMilliseconds()).padStart(3, "0");
    const event: RiveEvent = { id: ++_eventIdCounter, timestamp: ts, name, type, properties, url };
    setState((prev) => ({
      ...prev,
      riveEvents: [event, ...prev.riveEvents].slice(0, 50),
    }));
  }, []);

  const clearEvents = useCallback(() => {
    setState((prev) => ({ ...prev, riveEvents: [] }));
  }, []);

  const onRiveReady = useCallback(
    (rive: Rive) => {
      riveRef.current = rive;
      clearLoadTimeout();
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isLoaded: true,
        error: null,
      }));
      try {
        const riveAny = rive as unknown as Record<string, unknown>;
        const onFn = riveAny["on"] as ((event: string, cb: (e: unknown) => void) => void) | undefined;
        if (onFn) {
          onFn.call(rive, "RiveEvent", (e: unknown) => {
            const ev = e as Record<string, unknown>;
            const data = (ev["data"] as Record<string, unknown>) ?? ev;
            const evName = (data["name"] as string) ?? "event";
            const isOpenUrl = !!(data["url"]);
            const evType: "openUrl" | "general" = isOpenUrl ? "openUrl" : "general";
            const props = (data["properties"] as Record<string, unknown>) ?? undefined;
            addRiveEvent(evName, evType, props, data["url"] as string | undefined);
          });
        }
      } catch {}
      if (pendingPresetRef.current) {
        let retryTimer: ReturnType<typeof setTimeout> | null = null;
        const scheduleExtractWithRetry = (attempts: number) => {
          const delay = attempts === 0 ? 300 : 200;
          retryTimer = setTimeout(() => {
            extractLiveData();
            if (pendingPresetRef.current) {
              if (attempts < 10) {
                scheduleExtractWithRetry(attempts + 1);
              } else {
                pendingPresetRef.current = null;
                isApplyingPresetRef.current = false;
              }
            }
          }, delay);
        };
        scheduleExtractWithRetry(0);
        return () => { if (retryTimer) clearTimeout(retryTimer); };
      } else {
        const readyTimer = setTimeout(extractLiveData, 500);
        return () => clearTimeout(readyTimer);
      }
    },
    [clearLoadTimeout, extractLiveData, addRiveEvent],
  );

  useEffect(() => {
    if (isApplyingPresetRef.current) return;
    if (riveRef.current && state.isLoaded && state.selectedStateMachine) {
      const timer = setTimeout(extractLiveData, 500);
      return () => clearTimeout(timer);
    }
  }, [state.selectedStateMachine, state.isLoaded, extractLiveData]);

  const loadFromBuffer = useCallback(
    (buffer: ArrayBuffer, fileName: string) => {
      riveRef.current = null;
      setState({ ...INITIAL_STATE, isLoading: true, fileName });
      setRiveBuffer(buffer);
      setRiveSource({ buffer });
    },
    [],
  );

  const loadFromUrl = useCallback((url: string) => {
    riveRef.current = null;
    setState({
      ...INITIAL_STATE,
      isLoading: true,
      fileName: url.split("/").pop() ?? url,
    });
    setRiveSource({ src: url });
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return res.arrayBuffer();
      })
      .then((buf) => setRiveBuffer(buf))
      .catch((err: Error) => {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: `Failed to load file: ${err.message}`,
        }));
      });
  }, []);

  const selectArtboard = useCallback((name: string) => {
    riveRef.current = null;
    setState((prev) => ({
      ...prev,
      selectedArtboard: name,
      selectedStateMachine: "",
      smInputs: [],
    }));
  }, []);

  const selectStateMachine = useCallback((name: string) => {
    riveRef.current = null;
    setState((prev) => ({ ...prev, selectedStateMachine: name, smInputs: [] }));
  }, []);

  const setSMInputValue = useCallback(
    (inputName: string, value: number | boolean) => {
      const rive = riveRef.current;
      if (!rive) return;
      try {
        const inputs = rive.stateMachineInputs(selectedSMRef.current);
        const input = inputs?.find((i) => i.name === inputName);
        if (input) {
          input.value = value;
        }
      } catch {}
      setState((prev) => ({
        ...prev,
        smInputs: prev.smInputs.map((i) =>
          i.name === inputName ? { ...i, value } : i,
        ),
      }));
    },
    [],
  );

  const fireSMTrigger = useCallback((inputName: string) => {
    const rive = riveRef.current;
    if (!rive) return;
    try {
      const inputs = rive.stateMachineInputs(selectedSMRef.current);
      const input = inputs?.find((i) => i.name === inputName);
      if (input) {
        input.fire();
      }
    } catch {}
  }, []);

  const setViewModelProp = useCallback(
    (
      propPath: string,
      propType: string,
      value: string | number | boolean | ArrayBuffer,
    ) => {
      if (!riveRef.current) return;

      const cached = vmPropsCache.current.get(propPath);

      try {
        if (propType === "trigger") {
          if (cached && typeof cached["trigger"] === "function") {
            (cached["trigger"] as () => void).call(cached);
          }
        } else if (propType === "image") {
          const imgProp = cached;
          if (imgProp) {
            const applyImage = async (bytes: Uint8Array) => {
              const decoded = await decodeImage(bytes);
              if (decoded) {
                (imgProp as { value: unknown }).value = decoded;
              }
            };
            if (value instanceof ArrayBuffer) {
              applyImage(new Uint8Array(value));
            } else if (typeof value === "string") {
              fetch(value)
                .then((res) => res.arrayBuffer())
                .then((buf) => applyImage(new Uint8Array(buf)))
                .catch(() => {});
            }
          }
        } else if (cached && "value" in cached) {
          (cached as { value: unknown }).value = value;
        }
      } catch {}

      const updateNested = (
        props: ViewModelProperty[],
        path: string,
        val: string | number | boolean | ArrayBuffer,
      ): ViewModelProperty[] =>
        props.map((p) => {
          if (p.path === path) {
            if (val instanceof ArrayBuffer)
              return { ...p, imageUrl: "(uploaded)" };
            if (typeof val === "string" && p.type === "image")
              return { ...p, imageUrl: val };
            return { ...p, value: val as string | number | boolean };
          }
          if (p.children) {
            return { ...p, children: updateNested(p.children, path, val) };
          }
          return p;
        });

      setState((prev) => ({
        ...prev,
        viewModelProps: updateNested(prev.viewModelProps, propPath, value),
      }));
    },
    [],
  );

  const findListNode = useCallback(
    (props: ViewModelProperty[], targetPath: string): ViewModelProperty | undefined => {
      for (const p of props) {
        if (p.path === targetPath && p.type === "list") return p;
        if (p.children) {
          const found = findListNode(p.children, targetPath);
          if (found) return found;
        }
      }
      return undefined;
    },
    [],
  );

  const scheduleExtract = useCallback(() => {
    if (extractTimerRef.current) clearTimeout(extractTimerRef.current);
    extractTimerRef.current = setTimeout(extractLiveData, 50);
  }, [extractLiveData]);

  const performListAction = useCallback(
    (action: ListAction, currentViewModelProps: ViewModelProperty[]) => {
      const listPath = action.listPath;
      const listProp = vmPropsCache.current.get(listPath);
      if (!listProp) return;

      try {
        if (action.action === "remove") {
          (listProp["removeInstanceAt"] as ((i: number) => void) | undefined)
            ?.call(listProp, action.index);
        } else if (action.action === "swap") {
          (listProp["swap"] as ((a: number, b: number) => void) | undefined)
            ?.call(listProp, action.indexA, action.indexB);
        } else if (action.action === "add") {
          const listNode = findListNode(currentViewModelProps, listPath);
          const typeName = listNode?.listItemType ?? "";
          const riveAny = riveRef.current as unknown as Record<string, unknown> | null;
          const vmByName = riveAny?.["viewModelByName"] as
            | ((n: string) => Record<string, unknown> | null)
            | undefined;
          const vmDef = typeName ? vmByName?.call(riveRef.current, typeName) : null;
          const defaultInstFn = vmDef
            ? (vmDef["defaultInstance"] as (() => Record<string, unknown> | null) | undefined)
            : undefined;
          const newInst = defaultInstFn?.call(vmDef);
          if (newInst) {
            (listProp["addInstance"] as ((i: Record<string, unknown>) => void) | undefined)
              ?.call(listProp, newInst);
          }
        }
      } catch {}

      const prefix = `${listPath}[`;
      for (const key of Array.from(vmPropsCache.current.keys())) {
        if (key === listPath || key.startsWith(prefix)) {
          vmPropsCache.current.delete(key);
        }
      }

      scheduleExtract();
    },
    [findListNode, scheduleExtract],
  );

  const setTextRunValue = useCallback(
    (name: string, value: string) => {
      const rive = riveRef.current;
      if (!rive) return;
      try {
        rive.setTextRunValue(name, value);
        setState((prev) => ({
          ...prev,
          textRuns: prev.textRuns.map((t) =>
            t.name === name ? { ...t, value } : t,
          ),
        }));
      } catch {}
    },
    [],
  );

  const addTextRunName = useCallback(
    (name: string) => {
      if (!textRunNamesRef.current.includes(name)) {
        textRunNamesRef.current.push(name);
        const rive = riveRef.current;
        if (rive) {
          try {
            const val = rive.getTextRunValue(name);
            if (val !== undefined && val !== null) {
              setState((prev) => ({
                ...prev,
                textRuns: [...prev.textRuns, { name, value: String(val) }],
              }));
            }
          } catch {}
        }
      }
    },
    [],
  );

  const playAnimation = useCallback(() => {
    const rive = riveRef.current;
    if (!rive) return;
    const sm = selectedSMRef.current;
    if (sm) {
      rive.play(sm);
    } else {
      rive.play();
    }
  }, []);

  const pauseAnimation = useCallback(() => {
    const rive = riveRef.current;
    if (!rive) return;
    const sm = selectedSMRef.current;
    if (sm) {
      rive.pause(sm);
    } else {
      rive.pause();
    }
  }, []);

  const resetAnimation = useCallback(() => {
    riveRef.current = null;
    setResetCounter((c) => c + 1);
  }, []);

  const applyPreset = useCallback((preset: {
    artboard: string;
    stateMachine: string;
    inputs: Array<{ name: string; type: string; value: unknown }>;
    viewModelProps: Array<{ path: string; type: string; value: unknown }>;
    textRuns: Array<{ name: string; value: string }>;
  }) => {
    pendingPresetRef.current = {
      inputs: preset.inputs,
      viewModelProps: preset.viewModelProps,
      textRuns: preset.textRuns,
    };

    const rive = riveRef.current;
    const currentArtboard = selectedArtboardRef.current;
    const currentSM = selectedSMRef.current;
    const needsRemount =
      preset.artboard !== currentArtboard ||
      preset.stateMachine !== currentSM;

    if (rive && !needsRemount) {
      try {
        const rawInputs = rive.stateMachineInputs(currentSM);
        for (const inp of preset.inputs) {
          const found = rawInputs?.find((i) => i.name === inp.name);
          if (found) found.value = inp.value as number | boolean;
        }
      } catch {}

      for (const tr of preset.textRuns) {
        try { rive.setTextRunValue(tr.name, tr.value); } catch {}
      }

      for (const vp of preset.viewModelProps) {
        const cached = vmPropsCache.current.get(vp.path);
        if (cached && "value" in cached) {
          try { (cached as { value: unknown }).value = vp.value; } catch {}
        }
      }

      const applyVmOverrides = (props: ViewModelProperty[]): ViewModelProperty[] =>
        props.map((p) => {
          const override = preset.viewModelProps.find((vp) => vp.path === p.path);
          if (override) return { ...p, value: override.value as string | number | boolean };
          if (p.children) return { ...p, children: applyVmOverrides(p.children) };
          return p;
        });

      setState((prev) => ({
        ...prev,
        selectedArtboard: preset.artboard,
        selectedStateMachine: preset.stateMachine,
        smInputs: prev.smInputs.map((i) => {
          const override = preset.inputs.find((p) => p.name === i.name);
          return override ? { ...i, value: override.value as number | boolean } : i;
        }),
        textRuns: prev.textRuns.map((t) => {
          const override = preset.textRuns.find((p) => p.name === t.name);
          return override ? { ...t, value: override.value } : t;
        }),
        viewModelProps: applyVmOverrides(prev.viewModelProps),
      }));

      pendingPresetRef.current = null;
    } else {
      isApplyingPresetRef.current = true;
      setState((prev) => ({
        ...prev,
        selectedArtboard: preset.artboard,
        selectedStateMachine: preset.stateMachine,
        smInputs: [],
        textRuns: [],
      }));
      riveRef.current = null;
      setResetCounter((c) => c + 1);
    }
  }, []);

  return {
    state,
    riveSource,
    riveKey,
    metadataReady,
    onRiveReady,
    loadFromBuffer,
    loadFromUrl,
    selectArtboard,
    selectStateMachine,
    setSMInputValue,
    fireSMTrigger,
    setViewModelProp,
    performListAction,
    setTextRunValue,
    addTextRunName,
    playAnimation,
    pauseAnimation,
    resetAnimation,
    clearEvents,
    applyPreset,
  };
}

import { useState, useCallback, useRef, useEffect } from "react";
import type { Rive } from "@rive-app/react-canvas";
import { decodeImage } from "@rive-app/canvas";
import type {
  PlaygroundState,
  SMInput,
  TextRunEntry,
  ViewModelProperty,
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
};

export function useRivePlayground() {
  const [state, setState] = useState<PlaygroundState>(INITIAL_STATE);
  const [riveSource, setRiveSource] = useState<{
    buffer?: ArrayBuffer;
    src?: string;
  } | null>(null);
  const [riveBuffer, setRiveBuffer] = useState<ArrayBuffer | null>(null);
  const riveRef = useRef<Rive | null>(null);
  const selectedSMRef = useRef("");
  const vmInstanceRef = useRef<Record<string, unknown> | null>(null);
  const vmPropsCache = useRef<Map<string, Record<string, unknown>>>(new Map());
  const textRunNamesRef = useRef<string[]>([]);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

      const textRuns: TextRunEntry[] = [];
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

      setState((prev) => ({
        ...prev,
        smInputs,
        textRuns,
        viewModelProps,
      }));
    } catch {}
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
      setTimeout(extractLiveData, 500);
    },
    [clearLoadTimeout, extractLiveData],
  );

  useEffect(() => {
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
      .then((res) => res.arrayBuffer())
      .then((buf) => setRiveBuffer(buf))
      .catch(() => {});
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
    setTextRunValue,
    addTextRunName,
    playAnimation,
    pauseAnimation,
    resetAnimation,
  };
}

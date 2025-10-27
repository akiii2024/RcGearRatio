const STORAGE_KEY = 'rc-gear-ratio:machines';
const PRECISION_DIGITS = 3;

const applyPrecision = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }
  return Number(numeric.toFixed(PRECISION_DIGITS));
};

const DEFAULT_MACHINES = [
  { id: 'default-trf420', name: 'TRF420', finalRatio: applyPrecision(1.85) },
];

const sanitizeMachines = (list) =>
  list
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      finalRatio: applyPrecision(entry.finalRatio),
    }))
    .filter((entry) => entry.name && entry.finalRatio !== null);

const ensureDefaults = (machines) => {
  const byId = new Set(machines.map((machine) => machine.id));
  const result = [...machines];

  DEFAULT_MACHINES.forEach((defaults) => {
    if (!byId.has(defaults.id)) {
      result.push({ ...defaults });
    }
  });

  return result;
};

const loadMachines = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [...DEFAULT_MACHINES];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [...DEFAULT_MACHINES];
    }

    const sanitized = sanitizeMachines(parsed);
    if (sanitized.length === 0) {
      return [...DEFAULT_MACHINES];
    }

    return ensureDefaults(sanitized);
  } catch (error) {
    console.error('Failed to load machines', error);
    return [...DEFAULT_MACHINES];
  }
};

const saveMachines = (machines) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(machines));
};

const createId = () => `machine-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;

export class MachineStore {
  constructor() {
    this.machines = ensureDefaults(loadMachines());
    this.listeners = new Set();
    saveMachines(this.machines);
  }

  subscribe(callback) {
    this.listeners.add(callback);
    callback(this.machines);
    return () => {
      this.listeners.delete(callback);
    };
  }

  notify() {
    this.listeners.forEach((cb) => cb(this.machines));
    saveMachines(this.machines);
  }

  addMachine({ name, finalRatio }) {
    const cleanName = name.trim();
    const ratio = applyPrecision(finalRatio);
    if (!cleanName || ratio === null) {
      return false;
    }

    this.machines = [
      ...this.machines,
      { id: createId(), name: cleanName, finalRatio: ratio },
    ];
    this.notify();
    return true;
  }

  removeMachine(id) {
    const next = ensureDefaults(this.machines.filter((machine) => machine.id !== id));
    if (next.length === this.machines.length) {
      return;
    }
    this.machines = next;
    this.notify();
  }

  updateMachine(id, partial) {
    let updated = false;
    this.machines = ensureDefaults(
      this.machines.map((machine) => {
        if (machine.id !== id) {
          return machine;
        }
        updated = true;
        return {
          ...machine,
          ...partial,
          finalRatio:
            partial.finalRatio !== undefined && partial.finalRatio !== null
              ? applyPrecision(partial.finalRatio)
              : machine.finalRatio,
        };
      }),
    );
    if (updated) {
      this.notify();
    }
  }

  getMachineById(id) {
    return this.machines.find((machine) => machine.id === id) ?? null;
  }
}

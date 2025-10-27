const STORAGE_KEY = 'rc-gear-ratio:motors';
const PRECISION_DIGITS = 0;

const applyPrecision = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }
  return Number(numeric.toFixed(PRECISION_DIGITS));
};

const DEFAULT_MOTORS = [
  { id: 'default-xerun17.5t-21000', name: 'XeRun XR10 17.5T', rpm: applyPrecision(21000) },
];

const sanitizeMotors = (list) =>
  list
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      rpm: applyPrecision(entry.rpm),
    }))
    .filter((entry) => entry.name && entry.rpm !== null);

const ensureDefaults = (motors) => {
  const byId = new Set(motors.map((motor) => motor.id));
  const result = [...motors];

  DEFAULT_MOTORS.forEach((defaults) => {
    if (!byId.has(defaults.id)) {
      result.push({ ...defaults });
    }
  });

  return result;
};

const loadMotors = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [...DEFAULT_MOTORS];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [...DEFAULT_MOTORS];
    }

    const sanitized = sanitizeMotors(parsed);
    if (sanitized.length === 0) {
      return [...DEFAULT_MOTORS];
    }

    return ensureDefaults(sanitized);
  } catch (error) {
    console.error('Failed to load motors', error);
    return [...DEFAULT_MOTORS];
  }
};

const saveMotors = (motors) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(motors));
};

const createId = () =>
  `motor-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;

export class MotorStore {
  constructor() {
    this.motors = ensureDefaults(loadMotors());
    this.listeners = new Set();
    saveMotors(this.motors);
  }

  subscribe(callback) {
    this.listeners.add(callback);
    callback(this.motors);
    return () => {
      this.listeners.delete(callback);
    };
  }

  notify() {
    this.listeners.forEach((cb) => cb(this.motors));
    saveMotors(this.motors);
  }

  addMotor({ name, rpm }) {
    const cleanName = name.trim();
    const cleanRpm = applyPrecision(rpm);
    if (!cleanName || cleanRpm === null) {
      return false;
    }

    this.motors = [
      ...this.motors,
      { id: createId(), name: cleanName, rpm: cleanRpm },
    ];
    this.notify();
    return true;
  }

  removeMotor(id) {
    const next = ensureDefaults(this.motors.filter((motor) => motor.id !== id));
    if (next.length === this.motors.length) {
      return;
    }
    this.motors = next;
    this.notify();
  }

  updateMotor(id, partial) {
    let updated = false;
    this.motors = ensureDefaults(
      this.motors.map((motor) => {
        if (motor.id !== id) {
          return motor;
        }
        updated = true;
        return {
          ...motor,
          ...partial,
          rpm:
            partial.rpm !== undefined && partial.rpm !== null
              ? applyPrecision(partial.rpm)
              : motor.rpm,
        };
      }),
    );
    if (updated) {
      this.notify();
    }
  }

  getMotorById(id) {
    return this.motors.find((motor) => motor.id === id) ?? null;
  }
}


import './common.js';
import { initMachineUI, initMotorUI } from './ui-helpers.js';

const DEFAULT_MIN_FRACTION = 3;
const DEFAULT_MAX_FRACTION = 3;

const numberFormatter = new Intl.NumberFormat('ja-JP', {
  minimumFractionDigits: DEFAULT_MIN_FRACTION,
  maximumFractionDigits: DEFAULT_MAX_FRACTION,
});

const gearFormatter = new Intl.NumberFormat('ja-JP', {
  minimumFractionDigits: DEFAULT_MIN_FRACTION,
  maximumFractionDigits: DEFAULT_MAX_FRACTION,
});

const spurInput = document.querySelector('#spur-teeth');
const pinionInput = document.querySelector('#pinion-teeth');
const finalRatioInput = document.querySelector('#final-ratio');
const machineSelect = document.querySelector('#machine-select');
const motorSelect = document.querySelector('#motor-select');
const motorInput = document.querySelector('#motor-rpm');
const tireInput = document.querySelector('#tire-rpm');

const outputs = {
  spurPinion: document.querySelector('[data-output="spur-pinion"]'),
  gearRatio: document.querySelector('[data-output="gear-ratio"]'),
  motorRpm: document.querySelector('[data-output="motor-rpm"]'),
  tireRpm: document.querySelector('[data-output="tire-rpm"]'),
};

const REQUIRED_INPUTS = [spurInput, pinionInput, finalRatioInput];

const readInputNumber = (input) => {
  if (!input) {
    return null;
  }
  const raw = input.value;
  if (raw == null || raw.trim() === '') {
    return null;
  }
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : null;
};

const hasValidRequiredInputs = () =>
  REQUIRED_INPUTS.every((input) => {
    const value = readInputNumber(input);
    return value != null && value > 0;
  });

const resetOutputs = () => {
  Object.values(outputs).forEach((output) => {
    if (output) {
      output.textContent = '--';
    }
  });
};

const getGearRatio = () => {
  const spur = readInputNumber(spurInput);
  const pinion = readInputNumber(pinionInput);
  const finalRatio = readInputNumber(finalRatioInput);

  if (!spur || !pinion || !finalRatio) {
    return null;
  }

  return (spur / pinion) * finalRatio;
};

const updateGearOutputs = (ratio) => {
  if (!ratio || !outputs.spurPinion || !outputs.gearRatio) {
    return;
  }

  const spur = readInputNumber(spurInput);
  const pinion = readInputNumber(pinionInput);

  outputs.spurPinion.textContent = gearFormatter.format((spur ?? 0) / (pinion ?? 1));
  outputs.gearRatio.textContent = gearFormatter.format(ratio);
};

const applyPrecision = (value) =>
  value != null && Number.isFinite(value)
    ? Number(value.toFixed(DEFAULT_MAX_FRACTION))
    : null;

const setInputValue = (input, value) => {
  if (!input) {
    return;
  }
  if (value == null) {
    input.value = '';
    return;
  }
  input.value = value.toFixed(DEFAULT_MAX_FRACTION);
};

const updateRpmOutputs = ({ motorRpm, tireRpm }) => {
  if (outputs.motorRpm) {
    const normalizedMotor = applyPrecision(motorRpm);
    outputs.motorRpm.textContent = normalizedMotor != null ? numberFormatter.format(normalizedMotor) : '--';
  }
  if (outputs.tireRpm) {
    const normalizedTire = applyPrecision(tireRpm);
    outputs.tireRpm.textContent = normalizedTire != null ? numberFormatter.format(normalizedTire) : '--';
  }
};

const calculate = ({ source } = {}) => {
  if (!hasValidRequiredInputs()) {
    resetOutputs();
    return;
  }

  const ratio = getGearRatio();
  if (!ratio) {
    resetOutputs();
    return;
  }

  updateGearOutputs(ratio);

  const motorValue = readInputNumber(motorInput);
  const tireValue = readInputNumber(tireInput);

  if (source === 'motor' || (!source && motorValue != null)) {
    const tireRpm = applyPrecision((motorValue ?? 0) / ratio);
    setInputValue(tireInput, tireValue != null ? applyPrecision(tireValue) : tireRpm);
    updateRpmOutputs({ motorRpm: applyPrecision(motorValue), tireRpm });
    return;
  }

  if (source === 'tire' || (!source && tireValue != null)) {
    const motorRpm = applyPrecision((tireValue ?? 0) * ratio);
    setInputValue(motorInput, motorValue != null ? applyPrecision(motorValue) : motorRpm);
    updateRpmOutputs({ motorRpm, tireRpm: applyPrecision(tireValue) });
    return;
  }

  updateRpmOutputs({
    motorRpm: applyPrecision(motorValue),
    tireRpm: applyPrecision(tireValue),
  });
};

const bindInputs = ({ getMotorById }) => {
  REQUIRED_INPUTS.forEach((input) => {
    input?.addEventListener('input', () => calculate());
  });

  motorInput?.addEventListener('input', () => calculate({ source: 'motor' }));
  motorSelect?.addEventListener('change', () => {
    const selectedMotor = motorSelect.value ? getMotorById(motorSelect.value) : null;
    if (selectedMotor?.rpm != null) {
      setInputValue(motorInput, applyPrecision(selectedMotor.rpm));
      calculate({ source: 'motor' });
    }
  });
  tireInput?.addEventListener('input', () => calculate({ source: 'tire' }));
};

const onMachineSelect = (machine) => {
  if (!finalRatioInput) {
    return;
  }
  setInputValue(finalRatioInput, applyPrecision(machine.finalRatio));
  calculate();
};

const init = () => {
  const form = document.querySelector('#calculator-form');
  if (!form) {
    return;
  }

  initMachineUI({
    selectElement: machineSelect,
    managerContainer: document.querySelector('[data-machine-manager]'),
    onSelect: onMachineSelect,
  });

  const initMotorResult = initMotorUI({
    selectElement: motorSelect,
    managerContainer: document.querySelector('[data-motor-manager]'),
    onSelect: (motor) => {
      setInputValue(motorInput, applyPrecision(motor.rpm));
      calculate({ source: 'motor' });
    },
  });

  const getMotorById = initMotorResult?.store?.getMotorById?.bind(initMotorResult.store) ?? (() => null);

  bindInputs({ getMotorById });
  resetOutputs();
};

init();

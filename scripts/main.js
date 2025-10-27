const determineSearchRange = ({
  currentSpur,
  currentPinion,
  spurMinOverride,
  spurMaxOverride,
  pinionMinOverride,
  pinionMaxOverride,
  mode = 'free',
}) => {
  const spur = normalizeNumber(currentSpur, DEFAULT_SPUR_RANGE);
  const pinion = normalizeNumber(currentPinion, DEFAULT_PINION_RANGE);

  const overrideSpurMin = normalizeNumber(spurMinOverride, { min: 1 });
  const overrideSpurMax = normalizeNumber(spurMaxOverride, { min: 1 });
  const overridePinionMin = normalizeNumber(pinionMinOverride, { min: 1 });
  const overridePinionMax = normalizeNumber(pinionMaxOverride, { min: 1 });

  const spurRange = {
    min:
      overrideSpurMin ?? Math.max(1, Math.floor((spur ?? DEFAULT_SPUR_RANGE.min) - DEFAULT_SPUR_SPREAD)),
    max:
      overrideSpurMax ?? Math.floor((spur ?? DEFAULT_SPUR_RANGE.min) + DEFAULT_SPUR_SPREAD),
  };

  const pinionRange = {
    min:
      overridePinionMin ?? Math.max(1, Math.floor((pinion ?? DEFAULT_PINION_RANGE.min) - DEFAULT_PINION_SPREAD)),
    max:
      overridePinionMax ?? Math.floor((pinion ?? DEFAULT_PINION_RANGE.min) + DEFAULT_PINION_SPREAD),
  };

  if (mode === 'lock-spur' && spur != null) {
    const fixed = Math.max(1, Math.round(spur));
    spurRange.min = fixed;
    spurRange.max = fixed;
  }

  if (mode === 'lock-pinion' && pinion != null) {
    const fixed = Math.max(1, Math.round(pinion));
    pinionRange.min = fixed;
    pinionRange.max = fixed;
  }

  if (spurRange.max <= spurRange.min) {
    if (spurRange.max !== spurRange.min) {
      spurRange.max = spurRange.min + DEFAULT_SPUR_SPREAD;
    }
  }

  if (pinionRange.max <= pinionRange.min) {
    if (pinionRange.max !== pinionRange.min) {
      pinionRange.max = pinionRange.min + DEFAULT_PINION_SPREAD;
    }
  }

  return { spurRange, pinionRange };
};

const renderSuggestionList = ({ targetGearRatio, suggestions, motorRpm }) => {
  if (!suggestionOutputs.list) {
    return;
  }

  suggestionOutputs.list.innerHTML = '';

  suggestions.forEach(({ spur, pinion, ratio }) => {
    const item = document.createElement('li');
    item.className = 'suggestion-item';

    const spurPinion = document.createElement('strong');
    spurPinion.textContent = `スパー: ${spur}T ピニオン: ${pinion}T`;

    const ratioText = document.createElement('span');
    ratioText.textContent = `ギア比: ${gearFormatter.format(ratio)}`;

    const diff = Math.abs(ratio - targetGearRatio);
    const diffText = document.createElement('span');
    diffText.textContent = `差分: ${gearFormatter.format(diff)}`;

    const calculatedTire = calculateResultingTireRpm({ motorRpm, gearRatio: ratio });
    const predictedTire = document.createElement('span');
    predictedTire.textContent = calculatedTire != null ? `タイヤ回転数: ${numberFormatter.format(applyPrecision(calculatedTire) ?? calculatedTire)}` : '';

    item.append(spurPinion, ratioText, diffText);
    if (predictedTire.textContent) {
      item.append(predictedTire);
    }

    suggestionOutputs.list.append(item);
  });
};

const updateSuggestionSummary = ({ targetGearRatio, bestSuggestion, motorRpm }) => {
  if (suggestionOutputs.targetGearRatio) {
    suggestionOutputs.targetGearRatio.textContent = targetGearRatio != null ? gearFormatter.format(targetGearRatio) : '--';
  }

  const bestRatio = bestSuggestion?.ratio ?? null;
  if (suggestionOutputs.bestGearRatio) {
    suggestionOutputs.bestGearRatio.textContent = bestRatio != null ? gearFormatter.format(bestRatio) : '--';
  }

  const predictedTire = bestRatio != null ? calculateResultingTireRpm({ motorRpm, gearRatio: bestRatio }) : null;
  if (suggestionOutputs.suggestedTireRpm) {
    suggestionOutputs.suggestedTireRpm.textContent = predictedTire != null ? numberFormatter.format(applyPrecision(predictedTire) ?? predictedTire) : '--';
  }
};

const showSuggestionMessage = (message) => {
  if (suggestionOutputs.message) {
    suggestionOutputs.message.textContent = message;
  }
};

const initializeRangeDefaults = () => {
  if (spurRangeMinInput && !spurRangeMinInput.value) {
    spurRangeMinInput.value = String(DEFAULT_SPUR_RANGE.min);
  }
  if (spurRangeMaxInput && !spurRangeMaxInput.value) {
    spurRangeMaxInput.value = String(DEFAULT_SPUR_RANGE.max);
  }
  if (pinionRangeMinInput && !pinionRangeMinInput.value) {
    pinionRangeMinInput.value = String(DEFAULT_PINION_RANGE.min);
  }
  if (pinionRangeMaxInput && !pinionRangeMaxInput.value) {
    pinionRangeMaxInput.value = String(DEFAULT_PINION_RANGE.max);
  }
};

const searchGearSuggestions = () => {
  clearSuggestions();

  const motorRpm = readInputNumber(motorInput);
  const tireRpm = readInputNumber(tireInput);
  const finalRatio = readInputNumber(finalRatioInput);
  const spur = readInputNumber(spurInput);
  const pinion = readInputNumber(pinionInput);
  const spurMin = readInputNumber(spurRangeMinInput);
  const spurMax = readInputNumber(spurRangeMaxInput);
  const pinionMin = readInputNumber(pinionRangeMinInput);
  const pinionMax = readInputNumber(pinionRangeMaxInput);
  const searchMode = searchModeSelect?.value ?? 'free';

  if (!motorRpm || !tireRpm) {
    showSuggestionMessage('モーター回転数とタイヤ回転数を両方入力してください。');
    setErrorMessage({ element: searchModeError, message: null });
    return;
  }

  if (!finalRatio) {
    showSuggestionMessage('最終減速比が設定されていません。マシンを選択するか直接入力してください。');
    setErrorMessage({ element: searchModeError, message: null });
    return;
  }

  const lockValidationMessage = validateLockModeInputs({ mode: searchMode, spur, pinion });
  if (lockValidationMessage) {
    showSuggestionMessage(lockValidationMessage);
    setErrorMessage({ element: searchModeError, message: lockValidationMessage });
    return;
  }
  setErrorMessage({ element: searchModeError, message: null });

  const targetGearRatio = calculateTargetGearRatio({ motorRpm, tireRpm });
  if (!targetGearRatio) {
    showSuggestionMessage('入力された値からギア比を計算できません。数値を確認してください。');
    return;
  }

  const { spurRange, pinionRange } = determineSearchRange({
    currentSpur: spur,
    currentPinion: pinion,
    spurMinOverride: spurMin,
    spurMaxOverride: spurMax,
    pinionMinOverride: pinionMin,
    pinionMaxOverride: pinionMax,
    mode: searchMode,
  });
  const suggestions = enumerateGearCombinations({
    targetGearRatio,
    finalRatio,
    spurRange,
    pinionRange,
  });

  if (suggestions.length === 0) {
    showSuggestionMessage('指定された条件に合うスパー／ピニオンが見つかりませんでした。範囲を調整してください。');
    return;
  }

  showSuggestionMessage(`候補が ${suggestions.length} 件見つかりました。`);
  updateSuggestionSummary({ targetGearRatio, bestSuggestion: suggestions[0], motorRpm });
  renderSuggestionList({ targetGearRatio, suggestions, motorRpm });
};
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
const optimizeButton = document.querySelector('#optimize-gear');
const spurRangeMinInput = document.querySelector('#spur-range-min');
const spurRangeMaxInput = document.querySelector('#spur-range-max');
const pinionRangeMinInput = document.querySelector('#pinion-range-min');
const pinionRangeMaxInput = document.querySelector('#pinion-range-max');
const searchModeSelect = document.querySelector('#search-mode');
const searchModeError = document.querySelector('[data-error="search-mode"]');

const suggestionOutputs = {
  targetGearRatio: document.querySelector('[data-output="target-gear-ratio"]'),
  bestGearRatio: document.querySelector('[data-output="best-gear-ratio"]'),
  suggestedTireRpm: document.querySelector('[data-output="suggested-tire-rpm"]'),
  message: document.querySelector('[data-output="gear-suggestion-message"]'),
  list: document.querySelector('[data-list="gear-suggestions"]'),
};

const outputs = {
  spurPinion: document.querySelector('[data-output="spur-pinion"]'),
  gearRatio: document.querySelector('[data-output="gear-ratio"]'),
  motorRpm: document.querySelector('[data-output="motor-rpm"]'),
  tireRpm: document.querySelector('[data-output="tire-rpm"]'),
};

const REQUIRED_INPUTS = [spurInput, pinionInput, finalRatioInput];

const DEFAULT_SPUR_RANGE = { min:80, max: 116 };
const DEFAULT_PINION_RANGE = { min: 30, max: 50 };
const MAX_SUGGESTIONS = 5;
const DEFAULT_SPUR_SPREAD = 10;
const DEFAULT_PINION_SPREAD = 6;
const DEFAULT_SUGGESTION_MESSAGE = 'モーター回転数とタイヤ回転数を入力し「ギア比を検索」を押してください。';

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

const normalizeNumber = (value, { min, max } = {}) => {
  if (value == null || Number.isNaN(value)) {
    return null;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  if (min != null && numeric < min) {
    return min;
  }
  if (max != null && numeric > max) {
    return max;
  }
  return numeric;
};

const setRangeInputValue = (input, value) => {
  if (!input) {
    return;
  }
  if (value == null || !Number.isFinite(Number(value))) {
    input.value = '';
    return;
  }
  const normalized = Math.max(1, Math.round(Number(value)));
  input.value = String(normalized);
};

const toggleRangeInputDisabled = (input, disabled) => {
  if (!input) {
    return;
  }
  input.disabled = Boolean(disabled);
  if (disabled) {
    input.setAttribute('aria-disabled', 'true');
  } else {
    input.removeAttribute('aria-disabled');
  }
};

const syncRangeInputsForMode = () => {
  const mode = searchModeSelect?.value ?? 'free';
  const spurValue = readInputNumber(spurInput);
  const pinionValue = readInputNumber(pinionInput);

  const ensureSpurDefaults = () => {
    if (!spurRangeMinInput?.value) {
      setRangeInputValue(spurRangeMinInput, DEFAULT_SPUR_RANGE.min);
    }
    if (!spurRangeMaxInput?.value) {
      setRangeInputValue(spurRangeMaxInput, DEFAULT_SPUR_RANGE.max);
    }
  };

  const ensurePinionDefaults = () => {
    if (!pinionRangeMinInput?.value) {
      setRangeInputValue(pinionRangeMinInput, DEFAULT_PINION_RANGE.min);
    }
    if (!pinionRangeMaxInput?.value) {
      setRangeInputValue(pinionRangeMaxInput, DEFAULT_PINION_RANGE.max);
    }
  };

  const disableSpurRange = (disabled) => {
    toggleRangeInputDisabled(spurRangeMinInput, disabled);
    toggleRangeInputDisabled(spurRangeMaxInput, disabled);
  };

  const disablePinionRange = (disabled) => {
    toggleRangeInputDisabled(pinionRangeMinInput, disabled);
    toggleRangeInputDisabled(pinionRangeMaxInput, disabled);
  };

  switch (mode) {
    case 'lock-spur':
      disableSpurRange(true);
      if (spurValue != null && Number.isFinite(spurValue)) {
        setRangeInputValue(spurRangeMinInput, spurValue);
        setRangeInputValue(spurRangeMaxInput, spurValue);
      }
      disablePinionRange(false);
      ensurePinionDefaults();
      break;
    case 'lock-pinion':
      disablePinionRange(true);
      if (pinionValue != null && Number.isFinite(pinionValue)) {
        setRangeInputValue(pinionRangeMinInput, pinionValue);
        setRangeInputValue(pinionRangeMaxInput, pinionValue);
      }
      disableSpurRange(false);
      ensureSpurDefaults();
      break;
    default:
      disableSpurRange(false);
      disablePinionRange(false);
      ensureSpurDefaults();
      ensurePinionDefaults();
      break;
  }
};

const validateLockModeInputs = ({ mode, spur, pinion }) => {
  if (mode === 'lock-spur') {
    if (spur == null || !Number.isFinite(spur) || spur <= 0) {
      return 'スパー固定モードでは、スパーギア歯数を入力してください。';
    }
  }

  if (mode === 'lock-pinion') {
    if (pinion == null || !Number.isFinite(pinion) || pinion <= 0) {
      return 'ピニオン固定モードでは、ピニオンギア歯数を入力してください。';
    }
  }

  return null;
};

const resetOutputs = () => {
  Object.values(outputs).forEach((output) => {
    if (output) {
      output.textContent = '--';
    }
  });
};

const setErrorMessage = ({ element, message }) => {
  if (!element) {
    return;
  }

  if (message) {
    element.textContent = message;
    element.hidden = false;
    element.setAttribute('aria-live', 'assertive');
  } else {
    element.textContent = '';
    element.hidden = true;
    element.removeAttribute('aria-live');
  }
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

const calculateTargetGearRatio = ({ motorRpm, tireRpm }) => {
  if (motorRpm == null || tireRpm == null) {
    return null;
  }

  const motor = Number(motorRpm);
  const tire = Number(tireRpm);

  if (!Number.isFinite(motor) || !Number.isFinite(tire) || tire === 0) {
    return null;
  }

  const ratio = motor / tire;
  return ratio > 0 ? ratio : null;
};

const calculateResultingTireRpm = ({ motorRpm, gearRatio }) => {
  if (motorRpm == null || gearRatio == null || gearRatio <= 0) {
    return null;
  }
  return motorRpm / gearRatio;
};

const enumerateGearCombinations = ({
  targetGearRatio,
  finalRatio,
  spurRange = DEFAULT_SPUR_RANGE,
  pinionRange = DEFAULT_PINION_RANGE,
  maxResults = MAX_SUGGESTIONS,
}) => {
  if (!Number.isFinite(targetGearRatio) || !Number.isFinite(finalRatio) || finalRatio <= 0) {
    return [];
  }

  const results = [];
  const spurMin = Math.max(1, Math.floor(spurRange.min ?? DEFAULT_SPUR_RANGE.min));
  const spurMax = Math.max(spurMin, Math.ceil(spurRange.max ?? DEFAULT_SPUR_RANGE.max));
  const pinionMin = Math.max(1, Math.floor(pinionRange.min ?? DEFAULT_PINION_RANGE.min));
  const pinionMax = Math.max(pinionMin, Math.ceil(pinionRange.max ?? DEFAULT_PINION_RANGE.max));

  for (let spur = spurMin; spur <= spurMax; spur += 1) {
    for (let pinion = pinionMin; pinion <= pinionMax; pinion += 1) {
      const ratio = (spur / pinion) * finalRatio;
      const diff = Math.abs(ratio - targetGearRatio);
      results.push({ spur, pinion, ratio, diff });
    }
  }

  results.sort((a, b) => a.diff - b.diff);

  return results.slice(0, maxResults);
};

const clearSuggestions = () => {
  if (suggestionOutputs.targetGearRatio) {
    suggestionOutputs.targetGearRatio.textContent = '--';
  }
  if (suggestionOutputs.bestGearRatio) {
    suggestionOutputs.bestGearRatio.textContent = '--';
  }
  if (suggestionOutputs.suggestedTireRpm) {
    suggestionOutputs.suggestedTireRpm.textContent = '--';
  }
  if (suggestionOutputs.message) {
    suggestionOutputs.message.textContent = DEFAULT_SUGGESTION_MESSAGE;
  }
  if (suggestionOutputs.list) {
    suggestionOutputs.list.innerHTML = '';
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

  optimizeButton?.addEventListener('click', () => {
    searchGearSuggestions();
  });

  searchModeSelect?.addEventListener('change', () => {
    syncRangeInputsForMode();
    setErrorMessage({ element: searchModeError, message: null });
  });

  spurInput?.addEventListener('input', () => {
    syncRangeInputsForMode();
    setErrorMessage({ element: searchModeError, message: null });
  });

  pinionInput?.addEventListener('input', () => {
    syncRangeInputsForMode();
    setErrorMessage({ element: searchModeError, message: null });
  });
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

  initializeRangeDefaults();

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
  clearSuggestions();
  syncRangeInputsForMode();
  setErrorMessage({ element: searchModeError, message: null });
};

init();

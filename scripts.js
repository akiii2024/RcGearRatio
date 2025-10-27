(() => {
  const form = document.querySelector('#ratio-form');
  const spurInput = document.querySelector('#spur-teeth');
  const pinionInput = document.querySelector('#pinion-teeth');
  const internalInput = document.querySelector('#internal-ratio');
  const tireInput = document.querySelector('#tire-diameter');

  const spurPinionOutput = document.querySelector('#spur-pinion-ratio');
  const finalRatioOutput = document.querySelector('#final-ratio');
  const rolloutOutput = document.querySelector('#rollout');

  const outputs = [spurPinionOutput, finalRatioOutput, rolloutOutput];

  const numberFormatter = new Intl.NumberFormat('ja-JP', {
    maximumFractionDigits: 3,
  });

  const ratioFormatter = new Intl.NumberFormat('ja-JP', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  });

  const rolloutFormatter = new Intl.NumberFormat('ja-JP', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });

  function resetOutputs() {
    outputs.forEach((output) => {
      if (output.dataset.default) {
        output.textContent = output.dataset.default;
      }
    });
  }

  function toNumber(input) {
    const value = Number(input.value);
    return Number.isFinite(value) ? value : NaN;
  }

  function handleSubmit(event) {
    event.preventDefault();

    const spur = toNumber(spurInput);
    const pinion = toNumber(pinionInput);
    const internal = internalInput.value.trim() === '' ? 1 : toNumber(internalInput);
    const tireDiameter = tireInput.value.trim() === '' ? null : toNumber(tireInput);

    if (!spur || !pinion) {
      resetOutputs();
      return;
    }

    const spurPinionRatio = spur / pinion;
    const finalRatio = spurPinionRatio * (internal || 1);
    const rollout = tireDiameter ? (Math.PI * tireDiameter) / finalRatio : null;

    spurPinionOutput.textContent = ratioFormatter.format(spurPinionRatio);
    finalRatioOutput.textContent = ratioFormatter.format(finalRatio);
    rolloutOutput.textContent = rollout ? `${rolloutFormatter.format(rollout)} mm` : '--';
  }

  function handleReset() {
    resetOutputs();
  }

  function init() {
    if (!form) {
      return;
    }

    resetOutputs();
    form.addEventListener('submit', handleSubmit);
    form.addEventListener('reset', handleReset);

    const yearEl = document.querySelector('#copyright-year');
    if (yearEl) {
      yearEl.textContent = `${new Date().getFullYear()}`;
    }
  }

  init();
})();


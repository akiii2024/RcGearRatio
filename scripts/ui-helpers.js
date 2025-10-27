import { MachineStore } from './machine-store.js';
import { MotorStore } from './motor-store.js';

const FRACTION_DIGITS = 3;

const numberFormatter = new Intl.NumberFormat('ja-JP', {
  minimumFractionDigits: FRACTION_DIGITS,
  maximumFractionDigits: FRACTION_DIGITS,
});

const FRACTION_DIGITS_MOTOR = 0;

const motorNumberFormatter = new Intl.NumberFormat('ja-JP', {
  minimumFractionDigits: FRACTION_DIGITS_MOTOR,
  maximumFractionDigits: FRACTION_DIGITS_MOTOR,
});

export const initMachineUI = ({
  selectElement,
  managerContainer,
  onSelect,
}) => {
  const store = new MachineStore();
  const form = document.createElement('form');
  form.className = 'machine-form field-group';
  form.innerHTML = `
    <label for="machine-name">マシン追加</label>
    <input id="machine-name" name="machineName" type="text" placeholder="例: TA08" required />
    <label for="machine-final-ratio">最終減速比</label>
    <input id="machine-final-ratio" name="finalRatio" type="number" inputmode="decimal" min="0" step="0.001" placeholder="1.85" required />
    <button type="submit" class="primary">追加</button>
  `;

  const list = document.createElement('div');
  list.className = 'machine-list';

  managerContainer.append(form, list);

  const renderSelect = (machines) => {
    if (!selectElement) {
      return;
    }

    const currentValue = selectElement.value;
    const placeholderTemplate = selectElement.querySelector('[data-placeholder]');
    const placeholder = placeholderTemplate ? placeholderTemplate.cloneNode(true) : null;
    const fragment = document.createDocumentFragment();

    if (placeholder) {
      placeholder.hidden = false;
      if (selectElement.required) {
        placeholder.disabled = true;
      }
      placeholder.selected = false;
      fragment.appendChild(placeholder);
    }

    machines.forEach((machine) => {
      const option = document.createElement('option');
      option.value = machine.id;
      option.textContent = `${machine.name} (×${numberFormatter.format(machine.finalRatio)})`;
      fragment.append(option);
    });

    selectElement.innerHTML = '';
    selectElement.append(fragment);

    const selectByValue = (value) => {
      selectElement.value = value;
      const selectedMachine = store.getMachineById(value);
      if (selectedMachine) {
        onSelect?.(selectedMachine);
      }
    };

    if (currentValue && selectElement.querySelector(`option[value="${currentValue}"]`)) {
      selectByValue(currentValue);
      return;
    }

    if (machines.length > 0) {
      if (selectElement.required) {
        selectByValue(machines[0].id);
      } else if (placeholder) {
        placeholder.selected = true;
        selectElement.value = placeholder.value ?? '';
      }
      return;
    }

    if (placeholder) {
      placeholder.selected = true;
      selectElement.value = placeholder.value ?? '';
    }
  };

  const renderList = (machines) => {
    list.innerHTML = '';
    machines.forEach((machine) => {
      const item = document.createElement('div');
      item.className = 'machine-item';
      item.innerHTML = `
        <div>
          <strong>${machine.name}</strong>
          <div>最終減速比: ×${numberFormatter.format(machine.finalRatio)}</div>
        </div>
      `;

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'secondary';
      removeBtn.textContent = '削除';
      removeBtn.addEventListener('click', () => {
        if (!confirm(`${machine.name} を削除しますか？`)) {
          return;
        }
        store.removeMachine(machine.id);
      });

      item.append(removeBtn);
      list.append(item);
    });
  };

  const unsubscribe = store.subscribe((machines) => {
    renderSelect(machines);
    renderList(machines);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const name = formData.get('machineName');
    const finalRatio = formData.get('finalRatio');
    const success = store.addMachine({ name: String(name ?? ''), finalRatio: Number(finalRatio) });
    if (success) {
      form.reset();
      selectElement?.focus();
    }
  });

  if (selectElement) {
    selectElement.addEventListener('change', () => {
      if (!selectElement.value) {
        return;
      }
      const selected = store.getMachineById(selectElement.value);
      if (selected) {
        onSelect?.(selected);
      }
    });
  }

  return () => {
    unsubscribe();
  };
};

export const initMotorUI = ({
  selectElement,
  managerContainer,
  onSelect,
}) => {
  const store = new MotorStore();
  const form = document.createElement('form');
  form.className = 'motor-form field-group';
  form.innerHTML = `
    <label for="motor-name">モーター追加</label>
    <input id="motor-name" name="motorName" type="text" placeholder="例: 13.5T" required />
    <label for="motor-rpm-preset">モーター回転数 (rpm)</label>
    <input id="motor-rpm-preset" name="motorRpm" type="number" inputmode="numeric" min="0" step="1" placeholder="30000" required />
    <button type="submit" class="primary">追加</button>
  `;

  const list = document.createElement('div');
  list.className = 'motor-list';

  managerContainer.append(form, list);

  const renderSelect = (motors) => {
    if (!selectElement) {
      return;
    }

    const currentValue = selectElement.value;
    const placeholderTemplate = selectElement.querySelector('[data-placeholder]');
    const placeholder = placeholderTemplate ? placeholderTemplate.cloneNode(true) : null;
    const fragment = document.createDocumentFragment();

    if (placeholder) {
      placeholder.hidden = false;
      if (selectElement.required) {
        placeholder.disabled = true;
      }
      placeholder.selected = false;
      fragment.appendChild(placeholder);
    }

    motors.forEach((motor) => {
      const option = document.createElement('option');
      option.value = motor.id;
      option.textContent = `${motor.name} (${motorNumberFormatter.format(motor.rpm)} rpm)`;
      fragment.append(option);
    });

    selectElement.innerHTML = '';
    selectElement.append(fragment);

    const selectByValue = (value) => {
      selectElement.value = value;
      const selectedMotor = store.getMotorById(value);
      if (selectedMotor) {
        onSelect?.(selectedMotor);
      }
    };

    if (currentValue && selectElement.querySelector(`option[value="${currentValue}"]`)) {
      selectByValue(currentValue);
      return;
    }

    if (motors.length > 0) {
      if (selectElement.required) {
        selectByValue(motors[0].id);
      } else if (placeholder) {
        placeholder.selected = true;
        selectElement.value = placeholder.value ?? '';
      }
      return;
    }

    if (placeholder) {
      placeholder.selected = true;
      selectElement.value = placeholder.value ?? '';
    }
  };

  const renderList = (motors) => {
    list.innerHTML = '';
    motors.forEach((motor) => {
      const item = document.createElement('div');
      item.className = 'motor-item';
      item.innerHTML = `
        <div>
          <strong>${motor.name}</strong>
          <div>モーター回転数: ${motorNumberFormatter.format(motor.rpm)} rpm</div>
        </div>
      `;

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'secondary';
      removeBtn.textContent = '削除';
      removeBtn.addEventListener('click', () => {
        if (!confirm(`${motor.name} を削除しますか？`)) {
          return;
        }
        store.removeMotor(motor.id);
      });

      item.append(removeBtn);
      list.append(item);
    });
  };

  const unsubscribe = store.subscribe((motors) => {
    renderSelect(motors);
    renderList(motors);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const name = formData.get('motorName');
    const rpm = formData.get('motorRpm');
    const success = store.addMotor({ name: String(name ?? ''), rpm: Number(rpm) });
    if (success) {
      form.reset();
      selectElement?.focus();
    }
  });

  if (selectElement) {
    selectElement.addEventListener('change', () => {
      if (!selectElement.value) {
        return;
      }
      const selected = store.getMotorById(selectElement.value);
      if (selected) {
        onSelect?.(selected);
      }
    });
  }

  return {
    store,
    cleanup: () => {
      unsubscribe();
    },
  };
};

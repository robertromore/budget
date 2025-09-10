/**
 * Shared hook for editable cell components
 * Provides consistent edit state management, validation, and submission patterns
 */

interface UseEditableCellOptions<T> {
  initialValue: T;
  onSave: (value: T) => Promise<void> | void;
  onCancel?: () => void;
  validator?: (value: T) => boolean;
  formatter?: (value: T) => string;
}

interface UseEditableCellReturn<T> {
  isEditing: boolean;
  currentValue: T;
  displayValue: string;
  hasChanges: boolean;
  isValid: boolean;
  startEdit: () => void;
  cancelEdit: () => void;
  saveEdit: () => Promise<void>;
  updateValue: (value: T) => void;
}

export function useEditableCell<T>(options: UseEditableCellOptions<T>): UseEditableCellReturn<T> {
  const {
    initialValue,
    onSave,
    onCancel,
    validator = () => true,
    formatter = (value: T) => String(value),
  } = options;

  let isEditing = $state(false);
  let currentValue = $state<T>(initialValue);
  let originalValue = $state<T>(initialValue);

  // Derived state
  const displayValue = $derived(formatter(currentValue));
  const hasChanges = $derived(currentValue !== originalValue);
  const isValid = $derived(validator(currentValue));

  // Actions
  function startEdit() {
    isEditing = true;
    originalValue = currentValue;
  }

  function cancelEdit() {
    currentValue = originalValue;
    isEditing = false;
    if (onCancel) {
      onCancel();
    }
  }

  async function saveEdit() {
    if (!isValid) return;

    try {
      await onSave(currentValue);
      originalValue = currentValue;
      isEditing = false;
    } catch (error) {
      // Reset to original value on error
      currentValue = originalValue;
      throw error;
    }
  }

  function updateValue(value: T) {
    currentValue = value;
  }

  // Update when initial value changes (for external updates)
  $effect(() => {
    if (!hasChanges && !isEditing) {
      currentValue = initialValue;
      originalValue = initialValue;
    }
  });

  return {
    get isEditing() {
      return isEditing;
    },
    get currentValue() {
      return currentValue;
    },
    get displayValue() {
      return displayValue;
    },
    get hasChanges() {
      return hasChanges;
    },
    get isValid() {
      return isValid;
    },
    startEdit,
    cancelEdit,
    saveEdit,
    updateValue,
  };
}

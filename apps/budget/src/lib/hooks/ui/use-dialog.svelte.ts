/**
 * Shared hook for dialog state management
 * Provides consistent open/close patterns with validation and cleanup
 */

interface UseDialogOptions {
  initialOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  onCancel?: () => void;
  preventCloseWhenDirty?: boolean;
}

interface UseDialogReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  cancel: () => void;
  toggle: () => void;
  setDirty: (dirty: boolean) => void;
  isDirty: boolean;
}

export function useDialog(options: UseDialogOptions = {}): UseDialogReturn {
  const {
    initialOpen = false,
    onOpen,
    onClose,
    onCancel,
    preventCloseWhenDirty = false
  } = options;

  let isOpen = $state(initialOpen);
  let isDirty = $state(false);

  function open() {
    isOpen = true;
    isDirty = false;
    if (onOpen) {
      onOpen();
    }
  }

  function close() {
    if (preventCloseWhenDirty && isDirty) {
      // Could emit a warning or show confirmation dialog
      return;
    }
    
    isOpen = false;
    isDirty = false;
    if (onClose) {
      onClose();
    }
  }

  function cancel() {
    isOpen = false;
    isDirty = false;
    if (onCancel) {
      onCancel();
    }
  }

  function toggle() {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }

  function setDirty(dirty: boolean) {
    isDirty = dirty;
  }

  return {
    get isOpen() { return isOpen; },
    get isDirty() { return isDirty; },
    open,
    close,
    cancel,
    toggle,
    setDirty
  };
}
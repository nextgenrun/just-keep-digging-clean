import { SAVE_TRANSFER_UI } from "../../values/uiLayout.js?rev=20260727-save-transfer-v1";

export function createManualSaveFilePicker(options = {}) {
  const documentRef = options.documentRef || globalThis.document;
  if (!documentRef?.createElement || !documentRef?.body) {
    return {
      open() {
        return false;
      },
      destroy() {},
    };
  }

  const input = documentRef.createElement("input");
  input.type = "file";
  input.accept = options.accept || SAVE_TRANSFER_UI.fileAccept;
  input.style.display = "none";
  documentRef.body.appendChild(input);

  let destroyed = false;
  let selecting = false;

  const handleChange = async event => {
    const file = event?.target?.files?.[0] || null;
    input.value = "";
    if (!file || destroyed || selecting) return;
    selecting = true;
    try {
      await options.onSelect?.(file);
    } finally {
      selecting = false;
    }
  };

  input.addEventListener("change", handleChange);

  return {
    open() {
      if (destroyed || selecting) return false;
      input.click();
      return true;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      input.removeEventListener("change", handleChange);
      input.remove();
    },
  };
}

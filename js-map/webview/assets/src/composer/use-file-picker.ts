import type { FileDescriptor } from "protocol";
import { useIntl } from "react-intl";

import { fetchFromVSCode } from "@/vscode-api";

export function usePickFile(): () => Promise<FileDescriptor | null> {
  const intl = useIntl();

  return async () => {
    const response = await fetchFromVSCode("pick-file", {
      params: {
        pickerTitle: intl.formatMessage({
          id: "composer.filePicker.selectFile",
          defaultMessage: "Select a file",
          description: "Title for the single-file picker dialog",
        }),
      },
    });
    return response.file ?? null;
  };
}

export function usePickFiles(): () => Promise<Array<FileDescriptor>> {
  const intl = useIntl();

  return async () => {
    const response = await fetchFromVSCode("pick-files", {
      params: {
        pickerTitle: intl.formatMessage({
          id: "composer.filePicker.selectFiles",
          defaultMessage: "Select files",
          description: "Title for the multi-file picker dialog",
        }),
      },
    });
    return response.files ?? [];
  };
}

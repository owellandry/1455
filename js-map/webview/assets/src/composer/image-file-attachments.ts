import type * as AppServer from "app-server-types";
import type { FileDescriptor } from "protocol";

import { getPathBasename, normalizeFsPath, normalizePath } from "@/utils/path";

import type { ComposerImageAttachment } from "./composer-view-state";
import { dedupeFileDescriptors } from "./dedupe-file-descriptors";

export function buildImageFileAttachments(
  imageAttachments: Array<ComposerImageAttachment>,
): Array<FileDescriptor> {
  return dedupeFileDescriptors(
    imageAttachments.flatMap((imageAttachment) => {
      if (imageAttachment.localPath == null) {
        return [];
      }
      const fullPath = normalizePath(imageAttachment.localPath);
      return [
        {
          label:
            imageAttachment.filename ??
            getPathBasename(fullPath) ??
            imageAttachment.localPath,
          path: fullPath,
          fsPath: fullPath,
        },
      ];
    }),
  );
}

export function filterNonImageFileAttachments({
  attachments,
  input,
}: {
  attachments: Array<FileDescriptor>;
  input: Array<AppServer.v2.UserInput>;
}): Array<FileDescriptor> {
  const localImagePaths = new Set(
    input
      .filter(
        (
          item,
        ): item is Extract<AppServer.v2.UserInput, { type: "localImage" }> =>
          item.type === "localImage",
      )
      .map((item) => normalizeFsPath(item.path)),
  );

  if (localImagePaths.size === 0) {
    return attachments;
  }

  return attachments.filter((attachment) => {
    return !localImagePaths.has(normalizeFsPath(attachment.fsPath));
  });
}

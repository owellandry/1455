import type { FileDescriptor, GitCwd } from "protocol";
import { useEffect, useState } from "react";
import { useIntl } from "react-intl";

import { ImagePreviewDialog } from "@/components/image-preview-dialog";
import { Spinner } from "@/components/spinner";
import { FileAttachment } from "@/composer/attachments/file-attachment";
import {
  getAbsoluteImageFilePath,
  readImageFileAsDataUrl,
} from "@/plugins/read-image-file-as-data-url";
import { stripLineInfoFromLabel as stripLineInfoFromLabelUtil } from "@/utils/strip-line-info-from-label";
import { useMutationFromVSCode } from "@/vscode-api";

export function LocalUserImageThumb({
  src,
}: {
  src: string;
}): React.ReactElement {
  const intl = useIntl();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(() => {
    return getAbsoluteImageFilePath(src) == null ? src : null;
  });
  const altLabel = intl.formatMessage({
    id: "codex.localConversation.userImageAttachment",
    defaultMessage: "User attachment",
    description: "Alt text for user image attachment in local conversation",
  });
  const closePreviewLabel = intl.formatMessage({
    id: "codex.localConversation.closeImagePreview",
    defaultMessage: "Close image preview",
    description:
      "Aria label for closing the image preview dialog in local conversation",
  });

  useEffect(() => {
    const absoluteImageFilePath = getAbsoluteImageFilePath(src);
    if (absoluteImageFilePath == null) {
      setPreviewSrc(src);
      return;
    }

    let cancelled = false;
    setPreviewSrc(null);
    void readImageFileAsDataUrl(absoluteImageFilePath).then((dataUrl) => {
      if (cancelled) {
        return;
      }
      setPreviewSrc(dataUrl);
    });

    return (): void => {
      cancelled = true;
    };
  }, [src]);

  if (previewSrc == null) {
    return (
      <div className="flex size-16 items-center justify-center rounded-lg border border-token-border">
        <Spinner className="icon-xs" />
      </div>
    );
  }

  return (
    <ImagePreviewDialog
      src={previewSrc}
      alt={altLabel}
      open={isPreviewOpen}
      onOpenChange={setIsPreviewOpen}
      closeAriaLabel={closePreviewLabel}
      contentMaxWidthClassName="max-w-[min(90vw,calc(var(--thread-content-max-width)+16rem))]"
      imageReferrerPolicy="no-referrer"
      triggerContent={
        <div
          className="size-16 cursor-pointer rounded-lg border border-token-border focus:outline-none focus-visible:ring-1 focus-visible:ring-token-focus-border"
          role="button"
          tabIndex={0}
          aria-label={altLabel}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setIsPreviewOpen(true);
            }
          }}
        >
          <img
            src={previewSrc}
            className="h-full w-full rounded-md object-cover"
            referrerPolicy="no-referrer"
            alt={altLabel}
          />
        </div>
      }
    />
  );
}

export function UserMessageFileAttachment({
  attachment,
  cwd,
}: {
  attachment: FileDescriptor;
  cwd: GitCwd | null;
}): React.ReactElement {
  const openFile = useMutationFromVSCode("open-file");
  const lineInfo = formatFileLineInfo(attachment);
  const handleOpenAttachment = (): void => {
    const path = attachment.fsPath || attachment.path;
    if (!path) {
      return;
    }
    const line = attachment.startLine;
    openFile.mutate({
      path,
      line,
      column: line == null ? undefined : 1,
      cwd,
    });
  };
  return (
    <FileAttachment
      filename={stripLineInfoFromLabelUtil(attachment.label, lineInfo)}
      lineInfo={lineInfo}
      onClick={handleOpenAttachment}
    />
  );
}

function formatFileLineInfo(file: FileDescriptor): string | undefined {
  if (file.startLine == null) {
    return undefined;
  }
  if (file.endLine != null && file.endLine !== file.startLine) {
    return `${file.startLine}-${file.endLine}`;
  }
  return `${file.startLine}`;
}

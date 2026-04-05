import type { GitCwd } from "protocol";
import type React from "react";

import {
  getConversationIdFromAgentMentionPath,
  getMentionLabelText,
  getPromptLinkKind,
  getRoleNameFromConfiguredAgentMentionPath,
} from "@/composer/mention-item";
import { normalizeFsPath } from "@/utils/path";

import {
  type ParsedFileReference,
  formatFileReferenceDisplayLabel,
  formatFileReferenceLabel,
  isAbsoluteFilesystemReference,
  isFileReference,
  parseFileReference,
} from "./file-reference";
import {
  AgentChip,
  AppChip,
  FileLink,
  PluginChip,
  SkillChip,
} from "./mention-chips";

export function renderPromptLink({
  className,
  cwd,
  elementKey,
  href,
  label,
}: {
  className?: string;
  cwd: GitCwd | null;
  elementKey?: string;
  href: string;
  label: string;
}): React.ReactElement | null {
  const trimmedLabel = label.trim();
  const promptLinkKind = getPromptLinkKind({
    href,
    label: trimmedLabel,
  });

  switch (promptLinkKind) {
    case "app":
      return (
        <AppChip
          key={elementKey}
          label={getMentionLabelText(trimmedLabel)}
          href={href}
          tooltipText={href}
        />
      );
    case "plugin":
      return (
        <PluginChip
          key={elementKey}
          label={getMentionLabelText(trimmedLabel)}
          href={href}
          tooltipText={href}
        />
      );
    case "agent": {
      const conversationId = getConversationIdFromAgentMentionPath(href);
      const roleName = getRoleNameFromConfiguredAgentMentionPath(href);
      if (conversationId == null && roleName == null) {
        return null;
      }
      return (
        <AgentChip
          key={elementKey}
          conversationId={conversationId ?? undefined}
          label={getMentionLabelText(trimmedLabel)}
          tooltipText={href}
        />
      );
    }
    case "skill": {
      const rawLabel =
        getMentionLabelText(trimmedLabel) ||
        href.split("/").slice(-2, -1)[0]?.replace(/-/g, " ") ||
        href;
      return (
        <SkillChip
          key={elementKey}
          label={getMentionLabelText(rawLabel)}
          href={href}
          tooltipText={href}
        />
      );
    }
    case "text":
      break;
  }

  if (isFileReference(href) || isAbsoluteFilesystemReference(href)) {
    const parsedReference = parseFileReference(href);
    const formattedLabel = formatFileReferenceLabel(parsedReference);
    const displayLabel = formatFileReferenceDisplayLabel(parsedReference);
    const resolvedLabel = getFileLinkDisplayLabel({
      trimmedChildText: trimmedLabel,
      href,
      parsedReference,
      displayLabel,
      formattedLabel,
    });
    return (
      <FileLink
        key={elementKey}
        className={className}
        reference={parsedReference}
        label={resolvedLabel}
        tooltipText={formattedLabel}
        cwd={cwd}
      />
    );
  }

  return null;
}

export function parseMentionLabel(rawLabel: string): string {
  return getMentionLabelText(rawLabel);
}

function getFileLinkDisplayLabel({
  trimmedChildText,
  href,
  parsedReference,
  displayLabel,
  formattedLabel,
}: {
  trimmedChildText: string;
  href: string;
  parsedReference: ParsedFileReference;
  displayLabel: string;
  formattedLabel: string;
}): string {
  const useReferenceLabel =
    trimmedChildText.length === 0 ||
    trimmedChildText === href ||
    trimmedChildText === formattedLabel;
  if (useReferenceLabel) {
    return displayLabel;
  }
  return maybeNormalizeFileLinkLabel(
    trimmedChildText,
    parsedReference,
    formattedLabel,
  );
}

function maybeNormalizeFileLinkLabel(
  label: string,
  hrefReference: ParsedFileReference,
  formattedHrefLabel: string,
): string {
  if (!hasFileReferenceLocation(hrefReference)) {
    return label;
  }
  const locationSuffix = formattedHrefLabel.slice(hrefReference.path.length);
  if (locationSuffix.length === 0) {
    return label;
  }
  if (isFileReference(label)) {
    const parsedLabelReference = parseFileReference(label);
    if (isMatchingFileTarget(parsedLabelReference.path, hrefReference.path)) {
      return `${parsedLabelReference.path}${locationSuffix}`;
    }
  }
  if (label.endsWith(locationSuffix)) {
    return label;
  }
  return `${label}${locationSuffix}`;
}

function hasFileReferenceLocation(reference: ParsedFileReference): boolean {
  return (
    reference.line !== undefined ||
    reference.column !== undefined ||
    reference.endLine !== undefined ||
    reference.endColumn !== undefined
  );
}

function isMatchingFileTarget(leftPath: string, rightPath: string): boolean {
  const normalizedLeft = normalizeFsPath(leftPath).replace(/\/+$/, "");
  const normalizedRight = normalizeFsPath(rightPath).replace(/\/+$/, "");
  if (normalizedLeft === normalizedRight) {
    return true;
  }
  if (
    normalizedLeft.length > 0 &&
    normalizedRight.endsWith(`/${normalizedLeft}`)
  ) {
    return true;
  }
  if (
    normalizedRight.length > 0 &&
    normalizedLeft.endsWith(`/${normalizedRight}`)
  ) {
    return true;
  }
  const leftBasename = normalizedLeft.split("/").pop();
  const rightBasename = normalizedRight.split("/").pop();
  if (!leftBasename || !rightBasename) {
    return false;
  }
  if (leftBasename !== rightBasename) {
    return false;
  }
  return normalizedLeft === leftBasename || normalizedRight === rightBasename;
}

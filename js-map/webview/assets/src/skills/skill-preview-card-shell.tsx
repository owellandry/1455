import clsx from "clsx";
import type { ReactElement, ReactNode } from "react";
import { useRef, useState } from "react";

import { CardTile } from "@/components/card-tile";
import { SkillPreviewModal } from "@/skills/skill-preview-modal";

export function SkillPreviewCardShell({
  cardIcon,
  cardIconContainer = true,
  cardTitle,
  cardDescription,
  cardBadges,
  cardActions,
  cardClassName,
  cardContentClassName,
  modalTitle,
  modalTitleText,
  modalTitleClassName,
  modalDescription,
  modalBody,
  modalFooter,
}: {
  cardIcon: ReactElement;
  cardIconContainer?: boolean;
  cardTitle: ReactNode;
  cardDescription: string;
  cardBadges?: Array<ReactNode>;
  cardActions?:
    | ReactNode
    | ((params: {
        ignoreNextPreview: () => void;
        openPreview: () => void;
      }) => ReactNode);
  cardClassName?: string;
  cardContentClassName?: string;
  modalTitle: ReactNode;
  modalTitleText?: string;
  modalTitleClassName?: string;
  modalDescription: string;
  modalBody: ReactNode | ((params: { isOpen: boolean }) => ReactNode);
  modalFooter?:
    | ReactNode
    | ((params: { closePreview: () => void }) => ReactNode);
}): ReactElement {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const shouldIgnoreNextPreviewRef = useRef(false);
  const openPreview = (): void => {
    if (shouldIgnoreNextPreviewRef.current) {
      shouldIgnoreNextPreviewRef.current = false;
      return;
    }
    setIsDialogOpen(true);
  };
  const ignoreNextPreview = (): void => {
    shouldIgnoreNextPreviewRef.current = true;
  };
  const closePreview = (): void => {
    setIsDialogOpen(false);
  };

  return (
    <>
      <CardTile
        className={clsx("!cursor-pointer", cardClassName)}
        contentClassName={cardContentClassName}
        icon={cardIcon}
        iconContainer={cardIconContainer}
        title={cardTitle}
        description={cardDescription}
        descriptionClassName="line-clamp-1"
        badges={cardBadges}
        actions={
          typeof cardActions === "function"
            ? cardActions({ ignoreNextPreview, openPreview })
            : cardActions
        }
        actionsPlacement="center"
        onClick={openPreview}
      />
      <SkillPreviewModal
        icon={cardIcon}
        title={modalTitle}
        titleText={modalTitleText}
        titleClassName={modalTitleClassName}
        description={modalDescription}
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        footer={
          typeof modalFooter === "function"
            ? modalFooter({ closePreview })
            : modalFooter
        }
      >
        {typeof modalBody === "function"
          ? modalBody({ isOpen: isDialogOpen })
          : modalBody}
      </SkillPreviewModal>
    </>
  );
}

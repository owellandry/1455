import { atom, useSetAtom } from "jotai";
import type { DependencyList, ReactElement } from "react";
import { useEffect, useEffectEvent } from "react";

type AnnouncementDefinition = {
  id: string;
  enabled: boolean;
  dismissAnnouncement: () => void;
  render: (dismissAnnouncement: () => void) => ReactElement | null;
};

type UseProvideAnnouncementInput = AnnouncementDefinition & {
  dependencies: DependencyList;
};

export const aAnnouncements = atom<Array<AnnouncementDefinition>>([]);

/**
 * Registers or updates a global announcement definition while the caller is
 * mounted. Callers control when registration reruns through `dependencies`.
 */
export function useProvideAnnouncement({
  id,
  enabled,
  dismissAnnouncement,
  render,
  dependencies,
}: UseProvideAnnouncementInput): void {
  const setAnnouncements = useSetAtom(aAnnouncements);

  const handleAnnouncementChanged = useEffectEvent(() => {
    const nextAnnouncement = {
      id,
      enabled,
      dismissAnnouncement,
      render,
    };

    setAnnouncements((prev) => {
      let alreadyExists = false;
      // Replace in place so registration order stays stable over time.
      const nextAnnouncements = [...prev].map((existingAnnouncement) => {
        if (existingAnnouncement.id === id) {
          alreadyExists = true;
          return nextAnnouncement;
        }
        return existingAnnouncement;
      });

      if (!alreadyExists) {
        nextAnnouncements.push(nextAnnouncement);
      }

      return nextAnnouncements;
    });
  });

  useEffect(() => {
    handleAnnouncementChanged();
  }, [
    id,
    enabled,
    // Callers decide which values should retrigger registration.
    // oxlint-disable-next-line react/exhaustive-deps
    ...dependencies,
  ]);

  useEffect(() => {
    return (): void => {
      // Drop this announcement when its registrar unmounts.
      setAnnouncements((prev) => {
        return prev.filter(
          (existingAnnouncement) => existingAnnouncement.id !== id,
        );
      });
    };
  }, [id, setAnnouncements]);
}

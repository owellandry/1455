import ChangesEmptyStateIcon from "@/icons/changes-empty-state.svg";

export function ReviewEmptyStateIllustration(): React.ReactElement {
  return (
    <div className="flex justify-center">
      <ChangesEmptyStateIcon
        aria-hidden
        className="h-18 w-auto text-token-input-placeholder-foreground"
      />
    </div>
  );
}

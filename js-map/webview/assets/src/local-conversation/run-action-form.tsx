import {
  useId,
  type FormEvent,
  type ReactElement,
  type ReactNode,
} from "react";

import { Button } from "@/components/button";
import {
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogSection,
  FieldStack,
} from "@/components/dialog-layout";

export function RunActionForm({
  headerIcon,
  title,
  description,
  commandLabel,
  command,
  onCommandChange,
  commandPlaceholder,
  extraFields,
  leftAction,
  submitLabel,
  submitDisabled = false,
  submitLoading = false,
  onSubmit,
}: {
  headerIcon: ReactNode;
  title: ReactNode;
  description: ReactNode;
  commandLabel: ReactNode;
  command: string;
  onCommandChange: (value: string) => void;
  commandPlaceholder?: string;
  extraFields?: ReactNode;
  leftAction?: ReactNode;
  submitLabel: ReactNode;
  submitDisabled?: boolean;
  submitLoading?: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}): ReactElement {
  const commandInputId = useId();

  return (
    <form className="flex flex-col gap-0" onSubmit={onSubmit}>
      <DialogBody className="gap-3">
        <DialogSection>
          <DialogHeader
            icon={headerIcon}
            subtitle={description}
            title={title}
          />
        </DialogSection>
        {extraFields ? (
          <DialogSection>
            <FieldStack className="gap-3">{extraFields}</FieldStack>
          </DialogSection>
        ) : null}
        <DialogSection>
          <FieldStack className="gap-2">
            <label
              className="text-xs font-medium tracking-wide text-token-text-secondary uppercase"
              htmlFor={commandInputId}
            >
              {commandLabel}
            </label>
            <textarea
              id={commandInputId}
              className="focus-visible:ring-token-focus min-h-44 w-full resize-none rounded-md border border-token-border bg-token-input-background px-2.5 py-2 font-mono text-sm text-token-text-primary outline-none placeholder:text-token-input-placeholder-foreground focus-visible:ring-2"
              placeholder={commandPlaceholder}
              value={command}
              onChange={(event) => {
                onCommandChange(event.target.value);
              }}
            />
          </FieldStack>
        </DialogSection>
        <DialogSection>
          <DialogFooter className="justify-between">
            {leftAction}
            <Button
              color="primary"
              disabled={submitDisabled}
              loading={submitLoading}
              type="submit"
            >
              {submitLabel}
            </Button>
          </DialogFooter>
        </DialogSection>
      </DialogBody>
    </form>
  );
}

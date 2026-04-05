import clsx from "clsx";
import type React from "react";
import { useMemo } from "react";
import { useIntl } from "react-intl";
import tw from "tailwind-styled-components";

import { Button } from "@/components/button";
import { SettingsEditRowType } from "@/constants/settings-sections";
import PlusIcon from "@/icons/plus.svg";
import TrashIcon from "@/icons/trash.svg";

type SettingsEditRowPair = { key: string; value: string };

type SettingsEditRowValue = string | Array<string> | Array<SettingsEditRowPair>;

type SettingsEditRowBaseProps<C, T> = {
  title: React.ReactNode;
  inputType: C;
  value: Extract<SettingsEditRowValue, T>;
  placeHolderValue: Extract<SettingsEditRowValue, T>;
  onEdit: (next: Extract<SettingsEditRowValue, T>) => void;
  addLabel?: React.ReactNode;
};

export function SettingsEditRow(
  props:
    | SettingsEditRowBaseProps<SettingsEditRowType.String, string>
    | SettingsEditRowBaseProps<SettingsEditRowType.Array, Array<string>>
    | SettingsEditRowBaseProps<
        SettingsEditRowType.Record,
        Array<SettingsEditRowPair>
      >,
): React.ReactElement {
  const isStringValue = props.inputType === SettingsEditRowType.String;
  const isList = props.inputType === SettingsEditRowType.Array;
  const isRecord = props.inputType === SettingsEditRowType.Record;

  const intl = useIntl();
  const headerPlaceholder = intl.formatMessage({
    id: "settings.editRow.headerPlaceholder",
    defaultMessage: "Key",
    description: "Placeholder for record key input",
  });
  const valuePlaceholder = intl.formatMessage({
    id: "settings.editRow.valuePlaceholder",
    defaultMessage: "Value",
    description: "Placeholder for record value input",
  });
  const removeEntryLabel = intl.formatMessage({
    id: "settings.editRow.removeEntry",
    defaultMessage: "Remove entry",
    description: "Label for removing an entry from a list",
  });

  let recordKeyPlaceholder = headerPlaceholder;
  let recordValuePlaceholder = valuePlaceholder;
  if (props.inputType === SettingsEditRowType.Record) {
    const [firstEntry] = props.placeHolderValue;
    recordKeyPlaceholder = firstEntry?.key ?? headerPlaceholder;
    recordValuePlaceholder = firstEntry?.value ?? valuePlaceholder;
  }

  const listEntries = useMemo((): Array<string> => {
    if (!isList) {
      return [];
    }
    if (props.value.length > 0) {
      return props.value;
    }
    return [""];
  }, [isList, props.value]);

  const recordEntries = useMemo((): Array<SettingsEditRowPair> => {
    if (!isRecord) {
      return [];
    }
    if (props.value.length > 0) {
      return props.value;
    }
    return [{ key: "", value: "" }];
  }, [isRecord, props.value]);

  if (isStringValue) {
    return (
      <div className="flex flex-col gap-2 rounded-lg bg-token-input-background px-3 py-2">
        <p className="text-base font-medium text-token-text-primary">
          {props.title}
        </p>
        <SettingsEditInput
          className="text-base"
          value={props.value}
          placeholder={
            isStringValue && typeof props.placeHolderValue === "string"
              ? props.placeHolderValue
              : undefined
          }
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            props.onEdit(event.target.value);
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-token-input-background px-3 py-2">
      <p className="text-base font-medium text-token-text-primary">
        {props.title}
      </p>
      <div className="flex flex-col gap-2">
        {isList
          ? listEntries.map((entry, index) => (
              <div key={`list-${index}`} className="flex items-center gap-2">
                {/*
                  Allow deleting the last row when it has content; keep one empty row otherwise.
                */}
                <SettingsEditInput
                  className="text-base"
                  value={entry}
                  placeholder={
                    isList && props.placeHolderValue.length > 0
                      ? (props.placeHolderValue[index] ??
                        props.placeHolderValue[0] ??
                        "")
                      : ""
                  }
                  onChange={(
                    event: React.ChangeEvent<HTMLInputElement>,
                  ): void => {
                    const next = [...listEntries];
                    next[index] = event.target.value;
                    props.onEdit(next);
                  }}
                />
                {/*
                  Disable only when this is the sole empty row.
                */}
                <Button
                  color="ghost"
                  size="icon"
                  disabled={
                    listEntries.length <= 1 && entry.trim().length === 0
                  }
                  aria-label={removeEntryLabel}
                  onClick={(): void => {
                    const next = props.value.filter(
                      (_item, itemIndex): boolean => itemIndex !== index,
                    ) as Array<string>;
                    props.onEdit(next);
                  }}
                >
                  <TrashIcon className="icon-2xs" />
                </Button>
              </div>
            ))
          : recordEntries.map((entry, index) => (
              <div
                className="grid grid-cols-[1fr_1fr_auto] items-center gap-2"
                key={`record-${index}`}
              >
                <SettingsEditInput
                  className="text-sm"
                  placeholder={recordKeyPlaceholder}
                  value={entry.key}
                  onChange={(
                    event: React.ChangeEvent<HTMLInputElement>,
                  ): void => {
                    const nextEntries = [...recordEntries];
                    const current = nextEntries[index];
                    nextEntries[index] = {
                      ...current,
                      key: event.target.value,
                    };
                    props.onEdit(nextEntries);
                  }}
                />
                <SettingsEditInput
                  className="text-sm"
                  placeholder={recordValuePlaceholder}
                  value={entry.value}
                  onChange={(
                    event: React.ChangeEvent<HTMLInputElement>,
                  ): void => {
                    const nextEntries = [...recordEntries];
                    const current = nextEntries[index];
                    nextEntries[index] = {
                      ...current,
                      value: event.target.value,
                    };
                    props.onEdit(nextEntries);
                  }}
                />
                <Button
                  color="ghost"
                  size="icon"
                  disabled={
                    recordEntries.length <= 1 &&
                    entry.key.trim().length === 0 &&
                    entry.value.trim().length === 0
                  }
                  aria-label={removeEntryLabel}
                  onClick={(): void => {
                    const next = props.value.filter(
                      (_item, itemIndex): boolean => itemIndex !== index,
                    ) as Array<SettingsEditRowPair>;
                    props.onEdit(next);
                  }}
                >
                  <TrashIcon className="icon-2xs" />
                </Button>
              </div>
            ))}
      </div>
      <Button
        color="secondary"
        size="toolbar"
        className={clsx(
          "text-token-text-secondary/90 justify-center rounded-md border border-dashed text-base",
        )}
        onClick={(): void => {
          if (isList) {
            const defaultEntry = "";
            const currentEntries = props.value;
            const next =
              currentEntries.length > 0
                ? [...currentEntries, defaultEntry]
                : [defaultEntry];
            props.onEdit(next);
            return;
          }
          const nextEntries = [
            ...recordEntries,
            {
              key: "",
              value: "",
            },
          ];
          props.onEdit(nextEntries);
        }}
      >
        <PlusIcon className="icon-2xs" />
        {props.addLabel ? props.addLabel : null}
      </Button>
    </div>
  );
}

const SettingsEditInput = tw.input`bg-token-input-background text-token-input-foreground placeholder:text-token-input-placeholder-foreground w-full rounded-md border border-token-input-border px-2.5 py-1.5 outline-none focus:border-token-focus-border`;

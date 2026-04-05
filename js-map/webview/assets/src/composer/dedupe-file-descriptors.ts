import isEqual from "lodash/isEqual";
import uniqWith from "lodash/uniqWith";
import type { FileDescriptor } from "protocol";

export function dedupeFileDescriptors(
  files: Array<FileDescriptor>,
): Array<FileDescriptor> {
  return uniqWith(files, isEqual);
}

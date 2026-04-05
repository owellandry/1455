import type * as AppServer from "app-server-types";
import type { NodeType } from "prosemirror-model";
import type { PluginKey } from "prosemirror-state";
import { TextSelection } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import type {
  ComposerEnterBehavior,
  ConversationId,
  FileDescriptor,
  LocalCustomAgentMetadata,
} from "protocol";
import { createConversationId } from "protocol";

import type { InstalledPlugin } from "@/plugins/use-plugins";
import { normalizeFsPath } from "@/utils/path";

import {
  type AgentMentionInsertItem,
  type ComposerMentionKind,
  type ComposerMentionAttrs,
  type ComposerMentionInsertItem,
  getAppMentionPath,
  getConfiguredAgentMentionInsertItem,
  getMentionAttrsFromApp,
  getMentionAttrsFromPlugin,
  getMentionAttrsFromSkill,
  getMentionInsertItemFromSkill,
  getMentionKindFromPath,
  getPluginMentionPath,
} from "../mention-item";
import { mentionUiKey } from "./at-mentions-plugin";
import {
  buildProsemirrorForComposer,
  type PromptEventEmitter,
} from "./build-prosemirror-for-composer";
import { prosemirrorToPlainText } from "./helpers";
import type { MentionUiState } from "./mentions-shared";
import { placeholderKey } from "./placeholder-plugin";
import { plainTextToDoc, promptTextToDoc } from "./prompt-text";
import { plainTextSchema } from "./schema";
import { skillMentionUiKey } from "./skill-mentions-plugin";
import { slashCommandUiKey } from "./slash-commands-plugin";

export class ProseMirrorComposerController {
  // public view: EditorView;
  // public eventEmitter: PromptEventEmitter;
  private pastedImagesHandlers = new Map<
    (files: Array<File>) => void,
    (eventData?: unknown) => void
  >();

  constructor(
    public readonly view: EditorView,
    public readonly eventEmitter: PromptEventEmitter,
    private readonly updateEnterBehavior: (
      behavior: ComposerEnterBehavior,
    ) => void,
  ) {}

  getText(): string {
    return prosemirrorToPlainText(this.view).content;
  }

  hasText(): boolean {
    return this.getText().trim() !== "";
  }

  getMentionedAgentConversationIds(): Array<ConversationId> {
    const conversationIds = new Set<ConversationId>();
    this.view.state.doc.descendants((node) => {
      if (node.type.name !== "agentMention") {
        return true;
      }

      const conversationId = node.attrs.conversationId;
      if (typeof conversationId === "string" && conversationId.length > 0) {
        conversationIds.add(createConversationId(conversationId));
      }
      return true;
    });
    return Array.from(conversationIds);
  }

  getMentionedAgentConversationIdsKey(): string {
    return this.getMentionedAgentConversationIds().join("\u0000");
  }

  isCursorAtEnd(): boolean {
    const editorElement = this.view.dom;
    if (!this.view.state.selection.empty) {
      return false;
    }

    const selection = editorElement.ownerDocument.getSelection();
    if (!selection || !selection.isCollapsed || selection.rangeCount === 0) {
      return false;
    }

    const anchorNode = selection.anchorNode;
    if (anchorNode == null || !editorElement.contains(anchorNode)) {
      return false;
    }

    const cursorPos = this.view.posAtDOM(
      anchorNode,
      selection.anchorOffset,
      -1,
    );
    const endSelection = TextSelection.atEnd(this.view.state.doc);
    return cursorPos === endSelection.from;
  }

  setText(text: string): void {
    const parsed = plainTextToDoc({ schema: this.view.state.schema, text });
    const tr = this.view.state.tr;
    tr.replaceWith(0, this.view.state.doc.content.size, parsed.content);
    tr.setSelection(TextSelection.atEnd(tr.doc));
    this.view.dispatch(tr);
  }

  appendText(text: string): void {
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      return;
    }
    const existingText = this.getText();
    const needsSpace = existingText.length > 0 && !/\s$/.test(existingText);
    const textToInsert = needsSpace ? ` ${trimmed}` : trimmed;
    const tr = this.view.state.tr;
    tr.setSelection(TextSelection.atEnd(tr.doc));
    tr.insertText(textToInsert);
    tr.setSelection(TextSelection.atEnd(tr.doc));
    this.view.dispatch(tr);
    this.view.focus();
  }

  insertTextAtSelection(text: string): void {
    if (text.length === 0) {
      return;
    }

    const { state, dispatch } = this.view;
    const { from, to } = state.selection;
    const tr = state.tr.insertText(text, from, to);
    tr.setSelection(TextSelection.create(tr.doc, from + text.length));
    dispatch(tr);
    this.view.focus();
  }

  /** Set editor content from our persisted prompt text format (chips included). */
  setPromptText(text: string): void {
    const parsed = promptTextToDoc({ schema: this.view.state.schema, text });
    const tr = this.view.state.tr;
    tr.replaceWith(0, this.view.state.doc.content.size, parsed.content);
    tr.setSelection(TextSelection.atEnd(tr.doc));
    this.view.dispatch(tr);
  }

  setPlaceholder(placeholder: string): void {
    this.view.dispatch(
      this.view.state.tr.setMeta(placeholderKey, { placeholder }),
    );
  }

  syncMentionMetadata({
    skills,
    apps = [],
    plugins = [],
  }: {
    skills: Array<AppServer.v2.SkillMetadata>;
    apps?: Array<AppServer.v2.AppInfo>;
    plugins?: Array<InstalledPlugin>;
  }): void {
    const skillsByPath = new Map<string, AppServer.v2.SkillMetadata>();
    const skillsByName = new Map<string, AppServer.v2.SkillMetadata>();
    const appsByPath = new Map<string, AppServer.v2.AppInfo>();
    const appsByName = new Map<string, AppServer.v2.AppInfo>();
    const pluginsByPath = new Map<string, InstalledPlugin>();
    const pluginsByName = new Map<string, InstalledPlugin>();
    skills.forEach((skill) => {
      skillsByPath.set(normalizeFsPath(skill.path), skill);
      skillsByName.set(skill.name.toLowerCase(), skill);
    });
    apps.forEach((app) => {
      const appPath = getAppMentionPath(app.id);
      appsByPath.set(appPath, app);
      appsByName.set(app.id.toLowerCase(), app);
      appsByName.set(app.name.toLowerCase(), app);
    });
    plugins.forEach((plugin) => {
      const pluginPath = getPluginMentionPath(plugin.plugin.id);
      pluginsByPath.set(pluginPath, plugin);
      pluginsByName.set(plugin.plugin.id.toLowerCase(), plugin);
      pluginsByName.set(plugin.plugin.name.toLowerCase(), plugin);
      const displayName = plugin.displayName?.toLowerCase();
      if (displayName != null && displayName.length > 0) {
        pluginsByName.set(displayName, plugin);
      }
    });

    const { state, dispatch } = this.view;
    let tr = state.tr;
    let didUpdate = false;
    state.doc.descendants((node, pos) => {
      if (
        node.type.name !== "skillMention" &&
        node.type.name !== "appMention" &&
        node.type.name !== "pluginMention"
      ) {
        return true;
      }

      const mentionPath =
        typeof node.attrs.path === "string" ? node.attrs.path : "";
      const mentionName =
        typeof node.attrs.name === "string" ? node.attrs.name : "";
      const mentionKind = getMentionKindForNode({
        nodeTypeName: node.type.name,
        path: mentionPath,
      });

      let nextAttrs: ComposerMentionAttrs | null = null;
      if (mentionKind === "app") {
        const appFromPath = appsByPath.get(mentionPath);
        const appFromName =
          mentionName.length > 0
            ? appsByName.get(mentionName.toLowerCase())
            : undefined;
        const app = appFromPath ?? appFromName;
        if (app) {
          nextAttrs = getMentionAttrsFromApp(app);
        }
      } else if (mentionKind === "plugin") {
        const pluginFromPath = pluginsByPath.get(mentionPath);
        const pluginFromName =
          mentionName.length > 0
            ? pluginsByName.get(mentionName.toLowerCase())
            : undefined;
        const plugin = pluginFromPath ?? pluginFromName;
        if (plugin) {
          nextAttrs = getMentionAttrsFromPlugin(plugin);
        }
      } else {
        let matchingSkill =
          mentionPath.length > 0
            ? skillsByPath.get(normalizeFsPath(mentionPath))
            : undefined;
        if (!matchingSkill && mentionName.length > 0) {
          matchingSkill = skillsByName.get(mentionName.toLowerCase());
        }
        if (matchingSkill) {
          nextAttrs = getMentionAttrsFromSkill(matchingSkill);
        } else if (mentionPath.length > 0) {
          // Keep the chip visible after an environment switch, but clear the
          // resolved path so it no longer serializes as an executable skill.
          nextAttrs = {
            name: mentionName,
            displayName:
              typeof node.attrs.displayName === "string"
                ? node.attrs.displayName
                : mentionName,
            path: "",
            description:
              typeof node.attrs.description === "string"
                ? node.attrs.description
                : "",
            iconSmall:
              typeof node.attrs.iconSmall === "string"
                ? node.attrs.iconSmall
                : "",
          };
        }
      }
      const nextType = getMentionNodeType(mentionKind);
      const hasTypeChanged = node.type !== nextType;
      if (!nextAttrs && !hasTypeChanged) {
        return true;
      }

      const hasChanged =
        nextAttrs != null &&
        (node.attrs.name !== nextAttrs.name ||
          node.attrs.displayName !== nextAttrs.displayName ||
          node.attrs.path !== nextAttrs.path ||
          node.attrs.description !== nextAttrs.description ||
          node.attrs.iconSmall !== nextAttrs.iconSmall);
      if (!hasChanged && !hasTypeChanged) {
        return true;
      }

      didUpdate = true;
      tr = tr.setNodeMarkup(pos, nextType, {
        ...node.attrs,
        ...nextAttrs,
      });
      return true;
    });

    if (!didUpdate) {
      return;
    }

    dispatch(tr);
  }

  insertAtMention(file: FileDescriptor, mentionState?: MentionUiState): void {
    const stateInfo = mentionState ?? mentionUiKey.getState(this.view.state);
    if (!stateInfo || stateInfo.anchorPos == null) {
      return;
    }

    const { state, dispatch } = this.view;
    const textFrom = stateInfo.anchorPos - 1; // include '@'
    const textTo = stateInfo.anchorPos + stateInfo.query.length;
    const atMentionNode = plainTextSchema.nodes.atMention.create(file);

    let tr = state.tr.replaceRangeWith(textFrom, textTo, atMentionNode);

    const indexAfterMention = tr.mapping.map(textFrom) + atMentionNode.nodeSize;
    const pos = tr.doc.resolve(indexAfterMention);
    let needsSpace = true;
    if (pos.parentOffset < pos.parent.content.size) {
      const next = pos.parent.childAfter(pos.parentOffset);
      const nextChar =
        next.node && next.node.isText ? next.node.text?.[0] : undefined;
      if (nextChar && /\s/.test(nextChar)) {
        needsSpace = false;
      }
    }

    if (needsSpace) {
      tr = tr.insertText(" ", indexAfterMention);
    }
    const newSelPos = indexAfterMention + (needsSpace ? 1 : 0);
    tr = tr.setSelection(TextSelection.create(tr.doc, newSelPos));
    tr = tr.setMeta(mentionUiKey, {
      active: false,
      anchorPos: null,
      query: "",
    });
    dispatch(tr);
    this.view.focus();
  }

  insertAgentMention(
    mention: AgentMentionInsertItem,
    mentionState?: MentionUiState,
  ): void {
    const stateInfo = mentionState ?? mentionUiKey.getState(this.view.state);
    if (!stateInfo || stateInfo.anchorPos == null) {
      return;
    }

    const { state, dispatch } = this.view;
    const textFrom = stateInfo.anchorPos - 1;
    const textTo = stateInfo.anchorPos + stateInfo.query.length;
    const agentMentionNode = plainTextSchema.nodes.agentMention.create({
      name: mention.name,
      displayName: mention.displayName,
      conversationId: mention.conversationId ?? null,
      path: mention.path,
    });

    let tr = state.tr.replaceRangeWith(textFrom, textTo, agentMentionNode);

    const indexAfterMention =
      tr.mapping.map(textFrom) + agentMentionNode.nodeSize;
    const pos = tr.doc.resolve(indexAfterMention);
    let needsSpace = true;
    if (pos.parentOffset < pos.parent.content.size) {
      const next = pos.parent.childAfter(pos.parentOffset);
      const nextChar =
        next.node && next.node.isText ? next.node.text?.[0] : undefined;
      if (nextChar && /\s/.test(nextChar)) {
        needsSpace = false;
      }
    }

    if (needsSpace) {
      tr = tr.insertText(" ", indexAfterMention);
    }
    const newSelPos = indexAfterMention + (needsSpace ? 1 : 0);
    tr = tr.setSelection(TextSelection.create(tr.doc, newSelPos));
    tr = tr.setMeta(mentionUiKey, {
      active: false,
      anchorPos: null,
      query: "",
    });
    dispatch(tr);
    this.view.focus();
  }

  insertConfiguredAgentMention(
    role: LocalCustomAgentMetadata,
    mentionState?: MentionUiState,
  ): void {
    this.insertAgentMention(
      getConfiguredAgentMentionInsertItem(role),
      mentionState,
    );
  }

  insertSkillMention(
    skill: AppServer.v2.SkillMetadata,
    mentionState?: MentionUiState,
  ): void {
    this.insertMention(getMentionInsertItemFromSkill(skill), mentionState);
  }

  insertSkillMentionFromSlashCommand(
    skill: AppServer.v2.SkillMetadata,
    mentionState?: MentionUiState,
  ): void {
    this.insertMentionFromSlashCommand(
      getMentionInsertItemFromSkill(skill),
      mentionState,
    );
  }

  insertMention(
    mention: ComposerMentionInsertItem,
    mentionState?: MentionUiState,
  ): void {
    const stateInfo =
      mentionState ?? skillMentionUiKey.getState(this.view.state);
    if (!stateInfo || stateInfo.anchorPos == null) {
      return;
    }

    this.replaceQueryWithMention(mention, stateInfo, skillMentionUiKey);
  }

  insertMentionFromSlashCommand(
    mention: ComposerMentionInsertItem,
    mentionState?: MentionUiState,
  ): void {
    const stateInfo =
      mentionState ?? slashCommandUiKey.getState(this.view.state);
    if (!stateInfo || stateInfo.anchorPos == null) {
      return;
    }

    this.replaceQueryWithMention(mention, stateInfo, slashCommandUiKey);
  }

  private replaceQueryWithMention(
    mention: ComposerMentionInsertItem,
    stateInfo: MentionUiState,
    uiKey: PluginKey<MentionUiState>,
  ): void {
    if (stateInfo.anchorPos == null) {
      return;
    }

    const textFrom = stateInfo.anchorPos - 1;
    const textTo = stateInfo.anchorPos + stateInfo.query.length;
    this.insertMentionInRange(mention, textFrom, textTo, uiKey);
  }

  insertMentionFromAtMention(
    mention: ComposerMentionInsertItem,
    mentionState?: MentionUiState,
  ): void {
    const stateInfo = mentionState ?? mentionUiKey.getState(this.view.state);
    if (!stateInfo || stateInfo.anchorPos == null) {
      return;
    }

    this.replaceQueryWithMention(mention, stateInfo, mentionUiKey);
  }

  insertSkillMentionAtSelection(skill: AppServer.v2.SkillMetadata): void {
    this.insertMentionAtSelection(getMentionInsertItemFromSkill(skill));
  }

  insertMentionAtSelection(mention: ComposerMentionInsertItem): void {
    const { from, to } = this.view.state.selection;
    this.insertMentionInRange(mention, from, to);
  }

  clearSlashCommand(mentionState?: MentionUiState): void {
    const stateInfo =
      mentionState ?? slashCommandUiKey.getState(this.view.state);
    if (!stateInfo || stateInfo.anchorPos == null) {
      return;
    }

    const { state, dispatch } = this.view;
    const textFrom = stateInfo.anchorPos - 1;
    const textTo = stateInfo.anchorPos + stateInfo.query.length;
    let tr = state.tr.insertText("", textFrom, textTo);
    tr = tr.setSelection(TextSelection.create(tr.doc, textFrom));
    tr = tr.setMeta(slashCommandUiKey, {
      active: false,
      anchorPos: null,
      query: "",
    });
    dispatch(tr);
    this.view.focus();
  }

  private insertMentionInRange(
    mention: ComposerMentionInsertItem,
    from: number,
    to: number,
    uiKey?: PluginKey<MentionUiState>,
  ): void {
    const { state, dispatch } = this.view;
    const mentionNode = getMentionNodeType(mention.kind).create({
      name: mention.name,
      displayName: mention.displayName,
      path: mention.path,
      description: mention.description,
      iconSmall: mention.iconSmall,
    });

    let tr = state.tr.replaceRangeWith(from, to, mentionNode);
    const indexAfterMention = tr.mapping.map(from) + mentionNode.nodeSize;
    const pos = tr.doc.resolve(indexAfterMention);
    let needsSpace = true;
    if (pos.parentOffset < pos.parent.content.size) {
      const next = pos.parent.childAfter(pos.parentOffset);
      const nextChar =
        next.node && next.node.isText ? next.node.text?.[0] : undefined;
      if (nextChar && /\s/.test(nextChar)) {
        needsSpace = false;
      }
    }

    if (needsSpace) {
      tr = tr.insertText(" ", indexAfterMention);
    }
    const newSelectionPos = indexAfterMention + (needsSpace ? 1 : 0);
    tr = tr.setSelection(TextSelection.create(tr.doc, newSelectionPos));
    if (uiKey) {
      tr = tr.setMeta(uiKey, {
        active: false,
        anchorPos: null,
        query: "",
      });
    }
    dispatch(tr);
    this.view.focus();
  }

  addSubmitHandler(handler: () => void): void {
    this.eventEmitter.addListener("submit", handler);
  }

  removeSubmitHandler(handler: () => void): void {
    this.eventEmitter.removeListener("submit", handler);
  }

  addPastedImagesHandler(handler: (files: Array<File>) => void): void {
    if (this.pastedImagesHandlers.has(handler)) {
      return;
    }
    const wrappedHandler = (eventData?: unknown): void => {
      handler(eventData as Array<File>);
    };
    this.pastedImagesHandlers.set(handler, wrappedHandler);
    this.eventEmitter.addListener("pasted-images", wrappedHandler);
  }

  removePastedImagesHandler(handler: (files: Array<File>) => void): void {
    const wrappedHandler = this.pastedImagesHandlers.get(handler);
    if (wrappedHandler == null) {
      return;
    }
    this.eventEmitter.removeListener("pasted-images", wrappedHandler);
    this.pastedImagesHandlers.delete(handler);
  }

  setEnterBehavior(behavior: ComposerEnterBehavior): void {
    this.updateEnterBehavior(behavior);
  }

  focus(): void {
    this.view.focus();
  }

  destroy(): void {
    this.view.destroy();
  }
}

function getMentionNodeType(kind: ComposerMentionKind): NodeType {
  switch (kind) {
    case "agent": {
      return plainTextSchema.nodes.agentMention;
    }
    case "app": {
      return plainTextSchema.nodes.appMention;
    }
    case "plugin": {
      return plainTextSchema.nodes.pluginMention;
    }
    case "skill": {
      return plainTextSchema.nodes.skillMention;
    }
  }
}

function getMentionKindForNode({
  nodeTypeName,
  path,
}: {
  nodeTypeName: string;
  path: string;
}): ComposerMentionKind {
  if (nodeTypeName === "agentMention") {
    return "agent";
  }
  if (nodeTypeName === "appMention") {
    return "app";
  }
  if (nodeTypeName === "pluginMention") {
    return "plugin";
  }
  return getMentionKindFromPath(path);
}

export function createComposerController(
  defaultText?: string,
  options?: Parameters<typeof buildProsemirrorForComposer>[1],
): ProseMirrorComposerController {
  const { view, eventEmitter, setEnterBehavior } = buildProsemirrorForComposer(
    defaultText ?? null,
    options,
  );
  return new ProseMirrorComposerController(
    view,
    eventEmitter,
    setEnterBehavior,
  );
}

/**
 * Central catalogue of user-facing strings.
 *
 * Keeping every literal here means copy can be changed (or localised) in one
 * place without hunting through components. Group by concern; prefer functions
 * for strings that interpolate values.
 */

/** App identity. */
export const APP = {
  name: "SyncDocs",
  tagline:
    "Write offline, sync automatically, collaborate in real time, and travel through version history.",
} as const;

/** Feature highlights shown on the landing page. */
export const HOME_FEATURES = [
  {
    icon: "⚡",
    title: "Offline-first",
    desc: "Open and edit instantly — no network required.",
  },
  {
    icon: "🔀",
    title: "Conflict-free sync",
    desc: "Edits merge deterministically with zero data loss.",
  },
  {
    icon: "🕑",
    title: "Version history",
    desc: "Snapshot, preview, and restore any past version.",
  },
  {
    icon: "👥",
    title: "Roles & sharing",
    desc: "Owner, Editor, Viewer — with secure access control.",
  },
] as const;

/** Author credit shown in the footer (assignment requirement). */
export const AUTHOR = {
  builtBy: "Built by",
  name: "shankar Thakur",
  githubUrl: "https://github.com/your-username",
  githubLabel: "GitHub",
  linkedinUrl: "https://www.linkedin.com/in/your-handle",
  linkedinLabel: "LinkedIn",
} as const;

/** Button / action labels. */
export const ACTIONS = {
  create: "Create",
  creating: "Creating…",
  signIn: "Sign in",
  signInToContinue: "Sign in to continue",
  continueWithGoogle: "Continue with Google",
  signOut: "Sign out",
  invite: "Invite",
  remove: "Remove",
  restore: "Restore",
  restoreThisVersion: "Restore this version",
  preview: "Preview",
  close: "Close",
  tryAgain: "Try again",
  saveVersion: "Save version",
  saving: "Saving…",
  dismiss: "dismiss",
} as const;

/** Section / control labels. */
export const LABELS = {
  history: "History",
  collaborators: "Collaborators",
  versionHistory: "Version history",
  yourDocuments: "Your documents",
  documentBody: "Document body",
  newDocumentTitle: "New document title",
  collaboratorEmail: "Invite by email",
  versionLabel: "Optional label (e.g. 'Draft 1')",
  documentId: "ID",
  snapshot: "Snapshot",
  readOnly: "Read-only",
  viewOnlyBanner:
    "View only — you don't have permission to edit this document.",
  previewSubtitle: "Read-only — this is how the document looked.",
} as const;

/** Human-readable role names. */
export const ROLES = {
  OWNER: "Owner",
  EDITOR: "Editor",
  VIEWER: "Viewer",
} as const;

/** Version kinds. */
export const VERSION_KINDS = {
  MANUAL: "Manual",
  AUTO: "Auto",
} as const;

/** Status + helper messages, plus interpolating helpers. */
export const MESSAGES = {
  // Connection / sync
  loading: "Loading…",
  loadingDocLocal: "Loading your document from this device…",
  savedLocalOnline: "Saved locally • Online",
  savedLocalOffline: "Saved locally • Offline",
  syncSynced: "All changes synced",
  syncSyncing: "Syncing…",
  syncOffline: "Offline — will sync when online",
  syncError: "Sync error — retrying",

  // Empty / placeholder states
  noDocuments: "No documents yet. Create your first one above.",
  noVersions: "No versions yet. Save one to start your history.",
  docsHelp:
    "Stored securely in your account. Open one to edit — even while offline.",

  // Errors
  loadDocumentsFailed: "Failed to load documents.",
  createDocumentFailed: "Could not create document.",
  loadDocumentFailed: "Failed to load this document.",
  noAccess: "This document doesn't exist or you don't have access to it.",
  loadHistoryFailed: "Failed to load history.",
  saveVersionFailed: "Could not save version.",
  restoreFailed: "Could not restore.",
  loadVersionFailed: "Failed to load version.",
  actionFailed: "Action failed.",
  genericError: "Something interrupted this page",
  genericErrorHelp:
    "This can happen if you're offline. Your work is saved locally on this device — try again when you're ready.",

  // Editor
  editorPlaceholder:
    "Start writing… your work is saved on this device automatically.",
} as const;

/** Helpers for strings that include dynamic values. */
export const FORMAT = {
  collaboratorsWithCount: (n: number) => `${LABELS.collaborators} (${n})`,
  updatedAt: (date: string | number | Date) =>
    `Updated ${new Date(date).toLocaleString()}`,
  previewTitle: (label: string) => `Preview · ${label}`,
} as const;

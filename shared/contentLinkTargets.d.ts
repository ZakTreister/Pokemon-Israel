export const STATIC_CONTENT_LINK_TARGETS: readonly {path:string;label:string}[];
export function staticContentLinkTarget(path:string):string|null;
export function normalizeContentLinkTarget(path:unknown):string|null;

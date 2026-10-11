// The signed-in user and the backend API the console calls from the browser.

export type User = { owner: string; name: string; displayName: string; avatar: string; isAdmin: boolean };

export type Account = { user: User | null; hasCasdoor: boolean; hasDatabase: boolean };

type Response<T> = { status: "ok" | "error"; msg: string; data: T };

export async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, body === undefined ? undefined : { method: "POST", body: JSON.stringify(body) });
  const json = (await res.json()) as Response<T>;
  if (json.status !== "ok") {
    throw new Error(json.msg);
  }
  return json.data;
}

// The backend sends the browser to Casdoor and, after signing in, back to `redirect` (a path of this site).
export function signinUrl(redirect: string): string {
  return `/api/signin?redirect=${encodeURIComponent(redirect)}`;
}

export async function signout(): Promise<void> {
  await api("/api/signout", {});
}

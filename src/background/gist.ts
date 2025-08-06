import type { Settings } from "@/modules/types";
import browser from "webextension-polyfill";

const API_ROOT = "https://api.github.com";

/**
 * API helper function to make requests to GitHub API.
 * Automatically adds necessary headers and handles errors.
 * @param path : The API endpoint path (e.g., "/gists").
 * @param opts : The options for the request, including method, body, etc.
 * @returns The JSON response from the API or throws an error.
 */
export async function api<T = unknown>(
    path: string,
    opts: RequestInit & { token: string }
): Promise<{
    data: T | null;            // null if 304 or HEAD/204/202 with no body
    res: Response;             // always returned for header access
}> {
    const { token, headers, ...rest } = opts;

    const res = await fetch(`${API_ROOT}${path}`, {
        ...rest,
        headers: {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "Authorization": `Bearer ${token}`,
            ...headers
        }
    });

    // ----- 1) non-success status -----
    if (!res.ok && res.status !== 304) {
        throw new Error(`${res.status} ${await res.text()}`);
    }

    // ----- 2) 304 (Not Modified) -----
    if (res.status === 304) {
        return { data: null, res };           // caller can early-return
    }

    // ----- 3) Methods that never return JSON -----
    const noBody =
        res.status === 204 || res.status === 202 || opts.method === "HEAD";

    if (noBody) {
        return { data: null, res };
    }

    // ----- 4) Normal JSON payload -----
    const json = (await res.json()) as T;
    return { data: json, res };
}

/** Scan user gists until we find one that contains `crumbly.enc`. */
export async function locateCrumblyGist(token: string): Promise<string | undefined> {
    let page = 1;
    const PER_PAGE = 100;

    while (true) {
        const gists = await api<any[]>(`/gists?per_page=${PER_PAGE}&page=${page}`, {
            token
        });
        if (!gists.data || gists.data.length === 0) return undefined;

        for (const g of gists.data) {
            if (g.files && g.files["crumbly.enc"]) return g.id;
            // optional: also match on description === "Crumbly cookie vault"
        }

        if (gists.data.length < PER_PAGE) return undefined; // reached the end
        page++;
    }
}

/**
 * Upserts a GitHub Gist with the given file content.
 * @param fileContent The content to be saved in the Gist.
 * @param filename The name of the file in the Gist.
 * @returns The ID and ETag of the Gist.
 */
export async function upsertGist(
    fileContent: string,
    filename = "crumbly.json"
): Promise<{ gistId: string; etag: string }> {
    const settings = await browser.storage.local.get("settings") as { settings: Settings };
    const { githubToken, gistId } = settings.settings;
    if (!githubToken) throw new Error("Missing GitHub token.");

    // If we already created a gist before, patch it; otherwise create new
    if (gistId) {
        const out = await api<{ id: string }>(`/gists/${gistId}`, {
            token: githubToken as any,
            method: "PATCH",
            body: JSON.stringify({
                files: {
                    [filename]: { content: fileContent }
                }
            })
        });
        const etag = (await api<Response>(`/gists/${out.data?.id}`, {
            token: githubToken as any,
            method: "HEAD"
        })).data?.headers?.get("etag") ?? "";

        if (!out.data || !etag) throw new Error("Failed to patch Gist");
        if (!etag) throw new Error("Failed to fetch ETag after patching Gist");
        await browser.storage.local.set({ settings: { ...settings.settings, gistId: gistId, etag } });
        return { gistId: out.data.id, etag };
    }

    const created = await api<{ id: string }>(`/gists`, {
        token: githubToken as any,
        method: "POST",
        body: JSON.stringify({
            description: "Crumbly cookie vault",
            public: false,
            files: { [filename]: { content: fileContent } }
        })
    });
    const etag = (await api<Response>(`/gists/${created.data?.id}`, {
        token: githubToken as any,
        method: "HEAD"
    }))?.data?.headers?.get("etag") ?? "";
    if (!etag) throw new Error("Failed to fetch ETag after creating Gist");
    if (!created.data || !etag) throw new Error("Failed to create Gist");
    await browser.storage.local.set({ settings: { ...settings.settings, gistId: created.data.id, etag } });
    return { gistId: created.data.id, etag };
}

export async function fetchGist(
    token: string,
    gistId: string,
    knownEtag?: string
): Promise<{ blob: string | null; etag: string | null }> {
    const res = await api<{ files: Record<string, { content: string }> }>(`/gists/${gistId}`, {
        token,
        method: "GET",
        headers: knownEtag ? { "If-None-Match": knownEtag } : {}
    });

    if (res.res.status === 304) return { blob: null, etag: knownEtag ?? null }; // up-to-date

    if (!res.res.ok) throw new Error(`${res.res.status} ${await res.res.text()}`);

    const json = res.data;
    if (!json || !json.files) throw new Error("Gist content is empty or malformed");
    const file = json.files["crumbly.enc"] || Object.values(json.files)[0];
    if (!file || !file.content) throw new Error("Encrypted blob missing");

    const etag = res.res.headers.get("etag");
    return { blob: file.content, etag };
}
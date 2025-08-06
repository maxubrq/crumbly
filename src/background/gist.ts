import browser from "webextension-polyfill";

const API_ROOT = "https://api.github.com";

/**
 * API helper function to make requests to GitHub API.
 * Automatically adds necessary headers and handles errors.
 * @param path : The API endpoint path (e.g., "/gists").
 * @param opts : The options for the request, including method, body, etc.
 * @returns The JSON response from the API or throws an error.
 */
async function api<T>(
    path: string,
    opts: RequestInit & { token: string }
): Promise<T> {
    const { token, ...rest } = opts;
    const res = await fetch(`${API_ROOT}${path}`, {
        ...rest,
        headers: {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "Authorization": `Bearer ${token}`,
            ...(rest.headers ?? {})
        }
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    return res.json() as Promise<T>;
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
    const { githubToken, gistId } = await browser.storage.local.get([
        "githubToken",
        "gistId"
    ]);
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
        const etag = (await api<Response>(`/gists/${out.id}`, {
            token: githubToken as any,
            method: "HEAD"
        })).headers.get("etag")!;
        return { gistId: out.id, etag };
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
    await browser.storage.local.set({ gistId: created.id });
    const etag = (await api<Response>(`/gists/${created.id}`, {
        token: githubToken as any,
        method: "HEAD"
    })).headers.get("etag")!;
    return { gistId: created.id, etag };
}

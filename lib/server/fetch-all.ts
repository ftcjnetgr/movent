export async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{
    data: T[] | null;
    error: unknown;
  }>,
) {
  const pageSize = 1000;
  const rows: T[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);

    if (error) {
      const raw = error as {
        message?: unknown;
        code?: unknown;
        details?: unknown;
        hint?: unknown;
      };

      const message =
        typeof raw?.message === "string" && raw.message.trim()
          ? raw.message
          : "Supabase query failed without an error message.";

      const context = [
        typeof raw?.code === "string" ? `code=${raw.code}` : null,
        typeof raw?.details === "string" ? `details=${raw.details}` : null,
        typeof raw?.hint === "string" ? `hint=${raw.hint}` : null,
      ]
        .filter(Boolean)
        .join(" | ");

      throw new Error(context ? `${message} (${context})` : message, {
        cause: error,
      });
    }

    const batch = data ?? [];
    rows.push(...batch);

    if (batch.length < pageSize) break;
  }

  return rows;
}

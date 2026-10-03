import { GAME_CATALOG, FRANCHISES } from "@/lib/catalog";

/** Public master data only. Never expose personal library entries here. */
export function GET() {
  return Response.json(
    { version: 1, games: GAME_CATALOG, franchises: FRANCHISES },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  // ------------------------------------------------------------
  // CORS
  // ------------------------------------------------------------
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    // ------------------------------------------------------------
    // 1. Get API key
    // ------------------------------------------------------------
    const apiKey = Deno.env.get("SATTA_API_KEY");

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "SATTA_API_KEY is not configured",
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    // ------------------------------------------------------------
    // 2. Supabase admin client
    // ------------------------------------------------------------
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Supabase environment variables are missing",
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
    );

    // ------------------------------------------------------------
    // 3. Call external result API
    // ------------------------------------------------------------
    const apiResponse = await fetch(
      "https://sattamatkaapi.live/api/results/board",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
      },
    );

    const apiText = await apiResponse.text();

    if (!apiResponse.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          apiStatus: apiResponse.status,
          apiResponse: apiText,
        }),
        {
          status: apiResponse.status,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    // ------------------------------------------------------------
    // 4. Parse API response
    // ------------------------------------------------------------
    let apiJson;

    try {
      apiJson = JSON.parse(apiText);
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          error: "External API returned invalid JSON",
          apiResponse: apiText,
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    // ------------------------------------------------------------
// 4. Parse API response
// ------------------------------------------------------------

// The API normally returns:
// {
//   status: "success",
//   data: [ ...markets... ]
// }
//
// But we also support the wrapped format:
// {
//   data: {
//     status: "success",
//     data: [ ...markets... ]
//   }
// }

let apiMarkets: any[] | null = null;

if (Array.isArray(apiJson?.data?.data)) {
  // Wrapped format
  apiMarkets = apiJson.data.data;
} else if (Array.isArray(apiJson?.data)) {
  // Direct format
  apiMarkets = apiJson.data;
} else if (Array.isArray(apiJson?.results)) {
  // Alternative format
  apiMarkets = apiJson.results;
} else if (Array.isArray(apiJson)) {
  // API returned the array directly
  apiMarkets = apiJson;
}

if (!apiMarkets) {
  return new Response(
    JSON.stringify({
      success: false,
      error: "Unexpected API response format",
      responseKeys:
        apiJson && typeof apiJson === "object"
          ? Object.keys(apiJson)
          : [],
      dataKeys:
        apiJson?.data &&
        typeof apiJson.data === "object" &&
        !Array.isArray(apiJson.data)
          ? Object.keys(apiJson.data)
          : [],
    }),
    {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    },
  );
}

    // ------------------------------------------------------------
    // 5. Get ONLY existing active markets from our database
    // ------------------------------------------------------------
    const { data: dbMarkets, error: marketsError } = await supabase
      .from("markets")
      .select("id, slug, name, active")
      .eq("active", true);

    if (marketsError) {
      throw new Error(
        `Could not load markets: ${marketsError.message}`,
      );
    }

    // ------------------------------------------------------------
    // 6. Create slug lookup
    // ------------------------------------------------------------
    const marketMap = new Map<string, any>();

    for (const market of dbMarkets ?? []) {
      if (market.slug) {
        marketMap.set(
          market.slug.toLowerCase().trim(),
          market,
        );
      }
    }

    // ------------------------------------------------------------
    // 7. Process API results
    // ------------------------------------------------------------
    const rowsToUpsert: any[] = [];

    const skipped: any[] = [];
    const synced: any[] = [];

    for (const apiMarket of apiMarkets) {
      const apiSlug = String(
        apiMarket?.slug ?? "",
      )
        .toLowerCase()
        .trim();

      if (!apiSlug) {
        skipped.push({
          reason: "missing_slug",
          market: apiMarket?.name ?? null,
        });

        continue;
      }

      // ----------------------------------------------------------
      // Only match markets already existing in our DB
      // ----------------------------------------------------------
      const dbMarket = marketMap.get(apiSlug);

      if (!dbMarket) {
        skipped.push({
          reason: "market_not_found_in_database",
          slug: apiSlug,
          name: apiMarket?.name ?? null,
        });

        continue;
      }

      // ----------------------------------------------------------
      // Only complete results
      // ----------------------------------------------------------
      const isComplete = apiMarket?.isComplete === true;

      const openPana = apiMarket?.openPana;
      const closePana = apiMarket?.closePana;

      const openAnk = apiMarket?.openAnk;
      const closeAnk = apiMarket?.closeAnk;

      const jodi = apiMarket?.jodi;

      if (
        !isComplete ||
        openPana == null ||
        closePana == null ||
        openAnk == null ||
        closeAnk == null ||
        jodi == null
      ) {
        skipped.push({
          reason: "incomplete_result",
          slug: apiSlug,
          name: apiMarket?.name ?? null,
          status: apiMarket?.status ?? null,
        });

        continue;
      }

      // ----------------------------------------------------------
      // Result date
      // ----------------------------------------------------------
      const resultDate =
        apiMarket?.resultDate ??
        apiMarket?.marketDate;

      if (!resultDate) {
        skipped.push({
          reason: "missing_result_date",
          slug: apiSlug,
          name: apiMarket?.name ?? null,
        });

        continue;
      }

      // ----------------------------------------------------------
      // Prepare daily_results row
      //
      // API:
      // openPana  -> open_panel
      // openAnk   -> open_number
      // jodi      -> jodi
      // closeAnk  -> close_number
      // closePana -> close_panel
      // ----------------------------------------------------------
      rowsToUpsert.push({
        market_id: dbMarket.id,
        result_date: resultDate,

        open_number: String(openAnk),
        jodi: String(jodi),

        close_number: String(closeAnk),

        open_panel: String(openPana),
        close_panel: String(closePana),

        status: "published",

        updated_at: new Date().toISOString(),
      });

      synced.push({
        slug: apiSlug,
        name: dbMarket.name,
        resultDate,
        openPana: String(openPana),
        openAnk: String(openAnk),
        jodi: String(jodi),
        closeAnk: String(closeAnk),
        closePana: String(closePana),
      });
    }

    // ------------------------------------------------------------
    // 8. Upsert results
    // ------------------------------------------------------------
    let upsertedCount = 0;

    if (rowsToUpsert.length > 0) {
      const { data: upsertedRows, error: upsertError } =
        await supabase
          .from("daily_results")
          .upsert(
            rowsToUpsert,
            {
              onConflict: "market_id,result_date",
            },
          )
          .select(
            "id, market_id, result_date, open_number, jodi, close_number, open_panel, close_panel, status",
          );

      if (upsertError) {
        throw new Error(
          `Could not save results: ${upsertError.message}`,
        );
      }

      upsertedCount = upsertedRows?.length ?? 0;
    }

    // ------------------------------------------------------------
    // 9. Return sync summary
    // ------------------------------------------------------------
    return new Response(
      JSON.stringify({
        success: true,

        source: "sattamatkaapi.live",

        apiMarketsReceived: apiMarkets.length,

        databaseMarketsAvailable:
          dbMarkets?.length ?? 0,

        resultsFound: rowsToUpsert.length,

        resultsUpserted: upsertedCount,

        synced,

        skipped,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("SYNC ERROR:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
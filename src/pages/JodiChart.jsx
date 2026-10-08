import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function JodiChart() {
  const [markets, setMarkets] = useState([])
  const [selectedMarket, setSelectedMarket] = useState('')

  const [results, setResults] = useState([])

  const [loadingMarkets, setLoadingMarkets] = useState(true)
  const [loadingResults, setLoadingResults] = useState(false)

  const [error, setError] = useState('')

  // ============================================================
  // LOAD MARKETS
  // ============================================================

  useEffect(() => {
    loadMarkets()
  }, [])

  async function loadMarkets() {
    setLoadingMarkets(true)
    setError('')

    const { data, error: marketsError } =
      await supabase
        .from('markets')
        .select('id, name')
        .eq('active', true)
        .order('display_order', {
          ascending: true,
        })

    if (marketsError) {
      console.error(
        'Jodi markets error:',
        marketsError
      )

      setError(marketsError.message)
      setLoadingMarkets(false)
      return
    }

    const marketList = data || []

    setMarkets(marketList)

    // Automatically select first market
    if (marketList.length > 0) {
      setSelectedMarket(marketList[0].id)
    }

    setLoadingMarkets(false)
  }

  // ============================================================
  // LOAD PUBLISHED JODI RESULTS
  // ============================================================

  useEffect(() => {
    if (!selectedMarket) {
      setResults([])
      return
    }

    loadResults(selectedMarket)
  }, [selectedMarket])

  async function loadResults(marketId) {
    setLoadingResults(true)
    setError('')

    const {
      data,
      error: resultsError,
    } = await supabase
      .from('daily_results')
      .select(`
        id,
        result_date,
        jodi,
        status,
        market_id
      `)
      .eq('market_id', marketId)
      .eq('status', 'published')
      .order('result_date', {
        ascending: false,
      })
      .limit(500)

    if (resultsError) {
      console.error(
        'Jodi results error:',
        resultsError
      )

      setError(resultsError.message)
      setResults([])
      setLoadingResults(false)
      return
    }

    setResults(data || [])
    setLoadingResults(false)
  }

  // ============================================================
  // FORMAT DATE
  // ============================================================

  function formatDate(date) {
    if (!date) {
      return '—'
    }

    const formattedDate = new Date(
      `${date}T00:00:00`
    )

    if (
      Number.isNaN(
        formattedDate.getTime()
      )
    ) {
      return date
    }

    return formattedDate.toLocaleDateString(
      'en-IN',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }
    )
  }

  // ============================================================
  // SELECTED MARKET NAME
  // ============================================================

  const selectedMarketName =
    markets.find(
      (market) =>
        market.id === selectedMarket
    )?.name || ''

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <div className="chart-page">

      <div className="container">

        {/* ======================================================
            HERO
        ====================================================== */}

        <div className="chart-hero">

          <span>
            HISTORICAL INFORMATION
          </span>

          <h1>
            Jodi Chart
          </h1>

          <p>
            Published Jodi results by market
            and date.
          </p>

        </div>


        {/* ======================================================
            MARKET SELECTOR
        ====================================================== */}

        <div className="chart-controls">

          <label>
            Select Market
          </label>

          <select
            value={selectedMarket}
            onChange={(event) =>
              setSelectedMarket(
                event.target.value
              )
            }
            disabled={loadingMarkets}
          >

            {loadingMarkets && (
              <option value="">
                Loading markets...
              </option>
            )}

            {!loadingMarkets &&
              markets.length === 0 && (
                <option value="">
                  No active markets
                </option>
              )
            }

            {markets.map((market) => (

              <option
                key={market.id}
                value={market.id}
              >
                {market.name}
              </option>

            ))}

          </select>

        </div>


        {/* ======================================================
            SELECTED MARKET
        ====================================================== */}

        {selectedMarketName && (

          <div className="history-count">

            Showing published Jodi results for{' '}

            <strong>
              {selectedMarketName}
            </strong>

          </div>

        )}


        {/* ======================================================
            ERROR
        ====================================================== */}

        {error && (

          <div className="chart-error">
            {error}
          </div>

        )}


        {/* ======================================================
            TABLE
        ====================================================== */}

        <div className="chart-table-wrapper">

          <table className="chart-table">

            <thead>

              <tr>

                <th>
                  DATE
                </th>

                <th>
                  JODI
                </th>

              </tr>

            </thead>


            <tbody>

              {/* LOADING */}

              {loadingResults && (

                <tr>

                  <td
                    colSpan="2"
                    className="history-empty"
                  >
                    Loading published results...
                  </td>

                </tr>

              )}


              {/* EMPTY */}

              {!loadingResults &&
                results.length === 0 && (

                  <tr>

                    <td
                      colSpan="2"
                      className="history-empty"
                    >
                      No published results available.
                    </td>

                  </tr>

                )
              }


              {/* RESULTS */}

              {!loadingResults &&
                results.length > 0 &&
                results.map((result) => (

                  <tr key={result.id}>

                    <td>
                      {formatDate(
                        result.result_date
                      )}
                    </td>

                    <td className="chart-number">

                      {result.jodi ||
                        '—'
                      }

                    </td>

                  </tr>

                ))
              }

            </tbody>

          </table>

        </div>

      </div>

    </div>
  )
}

export default JodiChart
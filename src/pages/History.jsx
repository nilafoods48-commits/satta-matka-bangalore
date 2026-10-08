import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function History() {
  const [markets, setMarkets] = useState([])
  const [selectedMarket, setSelectedMarket] = useState('')

  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const [results, setResults] = useState([])

  const [loading, setLoading] = useState(false)
  const [marketsLoading, setMarketsLoading] = useState(true)
  const [error, setError] = useState('')

  // ============================================================
  // LOAD MARKETS
  // ============================================================

  useEffect(() => {
    loadMarkets()
  }, [])

  async function loadMarkets() {
    setMarketsLoading(true)
    setError('')

    const { data, error: marketsError } = await supabase
      .from('markets')
      .select('id, name')
      .eq('active', true)
      .order('display_order', {
        ascending: true,
      })

    if (marketsError) {
      console.error('Markets error:', marketsError)
      setError(marketsError.message)
      setMarketsLoading(false)
      return
    }

    setMarkets(data || [])
    setMarketsLoading(false)
  }

  // ============================================================
  // SEARCH PUBLISHED RESULTS
  // ============================================================

  async function searchResults() {
    setLoading(true)
    setError('')

    // Validate date range
    if (fromDate && toDate && fromDate > toDate) {
      setError('From Date cannot be later than To Date.')
      setLoading(false)
      return
    }

    let query = supabase
      .from('daily_results')
      .select(`
        id,
        result_date,
        open_number,
        jodi,
        close_number,
        open_panel,
        close_panel,
        status,
        market_id,
        markets (
          name
        )
      `)
      .eq('status', 'published')
      .order('result_date', {
        ascending: false,
      })

    // Market filter
    if (selectedMarket) {
      query = query.eq(
        'market_id',
        selectedMarket
      )
    }

    // From date
    if (fromDate) {
      query = query.gte(
        'result_date',
        fromDate
      )
    }

    // To date
    if (toDate) {
      query = query.lte(
        'result_date',
        toDate
      )
    }

    const {
      data,
      error: resultsError,
    } = await query.limit(500)

    if (resultsError) {
      console.error(
        'History results error:',
        resultsError
      )

      setError(resultsError.message)
      setResults([])
      setLoading(false)
      return
    }

    setResults(data || [])
    setLoading(false)
  }

  // ============================================================
  // CLEAR SEARCH
  // ============================================================

  function clearFilters() {
    setSelectedMarket('')
    setFromDate('')
    setToDate('')
    setResults([])
    setError('')
  }

  // ============================================================
  // FORMAT DATE
  // ============================================================

  function formatDate(date) {
    if (!date) {
      return '—'
    }

    const formatted = new Date(
      `${date}T00:00:00`
    )

    if (Number.isNaN(formatted.getTime())) {
      return date
    }

    return formatted.toLocaleDateString(
      'en-IN',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }
    )
  }

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
            Result History
          </h1>

          <p>
            Search published results by market
            and date.
          </p>

        </div>


        {/* ======================================================
            FILTERS
        ====================================================== */}

        <div className="history-filters">

          {/* MARKET */}

          <div className="history-field">

            <label>
              Market
            </label>

            <select
              value={selectedMarket}
              onChange={(event) =>
                setSelectedMarket(
                  event.target.value
                )
              }
              disabled={marketsLoading}
            >

              <option value="">
                All Markets
              </option>

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


          {/* FROM DATE */}

          <div className="history-field">

            <label>
              From Date
            </label>

            <input
              type="date"
              value={fromDate}
              onChange={(event) =>
                setFromDate(
                  event.target.value
                )
              }
            />

          </div>


          {/* TO DATE */}

          <div className="history-field">

            <label>
              To Date
            </label>

            <input
              type="date"
              value={toDate}
              onChange={(event) =>
                setToDate(
                  event.target.value
                )
              }
            />

          </div>


          {/* SEARCH */}

          <button
            type="button"
            className="history-search-button"
            onClick={searchResults}
            disabled={loading}
          >

            {loading
              ? 'Searching...'
              : 'Search Results'
            }

          </button>


          {/* CLEAR */}

          <button
            type="button"
            className="history-clear-button"
            onClick={clearFilters}
          >
            Clear
          </button>

        </div>


        {/* ======================================================
            ERROR
        ====================================================== */}

        {error && (

          <div className="chart-error">
            {error}
          </div>

        )}


        {/* ======================================================
            RESULTS COUNT
        ====================================================== */}

        {!loading && results.length > 0 && (

          <div className="history-count">

            Showing{' '}
            <strong>
              {results.length}
            </strong>{' '}
            published result
            {results.length === 1 ? '' : 's'}.

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
                  MARKET
                </th>

                <th>
                  OPEN
                </th>

                <th>
                  JODI
                </th>

                <th>
                  CLOSE
                </th>

                <th>
                  OPEN PANEL
                </th>

                <th>
                  CLOSE PANEL
                </th>

              </tr>

            </thead>


            <tbody>

              {/* LOADING */}

              {loading && (

                <tr>

                  <td
                    colSpan="7"
                    className="history-empty"
                  >
                    Loading published results...

                  </td>

                </tr>

              )}


              {/* NO RESULTS */}

              {!loading &&
                results.length === 0 && (

                  <tr>

                    <td
                      colSpan="7"
                      className="history-empty"
                    >
                      No published results found.

                    </td>

                  </tr>

                )
              }


              {/* RESULTS */}

              {!loading &&
                results.length > 0 &&
                results.map((result) => (

                  <tr key={result.id}>

                    <td>
                      {formatDate(
                        result.result_date
                      )}
                    </td>


                    <td>

                      {result.markets?.name ||
                        '—'
                      }

                    </td>


                    <td className="chart-number">

                      {result.open_number ||
                        '—'
                      }

                    </td>


                    <td className="chart-number">

                      {result.jodi ||
                        '—'
                      }

                    </td>


                    <td className="chart-number">

                      {result.close_number ||
                        '—'
                      }

                    </td>


                    <td className="chart-number">

                      {result.open_panel ||
                        '—'
                      }

                    </td>


                    <td className="chart-number">

                      {result.close_panel ||
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

export default History
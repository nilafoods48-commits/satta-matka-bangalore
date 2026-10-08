import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function PanelChart() {
  const [markets, setMarkets] = useState([])
  const [selectedMarket, setSelectedMarket] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Load markets when page opens
  useEffect(() => {
    loadMarkets()
  }, [])

  // Load results whenever market changes
  useEffect(() => {
    if (selectedMarket) {
      loadResults(selectedMarket)
    } else {
      setResults([])
    }
  }, [selectedMarket])

  async function loadMarkets() {
    setError('')

    const { data, error: marketsError } = await supabase
      .from('markets')
      .select('id, name')
      .eq('active', true)
      .order('display_order', {
        ascending: true,
      })

    if (marketsError) {
      setError(marketsError.message)
      return
    }

    const marketList = data || []

    setMarkets(marketList)

    if (marketList.length > 0) {
      setSelectedMarket(marketList[0].id)
    }
  }

  async function loadResults(marketId) {
    setLoading(true)
    setError('')

    const { data, error: resultsError } = await supabase
      .from('daily_results')
      .select(
        'result_date, open_panel, close_panel'
      )
      .eq('market_id', marketId)
      .eq('status', 'published')
      .order('result_date', {
        ascending: false,
      })
      .limit(100)

    if (resultsError) {
      setError(resultsError.message)
      setResults([])
    } else {
      setResults(data || [])
    }

    setLoading(false)
  }

  function formatDate(date) {
    if (!date) {
      return '—'
    }

    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString(
      'en-IN',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }
    )
  }

  const selectedMarketName =
    markets.find(
      (market) => market.id === selectedMarket
    )?.name || ''

  return (
    <div className="chart-page">

      <div className="container">

        {/* HERO */}
        <div className="chart-hero">

          <span>
            HISTORICAL INFORMATION
          </span>

          <h1>
            Panel Chart
          </h1>

          <p>
            Published panel information by market and date.
          </p>

        </div>

        {/* MARKET SELECTOR */}
        <div className="chart-controls">

          <label>
            Select Market
          </label>

          <select
            value={selectedMarket}
            onChange={(e) =>
              setSelectedMarket(e.target.value)
            }
          >

            {markets.length === 0 ? (
              <option value="">
                Loading markets...
              </option>
            ) : (
              markets.map((market) => (
                <option
                  key={market.id}
                  value={market.id}
                >
                  {market.name}
                </option>
              ))
            )}

          </select>

        </div>

        {/* ERROR */}
        {error && (
          <div className="chart-error">
            {error}
          </div>
        )}

        {/* SELECTED MARKET */}
        {selectedMarketName && !loading && (
          <div
            style={{
              textAlign: 'center',
              margin: '24px 0 10px',
              fontSize: '20px',
            }}
          >
            Showing published panel results for{' '}
            <strong>
              {selectedMarketName}
            </strong>
          </div>
        )}

        {/* TABLE */}
        <div className="chart-table-wrapper">

          <table className="chart-table">

            <thead>

              <tr>

                <th>
                  Date
                </th>

                <th>
                  Open Panel
                </th>

                <th>
                  Close Panel
                </th>

              </tr>

            </thead>

            <tbody>

              {loading ? (

                <tr>
                  <td colSpan="3">
                    Loading...
                  </td>
                </tr>

              ) : results.length === 0 ? (

                <tr>
                  <td colSpan="3">
                    No published results available.
                  </td>
                </tr>

              ) : (

                results.map((result) => (

                  <tr
                    key={`${selectedMarket}-${result.result_date}`}
                  >

                    <td>
                      {formatDate(
                        result.result_date
                      )}
                    </td>

                    <td className="chart-number">
                      {result.open_panel || '—'}
                    </td>

                    <td className="chart-number">
                      {result.close_panel || '—'}
                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  )
}

export default PanelChart
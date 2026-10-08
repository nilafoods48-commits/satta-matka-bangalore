import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function Results() {
  const [markets, setMarkets] = useState([])
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadResults()
  }, [])

  async function loadResults() {
    setLoading(true)
    setError('')

    const { data: marketData, error: marketError } =
      await supabase
        .from('markets')
        .select(
          'id, name, open_time, close_time, active'
        )
        .eq('active', true)
        .order('display_order', {
          ascending: true,
        })

    if (marketError) {
      setError(marketError.message)
      setLoading(false)
      return
    }

    const { data: resultData, error: resultError } =
      await supabase
        .from('daily_results')
        .select(`
          id,
          market_id,
          result_date,
          open_number,
          jodi,
          close_number,
          open_panel,
          close_panel,
          status
        `)
        .eq('status', 'published')
        .order('result_date', {
          ascending: false,
        })
        .limit(500)

    if (resultError) {
      setError(resultError.message)
      setLoading(false)
      return
    }

    setMarkets(marketData || [])
    setResults(resultData || [])
    setLoading(false)
  }

  function getLatestResult(marketId) {
    return results.find(
      (result) => result.market_id === marketId
    )
  }

  function formatTime(time) {
    if (!time) return '--'

    return time.slice(0, 5)
  }

  function formatDate(date) {
    if (!date) return ''

    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="chart-page">

      <div className="container">

        <div className="chart-hero">

          <span>
            PUBLISHED RESULTS
          </span>

          <h1>
            Market Results
          </h1>

          <p>
            View published market result information.
          </p>

        </div>

        {error && (
          <div className="chart-error">
            {error}
          </div>
        )}

        {loading ? (

          <div className="results-loading">
            Loading published results...
          </div>

        ) : markets.length === 0 ? (

          <div className="chart-table-wrapper">
            <div className="results-loading">
              No active markets available.
            </div>
          </div>

        ) : (

          <div className="results-grid">

            {markets.map((market) => {

              const result =
                getLatestResult(market.id)

              return (
                <div
                  className="result-card"
                  key={market.id}
                >

                  <div className="result-card-header">

                    <div>
                      <h2>
                        {market.name}
                      </h2>

                      <span>
                        Open {formatTime(market.open_time)}
                        {' • '}
                        Close {formatTime(market.close_time)}
                      </span>
                    </div>

                    <div className="result-market-icon">
                      {market.name
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                  </div>

                  <div className="result-values">

                    <div>
                      <span>OPEN</span>

                      <strong>
                        {result?.open_number || '—'}
                      </strong>
                    </div>

                    <div>
                      <span>JODI</span>

                      <strong>
                        {result?.jodi || '—'}
                      </strong>
                    </div>

                    <div>
                      <span>CLOSE</span>

                      <strong>
                        {result?.close_number || '—'}
                      </strong>
                    </div>

                  </div>

                  <div className="result-card-footer">

                    {result
                      ? `Published ${formatDate(
                          result.result_date
                        )}`
                      : 'No published result'}

                  </div>

                </div>
              )
            })}

          </div>

        )}

      </div>

    </div>
  )
}

export default Results
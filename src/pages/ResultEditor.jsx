import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function getIndiaDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function ResultEditor({ market, onClose }) {
  const [resultDate, setResultDate] = useState(getIndiaDate())

  const [openNumber, setOpenNumber] = useState('')
  const [jodi, setJodi] = useState('')
  const [closeNumber, setCloseNumber] = useState('')

  const [openPanel, setOpenPanel] = useState('')
  const [closePanel, setClosePanel] = useState('')

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadExistingResult()
  }, [market?.id, resultDate])

  async function loadExistingResult() {
    if (!market?.id || !resultDate) {
      return
    }

    setMessage('')
    setError('')

    const { data, error: loadError } = await supabase
      .from('daily_results')
      .select('*')
      .eq('market_id', market.id)
      .eq('result_date', resultDate)
      .maybeSingle()

    if (loadError) {
      console.error(loadError)
      setError('Unable to load existing result.')
      return
    }

    if (!data) {
      setOpenNumber('')
      setJodi('')
      setCloseNumber('')
      setOpenPanel('')
      setClosePanel('')
      return
    }

    setOpenNumber(data.open_number || '')
    setJodi(data.jodi || '')
    setCloseNumber(data.close_number || '')
    setOpenPanel(data.open_panel || '')
    setClosePanel(data.close_panel || '')
  }

  async function saveResult(status) {
    setMessage('')
    setError('')

    if (status === 'published') {
  if (
    !openNumber.trim() ||
    !jodi.trim() ||
    !closeNumber.trim()
  ) {
    setError(
      'Open Number, Jodi and Close Number are required before publishing.'
    )
    return
  }
}

    if (!market?.id) {
      setError('No market selected.')
      return
    }

    setLoading(true)

    const payload = {
      market_id: market.id,
      result_date: resultDate,
      open_number: openNumber.trim() || null,
      jodi: jodi.trim() || null,
      close_number: closeNumber.trim() || null,
      open_panel: openPanel.trim() || null,
      close_panel: closePanel.trim() || null,
      status,
      updated_at: new Date().toISOString(),
    }

    const { error: saveError } = await supabase
      .from('daily_results')
      .upsert(payload, {
        onConflict: 'market_id,result_date',
      })

    if (saveError) {
      console.error(saveError)
      setError(saveError.message)
      setLoading(false)
      return
    }

    setMessage(
      status === 'published'
        ? 'Result published successfully.'
        : 'Result saved as draft.'
    )

    setLoading(false)
  }

  return (
    <div className="result-editor-overlay">

      <div className="result-editor">

        <div className="result-editor-header">

          <div>
            <span className="editor-label">
              RESULT MANAGEMENT
            </span>

            <h2>
              {market.name}
            </h2>

            <p>
              Open {market.open_time?.slice(0, 5)}
              {' • '}
              Close {market.close_time?.slice(0, 5)}
            </p>
          </div>

          <button
            className="close-editor"
            onClick={onClose}
          >
            ×
          </button>

        </div>


        <div className="editor-body">

          <div className="form-group">

            <label>
              Result Date
            </label>

            <input
              type="date"
              value={resultDate}
              onChange={(e) =>
                setResultDate(e.target.value)
              }
            />

          </div>


          <div className="result-form-grid">

            <div className="form-group">

              <label>
                Open Number
              </label>

              <input
                type="text"
                inputMode="numeric"
                maxLength="10"
                value={openNumber}
                onChange={(e) =>
                  setOpenNumber(e.target.value)
                }
                placeholder="Enter open number"
              />

            </div>


            <div className="form-group">

              <label>
                Jodi
              </label>

              <input
                type="text"
                inputMode="numeric"
                maxLength="10"
                value={jodi}
                onChange={(e) =>
                  setJodi(e.target.value)
                }
                placeholder="Enter Jodi"
              />

            </div>


            <div className="form-group">

              <label>
                Close Number
              </label>

              <input
                type="text"
                inputMode="numeric"
                maxLength="10"
                value={closeNumber}
                onChange={(e) =>
                  setCloseNumber(e.target.value)
                }
                placeholder="Enter close number"
              />

            </div>


            <div className="form-group">

              <label>
                Open Panel
              </label>

              <input
                type="text"
                value={openPanel}
                onChange={(e) =>
                  setOpenPanel(e.target.value)
                }
                placeholder="Enter open panel"
              />

            </div>


            <div className="form-group">

              <label>
                Close Panel
              </label>

              <input
                type="text"
                value={closePanel}
                onChange={(e) =>
                  setClosePanel(e.target.value)
                }
                placeholder="Enter close panel"
              />

            </div>

          </div>


          {error && (
            <div className="editor-error">
              {error}
            </div>
          )}


          {message && (
            <div className="editor-success">
              {message}
            </div>
          )}


          <div className="editor-actions">

            <button
              className="draft-button"
              disabled={loading}
              onClick={() =>
                saveResult('pending')
              }
            >
              {loading
                ? 'Saving...'
                : 'Save Draft'}
            </button>


            <button
              className="publish-button-large"
              disabled={loading}
              onClick={() =>
                saveResult('published')
              }
            >
              {loading
                ? 'Publishing...'
                : 'Publish Result'}
            </button>

          </div>

        </div>

      </div>

    </div>
  )
}

export default ResultEditor
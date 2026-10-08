import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import ResultEditor from './ResultEditor'

function AdminDashboard() {
  const navigate = useNavigate()

  const [userEmail, setUserEmail] = useState('')
  const [markets, setMarkets] = useState([])
  const [selectedMarket, setSelectedMarket] = useState(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Market form
  const [showMarketForm, setShowMarketForm] = useState(false)
  const [editingMarket, setEditingMarket] = useState(null)

  const [marketName, setMarketName] = useState('')
  const [openTime, setOpenTime] = useState('')
  const [closeTime, setCloseTime] = useState('')
  const [displayOrder, setDisplayOrder] = useState('1')
  const [marketActive, setMarketActive] = useState(true)

  useEffect(() => {
    checkAdmin()
  }, [])

  // =========================================================
  // CHECK LOGIN
  // =========================================================

  async function checkAdmin() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      navigate('/admin/login')
      return
    }

    setUserEmail(user.email || '')

    await loadMarkets()

    setLoading(false)
  }

  // =========================================================
  // LOAD MARKETS
  // =========================================================

  async function loadMarkets() {
    const { data, error } = await supabase
      .from('markets')
      .select('*')
      .order('display_order', {
        ascending: true,
      })

    if (error) {
      console.error('Load markets error:', error)
      alert('Unable to load markets.')
      return
    }

    setMarkets(data || [])
  }

  // =========================================================
  // LOGOUT
  // =========================================================

  async function logout() {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  // =========================================================
  // OPEN ADD MARKET FORM
  // =========================================================

  function openAddMarket() {
    setEditingMarket(null)

    setMarketName('')
    setOpenTime('')
    setCloseTime('')
    setDisplayOrder(String(markets.length + 1))
    setMarketActive(true)

    setShowMarketForm(true)
  }

  // =========================================================
  // OPEN EDIT MARKET FORM
  // =========================================================

  function openEditMarket(market) {
    setEditingMarket(market)

    setMarketName(market.name || '')
    setOpenTime(
      market.open_time
        ? market.open_time.slice(0, 5)
        : ''
    )

    setCloseTime(
      market.close_time
        ? market.close_time.slice(0, 5)
        : ''
    )

    setDisplayOrder(
      String(market.display_order ?? 1)
    )

    setMarketActive(
      market.active === true
    )

    setShowMarketForm(true)
  }

  // =========================================================
  // CLOSE MARKET FORM
  // =========================================================

  function closeMarketForm() {
    if (saving) return

    setShowMarketForm(false)
    setEditingMarket(null)
  }

  // =========================================================
  // SAVE MARKET
  // =========================================================

  async function saveMarket(event) {
    event.preventDefault()

    const cleanName = marketName.trim()

    if (!cleanName) {
      alert('Please enter market name.')
      return
    }

    if (!openTime) {
      alert('Please select open time.')
      return
    }

    if (!closeTime) {
      alert('Please select close time.')
      return
    }

    const order = Number(displayOrder)

    if (!Number.isInteger(order) || order < 1) {
      alert('Display order must be a number greater than 0.')
      return
    }

    setSaving(true)

    try {
      const marketData = {
        name: cleanName,
        open_time: openTime,
        close_time: closeTime,
        display_order: order,
        active: marketActive,
      }

      let error

      if (editingMarket) {
        const response = await supabase
          .from('markets')
          .update(marketData)
          .eq('id', editingMarket.id)

        error = response.error
      } else {
        const response = await supabase
          .from('markets')
          .insert([marketData])

        error = response.error
      }

      if (error) {
        console.error('Save market error:', error)
        alert(error.message || 'Unable to save market.')
        return
      }

      alert(
        editingMarket
          ? 'Market updated successfully.'
          : 'Market added successfully.'
      )

      setShowMarketForm(false)
      setEditingMarket(null)

      await loadMarkets()
    } finally {
      setSaving(false)
    }
  }

  // =========================================================
  // TOGGLE MARKET ACTIVE STATUS
  // =========================================================

  async function toggleMarket(market) {
    const newStatus = !market.active

    const { error } = await supabase
      .from('markets')
      .update({
        active: newStatus,
      })
      .eq('id', market.id)

    if (error) {
      console.error('Toggle market error:', error)
      alert(error.message || 'Unable to update market.')
      return
    }

    await loadMarkets()
  }

  // =========================================================
  // DELETE MARKET
  // =========================================================

  async function deleteMarket(market) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${market.name}"?\n\n` +
      `If this market already has result records, deletion may fail because of database relationships.`
    )

    if (!confirmed) return

    const { error } = await supabase
      .from('markets')
      .delete()
      .eq('id', market.id)

    if (error) {
      console.error('Delete market error:', error)

      alert(
        error.message ||
        'Unable to delete market.'
      )

      return
    }

    alert('Market deleted successfully.')

    await loadMarkets()
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="admin-loading">
        Loading admin dashboard...
      </div>
    )
  }

  // =========================================================
  // DASHBOARD
  // =========================================================

  return (
    <div className="admin-page">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <header className="admin-header">

        <div className="admin-brand">

          <div className="admin-brand-icon">
            SM
          </div>

          <div>
            <strong>
              Satta Matka Bangalore
            </strong>

            <span>
              Admin Dashboard
            </span>
          </div>

        </div>

        <div className="admin-header-right">

          <span>
            {userEmail}
          </span>

          <button onClick={logout}>
            Logout
          </button>

        </div>

      </header>


      <main className="admin-content">

        {/* ===================================================
            TITLE
        ==================================================== */}

        <div className="admin-title">

          <div>

            <span>
              ADMIN PANEL
            </span>

            <h1>
              Results Dashboard
            </h1>

            <p>
              Manage authorized market result information.
            </p>

          </div>

          <div className="admin-date">
            {new Date().toLocaleDateString(
              'en-IN',
              {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              }
            )}
          </div>

        </div>


        {/* ===================================================
            MARKET MANAGEMENT
        ==================================================== */}

        <section className="market-management">

          <div className="section-heading">

            <div>

              <h2>
                Markets
              </h2>

              <p>
                Manage the markets displayed on the website.
              </p>

            </div>

            <button
              className="add-market-button"
              onClick={openAddMarket}
            >
              + Add Market
            </button>

          </div>


          {/* =================================================
              MARKET TABLE
          ================================================== */}

          <div className="market-table-wrapper">

            <table className="market-table">

              <thead>

                <tr>

                  <th>
                    Order
                  </th>

                  <th>
                    Market
                  </th>

                  <th>
                    Open Time
                  </th>

                  <th>
                    Close Time
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Actions
                  </th>

                </tr>

              </thead>


              <tbody>

                {markets.length === 0 ? (

                  <tr>

                    <td
                      colSpan="6"
                      className="empty-markets"
                    >
                      No markets found.
                    </td>

                  </tr>

                ) : (

                  markets.map((market) => (

                    <tr key={market.id}>

                      <td>
                        {market.display_order}
                      </td>

                      <td>

                        <strong>
                          {market.name}
                        </strong>

                      </td>

                      <td>
                        {market.open_time
                          ? market.open_time.slice(0, 5)
                          : '--'}
                      </td>

                      <td>
                        {market.close_time
                          ? market.close_time.slice(0, 5)
                          : '--'}
                      </td>

                      <td>

                        <span
                          className={
                            market.active
                              ? 'market-status active'
                              : 'market-status inactive'
                          }
                        >
                          {market.active
                            ? 'Active'
                            : 'Inactive'}
                        </span>

                      </td>

                      <td>

                        <div className="market-actions">

                          <button
                            type="button"
                            className="edit-market-button"
                            onClick={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                                openEditMarket(market)
                            }}
                            >
                            Edit
                            </button>

                          <button
                            type="button"
                            className={
                                market.active
                                ? 'disable-market-button'
                                : 'enable-market-button'
                            }
                            onClick={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                                toggleMarket(market)
                            }}
                            >
                            {market.active ? 'Disable' : 'Enable'}
                            </button>

                          <button
                            type="button"
                            className="delete-market-button"
                            onClick={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                                deleteMarket(market)
                            }}
                            >
                            Delete
                            </button>
                        </div>

                      </td>

                    </tr>

                  ))

                )}

              </tbody>

            </table>

          </div>

        </section>


        {/* ===================================================
            RESULT MANAGEMENT
        ==================================================== */}

        <section className="results-management">

          <div className="section-heading">

            <div>

              <h2>
                Result Management
              </h2>

              <p>
                Select an active market to manage today's
                authorized result information.
              </p>

            </div>

          </div>


          <div className="admin-market-grid">

            {markets
              .filter((market) => market.active)
              .map((market) => (

                <div
                  className="admin-market-card"
                  key={market.id}
                >

                  <div className="admin-market-top">

                    <div>

                      <h2>
                        {market.name}
                      </h2>

                      <small>
                        Open{' '}
                        {market.open_time
                          ?.slice(0, 5)}
                        {' • '}
                        Close{' '}
                        {market.close_time
                          ?.slice(0, 5)}
                      </small>

                    </div>


                    <div className="admin-market-icon">
                      {market.name
                        ?.charAt(0)
                        ?.toUpperCase()}
                    </div>

                  </div>


                  <div className="admin-result-status">
                    Today's result
                  </div>


                  <button
                    className="publish-button"
                    onClick={() =>
                      setSelectedMarket(market)
                    }
                  >
                    Manage Result
                  </button>

                </div>

              ))}

          </div>

        </section>

      </main>


      {/* =====================================================
          MARKET FORM MODAL
      ====================================================== */}

      {showMarketForm && (

  <div
    style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      background: 'rgba(0, 0, 0, 0.65)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}
  >

    <div
      style={{
        width: '100%',
        maxWidth: '520px',
        maxHeight: '90vh',
        overflowY: 'auto',
        background: '#ffffff',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 25px 70px rgba(0,0,0,0.3)',
      }}
    >
            <div className="market-modal-header">

              <div>

                <h2>
                  {editingMarket
                    ? 'Edit Market'
                    : 'Add Market'}
                </h2>

                <p>
                  Enter the market information.
                </p>

              </div>

              <button
                className="modal-close-button"
                onClick={closeMarketForm}
                disabled={saving}
              >
                ×
              </button>

            </div>


            <form onSubmit={saveMarket}>

              {/* MARKET NAME */}

              <div className="form-group">

                <label>
                  Market Name
                </label>

                <input
                  type="text"
                  value={marketName}
                  onChange={(event) =>
                    setMarketName(event.target.value)
                  }
                  placeholder="Enter market name"
                  disabled={saving}
                />

              </div>


              {/* OPEN TIME */}

              <div className="form-group">

                <label>
                  Open Time
                </label>

                <input
                  type="time"
                  value={openTime}
                  onChange={(event) =>
                    setOpenTime(event.target.value)
                  }
                  disabled={saving}
                />

              </div>


              {/* CLOSE TIME */}

              <div className="form-group">

                <label>
                  Close Time
                </label>

                <input
                  type="time"
                  value={closeTime}
                  onChange={(event) =>
                    setCloseTime(event.target.value)
                  }
                  disabled={saving}
                />

              </div>


              {/* DISPLAY ORDER */}

              <div className="form-group">

                <label>
                  Display Order
                </label>

                <input
                  type="number"
                  min="1"
                  value={displayOrder}
                  onChange={(event) =>
                    setDisplayOrder(event.target.value)
                  }
                  disabled={saving}
                />

              </div>


              {/* ACTIVE */}

              <div className="form-checkbox">

                <input
                  id="market-active"
                  type="checkbox"
                  checked={marketActive}
                  onChange={(event) =>
                    setMarketActive(
                      event.target.checked
                    )
                  }
                  disabled={saving}
                />

                <label htmlFor="market-active">
                  Market is active
                </label>

              </div>


              {/* BUTTONS */}

              <div className="market-form-actions">

                <button
                  type="button"
                  className="cancel-button"
                  onClick={closeMarketForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-market-button"
                  disabled={saving}
                >
                  {saving
                    ? 'Saving...'
                    : editingMarket
                      ? 'Update Market'
                      : 'Add Market'}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}


      {/* =====================================================
          RESULT EDITOR
      ====================================================== */}

      {selectedMarket && (

        <ResultEditor
          market={selectedMarket}
          onClose={() =>
            setSelectedMarket(null)
          }
        />

      )}

    </div>
  )
}

export default AdminDashboard